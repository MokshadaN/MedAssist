from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from pathlib import Path
import mimetypes
import shutil
import uuid

from core.dependencies import get_current_user, require_roles
from models.report import Report
from schemas.report import ReportOut
from services import report_service
from services.report_analyzer_service import analyze_report_image, serialize_report_analysis
from schemas.metric import MedicalMetricOut
from core.database import SessionLocal

UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads" / "reports"

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
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db)
):
    """
    Upload a patient report and save its metadata.
    """
    try:
        if current_user.role == "patient" and current_user.id != patient_id:
            raise HTTPException(status_code=403, detail="You can only upload reports for your own profile")

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        safe_name = f"{uuid.uuid4()}_{Path(file.filename).name}"
        disk_path = UPLOAD_DIR / safe_name
        with disk_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_url = f"/api/v1/reports/download/{safe_name}"

        # Save report record in database via service
        report = report_service.save_report(
            db, 
            patient_id=patient_id, 
            file_url=file_url,
            parsed_data=None
        )
        return report
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload report: {str(e)}")

@router.get("/download/{filename}")
def download_report(
    filename: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Serve uploaded reports to the owning patient or any doctor.
    """
    report = db.query(Report).filter(Report.file_url.endswith(filename)).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if current_user.role == "patient" and report.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view your own reports")

    if current_user.role not in {"patient", "doctor"}:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    disk_path = UPLOAD_DIR / filename
    if not disk_path.exists():
        raise HTTPException(status_code=404, detail="Report file not found on server")

    media_type, _ = mimetypes.guess_type(disk_path.name)

    return FileResponse(
        path=disk_path,
        filename=Path(filename).name,
        media_type=media_type or "application/octet-stream",
        content_disposition_type="inline",
    )

@router.get("/{patient_id}", response_model=List[ReportOut])
def get_reports(patient_id: str, db: Session = Depends(get_db)):
    """
    Retrieve all reports for a specific patient.
    """
    reports = report_service.get_reports(db, patient_id=patient_id)
    return reports


@router.delete("/{report_id}")
def delete_report(
    report_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if current_user.role == "patient" and report.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own reports")

    if current_user.role not in {"patient", "doctor"}:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    disk_name = Path(report.file_url).name
    disk_path = UPLOAD_DIR / disk_name
    if disk_path.exists():
        disk_path.unlink()

    report_service.delete_report(db, report)
    return {"status": "deleted", "report_id": report_id}


@router.post("/{report_id}/analyze", response_model=ReportOut)
def analyze_report(
    report_id: str,
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if current_user.role == "patient" and report.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only analyze your own reports")

    if current_user.role not in {"patient", "doctor"}:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    disk_name = Path(report.file_url).name
    disk_path = UPLOAD_DIR / disk_name
    if not disk_path.exists():
        raise HTTPException(status_code=404, detail="Report file not found on server")

    analysis = analyze_report_image(disk_path)
    parsed_data = serialize_report_analysis(analysis)
    updated = report_service.update_report_analysis(db, report, parsed_data)
    return updated


@router.get("/{patient_id}/metrics", response_model=List[MedicalMetricOut])
def get_patient_metrics(
    patient_id: str,
    parameter: str = None,
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    """
    Retrieve historical medical metrics for a patient.
    Optionally filter by parameter (e.g. 'Hemoglobin').
    """
    if current_user.role == "patient" and current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="You can only view your own metrics")

    return report_service.get_patient_metrics(db, patient_id=patient_id, parameter=parameter)
