"""Report endpoints."""

from fastapi import APIRouter, UploadFile, File

router = APIRouter()

@router.post("/upload")
def upload_report(file: UploadFile = File(...), patient_id: str = ""):
    return {"file_url": "s3_url"}

@router.get("/{patient_id}")
def get_reports(patient_id: str):
    return [{"file_url": "url1"}, {"file_url": "url2"}]