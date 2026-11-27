from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.core.deps import require_admin, require_examiner, require_candidate, get_current_user
from app.models.user import User, Role, AuditLog
from app.models.exam import Examination, ExamStatus, Question
from app.models.candidate import Enrollment, Attempt, AttemptStatus, Result, ResultPublicationStatus, ResultStatus, GradingStatus, Response
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

@router.get("/admin/analytics")
async def admin_analytics(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.candidate import ResultStatus

    admin_count = (await db.execute(select(func.count(User.id)).where(User.role == Role.ADMIN))).scalar_one()
    examiner_count = (await db.execute(select(func.count(User.id)).where(User.role == Role.EXAMINER))).scalar_one()
    candidate_count = (await db.execute(select(func.count(User.id)).where(User.role == Role.CANDIDATE))).scalar_one()

    draft_exams = (await db.execute(select(func.count(Examination.id)).where(Examination.status == ExamStatus.DRAFT))).scalar_one()
    published_exams = (await db.execute(select(func.count(Examination.id)).where(Examination.status == ExamStatus.PUBLISHED))).scalar_one()

    total_attempts = (await db.execute(select(func.count(Attempt.id)))).scalar_one()
    submitted_attempts = (await db.execute(select(func.count(Attempt.id)).where(Attempt.status == AttemptStatus.SUBMITTED))).scalar_one()
    inprogress_attempts = (await db.execute(select(func.count(Attempt.id)).where(Attempt.status == AttemptStatus.IN_PROGRESS))).scalar_one()

    published_results = (await db.execute(select(func.count(Result.id)).where(Result.publication_status == ResultPublicationStatus.PUBLISHED))).scalar_one()
    pass_results = (await db.execute(select(func.count(Result.id)).where(Result.result_status == ResultStatus.PASS, Result.publication_status == ResultPublicationStatus.PUBLISHED))).scalar_one()
    fail_results = (await db.execute(select(func.count(Result.id)).where(Result.result_status == ResultStatus.FAIL, Result.publication_status == ResultPublicationStatus.PUBLISHED))).scalar_one()

    top_q = (
        select(User.full_name, func.count(Examination.id).label("exam_count"))
        .join(Examination, Examination.creator_id == User.id)
        .where(User.role == Role.EXAMINER)
        .group_by(User.id, User.full_name)
        .order_by(func.count(Examination.id).desc())
        .limit(5)
    )
    top_rows = (await db.execute(top_q)).all()
    top_examiners = []
    for full_name, exam_count in top_rows:
        examiner_obj = (await db.execute(select(User).where(User.full_name == full_name, User.role == Role.EXAMINER))).scalars().first()
        cand_count = 0
        if examiner_obj:
            from app.models.candidate import Enrollment
            cand_count = (await db.execute(
                select(func.count(Enrollment.id))
                .join(Examination, Examination.id == Enrollment.examination_id)
                .where(Examination.creator_id == examiner_obj.id)
            )).scalar_one()
        top_examiners.append({"examiner_name": full_name, "exam_count": exam_count, "candidate_count": cand_count})

    return {
        "user_by_role": {"admin": admin_count, "examiner": examiner_count, "candidate": candidate_count},
        "exam_by_status": {"DRAFT": draft_exams, "PUBLISHED": published_exams},
        "attempt_stats": {"total": total_attempts, "submitted": submitted_attempts, "in_progress": inprogress_attempts},
        "result_stats": {"published": published_results, "pass": pass_results, "fail": fail_results},
        "top_examiners": top_examiners,
    }


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

    enrolled_candidates = (await db.execute(
        select(func.count(Enrollment.id))
        .join(Examination, Examination.id == Enrollment.examination_id)
        .where(Examination.creator_id == current_user.id)
    )).scalar_one()

    submitted_attempts = (await db.execute(
        select(func.count(Attempt.id))
        .join(Examination, Examination.id == Attempt.examination_id)
        .where(Examination.creator_id == current_user.id, Attempt.status == AttemptStatus.SUBMITTED)
    )).scalar_one()

    pending_grading = (await db.execute(
        select(func.count(Response.id))
        .join(Attempt, Attempt.id == Response.attempt_id)
        .join(Examination, Examination.id == Attempt.examination_id)
        .where(Examination.creator_id == current_user.id, Response.grading_status == GradingStatus.PENDING)
    )).scalar_one()

    published_results = (await db.execute(
        select(func.count(Result.id))
        .join(Examination, Examination.id == Result.examination_id)
        .where(Examination.creator_id == current_user.id, Result.publication_status == ResultPublicationStatus.PUBLISHED)
    )).scalar_one()

    return {
        "total_examinations": total_exams,
        "published_examinations": published,
        "draft_examinations": draft,
        "total_questions": total_questions,
        "enrolled_candidates": enrolled_candidates,
        "submitted_attempts": submitted_attempts,
        "pending_grading": pending_grading,
        "published_results": published_results,
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


@router.get("/examiner/analytics")
async def examiner_analytics(
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    """Per-exam breakdown: enrollment, submission, pass/fail counts and avg score."""
    from app.models.candidate import ResultStatus
    exams = (await db.execute(
        select(Examination)
        .where(Examination.creator_id == current_user.id)
        .order_by(Examination.updated_at.desc())
    )).scalars().all()

    items = []
    for exam in exams:
        enrolled = (await db.execute(
            select(func.count(Enrollment.id)).where(Enrollment.examination_id == exam.id)
        )).scalar_one()
        submitted = (await db.execute(
            select(func.count(Attempt.id)).where(
                Attempt.examination_id == exam.id,
                Attempt.status == AttemptStatus.SUBMITTED,
            )
        )).scalar_one()
        passes = (await db.execute(
            select(func.count(Result.id)).where(
                Result.examination_id == exam.id,
                Result.result_status == ResultStatus.PASS,
                Result.publication_status == ResultPublicationStatus.PUBLISHED,
            )
        )).scalar_one()
        fails = (await db.execute(
            select(func.count(Result.id)).where(
                Result.examination_id == exam.id,
                Result.result_status == ResultStatus.FAIL,
                Result.publication_status == ResultPublicationStatus.PUBLISHED,
            )
        )).scalar_one()
        avg_pct = (await db.execute(
            select(func.avg(Result.percentage)).where(
                Result.examination_id == exam.id,
                Result.publication_status == ResultPublicationStatus.PUBLISHED,
            )
        )).scalar_one()
        items.append({
            "id": exam.id,
            "title": exam.title,
            "status": exam.status.value,
            "enrolled": enrolled,
            "submitted": submitted,
            "passes": passes,
            "fails": fails,
            "avg_percentage": round(float(avg_pct), 1) if avg_pct is not None else None,
        })
    return {"items": items}


# ── Candidate ─────────────────────────────────────────────────────────────────

@router.get("/candidate/summary")
async def candidate_summary(
    current_user: User = Depends(require_candidate),
    db: AsyncSession = Depends(get_db),
):
    from app.models.candidate import Attempt, AttemptStatus
    assigned = (await db.execute(
        select(func.count(Enrollment.id)).where(Enrollment.candidate_id == current_user.id)
    )).scalar_one()
    completed = (await db.execute(
        select(func.count(Attempt.id)).where(
            Attempt.candidate_id == current_user.id,
            Attempt.status == AttemptStatus.SUBMITTED,
        )
    )).scalar_one()
    in_progress = (await db.execute(
        select(func.count(Attempt.id)).where(
            Attempt.candidate_id == current_user.id,
            Attempt.status == AttemptStatus.IN_PROGRESS,
        )
    )).scalar_one()
    published_results = (await db.execute(
        select(func.count(Result.id)).where(
            Result.candidate_id == current_user.id,
            Result.publication_status == ResultPublicationStatus.PUBLISHED,
        )
    )).scalar_one()
    return {
        "assigned_examinations": assigned,
        "upcoming_examinations": max(0, assigned - completed - in_progress),
        "completed_examinations": completed,
        "in_progress_examinations": in_progress,
        "published_results": published_results,
    }


@router.get("/candidate/recent-exams")
async def candidate_recent_exams(
    current_user: User = Depends(require_candidate),
    db: AsyncSession = Depends(get_db),
):
    from app.models.candidate import Attempt, AttemptStatus
    from sqlalchemy.orm import selectinload
    enrollments = (await db.execute(
        select(Enrollment)
        .where(Enrollment.candidate_id == current_user.id)
        .options(selectinload(Enrollment.examination), selectinload(Enrollment.attempt))
        .order_by(Enrollment.enrolled_at.desc())
        .limit(5)
    )).scalars().all()
    items = []
    for e in enrollments:
        exam = e.examination
        attempt = e.attempt
        items.append({
            "id": exam.id,
            "title": exam.title,
            "status": attempt.status.value if attempt else "NOT_STARTED",
            "enrolled_at": e.enrolled_at.isoformat(),
        })
    return {"items": items, "total": len(items)}


@router.get("/candidate/results-summary")
async def candidate_results_summary(
    current_user: User = Depends(require_candidate),
    db: AsyncSession = Depends(get_db),
):
    published_count = (await db.execute(
        select(func.count(Result.id)).where(
            Result.candidate_id == current_user.id,
            Result.publication_status == ResultPublicationStatus.PUBLISHED,
        )
    )).scalar_one()
    return {"published_results": published_count}
