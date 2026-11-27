from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.exam import Choice, ExamQuestion, ExamStatus, Examination, Question, QuestionType
from app.models.user import User
from app.schemas.exam import (
    ChoiceCreate,
    ExamCreate,
    ExamQuestionAdd,
    ExamUpdate,
    QuestionCreate,
    QuestionUpdate,
)


# ── Question helpers ──────────────────────────────────────────────────────────

async def _load_question(db: AsyncSession, question_id: int) -> Question | None:
    result = await db.execute(
        select(Question)
        .where(Question.id == question_id)
        .options(selectinload(Question.choices))
    )
    return result.scalar_one_or_none()


async def list_questions(
    db: AsyncSession,
    creator: User,
    page: int = 1,
    per_page: int = 20,
    q: str | None = None,
    question_type: QuestionType | None = None,
) -> tuple[list[Question], int]:
    stmt = select(Question).where(Question.creator_id == creator.id)
    if q:
        stmt = stmt.where(Question.text.ilike(f"%{q}%"))
    if question_type:
        stmt = stmt.where(Question.question_type == question_type)

    count_result = await db.execute(select(func.count()).select_from(stmt.subquery()))
    total = count_result.scalar_one()

    stmt = (
        stmt.order_by(Question.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .options(selectinload(Question.choices))
    )
    rows = await db.execute(stmt)
    return rows.scalars().all(), total  # type: ignore[return-value]


async def create_question(
    db: AsyncSession, creator: User, data: QuestionCreate
) -> Question:
    _validate_choices_for_type(data.question_type, data.choices)
    question = Question(
        creator_id=creator.id,
        question_type=data.question_type,
        text=data.text,
        marks=data.marks,
    )
    db.add(question)
    await db.flush()  # get question.id

    for idx, c in enumerate(data.choices or []):
        db.add(Choice(
            question_id=question.id,
            text=c.text,
            is_correct=c.is_correct,
            order_index=idx,
        ))
    await db.commit()
    await db.refresh(question)
    # reload choices
    result = await db.execute(
        select(Question).where(Question.id == question.id).options(selectinload(Question.choices))
    )
    return result.scalar_one()


async def get_question(db: AsyncSession, question_id: int, creator: User) -> Question | None:
    result = await db.execute(
        select(Question)
        .where(Question.id == question_id, Question.creator_id == creator.id)
        .options(selectinload(Question.choices))
    )
    return result.scalar_one_or_none()


async def update_question(
    db: AsyncSession, question: Question, data: QuestionUpdate
) -> Question:
    if data.text is not None:
        question.text = data.text
    if data.marks is not None:
        question.marks = data.marks

    if data.choices is not None:
        _validate_choices_for_type(question.question_type, data.choices)
        for c in question.choices:
            await db.delete(c)
        await db.flush()
        for idx, c in enumerate(data.choices):
            db.add(Choice(
                question_id=question.id,
                text=c.text,
                is_correct=c.is_correct,
                order_index=idx,
            ))

    await db.commit()
    result = await db.execute(
        select(Question).where(Question.id == question.id).options(selectinload(Question.choices))
    )
    return result.scalar_one()


async def delete_question(db: AsyncSession, question: Question) -> None:
    # prevent deletion if question is attached to any exam
    eq = await db.execute(
        select(ExamQuestion).where(ExamQuestion.question_id == question.id).limit(1)
    )
    if eq.scalar_one_or_none():
        raise ValueError("Cannot delete a question that is attached to an examination.")
    await db.delete(question)
    await db.commit()


# ── Examination helpers ───────────────────────────────────────────────────────

async def list_exams(
    db: AsyncSession,
    creator: User,
    page: int = 1,
    per_page: int = 20,
    status: ExamStatus | None = None,
) -> tuple[list[Examination], int]:
    stmt = select(Examination).where(Examination.creator_id == creator.id)
    if status:
        stmt = stmt.where(Examination.status == status)

    count_result = await db.execute(select(func.count()).select_from(stmt.subquery()))
    total = count_result.scalar_one()

    stmt = (
        stmt.order_by(Examination.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .options(selectinload(Examination.exam_questions))
    )
    rows = await db.execute(stmt)
    return rows.scalars().all(), total  # type: ignore[return-value]


async def create_exam(db: AsyncSession, creator: User, data: ExamCreate) -> Examination:
    exam = Examination(
        creator_id=creator.id,
        title=data.title,
        description=data.description,
        duration_minutes=data.duration_minutes,
        passing_marks=data.passing_marks,
    )
    db.add(exam)
    await db.commit()
    result = await db.execute(
        select(Examination)
        .where(Examination.id == exam.id)
        .options(selectinload(Examination.exam_questions))
    )
    return result.scalar_one()


async def get_exam(db: AsyncSession, exam_id: int, creator: User) -> Examination | None:
    result = await db.execute(
        select(Examination)
        .where(Examination.id == exam_id, Examination.creator_id == creator.id)
        .options(
            selectinload(Examination.exam_questions).selectinload(ExamQuestion.question).selectinload(Question.choices)
        )
    )
    return result.scalar_one_or_none()


async def update_exam(db: AsyncSession, exam: Examination, data: ExamUpdate) -> Examination:
    if exam.status == ExamStatus.PUBLISHED:
        raise ValueError("Cannot edit a published examination.")
    for field in ("title", "description", "duration_minutes", "passing_marks"):
        val = getattr(data, field, None)
        if val is not None:
            setattr(exam, field, val)
    await db.commit()
    result = await db.execute(
        select(Examination)
        .where(Examination.id == exam.id)
        .options(
            selectinload(Examination.exam_questions).selectinload(ExamQuestion.question).selectinload(Question.choices)
        )
    )
    return result.scalar_one()


async def delete_exam(db: AsyncSession, exam: Examination) -> None:
    if exam.status == ExamStatus.PUBLISHED:
        raise ValueError("Cannot delete a published examination.")
    await db.delete(exam)
    await db.commit()


async def publish_exam(db: AsyncSession, exam: Examination) -> Examination:
    if exam.status == ExamStatus.PUBLISHED:
        raise ValueError("Examination is already published.")

    eq_count = await db.execute(
        select(func.count()).where(ExamQuestion.examination_id == exam.id)
    )
    if eq_count.scalar_one() == 0:
        raise ValueError("Cannot publish an examination with no questions.")

    from datetime import datetime, timezone
    exam.status = ExamStatus.PUBLISHED
    exam.published_at = datetime.now(timezone.utc)
    await db.commit()
    result = await db.execute(
        select(Examination)
        .where(Examination.id == exam.id)
        .options(
            selectinload(Examination.exam_questions).selectinload(ExamQuestion.question).selectinload(Question.choices)
        )
    )
    return result.scalar_one()


async def add_questions_to_exam(
    db: AsyncSession, exam: Examination, data: ExamQuestionAdd
) -> Examination:
    if exam.status == ExamStatus.PUBLISHED:
        raise ValueError("Cannot modify a published examination.")

    # get current max order
    max_order_result = await db.execute(
        select(func.coalesce(func.max(ExamQuestion.order_index), -1)).where(
            ExamQuestion.examination_id == exam.id
        )
    )
    max_order = max_order_result.scalar_one()

    # check questions exist and belong to same creator
    added_marks = 0
    for idx, qid in enumerate(data.question_ids):
        # check not already in exam
        existing = await db.execute(
            select(ExamQuestion).where(
                ExamQuestion.examination_id == exam.id,
                ExamQuestion.question_id == qid,
            )
        )
        if existing.scalar_one_or_none():
            continue  # skip duplicates silently

        q_result = await db.execute(
            select(Question).where(Question.id == qid, Question.creator_id == exam.creator_id)
        )
        q = q_result.scalar_one_or_none()
        if not q:
            raise ValueError(f"Question {qid} not found or not owned by you.")

        db.add(ExamQuestion(
            examination_id=exam.id,
            question_id=qid,
            order_index=max_order + 1 + idx,
        ))
        added_marks += q.marks

    exam.total_marks = exam.total_marks + added_marks
    await db.commit()
    result = await db.execute(
        select(Examination)
        .where(Examination.id == exam.id)
        .options(
            selectinload(Examination.exam_questions)
            .selectinload(ExamQuestion.question)
            .selectinload(Question.choices)
        )
        .execution_options(populate_existing=True)
    )
    return result.scalar_one()


async def remove_question_from_exam(
    db: AsyncSession, exam: Examination, question_id: int
) -> Examination:
    if exam.status == ExamStatus.PUBLISHED:
        raise ValueError("Cannot modify a published examination.")

    eq_result = await db.execute(
        select(ExamQuestion).where(
            ExamQuestion.examination_id == exam.id,
            ExamQuestion.question_id == question_id,
        )
    )
    eq = eq_result.scalar_one_or_none()
    if not eq:
        raise ValueError("Question is not in this examination.")

    q_result = await db.execute(select(Question).where(Question.id == question_id))
    q = q_result.scalar_one_or_none()
    marks_to_remove = q.marks if q else 0

    await db.delete(eq)
    exam.total_marks = max(0, exam.total_marks - marks_to_remove)
    await db.commit()
    result = await db.execute(
        select(Examination)
        .where(Examination.id == exam.id)
        .options(
            selectinload(Examination.exam_questions)
            .selectinload(ExamQuestion.question)
            .selectinload(Question.choices)
        )
        .execution_options(populate_existing=True)
    )
    return result.scalar_one()


async def _get_user_stub(db: AsyncSession, user_id: UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one()


# ── Validation helpers ────────────────────────────────────────────────────────

def _validate_choices_for_type(
    question_type: QuestionType, choices: list[ChoiceCreate] | None
) -> None:
    if question_type == QuestionType.WRITTEN:
        return  # no choices needed
    if not choices or len(choices) < 2:
        raise ValueError("MCQ questions require at least 2 choices.")
    correct = [c for c in choices if c.is_correct]
    if question_type == QuestionType.SINGLE_CHOICE and len(correct) != 1:
        raise ValueError("Single-choice questions must have exactly 1 correct answer.")
    if question_type == QuestionType.MULTIPLE_CHOICE and len(correct) < 1:
        raise ValueError("Multiple-choice questions must have at least 1 correct answer.")
