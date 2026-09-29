"""Alembic environment configuration — wired to MedAssist app settings."""

import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool

from alembic import context

# ── Path setup ────────────────────────────────────────────────────────────────
# Make the backend package importable regardless of where alembic is invoked.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# ── App imports ───────────────────────────────────────────────────────────────
# Import settings FIRST (before models) so DATABASE_URL is available.
from core.config import settings  # noqa: E402
from core.database import Base   # noqa: E402

# Import ALL models so their tables are registered on Base.metadata.
# Alembic needs to see every model to generate accurate autogenerate diffs.
import models  # noqa: F401, E402  (registers all 19 models)

# ── Alembic config ────────────────────────────────────────────────────────────
config = context.config

# Override sqlalchemy.url with the value from our .env / environment variable.
# This means DATABASE_URL in .env controls both the app AND migrations.
config.set_main_option("sqlalchemy.url", settings.database_url)

# Set up Python logging from alembic.ini.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# The metadata object Alembic will diff against the live DB.
target_metadata = Base.metadata


# ── Render item filter ────────────────────────────────────────────────────────
def include_object(object, name, type_, reflected, compare_to):
    """
    Exclude views and internal SQLite tables from migration generation.
    Returns True to include the object in autogenerate.
    """
    if type_ == "table" and name.startswith("sqlite_"):
        return False
    return True


# ── Migration runners ─────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    """
    Offline mode: emit SQL to stdout without a live DB connection.
    Useful for generating SQL scripts to review before applying.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        compare_type=True,           # Detect column type changes
        compare_server_default=True, # Detect default value changes
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Online mode: connect to the DB and apply migrations directly.
    This is what `alembic upgrade head` uses.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # Use NullPool for migrations (no persistent connections)
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
