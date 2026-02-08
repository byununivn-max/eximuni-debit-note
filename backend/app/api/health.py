from fastapi import APIRouter
import redis.asyncio as redis

from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    health = {"status": "ok", "services": {}}

    # Check Redis
    try:
        r = redis.from_url(settings.REDIS_URL)
        await r.ping()
        health["services"]["redis"] = "connected"
        await r.close()
    except Exception:
        health["services"]["redis"] = "disconnected"

    return health
