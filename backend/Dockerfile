# ── Builder stage ─────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install only runtime system libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

# Create a non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app

# Create uploads directory with correct permissions
RUN mkdir -p /app/uploads/reports && chown -R appuser:appgroup /app/uploads

USER appuser

EXPOSE 8000

# Default: run migrations then start Uvicorn
# Override this in docker-compose or Kubernetes for the Celery worker
CMD ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4 --no-access-log"]
