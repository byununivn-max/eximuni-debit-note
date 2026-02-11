"""인증 모듈 — Dual 인증 (Microsoft MSAL SSO + 기존 JWT 호환)

1. Microsoft MSAL (Azure AD SSO): 운영 환경
   - Azure AD 토큰 검증 → 사용자 자동 생성/매핑
2. 기존 JWT: 개발/테스트 환경 (AZURE_CLIENT_ID 미설정 시 폴백)
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

# OAuth2 토큰 추출 (MSAL이든 JWT이든 Bearer 토큰 사용)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

# Microsoft JWKS 캐시
_ms_jwks_cache: dict = {}
_ms_jwks_fetched_at: Optional[datetime] = None
MS_JWKS_URL = "https://login.microsoftonline.com/common/discovery/v2.0/keys"


# ============================================================
# Microsoft MSAL 토큰 검증
# ============================================================
async def _get_ms_signing_keys() -> dict:
    """Microsoft 공개키 (JWKS) 가져오기 — 1시간 캐시"""
    global _ms_jwks_cache, _ms_jwks_fetched_at
    now = datetime.utcnow()
    if _ms_jwks_fetched_at and (now - _ms_jwks_fetched_at).seconds < 3600:
        return _ms_jwks_cache

    async with httpx.AsyncClient() as client:
        resp = await client.get(MS_JWKS_URL)
        resp.raise_for_status()
        keys = resp.json().get("keys", [])
        _ms_jwks_cache = {k["kid"]: k for k in keys}
        _ms_jwks_fetched_at = now
        return _ms_jwks_cache


async def verify_msal_token(token: str) -> dict:
    """Azure AD 액세스 토큰 검증 → 클레임 반환

    Returns:
        dict: {"oid": "...", "preferred_username": "...", "name": "...", "roles": [...]}
    """
    try:
        # 토큰 헤더에서 kid 추출
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise ValueError("Token has no kid header")

        # Microsoft 공개키로 검증
        signing_keys = await _get_ms_signing_keys()
        if kid not in signing_keys:
            # 키가 로테이트됐을 수 있으므로 캐시 초기화 후 재시도
            global _ms_jwks_fetched_at
            _ms_jwks_fetched_at = None
            signing_keys = await _get_ms_signing_keys()
            if kid not in signing_keys:
                raise ValueError(f"Unknown signing key: {kid}")

        key = signing_keys[kid]

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=settings.AZURE_CLIENT_ID,
            issuer=settings.AZURE_ISSUER,
            options={"verify_at_hash": False},
        )
        return payload
    except (JWTError, ValueError, Exception) as e:
        logger.warning(f"MSAL token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Microsoft token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================================
# 기존 JWT (개발/테스트 폴백)
# ============================================================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=60))
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


async def _verify_local_jwt(token: str) -> int:
    """기존 JWT 검증 → user_id 반환"""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        sub = payload.get("sub")
        token_type = payload.get("type")
        if sub is None or token_type != "access":
            raise ValueError("Invalid token")
        return int(sub)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================================
# Dual 인증: MSAL 우선, JWT 폴백
# ============================================================
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """인증된 사용자 반환 — MSAL 또는 JWT"""
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # MSAL 모드: Azure 설정이 있으면 MSAL 토큰으로 시도
    if settings.AZURE_CLIENT_ID:
        try:
            claims = await verify_msal_token(token)
            # Azure AD oid로 사용자 조회 또는 자동 생성
            azure_oid = claims.get("oid")
            email = claims.get("preferred_username", "")
            display_name = claims.get("name", email)

            result = await db.execute(
                select(User)
                .options(selectinload(User.role))
                .where(User.azure_oid == azure_oid)
            )
            user = result.scalar_one_or_none()

            if user is None:
                # 이메일로 기존 사용자 매칭 시도
                result = await db.execute(
                    select(User)
                    .options(selectinload(User.role))
                    .where(User.email == email)
                )
                user = result.scalar_one_or_none()
                if user:
                    # azure_oid 연결
                    user.azure_oid = azure_oid
                    await db.commit()

            if user is None or not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"User {email} not registered in ERP. Contact admin.",
                )
            return user
        except HTTPException:
            raise
        except Exception:
            pass  # MSAL 실패 시 JWT 폴백

    # JWT 모드 (개발/테스트 또는 MSAL 미설정)
    user_id = await _verify_local_jwt(token)
    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.user_id == user_id)
    )
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_role(*allowed_roles: str):
    """역할 기반 접근 제어 데코레이터 (FR-002)"""
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role.role_name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}",
            )
        return current_user
    return role_checker
