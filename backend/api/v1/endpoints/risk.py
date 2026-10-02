from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.config import settings
from core.dependencies import get_db, require_roles, require_verified_doctor
from schemas.risk import RiskCheckCreate, RiskCheckOut
from services.risk_service import get_latest_risk_check, queue_risk_check
from workers.ai_tasks import run_risk_check_async

router = APIRouter(tags=["risk"])


def _enqueue_risk_check(prescription_id: str, doctor_id: str, job_id: str) -> None:
    run_risk_check_async.apply_async(
        args=[prescription_id, doctor_id, job_id],
        task_id=job_id,
    )


@router.post("/run", response_model=RiskCheckOut)
def run_prescription_risk_check(
    data: RiskCheckCreate,
    current_user=Depends(require_verified_doctor),
    db: Session = Depends(get_db),
):
    return queue_risk_check(
        db,
        data.prescription_id,
        current_user.id,
        stale_minutes=settings.risk_check_stale_minutes,
        enqueue=_enqueue_risk_check,
    )


@router.get("/{prescription_id}", response_model=RiskCheckOut)
def get_risk(
    prescription_id: str,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    return get_latest_risk_check(db, prescription_id, current_user.id)
