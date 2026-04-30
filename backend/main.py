"""Minimal FastAPI entrypoint for checking API endpoints."""

from pathlib import Path
import sys

from fastapi import FastAPI

# Allow running from the repo root with `uvicorn backend.main:app`.
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.database import Base, engine

# Import models so SQLAlchemy metadata is registered.
import models  # noqa: F401

# Import schemas so the package modules load cleanly.
from schemas import ai, auth, feedback, message, prescription, reminder, report, session, triage, visit  # noqa: F401

from api.v1.router import api_router

app = FastAPI(title="MedAssist API", version="0.1.0")

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
