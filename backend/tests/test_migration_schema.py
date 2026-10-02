"""Validate that a real Alembic upgrade produces the ORM schema."""

import os
from pathlib import Path
import subprocess
import sys

from sqlalchemy import create_engine, inspect, text

from core.database import Base
import models  # noqa: F401  # register every model on Base.metadata


BACKEND_DIR = Path(__file__).resolve().parents[1]


def _upgrade_to_head(database_path: Path) -> None:
    database_url = f"sqlite:///{database_path.as_posix()}"
    env = {
        **os.environ,
        "DATABASE_URL": database_url,
        "ENVIRONMENT": "development",
        "SENTRY_DSN": "",
    }

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_alembic_upgrade_head_has_no_missing_model_columns(tmp_path):
    database_path = tmp_path / "migration_schema.db"
    database_url = f"sqlite:///{database_path.as_posix()}"
    _upgrade_to_head(database_path)

    engine = create_engine(database_url)
    try:
        inspector = inspect(engine)
        database_tables = set(inspector.get_table_names())
        missing: dict[str, list[str]] = {}
        for table_name, table in Base.metadata.tables.items():
            if table_name not in database_tables:
                missing[table_name] = ["<table missing>"]
                continue
            database_columns = {
                column["name"]
                for column in inspector.get_columns(table_name)
            }
            absent_columns = sorted(set(table.columns.keys()) - database_columns)
            if absent_columns:
                missing[table_name] = absent_columns

        assert missing == {}

        sent_unique_sets = {
            tuple(constraint["column_names"])
            for constraint in inspector.get_unique_constraints("sent_reminders")
        }
        sent_unique_sets.update(
            tuple(index["column_names"])
            for index in inspector.get_indexes("sent_reminders")
            if index.get("unique")
        )
        assert ("schedule_id", "reminder_time", "sent_date") in sent_unique_sets

        visit_unique_indexes = {
            tuple(index["column_names"])
            for index in inspector.get_indexes("visits")
            if index.get("unique")
        }
        reminder_unique_indexes = {
            tuple(index["column_names"])
            for index in inspector.get_indexes("reminders")
            if index.get("unique")
        }
        assert ("session_id",) in visit_unique_indexes
        assert ("user_id", "idempotency_key") in reminder_unique_indexes
    finally:
        engine.dispose()


def test_corrective_revision_repairs_an_already_stamped_partial_schema(tmp_path):
    database_path = tmp_path / "partial_schema.db"
    database_url = f"sqlite:///{database_path.as_posix()}"
    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)"))
        connection.execute(
            text("INSERT INTO alembic_version (version_num) VALUES ('b7c9d1e3f5a2')")
        )
        connection.execute(
            text(
                "CREATE TABLE reports ("
                "id VARCHAR PRIMARY KEY, analysis_status VARCHAR NOT NULL"
                ")"
            )
        )
        connection.execute(
            text("CREATE TABLE prescriptions (id VARCHAR PRIMARY KEY)")
        )
        connection.execute(
            text(
                "CREATE TABLE reminders ("
                "id VARCHAR PRIMARY KEY, user_id VARCHAR, idempotency_key VARCHAR(255)"
                ")"
            )
        )
        connection.execute(
            text(
                "CREATE TABLE sent_reminders ("
                "id VARCHAR PRIMARY KEY, schedule_id VARCHAR, "
                "reminder_time VARCHAR, sent_date DATE"
                ")"
            )
        )
        connection.execute(
            text(
                "INSERT INTO sent_reminders "
                "(id, schedule_id, reminder_time, sent_date) VALUES "
                "('one', 'schedule', '09:00', '2026-10-02'), "
                "('two', 'schedule', '09:00', '2026-10-02')"
            )
        )
    engine.dispose()

    _upgrade_to_head(database_path)

    engine = create_engine(database_url)
    try:
        inspector = inspect(engine)
        expected_columns = {
            "reports": {
                "analysis_job_id",
                "analysis_status_updated_at",
                "analysis_error",
            },
            "prescriptions": {
                "risk_status",
                "risk_job_id",
                "risk_status_updated_at",
                "risk_error",
            },
            "reminders": {
                "email_24h_status",
                "email_24h_error",
                "email_24h_status_updated_at",
                "email_1h_status",
                "email_1h_error",
                "email_1h_status_updated_at",
            },
            "sent_reminders": {"attempts", "error", "updated_at"},
        }
        for table_name, expected in expected_columns.items():
            actual = {
                column["name"]
                for column in inspector.get_columns(table_name)
            }
            assert expected - actual == set()

        with engine.connect() as connection:
            delivery_count = connection.execute(
                text("SELECT COUNT(*) FROM sent_reminders")
            ).scalar_one()
        assert delivery_count == 1
    finally:
        engine.dispose()
