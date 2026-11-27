# Nigrani Always

A modern institutional examination management platform built with FastAPI, React, and PostgreSQL.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui |
| Backend | FastAPI · SQLAlchemy 2 · Pydantic v2 · Alembic · Uvicorn |
| Database | PostgreSQL 18 |
| Auth | Argon2id · JWT · Secure refresh tokens |
| Testing | Pytest · HTTPX · Vitest · Playwright |

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 18 (running)

---

## Installation

### 1. Clone

```bash
git clone https://github.com/Laiba-Sarwar-codes/nigran-always.git
cd nigran-always
```

### 2. Environment

```bash
cp .env.example .env
# Edit .env — set SECRET_KEY and DATABASE_URL
```

### 3. PostgreSQL — Create Database

```bash
psql -h localhost -U postgres
CREATE DATABASE nigrani_always;
\q
```

### 4. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Copy the root `.env` into `backend/`:
```bash
cp ../.env .env
```

Run migrations:
```bash
alembic upgrade head
```

Start the server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `APP_ENV` | `development` or `production` |
| `SECRET_KEY` | Random string ≥ 32 chars for JWT signing |
| `DATABASE_URL` | `postgresql+psycopg://user:pass@localhost:5432/nigrani_always` |
| `CORS_ORIGINS` | JSON array of allowed origins |
| `VITE_API_BASE_URL` | Frontend API base URL |

---

## Health Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Application alive check |
| `GET /ready` | Database connectivity check |
| `GET /api/v1/health` | Versioned health |
| `GET /api/v1/ready` | Versioned readiness |

---

## Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "describe change"

# Apply all pending migrations
alembic upgrade head

# Roll back one step
alembic downgrade -1

# Show current revision
alembic current
```

---

## Running Tests

```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm test

# E2E
cd frontend && npm run test:e2e
```

---

## Troubleshooting

**PostgreSQL connection refused**
- Verify PostgreSQL is running: `pg_isready -h localhost`
- Check `DATABASE_URL` in `.env` has the correct password

**`psycopg` import error**
- Ensure `psycopg[binary]` is installed, not `psycopg2`

**Vite `@` alias not resolving**
- Confirm `vite.config.ts` has the path alias and `tsconfig.app.json` has `paths`

**CORS errors from frontend**
- Add `http://localhost:5173` to `CORS_ORIGINS` in `.env`
