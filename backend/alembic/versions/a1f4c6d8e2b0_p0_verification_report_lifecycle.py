"""p0_doctor_verification_and_report_lifecycle

Revision ID: a1f4c6d8e2b0
Revises: 834a22f77aa9
Create Date: 2026-10-02 13:05:00.000000

P0 changes:
- doctor_profiles: verification columns that previously only existed via
  ``Base.metadata.create_all`` (schema drift), plus the manual-approval
  workflow columns (verification_status, submitted_at, verified_by,
  verification_note).
- patient_profiles: emergency QR profile consent + opaque access token.
- reports: analysis lifecycle status column.
- prescriptions: idempotent background risk-check lifecycle.
- reminders and sent_reminders: idempotent notification delivery states.

The upgrade is idempotent with respect to existing columns: any column that
already exists (for example on a development database previously created with
``create_all``) is skipped, so this revision can run against both a clean
production database and an existing development database.

Security migration: all doctors that pre-date the controlled manual-review
workflow are reset to unverified/pending. Previous ``is_verified`` values may
have originated from regex or demo-data matching and cannot be trusted. Every
existing doctor must be reviewed again by an administrator.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1f4c6d8e2b0'
down_revision: Union[str, None] = '834a22f77aa9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns(table_name: str) -> set[str]:
    """Return the set of column names currently present on a table."""
    inspector = sa.inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def _add_missing_columns(table_name: str, columns: list[sa.Column]) -> None:
    """Add only the columns that do not already exist on the table."""
    existing = _existing_columns(table_name)
    for column in columns:
        if column.name in existing:
            continue
        op.add_column(table_name, column)


# (column_name, column, table) triples added by this revision.
_DOCTOR_COLUMNS: list[tuple[str, sa.Column]] = [
    ("is_verified", sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false())),
    ("state_council", sa.Column("state_council", sa.String(), nullable=True)),
    ("qualification", sa.Column("qualification", sa.String(), nullable=True)),
    ("registration_year", sa.Column("registration_year", sa.Integer(), nullable=True)),
    ("verification_source", sa.Column("verification_source", sa.String(), nullable=True)),
    ("verified_at", sa.Column("verified_at", sa.DateTime(), nullable=True)),
    ("verification_status", sa.Column("verification_status", sa.String(), nullable=False, server_default="pending")),
    ("submitted_at", sa.Column("submitted_at", sa.DateTime(), nullable=True)),
    ("verified_by", sa.Column("verified_by", sa.String(), nullable=True)),
    ("verification_note", sa.Column("verification_note", sa.String(), nullable=True)),
]

_PATIENT_COLUMNS: list[tuple[str, sa.Column]] = [
    ("emergency_profile_enabled", sa.Column("emergency_profile_enabled", sa.Boolean(), nullable=False, server_default=sa.false())),
    ("emergency_access_token", sa.Column("emergency_access_token", sa.String(), nullable=True)),
    ("emergency_token_expires_at", sa.Column("emergency_token_expires_at", sa.DateTime(), nullable=True)),
]

_REPORT_COLUMNS: list[tuple[str, sa.Column]] = [
    ("analysis_status", sa.Column("analysis_status", sa.String(), nullable=False, server_default="uploaded")),
    ("analysis_job_id", sa.Column("analysis_job_id", sa.String(), nullable=True)),
    (
        "analysis_status_updated_at",
        sa.Column(
            "analysis_status_updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    ),
    ("analysis_error", sa.Column("analysis_error", sa.String(length=255), nullable=True)),
]

_PRESCRIPTION_COLUMNS: list[tuple[str, sa.Column]] = [
    (
        "risk_status",
        sa.Column("risk_status", sa.String(), nullable=False, server_default="not_requested"),
    ),
    ("risk_job_id", sa.Column("risk_job_id", sa.String(), nullable=True)),
    (
        "risk_status_updated_at",
        sa.Column(
            "risk_status_updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    ),
    ("risk_error", sa.Column("risk_error", sa.String(length=255), nullable=True)),
]

_REMINDER_COLUMNS: list[tuple[str, sa.Column]] = [
    (
        "email_24h_status",
        sa.Column("email_24h_status", sa.String(), nullable=False, server_default="pending"),
    ),
    ("email_24h_error", sa.Column("email_24h_error", sa.String(length=255), nullable=True)),
    (
        "email_24h_status_updated_at",
        sa.Column(
            "email_24h_status_updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    ),
    (
        "email_1h_status",
        sa.Column("email_1h_status", sa.String(), nullable=False, server_default="pending"),
    ),
    ("email_1h_error", sa.Column("email_1h_error", sa.String(length=255), nullable=True)),
    (
        "email_1h_status_updated_at",
        sa.Column(
            "email_1h_status_updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    ),
]

_SENT_REMINDER_COLUMNS: list[tuple[str, sa.Column]] = [
    ("attempts", sa.Column("attempts", sa.Integer(), nullable=False, server_default="0")),
    ("error", sa.Column("error", sa.String(length=255), nullable=True)),
    (
        "updated_at",
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    ),
]


def upgrade() -> None:
    _add_missing_columns("doctor_profiles", [column for _, column in _DOCTOR_COLUMNS])
    _add_missing_columns("patient_profiles", [column for _, column in _PATIENT_COLUMNS])
    _add_missing_columns("reports", [column for _, column in _REPORT_COLUMNS])
    _add_missing_columns("prescriptions", [column for _, column in _PRESCRIPTION_COLUMNS])
    _add_missing_columns("reminders", [column for _, column in _REMINDER_COLUMNS])
    _add_missing_columns(
        "sent_reminders",
        [column for _, column in _SENT_REMINDER_COLUMNS],
    )

    # Remove historical duplicate delivery markers before enforcing the
    # business idempotency key.
    sent_reminders = sa.table(
        "sent_reminders",
        sa.column("id", sa.String()),
        sa.column("schedule_id", sa.String()),
        sa.column("reminder_time", sa.String()),
        sa.column("sent_date", sa.Date()),
    )
    keep_ids = (
        sa.select(sa.func.min(sent_reminders.c.id))
        .group_by(
            sent_reminders.c.schedule_id,
            sent_reminders.c.reminder_time,
            sent_reminders.c.sent_date,
        )
    )
    op.execute(sent_reminders.delete().where(sent_reminders.c.id.not_in(keep_ids)))

    inspector = sa.inspect(op.get_bind())
    existing_unique = {
        constraint["name"]
        for constraint in inspector.get_unique_constraints("sent_reminders")
    }
    if "uq_sent_reminder_delivery" not in existing_unique:
        if op.get_bind().dialect.name == "sqlite":
            with op.batch_alter_table("sent_reminders") as batch_op:
                batch_op.create_unique_constraint(
                    "uq_sent_reminder_delivery",
                    ["schedule_id", "reminder_time", "sent_date"],
                )
        else:
            op.create_unique_constraint(
                "uq_sent_reminder_delivery",
                "sent_reminders",
                ["schedule_id", "reminder_time", "sent_date"],
            )

    # This revision introduces the authoritative manual-review workflow.
    # Reset all pre-existing rows after the columns exist; Alembic applies the
    # revision once, so later legitimate approvals are unaffected.
    doctor_profiles = sa.table(
        "doctor_profiles",
        sa.column("is_verified", sa.Boolean()),
        sa.column("verification_status", sa.String()),
        sa.column("verification_source", sa.String()),
        sa.column("verified_at", sa.DateTime()),
        sa.column("verified_by", sa.String()),
        sa.column("verification_note", sa.String()),
    )
    op.execute(
        doctor_profiles.update().values(
            is_verified=False,
            verification_status="pending",
            verification_source=None,
            verified_at=None,
            verified_by=None,
            verification_note=None,
        )
    )


def downgrade() -> None:
    existing = {
        table: _existing_columns(table)
        for table in (
            "doctor_profiles",
            "patient_profiles",
            "reports",
            "prescriptions",
            "reminders",
            "sent_reminders",
        )
    }

    sent_unique = {
        constraint["name"]
        for constraint in sa.inspect(op.get_bind()).get_unique_constraints("sent_reminders")
    }
    if "uq_sent_reminder_delivery" in sent_unique:
        if op.get_bind().dialect.name == "sqlite":
            with op.batch_alter_table("sent_reminders") as batch_op:
                batch_op.drop_constraint("uq_sent_reminder_delivery", type_="unique")
        else:
            op.drop_constraint(
                "uq_sent_reminder_delivery",
                "sent_reminders",
                type_="unique",
            )
    for name, column in _SENT_REMINDER_COLUMNS:
        if name in existing["sent_reminders"]:
            op.drop_column("sent_reminders", name)
    for name, column in _REMINDER_COLUMNS:
        if name in existing["reminders"]:
            op.drop_column("reminders", name)
    for name, column in _PRESCRIPTION_COLUMNS:
        if name in existing["prescriptions"]:
            op.drop_column("prescriptions", name)
    for name, column in _REPORT_COLUMNS:
        if name in existing["reports"]:
            op.drop_column("reports", name)
    for name, column in _PATIENT_COLUMNS:
        if name in existing["patient_profiles"]:
            op.drop_column("patient_profiles", name)
    for name, column in _DOCTOR_COLUMNS:
        if name in existing["doctor_profiles"]:
            op.drop_column("doctor_profiles", name)