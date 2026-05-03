"""Minimal FastAPI entrypoint for checking API endpoints."""

from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from core.database import Base, engine

# Import models so SQLAlchemy metadata is registered.
import models  # noqa: F401

# Import schemas so the package modules load cleanly.
from schemas import ai, auth, feedback, message, patient, prescription, reminder, report, risk, session, triage, visit, schedule  # noqa: F401

from api.v1.router import api_router

app = FastAPI(title="MedAssist API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    inspector = inspect(engine)
    if "patient_profiles" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("patient_profiles")}
        if "address" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE patient_profiles ADD COLUMN address VARCHAR"))

    # Start the medicine reminder background scheduler
    from core.scheduler import start_scheduler
    start_scheduler()


@app.on_event("shutdown")
def shutdown_event():
    from core.scheduler import stop_scheduler
    stop_scheduler()
