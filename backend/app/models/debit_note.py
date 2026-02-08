"""Debit Note 모델 (FR-015 ~ FR-032)"""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Date, Text
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class DebitNote(Base):
    """Debit Note 헤더 테이블 (설계서 2.3)

    상태 플로우: DRAFT → PENDING_REVIEW → APPROVED / REJECTED → EXPORTED
    번호 형식: DN-YYYYMM-XXXXX
    """
    __tablename__ = "debit_notes"

    debit_note_id = Column(Integer, primary_key=True, autoincrement=True)
    debit_note_number = Column(String(100), unique=True)  # DN-YYYYMM-XXXXX (트리거 자동생성)
    client_id = Column(Integer, ForeignKey("clients.client_id"), nullable=False)
    template_id = Column(Integer, ForeignKey("client_templates.template_id"))

    # 기간
    period_from = Column(Date, nullable=False)
    period_to = Column(Date, nullable=False)
    billing_date = Column(Date, default=date.today)

    # 금액 (FR-018, FR-019)
    total_usd = Column(Numeric(15, 2), default=0)  # USD 합계
    total_vnd = Column(Numeric(15, 0), default=0)  # VND 합계
    total_vat = Column(Numeric(15, 0), default=0)  # VAT 합계
    grand_total_vnd = Column(Numeric(15, 0), default=0)  # 최종 합계

    # 환율 (FR-016)
    exchange_rate = Column(Numeric(15, 2))  # 적용 환율

    # 상태
    status = Column(String(50), default="DRAFT")
    # DRAFT, PENDING_REVIEW, APPROVED, REJECTED, EXPORTED

    # 시트 구분
    sheet_type = Column(String(20))  # IMPORT, EXPORT, ALL

    # 승인 (FR-029 ~ FR-032)
    created_by = Column(Integer, ForeignKey("users.user_id"))
    approved_by = Column(Integer, ForeignKey("users.user_id"))
    approved_at = Column(DateTime)
    rejection_reason = Column(Text)

    # 라인 수
    total_lines = Column(Integer, default=0)

    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", back_populates="debit_notes")
    template = relationship("ClientTemplate")
    created_by_user = relationship("User", back_populates="created_debit_notes", foreign_keys=[created_by])
    approved_by_user = relationship("User", back_populates="approved_debit_notes", foreign_keys=[approved_by])
    lines = relationship("DebitNoteLine", back_populates="debit_note", cascade="all, delete-orphan")
    workflows = relationship("DebitNoteWorkflow", back_populates="debit_note", cascade="all, delete-orphan")
    exports = relationship("DebitNoteExport", back_populates="debit_note", cascade="all, delete-orphan")


class DebitNoteLine(Base):
    """Debit Note 라인 항목 - 각 선적별 비용 상세"""
    __tablename__ = "debit_note_lines"

    line_id = Column(Integer, primary_key=True, autoincrement=True)
    debit_note_id = Column(Integer, ForeignKey("debit_notes.debit_note_id", ondelete="CASCADE"), nullable=False)
    shipment_id = Column(Integer, ForeignKey("shipments.shipment_id"), nullable=False)
    line_no = Column(Integer)  # 순번

    # 비용 합계 (계산 결과)
    total_usd = Column(Numeric(15, 2), default=0)  # SUM(M:AT) - BC 컬럼
    total_vnd = Column(Numeric(15, 0), default=0)  # BC * 환율 - BD 컬럼
    vat_amount = Column(Numeric(15, 0), default=0)  # SUM(Z:AT)*환율*8% - BE 컬럼
    grand_total_vnd = Column(Numeric(15, 0), default=0)  # BD + BE - BF 컬럼

    # Freight (VAT 0%)
    freight_usd = Column(Numeric(15, 2), default=0)

    # Local charges (VAT 8%)
    local_charges_usd = Column(Numeric(15, 2), default=0)

    # Pay on behalf
    pay_on_behalf = Column(Numeric(15, 2), default=0)

    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    debit_note = relationship("DebitNote", back_populates="lines")
    shipment = relationship("Shipment", back_populates="debit_note_lines")


class DebitNoteWorkflow(Base):
    """Debit Note 승인/거절 워크플로우 이력 (FR-031, FR-032)"""
    __tablename__ = "debit_note_workflows"

    workflow_id = Column(Integer, primary_key=True, autoincrement=True)
    debit_note_id = Column(Integer, ForeignKey("debit_notes.debit_note_id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)  # CREATED, SUBMITTED, APPROVED, REJECTED, EXPORTED
    from_status = Column(String(50))
    to_status = Column(String(50))
    performed_by = Column(Integer, ForeignKey("users.user_id"))
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    debit_note = relationship("DebitNote", back_populates="workflows")
