from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class GradeResponseRequest(BaseModel):
    awarded_marks: float = Field(..., ge=0)
    feedback: str | None = None


class GradedResponseOut(BaseModel):
    id: int
    attempt_question_id: int
    awarded_marks: float | None
    grading_status: str | None
    examiner_feedback: str | None
    graded_at: datetime | None

    model_config = {"from_attributes": True}


class SubmissionSummary(BaseModel):
    attempt_id: int
    candidate_id: str
    candidate_name: str
    submitted_at: datetime | None
    total_marks: float | None
    obtained_marks: float | None
    percentage: float | None
    result_status: str | None
    publication_status: str
    pending_written_count: int


class AttemptGradingChoiceOut(BaseModel):
    id: int
    choice_text: str
    is_correct: bool
    display_order: int


class AttemptGradingResponseOut(BaseModel):
    id: int | None
    selected_choice_ids: list[int]
    written_text: str | None
    awarded_marks: float | None
    grading_status: str | None
    examiner_feedback: str | None


class AttemptGradingQuestionOut(BaseModel):
    id: int
    display_order: int
    question_text: str
    question_type: str
    marks: int
    choices: list[AttemptGradingChoiceOut]
    response: AttemptGradingResponseOut | None


class AttemptGradingResultOut(BaseModel):
    total_marks: float
    obtained_marks: float
    percentage: float
    result_status: str | None
    publication_status: str


class AttemptGradingOut(BaseModel):
    attempt_id: int
    exam_id: int
    exam_title: str
    candidate_id: str
    candidate_name: str
    submitted_at: datetime | None
    questions: list[AttemptGradingQuestionOut]
    result: AttemptGradingResultOut | None


class ResultSummary(BaseModel):
    result_id: int
    attempt_id: int
    candidate_id: str
    candidate_name: str
    total_marks: float
    obtained_marks: float
    percentage: float
    result_status: str | None
    publication_status: str
    published_at: datetime | None


class FinalizeGradingOut(BaseModel):
    attempt_id: int
    total_marks: float
    obtained_marks: float
    percentage: float
    result_status: str | None
    publication_status: str


class PublishResultOut(BaseModel):
    result_id: int
    publication_status: str
    published_at: datetime | None


# ── Candidate-facing ──────────────────────────────────────────────────────────

class CandidateResultSummary(BaseModel):
    result_id: int
    exam_id: int
    exam_title: str
    total_marks: float
    obtained_marks: float
    percentage: float
    result_status: str | None
    published_at: datetime | None


class CandidateResultQuestionOut(BaseModel):
    question_text: str
    question_type: str
    marks: int
    awarded_marks: float
    examiner_feedback: str | None = None


class CandidateResultDetail(BaseModel):
    result_id: int
    exam_id: int
    exam_title: str
    total_marks: float
    obtained_marks: float
    percentage: float
    passing_marks: float | None
    result_status: str | None
    published_at: datetime | None
    questions: list[CandidateResultQuestionOut]
