import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from sse_starlette.sse import EventSourceResponse

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.chat import ChatHistory
from app.schemas.chat import ChatRequest, ChatSessionResponse, ChatHistoryListResponse, CreateSessionRequest
from app.services.chat_service import generate_answer_stream

router = APIRouter()


@router.post("/sessions", response_model=ChatSessionResponse, status_code=201)
async def create_session(
    data: CreateSessionRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建一个新的对话会话"""
    import uuid
    session_id = str(uuid.uuid4())
    session = ChatSessionResponse(
        session_id=session_id,
        subject=data.subject,
        title=data.title or "新对话",
        messages=[],
    )
    return session


@router.post("/send")
async def send_message(
    data: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """发送消息（非流式，直接返回结果）"""
    import uuid
    session_id = data.session_id or str(uuid.uuid4())

    # 保存用户消息
    user_msg = ChatHistory(
        user_id=current_user["id"],
        session_id=session_id,
        subject=data.subject,
        role="user",
        content=data.question,
    )
    db.add(user_msg)

    # 获取历史消息
    history = []
    if data.session_id:
        result = await db.execute(
            select(ChatHistory)
            .where(
                ChatHistory.session_id == session_id,
                ChatHistory.user_id == current_user["id"],
            )
            .order_by(ChatHistory.created_at)
        )
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in result.scalars().all()
        ]

    # 生成回答
    reply = await generate_answer_stream(data.question, data.subject, history)

    full_reply = ""
    async for chunk in reply:
        full_reply += chunk

    # 保存助手回复
    assistant_msg = ChatHistory(
        user_id=current_user["id"],
        session_id=data.session_id or "",
        subject=data.subject,
        role="assistant",
        content=full_reply,
    )
    db.add(assistant_msg)
    await db.commit()

    return {"session_id": session_id, "reply": full_reply}


@router.post("/stream")
async def stream_chat(
    data: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SSE 流式对话"""
    # 保存用户消息
    import uuid
    session_id = data.session_id or str(uuid.uuid4())

    user_msg = ChatHistory(
        user_id=current_user["id"],
        session_id=session_id,
        subject=data.subject,
        role="user",
        content=data.question,
    )
    db.add(user_msg)

    # 获取历史
    history = []
    if data.session_id:
        result = await db.execute(
            select(ChatHistory)
            .where(
                ChatHistory.session_id == session_id,
                ChatHistory.user_id == current_user["id"],
            )
            .order_by(ChatHistory.created_at)
        )
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in result.scalars().all()
        ]

    async def event_generator():
        """SSE 事件生成器"""
        try:
            full_reply = ""
            stream = generate_answer_stream(data.question, data.subject, history)
            async for chunk in stream:
                full_reply += chunk
                yield {
                    "event": "message",
                    "data": json.dumps({
                        "type": "text",
                        "content": chunk,
                    }, ensure_ascii=False),
                }

            # 保存回答
            assistant_msg = ChatHistory(
                user_id=current_user["id"],
                session_id=session_id,
                subject=data.subject,
                role="assistant",
                content=full_reply,
            )
            db.add(assistant_msg)
            await db.commit()

            yield {
                "event": "message",
                "data": json.dumps({"type": "done", "session_id": session_id}, ensure_ascii=False),
            }
        except Exception as e:
            await db.rollback()
            yield {
                "event": "message",
                "data": json.dumps({"type": "error", "content": str(e)}, ensure_ascii=False),
            }

    return EventSourceResponse(event_generator())


@router.get("/history/{session_id}", response_model=ChatSessionResponse)
async def get_history(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取指定对话历史"""
    result = await db.execute(
        select(ChatHistory)
        .where(
            ChatHistory.session_id == session_id,
            ChatHistory.user_id == current_user["id"],
        )
        .order_by(ChatHistory.created_at)
    )
    messages = result.scalars().all()
    if not messages:
        raise HTTPException(status_code=404, detail="对话记录不存在")

    return ChatSessionResponse(
        session_id=session_id,
        subject=messages[0].subject,
        messages=[
            {"id": m.id, "role": m.role, "content": m.content}
            for m in messages
        ],
    )


@router.get("/sessions", response_model=ChatHistoryListResponse)
async def list_sessions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取用户所有对话会话列表"""
    # 使用子查询：先找到每个 session 的最新消息时间，再排序
    subquery = (
        select(
            ChatHistory.session_id,
            ChatHistory.subject,
            func.max(ChatHistory.created_at).label("last_active"),
        )
        .where(ChatHistory.user_id == current_user["id"])
        .group_by(ChatHistory.session_id, ChatHistory.subject)
        .subquery()
    )
    result = await db.execute(
        select(subquery).order_by(subquery.c.last_active.desc())
    )
    rows = result.all()

    sessions = []
    for row in rows:
        sid = row.session_id
        subj = row.subject
        msg_result = await db.execute(
            select(ChatHistory)
            .where(
                ChatHistory.session_id == sid,
                ChatHistory.user_id == current_user["id"],
            )
            .order_by(ChatHistory.created_at)
        )
        msgs = msg_result.scalars().all()
        sessions.append(
            ChatSessionResponse(
                session_id=sid,
                subject=subj,
                messages=[
                    {"id": m.id, "role": m.role, "content": m.content}
                    for m in msgs
                ],
            )
        )

    return ChatHistoryListResponse(sessions=sessions)


@router.delete("/history/{session_id}")
async def delete_history(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除指定对话"""
    await db.execute(
        delete(ChatHistory).where(
            ChatHistory.session_id == session_id,
            ChatHistory.user_id == current_user["id"],
        )
    )
    await db.commit()
    return {"message": "对话已删除"}
