"""reconcile_p0_schema_drift

Revision ID: c3e7a9b1d5f4
Revises: b7c9d1e3f5a2
Create Date: 2026-10-02 21:45:00.000000

Forward-only repair for databases that recorded the P0 revision before all of
its lifecycle columns were present. The checks make this a no-op on databases
that already have the complete schema.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3e7a9b1d5f4"
down_revision: Union[str, None] = "b7c9d1e3f5a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_MISSING_COLUMN_CANDIDATES: dict[str, list[sa.Column]] = {
    "reports": [
        sa.Column("analysis_job_id", sa.String(), nullable=True),
        sa.Column(
            "analysis_status_updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("analysis_error", sa.String(length=255), nullable=True),
    ],
    "prescriptions": [
        sa.Column(
            "risk_status",
            sa.String(),
            nullable=False,
            server_default="not_requested",
        ),
        sa.Column("risk_job_id", sa.String(), nullable=True),
        sa.Column(
            "risk_status_updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("risk_error", sa.String(length=255), nullable=True),
    ],
    "reminders": [
        sa.Column(
            "email_24h_status",
            sa.String(),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("email_24h_error", sa.String(length=255), nullable=True),
        sa.Column(
            "email_24h_status_updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "email_1h_status",
            sa.String(),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("email_1h_error", sa.String(length=255), nullable=True),
        sa.Column(
            "email_1h_status_updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    ],
    "sent_reminders": [
        sa.Column(
            "attempts",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("error", sa.String(length=255), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    ],
}


def _add_missing_columns() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())
    for table_name, candidates in _MISSING_COLUMN_CANDIDATES.items():
        if table_name not in table_names:
            continue
        existing = {
            column["name"]
            for column in sa.inspect(bind).get_columns(table_name)
        }
        sqlite_timestamps: list[str] = []
        for column in candidates:
            if column.name in existing:
                continue
            if bind.dialect.name == "sqlite" and isinstance(column.type, sa.DateTime):
                # SQLite cannot ALTER a populated table with a non-constant
                # CURRENT_TIMESTAMP default. Add it nullable, backfill existing
                # rows, then rebuild the table once to enforce the final shape.
                op.add_column(
                    table_name,
                    sa.Column(column.name, sa.DateTime(), nullable=True),
                )
                repair_table = sa.table(
                    table_name,
                    sa.column(column.name, sa.DateTime()),
                )
                op.execute(
                    repair_table.update()
                    .where(repair_table.c[column.name].is_(None))
                    .values({column.name: sa.func.current_timestamp()})
                )
                sqlite_timestamps.append(column.name)
            else:
                op.add_column(table_name, column)

        if sqlite_timestamps:
            with op.batch_alter_table(table_name) as batch_op:
                for column_name in sqlite_timestamps:
                    batch_op.alter_column(
                        column_name,
                        existing_type=sa.DateTime(),
                        nullable=False,
                        server_default=sa.text("CURRENT_TIMESTAMP"),
                    )


def _ensure_sent_reminder_uniqueness() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "sent_reminders" not in inspector.get_table_names():
        return

    constraint_name = "uq_sent_reminder_delivery"
    unique_names = {
        constraint["name"]
        for constraint in inspector.get_unique_constraints("sent_reminders")
    }
    unique_names.update(
        index["name"]
        for index in inspector.get_indexes("sent_reminders")
        if index.get("unique")
    )
    if constraint_name in unique_names:
        return

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

    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("sent_reminders") as batch_op:
            batch_op.create_unique_constraint(
                constraint_name,
                ["schedule_id", "reminder_time", "sent_date"],
            )
    else:
        op.create_unique_constraint(
            constraint_name,
            "sent_reminders",
            ["schedule_id", "reminder_time", "sent_date"],
        )


def upgrade() -> None:
    _add_missing_columns()
    _ensure_sent_reminder_uniqueness()


def downgrade() -> None:
    # Intentionally retained: these columns and the delivery constraint belong
    # to the earlier P0 schema. Removing them would recreate the broken state.
    pass
