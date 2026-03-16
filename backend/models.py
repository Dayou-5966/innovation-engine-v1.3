from sqlalchemy import Column, Integer, String, DateTime, Text, LargeBinary, Boolean, Float
from database import Base
import datetime



class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    idea = Column(String, index=True)
    concept_title = Column(String)
    total_score = Column(Integer)
    recommendation = Column(String)
    full_json = Column(Text)
    model_used = Column(String, default="unknown")
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), index=True)

class MandateDocument(Base):
    __tablename__ = "mandate_documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    mime_type = Column(String, nullable=False, default="text/plain")
    file_data = Column(LargeBinary, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), index=True)


class EvaluationJob(Base):
    """Persistent async job store — survives backend restarts."""
    __tablename__ = "evaluation_jobs"

    id = Column(String, primary_key=True)          # UUID job_id
    status = Column(String, default="running")     # running | done | error | cancelled
    idea = Column(String)
    model_used = Column(String)
    result_json = Column(Text, nullable=True)       # serialised final report
    error_msg = Column(String, nullable=True)
    intermediate_json = Column(Text, nullable=True) # serialised intermediate stage data
    current_stage = Column(String, nullable=True)
    current_progress = Column(Float, default=0.0)
    cancelled = Column(Boolean, default=False)
    webhook_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc),
                        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc))
