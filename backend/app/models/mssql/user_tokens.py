"""MSSQL user_tokens 테이블 모델 — 사용자 토큰 캐시"""
from sqlalchemy import Column, String, DateTime, Text
from app.core.database import MSSQLBase


class MssqlUserToken(MSSQLBase):
    """사용자 토큰 캐시 테이블 (MSSQL UNI_DebitNote.dbo.user_tokens)

    Copilot Studio 챗봇의 MSAL 토큰 캐시 저장용
    """
    __tablename__ = "user_tokens"
    __table_args__ = {"schema": "dbo"}

    user_email = Column(String(255), primary_key=True)
    token_cache = Column(Text, nullable=False)
    updated_at = Column(DateTime, nullable=False)
