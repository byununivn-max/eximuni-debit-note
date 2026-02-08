"""감사 로그 및 출력 관리 모델 (NFR-006, NFR-011)"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, BigInteger
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class DebitNoteExport(Base):
    """Debit Note Excel 출력 기록 (FR-021)"""
    __tablename__ = "debit_note_exports"

    export_id = Column(Integer, primary_key=True, autoincrement=True)
    debit_note_id = Column(Integer, ForeignKey("debit_notes.debit_note_id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000))
    file_size = Column(BigInteger)
    file_format = Column(String(20), default="xlsx")
    export_status = Column(String(50), default="PENDING")  # PENDING, GENERATING, COMPLETED, FAILED
    error_message = Column(Text)
    exported_by = Column(Integer, ForeignKey("users.user_id"))
    exported_at = Column(DateTime, default=datetime.utcnow)

    debit_note = relationship("DebitNote", back_populates="exports")


class AuditLog(Base):
    """감사 로그 테이블 (NFR-006) - 모든 주요 테이블 변경사항 기록

    최소 1년 보관, 트리거로 자동 기록
    """
    __tablename__ = "audit_logs"

    audit_id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String(100), nullable=False)  # 테이블명
    entity_id = Column(Integer, nullable=False)  # 레코드 ID
    action = Column(String(20), nullable=False)  # INSERT, UPDATE, DELETE
    old_values = Column(JSON)  # 변경 전 값
    new_values = Column(JSON)  # 변경 후 값
    changed_fields = Column(JSON)  # 변경된 필드 목록
    performed_by = Column(Integer, ForeignKey("users.user_id"))
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    action_at = Column(DateTime, default=datetime.utcnow)


class SystemLog(Base):
    """시스템 로그 - 에러, 성능, 이벤트 기록"""
    __tablename__ = "system_logs"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    log_level = Column(String(20), nullable=False)  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    module = Column(String(100))  # 모듈명
    message = Column(Text, nullable=False)
    details = Column(JSON)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    ip_address = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
