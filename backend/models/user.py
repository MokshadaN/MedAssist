"""SQLAlchemy user model."""

from sqlalchemy import Column, String, DateTime
from datetime import datetime
import uuid
from core.database import Base

def gen_id():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    role = Column(String)
    name = Column(String)
    email = Column(String, unique=True)
    phone = Column(String)
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)