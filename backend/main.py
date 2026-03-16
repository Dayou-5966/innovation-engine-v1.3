import logging
import json
import io
import os
import uuid
import threading
import typing
import traceback
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session
from pydantic import BaseModel

import models
from database import engine, SessionLocal
from engine import evaluate_idea
from genesis import generate_concepts
from auth import (
    create_access_token, verify_token, verify_password,
    verify_user_password, hash_password, get_user_id_from_token,
    MULTI_USER_MODE,
)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
audit_log = logging.getLogger("tie.audit")
app_log = logging.getLogger("tie.app")

# ── Safe schema migration ─────────────────────────────────────────────────────
models.Base.metadata.create_all(bind=engine)

# Add columns introduced after initial schema without dropping data
try:
    from sqlalchemy import inspect as sa_inspect, text as sa_text
    inspector = sa_inspect(engine)

    def _add_column_if_missing(table: str, column: str, ddl: str):
        if table in inspector.get_table_names():
            existing = [c["name"] for c in inspector.get_columns(table)]
            if column not in existing:
                with engine.connect() as conn:
                    conn.execute(sa_text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))
                    conn.commit()
                    app_log.info("Migration: added '%s' to '%s'", column, table)

    _add_column_if_missing("evaluations", "model_used", "model_used VARCHAR DEFAULT 'unknown'")
    _add_column_if_missing("evaluations", "user_id", "user_id INTEGER")
    _add_column_if_missing("mandate_documents", "user_id", "user_id INTEGER")

except Exception as exc:
    app_log.warning("Migration check (non-fatal): %s", exc)

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=[])

app = FastAPI(
    title="The Innovation Engine Backend",
    description="Enterprise-grade AI Orchestration Engine and execution layer for idea validation.",
    version="1.3.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────
_raw_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")
CORS_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate-limit values from env ────────────────────────────────────────────────
RATE_EVALUATE = os.environ.get("RATE_LIMIT_EVALUATE", "5/minute")
RATE_GENERATE = os.environ.get("RATE_LIMIT_GENERATE", "10/minute")

# ── Pydantic models ───────────────────────────────────────────────────────────

class IdeaRequest(BaseModel):
    idea: str
    model: str = os.environ.get("DEFAULT_MODEL", "gemini-2.5-flash-lite")
    overrides: dict = {}
    deep_research_enabled: bool = False
    deep_research_model: str = os.environ.get("DEFAULT_DEEP_RESEARCH_MODEL", "deep-research-pro-preview-12-2025")
    webhook_url: str = ""      # optional: POST results here when job completes


class KeywordsRequest(BaseModel):
    keywords: str
    model: str = os.environ.get("DEFAULT_MODEL", "gemini-2.5-flash-lite")


class LoginRequest(BaseModel):
    password: str
    username: str = "admin"   # optional; defaults to "admin" for backward compat


class CreateUserRequest(BaseModel):
    username: str
    password: str


# ── DB dependency ─────────────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Shared helpers ────────────────────────────────────────────────────────────

class _DocProto:
    """Lightweight mandate-document proxy used by async job threads."""
    __slots__ = ("filename", "mime_type", "file_data")

    def __init__(self, filename: str, mime_type: str, file_data: bytes):
        self.filename = filename
        self.mime_type = mime_type
        self.file_data = file_data


def _make_job_callbacks(job_id: str):
    """Factory that creates the progress_callback and check_cancelled closures for a job."""

    def _progress_cb(stage: str, data: typing.Any):
        try:
            if stage == "status":
                _update_job(job_id, current_stage=data)
            elif stage == "progress":
                _update_job(job_id, current_progress=float(data))
            else:
                with SessionLocal() as s:
                    job = s.query(models.EvaluationJob).filter(models.EvaluationJob.id == job_id).first()
                    if job:
                        existing = json.loads(job.intermediate_json or "{}")
                        existing[stage] = data
                        job.intermediate_json = json.dumps(existing)
                        job.updated_at = datetime.now(timezone.utc)
                        s.commit()
        except Exception as cb_exc:
            app_log.warning("Progress callback error (job=%s): %s", job_id, cb_exc)

    def _check_cancelled() -> bool:
        try:
            with SessionLocal() as s:
                job = s.query(models.EvaluationJob).filter(models.EvaluationJob.id == job_id).first()
                return bool(job and job.cancelled)
        except Exception:
            return False

    return _progress_cb, _check_cancelled


# ── Text extraction helpers ───────────────────────────────────────────────────

def _extract_text_from_pdf_gemini(data: bytes, filename: str) -> str:
    import tempfile
    from google import genai

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set.")

    try:
        client = genai.Client(api_key=api_key)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not initialize Gemini Client: {exc}")

    temp_file_path = ""
    uploaded_file = None
    try:
        import time
        fd, temp_file_path = tempfile.mkstemp(suffix=".pdf")
        with os.fdopen(fd, "wb") as f:
            f.write(data)

        app_log.info("Uploading %s to Gemini File API...", filename)
        uploaded_file = client.files.upload(file=temp_file_path, config={"display_name": filename})

        while True:
            file_info = client.files.get(name=uploaded_file.name)
            if file_info.state.name == "ACTIVE":
                break
            elif file_info.state.name == "FAILED":
                raise ValueError("Gemini failed to process the uploaded file.")
            time.sleep(2)

        prompt = (
            "Please transcribe this document exactly. For any text, extract it verbatim. "
            "For any tables, charts, graphs, or images, write a highly detailed textual description "
            "of the visual information and data they contain so that an AI reading this text later "
            "will have full context."
        )
        model_name = os.environ.get("DEFAULT_OCR_MODEL", "gemini-2.5-pro")
        resp = client.models.generate_content(model=model_name, contents=[uploaded_file, prompt])
        result_text = (resp.text or "").strip()
        if not result_text:
            raise ValueError("Gemini returned an empty extraction.")
        app_log.info("Multimodal extraction complete for %s", filename)
        return result_text

    except Exception as exc:
        app_log.error("PDF extraction failed: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(status_code=422, detail=f"Multimodal extraction failed: {exc}")

    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass
        if uploaded_file:
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception:
                pass


def _extract_text(filename: str, data: bytes) -> str:
    fname = filename.lower()
    if fname.endswith(".pdf"):
        return _extract_text_from_pdf_gemini(data, filename)
    elif fname.endswith((".txt", ".md")):
        return data.decode("utf-8", errors="replace").strip()
    else:
        raise HTTPException(status_code=415, detail="Unsupported file type. Upload PDF or TXT.")


# ── Webhook helper ────────────────────────────────────────────────────────────

def _fire_webhook(webhook_url: str, payload: dict):
    """POST job result to caller-supplied webhook URL. Non-blocking, best-effort."""
    if not webhook_url:
        return
    try:
        import requests
        requests.post(webhook_url, json=payload, timeout=10)
        app_log.info("Webhook delivered to %s", webhook_url)
    except Exception as exc:
        app_log.warning("Webhook delivery failed (%s): %s", webhook_url, exc)


# ── DB job helpers ────────────────────────────────────────────────────────────

def _get_job(db: Session, job_id: str) -> models.EvaluationJob:
    job = db.query(models.EvaluationJob).filter(models.EvaluationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


def _update_job(job_id: str, **kwargs):
    """Thread-safe partial update of a job row."""
    with SessionLocal() as s:
        job = s.query(models.EvaluationJob).filter(models.EvaluationJob.id == job_id).first()
        if job:
            for k, v in kwargs.items():
                setattr(job, k, v)
            job.updated_at = datetime.now(timezone.utc)
            s.commit()


# ── Core routes ───────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"message": "The Innovation Engine Backend v1.3.0"}


# ── Auth endpoints ────────────────────────────────────────────────────────────

@app.post("/api/token")
def api_token(payload: LoginRequest, db: Session = Depends(get_db)):
    if MULTI_USER_MODE and payload.username != "admin":
        user = db.query(models.User).filter(models.User.username == payload.username).first()
        if not user or not user.is_active or not verify_user_password(payload.password, user.password_hash):
            audit_log.warning("Failed login attempt for username=%s", payload.username)
            raise HTTPException(status_code=401, detail="Unauthorized access")
        token = create_access_token(username=user.username, user_id=user.id)
        audit_log.info("User '%s' (id=%s) authenticated", user.username, user.id)
        return {"access_token": token, "token_type": "bearer"}

    # Legacy single-password auth
    if not verify_password(payload.password):
        audit_log.warning("Failed legacy admin login attempt")
        raise HTTPException(status_code=401, detail="Unauthorized access")
    token = create_access_token(username="admin")
    audit_log.info("Admin authenticated via legacy single-password mode")
    return {"access_token": token, "token_type": "bearer"}


# ── User management (multi-user mode) ─────────────────────────────────────────

@app.post("/api/users")
def create_user(
    payload: CreateUserRequest,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    """Create a new user. Admin-only endpoint."""
    if token_payload.get("sub") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can create users.")
    if not MULTI_USER_MODE:
        raise HTTPException(status_code=400, detail="Multi-user mode is disabled.")
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="Username already exists.")
    user = models.User(username=payload.username, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    audit_log.info("Admin created new user '%s' (id=%s)", user.username, user.id)
    return {"id": user.id, "username": user.username, "created_at": user.created_at}


@app.get("/api/users")
def list_users(
    db: Session = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    """List all users. Admin-only."""
    if token_payload.get("sub") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can list users.")
    users = db.query(models.User).all()
    return {"users": [{"id": u.id, "username": u.username, "is_active": u.is_active, "created_at": u.created_at} for u in users]}


@app.delete("/api/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    if token_payload.get("sub") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete users.")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    audit_log.info("Admin deactivated user id=%s ('%s')", user_id, user.username)
    return {"success": True, "deactivated_id": user_id}


# ── Mandate Document endpoints ────────────────────────────────────────────────

@app.post("/api/mandate-documents")
async def upload_mandate_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    data = await file.read()
    if len(data) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 50 MB).")

    fname = (file.filename or "upload.txt").lower()
    mime_type = "text/plain"
    if fname.endswith(".pdf"):
        mime_type = "application/pdf"
    elif fname.endswith(".md"):
        mime_type = "text/markdown"

    user_id = get_user_id_from_token(token_payload)
    doc = models.MandateDocument(
        filename=file.filename,
        mime_type=mime_type,
        file_data=data,
        user_id=user_id,
    )
    app_log.info("Uploading mandate doc: %s (mime=%s, %d bytes)", file.filename, mime_type, len(data))
    db.add(doc)
    try:
        db.commit()
        db.refresh(doc)
    except Exception as exc:
        app_log.error("Mandate document DB insert failed: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(status_code=500, detail="Database insertion failed")

    preview = "PDF Document (Binary)" if mime_type == "application/pdf" else data.decode("utf-8", errors="replace")[:300]
    audit_log.info("Mandate doc uploaded: id=%s filename=%s user_id=%s", doc.id, doc.filename, user_id)
    return {"id": doc.id, "filename": doc.filename, "preview": preview, "char_count": len(data), "created_at": doc.created_at}


@app.get("/api/mandate-documents")
def list_mandate_documents(
    db: Session = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    user_id = get_user_id_from_token(token_payload)
    # Show global docs (user_id IS NULL) + user's own docs
    query = db.query(models.MandateDocument).order_by(models.MandateDocument.created_at.asc())
    if user_id is not None:
        from sqlalchemy import or_
        query = query.filter(or_(models.MandateDocument.user_id == user_id, models.MandateDocument.user_id.is_(None)))
    docs = query.all()
    results = []
    for d in docs:
        preview = "PDF Document (Binary)" if d.mime_type == "application/pdf" else d.file_data.decode("utf-8", errors="replace")[:300]
        results.append({"id": d.id, "filename": d.filename, "preview": preview, "char_count": len(d.file_data), "created_at": d.created_at})
    return {"documents": results}


@app.delete("/api/mandate-documents/{doc_id}")
def delete_mandate_document(
    doc_id: int,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    doc = db.query(models.MandateDocument).filter(models.MandateDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    audit_log.info("Mandate doc deleted: id=%s filename=%s", doc_id, doc.filename)
    db.delete(doc)
    db.commit()
    return {"success": True, "deleted_id": doc_id}


@app.get("/api/mandate-documents/{doc_id}/content")
def get_mandate_document_content(
    doc_id: int,
    db: Session = Depends(get_db),
    token: str = None,
):
    from auth import JWT_SECRET, ALGORITHM
    import jwt as _jwt
    if not token:
        raise HTTPException(status_code=401, detail="Missing auth token")
    try:
        payload = _jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        if not payload.get("sub"):
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    doc = db.query(models.MandateDocument).filter(models.MandateDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    from fastapi.responses import PlainTextResponse, Response
    if doc.mime_type == "application/pdf":
        return Response(content=doc.file_data, media_type="application/pdf")
    return PlainTextResponse(content=doc.file_data.decode("utf-8", errors="replace"), media_type="text/plain")


# ── Evaluation endpoints ──────────────────────────────────────────────────────

@app.post("/api/evaluate")
@limiter.limit(RATE_EVALUATE)
def api_evaluate(
    request: Request,
    payload: IdeaRequest,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    if not payload.idea or not payload.idea.strip():
        raise HTTPException(status_code=400, detail="Idea payload cannot be empty.")

    user_id = get_user_id_from_token(token_payload)
    docs = db.query(models.MandateDocument).order_by(models.MandateDocument.created_at.asc()).all()
    audit_log.info("Sync evaluate started: user_id=%s model=%s idea='%s...'", user_id, payload.model, payload.idea[:60])

    try:
        result = evaluate_idea(
            payload.idea,
            model_name=payload.model,
            mandate_docs=docs,
            overrides=payload.overrides,
            deep_research_enabled=payload.deep_research_enabled,
            deep_research_model=payload.deep_research_model
        )
    except Exception as exc:
        app_log.error("Sync pipeline error: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}")

    if not result or not isinstance(result, dict):
        raise HTTPException(status_code=500, detail="Pipeline returned an empty or invalid response.")

    try:
        db_eval = models.Evaluation(
            idea=payload.idea,
            concept_title=result.get("Title", "Untitled Concept"),
            total_score=result.get("D0_Scorecard", {}).get("Total_Score", 0),
            recommendation=result.get("Recommendation", "N/A"),
            full_json=json.dumps(result),
            model_used=payload.model,
            user_id=user_id,
        )
        db.add(db_eval)
        db.commit()
        db.refresh(db_eval)
        result["db_id"] = db_eval.id
        audit_log.info("Sync evaluation saved: db_id=%s score=%s rec=%s", db_eval.id, db_eval.total_score, db_eval.recommendation)
    except Exception as exc:
        app_log.error("Failed to save sync evaluation to DB: %s", exc)

    return result


# ── Async evaluation ──────────────────────────────────────────────────────────

@app.post("/api/evaluate/async")
@limiter.limit(RATE_EVALUATE)
def api_evaluate_async(
    request: Request,
    payload: IdeaRequest,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    """Kick off evaluation in a background thread, return job_id instantly."""
    if not payload.idea or not payload.idea.strip():
        raise HTTPException(status_code=400, detail="Idea payload cannot be empty.")

    user_id = get_user_id_from_token(token_payload)
    docs = db.query(models.MandateDocument).order_by(models.MandateDocument.created_at.asc()).all()
    mandate_docs = [_DocProto(d.filename, d.mime_type, d.file_data) for d in docs]

    job_id = str(uuid.uuid4())

    # Persist job record immediately
    job_record = models.EvaluationJob(
        id=job_id,
        status="running",
        idea=payload.idea,
        model_used=payload.model,
        user_id=user_id,
        webhook_url=payload.webhook_url or None,
    )
    db.add(job_record)
    db.commit()

    audit_log.info("Async job created: job_id=%s user_id=%s model=%s idea='%s...'",
                   job_id, user_id, payload.model, payload.idea[:60])

    _progress_cb, _check_cancelled = _make_job_callbacks(job_id)

    def _run():
        try:
            result = evaluate_idea(
                payload.idea,
                model_name=payload.model,
                mandate_docs=mandate_docs,
                overrides=payload.overrides,
                progress_callback=_progress_cb,
                check_cancelled=_check_cancelled,
                deep_research_enabled=payload.deep_research_enabled,
                deep_research_model=payload.deep_research_model
            )
            if not result or not isinstance(result, dict):
                raise ValueError("Pipeline returned empty or invalid response.")

            # Persist evaluation to history
            with SessionLocal() as s:
                db_eval = models.Evaluation(
                    idea=payload.idea,
                    concept_title=result.get("Title", "Untitled Concept"),
                    total_score=result.get("D0_Scorecard", {}).get("Total_Score", 0),
                    recommendation=result.get("Recommendation", "N/A"),
                    full_json=json.dumps(result),
                    model_used=payload.model,
                    user_id=user_id,
                )
                s.add(db_eval)
                s.commit()
                s.refresh(db_eval)
                result["db_id"] = db_eval.id

            _update_job(job_id, status="done", result_json=json.dumps(result))
            audit_log.info("Async job done: job_id=%s db_id=%s score=%s", job_id, result.get("db_id"), result.get("D0_Scorecard", {}).get("Total_Score"))

            # Fire webhook if provided
            if payload.webhook_url:
                _fire_webhook(payload.webhook_url, {"job_id": job_id, "status": "done", "result": result})

        except InterruptedError as exc:
            app_log.info("Async job cancelled: job_id=%s", job_id)
            _update_job(job_id, status="cancelled", error_msg=str(exc))
            if payload.webhook_url:
                _fire_webhook(payload.webhook_url, {"job_id": job_id, "status": "cancelled"})

        except Exception as exc:
            app_log.error("Async job error: job_id=%s err=%s\n%s", job_id, exc, traceback.format_exc())
            _update_job(job_id, status="error", error_msg=str(exc))
            if payload.webhook_url:
                _fire_webhook(payload.webhook_url, {"job_id": job_id, "status": "error", "error": str(exc)})

    threading.Thread(target=_run, daemon=True).start()
    return {"job_id": job_id}


@app.get("/api/evaluate/status/{job_id}")
def api_evaluate_status(
    job_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    job = _get_job(db, job_id)

    if job.status == "error":
        raise HTTPException(status_code=500, detail=f"Pipeline error: {job.error_msg}")

    intermediate = {}
    try:
        intermediate = json.loads(job.intermediate_json or "{}")
    except Exception:
        pass

    result = None
    if job.result_json:
        try:
            result = json.loads(job.result_json)
        except Exception:
            pass

    response = {
        "status": job.status,
        "result": result,
        "error": job.error_msg,
        "intermediate": intermediate,
    }
    if job.status == "running":
        response["current_stage"] = job.current_stage or "stage1"
        response["current_progress"] = job.current_progress or 0

    return response


@app.post("/api/evaluate/cancel/{job_id}")
def api_evaluate_cancel(
    job_id: str,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    job = _get_job(db, job_id)
    if job.status == "running":
        job.cancelled = True
        job.updated_at = datetime.now(timezone.utc)
        db.commit()
        audit_log.info("Job cancellation requested: job_id=%s user=%s", job_id, token_payload.get("sub"))
        return {"success": True, "message": "Cancellation signal sent."}
    return {"success": False, "message": f"Job already {job.status}."}


# ── Re-run evaluation with a different model ──────────────────────────────────

@app.post("/api/evaluations/{eval_id}/rerun")
@limiter.limit(RATE_EVALUATE)
def api_rerun_evaluation(
    request: Request,
    eval_id: int,
    body: dict,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    """Re-run an existing evaluation with a (potentially different) model."""
    record = db.query(models.Evaluation).filter(models.Evaluation.id == eval_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    new_model = body.get("model", record.model_used or os.environ.get("DEFAULT_MODEL", "gemini-2.5-flash-lite"))
    overrides = body.get("overrides", {})
    webhook_url = body.get("webhook_url", "")
    user_id = get_user_id_from_token(token_payload)

    # Kick off as an async job
    docs = db.query(models.MandateDocument).order_by(models.MandateDocument.created_at.asc()).all()

    class _DocProto:
        def __init__(self, f, m, d):
            self.filename = f; self.mime_type = m; self.file_data = d

    mandate_docs = [_DocProto(d.filename, d.mime_type, d.file_data) for d in docs]

    job_id = str(uuid.uuid4())
    job_record = models.EvaluationJob(
        id=job_id,
        status="running",
        idea=record.idea,
        model_used=new_model,
        user_id=user_id,
        webhook_url=webhook_url or None,
    )
    db.add(job_record)
    db.commit()

    audit_log.info("Re-run started: original_id=%s new_model=%s job_id=%s", eval_id, new_model, job_id)

    idea_text = record.idea

    _progress_cb, _check_cancelled = _make_job_callbacks(job_id)

    def _run():
        try:
            result = evaluate_idea(
                idea_text,
                model_name=new_model,
                mandate_docs=mandate_docs,
                overrides=overrides,
                progress_callback=_progress_cb,
                check_cancelled=_check_cancelled,
            )
            if not result or not isinstance(result, dict):
                raise ValueError("Pipeline returned empty or invalid response.")

            with SessionLocal() as s:
                db_eval = models.Evaluation(
                    idea=idea_text,
                    concept_title=result.get("Title", "Untitled Concept"),
                    total_score=result.get("D0_Scorecard", {}).get("Total_Score", 0),
                    recommendation=result.get("Recommendation", "N/A"),
                    full_json=json.dumps(result),
                    model_used=new_model,
                    user_id=user_id,
                )
                s.add(db_eval)
                s.commit()
                s.refresh(db_eval)
                result["db_id"] = db_eval.id

            _update_job(job_id, status="done", result_json=json.dumps(result))
            audit_log.info("Re-run done: job_id=%s new_db_id=%s", job_id, result.get("db_id"))

            if webhook_url:
                _fire_webhook(webhook_url, {"job_id": job_id, "status": "done", "result": result})

        except InterruptedError as exc:
            app_log.info("Re-run cancelled: job_id=%s", job_id)
            _update_job(job_id, status="cancelled", error_msg=str(exc))
            if webhook_url:
                _fire_webhook(webhook_url, {"job_id": job_id, "status": "cancelled"})

        except Exception as exc:
            app_log.error("Re-run error: job_id=%s err=%s\n%s", job_id, exc, traceback.format_exc())
            _update_job(job_id, status="error", error_msg=str(exc))
            if webhook_url:
                _fire_webhook(webhook_url, {"job_id": job_id, "status": "error", "error": str(exc)})

    threading.Thread(target=_run, daemon=True).start()
    return {"job_id": job_id, "idea": idea_text, "model": new_model}


# ── History / Portfolio ───────────────────────────────────────────────────────

@app.get("/api/history")
def api_history(
    db: Session = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    user_id = get_user_id_from_token(token_payload)
    query = db.query(models.Evaluation).order_by(models.Evaluation.created_at.desc())
    # In multi-user mode, filter by user; admin sees all
    if user_id is not None and token_payload.get("sub") != "admin":
        query = query.filter(models.Evaluation.user_id == user_id)
    evals = query.all()

    history = []
    for ev in evals:
        try:
            parsed = json.loads(ev.full_json)
        except Exception:
            parsed = {}
        history.append({
            "id": ev.id,
            "idea": ev.idea,
            "concept_title": ev.concept_title,
            "total_score": ev.total_score,
            "recommendation": ev.recommendation,
            "model_used": ev.model_used or "unknown",
            "created_at": ev.created_at,
            "full_json": parsed,
        })
    return {"history": history}


@app.post("/api/jobs/{job_id}/retry")
@limiter.limit(RATE_EVALUATE)
def api_retry_from_stage(
    request: Request,
    job_id: str,
    body: dict,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    """
    Retry an async job starting from a specific stage, reusing completed stage outputs.

    Body params:
      from_stage: int  (2=skip stage1, 3=skip stages 1+2, 4=skip stages 1-3)
      overrides:  dict (optional per-stage override directives)
      model:      str  (optional model override)
      webhook_url: str (optional)
    """
    original_job = db.query(models.EvaluationJob).filter(models.EvaluationJob.id == job_id).first()
    if not original_job:
        raise HTTPException(status_code=404, detail="Original job not found.")

    from_stage = int(body.get("from_stage", 1))
    new_model = body.get("model") or original_job.model_used or os.environ.get("DEFAULT_MODEL", "gemini-2.5-flash-lite")
    overrides = body.get("overrides", {})
    webhook_url = body.get("webhook_url", "")
    user_id = get_user_id_from_token(token_payload)

    # Extract intermediate results from original job to pass as precomputed
    intermediate = {}
    try:
        intermediate = json.loads(original_job.intermediate_json or "{}")
    except Exception:
        pass

    _s1: dict = intermediate.get("stage1") or {}
    _s2: dict = intermediate.get("stage2") or {}
    _s3: dict = intermediate.get("stage3") or {}
    precomputed_s1: str = str(_s1.get("brief", "")) if from_stage > 1 else ""
    precomputed_s2: str = str(_s2.get("report", "")) if from_stage > 2 else ""
    precomputed_s3: str = str(_s3.get("report", "")) if from_stage > 3 else ""

    docs = db.query(models.MandateDocument).order_by(models.MandateDocument.created_at.asc()).all()

    class _DocProto:
        def __init__(self, f, m, d):
            self.filename = f; self.mime_type = m; self.file_data = d

    mandate_docs = [_DocProto(d.filename, d.mime_type, d.file_data) for d in docs]

    new_job_id = str(uuid.uuid4())
    new_job = models.EvaluationJob(
        id=new_job_id,
        status="running",
        idea=original_job.idea,
        model_used=new_model,
        user_id=user_id,
        webhook_url=webhook_url or None,
    )
    db.add(new_job)
    db.commit()

    audit_log.info("Stage retry: original_job=%s from_stage=%s new_job=%s model=%s",
                   job_id, from_stage, new_job_id, new_model)

    idea_text = original_job.idea

    _progress_cb, _check_cancelled = _make_job_callbacks(new_job_id)

    def _run():
        try:
            result = evaluate_idea(
                idea_text,
                model_name=new_model,
                mandate_docs=mandate_docs,
                overrides=overrides,
                progress_callback=_progress_cb,
                check_cancelled=_check_cancelled,
                resume_from_stage=from_stage,
                precomputed_stage1=precomputed_s1,
                precomputed_stage2=precomputed_s2,
                precomputed_stage3=precomputed_s3,
            )
            if not result or not isinstance(result, dict):
                raise ValueError("Pipeline returned empty or invalid response.")

            with SessionLocal() as s:
                db_eval = models.Evaluation(
                    idea=idea_text,
                    concept_title=result.get("Title", "Untitled Concept"),
                    total_score=result.get("D0_Scorecard", {}).get("Total_Score", 0),
                    recommendation=result.get("Recommendation", "N/A"),
                    full_json=json.dumps(result),
                    model_used=new_model,
                    user_id=user_id,
                )
                s.add(db_eval)
                s.commit()
                s.refresh(db_eval)
                result["db_id"] = db_eval.id

            _update_job(new_job_id, status="done", result_json=json.dumps(result))
            audit_log.info("Stage retry done: new_job=%s db_id=%s", new_job_id, result.get("db_id"))

            if webhook_url:
                _fire_webhook(webhook_url, {"job_id": new_job_id, "status": "done", "result": result})

        except Exception as exc:
            app_log.error("Stage retry error: job=%s err=%s\n%s", new_job_id, exc, traceback.format_exc())
            _update_job(new_job_id, status="error", error_msg=str(exc))
            if webhook_url:
                _fire_webhook(webhook_url, {"job_id": new_job_id, "status": "error", "error": str(exc)})

    threading.Thread(target=_run, daemon=True).start()
    return {"job_id": new_job_id, "from_stage": from_stage, "model": new_model}


@app.delete("/api/evaluations/{eval_id}")
def api_delete_evaluation(
    eval_id: int,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    record = db.query(models.Evaluation).filter(models.Evaluation.id == eval_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    audit_log.info("Evaluation deleted: id=%s user=%s", eval_id, token_payload.get("sub"))
    db.delete(record)
    db.commit()
    return {"success": True, "deleted_id": eval_id}


# ── Genesis Mode ──────────────────────────────────────────────────────────────

@app.post("/api/generate")
@limiter.limit(RATE_GENERATE)
def api_generate(
    request: Request,
    payload: KeywordsRequest,
    token_payload: dict = Depends(verify_token),
):
    if not payload.keywords or not payload.keywords.strip():
        raise HTTPException(status_code=400, detail="Keywords payload cannot be empty.")
    audit_log.info("Genesis Mode: user=%s model=%s keywords='%s'",
                   token_payload.get("sub"), payload.model, payload.keywords[:60])
    try:
        concepts = generate_concepts(payload.keywords, model_name=payload.model)
        return {"concepts": concepts}
    except Exception as exc:
        app_log.error("Genesis error: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Generation error: {exc}")
