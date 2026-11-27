"""
Bulk question upload: parse CSV/Excel → validate → preview → confirm import.
Endpoints are mounted under /questions.
"""
import csv
import io
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_examiner
from app.db.deps import get_db
from app.models.exam import Choice, Question, QuestionType
from app.models.user import User

router = APIRouter()

VALID_TYPES = {t.value for t in QuestionType}


class ParsedChoice(BaseModel):
    text: str
    is_correct: bool


class ParsedRow(BaseModel):
    row_number: int
    question_type: str
    text: str
    marks: float
    choices: list[ParsedChoice]
    errors: list[str]


class BulkParseResponse(BaseModel):
    valid_count: int
    invalid_count: int
    rows: list[ParsedRow]


class BulkConfirmRequest(BaseModel):
    rows: list[ParsedRow]


class BulkConfirmResponse(BaseModel):
    created: int


def _parse_row(row_number: int, fields: dict[str, str]) -> ParsedRow:
    errors: list[str] = []

    qtype = (fields.get("type") or "").strip().upper()
    if qtype not in VALID_TYPES:
        errors.append(f"type must be one of {', '.join(VALID_TYPES)}")

    text = (fields.get("text") or "").strip()
    if not text:
        errors.append("text is required")

    marks_raw = (fields.get("marks") or "").strip()
    try:
        marks = float(marks_raw)
        if marks <= 0:
            raise ValueError
    except (ValueError, TypeError):
        marks = 0.0
        errors.append("marks must be a positive number")

    choices: list[ParsedChoice] = []
    for i in range(1, 7):
        ct = (fields.get(f"choice{i}") or "").strip()
        if not ct:
            break
        raw_correct = (fields.get(f"choice{i}_correct") or "false").strip().lower()
        is_correct = raw_correct in ("true", "1", "yes")
        choices.append(ParsedChoice(text=ct, is_correct=is_correct))

    if qtype in ("SINGLE_CHOICE", "MULTIPLE_CHOICE"):
        if len(choices) < 2:
            errors.append("choice questions need at least 2 choices")
        correct_count = sum(1 for c in choices if c.is_correct)
        if qtype == "SINGLE_CHOICE" and correct_count != 1:
            errors.append("SINGLE_CHOICE must have exactly 1 correct choice")
        if qtype == "MULTIPLE_CHOICE" and correct_count < 1:
            errors.append("MULTIPLE_CHOICE must have at least 1 correct choice")

    return ParsedRow(
        row_number=row_number,
        question_type=qtype,
        text=text,
        marks=marks,
        choices=choices,
        errors=errors,
    )


def _rows_from_csv(content: bytes) -> list[dict[str, str]]:
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    return [dict(row) for row in reader]


def _rows_from_excel(content: bytes) -> list[dict[str, str]]:
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h).strip() if h is not None else "" for h in rows[0]]
    result = []
    for row in rows[1:]:
        d = {headers[i]: (str(v).strip() if v is not None else "") for i, v in enumerate(row) if i < len(headers)}
        result.append(d)
    return result


@router.post("/bulk-upload/parse", response_model=BulkParseResponse)
async def parse_bulk_upload(
    file: UploadFile = File(...),
    _: User = Depends(require_examiner),
):
    content = await file.read()
    filename = (file.filename or "").lower()

    if filename.endswith(".xlsx") or filename.endswith(".xls"):
        try:
            raw_rows = _rows_from_excel(content)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not parse Excel file: {exc}")
    elif filename.endswith(".csv"):
        try:
            raw_rows = _rows_from_csv(content)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not parse CSV file: {exc}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload a .csv or .xlsx file.")

    if not raw_rows:
        raise HTTPException(status_code=400, detail="File is empty or has no data rows.")

    parsed = [_parse_row(i + 2, r) for i, r in enumerate(raw_rows)]
    valid = sum(1 for p in parsed if not p.errors)
    return BulkParseResponse(valid_count=valid, invalid_count=len(parsed) - valid, rows=parsed)


@router.post("/bulk-upload/confirm", response_model=BulkConfirmResponse, status_code=status.HTTP_201_CREATED)
async def confirm_bulk_upload(
    body: BulkConfirmRequest,
    current_user: User = Depends(require_examiner),
    db: AsyncSession = Depends(get_db),
):
    valid_rows = [r for r in body.rows if not r.errors]
    if not valid_rows:
        raise HTTPException(status_code=400, detail="No valid rows to import.")

    created = 0
    async with db.begin():
        for row in valid_rows:
            q = Question(
                creator_id=current_user.id,
                question_type=QuestionType(row.question_type),
                text=row.text,
                marks=row.marks,
            )
            db.add(q)
            await db.flush()
            for idx, c in enumerate(row.choices):
                db.add(Choice(
                    question_id=q.id,
                    text=c.text,
                    is_correct=c.is_correct,
                    order_index=idx,
                ))
            created += 1

    return BulkConfirmResponse(created=created)
