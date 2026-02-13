"""요청 로깅 미들웨어 — X-Request-ID 자동 생성 + 요청/응답 로그"""
import time
import uuid
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("app.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """모든 요청에 X-Request-ID 부여 + 소요 시간 로깅"""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get(
            "X-Request-ID", str(uuid.uuid4())[:8]
        )
        request.state.request_id = request_id
        start = time.time()

        logger.info(f"[{request_id}] {request.method} {request.url.path}")

        response = await call_next(request)
        duration = round((time.time() - start) * 1000, 1)

        response.headers["X-Request-ID"] = request_id
        logger.info(
            f"[{request_id}] {response.status_code} ({duration}ms)"
        )

        return response
