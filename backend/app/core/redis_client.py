"""Redis 캐싱 헬퍼 — dashboard KPI, 마스터 데이터 캐시"""
import json
import logging
from typing import Any, Optional

import redis.asyncio as redis

from app.core.config import settings

logger = logging.getLogger("app.cache")

_pool: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    """Redis 연결 반환 (지연 초기화)"""
    global _pool
    if _pool is None:
        try:
            _pool = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=3,
            )
            await _pool.ping()
            logger.info("Redis connected")
        except Exception as e:
            logger.warning(f"Redis unavailable: {e} — caching disabled")
            _pool = None
            raise
    return _pool


async def cache_get(key: str) -> Optional[Any]:
    """캐시 조회 — Redis 미연결 시 None 반환"""
    try:
        r = await get_redis()
        data = await r.get(key)
        return json.loads(data) if data else None
    except Exception:
        return None


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    """캐시 저장 (기본 TTL 5분)"""
    try:
        r = await get_redis()
        await r.set(key, json.dumps(value, default=str), ex=ttl)
    except Exception:
        pass


async def cache_delete(pattern: str) -> None:
    """패턴 기반 캐시 삭제"""
    try:
        r = await get_redis()
        keys = []
        async for key in r.scan_iter(match=pattern):
            keys.append(key)
        if keys:
            await r.delete(*keys)
    except Exception:
        pass
