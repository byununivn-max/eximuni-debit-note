"""분개전표 API

Sprint 8: 분개전표 CRUD + 게시(Post) + 검증
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.journal import JournalEntry, JournalLine
from app.schemas.journal_entry import (
    JournalEntryCreate,
    JournalEntryResponse,
    JournalEntryListItem,
    JournalEntryListResponse,
    JournalValidationResult,
)

router = APIRouter(prefix="/api/v1/journal-entries", tags=["journal-entries"])


@router.get("", response_model=JournalEntryListResponse)
async def list_entries(
    module: Optional[str] = Query(None, description="GL/AP/AR/CA/OF"),
    fiscal_year: Optional[int] = Query(None),
    fiscal_month: Optional[int] = Query(None),
    status: Optional[str] = Query(None, description="draft/posted/reversed"),
    source: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="전표번호/적요 검색"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """분개전표 목록 조회 (페이지네이션)"""
    q = select(JournalEntry).order_by(
        JournalEntry.entry_date.desc(),
        JournalEntry.entry_id.desc(),
    )

    if module:
        q = q.where(JournalEntry.module == module)
    if fiscal_year:
        q = q.where(JournalEntry.fiscal_year == fiscal_year)
    if fiscal_month:
        q = q.where(JournalEntry.fiscal_month == fiscal_month)
    if status:
        q = q.where(JournalEntry.status == status)
    if source:
        q = q.where(JournalEntry.source == source)
    if search:
        like = f"%{search}%"
        q = q.where(
            (JournalEntry.entry_number.ilike(like))
            | (JournalEntry.description_vn.ilike(like))
            | (JournalEntry.description_kr.ilike(like))
        )

    # 전체 개수
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # 페이지네이션
    q = q.offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    items = result.scalars().all()

    return JournalEntryListResponse(items=items, total=total)


@router.get("/summary")
async def entry_summary(
    fiscal_year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """분개전표 요약 통계"""
    filters = []
    if fiscal_year:
        filters.append(JournalEntry.fiscal_year == fiscal_year)

    # 모듈별 건수
    module_q = select(
        JournalEntry.module,
        func.count(JournalEntry.entry_id),
    )
    if filters:
        module_q = module_q.where(and_(*filters))
    module_q = module_q.group_by(JournalEntry.module)
    module_result = await db.execute(module_q)
    by_module = {r[0]: r[1] for r in module_result}

    # 상태별 건수
    status_q = select(
        JournalEntry.status,
        func.count(JournalEntry.entry_id),
    )
    if filters:
        status_q = status_q.where(and_(*filters))
    status_q = status_q.group_by(JournalEntry.status)
    status_result = await db.execute(status_q)
    by_status = {r[0]: r[1] for r in status_result}

    # 총 차/대 합계
    totals_q = select(
        func.coalesce(func.sum(JournalEntry.total_debit), 0),
        func.coalesce(func.sum(JournalEntry.total_credit), 0),
        func.count(JournalEntry.entry_id),
    )
    if filters:
        totals_q = totals_q.where(and_(*filters))
    totals_result = await db.execute(totals_q)
    totals_row = totals_result.one()

    return {
        "by_module": by_module,
        "by_status": by_status,
        "total_debit": float(totals_row[0]),
        "total_credit": float(totals_row[1]),
        "total_entries": totals_row[2],
    }


@router.get("/validate", response_model=JournalValidationResult)
async def validate_entries(
    fiscal_year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """분개전표 차대 균형 검증"""
    from app.services.smartbooks_validator import validate_journal_balance
    result = await validate_journal_balance(db, fiscal_year)
    return JournalValidationResult(**result)


@router.get("/{entry_id}", response_model=JournalEntryResponse)
async def get_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """분개전표 상세 조회 (라인 포함)"""
    result = await db.execute(
        select(JournalEntry)
        .options(selectinload(JournalEntry.lines))
        .where(JournalEntry.entry_id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(404, f"Journal entry {entry_id} not found")
    return entry


@router.post("", response_model=JournalEntryResponse, status_code=201)
async def create_entry(
    payload: JournalEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """분개전표 수동 생성"""
    if current_user.role not in ("admin", "accountant"):
        raise HTTPException(403, "admin 또는 accountant만 전표 생성 가능")

    # 전표번호 중복 체크
    existing = await db.execute(
        select(JournalEntry).where(
            JournalEntry.entry_number == payload.entry_number,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            409, f"Entry number {payload.entry_number} already exists",
        )

    # 차대 합계 계산
    total_debit = sum(
        line.debit_amount for line in payload.lines
    )
    total_credit = sum(
        line.credit_amount for line in payload.lines
    )

    entry_data = payload.model_dump(exclude={"lines"})
    entry = JournalEntry(
        **entry_data,
        total_debit=total_debit,
        total_credit=total_credit,
        source="manual",
        created_by=current_user.id,
    )

    for i, line_data in enumerate(payload.lines, 1):
        line = JournalLine(
            **line_data.model_dump(),
            line_number=i,
        )
        entry.lines.append(line)

    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.post("/{entry_id}/post", response_model=JournalEntryResponse)
async def post_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """분개전표 게시 (draft → posted)"""
    if current_user.role not in ("admin", "accountant"):
        raise HTTPException(403, "admin 또는 accountant만 전표 게시 가능")

    result = await db.execute(
        select(JournalEntry)
        .options(selectinload(JournalEntry.lines))
        .where(JournalEntry.entry_id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(404, f"Journal entry {entry_id} not found")
    if entry.status != "draft":
        raise HTTPException(400, f"Only draft entries can be posted (current: {entry.status})")

    # 차대 균형 검증
    if entry.total_debit != entry.total_credit:
        raise HTTPException(
            400,
            f"Debit/Credit not balanced: "
            f"Debit={entry.total_debit}, Credit={entry.total_credit}",
        )

    entry.status = "posted"
    entry.posted_at = datetime.utcnow()
    entry.posted_by = current_user.id
    await db.commit()
    await db.refresh(entry)
    return entry


@router.post("/{entry_id}/reverse", response_model=JournalEntryResponse)
async def reverse_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """분개전표 역분개 (posted → reversed)"""
    if current_user.role != "admin":
        raise HTTPException(403, "admin만 전표 역분개 가능")

    result = await db.execute(
        select(JournalEntry)
        .options(selectinload(JournalEntry.lines))
        .where(JournalEntry.entry_id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(404, f"Journal entry {entry_id} not found")
    if entry.status != "posted":
        raise HTTPException(400, "Only posted entries can be reversed")

    entry.status = "reversed"
    await db.commit()
    await db.refresh(entry)
    return entry


@router.post("/import-gltran")
async def import_gltran(
    rows: List[dict],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """SmartBooks GLTran 데이터 임포트 (JSON 행 배열)"""
    if current_user.role != "admin":
        raise HTTPException(403, "admin만 SmartBooks 임포트 실행 가능")

    from app.services.smartbooks_import import import_gltran_data
    from app.schemas.journal_entry import JournalImportResult

    result = await import_gltran_data(db, rows)
    return JournalImportResult(**result)
