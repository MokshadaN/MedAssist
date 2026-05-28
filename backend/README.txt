# MedAssist Backend

## Running the Server

From the project root directory (MedAssist), run:

```bash
uvicorn backend.main:app --reload
```

Or from inside the backend directory:

```bash
uvicorn main:app --reload
```

## API Documentation

Once the server is running, visit: http://127.0.0.1:8000/docs

## Places API (OpenStreetMap Integration)

The backend includes OpenStreetMap integration for finding nearby hospitals:

### Endpoints:
- `GET /places/nearby-hospitals?latitude=21.84&longitude=82.79&radius=5000`
- `GET /places/hospital-details?osm_id=node/12345`

### Features:
- ✅ Free & Open (no API keys required)
- ✅ Global coverage using OpenStreetMap data
- ✅ Finds hospitals, clinics, and medical centers
- ✅ Includes phone numbers, websites, and addresses
- ✅ Real-time data from OpenStreetMap contributors

## Environment Setup

Make sure to activate the virtual environment before running:

```bash
# Activate virtual environment
(venv) PS> & .\venv\Scripts\Activate.ps1

# Then run the server
cd backend
.\venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000


cd frontend
npm run dev
```
