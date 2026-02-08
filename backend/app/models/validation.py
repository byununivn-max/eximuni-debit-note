"""데이터 검증 모델 (FR-009, FR-010)"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class ValidationRule(Base):
    """검증 규칙 정의 (FR-010)"""
    __tablename__ = "validation_rules"

    rule_id = Column(Integer, primary_key=True, autoincrement=True)
    rule_code = Column(String(50), unique=True, nullable=False)
    rule_name = Column(String(200), nullable=False)
    description = Column(Text)
    entity_type = Column(String(50), nullable=False)  # shipment, debit_note, fee_detail
    field_name = Column(String(100))  # 검증 대상 필드
    rule_type = Column(String(50), nullable=False)  # required, format, range, unique, custom
    rule_config = Column(JSON)  # {"pattern": "...", "min": 0, "max": 999999}
    error_message = Column(String(500))
    severity = Column(String(20), default="ERROR")  # ERROR, WARNING, INFO
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    logs = relationship("ValidationLog", back_populates="rule")


class ValidationLog(Base):
    """검증 실행 이력"""
    __tablename__ = "validation_logs"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    rule_id = Column(Integer, ForeignKey("validation_rules.rule_id"))
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    field_name = Column(String(100))
    field_value = Column(Text)
    is_valid = Column(Boolean, nullable=False)
    error_message = Column(Text)
    validated_by = Column(Integer, ForeignKey("users.user_id"))
    validated_at = Column(DateTime, default=datetime.utcnow)

    rule = relationship("ValidationRule", back_populates="logs")
