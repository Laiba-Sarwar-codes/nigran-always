"""Phase 7: Grading, result calculation, and publication."""
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.candidate import (
    Attempt, AttemptQuestion, AttemptStatus,
    ChoiceSnapshot, Response, Result,
    GradingStatus, ResultStatus, ResultPublicationStatus,
)
from app.models.exam import Examination
from app.models.user import User, Role, NotificationType
from app.services.notifications import create_notification, audit


# ── Auto-grading ──────────────────────────────────────────────────────────────

def _grade_single_choice(aq: AttemptQuestion, resp: Response | None) -> float:
    if not resp or not resp.selected_choice_ids:
        return 0.0
    correct_ids = {cs.id for cs in aq.choice_snapshots if cs.is_correct}
    selected = set(resp.selected_choice_ids)
    return float(aq.marks) if selected == correct_ids else 0.0


def _grade_multiple_choice(aq: AttemptQuestion, resp: Response | None) -> float:
    if not resp or not resp.selected_choice_ids:
        return 0.0
    correct_ids = {cs.id for cs in aq.choice_snapshots if cs.is_correct}
    selected = set(resp.selected_choice_ids)
    return float(aq.marks) if selected == correct_ids else 0.0


async def auto_grade_attempt(db: AsyncSession, attempt_id: int) -> None:
    """Called on submission. Grades all objective questions automatically."""
    result = await db.execute(
        select(Attempt)
        .where(Attempt.id == attempt_id)
        .options(
            selectinload(Attempt.attempt_questions).selectinload(AttemptQuestion.choice_snapshots),
            selectinload(Attempt.attempt_questions).selectinload(AttemptQuestion.response),
        )
    )
    attempt = result.scalar_one_or_none()
    if not attempt:
        return

    for aq in attempt.attempt_questions:
        resp = aq.response
        qtype = aq.question_type

        if qtype in ("SINGLE_CHOICE", "MULTIPLE_CHOICE"):
            if qtype == "SINGLE_CHOICE":
                marks = _grade_single_choice(aq, resp)
            else:
                marks = _grade_multiple_choice(aq, resp)

            if resp is None:
                resp = Response(
                    attempt_id=attempt_id,
                    attempt_question_id=aq.id,
                    selected_choice_ids=[],
                    awarded_marks=marks,
                    grading_status=GradingStatus.AUTO,
                )
                db.add(resp)
            else:
                resp.awarded_marks = marks
                resp.grading_status = GradingStatus.AUTO

        elif qtype == "WRITTEN":
            if resp is None:
                resp = Response(
                    attempt_id=attempt_id,
                    attempt_question_id=aq.id,
                    selected_choice_ids=[],
                    awarded_marks=None,
                    grading_status=GradingStatus.PENDING,
                )
                db.add(resp)
            else:
                resp.grading_status = GradingStatus.PENDING

    await db.commit()


# ── Result upsert ─────────────────────────────────────────────────────────────

async def _upsert_result(db: AsyncSession, attempt: Attempt) -> Result:
    """Recalculate and upsert the Result row for this attempt."""
    exam_res = await db.execute(select(Examination).where(Examination.id == attempt.examination_id))
    exam = exam_res.scalar_one()

    # Load all responses with their grading
    resp_res = await db.execute(
        select(Response)
        .join(AttemptQuestion, Response.attempt_question_id == AttemptQuestion.id)
        .where(Response.attempt_id == attempt.id)
    )
    responses = resp_res.scalars().all()

    # Load all attempt questions to get total marks
    aq_res = await db.execute(
        select(AttemptQuestion).where(AttemptQuestion.attempt_id == attempt.id)
    )
    aqs = aq_res.scalars().all()
    total_marks = float(sum(aq.marks for aq in aqs))

    obtained = sum(
        float(r.awarded_marks) for r in responses
        if r.awarded_marks is not None
    )
    obtained = max(0.0, min(obtained, total_marks))

    percentage = (obtained / total_marks * 100) if total_marks > 0 else 0.0
    passing = float(exam.passing_marks) if exam.passing_marks else None

    if passing is not None:
        result_status = ResultStatus.PASS if obtained >= passing else ResultStatus.FAIL
    else:
        result_status = None

    # Check if all written questions are graded
    all_graded = all(
        r.grading_status in (GradingStatus.AUTO, GradingStatus.GRADED)
        for r in responses
    )
    # Also check if there are unresponded written questions
    written_aq_ids = {aq.id for aq in aqs if aq.question_type == "WRITTEN"}
    responded_aq_ids = {r.attempt_question_id for r in responses}
    unresponded_written = written_aq_ids - responded_aq_ids
    all_graded = all_graded and not unresponded_written

    if all_graded:
        pub_status_on_grade = ResultPublicationStatus.GRADED
    else:
        pub_status_on_grade = ResultPublicationStatus.PENDING

    # Upsert
    existing = await db.execute(select(Result).where(Result.attempt_id == attempt.id))
    result_row = existing.scalar_one_or_none()

    if result_row is None:
        result_row = Result(
            attempt_id=attempt.id,
            candidate_id=attempt.candidate_id,
            examination_id=attempt.examination_id,
            total_marks=total_marks,
            obtained_marks=obtained,
            percentage=percentage,
            passing_marks=passing,
            result_status=result_status,
            publication_status=pub_status_on_grade,
        )
        db.add(result_row)
    else:
        result_row.total_marks = total_marks
        result_row.obtained_marks = obtained
        result_row.percentage = percentage
        result_row.passing_marks = passing
        result_row.result_status = result_status
        # Only advance pub status, never downgrade PUBLISHED to GRADED
        if result_row.publication_status != ResultPublicationStatus.PUBLISHED:
            result_row.publication_status = pub_status_on_grade

    await db.commit()
    await db.refresh(result_row)
    return result_row


# ── Examiner queries ──────────────────────────────────────────────────────────

async def get_exam_submissions(db: AsyncSession, examiner: User, exam_id: int) -> list[dict]:
    """List all submitted attempts for an examination the examiner owns."""
    exam_res = await db.execute(select(Examination).where(Examination.id == exam_id))
    exam = exam_res.scalar_one_or_none()
    if not exam:
        raise ValueError("Examination not found.")
    if examiner.role == Role.EXAMINER and exam.creator_id != examiner.id:
        raise ValueError("You do not own this examination.")

    attempts_res = await db.execute(
        select(Attempt)
        .where(
            Attempt.examination_id == exam_id,
            Attempt.status == AttemptStatus.SUBMITTED,
        )
        .options(selectinload(Attempt.responses))
    )
    attempts = attempts_res.scalars().all()

    # Load candidate users and results
    items = []
    for att in attempts:
        cand_res = await db.execute(select(User).where(User.id == att.candidate_id))
        cand = cand_res.scalar_one_or_none()

        result_res = await db.execute(select(Result).where(Result.attempt_id == att.id))
        result_row = result_res.scalar_one_or_none()

        # Count pending written
        pending_written = sum(
            1 for r in att.responses
            if r.grading_status == GradingStatus.PENDING
        )
        # Count unresponded written
        aq_res = await db.execute(
            select(AttemptQuestion).where(
                AttemptQuestion.attempt_id == att.id,
                AttemptQuestion.question_type == "WRITTEN",
            )
        )
        written_aqs = aq_res.scalars().all()
        responded_ids = {r.attempt_question_id for r in att.responses}
        pending_written += sum(1 for aq in written_aqs if aq.id not in responded_ids)

        pub_status = result_row.publication_status.value if result_row else "PENDING"

        items.append({
            "attempt_id": att.id,
            "candidate_id": str(att.candidate_id),
            "candidate_name": cand.full_name if cand else "Unknown",
            "submitted_at": att.submitted_at,
            "total_marks": float(result_row.total_marks) if result_row else None,
            "obtained_marks": float(result_row.obtained_marks) if result_row else None,
            "percentage": float(result_row.percentage) if result_row else None,
            "result_status": result_row.result_status.value if result_row and result_row.result_status else None,
            "publication_status": pub_status,
            "pending_written_count": pending_written,
        })

    return items


async def get_attempt_grading(db: AsyncSession, examiner: User, attempt_id: int) -> dict:
    """Full grading view of an attempt for the examiner."""
    att_res = await db.execute(
        select(Attempt)
        .where(Attempt.id == attempt_id, Attempt.status == AttemptStatus.SUBMITTED)
        .options(
            selectinload(Attempt.attempt_questions).selectinload(AttemptQuestion.choice_snapshots),
            selectinload(Attempt.attempt_questions).selectinload(AttemptQuestion.response),
        )
    )
    attempt = att_res.scalar_one_or_none()
    if not attempt:
        raise ValueError("Submitted attempt not found.")

    # Verify examiner owns the exam
    exam_res = await db.execute(select(Examination).where(Examination.id == attempt.examination_id))
    exam = exam_res.scalar_one_or_none()
    if examiner.role == Role.EXAMINER and exam.creator_id != examiner.id:
        raise ValueError("You do not own this examination.")

    cand_res = await db.execute(select(User).where(User.id == attempt.candidate_id))
    cand = cand_res.scalar_one_or_none()

    result_res = await db.execute(select(Result).where(Result.attempt_id == attempt_id))
    result_row = result_res.scalar_one_or_none()

    questions = []
    for aq in attempt.attempt_questions:
        resp = aq.response
        # For examiner: include is_correct in choices
        choices = [
            {
                "id": cs.id,
                "choice_text": cs.choice_text,
                "is_correct": cs.is_correct,
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
            "response": {
                "id": resp.id if resp else None,
                "selected_choice_ids": resp.selected_choice_ids if resp else [],
                "written_text": resp.written_text if resp else None,
                "awarded_marks": float(resp.awarded_marks) if resp and resp.awarded_marks is not None else None,
                "grading_status": resp.grading_status.value if resp and resp.grading_status else None,
                "examiner_feedback": resp.examiner_feedback if resp else None,
            } if resp else None,
        })

    return {
        "attempt_id": attempt.id,
        "exam_id": attempt.examination_id,
        "exam_title": exam.title if exam else "",
        "candidate_id": str(attempt.candidate_id),
        "candidate_name": cand.full_name if cand else "Unknown",
        "submitted_at": attempt.submitted_at,
        "questions": questions,
        "result": {
            "total_marks": float(result_row.total_marks),
            "obtained_marks": float(result_row.obtained_marks),
            "percentage": float(result_row.percentage),
            "result_status": result_row.result_status.value if result_row.result_status else None,
            "publication_status": result_row.publication_status.value,
        } if result_row else None,
    }


async def grade_response(
    db: AsyncSession,
    examiner: User,
    attempt_id: int,
    response_id: int,
    awarded_marks: float,
    feedback: str | None,
) -> Response:
    """Manually grade a written response."""
    att_res = await db.execute(
        select(Attempt).where(Attempt.id == attempt_id, Attempt.status == AttemptStatus.SUBMITTED)
    )
    attempt = att_res.scalar_one_or_none()
    if not attempt:
        raise ValueError("Submitted attempt not found.")

    exam_res = await db.execute(select(Examination).where(Examination.id == attempt.examination_id))
    exam = exam_res.scalar_one_or_none()
    if examiner.role == Role.EXAMINER and exam.creator_id != examiner.id:
        raise ValueError("You do not own this examination.")

    resp_res = await db.execute(
        select(Response)
        .where(Response.id == response_id, Response.attempt_id == attempt_id)
        .options(selectinload(Response.attempt_question))
    )
    resp = resp_res.scalar_one_or_none()
    if not resp:
        raise ValueError("Response not found.")

    if resp.attempt_question.question_type != "WRITTEN":
        raise ValueError("Only written responses can be manually graded.")

    max_marks = resp.attempt_question.marks
    if awarded_marks < 0:
        raise ValueError("Marks cannot be negative.")
    if awarded_marks > max_marks:
        raise ValueError(f"Marks cannot exceed maximum ({max_marks}).")

    resp.awarded_marks = awarded_marks
    resp.examiner_feedback = feedback
    resp.grading_status = GradingStatus.GRADED
    resp.graded_by_id = examiner.id
    resp.graded_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(resp)

    # Recalculate result
    await _upsert_result(db, attempt)

    return resp


async def finalize_grading(db: AsyncSession, examiner: User, attempt_id: int) -> Result:
    """Finalize grading — all written questions must be graded first."""
    att_res = await db.execute(
        select(Attempt)
        .where(Attempt.id == attempt_id, Attempt.status == AttemptStatus.SUBMITTED)
        .options(
            selectinload(Attempt.attempt_questions),
            selectinload(Attempt.responses),
        )
    )
    attempt = att_res.scalar_one_or_none()
    if not attempt:
        raise ValueError("Submitted attempt not found.")

    exam_res = await db.execute(select(Examination).where(Examination.id == attempt.examination_id))
    exam = exam_res.scalar_one_or_none()
    if examiner.role == Role.EXAMINER and exam.creator_id != examiner.id:
        raise ValueError("You do not own this examination.")

    # Check all written questions are graded
    written_aq_ids = {aq.id for aq in attempt.attempt_questions if aq.question_type == "WRITTEN"}
    responded_map = {r.attempt_question_id: r for r in attempt.responses}

    for aq_id in written_aq_ids:
        resp = responded_map.get(aq_id)
        if resp is None or resp.grading_status != GradingStatus.GRADED:
            raise ValueError("All written responses must be graded before finalizing.")

    result_row = await _upsert_result(db, attempt)

    if result_row.publication_status == ResultPublicationStatus.PENDING:
        result_row.publication_status = ResultPublicationStatus.GRADED
        await db.commit()
        await db.refresh(result_row)

    return result_row


async def publish_result(db: AsyncSession, examiner: User, attempt_id: int) -> Result:
    """Publish a finalized result."""
    att_res = await db.execute(select(Attempt).where(Attempt.id == attempt_id))
    attempt = att_res.scalar_one_or_none()
    if not attempt:
        raise ValueError("Attempt not found.")

    exam_res = await db.execute(select(Examination).where(Examination.id == attempt.examination_id))
    exam = exam_res.scalar_one_or_none()
    if examiner.role == Role.EXAMINER and exam.creator_id != examiner.id:
        raise ValueError("You do not own this examination.")

    result_res = await db.execute(select(Result).where(Result.attempt_id == attempt_id))
    result_row = result_res.scalar_one_or_none()
    if not result_row:
        raise ValueError("No result record found.")
    if result_row.publication_status == ResultPublicationStatus.PENDING:
        raise ValueError("Grading must be finalized before publishing.")
    if result_row.publication_status == ResultPublicationStatus.PUBLISHED:
        return result_row  # idempotent

    result_row.publication_status = ResultPublicationStatus.PUBLISHED
    result_row.published_at = datetime.now(timezone.utc)
    result_row.published_by_id = examiner.id
    await db.flush()

    # Notify candidate
    await create_notification(
        db, attempt.candidate_id,
        title="Your result is available",
        message=f"Your result for '{exam.title}' has been published. View it now.",
        notification_type=NotificationType.RESULT_PUBLISHED,
        related_entity_id=str(result_row.id),
        related_entity_type="result",
    )
    await audit(db, examiner.id, "PUBLISH_RESULT", "result", str(result_row.id))

    await db.commit()
    await db.refresh(result_row)
    return result_row


async def get_exam_results(db: AsyncSession, examiner: User, exam_id: int) -> list[dict]:
    """List all results for an examination."""
    exam_res = await db.execute(select(Examination).where(Examination.id == exam_id))
    exam = exam_res.scalar_one_or_none()
    if not exam:
        raise ValueError("Examination not found.")
    if examiner.role == Role.EXAMINER and exam.creator_id != examiner.id:
        raise ValueError("You do not own this examination.")

    results_res = await db.execute(
        select(Result).where(Result.examination_id == exam_id)
    )
    results = results_res.scalars().all()

    items = []
    for r in results:
        cand_res = await db.execute(select(User).where(User.id == r.candidate_id))
        cand = cand_res.scalar_one_or_none()
        items.append({
            "result_id": r.id,
            "attempt_id": r.attempt_id,
            "candidate_id": str(r.candidate_id),
            "candidate_name": cand.full_name if cand else "Unknown",
            "total_marks": float(r.total_marks),
            "obtained_marks": float(r.obtained_marks),
            "percentage": float(r.percentage),
            "result_status": r.result_status.value if r.result_status else None,
            "publication_status": r.publication_status.value,
            "published_at": r.published_at,
        })
    return items


# ── Candidate results ─────────────────────────────────────────────────────────

async def get_candidate_results(db: AsyncSession, candidate: User) -> list[dict]:
    results_res = await db.execute(
        select(Result).where(
            Result.candidate_id == candidate.id,
            Result.publication_status == ResultPublicationStatus.PUBLISHED,
        )
    )
    results = results_res.scalars().all()

    items = []
    for r in results:
        exam_res = await db.execute(select(Examination).where(Examination.id == r.examination_id))
        exam = exam_res.scalar_one_or_none()
        items.append({
            "result_id": r.id,
            "exam_id": r.examination_id,
            "exam_title": exam.title if exam else "Unknown",
            "total_marks": float(r.total_marks),
            "obtained_marks": float(r.obtained_marks),
            "percentage": float(r.percentage),
            "result_status": r.result_status.value if r.result_status else None,
            "published_at": r.published_at,
        })
    return items


async def get_candidate_result_detail(db: AsyncSession, candidate: User, result_id: int) -> dict:
    result_res = await db.execute(
        select(Result).where(
            Result.id == result_id,
            Result.candidate_id == candidate.id,
            Result.publication_status == ResultPublicationStatus.PUBLISHED,
        )
    )
    result_row = result_res.scalar_one_or_none()
    if not result_row:
        raise ValueError("Result not found or not yet published.")

    exam_res = await db.execute(select(Examination).where(Examination.id == result_row.examination_id))
    exam = exam_res.scalar_one_or_none()

    att_res = await db.execute(
        select(Attempt)
        .where(Attempt.id == result_row.attempt_id)
        .options(
            selectinload(Attempt.attempt_questions),
            selectinload(Attempt.responses),
        )
    )
    attempt = att_res.scalar_one_or_none()

    questions_summary = []
    if attempt:
        resp_map = {r.attempt_question_id: r for r in attempt.responses}
        for aq in attempt.attempt_questions:
            resp = resp_map.get(aq.id)
            entry = {
                "question_text": aq.question_text,
                "question_type": aq.question_type,
                "marks": aq.marks,
                "awarded_marks": float(resp.awarded_marks) if resp and resp.awarded_marks is not None else 0.0,
            }
            if aq.question_type == "WRITTEN" and resp:
                entry["examiner_feedback"] = resp.examiner_feedback
            questions_summary.append(entry)

    return {
        "result_id": result_row.id,
        "exam_id": result_row.examination_id,
        "exam_title": exam.title if exam else "Unknown",
        "total_marks": float(result_row.total_marks),
        "obtained_marks": float(result_row.obtained_marks),
        "percentage": float(result_row.percentage),
        "passing_marks": float(result_row.passing_marks) if result_row.passing_marks else None,
        "result_status": result_row.result_status.value if result_row.result_status else None,
        "published_at": result_row.published_at,
        "questions": questions_summary,
    }
