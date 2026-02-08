"""환율 관리 모델 (FR-006, FR-030)"""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Numeric, Date, Boolean, Text
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class ExchangeRate(Base):
    """일반 환율 테이블 - 일일 환율 관리"""
    __tablename__ = "exchange_rates"

    rate_id = Column(Integer, primary_key=True, autoincrement=True)
    currency_from = Column(String(10), nullable=False, default="USD")
    currency_to = Column(String(10), nullable=False, default="VND")
    rate = Column(Numeric(15, 2), nullable=False)  # e.g., 26446.00
    rate_date = Column(Date, nullable=False)
    source = Column(String(100))  # manual, api, bank
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ClientExchangeRate(Base):
    """거래처별 환율 설정 (FR-006) - 거래처마다 다른 환율 사용 가능"""
    __tablename__ = "client_exchange_rates"

    client_rate_id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, ForeignKey("clients.client_id", ondelete="CASCADE"), nullable=False)
    currency_from = Column(String(10), nullable=False, default="USD")
    currency_to = Column(String(10), nullable=False, default="VND")
    rate = Column(Numeric(15, 2), nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date)
    notes = Column(Text)
    created_by = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", back_populates="exchange_rates")
