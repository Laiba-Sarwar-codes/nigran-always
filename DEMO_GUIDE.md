# Nigrani Always — Demo Guide

## Overview

Nigrani Always is a Secure Examination Management System supporting three roles:
**ADMIN**, **EXAMINER**, and **CANDIDATE**.

## Technology Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Backend    | FastAPI, SQLAlchemy 2 async, Pydantic v2    |
| Database   | PostgreSQL 18 + Alembic migrations          |
| Auth       | JWT (HttpOnly cookies) + refresh rotation   |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS    |
| State      | TanStack Query, React Router                |

---

## Local Startup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 18 running locally

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Edit .env or export environment variables (see below)
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Minimum `.env`** (save as `backend/.env`):
```
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/nigrani_always
SECRET_KEY=change-this-in-production
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:8000`.

---

## Demo Accounts

Create these once after running migrations:

| Role      | Email                          | Password      |
|-----------|--------------------------------|---------------|
| ADMIN     | `admin@demo.com`               | `Admin@12345` |
| EXAMINER  | `examiner@demo.com`            | `Pass@12345`  |
| CANDIDATE | `candidate@demo.com`           | `Pass@12345`  |

**Setup steps:**
1. Register all three accounts via `/register` (all start as CANDIDATE).
2. Log in as ADMIN → Users → promote `examiner@demo.com` to EXAMINER.
3. Promote `admin@demo.com` to ADMIN if needed (use psql or test helper).

---

## Complete Demo Workflow

### A. Admin
1. Login as `admin@demo.com`.
2. Dashboard → see platform stats (users, exams).
3. Users → verify roles, activate/deactivate accounts.
4. Activity → audit log of all important events.

### B. Examiner
1. Login as `examiner@demo.com`.
2. Dashboard → see submitted attempts, pending grading, published results.
3. Question Bank → create:
   - **Single-choice**: "What is 2+2?" → choices: "4" (correct), "5"
   - **Multiple-choice**: "Select even numbers" → "2" ✓, "4" ✓, "7"
   - **Written**: "Explain Newton's first law."
4. Examinations → Create exam (title, 60 min, 10 marks, passing 6).
5. Exam detail → Attach the three questions → Publish.
6. Exam detail → Enroll `candidate@demo.com`.
7. Candidate receives notification: "Exam assigned."

### C. Candidate
1. Login as `candidate@demo.com`.
2. Notification bell → see "Exam assigned" notification.
3. My Exams → open the exam → Start.
4. Answer questions, mark one for review, check the flag.
5. Refresh browser → attempt recovers, answers preserved.
6. Submit → "Submission confirmed" message.

### D. Back to Examiner
1. Notification bell → "New submission ready."
2. Submissions → find the candidate → Grade.
3. Auto-graded questions show marks already.
4. Grade the written response (award marks + feedback).
5. "Finalize grading" button appears when all written are graded.
6. Finalize → Publish result.
7. Candidate receives "Result published" notification.

### E. Candidate views result
1. Notification bell → "Your result is available."
2. My Results → see the exam result with question breakdown and feedback.

---

## Expected Behavior

| Action                            | Expected                                             |
|-----------------------------------|------------------------------------------------------|
| Register                          | Always creates CANDIDATE role                        |
| Access admin page as CANDIDATE    | 403 Forbidden                                        |
| View another candidate's result   | 404 Not Found                                        |
| Submit already-submitted attempt  | Idempotent (returns existing)                        |
| Answer after submission           | 400 Attempt already submitted                        |
| Grade written > max marks         | 400 Cannot exceed max marks                          |
| Publish before finalization       | 400 Must finalize grading first                      |
| Candidate view before publication | Empty results list                                   |
| Network drops during exam         | Answers queued in IndexedDB; sync on reconnect       |

---

## Health Check

```
GET http://localhost:8000/api/v1/health
```
Returns `{"status": "ok"}`.

---

## Known Limitations

- No email/SMS notifications (in-app only).
- No exam scheduling/time-window enforcement (deadline via duration only).
- No webcam or proctoring.
- Reminder notifications require a cron job (not yet wired).
- Production deployment requires explicit `SECRET_KEY`, HTTPS, and updated `CORS_ORIGINS`.

---

## Production Configuration

```bash
# Required environment variables in production:
SECRET_KEY=<strong-random-secret>
DATABASE_URL=postgresql+psycopg://<user>:<pass>@<host>/<db>
CORS_ORIGINS=["https://your-domain.com"]
APP_ENV=production
```

Run migrations before starting: `alembic upgrade head`

Never hardcode secrets. Never commit `.env` to version control.
