"""Phase 8 tests: Notifications."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update, select

from app.models.user import User, Role


async def _reg(client: AsyncClient, email: str, password: str = "Pass@12345"):
    await client.post("/api/v1/auth/register", json={
        "full_name": "Test", "email": email, "password": password, "confirm_password": password,
    })
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200


async def _promote(db: AsyncSession, email: str, role: Role):
    await db.execute(update(User).where(User.email == email).values(role=role))
    await db.commit()


async def _setup_enroll_submit(client: AsyncClient, db: AsyncSession, suffix: str):
    """Create examiner+exam, enroll candidate, return (ex_email, cand_email, exam_id, attempt_id)."""
    ex_email = f"ex8_{suffix}@n.com"
    await _reg(client, ex_email)
    await _promote(db, ex_email, Role.EXAMINER)

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.post("/api/v1/exams", json={
        "title": f"P8 Exam {suffix}", "duration_minutes": 60, "total_marks": 5, "passing_marks": 3,
    })
    exam_id = r.json()["id"]
    r = await client.post("/api/v1/questions", json={
        "question_type": "SINGLE_CHOICE", "text": "1+1?", "marks": 5,
        "choices": [
            {"text": "2", "is_correct": True, "order_index": 0},
            {"text": "3", "is_correct": False, "order_index": 1},
        ],
    })
    q_id = r.json()["id"]
    await client.post(f"/api/v1/exams/{exam_id}/questions", json={"question_ids": [q_id]})
    await client.post(f"/api/v1/exams/{exam_id}/publish")

    cand_email = f"cand8_{suffix}@n.com"
    await _reg(client, cand_email)
    cand = (await db.execute(select(User).where(User.email == cand_email))).scalar_one()

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/exams/{exam_id}/enroll", json={"candidate_id": str(cand.id)})

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.post(f"/api/v1/candidate/my-exams/{exam_id}/start")
    attempt_id = r.json()["attempt_id"]

    return ex_email, cand_email, exam_id, attempt_id


@pytest.mark.asyncio
async def test_enroll_creates_candidate_notification(client: AsyncClient, db: AsyncSession):
    """Enrolling a candidate creates an EXAM_ASSIGNED notification for them."""
    ex_email, cand_email, exam_id, _ = await _setup_enroll_submit(client, db, "n1")

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.get("/api/v1/notifications")
    assert r.status_code == 200
    notifs = r.json()
    exam_assigned = [n for n in notifs if n["notification_type"] == "EXAM_ASSIGNED"]
    assert len(exam_assigned) >= 1
    assert str(exam_id) == exam_assigned[0]["related_entity_id"]


@pytest.mark.asyncio
async def test_submit_creates_examiner_notification(client: AsyncClient, db: AsyncSession):
    """Submitting creates EXAM_SUBMITTED notification for the examiner."""
    ex_email, cand_email, _, attempt_id = await _setup_enroll_submit(client, db, "n2")

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/attempts/{attempt_id}/submit")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    r = await client.get("/api/v1/notifications")
    submitted = [n for n in r.json() if n["notification_type"] == "EXAM_SUBMITTED"]
    assert len(submitted) >= 1


@pytest.mark.asyncio
async def test_publish_creates_candidate_notification(client: AsyncClient, db: AsyncSession):
    """Publishing result creates RESULT_PUBLISHED notification for candidate."""
    ex_email, cand_email, _, attempt_id = await _setup_enroll_submit(client, db, "n3")

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/candidate/attempts/{attempt_id}/submit")

    await client.post("/api/v1/auth/login", json={"email": ex_email, "password": "Pass@12345"})
    await client.post(f"/api/v1/examiner/attempts/{attempt_id}/finalize-grading")
    await client.post(f"/api/v1/examiner/attempts/{attempt_id}/publish-result")

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.get("/api/v1/notifications")
    published = [n for n in r.json() if n["notification_type"] == "RESULT_PUBLISHED"]
    assert len(published) >= 1


@pytest.mark.asyncio
async def test_unread_count(client: AsyncClient, db: AsyncSession):
    """Unread count reflects actual unread notifications."""
    _, cand_email, _, _ = await _setup_enroll_submit(client, db, "n4")

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.get("/api/v1/notifications/unread-count")
    assert r.status_code == 200
    assert r.json()["unread_count"] >= 1


@pytest.mark.asyncio
async def test_mark_notification_read(client: AsyncClient, db: AsyncSession):
    """Marking a notification read sets is_read=True."""
    _, cand_email, _, _ = await _setup_enroll_submit(client, db, "n5")

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.get("/api/v1/notifications")
    notif_id = r.json()[0]["id"]

    r = await client.patch(f"/api/v1/notifications/{notif_id}/read")
    assert r.status_code == 200
    assert r.json()["is_read"] is True
    assert r.json()["read_at"] is not None


@pytest.mark.asyncio
async def test_mark_all_read(client: AsyncClient, db: AsyncSession):
    """Mark all read sets all to read and returns count."""
    _, cand_email, _, _ = await _setup_enroll_submit(client, db, "n6")

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.patch("/api/v1/notifications/read-all")
    assert r.status_code == 200
    assert r.json()["marked_count"] >= 1

    r = await client.get("/api/v1/notifications/unread-count")
    assert r.json()["unread_count"] == 0


@pytest.mark.asyncio
async def test_delete_notification(client: AsyncClient, db: AsyncSession):
    """Deleting a notification removes it."""
    _, cand_email, _, _ = await _setup_enroll_submit(client, db, "n7")

    await client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Pass@12345"})
    r = await client.get("/api/v1/notifications")
    notif_id = r.json()[0]["id"]
    count_before = len(r.json())

    r = await client.delete(f"/api/v1/notifications/{notif_id}")
    assert r.status_code == 204

    r = await client.get("/api/v1/notifications")
    assert len(r.json()) == count_before - 1


@pytest.mark.asyncio
async def test_notification_isolation(client: AsyncClient, db: AsyncSession):
    """User A cannot mark or delete User B's notifications."""
    _, cand_a_email, _, _ = await _setup_enroll_submit(client, db, "n8a")
    _, cand_b_email, _, _ = await _setup_enroll_submit(client, db, "n8b")

    await client.post("/api/v1/auth/login", json={"email": cand_a_email, "password": "Pass@12345"})
    r = await client.get("/api/v1/notifications")
    notif_id = r.json()[0]["id"]

    # Log in as B, try to read A's notification
    await client.post("/api/v1/auth/login", json={"email": cand_b_email, "password": "Pass@12345"})
    r = await client.patch(f"/api/v1/notifications/{notif_id}/read")
    assert r.status_code == 404

    r = await client.delete(f"/api/v1/notifications/{notif_id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_unauthenticated_blocked(client: AsyncClient):
    """Notification endpoints require authentication."""
    # Ensure no active session
    r = await client.get("/api/v1/notifications")
    assert r.status_code in (401, 403)
