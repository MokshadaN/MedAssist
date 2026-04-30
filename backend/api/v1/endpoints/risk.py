from fastapi import APIRouter

router = APIRouter()

@router.post("/run")
def run_risk_check(prescription_id: str):
    return {
        "severity": "low",
        "issues": []
    }

@router.get("/{prescription_id}")
def get_risk(prescription_id: str):
    return {"issues": []}