"""견적-실적 비교 모듈 (PostgreSQL 신규 테이블)

Sprint 13: erp_quotation_actuals
견적 금액 vs 실제 매출/매입 비교 → 차이(variance) 분석
"""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, DateTime, Date,
    Numeric, Text, Index,
)
from app.core.database import Base


class QuotationActual(Base):
    """견적-실적 비교 — 견적 단가 vs 실제 단가 분석"""
    __tablename__ = "erp_quotation_actuals"
    __table_args__ = (
        Index("ix_qa_shipment", "mssql_shipment_ref"),
        Index("ix_qa_customer", "customer_id"),
        Index("ix_qa_date", "analysis_date"),
        Index("ix_qa_type", "service_type"),
    )

    comparison_id = Column(Integer, primary_key=True, autoincrement=True)
    mssql_shipment_ref = Column(
        String(50), nullable=True,
        comment="건 참조 (SellingRecord.mssql_source_id)",
    )
    customer_id = Column(
        Integer, nullable=True,
        comment="고객 참조 (MSSQL clients.id)",
    )
    customer_name = Column(String(200), nullable=True, comment="고객명")
    service_type = Column(
        String(20), nullable=False, default="clearance",
        comment="clearance/ops/co",
    )
    quotation_amount = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="견적 금액 (VND)",
    )
    actual_selling = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="실제 매출 (VND)",
    )
    actual_buying = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="실제 매입 (VND)",
    )
    variance_selling = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="매출 차이 (실제 - 견적)",
    )
    variance_buying = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="매입 차이",
    )
    variance_gp = Column(
        Numeric(18, 2), nullable=False, default=0,
        comment="GP 차이",
    )
    invoice_no = Column(String(50), nullable=True, comment="인보이스 번호")
    analysis_date = Column(Date, nullable=False, default=date.today)
    notes = Column(Text, nullable=True, comment="비고")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow,
        onupdate=datetime.utcnow, nullable=False,
    )
