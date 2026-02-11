"""거래처 자동 매칭 서비스

SmartBooks 분개장의 Vendor/Customer ID를
ERP erp_suppliers / MSSQL clients와 tax_id 기준으로 매칭한다.
"""
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.journal import JournalEntry, JournalLine
from app.models.accounting_parties import AccountingVendor, AccountingCustomer
from app.models.buying import Supplier


async def extract_vendors_from_journal(db: AsyncSession) -> dict:
    """분개장에서 고유 Vendor ID 추출 → erp_accounting_vendors에 시딩"""
    # 분개장에서 고유 vendor_id 추출
    q = (
        select(distinct(JournalEntry.vendor_id))
        .where(JournalEntry.vendor_id.isnot(None))
        .where(JournalEntry.vendor_id != "")
    )
    result = await db.execute(q)
    vendor_ids = [r[0] for r in result if r[0]]

    created = 0
    skipped = 0

    for vid in vendor_ids:
        existing = await db.execute(
            select(AccountingVendor).where(AccountingVendor.tax_id == vid)
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        vendor = AccountingVendor(
            tax_id=vid,
            vendor_name_vn=vid,
            source="smartbooks_import",
        )
        db.add(vendor)
        created += 1

    await db.commit()
    return {"created": created, "skipped": skipped, "total": len(vendor_ids)}


async def extract_customers_from_journal(db: AsyncSession) -> dict:
    """분개장에서 고유 Customer ID 추출 → erp_accounting_customers에 시딩"""
    q = (
        select(distinct(JournalEntry.customer_id))
        .where(JournalEntry.customer_id.isnot(None))
        .where(JournalEntry.customer_id != "")
    )
    result = await db.execute(q)
    customer_ids = [r[0] for r in result if r[0]]

    created = 0
    skipped = 0

    for cid in customer_ids:
        existing = await db.execute(
            select(AccountingCustomer).where(AccountingCustomer.tax_id == cid)
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        customer = AccountingCustomer(
            tax_id=cid,
            customer_name_vn=cid,
            source="smartbooks_import",
        )
        db.add(customer)
        created += 1

    await db.commit()
    return {"created": created, "skipped": skipped, "total": len(customer_ids)}


async def match_vendors_to_suppliers(db: AsyncSession) -> dict:
    """회계 공급사 ↔ ERP 공급사 (tax_id 기준 자동 매칭)"""
    # 미매핑 회계 공급사
    q = select(AccountingVendor).where(
        AccountingVendor.mssql_supplier_ref.is_(None),
    )
    result = await db.execute(q)
    vendors = result.scalars().all()

    matched = 0
    details = []

    for v in vendors:
        # erp_suppliers의 tax_id와 매칭
        sup_q = select(Supplier).where(Supplier.tax_id == v.tax_id)
        sup_result = await db.execute(sup_q)
        supplier = sup_result.scalar_one_or_none()

        if supplier:
            v.mssql_supplier_ref = supplier.supplier_id
            v.vendor_name_en = v.vendor_name_en or supplier.supplier_name
            matched += 1
            details.append(f"{v.tax_id} → {supplier.supplier_name}")

    await db.commit()
    return {
        "matched": matched,
        "unmatched": len(vendors) - matched,
        "details": details[:50],
    }
