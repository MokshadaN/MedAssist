"""SQLAlchemy medicine schedule model for recurring WhatsApp reminders."""

from datetime import datetime, date
import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, String, Text

from core.database import Base


class MedicineSchedule(Base):
    __tablename__ = "medicine_schedules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    prescription_item_id = Column(String, ForeignKey("prescription_items.id"), nullable=False)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False)
    patient_phone = Column(String, nullable=True)
    medicine_name = Column(String, nullable=False)
    dosage = Column(String, nullable=True)
    frequency = Column(String, nullable=False)
    reminder_times = Column(Text, nullable=False)  # JSON list: ["08:00","14:00","21:00"]
    start_date = Column(Date, nullable=False, default=date.today)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
