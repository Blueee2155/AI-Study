from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.study import StudySession
from app.schemas.study import (
    StudySessionStart,
    StudySessionEnd,
    DistractionRecord,
    StudySessionResponse,
    StudyReportResponse,
)

router = APIRouter()


@router.post("/session/start", response_model=StudySessionResponse)
async def start_session(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """开始一次学习记录"""
    session = StudySession(
        user_id=current_user["id"],
        start_time=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return StudySessionResponse.model_validate(session)


@router.post("/session/end", response_model=StudySessionResponse)
async def end_session(
    data: StudySessionEnd,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """结束一次学习记录"""
    result = await db.execute(
        select(StudySession).where(
            StudySession.id == data.session_id,
            StudySession.user_id == current_user["id"],
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="学习记录不存在")

    now = datetime.now(timezone.utc)
    session.end_time = now
    # 计算实际学习时长
    if session.start_time:
        delta = now - session.start_time
        session.focus_duration_seconds = int(delta.total_seconds())

    await db.commit()
    await db.refresh(session)
    return StudySessionResponse.model_validate(session)


@router.post("/distraction")
async def record_distraction(
    data: DistractionRecord,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """记录一次分心事件"""
    result = await db.execute(
        select(StudySession).where(
            StudySession.id == data.session_id,
            StudySession.user_id == current_user["id"],
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="学习记录不存在")

    session.distraction_count += 1
    await db.commit()
    return {"message": "已记录分心事件", "distraction_count": session.distraction_count}


@router.get("/report", response_model=StudyReportResponse)
async def get_report(
    report_date: str = Query(default=None, description="日期，格式 YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取每日学习报告"""
    query_date = report_date or date.today().isoformat()

    # 查询当天的学习记录
    result = await db.execute(
        select(StudySession)
        .where(
            StudySession.user_id == current_user["id"],
            func.date(StudySession.start_time) == query_date,
        )
        .order_by(StudySession.start_time)
    )
    sessions = result.scalars().all()

    total_seconds = sum(s.focus_duration_seconds or 0 for s in sessions)
    total_distractions = sum(s.distraction_count or 0 for s in sessions)

    return StudyReportResponse(
        date=query_date,
        total_focus_minutes=total_seconds // 60,
        distraction_count=total_distractions,
        sessions=[StudySessionResponse.model_validate(s) for s in sessions],
    )
