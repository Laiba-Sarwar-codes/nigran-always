from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_examiner, require_candidate
from app.models.user import User
from app.schemas.grading import (
    GradeResponseRequest,
    GradedResponseOut,
    SubmissionSummary,
    AttemptGradingOut,
    ResultSummary,
    FinalizeGradingOut,
    PublishResultOut,
    CandidateResultSummary,
    CandidateResultDetail,
)
import app.services.grading as svc

router = APIRouter(tags=["grading"])


# ── Examiner: submissions ─────────────────────────────────────────────────────

@router.get(
    "/examiner/exams/{exam_id}/submissions",
    response_model=list[SubmissionSummary],
)
async def list_submissions(
    exam_id: int,
    examiner: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await svc.get_exam_submissions(db, examiner, exam_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/examiner/attempts/{attempt_id}/grading",
    response_model=AttemptGradingOut,
)
async def get_attempt_grading(
    attempt_id: int,
    examiner: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await svc.get_attempt_grading(db, examiner, attempt_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put(
    "/examiner/attempts/{attempt_id}/responses/{response_id}/grade",
    response_model=GradedResponseOut,
)
async def grade_response(
    attempt_id: int,
    response_id: int,
    body: GradeResponseRequest,
    examiner: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    try:
        resp = await svc.grade_response(db, examiner, attempt_id, response_id, body.awarded_marks, body.feedback)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return GradedResponseOut(
        id=resp.id,
        attempt_question_id=resp.attempt_question_id,
        awarded_marks=float(resp.awarded_marks) if resp.awarded_marks is not None else None,
        grading_status=resp.grading_status.value if resp.grading_status else None,
        examiner_feedback=resp.examiner_feedback,
        graded_at=resp.graded_at,
    )


@router.post(
    "/examiner/attempts/{attempt_id}/finalize-grading",
    response_model=FinalizeGradingOut,
)
async def finalize_grading(
    attempt_id: int,
    examiner: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    try:
        result_row = await svc.finalize_grading(db, examiner, attempt_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return FinalizeGradingOut(
        attempt_id=attempt_id,
        total_marks=float(result_row.total_marks),
        obtained_marks=float(result_row.obtained_marks),
        percentage=float(result_row.percentage),
        result_status=result_row.result_status.value if result_row.result_status else None,
        publication_status=result_row.publication_status.value,
    )


@router.get(
    "/examiner/exams/{exam_id}/results",
    response_model=list[ResultSummary],
)
async def list_exam_results(
    exam_id: int,
    examiner: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await svc.get_exam_results(db, examiner, exam_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/examiner/attempts/{attempt_id}/publish-result",
    response_model=PublishResultOut,
)
async def publish_result(
    attempt_id: int,
    examiner: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    try:
        result_row = await svc.publish_result(db, examiner, attempt_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return PublishResultOut(
        result_id=result_row.id,
        publication_status=result_row.publication_status.value,
        published_at=result_row.published_at,
    )


# ── Candidate: results ────────────────────────────────────────────────────────

@router.get(
    "/candidate/results",
    response_model=list[CandidateResultSummary],
)
async def candidate_results(
    candidate: User = Depends(require_candidate),
    db: AsyncSession = Depends(get_db),
):
    return await svc.get_candidate_results(db, candidate)


@router.get(
    "/candidate/results/{result_id}",
    response_model=CandidateResultDetail,
)
async def candidate_result_detail(
    result_id: int,
    candidate: User = Depends(require_candidate),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await svc.get_candidate_result_detail(db, candidate, result_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
