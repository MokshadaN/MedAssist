from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List
import urllib.parse

from schemas.report import ReportOut
from services import report_service
from core.database import SessionLocal

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter()

@router.post("/upload", response_model=ReportOut)
def upload_report(
    patient_id: str, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Upload a patient report and save its metadata.
    """
    try:
        # Mock file upload logic
        file_url = f"http://127.0.0.1:8000/api/v1/reports/download/{urllib.parse.quote(file.filename)}"
        
        # Save report record in database via service
        report = report_service.save_report(
            db, 
            patient_id=patient_id, 
            file_url=file_url,
            parsed_data="Sample parsed data from report" # Placeholder for OCR/AI processing
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload report: {str(e)}")

@router.get("/download/{filename}")
def download_mock_report(filename: str):
    """
    Mock endpoint to serve fake uploaded reports and prevent ERR_CONNECTION_REFUSED.
    """
    decoded_name = urllib.parse.unquote(filename)
    return HTMLResponse(content=f"<html><body style='font-family:sans-serif;padding:2rem;'><h2>Mock Report Preview</h2><p>File: <strong>{decoded_name}</strong></p><p>This is a simulated report viewer since no actual S3/Cloud storage is configured.</p></body></html>")

@router.get("/{patient_id}", response_model=List[ReportOut])
def get_reports(patient_id: str, db: Session = Depends(get_db)):
    """
    Retrieve all reports for a specific patient.
    """
    reports = report_service.get_reports(db, patient_id=patient_id)
    return reports