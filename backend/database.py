from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import shutil

# ── Database URL resolution ───────────────────────────────────────────────────
# Priority order:
#  1. DATABASE_URL  — full SQLAlchemy URL (PostgreSQL on Railway / any other DB)
#  2. DATABASE_PATH — path to a SQLite file (legacy Railway volume or local)
#  3. Default       — ~/Library/Application Support/InnovationEngine/ on macOS

_DATABASE_URL = os.environ.get("DATABASE_URL", "")

if _DATABASE_URL:
    # Normalize Railway's postgres:// → postgresql:// for SQLAlchemy 2.x compatibility
    if _DATABASE_URL.startswith("postgres://"):
        _DATABASE_URL = _DATABASE_URL.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URL = _DATABASE_URL
    _is_sqlite = False
    print("[DB] Using DATABASE_URL (from environment).")
else:
    # SQLite path fallback
    _DEFAULT_DB_DIR = os.path.join(
        os.path.expanduser("~"), "Library", "Application Support", "InnovationEngine"
    )
    APP_DATA_DIR = os.path.dirname(
        os.environ.get("DATABASE_PATH", os.path.join(_DEFAULT_DB_DIR, "innovation_engine.db"))
    )
    os.makedirs(APP_DATA_DIR, exist_ok=True)

    DB_PATH = os.environ.get(
        "DATABASE_PATH",
        os.path.join(_DEFAULT_DB_DIR, "innovation_engine.db")
    )

    # One-time migration: move old in-repo DB if it exists
    _old_db = os.path.join(os.path.dirname(__file__), "innovation_engine.db")
    if os.path.exists(_old_db) and not os.path.exists(DB_PATH):
        shutil.move(_old_db, DB_PATH)
        print(f"[DB] Migrated existing database to {DB_PATH}")
    elif os.path.exists(_old_db):
        os.remove(_old_db)

    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    _is_sqlite = True
    print(f"[DB] Using SQLite at: {DB_PATH}")

# ── Engine configuration ──────────────────────────────────────────────────────
if _is_sqlite:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL: use connection pooling
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
