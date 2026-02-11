"""매출 동기화 서비스: MSSQL → PostgreSQL

MSSQL의 clearance/ops/co 비용 데이터를 읽어
PostgreSQL erp_selling_records/erp_selling_items에 구조화 저장.
mssql_source_id 기준 중복 방지 (기존 레코드는 업데이트).
"""
import logging
from datetime import datetime
from decimal import Decimal
from typing import List, Tuple

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models.selling import SellingRecord, SellingItem
from app.models.mssql import (
    MssqlSchemeClearance, MssqlClearance,
    MssqlSchemeOps, MssqlOps,
    MssqlSchemeCo, MssqlCo,
)

logger = logging.getLogger(__name__)

# ============================================================
# Clearance 비용 컬럼 매핑 (컬럼명 → 한글명, 카테고리)
# ============================================================
CLEARANCE_FEE_MAP: List[Tuple[str, str, str]] = [
    # (컬럼명, 한글명, 카테고리)
    # --- 통관 비용 ---
    ("phi_thong_quan", "통관 수수료", "customs"),
    ("phi_mo_tk_ngoai_gio", "시간외 신고 수수료", "customs"),
    ("phi_sua_tk", "신고서 수정 수수료", "customs"),
    ("phi_huy_tk", "신고서 취소 수수료", "customs"),
    ("phi_kiem_hoa", "검사 수수료", "customs"),
    ("phi_khai_hoa_chat", "화학물질 신고 수수료", "customs"),
    ("phi_gp_nk_tien_chat", "선납금 수수료", "customs"),
    ("phi_khac_inland", "기타 내륙 수수료", "customs"),
    # --- 운송/물류 ---
    ("phi_van_chuyen", "운송비", "transport"),
    ("phi_giao_hang_nhanh", "급배송비", "transport"),
    ("phi_luu_cont", "컨테이너 보관료", "transport"),
    ("phi_do_cont_tuyen_dai", "장거리 컨테이너 수수료", "transport"),
    # --- 하역 ---
    ("phi_nang", "Lift On 수수료", "handling"),
    ("phi_ha", "Lift Off 수수료", "handling"),
    # --- 창고/인건비 ---
    ("phi_luu_kho", "창고 보관료", "handling"),
    ("phi_nhan_cong", "인건비", "handling"),
    ("phi_chung_tu", "서류 수수료", "handling"),
    ("phi_do_hang", "하역비", "handling"),
    # --- 운임/배송 ---
    ("of_af", "OF/AF", "transport"),
    ("phi_giao_tai_xuong", "공장 배송비", "transport"),
    ("phi_giao_tai_diem_chi_dinh", "지정장소 배송비", "transport"),
    ("phi_gh_chua_tra_thue", "미납세 배송비", "transport"),
    ("phi_gh_da_tra_thue", "납세완료 배송비", "transport"),
    # --- 기타 ---
    ("phi_xu_ly_hang_hoa", "화물 처리비", "other"),
    ("phi_khai_bao_hh_tu_dong", "자동 화물신고비", "other"),
    ("phu_phi_xang_dau", "유류 할증료", "other"),
    ("phu_phi_an_ninh", "보안 할증료", "other"),
    ("phi_soi_chieu", "X-ray 검사비", "other"),
    ("phi_bao_hiem_hang_hoa", "화물 보험료", "other"),
    ("phi_lenh_giao", "인도 지시서 수수료", "other"),
    ("phi_xu_ly", "처리 수수료", "other"),
    ("phi_boc_do_cont", "컨테이너 상/하차비", "other"),
    ("phi_mat_can_bang_cont", "컨테이너 균형료", "other"),
    ("phi_chi", "지출 수수료", "other"),
    ("lenh_giao", "인도 지시비", "other"),
    ("phi_phat_hanh_van_don", "B/L 발행 수수료", "other"),
    ("phi_ve_sinh", "청소비", "other"),
    ("phi_kho_hang_le", "LCL 창고비", "other"),
    ("phi_nhien_lieu_s", "연료 할증료(S)", "other"),
    ("phi_tach_bill", "B/L 분할 수수료", "other"),
    ("phi_khac_local", "기타 로컬 비용", "other"),
    # --- Pay-on (대납) ---
    ("phi_nang_pay_on", "Lift On 대납", "handling"),
    ("phi_ha_payon", "Lift Off 대납", "handling"),
    ("phi_local", "로컬 비용 대납", "other"),
    ("phi_ha_tang", "인프라 수수료", "other"),
    ("phi_luu_kho_payon", "창고 보관료 대납", "handling"),
    ("phi_tk_payon", "신고비 대납", "customs"),
    ("phi_khac_chi_ho", "기타 대납 비용", "other"),
]

# ============================================================
# Ops 비용 컬럼 매핑
# ============================================================
OPS_FEE_MAP: List[Tuple[str, str, str]] = [
    ("customs_clearance_fee", "통관 수수료", "customs"),
    ("inspection", "검사비", "customs"),
    ("le_phi_tk", "신고 수수료", "customs"),
    ("thue_nhap_khau", "수입세", "customs"),
    ("phi_tach_bill", "B/L 분할 수수료", "other"),
    ("phu_cap_cho_ops", "Ops 수당", "handling"),
    ("phi_luu_cont", "컨테이너 보관료", "transport"),
    ("phi_luu_kho", "창고 보관료", "handling"),
    ("phi_lam_hang", "작업비", "handling"),
    ("phi_co_a_thai", "CO-A 태국 수수료", "co"),
    ("phi_co_c_thao", "CO-C 수수료", "co"),
]

# ============================================================
# CO 비용 컬럼 매핑
# ============================================================
CO_FEE_MAP: List[Tuple[str, str, str]] = [
    ("le_phi_co", "CO 수수료", "co"),
    ("le_phi_bo_cong_thuong", "산업통상부 수수료", "co"),
    ("phi_dv_sua_doi", "수정 서비스 수수료", "co"),
]


def _extract_fees(
    obj: object,
    fee_map: List[Tuple[str, str, str]],
) -> Tuple[Decimal, List[dict]]:
    """모델 객체에서 비용 항목 추출, (합계, 항목리스트) 반환"""
    total = Decimal("0")
    items = []
    for col_name, fee_name, category in fee_map:
        val = getattr(obj, col_name, None)
        if val is not None and val != 0:
            amount = Decimal(str(val))
            if amount != 0:
                total += amount
                items.append({
                    "fee_name": fee_name,
                    "fee_category": category,
                    "amount": amount,
                    "currency": "VND",
                    "mssql_source_column": col_name,
                })
    return total, items


async def sync_selling_records(
    mssql_db: Session,
    pg_db: AsyncSession,
) -> dict:
    """MSSQL 매출 데이터를 PostgreSQL에 동기화

    Args:
        mssql_db: MSSQL sync 세션
        pg_db: PostgreSQL async 세션

    Returns:
        동기화 결과 딕셔너리
    """
    result = {
        "clearance_count": 0,
        "ops_count": 0,
        "co_count": 0,
        "total_synced": 0,
        "errors": [],
    }

    # 기존 레코드 전체 삭제 후 재생성 (full sync)
    await pg_db.execute(delete(SellingItem))
    await pg_db.execute(delete(SellingRecord))

    # --- Clearance 동기화 ---
    try:
        schemes = mssql_db.execute(
            select(MssqlSchemeClearance).where(
                MssqlSchemeClearance.is_active == True
            )
        ).scalars().all()

        for scheme in schemes:
            if not scheme.id_clearance:
                continue
            clearance = mssql_db.execute(
                select(MssqlClearance).where(
                    MssqlClearance.id_clearance == scheme.id_clearance
                )
            ).scalar_one_or_none()
            if not clearance:
                continue

            total, fee_items = _extract_fees(clearance, CLEARANCE_FEE_MAP)
            if not fee_items:
                continue

            record = SellingRecord(
                record_type="clearance",
                mssql_source_id=scheme.id_scheme_cd,
                mssql_cost_id=scheme.id_clearance,
                customer_name=scheme.company,
                invoice_no=scheme.invoice,
                service_date=scheme.arrival_date,
                total_selling_vnd=total,
                item_count=len(fee_items),
                sync_status="SYNCED",
                synced_at=datetime.utcnow(),
            )
            pg_db.add(record)
            await pg_db.flush()

            for fi in fee_items:
                pg_db.add(SellingItem(selling_id=record.selling_id, **fi))

            result["clearance_count"] += 1
    except Exception as e:
        logger.error(f"Clearance sync error: {e}")
        result["errors"].append(f"clearance: {str(e)}")

    # --- Ops 동기화 ---
    try:
        schemes = mssql_db.execute(
            select(MssqlSchemeOps).where(
                MssqlSchemeOps.is_active == True
            )
        ).scalars().all()

        for scheme in schemes:
            if not scheme.id_ops:
                continue
            ops = mssql_db.execute(
                select(MssqlOps).where(MssqlOps.id_ops == scheme.id_ops)
            ).scalar_one_or_none()
            if not ops:
                continue

            total, fee_items = _extract_fees(ops, OPS_FEE_MAP)
            if not fee_items:
                continue

            record = SellingRecord(
                record_type="ops",
                mssql_source_id=scheme.id_scheme_ops,
                mssql_cost_id=scheme.id_ops,
                customer_name=scheme.customer,
                invoice_no=scheme.so_invoice,
                service_date=None,
                total_selling_vnd=total,
                item_count=len(fee_items),
                sync_status="SYNCED",
                synced_at=datetime.utcnow(),
            )
            pg_db.add(record)
            await pg_db.flush()

            for fi in fee_items:
                pg_db.add(SellingItem(selling_id=record.selling_id, **fi))

            result["ops_count"] += 1
    except Exception as e:
        logger.error(f"Ops sync error: {e}")
        result["errors"].append(f"ops: {str(e)}")

    # --- CO 동기화 ---
    try:
        schemes = mssql_db.execute(
            select(MssqlSchemeCo).where(
                MssqlSchemeCo.is_active == True
            )
        ).scalars().all()

        for scheme in schemes:
            if not scheme.id_co:
                continue
            co = mssql_db.execute(
                select(MssqlCo).where(MssqlCo.id_co == scheme.id_co)
            ).scalar_one_or_none()
            if not co:
                continue

            total, fee_items = _extract_fees(co, CO_FEE_MAP)
            if not fee_items:
                continue

            record = SellingRecord(
                record_type="co",
                mssql_source_id=int(scheme.id_scheme_co)
                    if scheme.id_scheme_co.isdigit()
                    else hash(scheme.id_scheme_co) % 2147483647,
                mssql_cost_id=scheme.id_co,
                customer_name=scheme.ten_kh,
                invoice_no=scheme.so_invoice,
                service_date=scheme.ngay_cap,
                total_selling_vnd=total,
                item_count=len(fee_items),
                sync_status="SYNCED",
                synced_at=datetime.utcnow(),
            )
            pg_db.add(record)
            await pg_db.flush()

            for fi in fee_items:
                pg_db.add(SellingItem(selling_id=record.selling_id, **fi))

            result["co_count"] += 1
    except Exception as e:
        logger.error(f"CO sync error: {e}")
        result["errors"].append(f"co: {str(e)}")

    await pg_db.commit()
    result["total_synced"] = (
        result["clearance_count"]
        + result["ops_count"]
        + result["co_count"]
    )
    logger.info(
        f"Selling sync complete: {result['total_synced']} records "
        f"(CD:{result['clearance_count']}, OPS:{result['ops_count']}, "
        f"CO:{result['co_count']})"
    )
    return result
