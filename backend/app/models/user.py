"""사용자 및 권한 관리 모델 (FR-001 ~ FR-003)"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Table
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class Role(Base):
    """역할 테이블 - PIC, 회계담당자, 관리자"""
    __tablename__ = "roles"

    role_id = Column(Integer, primary_key=True, autoincrement=True)
    role_name = Column(String(50), unique=True, nullable=False)  # admin, accountant, pic
    description = Column(String(200))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="role")
    role_permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")


class User(Base):
    """사용자 테이블 — Azure AD SSO 연동 필드 추가"""
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # MSAL 사용 시 NULL 허용
    full_name = Column(String(200), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.role_id"), nullable=False)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # --- ERP v2: Azure AD SSO 연동 ---
    azure_oid = Column(String(100), unique=True, nullable=True, index=True)  # Azure AD Object ID

    role = relationship("Role", back_populates="users")
    created_debit_notes = relationship("DebitNote", back_populates="created_by_user", foreign_keys="DebitNote.created_by")
    approved_debit_notes = relationship("DebitNote", back_populates="approved_by_user", foreign_keys="DebitNote.approved_by")


class Permission(Base):
    """권한 테이블"""
    __tablename__ = "permissions"

    permission_id = Column(Integer, primary_key=True, autoincrement=True)
    permission_name = Column(String(100), unique=True, nullable=False)
    description = Column(String(200))
    resource = Column(String(100), nullable=False)  # debit_note, client, shipment 등
    action = Column(String(50), nullable=False)  # create, read, update, delete, approve
    created_at = Column(DateTime, default=datetime.utcnow)

    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")


class RolePermission(Base):
    """역할-권한 매핑 테이블"""
    __tablename__ = "role_permissions"

    role_permission_id = Column(Integer, primary_key=True, autoincrement=True)
    role_id = Column(Integer, ForeignKey("roles.role_id", ondelete="CASCADE"), nullable=False)
    permission_id = Column(Integer, ForeignKey("permissions.permission_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")
