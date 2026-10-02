# MedAssist Production Readiness Audit

**Audit date:** 29 September 2026  
**Status:** **NO-GO for production use with real patient data**  
**Scope:** FastAPI backend, React frontend, PostgreSQL, Redis, Celery, Docker configuration, security/RBAC, SOLID/DRY, operations, and the nine areas in `MedAssist_Feature_Checklist.md`.

## Executive Summary

MedAssist has useful production-oriented foundations, including JWT authentication, bcrypt password hashing, Pydantic validation, upload validation, Alembic, Celery, circuit breakers, Sentry PHI scrubbing, request tracing, and a non-root Docker image.

Deployment is nevertheless blocked by:

1. Unauthenticated access to multiple PHI-bearing APIs.
2. Inconsistent resource ownership and doctor-patient relationship enforcement.
3. Doctor verification that accepts a matching license-number format as proof.
4. Celery workers that do not consume the configured task queues.
5. Non-durable report storage and inconsistent asynchronous metric persistence.
6. Database migration drift and production use of `create_all`.
7. No automated test suite or CI/CD release gate.
8. Incomplete PHI audit coverage and weak session revocation.
9. Missing or misleading feature-checklist expectations.

Passing the current feature checklist would not prove the application is secure or production-ready.

## P0: Release Blockers

### 1. Secure all PHI routes

Affected areas:

- `backend/api/v1/endpoints/sessions.py`
- `backend/api/v1/endpoints/messages.py`
- `backend/api/v1/endpoints/ai.py`
- `backend/api/v1/endpoints/reports.py`
- `backend/api/v1/endpoints/reminders.py`
- `backend/api/v1/endpoints/schedules.py`
- `backend/api/v1/endpoints/patient.py`

Required changes:

- Require authentication on all session, message, SOAP summary, report, reminder, and schedule routes.
- Derive the patient identity from the authenticated user instead of trusting request IDs.
- Permit doctors only when an explicit active care relationship exists.
- Minimize the public emergency profile and protect it with consent, opaque expiring access, throttling, and audit events.
- Return consistent `401`, `403`, and `404` responses without leaking resource existence.
- Centralize policy checks instead of duplicating endpoint-specific logic.

Done when:

- Anonymous and unrelated users cannot read or modify PHI.
- Patients can access only their own records.
- Doctors can access only linked patients.
- Every sensitive route has automated anonymous/owner/unrelated/treating-doctor tests.

### 2. Replace doctor verification

Affected areas:

- `backend/services/doctor_verification_service.py`
- `backend/services/auth_service.py`
- `backend/models/doctor.py`
- Alembic migrations

Required changes:

- Separate license format validation from verified status.
- Default every new doctor to `is_verified = false`.
- Verify through an authoritative registry or controlled manual approval workflow.
- Record verifier, source, timestamp, evidence, and status transitions.
- Reset verification when license details change.
- Prevent unverified doctors from privileged clinical workflows.

Done when no self-registered doctor becomes verified from regex or hard-coded demo data.

### 3. Fix schema management

Required changes:

- Add an Alembic revision for all doctor verification columns.
- Remove unconditional `Base.metadata.create_all()` from production startup.
- Run migrations as a single deployment/init job before application replicas start.
- Add migration validation to CI.

Done when a clean PostgreSQL database reaches Alembic head and the application starts without schema writes or missing-column errors.

### 4. Fix Celery processing

Affected areas:

- `backend/workers/celery_app.py`
- `docker-compose.yml`
- Worker and Beat environment configuration

Required changes:

- Subscribe workers to `ai`, `notifications`, `triage`, and any default queue, or use dedicated workers.
- Supply SMTP and other task-required settings to worker containers.
- Add queue depth, runtime, retry, failure, and dead-letter monitoring.
- Add task idempotency and explicit failure states.
- Ensure Beat runs as exactly one scheduler.

Done when report analysis, reminders, follow-up email, WhatsApp, and risk tasks complete reliably in staging.

### 5. Protect the report lifecycle

Required changes:

- Store reports in durable encrypted object storage or a shared persistent volume.
- Use one configured upload path across API and workers.
- Unify synchronous and asynchronous analysis persistence.
- Ensure async analysis also saves extracted medical metrics.
- Add `queued`, `processing`, `completed`, and `failed` states.
- Prevent duplicate analysis requests and duplicate AI cost.
- Scan uploads for malware and enforce content-disposition/download policy.

Done when files survive container replacement, authorized downloads work, duplicate jobs are prevented, and extracted metrics populate charts.

## P1: Security and Product Completion

### Authentication and sessions

- Implement refresh-token rotation, server-side revocation, and reuse detection.
- Revalidate the user on refresh and revoke sessions after password or role changes.
- Prefer an HttpOnly, Secure, SameSite cookie or BFF strategy.
- Remove long-lived bearer-token persistence from `localStorage`.
- Make logout invalidate the server-side session.
- Add password reset, account recovery, and security-event notifications.

### Complete PHI auditing

Audit all:

- Report reads, uploads, analyses, downloads, and deletions.
- Session and message reads/writes.
- SOAP summary access and generation.
- Prescription, risk, reminder, schedule, and notification operations.
- Public emergency-profile access.
- Authentication, authorization denials, exports, and administrative verification.

Each event should include actor, role, patient/resource, action, outcome, request ID, timestamp, IP metadata, and a redacted context. Audit storage should be append-only and access-controlled.

### Clinical AI safety

- Delimit and validate user content supplied to LLMs.
- Validate every structured model response against strict schemas.
- Do not silently replace failed risk analysis with safe-looking defaults.
- Add model timeouts, quotas, retry limits, circuit-breaker telemetry, and cost monitoring.
- Display provenance, model/version, confidence, limitations, and review status.
- Require clinician confirmation before AI output becomes authoritative clinical data.
- Establish a documented policy for sending PHI to third-party AI providers.

### Network and platform security

- Add TLS-only ingress through a production reverse proxy or managed load balancer.
- Add HSTS, CSP, frame restrictions, content-type protection, and referrer policy.
- Restrict CORS to production HTTPS origins.
- Remove public PostgreSQL and Redis host ports.
- Use Redis-backed distributed rate limiting.
- Restrict detailed health diagnostics to an internal network or authenticated operator.
- Store secrets in a managed secret store and define rotation procedures.

## Feature Checklist Gap Analysis

### 1. Authentication and session management — Partial and unsafe

Current state:

- Registration and login exist.
- Access and refresh tokens are issued.
- The frontend does not use the refresh flow.
- Logout is client-side only.
- Several PHI APIs are not protected.

Required changes:

- Complete token rotation/revocation and secure storage.
- Test API authorization, not only frontend redirection.
- Add account lifecycle and stolen-token tests.

### 2. AI intake and real-time triage — Implemented but unsafe

Current state:

- Multi-turn intake, Groq/regex emergency detection, and nearby hospitals exist.
- Session and message endpoints lack authentication and ownership.

Required changes:

- Bind each session to its authenticated patient.
- Add doctor relationship access where needed.
- Audit access and limit AI usage.
- Test regex fallback, geocoding failure, unavailable providers, and emergency UI behavior.

### 3. SOAP notes and longitudinal comparison — Partial

Current state:

- SOAP generation exists.
- Previous-visit comparison exists in backend logic.
- The frontend does not visibly render “Changes from Previous Visit.”

Required changes:

- Secure summary generation and access.
- Render longitudinal changes in the patient and doctor timelines.
- Validate first-visit, repeated-visit, resolved-symptom, and malformed-output cases.

### 4. Lab OCR and biomarker trends — Partial and unreliable

Current state:

- Upload, multimodal analysis, metric extraction, abnormal values, and charts exist.
- Asynchronous analysis bypasses metric persistence.
- Report listing lacks authentication.
- Storage is not durable.

Required changes:

- Use the secured, durable, idempotent report workflow described in P0.
- Add golden-file OCR tests and medically reviewed extraction fixtures.
- Display processing/failure states and allow controlled retry.

### 5. Drug interaction and risk engine — Partial and clinically unvalidated

Current state:

- Asynchronous risk checks and a drug knowledge source exist.
- Queue configuration prevents reliable execution.
- Work can be queued before synchronous authorization.

Required changes:

- Authorize before enqueueing.
- Validate against a curated, versioned interaction dataset.
- Test severe, moderate, mild, safe, unknown-drug, and provider-failure scenarios.
- Display provenance and require clinician review.

### 6. Discharge planning — Missing

No discharge-plan endpoint, service, schema, model, or frontend flow was found.

Before implementation:

- Define the clinical owner, required fields, approval state, versioning, and amendment rules.
- Separate generated drafts from clinician-approved instructions.
- Include medication timeline, warning signs, follow-up, emergency instructions, and readability requirements.
- Audit generation, edits, approval, publication, and patient access.

### 7. Reminders and notifications — Partial with checklist mismatch

Current state:

- Reminders, email, WhatsApp, and QR profile generation exist.
- Legacy reminder APIs are unauthenticated.
- Worker queues and SMTP configuration are incomplete.
- The QR code opens a public patient profile; it does not resume intake.

Required changes:

- Secure reminder ownership and doctor authorization.
- Add delivery status, retries, deduplication, provider callbacks, and patient opt-out.
- Decide whether QR means emergency profile or intake hand-off, then update implementation and checklist consistently.

### 8. Doctor dashboard and workflow — Partial and unsafe

Current state:

- Doctor directory and patient records exist.
- Specialty filtering is not implemented in the visible frontend.
- Doctor verification is forgeable.
- Audit events cover visits but not all clinical actions.

Required changes:

- Implement authoritative verification and verification-aware permissions.
- Add directory search/filter behavior.
- Build a complete, access-controlled patient timeline.
- Centralize PHI auditing across all clinical workflows.

### 9. Health and resilience — Partial

Current state:

- Shallow and detailed health endpoints exist.
- Shallow health does not verify dependencies.
- Detailed health exposes internal details.
- Swagger is intentionally disabled in production.

Required changes:

- Split liveness, readiness, and operator diagnostics.
- Restrict detailed diagnostics.
- Add DB, Redis, worker, storage, and required-provider readiness policy.
- Update the checklist to expect Swagger only outside production.

## P2: SOLID, DRY, and Maintainability

### Backend architecture

- Move HTTP-specific exceptions to the API boundary and use domain exceptions internally.
- Centralize ownership, doctor-patient relationship, and resource lookup policies.
- Introduce repositories or narrow persistence interfaces where they improve testing and transaction control.
- Use one unit of work and one commit per request/task workflow.
- Remove direct ORM access from routers where an application service exists.
- Use the canonical `get_db` dependency everywhere.
- Unify report-analysis logic used by HTTP and Celery.
- Remove unused APScheduler and scheduler stubs.

### Frontend architecture

- Split `App.tsx` into public-profile, authentication, patient, doctor, reports, intake, and medication features.
- Fix the conditional return that occurs before later React hooks.
- Generate TypeScript API contracts from OpenAPI.
- Add a centralized authenticated client with refresh handling.
- Add accessible labels, focus management, live error regions, and keyboard tests.
- Remove duplicated medicine knowledge from the frontend or expose a versioned API.

### API quality

- Add response models to every route.
- Standardize domain errors and client error parsing.
- Add pagination and maximum page sizes to list endpoints.
- Add idempotency for visits, report analysis, reminders, and notification dispatch.
- Remove stub endpoints and dead client methods.
- Document API compatibility and deprecation policy.

## Testing and CI/CD Requirements

Add a CI pipeline that blocks merge or deployment unless all applicable checks pass:

- Python formatting, linting, typing, and unit tests.
- FastAPI integration tests with a disposable PostgreSQL database.
- Full RBAC matrix tests for every route.
- Alembic upgrade and schema-drift checks.
- Celery integration tests using Redis.
- Frontend lint, TypeScript, component, accessibility, and end-to-end tests.
- OpenAPI-to-TypeScript contract drift check.
- Python and npm dependency audits.
- Secret scanning, SAST, container scanning, and SBOM generation.
- Docker image build and health smoke tests.

## Operational Requirements

- Define liveness, readiness, startup, and graceful-shutdown behavior.
- Add structured, redacted logs and distributed tracing.
- Alert on authorization failures, queue backlog, task failures, elevated errors, provider failures, and storage capacity.
- Add encrypted backups, point-in-time recovery where applicable, retention policy, and tested restore procedures.
- Create deployment, rollback, incident-response, breach-response, and provider-outage runbooks.
- Load-test API, database, queues, AI providers, uploads, and rate limits.

## Mandatory Go-Live Gates

Production deployment remains blocked until all gates pass:

1. **Authorization:** Every PHI route passes the RBAC matrix.
2. **Identity:** Doctor verification is authoritative and tokens are revocable.
3. **Data safety:** Reports are durable, encrypted, backed up, and access-audited.
4. **Clinical safety:** AI output is validated, attributable, failure-safe, and clinician-reviewed.
5. **Runtime:** Queues drain, notifications work, retries are idempotent, and failure alerts fire.
6. **Schema:** Alembic is the only production schema path.
7. **Edge security:** TLS, security headers, strict origins, private infrastructure, and distributed rate limits are verified.
8. **Quality:** Automated backend, frontend, migration, security, and E2E checks pass in CI.
9. **Recovery:** Backup restoration and rollback succeed in staging.
10. **Checklist accuracy:** Every advertised feature maps to a real, secured, automated acceptance test.

## Validation Already Performed

- All 112 Python files parsed successfully.
- Frontend production dependencies reported no known vulnerabilities.
- Frontend development dependencies reported seven advisories: four high, two moderate, and one low.
- The installed Python environment reports an `opencv-python` and NumPy version conflict.
- No automated test suite or CI workflow was found.
- Docker was unavailable during the audit, so Compose startup, migrations, task processing, storage persistence, SMTP, backup restoration, and failure behavior remain unverified.

## Final Recommendation

Do not deploy MedAssist with real patient data. Complete all P0 changes first, then P1 security and feature-completion work. Apply P2 refactoring alongside automated tests so security policy and transaction behavior cannot regress. Reassess production readiness only after every mandatory gate passes in a production-like staging environment.
