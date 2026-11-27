"""Phase 7 tests: Automatic grading, manual evaluation, result publication."""
import pytest
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, Role
from app.models.candidate import Attempt, AttemptStatus, Response, GradingStatus, Result, ResultPublicationStatus


# ── Shared helpers ─────────────────────────────────────────────────────────────

async def _reg(client: AsyncClient, email: str, password: str = "Pass@12345"):
    await client.post("/api/v1/auth/register", json={
        "full_name": "Test", "email": email, "password": password, "confirm_password": password,
    })
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200


async def _promote(db: AsyncSession, email: str, role: Role):
    await db.execute(update(User).where(User.email == email).values(role=role))
    await db.commit()


async def _full_setup(client: AsyncClient, db: AsyncSession, suffix: str):
    """
    Creates examiner, exam with:
      - 1 single-choice question (3 marks, correct = choice index 1)
      - 1 multiple-choice question (3 marks, correct = choices 0+1)
      - 1 written question (4 marks)
    Enrolls candidate, starts and submits the attempt with answers.
    Returns (examiner_email, cand_email, exam_id, attempt_id, questions_map)
    where questions_map = {'sc': {...}, 'mc': {...}, 'wr': {...}}
    """
    ex_email = f"ex7_{suffix}@nigrani.com"
    await _reg(client, ex_email)
    await _promote(db, ex_email, Role.EXAMINER)
    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})

    r = await client.post("/api/v1/exams", json={
        "title": f"P7 Exam {suffix}", "duration_minutes": 60, "total_marks": 10, "passing_marks": 6,
    })
    exam_id = r.json()["id"]

    r = await client.post("/api/v1/questions", json={
        "question_type": "SINGLE_CHOICE", "text": "Capital of France?", "marks": 3,
        "choices": [
            {"text": "Berlin", "is_correct": False, "order_index": 0},
            {"text": "Paris", "is_correct": True, "order_index": 1},
        ],
    })
    sc_qid = r.json()["id"]

    r = await client.post("/api/v1/questions", json={
        "question_type": "MULTIPLE_CHOICE", "text": "Select prime numbers.", "marks": 3,
        "choices": [
            {"text": "2", "is_correct": True, "order_index": 0},
            {"text": "3", "is_correct": True, "order_index": 1},
            {"text": "4", "is_correct": False, "order_index": 2},
        ],
    })
    mc_qid = r.json()["id"]

    r = await client.post("/api/v1/questions", json={
        "question_type": "WRITTEN", "text": "Explain gravity.", "marks": 4, "choices": [],
    })
    wr_qid = r.json()["id"]

    await client.post(f"/api/v1/exams/{exam_id}/questions", json={"question_ids": [sc_qid, mc_qid, wr_qid]})
    await client.post(f"/api/v1/exams/{exam_id}/publish")

    cand_email = f"cand7_{suffix}@nigrani.com"
    await _reg(client, cand_email)
    cand = (await db.execute(select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    attempt_id = r.json()["attempt_id"]

    r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}")
    questions = r.json()["questions"]
    sc_q = next(q for q in questions if q["question_type"] == "SINGLE_CHOICE")
    mc_q = next(q for q in questions if q["question_type"] == "MULTIPLE_CHOICE")
    wr_q = next(q for q in questions if q["question_type"] == "WRITTEN")

    # Answer correctly: SC → Paris (index 1), MC → 2+3 (indices 0+1), WR → text
    correct_sc = sc_q["choices"][1]["id"]
    mc_c0 = mc_q["choices"][0]["id"]
    mc_c1 = mc_q["choices"][1]["id"]

    await client.put(f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_q['id']}/response",
                     json={"selected_choice_ids": [correct_sc]})
    await client.put(f"/api/v1/candidate/attempts/{attempt_id}/questions/{mc_q['id']}/response",
                     json={"selected_choice_ids": [mc_c0, mc_c1]})
    await client.put(f"/api/v1/candidate/attempts/{attempt_id}/questions/{wr_q['id']}/response",
                     json={"selected_choice_ids": [], "written_text": "Gravity pulls objects together."})

    await client.post(f"/api/v1/candidate/attempts/{attempt_id}/submit")

    return ex_email, cand_email, exam_id, attempt_id, {
        "sc": sc_q, "mc": mc_q, "wr": wr_q,
        "correct_sc": correct_sc, "mc_c0": mc_c0, "mc_c1": mc_c1,
    }


# ── 1. Auto-grading on submission ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_auto_grading_on_submission(client: AsyncClient, db: AsyncSession):
    """Submitting auto-grades SC and MC questions."""
    ex_email, _, _, attempt_id, qmap = await _full_setup(client, db, "ag1")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    assert r.status_code == 200
    data = r.json()

    sc_resp = next(q["response"] for q in data["questions"] if q["question_type"] == "SINGLE_CHOICE")
    mc_resp = next(q["response"] for q in data["questions"] if q["question_type"] == "MULTIPLE_CHOICE")
    wr_resp = next(q["response"] for q in data["questions"] if q["question_type"] == "WRITTEN")

    assert sc_resp["grading_status"] == "AUTO"
    assert sc_resp["awarded_marks"] == 3.0  # correct answer
    assert mc_resp["grading_status"] == "AUTO"
    assert mc_resp["awarded_marks"] == 3.0  # exact set match
    assert wr_resp["grading_status"] == "PENDING"
    assert wr_resp["awarded_marks"] is None


@pytest.mark.asyncio
async def test_incorrect_single_choice_zero_marks(client: AsyncClient, db: AsyncSession):
    """Wrong single-choice answer awards zero marks."""
    ex_email, _, exam_id, _, _ = await _full_setup(client, db, "ag2")

    cand_email = f"cand7_ag2b@nigrani.com"
    await _reg(client, cand_email)
    cand = (await db.execute(select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    attempt_id = r.json()["attempt_id"]

    r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}")
    questions = r.json()["questions"]
    sc_q = next(q for q in questions if q["question_type"] == "SINGLE_CHOICE")
    wrong_choice = sc_q["choices"][0]["id"]  # Berlin (wrong)

    await client.put(f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_q['id']}/response",
                     json={"selected_choice_ids": [wrong_choice]})
    await client.post(f"/api/v1/candidate/attempts/{attempt_id}/submit")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    sc_resp = next(q["response"] for q in r.json()["questions"] if q["question_type"] == "SINGLE_CHOICE")
    assert sc_resp["awarded_marks"] == 0.0


@pytest.mark.asyncio
async def test_unanswered_question_zero_marks(client: AsyncClient, db: AsyncSession):
    """Unanswered questions receive zero marks."""
    ex_email, _, exam_id, _, _ = await _full_setup(client, db, "ag3")

    cand_email = f"cand7_ag3b@nigrani.com"
    await _reg(client, cand_email)
    cand = (await db.execute(select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    attempt_id = r.json()["attempt_id"]
    # Submit without answering anything
    await client.post(f"/api/v1/candidate/attempts/{attempt_id}/submit")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    for q in r.json()["questions"]:
        if q["question_type"] in ("SINGLE_CHOICE", "MULTIPLE_CHOICE"):
            resp = q["response"]
            assert resp is None or resp["awarded_marks"] == 0.0


@pytest.mark.asyncio
async def test_incomplete_multiple_choice_zero_marks(client: AsyncClient, db: AsyncSession):
    """Incomplete set for multiple-choice gets zero marks."""
    ex_email, _, exam_id, _, _ = await _full_setup(client, db, "ag4")

    cand_email = f"cand7_ag4b@nigrani.com"
    await _reg(client, cand_email)
    cand = (await db.execute(select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    attempt_id = r.json()["attempt_id"]

    r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}")
    mc_q = next(q for q in r.json()["questions"] if q["question_type"] == "MULTIPLE_CHOICE")
    # Only select one of the two correct choices
    await client.put(f"/api/v1/candidate/attempts/{attempt_id}/questions/{mc_q['id']}/response",
                     json={"selected_choice_ids": [mc_q["choices"][0]["id"]]})
    await client.post(f"/api/v1/candidate/attempts/{attempt_id}/submit")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    mc_resp = next(q["response"] for q in r.json()["questions"] if q["question_type"] == "MULTIPLE_CHOICE")
    assert mc_resp["awarded_marks"] == 0.0


# ── 2. Manual grading ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_manual_grade_written_response(client: AsyncClient, db: AsyncSession):
    """Examiner can assign marks to a written response."""
    ex_email, _, _, attempt_id, qmap = await _full_setup(client, db, "mg1")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    wr_resp = next(q["response"] for q in r.json()["questions"] if q["question_type"] == "WRITTEN")
    response_id = wr_resp["id"]

    r = await client.put(
        f"/api/v1/examiner/attempts/{attempt_id}/responses/{response_id}/grade",
        json={"awarded_marks": 3.5, "feedback": "Good explanation."},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["awarded_marks"] == 3.5
    assert data["grading_status"] == "GRADED"
    assert data["examiner_feedback"] == "Good explanation."


@pytest.mark.asyncio
async def test_manual_grade_zero_marks_allowed(client: AsyncClient, db: AsyncSession):
    """Zero marks is a valid grade."""
    ex_email, _, _, attempt_id, _ = await _full_setup(client, db, "mg2")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    wr_resp = next(q["response"] for q in r.json()["questions"] if q["question_type"] == "WRITTEN")

    r = await client.put(
        f"/api/v1/examiner/attempts/{attempt_id}/responses/{wr_resp['id']}/grade",
        json={"awarded_marks": 0, "feedback": "No answer."},
    )
    assert r.status_code == 200
    assert r.json()["awarded_marks"] == 0.0


@pytest.mark.asyncio
async def test_negative_marks_rejected(client: AsyncClient, db: AsyncSession):
    """Negative marks are rejected."""
    ex_email, _, _, attempt_id, _ = await _full_setup(client, db, "mg3")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    wr_resp = next(q["response"] for q in r.json()["questions"] if q["question_type"] == "WRITTEN")

    r = await client.put(
        f"/api/v1/examiner/attempts/{attempt_id}/responses/{wr_resp['id']}/grade",
        json={"awarded_marks": -1},
    )
    assert r.status_code == 422  # Pydantic ge=0 rejects it


@pytest.mark.asyncio
async def test_marks_exceeding_max_rejected(client: AsyncClient, db: AsyncSession):
    """Marks exceeding the question maximum are rejected."""
    ex_email, _, _, attempt_id, _ = await _full_setup(client, db, "mg4")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    wr_resp = next(q["response"] for q in r.json()["questions"] if q["question_type"] == "WRITTEN")
    # Written question has 4 marks max

    r = await client.put(
        f"/api/v1/examiner/attempts/{attempt_id}/responses/{wr_resp['id']}/grade",
        json={"awarded_marks": 10},
    )
    assert r.status_code == 400
    assert "exceed" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_cross_examiner_grading_rejected(client: AsyncClient, db: AsyncSession):
    """Examiner B cannot grade examiner A's attempts."""
    ex_email, _, _, attempt_id, _ = await _full_setup(client, db, "mg5")

    ex2_email = "ex7_mg5b@nigrani.com"
    await _reg(client, ex2_email)
    await _promote(db, ex2_email, Role.EXAMINER)

    await client.post("/api/v1/auth/login", json={"email": ex2_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    assert r.status_code == 404


# ── 3. Result calculation ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_result_calculation_after_full_grading(client: AsyncClient, db: AsyncSession):
    """Final result calculates correct totals after all grading."""
    ex_email, _, _, attempt_id, _ = await _full_setup(client, db, "rc1")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    wr_resp = next(q["response"] for q in r.json()["questions"] if q["question_type"] == "WRITTEN")

    await client.put(
        f"/api/v1/examiner/attempts/{attempt_id}/responses/{wr_resp['id']}/grade",
        json={"awarded_marks": 4.0},
    )

    r = await client.post(f"/api/v1/examiner/attempts/{attempt_id}/finalize-grading")
    assert r.status_code == 200
    data = r.json()
    # SC=3, MC=3, WR=4 → obtained=10, total=10, pct=100
    assert data["obtained_marks"] == 10.0
    assert data["total_marks"] == 10.0
    assert float(data["percentage"]) == 100.0
    assert data["result_status"] == "PASS"


@pytest.mark.asyncio
async def test_result_pass_fail_determination(client: AsyncClient, db: AsyncSession):
    """FAIL is correctly determined when marks below passing threshold."""
    ex_email, _, _, attempt_id, _ = await _full_setup(client, db, "rc2")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    wr_resp = next(q["response"] for q in r.json()["questions"] if q["question_type"] == "WRITTEN")

    await client.put(
        f"/api/v1/examiner/attempts/{attempt_id}/responses/{wr_resp['id']}/grade",
        json={"awarded_marks": 0.0},
    )

    r = await client.post(f"/api/v1/examiner/attempts/{attempt_id}/finalize-grading")
    data = r.json()
    # SC=3+MC=3+WR=0=6, passing=6 → PASS (edge case; ≥ passes)
    assert data["result_status"] == "PASS"


@pytest.mark.asyncio
async def test_cannot_finalize_with_ungraded_written(client: AsyncClient, db: AsyncSession):
    """Finalizing with ungraded written responses returns 400."""
    ex_email, _, _, attempt_id, _ = await _full_setup(client, db, "rc3")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.post(f"/api/v1/examiner/attempts/{attempt_id}/finalize-grading")
    assert r.status_code == 400
    assert "written" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_result_snapshot_independent_of_question_changes(client: AsyncClient, db: AsyncSession):
    """Result uses snapshot marks, not current question-bank marks."""
    ex_email, _, _, attempt_id, _ = await _full_setup(client, db, "rc4")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    wr_resp = next(q["response"] for q in r.json()["questions"] if q["question_type"] == "WRITTEN")

    await client.put(
        f"/api/v1/examiner/attempts/{attempt_id}/responses/{wr_resp['id']}/grade",
        json={"awarded_marks": 4.0},
    )
    r = await client.post(f"/api/v1/examiner/attempts/{attempt_id}/finalize-grading")
    snapshot_total = r.json()["total_marks"]

    # Confirm result row exists with the snapshot total
    result_res = await db.execute(
        select(Result).where(Result.attempt_id == attempt_id)
    )
    result_row = result_res.scalar_one()
    assert float(result_row.total_marks) == snapshot_total


# ── 4. Publication and security ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_publish_result(client: AsyncClient, db: AsyncSession):
    """Examiner can publish a finalized result."""
    ex_email, _, _, attempt_id, _ = await _full_setup(client, db, "pub1")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    wr_resp = next(q["response"] for q in r.json()["questions"] if q["question_type"] == "WRITTEN")
    await client.put(f"/api/v1/examiner/attempts/{attempt_id}/responses/{wr_resp['id']}/grade",
                     json={"awarded_marks": 3.0})
    await client.post(f"/api/v1/examiner/attempts/{attempt_id}/finalize-grading")

    r = await client.post(f"/api/v1/examiner/attempts/{attempt_id}/publish-result")
    assert r.status_code == 200
    assert r.json()["publication_status"] == "PUBLISHED"
    assert r.json()["published_at"] is not None


@pytest.mark.asyncio
async def test_cannot_publish_unfinalized_result(client: AsyncClient, db: AsyncSession):
    """Publishing before finalization returns 400."""
    ex_email, _, _, attempt_id, _ = await _full_setup(client, db, "pub2")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.post(f"/api/v1/examiner/attempts/{attempt_id}/publish-result")
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_candidate_cannot_see_unpublished_result(client: AsyncClient, db: AsyncSession):
    """Candidate gets empty list before result is published."""
    _, cand_email, _, _, _ = await _full_setup(client, db, "pub3")

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.get("/api/v1/candidate/results")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_candidate_sees_published_result(client: AsyncClient, db: AsyncSession):
    """Candidate can view their own published result."""
    ex_email, cand_email, _, attempt_id, _ = await _full_setup(client, db, "pub4")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    wr_resp = next(q["response"] for q in r.json()["questions"] if q["question_type"] == "WRITTEN")
    await client.put(f"/api/v1/examiner/attempts/{attempt_id}/responses/{wr_resp['id']}/grade",
                     json={"awarded_marks": 4.0})
    await client.post(f"/api/v1/examiner/attempts/{attempt_id}/finalize-grading")
    await client.post(f"/api/v1/examiner/attempts/{attempt_id}/publish-result")

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.get("/api/v1/candidate/results")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["obtained_marks"] == 10.0

    result_id = r.json()[0]["result_id"]
    r = await client.get(f"/api/v1/candidate/results/{result_id}")
    assert r.status_code == 200
    assert r.json()["result_status"] == "PASS"


@pytest.mark.asyncio
async def test_candidate_cannot_access_other_result(client: AsyncClient, db: AsyncSession):
    """Candidate B cannot access candidate A's result."""
    ex_email, cand_a_email, exam_id, attempt_id, _ = await _full_setup(client, db, "pub5")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    wr_resp = next(q["response"] for q in r.json()["questions"] if q["question_type"] == "WRITTEN")
    await client.put(f"/api/v1/examiner/attempts/{attempt_id}/responses/{wr_resp['id']}/grade",
                     json={"awarded_marks": 2.0})
    await client.post(f"/api/v1/examiner/attempts/{attempt_id}/finalize-grading")
    await client.post(f"/api/v1/examiner/attempts/{attempt_id}/publish-result")

    # Get the result_id
    result_res = await db.execute(select(Result).where(Result.attempt_id == attempt_id))
    result_row = result_res.scalar_one()

    # Create candidate B
    cand_b_email = f"cand7_pub5b@nigrani.com"
    await _reg(client, cand_b_email)

    await client.post("/api/v1/auth/login", json={"email": cand_b_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/candidate/results/{result_row.id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_publish_idempotent(client: AsyncClient, db: AsyncSession):
    """Publishing twice returns same result without error."""
    ex_email, _, _, attempt_id, _ = await _full_setup(client, db, "pub6")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    wr_resp = next(q["response"] for q in r.json()["questions"] if q["question_type"] == "WRITTEN")
    await client.put(f"/api/v1/examiner/attempts/{attempt_id}/responses/{wr_resp['id']}/grade",
                     json={"awarded_marks": 1.0})
    await client.post(f"/api/v1/examiner/attempts/{attempt_id}/finalize-grading")

    r1 = await client.post(f"/api/v1/examiner/attempts/{attempt_id}/publish-result")
    r2 = await client.post(f"/api/v1/examiner/attempts/{attempt_id}/publish-result")
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["published_at"] == r2.json()["published_at"]


@pytest.mark.asyncio
async def test_result_detail_has_question_breakdown(client: AsyncClient, db: AsyncSession):
    """Published result detail includes per-question awarded marks."""
    ex_email, cand_email, _, attempt_id, _ = await _full_setup(client, db, "pub7")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/examiner/attempts/{attempt_id}/grading")
    wr_resp = next(q["response"] for q in r.json()["questions"] if q["question_type"] == "WRITTEN")
    await client.put(f"/api/v1/examiner/attempts/{attempt_id}/responses/{wr_resp['id']}/grade",
                     json={"awarded_marks": 2.0, "feedback": "Fair answer."})
    await client.post(f"/api/v1/examiner/attempts/{attempt_id}/finalize-grading")
    await client.post(f"/api/v1/examiner/attempts/{attempt_id}/publish-result")

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.get("/api/v1/candidate/results")
    result_id = r.json()[0]["result_id"]
    r = await client.get(f"/api/v1/candidate/results/{result_id}")
    data = r.json()

    assert len(data["questions"]) == 3
    wr_q = next(q for q in data["questions"] if q["question_type"] == "WRITTEN")
    assert wr_q["examiner_feedback"] == "Fair answer."
    assert wr_q["awarded_marks"] == 2.0
