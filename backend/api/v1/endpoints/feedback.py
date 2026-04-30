from fastapi import APIRouter
from schemas.feedback import FeedbackCreate

router = APIRouter()

@router.post("/submit")
def submit_feedback(data: FeedbackCreate):
    return {"status": "saved"}

@router.get("/{visit_id}")
def get_feedback(visit_id: str):
    return {"rating": 4}