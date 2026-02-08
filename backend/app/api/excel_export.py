"""Excel 출력 API (설계서 FR-021 ~ FR-028)

- POST /api/v1/debit-notes/{id}/export-excel → Excel 생성 + 다운로드
- GET /api/v1/debit-notes/{id}/download → 최근 생성된 Excel 다운로드
"""
import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.debit_note import DebitNote, DebitNoteWorkflow
from app.models.audit import DebitNoteExport
from app.services.excel_generator import generate_debit_note_excel

router = APIRouter(prefix="/api/v1/debit-notes", tags=["excel-export"])

EXPORT_DIR = "/app/exports"


@router.post("/{debit_note_id}/export-excel")
async def export_excel(
    debit_note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant")),
):
    """Debit Note를 Excel로 생성 및 다운로드 (FR-021)

    - APPROVED 상태의 DN만 출력 가능
    - 출력 기록을 debit_note_exports 테이블에 저장
    - 상태를 EXPORTED로 변경
    """
    # DN 조회
    result = await db.execute(
        select(DebitNote)
        .options(selectinload(DebitNote.lines))
        .where(DebitNote.debit_note_id == debit_note_id)
    )
    dn = result.scalar_one_or_none()
    if not dn:
        raise HTTPException(status_code=404, detail="Debit Note not found")

    if dn.status not in ("APPROVED", "EXPORTED"):
        raise HTTPException(
            status_code=400,
            detail=f"Excel 출력은 승인(APPROVED) 상태에서만 가능합니다. 현재 상태: {dn.status}",
        )

    # Excel 생성
    try:
        buffer, filename = await generate_debit_note_excel(debit_note_id, db)
    except Exception as e:
        # 실패 기록
        export_record = DebitNoteExport(
            debit_note_id=debit_note_id,
            file_name=f"ERROR_{debit_note_id}",
            export_status="FAILED",
            error_message=str(e),
            exported_by=current_user.user_id,
        )
        db.add(export_record)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Excel 생성 실패: {str(e)}")

    # 파일 저장 (선택적 - 이력 보관용)
    os.makedirs(EXPORT_DIR, exist_ok=True)
    file_path = os.path.join(EXPORT_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(buffer.getvalue())
    file_size = buffer.getbuffer().nbytes

    # 출력 기록 저장
    export_record = DebitNoteExport(
        debit_note_id=debit_note_id,
        file_name=filename,
        file_path=file_path,
        file_size=file_size,
        export_status="COMPLETED",
        exported_by=current_user.user_id,
    )
    db.add(export_record)

    # 상태 변경: APPROVED → EXPORTED (최초 출력 시)
    if dn.status == "APPROVED":
        dn.status = "EXPORTED"
        workflow = DebitNoteWorkflow(
            debit_note_id=dn.debit_note_id,
            action="EXPORTED",
            from_status="APPROVED",
            to_status="EXPORTED",
            performed_by=current_user.user_id,
            comment=f"Excel exported: {filename}",
        )
        db.add(workflow)

    await db.commit()

    # 스트리밍 응답
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(file_size),
        },
    )


@router.get("/{debit_note_id}/download")
async def download_latest_excel(
    debit_note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """최근 생성된 Excel 다운로드"""
    # 최신 성공 기록 조회
    result = await db.execute(
        select(DebitNoteExport)
        .where(
            DebitNoteExport.debit_note_id == debit_note_id,
            DebitNoteExport.export_status == "COMPLETED",
        )
        .order_by(DebitNoteExport.exported_at.desc())
        .limit(1)
    )
    export = result.scalar_one_or_none()
    if not export or not export.file_path:
        raise HTTPException(status_code=404, detail="생성된 Excel 파일이 없습니다")

    if not os.path.exists(export.file_path):
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다. 다시 생성해주세요.")

    def file_stream():
        with open(export.file_path, "rb") as f:
            yield from f

    return StreamingResponse(
        file_stream(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{export.file_name}"',
        },
    )


@router.get("/{debit_note_id}/exports")
async def list_exports(
    debit_note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Excel 출력 이력 조회"""
    result = await db.execute(
        select(DebitNoteExport)
        .where(DebitNoteExport.debit_note_id == debit_note_id)
        .order_by(DebitNoteExport.exported_at.desc())
    )
    exports = result.scalars().all()
    return [
        {
            "export_id": e.export_id,
            "file_name": e.file_name,
            "file_size": e.file_size,
            "export_status": e.export_status,
            "error_message": e.error_message,
            "exported_by": e.exported_by,
            "exported_at": e.exported_at.isoformat() if e.exported_at else None,
        }
        for e in exports
    ]
