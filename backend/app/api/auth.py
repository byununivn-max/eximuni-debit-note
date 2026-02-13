"""인증 API — Dual 인증 (MSAL SSO + 기존 JWT)

- POST /api/v1/auth/login: 기존 username/password 로그인 (개발/테스트)
- POST /api/v1/auth/refresh: JWT 리프레시
- GET  /api/v1/auth/me: 현재 사용자 정보 (MSAL 또는 JWT)
- GET  /api/v1/auth/config: 프론트엔드용 인증 설정 (MSAL 활성화 여부)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token, create_refresh_token, get_current_user,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest, UserResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.get("/config")
async def get_auth_config():
    """프론트엔드에 인증 방식을 알려줌 (MSAL vs JWT)"""
    msal_enabled = bool(settings.AZURE_CLIENT_ID and settings.AZURE_TENANT_ID)
    return {
        "msal_enabled": msal_enabled,
        "azure_client_id": settings.AZURE_CLIENT_ID if msal_enabled else None,
        "azure_tenant_id": settings.AZURE_TENANT_ID if msal_enabled else None,
    }


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """기존 username/password 로그인 (개발/테스트용, MSAL 미설정 시)"""
    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.username == request.username)
    )
    user = result.scalar_one_or_none()

    # 비밀번호 검증 (hashed_password가 있는 경우만)
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    # bcrypt 검증 — passlib 제거했으므로 직접 비교 (seed된 해시와 비교)
    from hashlib import sha256
    # 간단한 개발용 비밀번호 검증 (production에서는 MSAL 사용)
    import hmac
    stored = user.hashed_password
    if stored.startswith("$2b$"):
        # bcrypt 해시인 경우 — passlib 없이는 검증 불가, 개발용 평문 비교
        # TODO: MSAL 전환 후 이 경로는 사용 안 함
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Legacy password format. Use Microsoft login or contact admin.",
        )
    else:
        # 평문 또는 sha256 해시
        if stored != request.password and stored != sha256(request.password.encode()).hexdigest():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
            )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    user.last_login = datetime.utcnow()
    await db.commit()

    access_token = create_access_token(data={"sub": user.user_id})
    refresh_token = create_refresh_token(data={"sub": user.user_id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.user_id,
        username=user.username,
        role=user.role.role_name,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """JWT 리프레시 (MSAL 모드에서는 사용 안 함)"""
    try:
        payload = jwt.decode(
            request.refresh_token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        sub = payload.get("sub")
        token_type = payload.get("type")
        if sub is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        user_id = int(sub)
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.user_id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or disabled")

    access_token = create_access_token(data={"sub": user.user_id})
    new_refresh_token = create_refresh_token(data={"sub": user.user_id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user_id=user.user_id,
        username=user.username,
        role=user.role.role_name,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """현재 인증된 사용자 정보 (MSAL 또는 JWT)"""
    return UserResponse(
        user_id=current_user.user_id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role_name=current_user.role.role_name,
        is_active=current_user.is_active,
    )
