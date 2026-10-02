"""FastAPI entrypoint — production hardened."""

import logging
from pathlib import Path
import sys

# Use the OS certificate store for TLS (Windows: corporate/university SSL
# inspection proxies aren't in Python's bundled CA list). Must run before
# any network library (requests/httpx) performs TLS.
import truststore  # noqa: E402
truststore.inject_into_ssl()

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
from core.domain_errors import (
    ActionForbidden,
    DomainError,
    ResourceConflict,
    ResourceNotFound,
    ServiceUnavailable,
)
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
from services import ai_service

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

_DOMAIN_ERROR_STATUS = {
    ResourceNotFound: 404,
    ActionForbidden: 403,
    ResourceConflict: 409,
    ServiceUnavailable: 503,
}


@app.exception_handler(DomainError)
async def domain_error_handler(_request: Request, exc: DomainError):
    status_code = next(
        (
            mapped_status
            for error_type, mapped_status in _DOMAIN_ERROR_STATUS.items()
            if isinstance(exc, error_type)
        ),
        400,
    )
    return JSONResponse(
        status_code=status_code,
        content={"detail": exc.detail, "code": exc.code},
    )

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
    google_keys = ai_service._get_api_keys()
    checks["gemini_api"] = {
        "status": "configured" if google_keys else "not_configured",
        "keys": len(google_keys),
    }
    if not google_keys:
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
    # Schema management (P0):
    # - development/test: create any missing tables for convenience.
    # - production: Alembic is the ONLY schema path. The compose command runs
    #   `alembic upgrade head` before the app starts; the app must never
    #   mutate the schema at runtime.
    if settings.environment != "production":
        Base.metadata.create_all(bind=engine)
        logger.info("Development mode: database tables verified/created (production uses Alembic only).")
    else:
        logger.info("Production mode: skipping create_all — schema is managed by Alembic.")

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

