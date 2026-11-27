"""Phase 6 tests: Reliable autosave, race-condition protection, submission integrity."""
import asyncio
import pytest
from httpx import AsyncClient
from sqlalchemy import update, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, Role
from app.models.exam import Examination, ExamStatus
from app.models.candidate import Enrollment, Attempt, AttemptStatus, Response


# ── Shared helpers (reused from test_candidate.py) ────────────────────────────

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


async def _setup(client: AsyncClient, db: AsyncSession, suffix: str):
    """Full setup: examiner + exam with MCQ + written + candidate enrolled + attempt started.

    Returns (attempt_id, sc_aq_id, sc_choice_ids, written_aq_id, cand_email, ex_email, exam_id)
    """
    ex_email = f"ex_p6_{suffix}@nigrani.com"
    await _register_and_login(client, ex_email)
    await _promote(db, ex_email, Role.EXAMINER)
    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})

    r = await client.post("/api/v1/exams", json={
        "title": f"P6 Exam {suffix}",
        "duration_minutes": 60,
        "total_marks": 10,
        "passing_marks": 5,
    })
    assert r.status_code == 201
    exam_id = r.json()["id"]

    r = await client.post("/api/v1/questions", json={
        "question_type": "SINGLE_CHOICE",
        "text": "Capital of France?",
        "marks": 3,
        "choices": [
            {"text": "Berlin", "is_correct": False, "order_index": 0},
            {"text": "Paris", "is_correct": True, "order_index": 1},
            {"text": "Rome", "is_correct": False, "order_index": 2},
        ],
    })
    assert r.status_code == 201
    sc_q_id = r.json()["id"]

    r = await client.post("/api/v1/questions", json={
        "question_type": "MULTIPLE_CHOICE",
        "text": "Select prime numbers.",
        "marks": 3,
        "choices": [
            {"text": "2", "is_correct": True, "order_index": 0},
            {"text": "3", "is_correct": True, "order_index": 1},
            {"text": "4", "is_correct": False, "order_index": 2},
        ],
    })
    assert r.status_code == 201
    mc_q_id = r.json()["id"]

    r = await client.post("/api/v1/questions", json={
        "question_type": "WRITTEN",
        "text": "Explain photosynthesis.",
        "marks": 4,
        "choices": [],
    })
    assert r.status_code == 201
    written_q_id = r.json()["id"]

    r = await client.post(f"/api/v1/exams/{exam_id}/questions", json={"question_ids": [sc_q_id, mc_q_id, written_q_id]})
    assert r.status_code == 200
    await client.post(f"/api/v1/exams/{exam_id}/publish")

    cand_email = f"cand_p6_{suffix}@nigrani.com"
    await _register_and_login(client, cand_email)
    cand = (await db.execute(select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    assert r.status_code == 201
    attempt_id = r.json()["attempt_id"]

    r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}")
    questions = r.json()["questions"]
    sc_q = next(q for q in questions if q["question_type"] == "SINGLE_CHOICE")
    mc_q = next(q for q in questions if q["question_type"] == "MULTIPLE_CHOICE")
    written_q = next(q for q in questions if q["question_type"] == "WRITTEN")

    return (
        attempt_id,
        sc_q["id"], [c["id"] for c in sc_q["choices"]],
        mc_q["id"], [c["id"] for c in mc_q["choices"]],
        written_q["id"],
        cand_email, ex_email, exam_id,
    )


# ── 1. Single-choice persistence ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_single_choice_persistence(client: AsyncClient, db: AsyncSession):
    """Single-choice answer is persisted and retrieved after save."""
    attempt_id, sc_aq_id, sc_choices, *_, cand_email, _ex, _exam = await _setup(client, db, "sc1")

    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_aq_id}/response",
        json={"selected_choice_ids": [sc_choices[1]]},
    )
    assert r.status_code == 200
    assert r.json()["selected_choice_ids"] == [sc_choices[1]]

    # Reload attempt — response is in DB
    r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}")
    responses = r.json()["responses"]
    assert str(sc_aq_id) in responses
    assert responses[str(sc_aq_id)]["selected_choice_ids"] == [sc_choices[1]]


# ── 2. Multiple-select persistence ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_multiple_choice_persistence(client: AsyncClient, db: AsyncSession):
    """Multiple-select answer set is persisted correctly."""
    attempt_id, _sc, _sc_c, mc_aq_id, mc_choices, *_ = await _setup(client, db, "mc1")

    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{mc_aq_id}/response",
        json={"selected_choice_ids": [mc_choices[0], mc_choices[1]]},
    )
    assert r.status_code == 200
    saved = sorted(r.json()["selected_choice_ids"])
    assert saved == sorted([mc_choices[0], mc_choices[1]])

    # Update selection — remove one, verify no duplicate
    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{mc_aq_id}/response",
        json={"selected_choice_ids": [mc_choices[1]]},
    )
    assert r.status_code == 200
    assert r.json()["selected_choice_ids"] == [mc_choices[1]]

    r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}")
    assert r.json()["responses"][str(mc_aq_id)]["selected_choice_ids"] == [mc_choices[1]]


# ── 3. Written response persistence ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_written_response_persistence(client: AsyncClient, db: AsyncSession):
    """Written answer text is persisted and updated correctly."""
    attempt_id, _sc, _sc_c, _mc, _mc_c, written_aq_id, *_ = await _setup(client, db, "wr1")

    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{written_aq_id}/response",
        json={"selected_choice_ids": [], "written_text": "Photosynthesis converts light to energy."},
    )
    assert r.status_code == 200
    assert "Photosynthesis" in r.json()["written_text"]

    # Update text
    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{written_aq_id}/response",
        json={"selected_choice_ids": [], "written_text": "Updated: plants use sunlight."},
    )
    assert r.status_code == 200
    assert r.json()["written_text"] == "Updated: plants use sunlight."


# ── 4. Review flag persistence ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_review_flag_persisted_in_attempt(client: AsyncClient, db: AsyncSession):
    """Marking for review is reflected in the full attempt retrieval."""
    attempt_id, sc_aq_id, _sc_c, *_ = await _setup(client, db, "flag1")

    await client.patch(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_aq_id}/review",
        json={"marked": True},
    )

    r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}")
    responses = r.json()["responses"]
    assert responses[str(sc_aq_id)]["is_marked_for_review"] is True


# ── 5. Invalid choice rejection ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_invalid_choice_rejected(client: AsyncClient, db: AsyncSession):
    """Submitting a choice ID not belonging to the question returns 400."""
    attempt_id, sc_aq_id, _sc_c, *_ = await _setup(client, db, "invalid1")

    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_aq_id}/response",
        json={"selected_choice_ids": [999999]},
    )
    assert r.status_code == 400
    assert "invalid choice" in r.json()["detail"].lower()


# ── 6. Cross-candidate access rejection ──────────────────────────────────────

@pytest.mark.asyncio
async def test_cross_candidate_save_rejected(client: AsyncClient, db: AsyncSession):
    """Candidate B cannot save a response to Candidate A's attempt."""
    attempt_id, sc_aq_id, sc_choices, *_, cand_email, ex_email, exam_id = await _setup(client, db, "xc1")

    # Create candidate B and enroll them in same exam
    cand_b_email = f"cand_p6_xc1b@nigrani.com"
    await _register_and_login(client, cand_b_email)
    cand_b = (await db.execute(select(User).where(User.email == cand_b_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand_b.id)})

    # Login as candidate B, try to write to candidate A's attempt
    await client.post("/api/v1/auth/login", json={"email": cand_b_email, "password": "Pass@12345"})
    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_aq_id}/response",
        json={"selected_choice_ids": [sc_choices[0]]},
    )
    assert r.status_code in (400, 404)


# ── 7. Submitted attempt modification rejection ───────────────────────────────

@pytest.mark.asyncio
async def test_cannot_modify_submitted_attempt(client: AsyncClient, db: AsyncSession):
    """All modifications to a submitted attempt must be rejected."""
    attempt_id, sc_aq_id, sc_choices, _mc, _mc_c, written_aq_id, *_ = await _setup(client, db, "sub_mod1")

    await client.post(f"/api/v1/candidate/attempts/{attempt_id}/submit")

    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_aq_id}/response",
        json={"selected_choice_ids": [sc_choices[0]]},
    )
    assert r.status_code == 400

    r = await client.patch(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_aq_id}/review",
        json={"marked": True},
    )
    assert r.status_code == 400


# ── 8. Version increments on each save ────────────────────────────────────────

@pytest.mark.asyncio
async def test_version_increments_on_update(client: AsyncClient, db: AsyncSession):
    """Version number increments with each successful save."""
    attempt_id, sc_aq_id, sc_choices, *_ = await _setup(client, db, "ver1")

    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_aq_id}/response",
        json={"selected_choice_ids": [sc_choices[0]]},
    )
    assert r.status_code == 200
    v1 = r.json()["version"]

    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_aq_id}/response",
        json={"selected_choice_ids": [sc_choices[1]]},
    )
    assert r.status_code == 200
    v2 = r.json()["version"]
    assert v2 == v1 + 1


# ── 9. OCC version conflict rejection ────────────────────────────────────────

@pytest.mark.asyncio
async def test_occ_version_conflict_rejected(client: AsyncClient, db: AsyncSession):
    """Sending a stale client_version returns 400 (version conflict)."""
    attempt_id, sc_aq_id, sc_choices, *_ = await _setup(client, db, "occ1")

    # First save — version becomes 1
    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_aq_id}/response",
        json={"selected_choice_ids": [sc_choices[0]]},
    )
    assert r.status_code == 200
    assert r.json()["version"] == 1

    # Second save with correct version — succeeds
    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_aq_id}/response",
        json={"selected_choice_ids": [sc_choices[1]], "client_version": 1},
    )
    assert r.status_code == 200

    # Third save with stale version 1 (should be 2 now) — rejected
    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_aq_id}/response",
        json={"selected_choice_ids": [sc_choices[0]], "client_version": 1},
    )
    assert r.status_code == 400
    assert "version" in r.json()["detail"].lower()


# ── 10. Submission idempotency ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_submission_idempotent(client: AsyncClient, db: AsyncSession):
    """Submitting twice creates only one submission record."""
    attempt_id, *_ = await _setup(client, db, "idem1")

    r1 = await client.post(f"/api/v1/candidate/attempts/{attempt_id}/submit")
    r2 = await client.post(f"/api/v1/candidate/attempts/{attempt_id}/submit")
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["submitted_at"] == r2.json()["submitted_at"]


# ── 11. Status endpoint for uncertain submission ──────────────────────────────

@pytest.mark.asyncio
async def test_attempt_status_endpoint(client: AsyncClient, db: AsyncSession):
    """Status endpoint returns correct status before and after submission."""
    attempt_id, *_ = await _setup(client, db, "stat1")

    r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}/status")
    assert r.status_code == 200
    assert r.json()["status"] == "IN_PROGRESS"
    assert r.json()["submitted_at"] is None

    await client.post(f"/api/v1/candidate/attempts/{attempt_id}/submit")

    r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}/status")
    assert r.status_code == 200
    assert r.json()["status"] == "SUBMITTED"
    assert r.json()["submitted_at"] is not None


# ── 12. Recovery: responses restored after simulated refresh ─────────────────

@pytest.mark.asyncio
async def test_responses_restored_on_refresh(client: AsyncClient, db: AsyncSession):
    """All saved responses are present in GET /attempts/{id} (simulates refresh recovery)."""
    attempt_id, sc_aq_id, sc_choices, _mc, _mc_c, written_aq_id, *_ = await _setup(client, db, "refresh1")

    await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_aq_id}/response",
        json={"selected_choice_ids": [sc_choices[1]]},
    )
    await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{written_aq_id}/response",
        json={"selected_choice_ids": [], "written_text": "My written answer."},
    )
    await client.patch(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_aq_id}/review",
        json={"marked": True},
    )

    # Simulate refresh — fresh GET of the attempt
    r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}")
    assert r.status_code == 200
    responses = r.json()["responses"]

    assert str(sc_aq_id) in responses
    assert responses[str(sc_aq_id)]["selected_choice_ids"] == [sc_choices[1]]
    assert responses[str(sc_aq_id)]["is_marked_for_review"] is True
    assert str(written_aq_id) in responses
    assert responses[str(written_aq_id)]["written_text"] == "My written answer."


# ── 13. Concurrent updates — last write wins (no version) ────────────────────

@pytest.mark.asyncio
async def test_concurrent_updates_last_write_wins(client: AsyncClient, db: AsyncSession):
    """Without client_version, the last PUT wins and no data corruption occurs."""
    attempt_id, sc_aq_id, sc_choices, *_ = await _setup(client, db, "concurrent1")

    # Fire two saves sequentially (simulating rapid UI edits without OCC)
    await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_aq_id}/response",
        json={"selected_choice_ids": [sc_choices[0]]},
    )
    r = await client.put(
        f"/api/v1/candidate/attempts/{attempt_id}/questions/{sc_aq_id}/response",
        json={"selected_choice_ids": [sc_choices[2]]},
    )
    assert r.status_code == 200
    assert r.json()["selected_choice_ids"] == [sc_choices[2]]

    r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}")
    assert r.json()["responses"][str(sc_aq_id)]["selected_choice_ids"] == [sc_choices[2]]


# ── 14. Status endpoint rejects other candidate ───────────────────────────────

@pytest.mark.asyncio
async def test_status_endpoint_ownership(client: AsyncClient, db: AsyncSession):
    """Status endpoint returns 404 for a different candidate."""
    attempt_id, *_, cand_email, ex_email, exam_id = await _setup(client, db, "stat2")

    cand_b_email = f"cand_p6_stat2b@nigrani.com"
    await _register_and_login(client, cand_b_email)

    await client.post("/api/v1/auth/login", json={"email": cand_b_email, "password": "Pass@12345"})
    r = await client.get(f"/api/v1/candidate/attempts/{attempt_id}/status")
    assert r.status_code == 404
