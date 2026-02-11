"""MSSQL email_job + emails_fails 테이블 모델"""
from sqlalchemy import Column, Integer, BigInteger, String, DateTime, Text
from app.core.database import MSSQLBase


class MssqlEmailJob(MSSQLBase):
    """이메일 발송 작업 테이블 (MSSQL UNI_DebitNote.dbo.email_job)"""
    __tablename__ = "email_job"
    __table_args__ = {"schema": "dbo"}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False)
    shared_mailbox = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=True)
    body = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    sent_at = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=True)
    error_message = Column(Text, nullable=True)
    batch_id = Column(String(100), nullable=True)
    retry_count = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=True)


class MssqlEmailFail(MSSQLBase):
    """이메일 발송 실패 테이블 (MSSQL UNI_DebitNote.dbo.emails_fails)"""
    __tablename__ = "emails_fails"
    __table_args__ = {"schema": "dbo"}

    id_fail = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=True)
    create_at = Column(DateTime, nullable=True)
