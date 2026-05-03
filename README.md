# 🏥 MedAssist: AI-Powered Healthcare Companion

MedAssist is a comprehensive, full-stack medical assistance platform designed to bridge the gap between patients and healthcare providers. By leveraging cutting-edge AI, MedAssist streamlines the patient intake process, provides real-time clinical summaries, and offers critical emergency support through geolocation and secure medical profile sharing.

## 🚀 Key Features

### 🤖 AI-Driven Patient Intake
- **Interactive Questionnaire:** A dynamic, chat-based intake system that gathers symptoms and medical history.
- **Voice-to-Text Integration:** Hands-free input using the Web Speech API for improved accessibility and real-time transcription.
- **Clinical Summarization:** Automatically generates **SOAP notes** (Subjective, Objective, Assessment, Plan) using advanced LLMs (Groq/Gemini), allowing doctors to review cases in seconds.
- **Urgency Detection:** Real-time analysis of symptoms to identify high-risk indicators (red flags) and trigger immediate emergency protocols.

### 🆘 Emergency Support & QR Profiles
- **Emergency QR Profile:** Every patient has a unique, scannable QR code located in their profile sidebar. In an emergency, first responders can scan this to access a secure, public-facing medical summary.
    - **Shared Data:** Name, Age, Gender, Blood Type, Allergies, Chronic Conditions, and current Medications.
    - **Security:** Only essential emergency information is shared on the public-facing URL.
- **Nearby Hospital Finder:** Geolocation-based search using OpenStreetMap (Overpass API) to find the closest hospitals, clinics, and pharmacies. Includes real-time "Open Now" status, distance, and contact details.

### 💊 Medicine Information & Safety
- **AI Medicine Search:** Patients can search for medications through the AI Health Assistant to receive detailed information on:
    - **Benefits:** How the medication helps manage specific conditions.
    - **Side Effects:** Common and rare side effects to watch for.
    - **Interactions:** AI-driven warnings based on the patient's existing health profile.
- **Prescription Studio:** A specialized tool for doctors to create digital prescriptions with precise dosage, frequency (e.g., Once/Twice/Thrice daily), and custom instructions.
- **Semantic Risk Check:** Advanced NLP (using PubMedBERT) matches patient-reported symptoms against prescribed medicine side effects to alert doctors of potential adverse reactions.

### 📋 Health & Practice Management
- **Medical Report Analysis:** Upload lab reports (PDFs/Images). The AI parses complex data into easy-to-understand clinical snapshots and tracks health parameters over time.
- **Health Metrics Visualization:** Interactive charts tracking vitals, lab results, and health trends using Recharts.
- **Automated Reminders:** Smart scheduling for medication doses and follow-up appointments with "Urgent" status for overdue tasks.

### 🔐 Secure & Scalable
- **Role-Based Dashboards:** Specialized, high-performance interfaces for both Patients and Doctors.
- **JWT Authentication:** Secure token-based authentication with encrypted password storage.
- **Robust Data Management:** SQLAlchemy ORM with a flexible SQLite/PostgreSQL backend for reliable data persistence.

---

## 🛠 Tech Stack

### Frontend
- **Framework:** [React](https://reactjs.org/) (TypeScript)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** Vanilla CSS (Modern Design System with Dark Mode support)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Charts:** [Recharts](https://recharts.org/)
- **QR Generation:** `qrcode.react` (SVG/Canvas)

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database:** [SQLite](https://www.sqlite.org/) with [SQLAlchemy](https://www.sqlalchemy.org/) ORM
- **Task Queue:** [Celery](https://docs.celeryq.dev/) with [Redis](https://redis.io/)
- **AI/ML:** [Groq Cloud API](https://groq.com/), [Google Gemini API](https://aistudio.google.com/), [PubMedBERT](https://huggingface.co/NeuML/pubmedbert-base-embeddings)
- **Authentication:** [Python-jose](https://github.com/mpdavis/python-jose) (JWT)

---

## 📂 Project Structure

```text
MedAssist/
├── backend/                # FastAPI Application
│   ├── api/                # API Route Handlers (v1)
│   ├── core/               # Security, Database Config, Environment
│   ├── models/             # SQLAlchemy Database Models
│   ├── schemas/            # Pydantic Data Validation Models
│   ├── services/           # Business Logic & AI Integrations
│   ├── data/               # Static datasets (e.g., drug side effects)
│   └── main.py             # Server Entry Point
├── frontend/               # React Application
│   ├── src/
│   │   ├── components/     # Reusable UI Components (Charts, etc.)
│   │   ├── api.ts          # API Client & Type Definitions
│   │   ├── App.tsx         # Main Application Logic & Dashboards
│   │   └── styles.css      # Design System & Styling
│   └── package.json        # Frontend Dependencies
└── medassist.db            # Local SQLite Database
```

---

## 🚦 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- Redis (Required for background task processing)

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\Activate.ps1  # Windows
   source venv/bin/activate      # Unix/macOS
   ```
3. Install dependencies: `pip install -r requirements.txt`
4. Configure `.env`:
   ```env
   DATABASE_URL=sqlite:///./medassist.db
   SECRET_KEY=your_secret_key
   GROQ_API_KEY=your_groq_key
   GOOGLE_API_KEY=your_gemini_key
   HF_TOKEN=your_huggingface_token
   ```
5. Run the server: `uvicorn main:app --reload`

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`

---

## 📖 API Documentation
Once the backend is running, access the interactive documentation at:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

## 📄 License
MIT License - see the [LICENSE](LICENSE) file for details.

---
*Developed with ❤️ for a healthier future.*
