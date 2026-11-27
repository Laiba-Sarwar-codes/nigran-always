git status
# NIGRANI ALWAYS — PRODUCT REQUIREMENTS DOCUMENT

## 1. Product Overview

Nigrani Always is a Secure Examination Management System.

The platform enables administrators to manage users, examiners to create and conduct examinations, and candidates to take secure online examinations.

The goal is a complete, functional hackathon MVP.

## 2. User Roles

### Administrator
- Secure login.
- Manage users.
- Create examiner accounts.
- Activate and deactivate accounts.
- View examinations and platform activity.
- Access audit records.

### Examiner
- Manage question bank.
- Create and edit questions.
- Create and configure examinations.
- Schedule examinations.
- Enroll candidates.
- Publish examinations.
- Monitor attempts.
- Grade written answers.
- Publish results.
- View examination statistics.

### Candidate
- Register and log in.
- View assigned examinations.
- Read instructions.
- Start eligible examinations.
- Answer questions.
- Navigate questions.
- Mark questions for review.
- See answer-saving status.
- Resume after refresh.
- Submit examinations.
- View published results.

## 3. Functional Requirements

### Authentication
- Candidate registration.
- Login and logout.
- JWT authentication.
- Argon2id password hashing.
- Refresh-token rotation and revocation.
- Role-based authorization.
- User activation and deactivation.
- Administrator-created examiner accounts.

Public registration must always create CANDIDATE accounts. Never trust a role supplied by the registration form.

### Question Bank
Support:
1. Single-choice MCQ.
2. Multiple-select MCQ.
3. Written response.

Question fields:
- Question text.
- Question type.
- Choices.
- Correct answers.
- Marks.
- Difficulty.
- Category.
- Optional explanation.

Support creating, viewing, editing, searching and filtering questions.

Correct answers must never be exposed to candidates.

### Examination Management
Examiners must be able to:
- Create examinations.
- Edit draft examinations.
- Configure title and description.
- Set instructions.
- Set start and end times.
- Set duration.
- Set total and passing marks.
- Attach questions.
- Assign candidates.
- Preview examinations.
- Publish examinations.

Lifecycle:
DRAFT → PUBLISHED → ONGOING → COMPLETED.

Protect active examinations from destructive configuration changes.

### Candidate Examination Engine
Provide:
- Eligibility validation.
- Server-authoritative attempt creation.
- Immutable question snapshots.
- Countdown timer.
- Question navigation.
- Answer controls.
- Mark for review.
- Progress indicators.
- Answer persistence.
- Refresh recovery.
- Submission.

The backend, not the browser, controls deadlines.

### Autosave and Submission
- Persist answers through backend APIs.
- Show saving, saved, pending and failed states.
- Recover server-confirmed answers after refresh.
- Retry failed requests safely.
- Prevent duplicate submissions.
- Lock submitted attempts.
- Handle expired attempts.

Do not claim an answer is server-saved before backend confirmation.

### Grading
Automatic:
- Single-choice MCQ.
- Exact-match multiple-select MCQ.

Manual:
- Written answer review.
- Awarded marks.
- Examiner feedback.
- Maximum-mark validation.

### Results
- Calculate marks on the backend.
- Calculate percentages.
- Determine pass/fail.
- Publish results.
- Allow candidates to view only their own published results.

### Network Resilience
- Online/offline detection.
- Pending answer queue using IndexedDB where feasible.
- Retry synchronization.
- Reconnection handling.
- Conflict handling.
- Never extend deadlines because of network interruption.

## 4. Non-Functional Requirements

Security:
- Argon2id.
- JWT authentication.
- Secure refresh-token handling.
- Role and resource-level authorization.
- Input validation.
- Parameterized database operations.
- Rate limiting.
- Audit logging.
- No answer-key leakage.
- No unauthorized result access.
- No secrets committed to Git.

Reliability:
- Database transactions.
- Idempotent submissions.
- Server-authoritative deadlines.
- Answer persistence.
- Recovery after refresh.

Usability:
- Responsive interface.
- Consistent design.
- Loading, error and empty states.
- Accessible forms.
- Clear navigation.

## 5. Locked Technology Stack

Frontend:
- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- shadcn/ui.
- React Router.
- TanStack Query.
- Axios.
- React Hook Form.
- Zod.

Backend:
- Python.
- FastAPI.
- SQLAlchemy 2.
- Pydantic v2.
- Alembic.
- Uvicorn.
- Psycopg 3.

Database:
- PostgreSQL 18 exclusively.

Authentication:
- Argon2id.
- JWT.

Testing:
- Pytest.
- HTTPX.
- Vitest.
- Playwright.

Do not use SQL Server, SQLite or MySQL.
Do not introduce unnecessary microservices or infrastructure.

## 6. Database Requirements

Suggested entities:
- User.
- RefreshSession.
- AuditLog.
- Examination.
- Question.
- Choice.
- ExamQuestion.
- Enrollment.
- Attempt.
- AttemptQuestion.
- Response.
- Result.

Use:
- UUID identifiers where appropriate.
- Foreign keys.
- Unique constraints.
- Database indexes.
- Transactions.
- UTC timestamps.

Use SQLAlchemy models and Alembic migrations.

Every database schema change must have a migration, applied and verified against actual PostgreSQL.

## 7. Phase-wise Execution

### Phase 1 — Project Foundation
STATUS: COMPLETE according to supplied acceptance report.

- GitHub repository initialized.
- React and Vite configured.
- FastAPI configured.
- PostgreSQL 18 connected.
- SQLAlchemy configured.
- Alembic configured.
- Health endpoints verified.
- Frontend build passed.
- Initial commit: 3ed83e0.

### Phase 2 — Authentication and User Management
- Candidate registration.
- Login and logout.
- JWT and refresh-token rotation.
- Argon2id.
- Current-user endpoint.
- Role-based authorization.
- Administrator user management.
- Account activation and deactivation.
- Audit logging.

### Phase 3 — Role-Specific Dashboards
- Administrator dashboard.
- Examiner dashboard.
- Candidate dashboard.
- Real API-backed statistics.
- Protected navigation.
- Loading and error states.

### Phase 4 — Question Bank and Examination Management
- All three question types.
- Question CRUD.
- Search and filtering.
- Examination creation and configuration.
- Question assignment.
- Candidate enrollment.
- Preview and publication.
- Examination lifecycle.

### Phase 5 — Candidate Examination Engine
- Assigned examination list.
- Instructions.
- Eligibility.
- Attempt creation.
- Question snapshots.
- Countdown timer.
- Navigation.
- Answer controls.
- Mark for review.

### Phase 6 — Autosave, Recovery and Submission
- Backend answer persistence.
- Autosave indicators.
- Refresh recovery.
- Server-authoritative deadlines.
- Idempotent submission.
- Attempt locking.
- Expiry handling.

### Phase 7 — Grading and Results
- Automatic MCQ grading.
- Manual written grading.
- Marks validation.
- Result calculation.
- Result publication.
- Candidate result viewing.

### Phase 8 — Network Resilience
- Offline detection.
- Pending-answer queue.
- Reconnection synchronization.
- Retry logic.
- Conflict handling.
- Basic reliability improvements.

### Phase 9 — Integration, Security, UAT and Deployment
- Full end-to-end tests.
- Role-boundary tests.
- Examination lifecycle tests.
- Database migration verification.
- Security review.
- Responsive checks.
- Production build.
- Deployment configuration.
- Final demonstration readiness.

## 8. Mandatory End-to-End UAT

Verify this complete workflow:

1. Administrator logs in.
2. Administrator creates an examiner.
3. Examiner logs in.
4. Examiner creates all three question types.
5. Examiner creates an examination.
6. Examiner attaches questions.
7. Examiner enrolls a candidate.
8. Examiner publishes the examination.
9. Candidate logs in.
10. Candidate starts the examination.
11. Candidate answers all question types.
12. Candidate marks a question for review.
13. Candidate refreshes the page.
14. Saved answers are restored.
15. Candidate submits.
16. Examiner reviews the attempt.
17. Examiner grades written answers.
18. Examiner publishes results.
19. Candidate views their result.

Also test unauthorized access, expiry, duplicate submission, invalid marks, database errors and result privacy.

## 9. Development Rules

Act as the sole full-stack developer.

For every phase:
1. Inspect existing code.
2. Implement frontend functionality.
3. Implement matching backend APIs.
4. Implement database changes.
5. Generate and apply migrations.
6. Integrate actual frontend APIs.
7. Write and execute automated tests.
8. Perform relevant UAT.
9. Fix discovered defects.
10. Verify security and data integrity.
11. Commit and push completed work.
12. Report actual results.

Never create fake functionality or placeholder buttons for essential features.

Preserve existing working code.

Never force-push or commit secrets.

## 10. Four-Hour Hackathon Priority

Prioritize the complete examination lifecycle.

Essential:
- Authentication and roles.
- Exam creation.
- Question management.
- Candidate assignment.
- Examination interface.
- Timer.
- Autosave.
- Submission.
- Grading.
- Results.

Defer advanced analytics, elaborate animations and advanced offline functionality if necessary.

## 11. Definition of Done

The product is complete when all three roles can use the actual application to complete the entire examination lifecycle.

All essential APIs, database operations, frontend workflows, migrations and UAT checks must be verified.

Provide a final report distinguishing:
- Completed and verified.
- Partially implemented.
- Deferred.
- Known issues.
- Test evidence.
- Deployment status.

The goal is one complete, integrated examination management system, not disconnected prototypes.
