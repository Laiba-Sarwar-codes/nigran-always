import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_examiner
from app.models.exam import ExamStatus
from app.models.user import User
from app.schemas.exam import (
    ExamCreate,
    ExamListResponse,
    ExamQuestionAdd,
    ExamResponse,
    ExamUpdate,
)
from app.services import exam as exam_svc

router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("", response_model=ExamListResponse)
async def list_exams(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    exam_status: ExamStatus | None = Query(default=None, alias="status"),
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    items, total = await exam_svc.list_exams(db, current_user, page, per_page, exam_status)
    return ExamListResponse(
        items=items,  # type: ignore[arg-type]
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total else 1,
    )


@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    data: ExamCreate,
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    return await exam_svc.create_exam(db, current_user, data)


@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: int,
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    exam = await exam_svc.get_exam(db, exam_id, current_user)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found.")
    return exam


@router.patch("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: int,
    data: ExamUpdate,
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    exam = await exam_svc.get_exam(db, exam_id, current_user)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found.")
    try:
        return await exam_svc.update_exam(db, exam, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: int,
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    exam = await exam_svc.get_exam(db, exam_id, current_user)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found.")
    try:
        await exam_svc.delete_exam(db, exam)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/{exam_id}/publish", response_model=ExamResponse)
async def publish_exam(
    exam_id: int,
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    exam = await exam_svc.get_exam(db, exam_id, current_user)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found.")
    try:
        return await exam_svc.publish_exam(db, exam)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/{exam_id}/questions", response_model=ExamResponse)
async def add_questions(
    exam_id: int,
    data: ExamQuestionAdd,
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    exam = await exam_svc.get_exam(db, exam_id, current_user)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found.")
    try:
        return await exam_svc.add_questions_to_exam(db, exam, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.delete("/{exam_id}/questions/{question_id}", response_model=ExamResponse)
async def remove_question(
    exam_id: int,
    question_id: int,
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    exam = await exam_svc.get_exam(db, exam_id, current_user)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found.")
    try:
        return await exam_svc.remove_question_from_exam(db, exam, question_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
