from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.core.deps import require_admin, require_examiner, require_candidate, get_current_user
from app.models.user import User, Role, AuditLog
from app.models.exam import Examination, ExamStatus, Question
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ── Shared ────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def dashboard_me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.get("/admin/stats")
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    total = (await db.execute(select(func.count(User.id)))).scalar_one()
    candidates = (await db.execute(select(func.count(User.id)).where(User.role == Role.CANDIDATE))).scalar_one()
    examiners = (await db.execute(select(func.count(User.id)).where(User.role == Role.EXAMINER))).scalar_one()
    active = (await db.execute(select(func.count(User.id)).where(User.is_active.is_(True)))).scalar_one()

    total_exams = (await db.execute(select(func.count(Examination.id)))).scalar_one()
    published_exams = (await db.execute(select(func.count(Examination.id)).where(Examination.status == ExamStatus.PUBLISHED))).scalar_one()

    return {
        "total_users": total,
        "candidates": candidates,
        "examiners": examiners,
        "active_users": active,
        "total_examinations": total_exams,
        "published_examinations": published_exams,
    }


@router.get("/admin/activity")
async def admin_activity(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    total = (await db.execute(select(func.count(AuditLog.id)))).scalar_one()
    logs_q = (
        select(AuditLog, User.full_name, User.email)
        .outerjoin(User, AuditLog.actor_id == User.id)
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(logs_q)).all()
    items = [
        {
            "id": str(log.id),
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "actor_name": full_name,
            "actor_email": email,
            "created_at": log.created_at.isoformat(),
        }
        for log, full_name, email in rows
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


# ── Examiner ──────────────────────────────────────────────────────────────────

@router.get("/examiner/stats")
async def examiner_stats(
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    total_exams = (await db.execute(
        select(func.count(Examination.id)).where(Examination.creator_id == current_user.id)
    )).scalar_one()
    published = (await db.execute(
        select(func.count(Examination.id)).where(
            Examination.creator_id == current_user.id,
            Examination.status == ExamStatus.PUBLISHED,
        )
    )).scalar_one()
    draft = (await db.execute(
        select(func.count(Examination.id)).where(
            Examination.creator_id == current_user.id,
            Examination.status == ExamStatus.DRAFT,
        )
    )).scalar_one()
    total_questions = (await db.execute(
        select(func.count(Question.id)).where(Question.creator_id == current_user.id)
    )).scalar_one()

    return {
        "total_examinations": total_exams,
        "published_examinations": published,
        "draft_examinations": draft,
        "total_questions": total_questions,
        "enrolled_candidates": 0,
    }


@router.get("/examiner/recent-exams")
async def examiner_recent_exams(
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Examination)
        .where(Examination.creator_id == current_user.id)
        .order_by(Examination.updated_at.desc())
        .limit(5)
    )
    rows = (await db.execute(stmt)).scalars().all()
    items = [
        {
            "id": e.id,
            "title": e.title,
            "status": e.status.value,
            "total_marks": e.total_marks,
            "updated_at": e.updated_at.isoformat(),
        }
        for e in rows
    ]
    return {"items": items, "total": len(items)}


# ── Candidate ─────────────────────────────────────────────────────────────────

@router.get("/candidate/summary")
async def candidate_summary(_: User = Depends(require_candidate)):
    return {
        "assigned_examinations": 0,
        "upcoming_examinations": 0,
        "completed_examinations": 0,
        "published_results": 0,
    }


@router.get("/candidate/recent-exams")
async def candidate_recent_exams(_: User = Depends(require_candidate)):
    return {"items": [], "total": 0}


@router.get("/candidate/results")
async def candidate_results(_: User = Depends(require_candidate)):
    return {"items": [], "total": 0}
