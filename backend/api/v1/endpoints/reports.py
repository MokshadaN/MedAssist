"""Report endpoints.

P0 changes:
- Authentication + ownership on every route (the listing route was public).
- Doctors only get access through an explicit active care relationship.
- One configured upload path (settings.upload_dir) shared with the workers.
- Analysis lifecycle states (uploaded/queued/processing/completed/failed) with
  duplicate-request prevention.
- Downloads are served as attachments with an allow-listed media type and a
  path-safety check.
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from pathlib import Path
import mimetypes

from core.config import settings
from core.dependencies import get_current_user, get_db, require_roles
from core.limiter import limiter
from core.pagination import PageLimit, PageOffset
from schemas.common import DeleteResponse
from schemas.report import ReportOut
from services import report_service
from services.access_control import require_patient_access, require_report_access
from schemas.metric import MedicalMetricOut
from utils.file_upload import validate_and_read_upload
from workers.ai_tasks import analyze_report_async

# Single configured upload directory (API and workers share settings.upload_dir).
UPLOAD_DIR = Path(settings.upload_dir)

# Allowed download media types — never serve an unknown type inline as HTML.
_ALLOWED_MEDIA_TYPES = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpeg": ".jpeg",
}

router = APIRouter()


def _enqueue_report_analysis(report_id: str, file_path: str, job_id: str) -> None:
    analyze_report_async.apply_async(
        args=[report_id, file_path, job_id],
        task_id=job_id,
    )


@router.post("/upload", response_model=ReportOut)
@limiter.limit("5/hour")
async def upload_report(
    request: Request,
    patient_id: str,
    file: UploadFile = File(...),
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    """Upload a patient report with full file validation."""
    try:
        require_patient_access(db, current_user, patient_id)

        # ── Validate: extension, size, magic bytes ─────────────────────────
        content, safe_name = await validate_and_read_upload(file)

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        disk_path = UPLOAD_DIR / safe_name
        disk_path.write_bytes(content)

        file_url = f"/api/v1/reports/download/{safe_name}"

        report = report_service.save_report(
            db,
            patient_id=patient_id,
            file_url=file_url,
            parsed_data=None,
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
    Serve uploaded reports: only the owning patient or a doctor with an active
    care relationship (P0 — previously any doctor could download any report).
    """
    report = report_service.get_report_by_filename_or_raise(db, filename)
    require_report_access(db, current_user, report)

    # Path safety: the requested filename must resolve inside the upload dir.
    disk_path = (UPLOAD_DIR / filename).resolve()
    if not disk_path.is_relative_to(UPLOAD_DIR.resolve()):
        raise HTTPException(status_code=404, detail="Report file not found on server")
    if not disk_path.exists():
        raise HTTPException(status_code=404, detail="Report file not found on server")

    guessed_type, _ = mimetypes.guess_type(disk_path.name)
    media_type = guessed_type if guessed_type in _ALLOWED_MEDIA_TYPES else "application/octet-stream"

    # Download policy (P0): never render report files inline from the API URL.
    return FileResponse(
        path=disk_path,
        filename=Path(filename).name,
        media_type=media_type,
        content_disposition_type="attachment",
    )


@router.get("/{patient_id}", response_model=List[ReportOut])
def get_reports(
    patient_id: str,
    limit: PageLimit = 50,
    offset: PageOffset = 0,
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    """
    Retrieve all reports for a patient — the owner patient or a treating
    doctor only (this route previously required no authentication at all).
    """
    require_patient_access(db, current_user, patient_id)
    reports = report_service.get_reports(
        db,
        patient_id=patient_id,
        limit=limit,
        offset=offset,
    )
    return reports


@router.delete("/{report_id}", response_model=DeleteResponse)
def delete_report(
    report_id: str,
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    report = report_service.get_report_or_raise(db, report_id)
    require_report_access(db, current_user, report)
    report_service.delete_report_with_file(db, report, UPLOAD_DIR)
    return {"status": "deleted", "report_id": report_id}


@router.post("/{report_id}/analyze", response_model=ReportOut)
def analyze_report(
    report_id: str,
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    report = report_service.get_report_or_raise(db, report_id)
    require_report_access(db, current_user, report)
    return report_service.queue_report_analysis(
        db,
        report,
        disk_path=UPLOAD_DIR / Path(report.file_url).name,
        stale_minutes=settings.report_analysis_stale_minutes,
        enqueue=_enqueue_report_analysis,
    )


@router.get("/{patient_id}/metrics", response_model=List[MedicalMetricOut])
def get_patient_metrics(
    patient_id: str,
    parameter: str = None,
    limit: PageLimit = 50,
    offset: PageOffset = 0,
    current_user=Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    """
    Retrieve historical medical metrics for a patient.
    Optionally filter by parameter (e.g. 'Hemoglobin').
    """
    require_patient_access(db, current_user, patient_id)
    return report_service.get_patient_metrics(
        db,
        patient_id=patient_id,
        parameter=parameter,
        limit=limit,
        offset=offset,
    )