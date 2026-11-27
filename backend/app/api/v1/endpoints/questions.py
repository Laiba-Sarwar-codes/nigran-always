import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_examiner
from app.models.exam import QuestionType
from app.models.user import User
from app.schemas.exam import (
    QuestionCreate,
    QuestionListResponse,
    QuestionResponse,
    QuestionUpdate,
)
from app.services import exam as exam_svc

from app.api.v1.endpoints.bulk_upload import router as _bulk_router

router = APIRouter(prefix="/questions", tags=["questions"])
router.include_router(_bulk_router)


@router.get("", response_model=QuestionListResponse)
async def list_questions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    q: str | None = Query(default=None),
    question_type: QuestionType | None = Query(default=None),
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    items, total = await exam_svc.list_questions(db, current_user, page, per_page, q, question_type)
    return QuestionListResponse(
        items=items,  # type: ignore[arg-type]
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total else 1,
    )


@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    data: QuestionCreate,
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await exam_svc.create_question(db, current_user, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(
    question_id: int,
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    q = await exam_svc.get_question(db, question_id, current_user)
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")
    return q


@router.patch("/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: int,
    data: QuestionUpdate,
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    q = await exam_svc.get_question(db, question_id, current_user)
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")
    try:
        return await exam_svc.update_question(db, q, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: int,
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    q = await exam_svc.get_question(db, question_id, current_user)
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")
    try:
        await exam_svc.delete_question(db, q)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
