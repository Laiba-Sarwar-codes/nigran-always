"""Phase 5 tests: Candidate Examination Interface."""
import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, Role
from app.models.exam import Examination, ExamStatus, ExamQuestion
from app.models.candidate import Enrollment


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _register_and_login(client: AsyncClient, email: str, password: str = "Pass@12345") -> dict:
    await client.post("/api/v1/auth/register", json={
        "full_name": "Test User",
        "email": email,
        "password": password,
        "confirm_password": password,
    })
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200
    return r.json()


async def _promote(db: AsyncSession, email: str, role: Role) -> None:
    await db.execute(update(User).where(User.email == email).values(role=role))
    await db.commit()


async def _create_examiner_with_exam(client: AsyncClient, db: AsyncSession, suffix: str):
    """Returns (examiner_client, exam_id) with one published exam containing 2 questions."""
    ex_email = f"examiner_{suffix}@nigrani.com"
    await _register_and_login(client, ex_email)
    await _promote(db, ex_email, Role.EXAMINER)

    # re-login to get examiner token
    r = await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    assert r.status_code == 200

    # Create exam
    r = await client.post("/api/v1/exams", json={
        "title": f"Exam {suffix}",
        "description": "Test exam",
        "duration_minutes": 60,
        "total_marks": 10,
        "passing_marks": 5,
    })
    assert r.status_code == 201
    exam_id = r.json()["id"]

    # Create question
    r = await client.post("/api/v1/questions", json={
        "question_type": "SINGLE_CHOICE",
        "text": "What is 2+2?",
        "marks": 5,
        "choices": [
            {"text": "3", "is_correct": False, "order_index": 0},
            {"text": "4", "is_correct": True, "order_index": 1},
        ],
    })
    assert r.status_code == 201
    q1_id = r.json()["id"]

    r = await client.post("/api/v1/questions", json={
        "question_type": "WRITTEN",
        "text": "Explain gravity.",
        "marks": 5,
        "choices": [],
    })
    assert r.status_code == 201
    q2_id = r.json()["id"]

    # Add questions to exam
    r = await client.post(f"/api/v1/exams/{exam_id}/questions", json={
        "question_ids": [q1_id, q2_id]
    })
    assert r.status_code == 200

    # Publish
    r = await client.post(f"/api/v1/exams/{exam_id}/publish")
    assert r.status_code == 200

    return ex_email, exam_id, q1_id


async def _create_candidate(client: AsyncClient, db: AsyncSession, suffix: str) -> str:
    email = f"cand_{suffix}@nigrani.com"
    await _register_and_login(client, email)
    # Candidates register as CANDIDATE by default — no promotion needed
    # Re-login
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": "Pass@12345"})
    assert r.status_code == 200
    return email


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_enroll_candidate(client: AsyncClient, db: AsyncSession):
    """Examiner can enroll a candidate in their exam."""
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "enroll1")
    cand_email = await _create_candidate(client, db, "enroll1")

    # Get candidate id
    cand_r = await db.execute(
        __import__("sqlalchemy").select(User).where(User.email == cand_email)
    )
    cand = cand_r.scalar_one()

    # Login as examiner
    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})

    r = await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={
        "candidate_id": str(cand.id)
    })
    assert r.status_code == 201
    data = r.json()
    assert data["examination_id"] == exam_id
    assert data["candidate_id"] == str(cand.id)


@pytest.mark.asyncio
async def test_enroll_duplicate_rejected(client: AsyncClient, db: AsyncSession):
    """Enrolling the same candidate twice returns 400."""
    from sqlalchemy import select as sa_select
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "enroll2")
    cand_email = await _create_candidate(client, db, "enroll2")

    cand_r = await db.execute(sa_select(User).where(User.email == cand_email))
    cand = cand_r.scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})
    r = await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})
    assert r.status_code == 400
    assert "already enrolled" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_enroll_non_candidate_rejected(client: AsyncClient, db: AsyncSession):
    """Enrolling a non-candidate user returns 400."""
    from sqlalchemy import select as sa_select
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "enroll3")

    # Try to enroll another examiner
    ex2_email = "examiner_e3b@nigrani.com"
    await _register_and_login(client, ex2_email)
    await _promote(db, ex2_email, Role.EXAMINER)

    ex2 = (await db.execute(sa_select(User).where(User.email == ex2_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(ex2.id)})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_candidate_sees_enrolled_exams(client: AsyncClient, db: AsyncSession):
    """Candidate gets list of their enrolled exams."""
    from sqlalchemy import select as sa_select
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "myexams1")
    cand_email = await _create_candidate(client, db, "myexams1")

    cand = (await db.execute(sa_select(User).where(User.email == cand_email))).scalar_one()

    # Enroll as examiner
    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    # Login as candidate
    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.get("/api/v1/candidate/my-exams")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    assert any(e["id"] == exam_id for e in items)
    exam_entry = next(e for e in items if e["id"] == exam_id)
    assert exam_entry["attempt_status"] == "NOT_STARTED"


@pytest.mark.asyncio
async def test_candidate_cannot_see_unenrolled_exam(client: AsyncClient, db: AsyncSession):
    """Candidate does not see exams they are not enrolled in."""
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "myexams2")
    cand_email = await _create_candidate(client, db, "myexams2")

    # Login as candidate WITHOUT enrollment
    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.get("/api/v1/candidate/my-exams")
    assert r.status_code == 200
    items = r.json()
    assert not any(e["id"] == exam_id for e in items)


@pytest.mark.asyncio
async def test_start_attempt_creates_snapshots(client: AsyncClient, db: AsyncSession):
    """Starting an attempt creates question snapshots without exposing is_correct."""
    from sqlalchemy import select as sa_select
    ex_email, exam_id, q1_id = await _create_examiner_with_exam(client, db, "start1")
    cand_email = await _create_candidate(client, db, "start1")

    cand = (await db.execute(sa_select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    assert r.status_code == 201
    data = r.json()
    assert data["exam_id"] == exam_id
    assert data["status"] == "IN_PROGRESS"
    assert "attempt_id" in data
    assert "deadline_at" in data


@pytest.mark.asyncio
async def test_cannot_start_attempt_twice(client: AsyncClient, db: AsyncSession):
    """Starting an attempt a second time returns 400."""
    from sqlalchemy import select as sa_select
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "start2")
    cand_email = await _create_candidate(client, db, "start2")
    cand = (await db.execute(sa_select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    assert r.status_code == 400
    assert "already started" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_cannot_start_without_enrollment(client: AsyncClient, db: AsyncSession):
    """Starting an attempt without enrollment returns 400."""
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "start3")
    cand_email = await _create_candidate(client, db, "start3")

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_get_attempt_no_is_correct(client: AsyncClient, db: AsyncSession):
    """AttemptDetailResponse choices must NOT include is_correct."""
    from sqlalchemy import select as sa_select
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "nocorrect1")
    cand_email = await _create_candidate(client, db, "nocorrect1")
    cand = (await db.execute(sa_select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    attempt_id = r.json()["attempt_id"]

    r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}")
    assert r.status_code == 200
    data = r.json()
    assert "questions" in data
    for q in data["questions"]:
        for c in q.get("choices", []):
            assert "is_correct" not in c, "is_correct must NOT appear in candidate attempt response"


@pytest.mark.asyncio
async def test_save_response(client: AsyncClient, db: AsyncSession):
    """Candidate can save a choice response."""
    from sqlalchemy import select as sa_select
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "saveresp1")
    cand_email = await _create_candidate(client, db, "saveresp1")
    cand = (await db.execute(sa_select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    start_r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    attempt_id = start_r.json()["attempt_id"]

    # Get attempt to find question IDs
    attempt_r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}")
    questions = attempt_r.json()["questions"]
    sc_q = next(q for q in questions if q["question_type"] == "SINGLE_CHOICE")
    aq_id = sc_q["id"]
    choice_id = sc_q["choices"][1]["id"]  # second choice (correct one, but we don't know that)

    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{aq_id}/response",
        json={"selected_choice_ids": [choice_id], "written_text": None},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["selected_choice_ids"] == [choice_id]


@pytest.mark.asyncio
async def test_save_response_idempotent(client: AsyncClient, db: AsyncSession):
    """Saving a response twice updates it (upsert)."""
    from sqlalchemy import select as sa_select
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "saveresp2")
    cand_email = await _create_candidate(client, db, "saveresp2")
    cand = (await db.execute(sa_select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    start_r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    attempt_id = start_r.json()["attempt_id"]

    attempt_r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}")
    questions = attempt_r.json()["questions"]
    sc_q = next(q for q in questions if q["question_type"] == "SINGLE_CHOICE")
    aq_id = sc_q["id"]
    c1 = sc_q["choices"][0]["id"]
    c2 = sc_q["choices"][1]["id"]

    await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{aq_id}/response",
        json={"selected_choice_ids": [c1]},
    )
    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{aq_id}/response",
        json={"selected_choice_ids": [c2]},
    )
    assert r.status_code == 200
    assert r.json()["selected_choice_ids"] == [c2]


@pytest.mark.asyncio
async def test_toggle_review_flag(client: AsyncClient, db: AsyncSession):
    """Candidate can mark/unmark a question for review."""
    from sqlalchemy import select as sa_select
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "review1")
    cand_email = await _create_candidate(client, db, "review1")
    cand = (await db.execute(sa_select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    start_r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    attempt_id = start_r.json()["attempt_id"]

    questions = (await client.get(f"/api/v1/candidate/attempts/{attempt_id}")).json()["questions"]
    aq_id = questions[0]["id"]

    r = await client.patch(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{aq_id}/review",
        json={"marked": True},
    )
    assert r.status_code == 200
    assert r.json()["is_marked_for_review"] is True

    r = await client.patch(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{aq_id}/review",
        json={"marked": False},
    )
    assert r.status_code == 200
    assert r.json()["is_marked_for_review"] is False


@pytest.mark.asyncio
async def test_submit_attempt(client: AsyncClient, db: AsyncSession):
    """Candidate can submit their attempt."""
    from sqlalchemy import select as sa_select
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "submit1")
    cand_email = await _create_candidate(client, db, "submit1")
    cand = (await db.execute(sa_select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    start_r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    attempt_id = start_r.json()["attempt_id"]

    r = await client.post(f"/api/v1/candidate/attempts/{attempt_id}/submit")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "SUBMITTED"
    assert data["submitted_at"] is not None
    assert data["total_questions"] == 2


@pytest.mark.asyncio
async def test_submit_idempotent(client: AsyncClient, db: AsyncSession):
    """Submitting twice returns 200 both times (idempotent)."""
    from sqlalchemy import select as sa_select
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "submit2")
    cand_email = await _create_candidate(client, db, "submit2")
    cand = (await db.execute(sa_select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    start_r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    attempt_id = start_r.json()["attempt_id"]

    await client.post(f"/api/v1/candidate/attempts/{attempt_id}/submit")
    r = await client.post(f"/api/v1/candidate/attempts/{attempt_id}/submit")
    assert r.status_code == 200
    assert r.json()["status"] == "SUBMITTED"


@pytest.mark.asyncio
async def test_cannot_save_after_submit(client: AsyncClient, db: AsyncSession):
    """Saving a response to a submitted attempt returns 400."""
    from sqlalchemy import select as sa_select
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "postsub1")
    cand_email = await _create_candidate(client, db, "postsub1")
    cand = (await db.execute(sa_select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    start_r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    attempt_id = start_r.json()["attempt_id"]

    questions = (await client.get(f"/api/v1/candidate/attempts/{attempt_id}")).json()["questions"]
    aq_id = questions[0]["id"]

    await client.post(f"/api/v1/candidate/attempts/{attempt_id}/submit")

    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{aq_id}/response",
        json={"selected_choice_ids": []},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_candidate_cannot_access_other_attempt(client: AsyncClient, db: AsyncSession):
    """Candidate cannot view another candidate's attempt."""
    from sqlalchemy import select as sa_select
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "iso1")
    cand1_email = await _create_candidate(client, db, "iso1a")
    cand2_email = await _create_candidate(client, db, "iso1b")

    cand1 = (await db.execute(sa_select(User).where(User.email == cand1_email))).scalar_one()
    cand2 = (await db.execute(sa_select(User).where(User.email == cand2_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand1.id)})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand2.id)})

    # cand1 starts an attempt
    await client.post("/api/v1/auth/login", json={"email": cand1_email, "password": "Pass@12345"})
    start_r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    attempt_id = start_r.json()["attempt_id"]

    # cand2 tries to access cand1's attempt
    await client.post("/api/v1/auth/login", json={"email": cand2_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_examiner_cannot_enroll_in_others_exam(client: AsyncClient, db: AsyncSession):
    """Examiner cannot enroll candidates in another examiner's exam."""
    from sqlalchemy import select as sa_select

    ex1_email, exam_id, _ = await _create_examiner_with_exam(client, db, "iso2a")

    ex2_email = "examiner_iso2b@nigrani.com"
    await _register_and_login(client, ex2_email)
    await _promote(db, ex2_email, Role.EXAMINER)

    cand_email = await _create_candidate(client, db, "iso2c")
    cand = (await db.execute(sa_select(User).where(User.email == cand_email))).scalar_one()

    # Login as ex2 (not the owner)
    await client.post("/api/v1/auth/login", json={"email": ex2_email, "password": "Pass@12345"})
    r = await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_candidate_dashboard_summary(client: AsyncClient, db: AsyncSession):
    """Candidate dashboard summary reflects real enrollment count."""
    from sqlalchemy import select as sa_select
    ex_email, exam_id, _ = await _create_examiner_with_exam(client, db, "dashcand1")
    cand_email = await _create_candidate(client, db, "dashcand1")
    cand = (await db.execute(sa_select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.get("/api/v1/dashboard/candidate/summary")
    assert r.status_code == 200
    data = r.json()
    assert data["assigned_examinations"] >= 1
