# MedAssist

MedAssist is a full-stack healthcare workflow application for patient intake, doctor review, reports, prescriptions, reminders, and emergency support.

> **Development status:** This project is not approved for production use with real patient data. Complete the remaining security, clinical validation, monitoring, backup, and staging requirements in [`PRODUCTION_READINESS_AUDIT.md`](PRODUCTION_READINESS_AUDIT.md) first.

## Features

### Patient intake and triage

- Multi-step text and voice intake.
- Backend speech-to-text using Groq Whisper.
- Patient-only triage input; generated questions and advisories are excluded.
- Deterministic emergency rules run before AI extraction.
- Groq models extract validated symptoms and standardized safety concepts without diagnosing.
- Fixed policy code may escalate extracted safety concepts; uncertain or failed extraction returns `abstain/review_required`.
- Confirmed emergencies can show nearby hospitals through OpenStreetMap providers.
- Gemini/Groq fallback chain generates structured intake data and SOAP summaries.

### Patient and doctor workflows

- Patient and doctor dashboards with role-based access.
- Controlled admin approval for doctor verification.
- Verified doctors can access linked patients and clinical workflows.
- Visit history, SOAP summaries, reports, metrics, prescriptions, reminders, notifications, and schedules.
- Doctor prescription history remains visible for later review.
- Dashboard sections load independently, so one failed API does not hide all other data.

### Reports and background jobs

- PDF/image report upload and AI-assisted analysis.
- Extracted medical metrics displayed as Recharts trends.
- Report and risk jobs use persisted lifecycle states: `queued`, `processing`, `completed`, and `failed`.
- Atomic worker claims, stale-job recovery, retries, and duplicate-job protection.
- Celery routes work through `ai`, `notifications`, `triage`, and default queues.
- Celery Beat is the only periodic scheduler.

### Security and API behavior

- JWT authentication and bcrypt password hashing.
- Centralized patient ownership, doctor-patient relationship, and verified-doctor checks.
- PHI-safe `401`/`403`/`404` behavior.
- Expiring, opt-in emergency QR access with a minimal medical profile.
- Bounded pagination on list endpoints.
- Idempotent visits, reminders, report analysis, risk checks, and notification delivery.
- Alembic manages production schema changes.

## AI components

- **General generation:** Gemini `3.8 Flash` with older Gemini fallbacks.
- **Cross-provider fallback:** Groq `openai/gpt-oss-120b`.
- **Triage extraction:** Groq `openai/gpt-oss-20b`, then `openai/gpt-oss-120b`.
- **Speech-to-text:** Groq `whisper-large-v3-turbo`.
- **Report image analysis:** Gemini `2.5 Flash`.
- **Drug-risk embeddings:** `NeuML/pubmedbert-base-embeddings`.

PubMedBERT is used by the drug-risk engine, not as a live triage classifier. The clinical triage classifier interface is currently shadow-only and has no trained model bundled.

## Technology

- **Frontend:** React 18, TypeScript, Vite, Recharts, Lucide React.
- **Backend:** FastAPI, Pydantic, SQLAlchemy, Alembic.
- **Local database:** SQLite.
- **Container database:** PostgreSQL.
- **Jobs and caching:** Celery, Redis, FastAPI Cache.
- **Observability:** structured logging, request IDs, optional Sentry and OpenTelemetry.
- **External services:** Google Gemini, Groq, Hugging Face, OpenStreetMap, optional SMTP and Twilio.

## Project structure

```text
MedAssist/
├── backend/
│   ├── alembic/        # Database migrations
│   ├── api/v1/         # FastAPI routes
│   ├── core/           # Configuration, security, errors, observability
│   ├── models/         # SQLAlchemy models
│   ├── schemas/        # Pydantic API contracts
│   ├── services/       # Application and AI services
│   ├── tests/          # Backend tests
│   ├── workers/        # Celery tasks and scheduler
│   └── main.py
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── api.ts
│       └── styles.css
├── docker-compose.yml
└── PRODUCTION_READINESS_AUDIT.md
```

## Local development

### Requirements

- Python 3.9+
- Node.js 18+
- API keys for the AI features being tested
- Redis only when testing caching or background workers

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -m alembic upgrade head
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Edit `backend/.env` before starting. At minimum, set a development `SECRET_KEY` and the provider keys required by the features you use.

Development API documentation:

- Swagger: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

Documentation is disabled when `ENVIRONMENT=production`.

### Create an administrator

From `backend/` with the virtual environment active:

```powershell
python scripts/create_admin.py
```

Use the administrator account to approve or reject pending doctors.

### Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

## Manual verification

```powershell
cd backend
pip install -r requirements-dev.txt
python -m pytest tests -q
python -m alembic heads
python -m alembic current

cd ..\frontend
npm run build
```

## Docker Compose

The Compose stack includes PostgreSQL, Redis, FastAPI, a Celery worker, one Celery Beat scheduler, shared report storage, and optional MailHog.

```powershell
Copy-Item backend\.env.example .env
# Edit the root .env and set secure values, especially:
# DB_PASSWORD, REDIS_PASSWORD, SECRET_KEY, ALLOWED_ORIGINS and provider keys
docker compose up -d
docker compose logs -f backend worker beat
```

The backend runs `alembic upgrade head` before serving requests.

Compose is a deployment scaffold, not evidence of production readiness. Before real deployment, verify durable encrypted storage, malware scanning, private infrastructure, TLS, complete PHI auditing, worker delivery, monitoring, backups, and recovery.

## License

MIT License. See [`LICENSE`](LICENSE).
