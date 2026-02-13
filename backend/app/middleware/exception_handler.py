"""글로벌 예외 핸들러 — IntegrityError->409, 미처리 예외->500"""
import logging

from fastapi import Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger("app.error")


async def integrity_error_handler(
    request: Request, exc: IntegrityError
) -> JSONResponse:
    """DB 제약 조건 위반 시 409 Conflict 반환"""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.warning(f"[{request_id}] IntegrityError: {exc.orig}")
    return JSONResponse(
        status_code=409,
        content={
            "detail": "Data conflict — duplicate or constraint violation",
            "request_id": request_id,
        },
    )


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """미처리 예외 발생 시 500 Internal Server Error 반환

    HTTPException, RequestValidationError는 FastAPI 기본 핸들러에 위임
    """
    # FastAPI가 기본으로 처리해야 하는 예외는 다시 raise
    if isinstance(exc, (HTTPException, RequestValidationError)):
        raise exc

    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(
        f"[{request_id}] Unhandled: {type(exc).__name__}: {exc}"
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "request_id": request_id,
        },
    )
