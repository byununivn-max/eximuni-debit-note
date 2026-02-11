"""MSSQL praise + rewards + sumary_point 테이블 모델"""
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.core.database import MSSQLBase


class MssqlPraise(MSSQLBase):
    """칭찬 테이블 (MSSQL UNI_DebitNote.dbo.praise)"""
    __tablename__ = "praise"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(255), nullable=False)
    detail = Column(Text, nullable=False)
    title_post = Column(String(255), nullable=True)
    from_channel = Column(String(200), nullable=True)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False)
    message_id = Column(String(256), nullable=False)


class MssqlReward(MSSQLBase):
    """보상 마일스톤 테이블 (MSSQL UNI_DebitNote.dbo.rewards)"""
    __tablename__ = "rewards"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    milestone = Column(Integer, nullable=True)
    reward = Column(String(255), nullable=True)


class MssqlSummaryPoint(MSSQLBase):
    """포인트 요약 테이블 (MSSQL UNI_DebitNote.dbo.sumary_point)"""
    __tablename__ = "sumary_point"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(100), nullable=True)
    summary = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False)
