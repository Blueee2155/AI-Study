from pydantic import BaseModel
from typing import Optional


class CreateSessionRequest(BaseModel):
    subject: str
    title: str | None = None


class ChatRequest(BaseModel):
    question: str
    subject: str = "数学"
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str


class ChatHistoryItem(BaseModel):
    id: int
    role: str
    content: str
    created_at: str | None = None

    model_config = {"from_attributes": True}


class ChatSessionResponse(BaseModel):
    session_id: str
    subject: str
    title: str | None = None
    messages: list[ChatHistoryItem]
    created_at: str | None = None


class ChatHistoryListResponse(BaseModel):
    sessions: list[ChatSessionResponse]
