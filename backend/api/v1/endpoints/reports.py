from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

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
        # Mock file upload logic - in production, upload to S3/Cloud Storage
        file_url = f"https://storage.medassist.com/reports/{file.filename}"
        
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

@router.get("/{patient_id}", response_model=List[ReportOut])
def get_reports(patient_id: str, db: Session = Depends(get_db)):
    """
    Retrieve all reports for a specific patient.
    """
    reports = report_service.get_reports(db, patient_id=patient_id)
    return reports