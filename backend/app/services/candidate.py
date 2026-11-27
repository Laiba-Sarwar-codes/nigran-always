from datetime import datetime, timezone, timedelta
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.candidate import (
    Attempt,
    AttemptQuestion,
    AttemptStatus,
    ChoiceSnapshot,
    Enrollment,
    Response,
)
from app.models.exam import Examination, ExamQuestion, ExamStatus, Question
from app.models.user import User, Role
from app.schemas.candidate import SaveResponseRequest


# ── Enrollment ────────────────────────────────────────────────────────────────

async def enroll_candidate(
    db: AsyncSession,
    examiner: User,
    exam_id: int,
    candidate_id: UUID,
) -> Enrollment:
    # Verify exam exists and belongs to examiner (or admin)
    exam_result = await db.execute(select(Examination).where(Examination.id == exam_id))
    exam = exam_result.scalar_one_or_none()
    if not exam:
        raise ValueError("Examination not found.")
    if examiner.role == Role.EXAMINER and exam.creator_id != examiner.id:
        raise ValueError("You can only enroll candidates in your own examinations.")
    if exam.status != ExamStatus.PUBLISHED:
        raise ValueError("Candidates can only be enrolled in published examinations.")

    # Verify candidate exists and is a CANDIDATE
    cand_result = await db.execute(select(User).where(User.id == candidate_id))
    candidate = cand_result.scalar_one_or_none()
    if not candidate or candidate.role != Role.CANDIDATE:
        raise ValueError("User not found or is not a candidate.")

    # Check duplicate
    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.examination_id == exam_id,
            Enrollment.candidate_id == candidate_id,
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("Candidate is already enrolled in this examination.")

    enrollment = Enrollment(examination_id=exam_id, candidate_id=candidate_id)
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)
    return enrollment


async def get_enrollments_for_exam(db: AsyncSession, exam_id: int) -> list[Enrollment]:
    result = await db.execute(
        select(Enrollment)
        .where(Enrollment.examination_id == exam_id)
        .options(selectinload(Enrollment.candidate))
    )
    return result.scalars().all()  # type: ignore[return-value]


# ── Candidate exam list ───────────────────────────────────────────────────────

async def get_candidate_exams(db: AsyncSession, candidate: User) -> list[dict]:
    enrollments = await db.execute(
        select(Enrollment)
        .where(Enrollment.candidate_id == candidate.id)
        .options(selectinload(Enrollment.examination), selectinload(Enrollment.attempt))
    )
    rows = enrollments.scalars().all()
    result = []
    for enrollment in rows:
        exam = enrollment.examination
        if exam.status != ExamStatus.PUBLISHED:
            continue
        attempt = enrollment.attempt
        if attempt is None:
            status = "NOT_STARTED"
            attempt_id = None
            started_at = None
            deadline_at = None
            submitted_at = None
        else:
            status = attempt.status.value
            attempt_id = attempt.id
            started_at = attempt.started_at
            deadline_at = attempt.deadline_at
            submitted_at = attempt.submitted_at
            # auto-expire check
            if attempt.status == AttemptStatus.IN_PROGRESS:
                now = datetime.now(timezone.utc)
                if now > attempt.deadline_at.replace(tzinfo=timezone.utc) if attempt.deadline_at.tzinfo is None else now > attempt.deadline_at:
                    status = AttemptStatus.EXPIRED.value

        result.append({
            "id": exam.id,
            "title": exam.title,
            "description": exam.description,
            "duration_minutes": exam.duration_minutes,
            "total_marks": exam.total_marks,
            "passing_marks": exam.passing_marks,
            "attempt_status": status,
            "attempt_id": attempt_id,
            "started_at": started_at,
            "deadline_at": deadline_at,
            "submitted_at": submitted_at,
        })
    return result


async def get_candidate_exam_detail(db: AsyncSession, candidate: User, exam_id: int) -> dict:
    enrollment_result = await db.execute(
        select(Enrollment)
        .where(Enrollment.candidate_id == candidate.id, Enrollment.examination_id == exam_id)
        .options(selectinload(Enrollment.examination), selectinload(Enrollment.attempt))
    )
    enrollment = enrollment_result.scalar_one_or_none()
    if not enrollment:
        raise ValueError("Examination not found or not enrolled.")
    exam = enrollment.examination
    if exam.status != ExamStatus.PUBLISHED:
        raise ValueError("Examination is not published.")

    attempt = enrollment.attempt
    status = "NOT_STARTED"
    attempt_id = None
    started_at = None
    deadline_at = None
    submitted_at = None
    if attempt:
        status = attempt.status.value
        attempt_id = attempt.id
        started_at = attempt.started_at
        deadline_at = attempt.deadline_at
        submitted_at = attempt.submitted_at

    return {
        "id": exam.id,
        "title": exam.title,
        "description": exam.description,
        "duration_minutes": exam.duration_minutes,
        "total_marks": exam.total_marks,
        "passing_marks": exam.passing_marks,
        "attempt_status": status,
        "attempt_id": attempt_id,
        "started_at": started_at,
        "deadline_at": deadline_at,
        "submitted_at": submitted_at,
    }


# ── Attempt ───────────────────────────────────────────────────────────────────

async def start_attempt(db: AsyncSession, candidate: User, exam_id: int) -> Attempt:
    # Check enrollment
    enrollment_result = await db.execute(
        select(Enrollment).where(
            Enrollment.candidate_id == candidate.id,
            Enrollment.examination_id == exam_id,
        )
    )
    enrollment = enrollment_result.scalar_one_or_none()
    if not enrollment:
        raise ValueError("You are not enrolled in this examination.")

    # Check exam is published
    exam_result = await db.execute(select(Examination).where(Examination.id == exam_id))
    exam = exam_result.scalar_one_or_none()
    if not exam or exam.status != ExamStatus.PUBLISHED:
        raise ValueError("Examination is not available.")

    # Check no existing attempt
    existing = await db.execute(
        select(Attempt).where(
            Attempt.candidate_id == candidate.id,
            Attempt.examination_id == exam_id,
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("You have already started this examination.")

    # Compute deadline
    now = datetime.now(timezone.utc)
    if exam.duration_minutes:
        deadline = now + timedelta(minutes=exam.duration_minutes)
    else:
        deadline = now + timedelta(hours=24)

    # Create attempt
    attempt = Attempt(
        examination_id=exam_id,
        candidate_id=candidate.id,
        enrollment_id=enrollment.id,
        started_at=now,
        deadline_at=deadline,
        status=AttemptStatus.IN_PROGRESS,
    )
    db.add(attempt)
    await db.flush()

    # Snapshot questions
    eq_result = await db.execute(
        select(ExamQuestion)
        .where(ExamQuestion.examination_id == exam_id)
        .options(
            selectinload(ExamQuestion.question).selectinload(Question.choices)
        )
        .order_by(ExamQuestion.order_index)
    )
    exam_questions = eq_result.scalars().all()

    for idx, eq in enumerate(exam_questions):
        q = eq.question
        aq = AttemptQuestion(
            attempt_id=attempt.id,
            original_question_id=q.id,
            question_text=q.text,
            question_type=q.question_type.value,
            marks=q.marks,
            display_order=idx,
        )
        db.add(aq)
        await db.flush()

        for c in q.choices:
            cs = ChoiceSnapshot(
                attempt_question_id=aq.id,
                original_choice_id=c.id,
                choice_text=c.text,
                is_correct=c.is_correct,
                display_order=c.order_index,
            )
            db.add(cs)

    await db.commit()
    result = await db.execute(
        select(Attempt).where(Attempt.id == attempt.id)
    )
    return result.scalar_one()


async def get_attempt(db: AsyncSession, candidate: User, attempt_id: int) -> dict:
    result = await db.execute(
        select(Attempt)
        .where(Attempt.id == attempt_id, Attempt.candidate_id == candidate.id)
        .options(
            selectinload(Attempt.attempt_questions).selectinload(AttemptQuestion.choice_snapshots),
            selectinload(Attempt.responses),
        )
    )
    attempt = result.scalar_one_or_none()
    if not attempt:
        raise ValueError("Attempt not found.")

    # Build responses map
    responses_map: dict[int, dict] = {}
    for resp in attempt.responses:
        responses_map[resp.attempt_question_id] = {
            "attempt_question_id": resp.attempt_question_id,
            "selected_choice_ids": resp.selected_choice_ids or [],
            "written_text": resp.written_text,
            "is_marked_for_review": resp.is_marked_for_review,
        }

    questions = []
    for aq in attempt.attempt_questions:
        # choices WITHOUT is_correct
        choices = [
            {
                "id": cs.id,
                "choice_text": cs.choice_text,
                "display_order": cs.display_order,
            }
            for cs in aq.choice_snapshots
        ]
        questions.append({
            "id": aq.id,
            "display_order": aq.display_order,
            "question_text": aq.question_text,
            "question_type": aq.question_type,
            "marks": aq.marks,
            "choices": choices,
        })

    return {
        "id": attempt.id,
        "exam_id": attempt.examination_id,
        "status": attempt.status,
        "started_at": attempt.started_at,
        "deadline_at": attempt.deadline_at,
        "submitted_at": attempt.submitted_at,
        "questions": questions,
        "responses": responses_map,
    }


async def save_response(
    db: AsyncSession,
    candidate: User,
    attempt_id: int,
    aq_id: int,
    data: SaveResponseRequest,
) -> Response:
    # Verify attempt ownership
    attempt_result = await db.execute(
        select(Attempt).where(Attempt.id == attempt_id, Attempt.candidate_id == candidate.id)
    )
    attempt = attempt_result.scalar_one_or_none()
    if not attempt:
        raise ValueError("Attempt not found.")
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise ValueError("This attempt is no longer active.")

    # Deadline check
    now = datetime.now(timezone.utc)
    dl = attempt.deadline_at
    if dl.tzinfo is None:
        dl = dl.replace(tzinfo=timezone.utc)
    if now > dl:
        attempt.status = AttemptStatus.EXPIRED
        await db.commit()
        raise ValueError("Examination deadline has passed.")

    # Verify question belongs to attempt and validate choice IDs
    aq_result = await db.execute(
        select(AttemptQuestion)
        .where(AttemptQuestion.id == aq_id, AttemptQuestion.attempt_id == attempt_id)
        .options(selectinload(AttemptQuestion.choice_snapshots))
    )
    aq = aq_result.scalar_one_or_none()
    if not aq:
        raise ValueError("Question not found in this attempt.")

    if data.selected_choice_ids:
        valid_ids = {cs.id for cs in aq.choice_snapshots}
        invalid = [cid for cid in data.selected_choice_ids if cid not in valid_ids]
        if invalid:
            raise ValueError(f"Invalid choice IDs: {invalid}")

    # Upsert response with version increment and optional OCC
    resp_result = await db.execute(
        select(Response).where(
            Response.attempt_id == attempt_id,
            Response.attempt_question_id == aq_id,
        )
    )
    resp = resp_result.scalar_one_or_none()
    if resp is None:
        resp = Response(
            attempt_id=attempt_id,
            attempt_question_id=aq_id,
            selected_choice_ids=data.selected_choice_ids,
            written_text=data.written_text,
            version=1,
        )
        db.add(resp)
    else:
        # Optimistic concurrency: if client sends a version and it doesn't match, reject
        if data.client_version is not None and data.client_version != resp.version:
            raise ValueError(f"Version conflict: expected {resp.version}, got {data.client_version}")
        resp.selected_choice_ids = data.selected_choice_ids
        resp.written_text = data.written_text
        resp.version = resp.version + 1

    await db.commit()
    await db.refresh(resp)
    return resp


async def toggle_review_flag(
    db: AsyncSession,
    candidate: User,
    attempt_id: int,
    aq_id: int,
    marked: bool,
) -> Response:
    attempt_result = await db.execute(
        select(Attempt).where(Attempt.id == attempt_id, Attempt.candidate_id == candidate.id)
    )
    attempt = attempt_result.scalar_one_or_none()
    if not attempt:
        raise ValueError("Attempt not found.")
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise ValueError("This attempt is no longer active.")

    aq_result = await db.execute(
        select(AttemptQuestion).where(
            AttemptQuestion.id == aq_id,
            AttemptQuestion.attempt_id == attempt_id,
        )
    )
    if not aq_result.scalar_one_or_none():
        raise ValueError("Question not found in this attempt.")

    resp_result = await db.execute(
        select(Response).where(
            Response.attempt_id == attempt_id,
            Response.attempt_question_id == aq_id,
        )
    )
    resp = resp_result.scalar_one_or_none()
    if resp is None:
        resp = Response(
            attempt_id=attempt_id,
            attempt_question_id=aq_id,
            selected_choice_ids=[],
            is_marked_for_review=marked,
        )
        db.add(resp)
    else:
        resp.is_marked_for_review = marked

    await db.commit()
    await db.refresh(resp)
    return resp


async def submit_attempt(db: AsyncSession, candidate: User, attempt_id: int) -> Attempt:
    attempt_result = await db.execute(
        select(Attempt).where(Attempt.id == attempt_id, Attempt.candidate_id == candidate.id)
        .options(selectinload(Attempt.attempt_questions), selectinload(Attempt.responses))
    )
    attempt = attempt_result.scalar_one_or_none()
    if not attempt:
        raise ValueError("Attempt not found.")

    # Idempotent: already submitted
    if attempt.status == AttemptStatus.SUBMITTED:
        return attempt

    if attempt.status == AttemptStatus.EXPIRED:
        raise ValueError("Attempt has expired.")

    now = datetime.now(timezone.utc)
    attempt.status = AttemptStatus.SUBMITTED
    attempt.submitted_at = now
    await db.commit()
    await db.refresh(attempt)

    # Auto-grade objective questions and initialize result
    from app.services.grading import auto_grade_attempt, _upsert_result
    await auto_grade_attempt(db, attempt.id)
    await _upsert_result(db, attempt)

    return attempt


# ── Stats helpers ─────────────────────────────────────────────────────────────

async def count_enrollments_for_examiner(db: AsyncSession, examiner_id) -> int:
    result = await db.execute(
        select(func.count(Enrollment.id))
        .join(Examination, Examination.id == Enrollment.examination_id)
        .where(Examination.creator_id == examiner_id)
    )
    return result.scalar_one()
