import csv
import io
import json
import secrets
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.core.deps import require_admin
from app.core.security import hash_password
from app.models.user import User, Role, AuditLog
from app.models.exam import Examination, ExamStatus, ExamQuestion
from app.schemas.auth import (
    AdminCreateUserRequest,
    PatchUserRequest,
    PatchUserStatusRequest,
    UserResponse,
    UserListResponse,
)
from app.services import auth as auth_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: AdminCreateUserRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
):
    try:
        user = await auth_service.admin_create_user(
            db, actor, data.full_name, data.email, data.password, data.role
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return user


@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    role: Role | None = Query(None),
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = select(User)
    if search:
        q = q.where(or_(User.full_name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%")))
    if role:
        q = q.where(User.role == role)
    if is_active is not None:
        q = q.where(User.is_active == is_active)

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()

    q = q.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    users = result.scalars().all()

    return UserListResponse(items=list(users), total=total, page=page, page_size=page_size)


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
async def patch_user(
    user_id: uuid.UUID,
    data: PatchUserRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if data.full_name is not None:
        user.full_name = data.full_name.strip()
    if data.email is not None:
        email = data.email.lower().strip()
        existing = await db.execute(select(User).where(User.email == email, User.id != user_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
        user.email = email

    log = AuditLog(
        actor_id=actor.id,
        action="admin_patch_user",
        resource_type="user",
        resource_id=str(user.id),
        extra_data=json.dumps(data.model_dump(exclude_none=True)),
    )
    db.add(log)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/users/{user_id}/status", response_model=UserResponse)
async def patch_user_status(
    user_id: uuid.UUID,
    data: PatchUserStatusRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
):
    if user_id == actor.id and not data.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = data.is_active
    log = AuditLog(
        actor_id=actor.id,
        action="admin_set_active" if data.is_active else "admin_deactivate",
        resource_type="user",
        resource_id=str(user.id),
    )
    db.add(log)
    await db.commit()
    await db.refresh(user)
    return user


# ── Admin Exams ───────────────────────────────────────────────────────────────

@router.get("/exams")
async def admin_list_exams(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    exam_status: ExamStatus | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = (
        select(Examination, User.full_name.label("creator_name"), User.email.label("creator_email"))
        .join(User, User.id == Examination.creator_id)
    )
    if search:
        q = q.where(Examination.title.ilike(f"%{search}%"))
    if exam_status:
        q = q.where(Examination.status == exam_status)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()

    rows = (await db.execute(
        q.order_by(Examination.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )).all()

    items = []
    for exam, creator_name, creator_email in rows:
        q_count = (await db.execute(
            select(func.count(ExamQuestion.question_id)).where(ExamQuestion.examination_id == exam.id)
        )).scalar_one()
        items.append({
            "id": exam.id,
            "title": exam.title,
            "description": exam.description,
            "status": exam.status.value,
            "total_marks": exam.total_marks,
            "passing_marks": exam.passing_marks,
            "duration_minutes": exam.duration_minutes,
            "creator_id": str(exam.creator_id),
            "creator_name": creator_name,
            "creator_email": creator_email,
            "question_count": q_count,
            "updated_at": exam.updated_at.isoformat() if exam.updated_at else None,
        })
    return {"items": items, "total": total, "page": page, "page_size": page_size}


# ── Bulk User Import ──────────────────────────────────────────────────────────

class BulkImportRow(BaseModel):
    row_number: int
    full_name: str
    email: str
    role: str
    errors: list[str]
    is_duplicate: bool


class BulkImportParseResponse(BaseModel):
    valid_count: int
    invalid_count: int
    duplicate_count: int
    rows: list[BulkImportRow]


class BulkImportConfirmRequest(BaseModel):
    rows: list[BulkImportRow]


def _raw_rows_csv(content: bytes) -> list[dict]:
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    return [dict(row) for row in reader]


def _raw_rows_xlsx(content: bytes) -> list[dict]:
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h).strip().lower() if h else "" for h in rows[0]]
    result = []
    for row in rows[1:]:
        d = {headers[i]: (str(v).strip() if v is not None else "") for i, v in enumerate(row) if i < len(headers)}
        result.append(d)
    return result


@router.post("/users/bulk-import/parse", response_model=BulkImportParseResponse)
async def parse_bulk_import(
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    fname = (file.filename or "").lower()
    try:
        if fname.endswith(".xlsx") or fname.endswith(".xls"):
            raw_rows = _raw_rows_xlsx(content)
        elif fname.endswith(".csv"):
            raw_rows = _raw_rows_csv(content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Upload .csv or .xlsx.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {exc}")

    if not raw_rows:
        raise HTTPException(status_code=400, detail="File is empty or has no data rows.")

    emails_in_file: set[str] = set()
    rows: list[BulkImportRow] = []
    valid_count = invalid_count = duplicate_count = 0
    VALID_ROLES = {"EXAMINER", "CANDIDATE"}

    for i, r in enumerate(raw_rows):
        errors: list[str] = []
        full_name = (r.get("full_name") or "").strip()
        email = (r.get("email") or "").strip().lower()
        role = (r.get("role") or "").strip().upper()

        if not full_name or len(full_name) < 2:
            errors.append("full_name is required (min 2 chars)")
        if not email or "@" not in email:
            errors.append("email is invalid")
        if role not in VALID_ROLES:
            errors.append(f"role must be EXAMINER or CANDIDATE")

        is_duplicate = False
        if not errors and email:
            if email in emails_in_file:
                is_duplicate = True
                duplicate_count += 1
            else:
                emails_in_file.add(email)
                existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
                if existing:
                    is_duplicate = True
                    duplicate_count += 1

        if errors or is_duplicate:
            invalid_count += 1
        else:
            valid_count += 1

        rows.append(BulkImportRow(
            row_number=i + 2,
            full_name=full_name,
            email=email,
            role=role,
            errors=errors,
            is_duplicate=is_duplicate,
        ))

    return BulkImportParseResponse(
        valid_count=valid_count,
        invalid_count=invalid_count,
        duplicate_count=duplicate_count,
        rows=rows,
    )


@router.post("/users/bulk-import/confirm")
async def confirm_bulk_import(
    body: BulkImportConfirmRequest,
    actor: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    valid_rows = [r for r in body.rows if not r.errors and not r.is_duplicate]
    if not valid_rows:
        raise HTTPException(status_code=400, detail="No valid rows to import.")

    created = skipped = 0
    async with db.begin():
        for row in valid_rows:
            existing = (await db.execute(select(User).where(User.email == row.email))).scalar_one_or_none()
            if existing:
                skipped += 1
                continue
            pw = secrets.token_urlsafe(16)
            user = User(
                id=uuid.uuid4(),
                full_name=row.full_name,
                email=row.email,
                password_hash=hash_password(pw),
                role=Role[row.role],
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            await db.flush()
            db.add(AuditLog(
                actor_id=actor.id,
                action="admin_bulk_create_user",
                resource_type="user",
                resource_id=str(user.id),
                extra_data=json.dumps({"email": row.email, "role": row.role}),
            ))
            created += 1

    return {"created": created, "skipped": skipped}
