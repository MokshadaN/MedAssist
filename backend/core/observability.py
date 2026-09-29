"""
Observability bootstrap — call setup_observability(app) once at startup.

Integrates:
  - Sentry: error tracking + performance traces
  - OpenTelemetry: distributed tracing (optional, if OTEL_ENDPOINT is set)
"""

import logging

logger = logging.getLogger(__name__)


def setup_sentry(settings) -> None:
    """Initialize Sentry SDK if SENTRY_DSN is configured."""
    if not settings.sentry_dsn:
        logger.info("Sentry DSN not configured — skipping Sentry initialization.")
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration

        sentry_logging = LoggingIntegration(
            level=logging.WARNING,    # Capture warnings and above as breadcrumbs
            event_level=logging.ERROR,  # Send errors to Sentry as events
        )

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            integrations=[
                FastApiIntegration(transaction_style="url"),
                SqlalchemyIntegration(),
                sentry_logging,
            ],
            traces_sample_rate=settings.sentry_traces_sample_rate,
            # CRITICAL: Never send PHI (patient data) to Sentry
            send_default_pii=False,
            # Ignore common noise
            ignore_errors=[
                KeyboardInterrupt,
                SystemExit,
            ],
            before_send=_scrub_sensitive_data,
            release=f"medassist@1.0.0",
        )
        logger.info(
            "Sentry initialized | env=%s | traces=%.0f%%",
            settings.environment,
            settings.sentry_traces_sample_rate * 100,
        )
    except Exception as exc:
        logger.warning("Failed to initialize Sentry: %s", exc)


def _scrub_sensitive_data(event: dict, hint: dict) -> dict:
    """
    Strip PHI and sensitive fields from Sentry events before they leave the server.
    HIPAA compliance: patient data must NEVER reach third-party error trackers.
    """
    _SENSITIVE_KEYS = {
        "password", "password_hash", "token", "access_token", "refresh_token",
        "authorization", "secret_key", "api_key", "hf_token",
        # PHI fields
        "allergies", "chronic_conditions", "address", "blood_type",
        "subjective", "objective", "assessment", "plan",
    }

    def _scrub(obj):
        if isinstance(obj, dict):
            return {
                k: "[REDACTED]" if k.lower() in _SENSITIVE_KEYS else _scrub(v)
                for k, v in obj.items()
            }
        if isinstance(obj, list):
            return [_scrub(item) for item in obj]
        return obj

    return _scrub(event)


def setup_opentelemetry(app, settings) -> None:
    """
    Initialize OpenTelemetry tracing if OTEL_ENDPOINT is configured.
    Instruments FastAPI requests and SQLAlchemy queries automatically.
    """
    if not settings.otel_endpoint:
        logger.info("OTEL_ENDPOINT not set — skipping OpenTelemetry initialization.")
        return

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

        resource = Resource.create({"service.name": "medassist-backend", "deployment.environment": settings.environment})
        provider = TracerProvider(resource=resource)

        exporter = OTLPSpanExporter(endpoint=settings.otel_endpoint)
        provider.add_span_processor(BatchSpanProcessor(exporter))

        trace.set_tracer_provider(provider)

        FastAPIInstrumentor.instrument_app(app)
        SQLAlchemyInstrumentor().instrument()

        logger.info("OpenTelemetry initialized → %s", settings.otel_endpoint)
    except Exception as exc:
        logger.warning("Failed to initialize OpenTelemetry: %s", exc)


def setup_observability(app, settings) -> None:
    """Entry point — call once during app startup."""
    setup_sentry(settings)
    setup_opentelemetry(app, settings)
