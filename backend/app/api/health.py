from fastapi import APIRouter
import redis.asyncio as redis

from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    health = {"status": "ok", "services": {}, "auth_mode": "msal" if settings.AZURE_CLIENT_ID else "jwt"}

    # Check Redis
    try:
        r = redis.from_url(settings.REDIS_URL)
        await r.ping()
        health["services"]["redis"] = "connected"
        await r.close()
    except Exception:
        health["services"]["redis"] = "disconnected"

    # Check PostgreSQL
    try:
        from app.core.database import pg_engine
        from sqlalchemy import text
        async with pg_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        health["services"]["postgresql"] = "connected"
    except Exception as e:
        health["services"]["postgresql"] = f"disconnected: {str(e)[:100]}"

    # Check MSSQL (설정된 경우만)
    if settings.MSSQL_USER:
        try:
            from app.core.database import get_mssql_db
            from sqlalchemy import text
            gen = get_mssql_db()
            session = next(gen)
            session.execute(text("SELECT 1"))
            health["services"]["mssql"] = f"connected ({settings.MSSQL_SERVER})"
            try:
                next(gen)
            except StopIteration:
                pass
        except Exception as e:
            health["services"]["mssql"] = f"disconnected: {str(e)[:100]}"
    else:
        health["services"]["mssql"] = "not configured"

    return health
