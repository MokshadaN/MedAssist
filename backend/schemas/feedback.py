"""Pydantic feedback schemas."""

from datetime import datetime

from pydantic import BaseModel

class FeedbackCreate(BaseModel):
    visit_id: str
    rating: int
    comments: str


class FeedbackOut(BaseModel):
    id: str
    visit_id: str
    doctor_id: str
    ai_accuracy_rating: int
    comments: str
    created_at: datetime

    model_config = {"from_attributes": True}
