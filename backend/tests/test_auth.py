import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User, Role
from app.core.security import hash_password


pytestmark = pytest.mark.asyncio


async def test_register_candidate(client: AsyncClient):
    r = await client.post("/api/v1/auth/register", json={
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "password123",
    })
    assert r.status_code == 201
    data = r.json()
    assert data["email"] == "test@example.com"
    assert data["role"] == "CANDIDATE"
    assert "password_hash" not in data


async def test_register_duplicate_email(client: AsyncClient):
    payload = {"full_name": "Dup User", "email": "dup@example.com", "password": "password123"}
    await client.post("/api/v1/auth/register", json=payload)
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 409


async def test_register_invalid_email(client: AsyncClient):
    r = await client.post("/api/v1/auth/register", json={
        "full_name": "Bad Email",
        "email": "not-an-email",
        "password": "password123",
    })
    assert r.status_code == 422


async def test_register_weak_password(client: AsyncClient):
    r = await client.post("/api/v1/auth/register", json={
        "full_name": "Weak Pass",
        "email": "weak@example.com",
        "password": "short",
    })
    assert r.status_code == 422


async def test_login_success(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "full_name": "Login User",
        "email": "login@example.com",
        "password": "password123",
    })
    r = await client.post("/api/v1/auth/login", json={
        "email": "login@example.com",
        "password": "password123",
    })
    assert r.status_code == 200
    assert r.json()["access_token"]
    assert "access_token" in r.cookies
    assert "refresh_token" in r.cookies


async def test_login_invalid_credentials(client: AsyncClient):
    r = await client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com",
        "password": "wrongpass",
    })
    assert r.status_code == 401


async def test_login_inactive_account(client: AsyncClient, db: AsyncSession):
    await client.post("/api/v1/auth/register", json={
        "full_name": "Inactive User",
        "email": "inactive@example.com",
        "password": "password123",
    })
    result = await db.execute(select(User).where(User.email == "inactive@example.com"))
    user = result.scalar_one()
    user.is_active = False
    await db.commit()

    r = await client.post("/api/v1/auth/login", json={
        "email": "inactive@example.com",
        "password": "password123",
    })
    assert r.status_code == 401


async def test_me_endpoint(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "full_name": "Me User",
        "email": "me@example.com",
        "password": "password123",
    })
    await client.post("/api/v1/auth/login", json={
        "email": "me@example.com",
        "password": "password123",
    })
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == "me@example.com"


async def test_refresh_token_rotation(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "full_name": "Refresh User",
        "email": "refresh@example.com",
        "password": "password123",
    })
    await client.post("/api/v1/auth/login", json={
        "email": "refresh@example.com",
        "password": "password123",
    })
    r = await client.post("/api/v1/auth/refresh")
    assert r.status_code == 200
    assert r.json()["access_token"]
    assert "refresh_token" in r.cookies


async def test_logout_revokes_session(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "full_name": "Logout User",
        "email": "logout@example.com",
        "password": "password123",
    })
    await client.post("/api/v1/auth/login", json={
        "email": "logout@example.com",
        "password": "password123",
    })
    r = await client.post("/api/v1/auth/logout")
    assert r.status_code == 204
    # Refresh should now fail
    r2 = await client.post("/api/v1/auth/refresh")
    assert r2.status_code == 401


async def test_me_unauthenticated(client: AsyncClient):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401


async def test_argon2_hash_format(db: AsyncSession):
    from app.core.security import hash_password, verify_password
    h = hash_password("mypassword")
    assert h.startswith("$argon2id$")
    assert verify_password("mypassword", h)
    assert not verify_password("wrongpass", h)


async def test_role_based_access_admin_only(client: AsyncClient):
    # Candidate cannot access admin endpoints
    await client.post("/api/v1/auth/register", json={
        "full_name": "Candidate",
        "email": "cand_rbac@example.com",
        "password": "password123",
    })
    await client.post("/api/v1/auth/login", json={
        "email": "cand_rbac@example.com",
        "password": "password123",
    })
    r = await client.get("/api/v1/admin/users")
    assert r.status_code == 403
