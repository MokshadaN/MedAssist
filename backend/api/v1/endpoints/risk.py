from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_db, require_roles
from schemas.risk import RiskCheckCreate, RiskCheckOut
from services.risk_service import get_latest_risk_check, run_risk_check

router = APIRouter(tags=["risk"])


@router.post("/run", response_model=RiskCheckOut)
def run_prescription_risk_check(
    data: RiskCheckCreate,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    return run_risk_check(db, data.prescription_id, current_user.id)


@router.get("/{prescription_id}", response_model=RiskCheckOut)
def get_risk(
    prescription_id: str,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    return get_latest_risk_check(db, prescription_id, current_user.id)
