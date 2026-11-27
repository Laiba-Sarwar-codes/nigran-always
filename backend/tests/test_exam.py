"""Phase 4 tests: Question Bank and Examination Management."""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, Role

pytestmark = pytest.mark.asyncio

LOGIN_URL = "/api/v1/auth/login"
LOGOUT_URL = "/api/v1/auth/logout"
QUESTIONS_URL = "/api/v1/questions"
EXAMS_URL = "/api/v1/exams"

SINGLE_Q = {
    "question_type": "SINGLE_CHOICE",
    "text": "What is 2 + 2?",
    "marks": 2,
    "choices": [
        {"text": "3", "is_correct": False},
        {"text": "4", "is_correct": True},
        {"text": "5", "is_correct": False},
    ],
}

MULTI_Q = {
    "question_type": "MULTIPLE_CHOICE",
    "text": "Which are prime?",
    "marks": 3,
    "choices": [
        {"text": "2", "is_correct": True},
        {"text": "3", "is_correct": True},
        {"text": "4", "is_correct": False},
    ],
}

WRITTEN_Q = {
    "question_type": "WRITTEN",
    "text": "Explain the water cycle.",
    "marks": 5,
}


async def _create_and_login_examiner(
    client: AsyncClient, db: AsyncSession, email: str, password: str = "Pass@12345"
) -> None:
    await client.post(LOGOUT_URL)
    await client.post("/api/v1/auth/register", json={
        "full_name": "Examiner",
        "email": email,
        "password": password,
    })
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.role = Role.EXAMINER
    await db.commit()
    r = await client.post(LOGIN_URL, json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"


# ── Question Bank Tests ───────────────────────────────────────────────────────

async def test_create_single_choice_question(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.sc@example.com")
    r = await client.post(QUESTIONS_URL, json=SINGLE_Q)
    assert r.status_code == 201
    data = r.json()
    assert data["question_type"] == "SINGLE_CHOICE"
    assert data["marks"] == 2
    assert len(data["choices"]) == 3
    assert sum(1 for c in data["choices"] if c["is_correct"]) == 1


async def test_create_multiple_choice_question(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.mc@example.com")
    r = await client.post(QUESTIONS_URL, json=MULTI_Q)
    assert r.status_code == 201
    assert r.json()["question_type"] == "MULTIPLE_CHOICE"


async def test_create_written_question(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.wr@example.com")
    r = await client.post(QUESTIONS_URL, json=WRITTEN_Q)
    assert r.status_code == 201
    assert r.json()["choices"] == []


async def test_single_choice_requires_exactly_one_correct(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.val1@example.com")
    bad = {**SINGLE_Q, "choices": [
        {"text": "A", "is_correct": True},
        {"text": "B", "is_correct": True},
    ]}
    r = await client.post(QUESTIONS_URL, json=bad)
    assert r.status_code == 422


async def test_mcq_requires_at_least_two_choices(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.val2@example.com")
    bad = {**SINGLE_Q, "choices": [{"text": "Only", "is_correct": True}]}
    r = await client.post(QUESTIONS_URL, json=bad)
    assert r.status_code == 422


async def test_list_questions_paginated(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.list@example.com")
    await client.post(QUESTIONS_URL, json=WRITTEN_Q)
    r = await client.get(QUESTIONS_URL)
    assert r.status_code == 200
    body = r.json()
    assert "items" in body
    assert body["total"] >= 1


async def test_get_question_by_id(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.getq@example.com")
    created = (await client.post(QUESTIONS_URL, json=SINGLE_Q)).json()
    r = await client.get(f"{QUESTIONS_URL}/{created['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == created["id"]


async def test_update_question_text(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.upd@example.com")
    created = (await client.post(QUESTIONS_URL, json=WRITTEN_Q)).json()
    r = await client.patch(f"{QUESTIONS_URL}/{created['id']}", json={"text": "Updated question"})
    assert r.status_code == 200
    assert r.json()["text"] == "Updated question"


async def test_delete_standalone_question(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.del@example.com")
    created = (await client.post(QUESTIONS_URL, json=WRITTEN_Q)).json()
    r = await client.delete(f"{QUESTIONS_URL}/{created['id']}")
    assert r.status_code == 204


async def test_candidate_cannot_access_questions(client: AsyncClient):
    await client.post(LOGOUT_URL)
    await client.post("/api/v1/auth/register", json={
        "full_name": "Cand Q",
        "email": "cand.qtest@example.com",
        "password": "Cand@12345",
    })
    r_login = await client.post(LOGIN_URL, json={"email": "cand.qtest@example.com", "password": "Cand@12345"})
    assert r_login.status_code == 200
    r = await client.get(QUESTIONS_URL)
    assert r.status_code == 403


async def test_unauthenticated_cannot_access_questions(client: AsyncClient):
    await client.post(LOGOUT_URL)
    r = await client.get(QUESTIONS_URL)
    assert r.status_code == 401


# ── Examination Tests ─────────────────────────────────────────────────────────

async def test_create_draft_exam(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.cr@example.com")
    r = await client.post(EXAMS_URL, json={
        "title": "Math Final",
        "description": "End of term",
        "duration_minutes": 60,
        "passing_marks": 50,
    })
    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "DRAFT"
    assert data["total_marks"] == 0


async def test_add_question_to_exam_updates_marks(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.addq@example.com")
    exam = (await client.post(EXAMS_URL, json={"title": "Exam Add"})).json()
    q = (await client.post(QUESTIONS_URL, json=SINGLE_Q)).json()
    r = await client.post(f"{EXAMS_URL}/{exam['id']}/questions", json={"question_ids": [q["id"]]})
    assert r.status_code == 200
    data = r.json()
    assert len(data["exam_questions"]) == 1
    assert data["total_marks"] == q["marks"]


async def test_remove_question_from_exam(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.rmq@example.com")
    exam = (await client.post(EXAMS_URL, json={"title": "Exam Remove"})).json()
    q = (await client.post(QUESTIONS_URL, json=SINGLE_Q)).json()
    await client.post(f"{EXAMS_URL}/{exam['id']}/questions", json={"question_ids": [q["id"]]})
    r = await client.delete(f"{EXAMS_URL}/{exam['id']}/questions/{q['id']}")
    assert r.status_code == 200
    assert len(r.json()["exam_questions"]) == 0


async def test_publish_exam_with_questions(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.pub@example.com")
    exam = (await client.post(EXAMS_URL, json={"title": "Pub Exam"})).json()
    q = (await client.post(QUESTIONS_URL, json=SINGLE_Q)).json()
    await client.post(f"{EXAMS_URL}/{exam['id']}/questions", json={"question_ids": [q["id"]]})
    r = await client.post(f"{EXAMS_URL}/{exam['id']}/publish")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "PUBLISHED"
    assert data["published_at"] is not None


async def test_cannot_publish_empty_exam(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.emp@example.com")
    exam = (await client.post(EXAMS_URL, json={"title": "Empty"})).json()
    r = await client.post(f"{EXAMS_URL}/{exam['id']}/publish")
    assert r.status_code == 409


async def test_cannot_edit_published_exam(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.edp@example.com")
    exam = (await client.post(EXAMS_URL, json={"title": "Pub Edit"})).json()
    q = (await client.post(QUESTIONS_URL, json=SINGLE_Q)).json()
    await client.post(f"{EXAMS_URL}/{exam['id']}/questions", json={"question_ids": [q["id"]]})
    await client.post(f"{EXAMS_URL}/{exam['id']}/publish")
    r = await client.patch(f"{EXAMS_URL}/{exam['id']}", json={"title": "Changed"})
    assert r.status_code == 409


async def test_cannot_delete_published_exam(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.delpub@example.com")
    exam = (await client.post(EXAMS_URL, json={"title": "Pub Del"})).json()
    q = (await client.post(QUESTIONS_URL, json=SINGLE_Q)).json()
    await client.post(f"{EXAMS_URL}/{exam['id']}/questions", json={"question_ids": [q["id"]]})
    await client.post(f"{EXAMS_URL}/{exam['id']}/publish")
    r = await client.delete(f"{EXAMS_URL}/{exam['id']}")
    assert r.status_code == 409


async def test_delete_draft_exam(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.deld@example.com")
    exam = (await client.post(EXAMS_URL, json={"title": "Draft Del"})).json()
    r = await client.delete(f"{EXAMS_URL}/{exam['id']}")
    assert r.status_code == 204


async def test_cannot_delete_question_attached_to_exam(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.qattach@example.com")
    exam = (await client.post(EXAMS_URL, json={"title": "Block Del"})).json()
    q = (await client.post(QUESTIONS_URL, json=SINGLE_Q)).json()
    await client.post(f"{EXAMS_URL}/{exam['id']}/questions", json={"question_ids": [q["id"]]})
    r = await client.delete(f"{QUESTIONS_URL}/{q['id']}")
    assert r.status_code == 409


async def test_duplicate_question_in_exam_skipped(client: AsyncClient, db: AsyncSession):
    await _create_and_login_examiner(client, db, "ex.dup@example.com")
    exam = (await client.post(EXAMS_URL, json={"title": "Dup Q"})).json()
    q = (await client.post(QUESTIONS_URL, json=SINGLE_Q)).json()
    await client.post(f"{EXAMS_URL}/{exam['id']}/questions", json={"question_ids": [q["id"]]})
    r = await client.post(f"{EXAMS_URL}/{exam['id']}/questions", json={"question_ids": [q["id"]]})
    assert r.status_code == 200
    assert len(r.json()["exam_questions"]) == 1


async def test_examiner_isolation(client: AsyncClient, db: AsyncSession):
    """Examiner A's exams are not visible to Examiner B."""
    await _create_and_login_examiner(client, db, "ex.iso.a@example.com")
    exam_a = (await client.post(EXAMS_URL, json={"title": "A Private"})).json()

    await _create_and_login_examiner(client, db, "ex.iso.b@example.com")
    r = await client.get(f"{EXAMS_URL}/{exam_a['id']}")
    assert r.status_code == 404
