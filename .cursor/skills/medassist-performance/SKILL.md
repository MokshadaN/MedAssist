---
name: medassist-performance
description: Improves MedAssist backend, frontend, and AI latency using measured, PHI-safe optimizations. Use when implementing or reviewing database queries, indexes, pagination, dashboard loading, caching, AI model selection, OCR, connection pooling, or production asset delivery.
---

# MedAssist Performance

Apply performance work in this order:

1. Fix authorization and database migrations.
2. Remove N+1 queries.
3. Add verified indexes.
4. Add pagination.
5. Lazy-load frontend sections.
6. Measure latency.
7. Add selective caching based on measurements.

Do not optimize at the expense of RBAC, PHI isolation, correctness, auditability, or maintainability.

## Implement now

### Remove N+1 queries

Doctor and patient listings currently perform repeated profile queries. Replace repeated per-row queries with SQL joins, relationship eager loading, or a bounded aggregate query.

Before editing:

- Capture the current query count and response time.
- Inspect the SQLAlchemy relationships and response shape.

After editing:

- Confirm the response contract is unchanged.
- Add a test that prevents query-count growth as result size increases.
- Compare query count and response time with the baseline.

### Add database indexes

Inspect model declarations and existing Alembic migrations before adding an index. Prioritize fields actually used in filters, joins, and sorting, including:

- `visits.patient_id`
- `visits.doctor_id`
- `visits.session_id`
- `reports.patient_id`
- `chat_messages.session_id`
- `ai_summaries.session_id`
- `prescriptions.visit_id`
- `medical_metrics.patient_id`
- Timestamps used for sorting

Create indexes only through Alembic migrations. Avoid duplicate or speculative indexes. Validate migration upgrade and downgrade against PostgreSQL and examine query plans where possible.

### Reduce frontend requests

Load essential dashboard data first. Load reports, metrics, reminders, and history only when their section becomes visible or a patient/visit is selected.

- Cancel or ignore stale requests when selection changes.
- Deduplicate simultaneous requests for the same resource.
- Preserve independent domain endpoints rather than creating one oversized dashboard endpoint that returns unnecessary PHI.
- Measure request count and time to usable content before and after changes.

### Add pagination

Add bounded pagination to:

- Visits
- Reports
- Notifications
- Reminders
- Medical metrics
- Doctor patient lists

Use a default page size of 25 or 50 and enforce a server-side maximum. Preserve deterministic ordering with a unique tie-breaker. Return enough metadata or cursors for the frontend to request the next page. Never load an unbounded clinical history.

## Implement selectively

### Cache safe reference data

Caching is appropriate for:

- Doctor directory
- Hospital searches
- Non-sensitive configuration
- Static lookup data

Doctor and hospital caching already exists; inspect it before adding another cache. The medicine catalogue is frontend-local and does not need an additional cache.

Do not broadly cache SOAP notes, reports, prescriptions, transcripts, or other PHI.

### Cache per-user data only after authorization is correct

If short-lived caching is justified for visit summaries, unread-notification counts, or metric series:

- Include authenticated user ID, role, patient ID, query parameters, and schema version in the cache key.
- Re-run authorization before serving cached data.
- Use short TTLs.
- Invalidate or version entries after writes.
- Prove with tests that users cannot receive another patient's cached data.

Do not introduce PHI caching before RBAC and ownership checks are complete.

### Optimize external AI calls after measurement

Start with explicit timeouts, bounded retries, smaller prompts, and the fastest clinically acceptable model.

- Measure provider latency, retries, token/input size, and failure rate.
- Do not broadly cache patient transcripts, SOAP notes, or report analysis.
- Cache only deterministic, non-PHI reference requests when the full input and model/version are part of the key.
- Preserve clinical traceability when model or prompt versions change.

### Use the approved model allocation

Use these defaults unless measurements or clinical evaluation justify a change:

- Main model: `gemini-3.5-flash-lite`
- Quality fallback: `gemini-3.5-flash`
- Medical embeddings: local `NeuML/pubmedbert-base-embeddings`
- Optional independent triage fallback: Groq-hosted `openai/gpt-oss-20b`
- Deterministic emergency fallback: existing red-flag rules

Use Gemini 3.5 Flash-Lite for:

- Intake extraction
- Follow-up questions
- General chat
- Initial triage classification
- Most laboratory-report extraction
- Simple SOAP drafts

Use Gemini 3.5 Flash for:

- Final SOAP generation
- Difficult or unclear medical reports
- A second pass after invalid or low-confidence Flash-Lite output

Do not run GPT-OSS 20B locally on the current 32 GB, CPU-oriented development laptop. If provider redundancy is required, call it through Groq. It is unnecessary for simple deterministic emergency matches and must not replace the red-flag rules.

### Preserve deterministic emergency decisions

Use this triage order:

1. Run deterministic red-flag rules.
2. Immediately mark a critical rule match urgent.
3. Otherwise request structured classification from Gemini 3.5 Flash-Lite or Groq GPT-OSS 20B.
4. Retain the deterministic result if the provider fails.
5. Never allow an LLM to downgrade a deterministic emergency match.

### Use a staged document-processing strategy

For development with synthetic reports:

- Send PDFs and images directly to Gemini 3.5 Flash-Lite.
- Escalate difficult documents to Gemini 3.5 Flash.

Before processing real PHI, use a hybrid local-first pipeline:

1. Extract embedded text from digital PDFs with Docling or PyMuPDF; do not OCR text that already exists.
2. Extract scanned PDF/image text with PaddleOCR.
3. Parse common laboratory parameters, values, units, and ranges deterministically.
4. Send only complex or low-confidence pages/text to Gemini 3.5 Flash-Lite.
5. Escalate difficult clinical interpretation to Gemini 3.5 Flash.

Local OCR extracts text and layout; it does not provide clinical interpretation. Record OCR confidence and retain source-page references for review.

Do not send real PHI to a free API tier that may use submitted content for product improvement. Free tiers are suitable only for synthetic development data unless an approved privacy agreement and data-handling configuration are in place.

### Optimize production frontend delivery

During deployment:

- Build Vite static assets.
- Enable Brotli or GZip.
- Use immutable caching for content-hashed assets.
- Avoid caching the HTML shell for long periods.
- Use a CDN when deployment scale justifies it.

## Wait for evidence

### Precomputed timeline summaries

Do not add a summary table or materialized view until measurements show the current visit-history queries are too slow at realistic data volume.

### Connection-pool tuning

PostgreSQL pooling already exists. Do not guess pool values. Measure concurrent requests, database connection usage, wait time, query duration, and deployment replica count before changing pool size or overflow.

## Verification

For every performance change:

1. Record a baseline using representative data.
2. Make one focused change.
3. Verify authorization and response correctness.
4. Run relevant tests and migration checks.
5. Re-measure with the same workload.
6. Report query count, request count, latency change, and trade-offs.

Do not claim an improvement without before-and-after evidence.
