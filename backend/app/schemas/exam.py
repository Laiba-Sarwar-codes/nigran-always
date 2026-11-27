from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models.exam import ExamStatus, QuestionType


# ── Choices ───────────────────────────────────────────────────────────────────

class ChoiceCreate(BaseModel):
    text: str = Field(min_length=1)
    is_correct: bool = False


class ChoiceResponse(BaseModel):
    id: int
    text: str
    is_correct: bool
    order_index: int

    model_config = {"from_attributes": True}


# ── Questions ─────────────────────────────────────────────────────────────────

class QuestionCreate(BaseModel):
    question_type: QuestionType
    text: str = Field(min_length=1)
    marks: int = Field(default=1, ge=1)
    choices: list[ChoiceCreate] | None = None


class QuestionUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1)
    marks: int | None = Field(default=None, ge=1)
    choices: list[ChoiceCreate] | None = None


class QuestionResponse(BaseModel):
    id: int
    uuid: UUID
    question_type: QuestionType
    text: str
    marks: int
    is_active: bool
    choices: list[ChoiceResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuestionListResponse(BaseModel):
    items: list[QuestionResponse]
    total: int
    page: int
    per_page: int
    pages: int


# ── Examinations ──────────────────────────────────────────────────────────────

class ExamCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    duration_minutes: int | None = Field(default=None, ge=1)
    passing_marks: int | None = Field(default=None, ge=0)


class ExamUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    duration_minutes: int | None = Field(default=None, ge=1)
    passing_marks: int | None = Field(default=None, ge=0)


class ExamQuestionAdd(BaseModel):
    question_ids: list[int] = Field(min_length=1)


class ExamQuestionResponse(BaseModel):
    id: int
    order_index: int
    question: QuestionResponse

    model_config = {"from_attributes": True}


class ExamResponse(BaseModel):
    id: int
    uuid: UUID
    title: str
    description: str | None
    duration_minutes: int | None
    total_marks: int
    passing_marks: int | None
    status: ExamStatus
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    exam_questions: list[ExamQuestionResponse] = []

    model_config = {"from_attributes": True}


class ExamListResponse(BaseModel):
    items: list[ExamResponse]
    total: int
    page: int
    per_page: int
    pages: int
