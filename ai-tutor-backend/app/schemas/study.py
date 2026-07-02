from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StudySessionStart(BaseModel):
    pass


class StudySessionEnd(BaseModel):
    session_id: int


class DistractionRecord(BaseModel):
    session_id: int


class StudySessionResponse(BaseModel):
    id: int
    start_time: datetime | None = None
    end_time: datetime | None = None
    focus_duration_seconds: int
    distraction_count: int

    model_config = {"from_attributes": True}


class StudyReportResponse(BaseModel):
    date: str
    total_focus_minutes: int
    distraction_count: int
    sessions: list[StudySessionResponse]
