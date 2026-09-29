"""
Structured logging configuration for MedAssist.

Development: human-readable coloured console output
Production:  JSON lines (one JSON object per log entry — Datadog/CloudWatch ready)
"""

import logging
import logging.config
import sys
from typing import Any


class _JsonFormatter(logging.Formatter):
    """
    Emit each log record as a single JSON line.
    Fields: timestamp, level, logger, message, + any extra kwargs.
    """

    def format(self, record: logging.LogRecord) -> str:
        import json
        from datetime import datetime, timezone

        data: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Attach exception info if present
        if record.exc_info:
            data["exception"] = self.formatException(record.exc_info)

        # Attach any extra fields the caller passed as keyword args
        for key, value in record.__dict__.items():
            if key not in {
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "message",
                "taskName",
            }:
                data[key] = value

        return json.dumps(data, default=str, ensure_ascii=False)


class _DevFormatter(logging.Formatter):
    """Human-readable coloured formatter for development."""

    _COLOURS = {
        "DEBUG":    "\033[36m",  # Cyan
        "INFO":     "\033[32m",  # Green
        "WARNING":  "\033[33m",  # Yellow
        "ERROR":    "\033[31m",  # Red
        "CRITICAL": "\033[35m",  # Magenta
    }
    _RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        colour = self._COLOURS.get(record.levelname, "")
        reset = self._RESET
        record.levelname = f"{colour}{record.levelname:<8}{reset}"
        return super().format(record)


def configure_logging(environment: str = "development", log_level: str = "INFO") -> None:
    """
    Configure root logger.

    Args:
        environment: "development" or "production"
        log_level:   "DEBUG" | "INFO" | "WARNING" | "ERROR"
    """
    level = getattr(logging, log_level.upper(), logging.INFO)

    if environment == "production":
        formatter = _JsonFormatter()
    else:
        formatter = _DevFormatter(
            fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%H:%M:%S",
        )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    # Configure root logger
    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)

    # Reduce noise from chatty third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("google").setLevel(logging.WARNING)
    logging.getLogger("grpc").setLevel(logging.WARNING)

    logging.getLogger("medassist").setLevel(level)

    logging.getLogger(__name__).info(
        "Logging configured | environment=%s level=%s format=%s",
        environment,
        log_level,
        "json" if environment == "production" else "console",
    )
