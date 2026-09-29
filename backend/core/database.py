"""Database session management — supports SQLite (dev) and PostgreSQL (production)."""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from core.config import settings

# ── Engine ────────────────────────────────────────────────────────────────────
# SQLite does not support connection pool arguments; PostgreSQL does.
_is_sqlite = settings.database_url.startswith("sqlite")

_engine_kwargs: dict = {}
if not _is_sqlite:
    _engine_kwargs = {
        "pool_size": 10,          # Persistent connections kept open
        "max_overflow": 20,       # Extra connections allowed under burst load
        "pool_pre_ping": True,    # Verify connection liveness before use (avoids stale conn errors)
        "pool_recycle": 1800,     # Recycle connections every 30 min (avoids server-side timeouts)
        "echo": False,            # Never log raw SQL in production
    }
else:
    # SQLite: disable same-thread check (needed for FastAPI's threaded request handling)
    _engine_kwargs = {"connect_args": {"check_same_thread": False}}

engine = create_engine(settings.database_url, **_engine_kwargs)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()
