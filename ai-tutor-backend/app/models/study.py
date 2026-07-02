from sqlalchemy import Column, Integer, DateTime, ForeignKey, func
from app.core.database import Base


class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    focus_duration_seconds = Column(Integer, default=0)
    distraction_count = Column(Integer, default=0)
