---
name: medassist-performance
description: Improves MedAssist backend, frontend, and AI latency using measured, PHI-safe optimizations. Use when implementing or reviewing database queries, indexes, pagination, dashboard loading, caching, AI model selection, OCR, connection pooling, or production asset delivery.
---

# MedAssist Performance

Optimize only after authorization, PHI isolation, migrations, and correctness are preserved. Never trade clinical safety for lower latency.

## Current technical baseline

### Backend and API

- FastAPI with SQLAlchemy and Alembic.
- JWT authentication with centralized patient ownership, doctor-patient relationship, and verified-doctor checks.
- Domain exceptions are mapped to stable HTTP responses at the FastAPI boundary.
- Routers delegate report, risk, reminder, schedule, prescription, session, and visit workflows to services.
- List APIs use bounded `limit`/`offset` pagination while preserving array response shapes.
- Visits and reminders support idempotent retries. Report, risk, and notification jobs also prevent duplicate work.
- Production startup uses Alembic instead of `create_all`; development may still create missing tables.

### Background work

- Celery uses Redis as broker and result backend.
- Tasks are routed to `ai`, `notifications`, `triage`, and default `celery` queues.
- Celery Beat is the only scheduler; APScheduler and cron stubs were removed.
- Report and risk jobs use persisted `queued`, `processing`, `completed`, and `failed` states.
- Workers claim jobs atomically, reject stale task IDs, and allow controlled retry of the same job.

### Reports and storage

- Upload paths are configured centrally and shared with workers.
- Synchronous and asynchronous analysis use the same persistence path.
- Extracted metrics are persisted for charts.
- Upload validation, authorized downloads, lifecycle states, stale-job recovery, and duplicate-job protection exist.
- Local/shared-volume storage is not equivalent to encrypted object storage, malware scanning, backups, or staging proof.

### Frontend

- React and Vite power the single-page application.
- Dashboard domains load independently with `Promise.allSettled`, so one failed API does not blank the whole dashboard.
- The frontend remains largely monolithic in `App.tsx`; splitting it is separate maintainability work.

### Cache

- FastAPI Cache uses Redis when available and an in-memory fallback for local development.
- Doctor-directory responses use a short TTL.
- Hospital lookup responses use a longer TTL.
- Do not broadly cache SOAP notes, reports, prescriptions, transcripts, or other PHI.

### AI and triage

- General text generation tries Gemini models in this order:
  `gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.6-flash`, then `gemini-3.5-flash-lite`.
- Exhausted or unavailable Gemini calls fall back to Groq `openai/gpt-oss-120b`.
- Voice transcription uses Groq `whisper-large-v3-turbo`.
- Report image analysis currently uses `gemini-2.5-flash`.
- Risk embeddings use Hugging Face `NeuML/pubmedbert-base-embeddings`; this is not the live triage classifier.
- Triage first runs deterministic raw-text emergency rules.
- Groq `openai/gpt-oss-20b` then `openai/gpt-oss-120b` perform extraction only.
- Extracted, validated safety concepts may trigger a fixed escalation policy; the LLM does not diagnose or directly assign urgency.
- Missing, conflicting, or malformed extraction becomes `abstain/review_required`, never `routine`.
- A clinical classifier interface exists only for shadow mode; no trained classifier is bundled.
- Hospital lookup tries bounded alternate Overpass providers after confirmed emergencies.

Follow the separate `medassist-safe-triage` skill for any triage change.

## Performance workflow

1. Record a representative baseline.
2. Identify whether time is spent in SQL, external providers, workers, or frontend request orchestration.
3. Make one focused change.
4. Verify RBAC, response contracts, idempotency, and migrations.
5. Re-measure with the same workload.
6. Report latency, request/query count, failure behavior, and trade-offs.

Do not claim an improvement without before-and-after evidence.

## Database guidance

- Inspect existing indexes and Alembic revisions before adding another index.
- Prioritize measured filters, joins, and sort columns.
- Add schema changes only through Alembic.
- Avoid N+1 queries with joins, eager loading, or bounded aggregate queries.
- Preserve deterministic ordering for pagination.
- Do not tune PostgreSQL pool sizes without connection and wait-time measurements.

## External-provider guidance

- Use explicit timeouts, bounded retries, circuit breakers, and small prompts.
- Rotate providers or models only when the failure is retryable.
- Never log prompts, transcripts, extracted facts, credentials, or other PHI.
- Do not send real PHI to a free provider without an approved privacy agreement and data-handling configuration.
- Speech-to-text ambiguity must trigger clarification rather than silently changing one clinical term into another.

## Safe caching

Cache public or low-risk reference data first. If PHI caching is later justified:

- authorize before cache lookup and again before returning data;
- include user, role, patient, query, and schema version in the key;
- use short TTLs and explicit invalidation;
- prove through tests that cross-patient responses are impossible.

## Do not optimize yet

Wait for evidence before adding:

- materialized timeline summaries;
- broad PHI caches;
- speculative indexes;
- larger connection pools;
- extra AI passes on every request.

Production infrastructure, malware scanning, dead-letter handling, full monitoring, and staging verification remain separate readiness work.
