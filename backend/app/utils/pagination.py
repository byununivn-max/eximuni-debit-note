"""공통 페이지네이션 유틸리티 — subquery 패턴"""
from typing import Tuple, Sequence, Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select


async def paginate(
    db: AsyncSession,
    query: Select,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[int, Sequence[Any]]:
    """쿼리에 페이지네이션 적용, (total, items) 반환

    Args:
        db: AsyncSession
        query: 필터/정렬 적용된 SELECT 쿼리
        skip: 건너뛸 항목 수
        limit: 반환할 최대 항목 수

    Returns:
        (total, items) — 전체 개수와 해당 페이지 항목들
    """
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    result = await db.execute(query.offset(skip).limit(limit))
    items = result.unique().scalars().all()

    return total, items
