import enum
import uuid as uuid_module
from datetime import datetime
from uuid import UUID as PyUUID

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.engine import Base


class AttemptStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    EXPIRED = "EXPIRED"


class GradingStatus(str, enum.Enum):
    AUTO = "AUTO"       # objective question, marks assigned automatically
    PENDING = "PENDING" # written question, awaiting manual grading
    GRADED = "GRADED"   # written question, marks assigned by examiner


class ResultStatus(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"


class ResultPublicationStatus(str, enum.Enum):
    PENDING = "PENDING"
    GRADED = "GRADED"
    PUBLISHED = "PUBLISHED"


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("examination_id", "candidate_id"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    examination_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    examination = relationship("Examination", back_populates="enrollments")
    candidate = relationship("User", foreign_keys=[candidate_id])
    attempt = relationship("Attempt", back_populates="enrollment", uselist=False)


class Attempt(Base):
    __tablename__ = "attempts"
    __table_args__ = (UniqueConstraint("examination_id", "candidate_id"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    examination_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enrollment_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    deadline_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus, name="attemptstatus"),
        default=AttemptStatus.IN_PROGRESS,
        nullable=False,
    )
    score: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    enrollment = relationship("Enrollment", back_populates="attempt")
    attempt_questions: Mapped[list["AttemptQuestion"]] = relationship(
        "AttemptQuestion",
        back_populates="attempt",
        cascade="all, delete-orphan",
        order_by="AttemptQuestion.display_order",
    )
    responses: Mapped[list["Response"]] = relationship(
        "Response", back_populates="attempt", cascade="all, delete-orphan"
    )


class AttemptQuestion(Base):
    __tablename__ = "attempt_questions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    attempt_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    original_question_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("questions.id", ondelete="SET NULL"), nullable=True
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(32), nullable=False)
    marks: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    attempt = relationship("Attempt", back_populates="attempt_questions")
    choice_snapshots: Mapped[list["ChoiceSnapshot"]] = relationship(
        "ChoiceSnapshot",
        back_populates="attempt_question",
        cascade="all, delete-orphan",
        order_by="ChoiceSnapshot.display_order",
    )
    response = relationship("Response", back_populates="attempt_question", uselist=False)


class ChoiceSnapshot(Base):
    __tablename__ = "choice_snapshots"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    attempt_question_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("attempt_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    original_choice_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    choice_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    attempt_question = relationship("AttemptQuestion", back_populates="choice_snapshots")


class Response(Base):
    __tablename__ = "responses"
    __table_args__ = (UniqueConstraint("attempt_id", "attempt_question_id"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    attempt_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attempt_question_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("attempt_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    selected_choice_ids: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    written_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_marked_for_review: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    # Grading fields
    awarded_marks: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    grading_status: Mapped[GradingStatus | None] = mapped_column(
        Enum(GradingStatus, name="gradingstatus"), nullable=True
    )
    examiner_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    graded_by_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    attempt = relationship("Attempt", back_populates="responses")
    attempt_question = relationship("AttemptQuestion", back_populates="response")
    graded_by = relationship("User", foreign_keys=[graded_by_id])


class Result(Base):
    __tablename__ = "results"
    __table_args__ = (UniqueConstraint("attempt_id"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    attempt_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    examination_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    total_marks: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    obtained_marks: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    percentage: Mapped[float] = mapped_column(Numeric(7, 4), nullable=False, default=0)
    passing_marks: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    result_status: Mapped[ResultStatus | None] = mapped_column(
        Enum(ResultStatus, name="resultstatus"), nullable=True
    )
    publication_status: Mapped[ResultPublicationStatus] = mapped_column(
        Enum(ResultPublicationStatus, name="resultpublicationstatus"),
        default=ResultPublicationStatus.PENDING,
        nullable=False,
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_by_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    attempt = relationship("Attempt")
    candidate = relationship("User", foreign_keys=[candidate_id])
    examination = relationship("Examination")
    published_by = relationship("User", foreign_keys=[published_by_id])
