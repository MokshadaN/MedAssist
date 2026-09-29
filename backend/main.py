"""FastAPI entrypoint — production hardened."""

import logging
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis
import os

from core.config import settings
from core.limiter import limiter
from core.database import Base, engine
from core.logging_config import configure_logging
from core.observability import setup_observability
from core.middleware import RequestIDMiddleware, RequestTimingMiddleware

# Import models so SQLAlchemy metadata is registered.
import models  # noqa: F401

# Import schemas so the package modules load cleanly.
from schemas import ai, auth, feedback, message, patient, prescription, reminder, report, risk, session, triage, visit, schedule  # noqa: F401

from api.v1.router import api_router

# ── Logging ───────────────────────────────────────────────────────────────────
configure_logging(environment=settings.environment, log_level=settings.log_level)
logger = logging.getLogger("medassist")

# ── Rate Limiter ──────────────────────────────────────────────────────────────
# (defined in core/limiter.py to avoid circular imports)

# ── Application ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="MedAssist API",
    version="1.0.0",
    description="AI-Powered Healthcare Companion Platform",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)

# Attach rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Middlewares ───────────────────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(RequestTimingMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
)

setup_observability(app, settings)

app.include_router(api_router, prefix="/api/v1")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
def root():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/health", tags=["ops"])
def health():
    """Shallow health check — used by load balancers and container orchestration."""
    return {"status": "healthy", "environment": settings.environment}


@app.get("/health/detailed", tags=["ops"])
def health_detailed():
    """
    Deep health check — verifies DB connection and AI API configuration.
    Use this for monitoring dashboards and alert thresholds.
    """
    import os
    from sqlalchemy import text
    from core.database import SessionLocal

    checks: dict = {}
    overall = "healthy"

    # ── Database ───────────────────────────────────────────────────────────────
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        checks["database"] = {"status": "ok", "type": "postgresql" if "postgresql" in settings.database_url else "sqlite"}
    except Exception as exc:
        checks["database"] = {"status": "error", "detail": str(exc)}
        overall = "degraded"

    # ── Gemini API ────────────────────────────────────────────────────────────
    google_key = os.getenv("GOOGLE_API_KEY", "")
    checks["gemini_api"] = {"status": "configured" if google_key else "not_configured"}
    if not google_key:
        overall = "degraded"

    # ── Groq API ──────────────────────────────────────────────────────────────
    groq_key = os.getenv("GROQ_API_KEY", "")
    checks["groq_api"] = {"status": "configured" if groq_key else "not_configured"}

    # ── HuggingFace ───────────────────────────────────────────────────────────
    hf_token = os.getenv("HF_TOKEN", "")
    checks["huggingface"] = {"status": "configured" if hf_token else "not_configured"}

    return {
        "status": overall,
        "environment": settings.environment,
        "checks": checks,
    }


# ── Lifecycle ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup_event():
    # Create tables for any model not yet in the DB (dev/test only).
    # In production, use: alembic upgrade head
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified/created.")

    # Initialize Cache (Redis if available, else InMemory)
    redis_password = os.getenv("REDIS_PASSWORD", "")
    redis_host = os.getenv("REDIS_HOST", "localhost" if settings.environment == "development" else "redis")
    redis_port = os.getenv("REDIS_PORT", "6379")
    
    try:
        from fastapi_cache.backends.inmemory import InMemoryBackend
        
        # Only attempt Redis if explicitly enabled or in production
        if os.getenv("REDIS_HOST") or settings.environment == "production":
            if redis_password:
                redis_url = f"redis://:{redis_password}@{redis_host}:{redis_port}/2"
            else:
                redis_url = f"redis://{redis_host}:{redis_port}/2"
            redis = aioredis.from_url(redis_url, encoding="utf8", decode_responses=True, socket_connect_timeout=2)
            FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
            logger.info("Redis cache initialized.")
        else:
            FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")
            logger.info("In-memory cache backend initialized (local dev mode).")
    except Exception as exc:
        from fastapi_cache.backends.inmemory import InMemoryBackend
        FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")
        logger.warning("Redis unavailable (%s), fallen back to InMemoryBackend.", exc)


@app.on_event("shutdown")
def shutdown_event():
    logger.info("Application shutdown.")

