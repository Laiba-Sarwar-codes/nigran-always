import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User

pytestmark = pytest.mark.asyncio


async def _register_login(client: AsyncClient, email: str, role_override=None, db: AsyncSession = None):
    """Helper: register candidate, optionally promote role, then login."""
    await client.post("/api/v1/auth/register", json={
        "full_name": "Test", "email": email, "password": "password123"
    })
    if role_override and db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one()
        user.role = role_override
        await db.commit()
    await client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})


# ── /dashboard/me ──────────────────────────────────────────────────────────────

async def test_dashboard_me_authenticated(client: AsyncClient):
    await _register_login(client, "dm_cand@test.com")
    r = await client.get("/api/v1/dashboard/me")
    assert r.status_code == 200
    assert r.json()["email"] == "dm_cand@test.com"


async def test_dashboard_me_unauthenticated(client: AsyncClient):
    r = await client.get("/api/v1/dashboard/me")
    assert r.status_code == 401


# ── Admin stats ────────────────────────────────────────────────────────────────

async def test_admin_stats_requires_admin(client: AsyncClient):
    await _register_login(client, "admin_stats_cand@test.com")
    r = await client.get("/api/v1/dashboard/admin/stats")
    assert r.status_code == 403


async def test_admin_stats_works_for_admin(client: AsyncClient, db: AsyncSession):
    from app.models.user import Role
    await _register_login(client, "admin_stats_admin@test.com", Role.ADMIN, db)
    r = await client.get("/api/v1/dashboard/admin/stats")
    assert r.status_code == 200
    data = r.json()
    assert "total_users" in data
    assert "candidates" in data
    assert "examiners" in data
    assert "active_users" in data
    assert data["total_users"] >= 1


async def test_admin_stats_counts_are_correct(client: AsyncClient, db: AsyncSession):
    from app.models.user import Role
    await _register_login(client, "count_cand1@test.com")
    await _register_login(client, "count_admin@test.com", Role.ADMIN, db)
    r = await client.get("/api/v1/dashboard/admin/stats")
    assert r.status_code == 200
    data = r.json()
    assert data["candidates"] >= 1
    assert data["total_users"] >= 2


# ── Admin activity ──────────────────────────────────────────────────────────────

async def test_admin_activity_requires_admin(client: AsyncClient):
    await _register_login(client, "activity_cand@test.com")
    r = await client.get("/api/v1/dashboard/admin/activity")
    assert r.status_code == 403


async def test_admin_activity_returns_paginated(client: AsyncClient, db: AsyncSession):
    from app.models.user import Role
    await _register_login(client, "activity_admin@test.com", Role.ADMIN, db)
    r = await client.get("/api/v1/dashboard/admin/activity")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 0


# ── Examiner ───────────────────────────────────────────────────────────────────

async def test_examiner_stats_requires_examiner(client: AsyncClient):
    await _register_login(client, "ex_stats_cand@test.com")
    r = await client.get("/api/v1/dashboard/examiner/stats")
    assert r.status_code == 403


async def test_examiner_stats_works_for_examiner(client: AsyncClient, db: AsyncSession):
    from app.models.user import Role
    await _register_login(client, "ex_stats_ex@test.com", Role.EXAMINER, db)
    r = await client.get("/api/v1/dashboard/examiner/stats")
    assert r.status_code == 200
    data = r.json()
    assert "total_examinations" in data


async def test_examiner_recent_exams_empty(client: AsyncClient, db: AsyncSession):
    from app.models.user import Role
    await _register_login(client, "ex_recent@test.com", Role.EXAMINER, db)
    r = await client.get("/api/v1/dashboard/examiner/recent-exams")
    assert r.status_code == 200
    assert r.json()["items"] == []


# ── Candidate ──────────────────────────────────────────────────────────────────

async def test_candidate_summary_requires_candidate(client: AsyncClient, db: AsyncSession):
    from app.models.user import Role
    await _register_login(client, "cand_sum_admin@test.com", Role.ADMIN, db)
    r = await client.get("/api/v1/dashboard/candidate/summary")
    assert r.status_code == 403


async def test_candidate_summary_works(client: AsyncClient):
    await _register_login(client, "cand_sum@test.com")
    r = await client.get("/api/v1/dashboard/candidate/summary")
    assert r.status_code == 200
    data = r.json()
    assert "assigned_examinations" in data
    assert "published_results" in data


async def test_candidate_results_empty(client: AsyncClient):
    await _register_login(client, "cand_res@test.com")
    r = await client.get("/api/v1/dashboard/candidate/results")
    assert r.status_code == 200
    assert r.json()["items"] == []


async def test_cross_role_rejection_examiner_cant_see_admin_stats(client: AsyncClient, db: AsyncSession):
    from app.models.user import Role
    await _register_login(client, "cross_role_ex@test.com", Role.EXAMINER, db)
    r = await client.get("/api/v1/dashboard/admin/stats")
    assert r.status_code == 403


async def test_unauthenticated_blocked_all_endpoints(client: AsyncClient):
    for path in [
        "/api/v1/dashboard/admin/stats",
        "/api/v1/dashboard/examiner/stats",
        "/api/v1/dashboard/candidate/summary",
    ]:
        r = await client.get(path)
        assert r.status_code in (401, 403), f"{path} should be protected"
