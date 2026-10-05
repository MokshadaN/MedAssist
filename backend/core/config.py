"""Environment configuration."""

import os
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    # ── Security ──────────────────────────────────────────────────────────────
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins, e.g.
    #   ALLOWED_ORIGINS=https://app.medassist.io,https://www.medassist.io
    # Defaults to localhost:5173 for local dev only.
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    # ── Database ───────────────────────────────────────────────────────────────
    database_url: str = f"sqlite:///{(BASE_DIR / 'medassist.db').as_posix()}"
    hf_token: str = ""

    # ── Report uploads (P0) ───────────────────────────────────────────────────
    # Single configured upload path shared by the API and the Celery workers.
    # Defaults to <backend>/uploads/reports, which is the directory created in
    # the Docker image (/app/uploads/reports). Override with the UPLOAD_DIR env
    # var when using an externally mounted volume.
    upload_dir: str = str(BASE_DIR / "uploads" / "reports")
    # A worker is hard-killed after 10 minutes. A report may be recovered only
    # after a longer interval so a legitimately slow analysis is not duplicated.
    report_analysis_stale_minutes: int = 15
    risk_check_stale_minutes: int = 15

    # ── Clinical triage classifier ────────────────────────────────────────────
    # Shadow mode never changes patient-facing urgency. It remains unavailable
    # until a validated, calibrated classifier adapter is explicitly injected.
    triage_classifier_shadow_enabled: bool = False

    # ── Emergency QR profile (P0) ──────────────────────────────────────────────
    # How long an emergency access token stays valid before the patient must
    # regenerate it (rotation keeps leaked QR URLs short-lived).
    emergency_qr_validity_days: int = 365

    # ── SMTP ──────────────────────────────────────────────────────────────────
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_from: str = "noreply@medassist.local"
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_tls: bool = True

    # ── Twilio WhatsApp ────────────────────────────────────────────────────────
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = ""  # e.g. "whatsapp:+14155238886"

    # ── Environment ────────────────────────────────────────────────────────────
    environment: str = "development"  # "development" | "production"

    # ── Observability ──────────────────────────────────────────────────────────
    # Sentry error tracking — leave blank to disable
    sentry_dsn: str = ""
    # Traces sample rate: 0.0 = off, 0.1 = 10%, 1.0 = 100% (expensive in prod)
    sentry_traces_sample_rate: float = 0.05
    # OpenTelemetry OTLP endpoint (e.g. http://jaeger:4318/v1/traces)
    otel_endpoint: str = ""
    # Log level: DEBUG | INFO | WARNING | ERROR
    log_level: str = "INFO"


    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Validators ────────────────────────────────────────────────────────────

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        env = os.getenv("ENVIRONMENT", "development").lower()
        if env == "production":
            if v == "change-me-in-production":
                raise ValueError(
                    "SECRET_KEY must be set to a secure value in production. "
                    "Generate one with: openssl rand -hex 32"
                )
            if len(v) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters in production.")
        return v

    @field_validator("database_url", mode="before")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if v:
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+psycopg2://", 1)
            elif v.startswith("postgresql://"):
                return v.replace("postgresql://", "postgresql+psycopg2://", 1)
        return v

    def get_allowed_origins(self) -> List[str]:
        """Parse the comma-separated allowed_origins string into a list."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

