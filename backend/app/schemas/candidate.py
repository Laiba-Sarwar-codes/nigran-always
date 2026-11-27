from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.candidate import AttemptStatus


# ── Enrollment ────────────────────────────────────────────────────────────────

class EnrollRequest(BaseModel):
    candidate_id: UUID


class EnrollmentResponse(BaseModel):
    id: int
    examination_id: int
    candidate_id: UUID
    enrolled_at: datetime

    model_config = {"from_attributes": True}


# ── Candidate exam list ───────────────────────────────────────────────────────

class EnrolledExamResponse(BaseModel):
    id: int
    title: str
    description: str | None
    duration_minutes: int | None
    total_marks: int
    passing_marks: int | None
    # attempt status derived from attempt row
    attempt_status: str  # NOT_STARTED | IN_PROGRESS | SUBMITTED | EXPIRED
    attempt_id: int | None = None
    started_at: datetime | None = None
    deadline_at: datetime | None = None
    submitted_at: datetime | None = None


# ── Attempt ───────────────────────────────────────────────────────────────────

class ChoiceSnapshotResponse(BaseModel):
    """NEVER includes is_correct."""
    id: int
    choice_text: str
    display_order: int

    model_config = {"from_attributes": True}


class AttemptQuestionResponse(BaseModel):
    id: int
    display_order: int
    question_text: str
    question_type: str
    marks: int
    choices: list[ChoiceSnapshotResponse] = []

    model_config = {"from_attributes": True}


class ResponseData(BaseModel):
    attempt_question_id: int
    selected_choice_ids: list[int] = Field(default_factory=list)
    written_text: str | None = None
    is_marked_for_review: bool = False

    model_config = {"from_attributes": True}


class AttemptDetailResponse(BaseModel):
    id: int
    exam_id: int
    status: AttemptStatus
    started_at: datetime
    deadline_at: datetime
    submitted_at: datetime | None
    questions: list[AttemptQuestionResponse] = []
    responses: dict[int, ResponseData] = {}  # keyed by attempt_question_id


class AttemptStartResponse(BaseModel):
    attempt_id: int
    exam_id: int
    status: AttemptStatus
    started_at: datetime
    deadline_at: datetime


# ── Save response ─────────────────────────────────────────────────────────────

class SaveResponseRequest(BaseModel):
    selected_choice_ids: list[int] = Field(default_factory=list)
    written_text: str | None = None
    client_version: int | None = Field(default=None, description="Current known version for OCC; omit to skip check")


class ReviewFlagRequest(BaseModel):
    marked: bool


class SaveResponseResult(BaseModel):
    attempt_question_id: int
    selected_choice_ids: list[int]
    written_text: str | None
    is_marked_for_review: bool
    version: int
    saved_at: datetime


class AttemptStatusResponse(BaseModel):
    attempt_id: int
    status: AttemptStatus
    submitted_at: datetime | None


# ── Submission ────────────────────────────────────────────────────────────────

class SubmitResponse(BaseModel):
    attempt_id: int
    status: AttemptStatus
    submitted_at: datetime
    total_answered: int
    total_questions: int
