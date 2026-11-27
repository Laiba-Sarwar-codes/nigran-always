from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_candidate, require_examiner
from app.models.user import User
from app.schemas.candidate import (
    EnrollRequest,
    EnrollmentResponse,
    EnrolledExamResponse,
    AttemptStartResponse,
    AttemptDetailResponse,
    SaveResponseRequest,
    SaveResponseResult,
    ReviewFlagRequest,
    SubmitResponse,
)
import app.services.candidate as svc

router = APIRouter(prefix="/candidate", tags=["candidate"])


# ── Examiner/Admin: enroll a candidate ───────────────────────────────────────

@router.post(
    "/exams/{exam_id}/enroll",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def enroll_candidate(
    exam_id: int,
    body: EnrollRequest,
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    try:
        enrollment = await svc.enroll_candidate(db, current_user, exam_id, body.candidate_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return enrollment


@router.get(
    "/exams/{exam_id}/enrollments",
    response_model=list[EnrollmentResponse],
)
async def list_enrollments(
    exam_id: int,
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    enrollments = await svc.get_enrollments_for_exam(db, exam_id)
    return enrollments


# ── Candidate: list enrolled exams ───────────────────────────────────────────

@router.get(
    "/my-exams",
    response_model=list[EnrolledExamResponse],
)
async def list_my_exams(
    current_user: User = Depends(require_candidate),
    db: AsyncSession = Depends(get_db),
):
    exams = await svc.get_candidate_exams(db, current_user)
    return exams


@router.get(
    "/my-exams/{exam_id}",
    response_model=EnrolledExamResponse,
)
async def get_my_exam(
    exam_id: int,
    current_user: User = Depends(require_candidate),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await svc.get_candidate_exam_detail(db, current_user, exam_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ── Candidate: attempt lifecycle ─────────────────────────────────────────────

@router.post(
    "/my-exams/{exam_id}/start",
    response_model=AttemptStartResponse,
    status_code=status.HTTP_201_CREATED,
)
async def start_attempt(
    exam_id: int,
    current_user: User = Depends(require_candidate),
    db: AsyncSession = Depends(get_db),
):
    try:
        attempt = await svc.start_attempt(db, current_user, exam_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return AttemptStartResponse(
        attempt_id=attempt.id,
        exam_id=attempt.examination_id,
        status=attempt.status,
        started_at=attempt.started_at,
        deadline_at=attempt.deadline_at,
    )


@router.get(
    "/attempts/{attempt_id}",
    response_model=AttemptDetailResponse,
)
async def get_attempt(
    attempt_id: int,
    current_user: User = Depends(require_candidate),
    db: AsyncSession = Depends(get_db),
):
    try:
        data = await svc.get_attempt(db, current_user, attempt_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return data


@router.put(
    "/attempts/{attempt_id}/questions/{aq_id}/response",
    response_model=SaveResponseResult,
)
async def save_response(
    attempt_id: int,
    aq_id: int,
    body: SaveResponseRequest,
    current_user: User = Depends(require_candidate),
    db: AsyncSession = Depends(get_db),
):
    try:
        resp = await svc.save_response(db, current_user, attempt_id, aq_id, body)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return SaveResponseResult(
        attempt_question_id=resp.attempt_question_id,
        selected_choice_ids=resp.selected_choice_ids or [],
        written_text=resp.written_text,
        is_marked_for_review=resp.is_marked_for_review,
        saved_at=resp.saved_at,
    )


@router.patch(
    "/attempts/{attempt_id}/questions/{aq_id}/review",
    response_model=SaveResponseResult,
)
async def toggle_review_flag(
    attempt_id: int,
    aq_id: int,
    body: ReviewFlagRequest,
    current_user: User = Depends(require_candidate),
    db: AsyncSession = Depends(get_db),
):
    try:
        resp = await svc.toggle_review_flag(db, current_user, attempt_id, aq_id, body.marked)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return SaveResponseResult(
        attempt_question_id=resp.attempt_question_id,
        selected_choice_ids=resp.selected_choice_ids or [],
        written_text=resp.written_text,
        is_marked_for_review=resp.is_marked_for_review,
        saved_at=resp.saved_at,
    )


@router.post(
    "/attempts/{attempt_id}/submit",
    response_model=SubmitResponse,
)
async def submit_attempt(
    attempt_id: int,
    current_user: User = Depends(require_candidate),
    db: AsyncSession = Depends(get_db),
):
    try:
        attempt = await svc.submit_attempt(db, current_user, attempt_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Count answered questions
    from sqlalchemy import select
    from app.models.candidate import Response, AttemptQuestion
    total_q = await db.execute(
        select(AttemptQuestion).where(AttemptQuestion.attempt_id == attempt_id)
    )
    total_questions = len(total_q.scalars().all())
    answered = await db.execute(
        select(Response).where(
            Response.attempt_id == attempt_id,
        )
    )
    answered_rows = answered.scalars().all()
    total_answered = sum(
        1 for r in answered_rows
        if (r.selected_choice_ids and len(r.selected_choice_ids) > 0) or r.written_text
    )

    return SubmitResponse(
        attempt_id=attempt.id,
        status=attempt.status,
        submitted_at=attempt.submitted_at,
        total_answered=total_answered,
        total_questions=total_questions,
    )
