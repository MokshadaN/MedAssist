"""p2_request_idempotency

Revision ID: b7c9d1e3f5a2
Revises: a1f4c6d8e2b0
Create Date: 2026-10-02 21:20:00.000000

Enforces one visit per intake session and adds caller-supplied reminder
idempotency keys. Existing duplicate visits are preserved but detached from
the duplicated session after the earliest visit, allowing the unique index to
be installed without deleting clinical records.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c9d1e3f5a2"
down_revision: Union[str, None] = "a1f4c6d8e2b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _detach_duplicate_visit_sessions() -> None:
    bind = op.get_bind()
    duplicate_sessions = list(
        bind.execute(
            sa.text(
                """
                SELECT session_id
                FROM visits
                WHERE session_id IS NOT NULL
                GROUP BY session_id
                HAVING COUNT(*) > 1
                """
            )
        ).scalars()
    )

    for session_id in duplicate_sessions:
        visit_ids = list(
            bind.execute(
                sa.text(
                    """
                    SELECT id
                    FROM visits
                    WHERE session_id = :session_id
                    ORDER BY
                        CASE WHEN created_at IS NULL THEN 1 ELSE 0 END,
                        created_at ASC,
                        id ASC
                    """
                ),
                {"session_id": session_id},
            ).scalars()
        )
        if len(visit_ids) > 1:
            bind.execute(
                sa.text(
                    """
                    UPDATE visits
                    SET session_id = NULL
                    WHERE id IN :duplicate_ids
                    """
                ).bindparams(
                    sa.bindparam("duplicate_ids", expanding=True)
                ),
                {"duplicate_ids": visit_ids[1:]},
            )


def upgrade() -> None:
    op.add_column(
        "reminders",
        sa.Column("idempotency_key", sa.String(length=255), nullable=True),
    )
    _detach_duplicate_visit_sessions()
    op.create_index(
        "uq_visits_session_id",
        "visits",
        ["session_id"],
        unique=True,
    )
    op.create_index(
        "uq_reminders_user_id_idempotency_key",
        "reminders",
        ["user_id", "idempotency_key"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "uq_reminders_user_id_idempotency_key",
        table_name="reminders",
    )
    op.drop_index("uq_visits_session_id", table_name="visits")
    op.drop_column("reminders", "idempotency_key")
