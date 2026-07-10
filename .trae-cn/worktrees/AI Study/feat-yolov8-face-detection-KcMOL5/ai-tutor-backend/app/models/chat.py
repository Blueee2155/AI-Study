import uuid
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from app.core.database import Base
from app.config import get_settings

# 判断是否使用 PostgreSQL（pgvector 需要）
_settings = get_settings()
_IS_POSTGRES = _settings.DATABASE_URL.startswith("postgresql")

if _IS_POSTGRES:
    from sqlalchemy.dialects.postgresql import UUID, VECTOR
    EmbeddingType = VECTOR(1536)
else:
    EmbeddingType = Text()


def generate_uuid():
    return str(uuid.uuid4())


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(String(36), nullable=False, index=True, default=generate_uuid)
    subject = Column(String(20), nullable=False)  # 政治/英语/数学/专业课
    role = Column(String(20), nullable=False)  # user / assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(50), nullable=False, index=True)
    content = Column(Text, nullable=False)
    embedding = Column(EmbeddingType, nullable=True)  # OpenAI embedding 向量
    source = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
