"""Dual DB 엔진: PostgreSQL (async) + MSSQL (sync)

PostgreSQL: 신규 ERP 테이블 (erp_*) — Docker 내부
MSSQL: 기존 운영 테이블 (clients, clearance, ...) — AWS 외부 54.180.220.143
"""
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# ============================================================
# PostgreSQL — async (신규 ERP 테이블)
# ============================================================
pg_engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
pg_async_session = async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """PostgreSQL 모델 베이스 (Alembic 마이그레이션 대상)"""
    pass


async def get_db() -> AsyncSession:
    """PostgreSQL async 세션 (기존 API 호환 유지)"""
    async with pg_async_session() as session:
        yield session


# ============================================================
# MSSQL — sync (기존 운영 데이터, 읽기+쓰기)
# ============================================================
class MSSQLBase(DeclarativeBase):
    """MSSQL 모델 베이스 (Alembic 마이그레이션 대상 아님 — 기존 테이블)"""
    pass


# MSSQL 엔진은 설정값이 있을 때만 생성 (로컬 개발 시 MSSQL 없을 수 있음)
_mssql_engine = None
_mssql_session_factory = None


def _init_mssql():
    """MSSQL 엔진 지연 초기화 (Lazy init)"""
    global _mssql_engine, _mssql_session_factory
    if _mssql_engine is None and settings.MSSQL_USER:
        _mssql_engine = create_engine(
            settings.MSSQL_URL,
            echo=settings.DEBUG,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
        )
        _mssql_session_factory = sessionmaker(
            bind=_mssql_engine, autocommit=False, autoflush=False
        )


def get_mssql_db() -> Generator[Session, None, None]:
    """MSSQL sync 세션 (기존 운영 테이블 접근용)"""
    _init_mssql()
    if _mssql_session_factory is None:
        raise RuntimeError(
            "MSSQL 연결 설정이 없습니다. .env에 MSSQL_USER, MSSQL_PASSWORD를 설정하세요."
        )
    session = _mssql_session_factory()
    try:
        yield session
    finally:
        session.close()


# 후방 호환: 기존 코드에서 engine 직접 참조하는 경우
engine = pg_engine
async_session = pg_async_session
