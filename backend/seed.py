"""
Development seed script — safe to re-run (idempotent).
Seeds demo users, examinations, questions, enrollments, and attempts.
Never overwrites existing passwords or drops data.
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User, Role, AuditLog
from app.models.exam import Question, QuestionType, Examination, ExamStatus, ExamQuestion, Choice
from app.models.candidate import Enrollment, Attempt, AttemptStatus, Response, GradingStatus, Result, ResultStatus, ResultPublicationStatus
from app.db.engine import Base
import uuid
from datetime import datetime, timezone, timedelta

engine = create_async_engine(settings.database_url, echo=False)
Session = async_sessionmaker(engine, expire_on_commit=False)

DEMO_TAG = "[DEMO]"


async def get_or_create_user(session, email, full_name, role, password="Demo@1234"):
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user:
        print(f"  EXISTS  {role.value:10} {email}")
        return user, False
    user = User(
        id=uuid.uuid4(),
        full_name=full_name,
        email=email,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
        is_verified=True,
    )
    session.add(user)
    print(f"  CREATED {role.value:10} {email}  password={password}")
    return user, True


async def seed():
    async with Session() as session:
        async with session.begin():
            print("\n── Users ────────────────────────────────")
            admin, _ = await get_or_create_user(session, "admin@nigran360.dev", "System Administrator", Role.ADMIN, "Admin@1234")
            examiner1, _ = await get_or_create_user(session, "examiner1@nigran360.dev", f"{DEMO_TAG} Dr. Ayesha Khan", Role.EXAMINER, "Exam@1234")
            examiner2, _ = await get_or_create_user(session, "examiner2@nigran360.dev", f"{DEMO_TAG} Prof. Bilal Raza", Role.EXAMINER, "Exam@1234")
            candidates = []
            demo_students = [
                ("student1@nigran360.dev", f"{DEMO_TAG} Sara Ahmed"),
                ("student2@nigran360.dev", f"{DEMO_TAG} Ali Hassan"),
                ("student3@nigran360.dev", f"{DEMO_TAG} Zara Malik"),
                ("student4@nigran360.dev", f"{DEMO_TAG} Umar Farooq"),
            ]
            for email, name in demo_students:
                c, _ = await get_or_create_user(session, email, name, Role.CANDIDATE, "Student@1234")
                candidates.append(c)

            # Also enroll any existing real candidate accounts (e.g. laibasarwar498@gmail.com)
            existing_candidates_q = await session.execute(
                select(User).where(
                    User.role == Role.CANDIDATE,
                    User.email.not_in([s[0] for s in demo_students]),
                    User.email.not_like('%@nigrani.local'),
                )
            )
            for real_user in existing_candidates_q.scalars().all():
                if real_user not in candidates:
                    candidates.append(real_user)
                    print(f"  ADDED   existing candidate: {real_user.email}")

            await session.flush()

            print("\n── Questions ────────────────────────────")
            # Check if questions already exist for examiner1
            q_count = (await session.execute(
                select(Question).where(Question.creator_id == examiner1.id)
            )).scalars().all()

            if not q_count:
                questions_data = [
                    # Mathematics
                    (QuestionType.SINGLE_CHOICE, "What is the value of π (pi) to 2 decimal places?", 2,
                     [("3.14", True), ("3.41", False), ("2.71", False), ("1.41", False)]),
                    (QuestionType.MULTIPLE_CHOICE, "Which of the following are prime numbers?", 3,
                     [("2", True), ("3", True), ("4", False), ("7", True), ("9", False)]),
                    (QuestionType.SINGLE_CHOICE, "Solve: 15 × 4 − 20 ÷ 5", 2,
                     [("56", True), ("52", False), ("60", False), ("48", False)]),
                    (QuestionType.WRITTEN, "Explain the Pythagorean theorem and give a real-world example.", 5, []),
                    # Science
                    (QuestionType.SINGLE_CHOICE, "What is the chemical symbol for gold?", 1,
                     [("Au", True), ("Ag", False), ("Fe", False), ("Go", False)]),
                    (QuestionType.SINGLE_CHOICE, "Which planet is known as the Red Planet?", 1,
                     [("Mars", True), ("Venus", False), ("Jupiter", False), ("Saturn", False)]),
                    (QuestionType.MULTIPLE_CHOICE, "Which of the following are noble gases?", 3,
                     [("Helium", True), ("Neon", True), ("Oxygen", False), ("Argon", True), ("Nitrogen", False)]),
                    (QuestionType.WRITTEN, "Describe the water cycle and its importance to life on Earth.", 5, []),
                    # English
                    (QuestionType.SINGLE_CHOICE, "Which word is a synonym for 'benevolent'?", 1,
                     [("Kind", True), ("Cruel", False), ("Angry", False), ("Lazy", False)]),
                    (QuestionType.WRITTEN, "Write a short paragraph (5–7 sentences) describing your ideal examination environment.", 4, []),
                ]

                created_questions = []
                for qtype, text, marks, choices in questions_data:
                    q = Question(creator_id=examiner1.id, question_type=qtype, text=text, marks=marks)
                    session.add(q)
                    await session.flush()
                    for choice_text, is_correct in choices:
                        c = Choice(question_id=q.id, text=choice_text, is_correct=is_correct)
                        session.add(c)
                    created_questions.append(q)
                    print(f"  CREATED question: {text[:55]}…")
                await session.flush()
            else:
                created_questions = q_count
                print(f"  EXISTS  {len(created_questions)} questions for examiner1")

            print("\n── Examinations ─────────────────────────")
            # Check existing exams
            existing_exams = (await session.execute(
                select(Examination).where(Examination.creator_id == examiner1.id)
            )).scalars().all()

            exams_to_enroll = []
            if not existing_exams:
                exam_defs = [
                    ("Mathematics Fundamentals", "Core mathematics assessment covering arithmetic and geometry.", 45, ExamStatus.PUBLISHED),
                    ("General Science", "Basic science concepts across chemistry, physics, and biology.", 60, ExamStatus.PUBLISHED),
                    ("English Proficiency", "Grammar, vocabulary, and written expression.", 30, ExamStatus.DRAFT),
                ]
                for title, desc, duration, status in exam_defs:
                    exam = Examination(
                        title=f"{DEMO_TAG} {title}",
                        description=desc,
                        creator_id=examiner1.id,
                        duration_minutes=duration,
                        status=status,
                        passing_marks=0,
                    )
                    session.add(exam)
                    await session.flush()
                    # Attach questions
                    q_subset = created_questions[:min(5, len(created_questions))]
                    for order, q in enumerate(q_subset, 1):
                        eq = ExamQuestion(examination_id=exam.id, question_id=q.id, order_index=order)
                        session.add(eq)
                    # Recalculate total_marks
                    exam.total_marks = sum(q.marks for q in q_subset)
                    exam.passing_marks = exam.total_marks // 2
                    exams_to_enroll.append(exam)
                    print(f"  CREATED exam: {title} ({status.value})")
                await session.flush()
            else:
                exams_to_enroll = existing_exams
                print(f"  EXISTS  {len(existing_exams)} exams for examiner1")

            print("\n── Enrollments & Attempts ───────────────")
            from app.models.candidate import AttemptQuestion, ChoiceSnapshot
            published_exams = [e for e in exams_to_enroll if e.status == ExamStatus.PUBLISHED]
            now = datetime.now(timezone.utc)
            for exam in published_exams:
                for idx, candidate in enumerate(candidates):
                    existing = (await session.execute(
                        select(Enrollment).where(
                            Enrollment.examination_id == exam.id,
                            Enrollment.candidate_id == candidate.id,
                        )
                    )).scalar_one_or_none()
                    if existing:
                        print(f"  EXISTS  enrollment {candidate.full_name[:20]} → {exam.title[:30]}")
                        continue
                    enrollment = Enrollment(examination_id=exam.id, candidate_id=candidate.id)
                    session.add(enrollment)
                    await session.flush()
                    print(f"  CREATED enrollment {candidate.full_name[:20]} → {exam.title[:30]}")

                    # Create a submitted attempt for first 2 candidates
                    if idx < 2:
                        attempt = Attempt(
                            examination_id=exam.id,
                            candidate_id=candidate.id,
                            enrollment_id=enrollment.id,
                            status=AttemptStatus.SUBMITTED,
                            started_at=now - timedelta(hours=2),
                            deadline_at=now + timedelta(hours=1),
                            submitted_at=now - timedelta(hours=1),
                        )
                        session.add(attempt)
                        await session.flush()

                        # Build attempt_questions (snapshots of questions)
                        eq_rows = (await session.execute(
                            select(ExamQuestion).where(ExamQuestion.examination_id == exam.id)
                        )).scalars().all()

                        total_obtained = 0
                        total_possible = 0
                        for order_i, eq in enumerate(eq_rows):
                            q_obj = (await session.execute(
                                select(Question).where(Question.id == eq.question_id)
                            )).scalar_one_or_none()
                            if not q_obj:
                                continue
                            total_possible += q_obj.marks
                            aq = AttemptQuestion(
                                attempt_id=attempt.id,
                                original_question_id=q_obj.id,
                                question_text=q_obj.text,
                                question_type=q_obj.question_type.value,
                                marks=q_obj.marks,
                                display_order=order_i,
                            )
                            session.add(aq)
                            await session.flush()

                            # Snapshots of choices
                            choices = (await session.execute(
                                select(Choice).where(Choice.question_id == q_obj.id)
                            )).scalars().all()
                            for ci, ch in enumerate(choices):
                                cs = ChoiceSnapshot(
                                    attempt_question_id=aq.id,
                                    original_choice_id=ch.id,
                                    choice_text=ch.text,
                                    is_correct=ch.is_correct,
                                    display_order=ci,
                                )
                                session.add(cs)
                            await session.flush()

                            # Create response
                            if q_obj.question_type == QuestionType.WRITTEN:
                                resp = Response(
                                    attempt_id=attempt.id,
                                    attempt_question_id=aq.id,
                                    selected_choice_ids=[],
                                    written_text="This is a demo written answer for the question.",
                                    grading_status=GradingStatus.PENDING,
                                    awarded_marks=None,
                                )
                            else:
                                correct = (await session.execute(
                                    select(ChoiceSnapshot).where(
                                        ChoiceSnapshot.attempt_question_id == aq.id,
                                        ChoiceSnapshot.is_correct.is_(True),
                                    )
                                )).scalars().first()
                                awarded = float(q_obj.marks) if correct else 0.0
                                total_obtained += awarded
                                resp = Response(
                                    attempt_id=attempt.id,
                                    attempt_question_id=aq.id,
                                    selected_choice_ids=[correct.original_choice_id] if correct else [],
                                    grading_status=GradingStatus.AUTO,
                                    awarded_marks=awarded,
                                )
                            session.add(resp)
                        await session.flush()

                        pct = round((total_obtained / total_possible * 100), 4) if total_possible else 0
                        result = Result(
                            examination_id=exam.id,
                            candidate_id=candidate.id,
                            attempt_id=attempt.id,
                            obtained_marks=total_obtained,
                            total_marks=total_possible,
                            percentage=pct,
                            passing_marks=exam.passing_marks,
                            result_status=ResultStatus.PASS if pct >= 50 else ResultStatus.FAIL,
                            publication_status=ResultPublicationStatus.PUBLISHED,
                            published_at=now,
                        )
                        session.add(result)
                        print(f"  CREATED result  {candidate.full_name[:20]}: {total_obtained}/{total_possible} ({pct}%)")

            await session.flush()
            print("\n── Seed complete ────────────────────────")
            print("  Admin:     admin@nigran360.dev         / Admin@1234")
            print("  Examiner1: examiner1@nigran360.dev     / Exam@1234")
            print("  Examiner2: examiner2@nigran360.dev     / Exam@1234")
            print("  Students:  student1-4@nigran360.dev    / Student@1234")
            print()


if __name__ == "__main__":
    asyncio.run(seed())
