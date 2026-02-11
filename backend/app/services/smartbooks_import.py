"""SmartBooks 초기 데이터 시딩 서비스

계획서의 54개 계정과목 + Cost Center 2개 + 2025년 12개월 회계기간을 시딩한다.
"""
from datetime import date
from calendar import monthrange

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.accounting import ChartOfAccount, FiscalPeriod, CostCenter


# ============================================================
# SmartBooks 54개 계정과목 마스터 데이터
# (account_code, name_vn, name_en, name_kr, account_type, normal_balance)
# ============================================================
CHART_OF_ACCOUNTS_SEED = [
    # 자산 (Assets)
    ("1111000", "Tiền mặt VND", "Cash VND", "현금(VND)", "asset", "debit"),
    ("1111200", "Tiền mặt USD", "Cash USD", "현금(USD)", "asset", "debit"),
    ("1121100", "Ngân hàng Shinhan VND", "Shinhanbank VND", "신한은행(VND)", "asset", "debit"),
    ("1121200", "Ngân hàng Vietcombank VND", "Vietcombank VND", "비엣콤뱅크(VND)", "asset", "debit"),
    ("1121300", "Ngân hàng Shinhan USD", "Shinhanbank USD", "신한은행(USD)", "asset", "debit"),
    ("1121400", "Ngân hàng Vietcombank USD", "Vietcombank USD", "비엣콤뱅크(USD)", "asset", "debit"),
    ("1131000", "Tiền đang chuyển", "Cash in transit", "미착금", "asset", "debit"),
    ("1311000", "Phải thu khách hàng", "Accounts Receivable", "매출채권", "asset", "debit"),
    ("1331100", "Thuế GTGT được khấu trừ", "VAT deductible", "매입부가세", "asset", "debit"),
    ("1388100", "Phải thu khác", "Other Receivables", "기타미수금", "asset", "debit"),
    ("1411000", "Tạm ứng nhân viên", "Advances to employees", "선급금", "asset", "debit"),
    ("1421000", "Trả trước cho nhà cung cấp", "Prepaid to vendors", "선급금(공급사)", "asset", "debit"),
    ("1541000", "Chi phí sản xuất KDDD", "Work in progress", "WIP", "asset", "debit"),
    ("2421000", "Chi phí trả trước", "Prepaid Expenses", "선급비용", "asset", "debit"),
    ("2422000", "Chi phí trả trước 2", "Prepaid Expenses 2", "선급비용2", "asset", "debit"),
    # 부채 (Liabilities)
    ("3311000", "Phải trả nhà cung cấp", "Accounts Payable", "매입채무", "liability", "credit"),
    ("3331100", "Thuế GTGT đầu ra", "Output VAT", "매출부가세", "liability", "credit"),
    ("3331300", "Thuế GTGT nhập khẩu", "Import VAT", "수입부가세", "liability", "credit"),
    ("3334000", "Thuế TNDN", "Corporate Income Tax", "법인세", "liability", "credit"),
    ("3335000", "Thuế TNCN", "Personal Income Tax", "개인소득세", "liability", "credit"),
    ("3337000", "Thuế nhà đất", "Land tax", "토지세", "liability", "credit"),
    ("3338000", "Thuế khác", "Other taxes", "기타세금", "liability", "credit"),
    ("3339000", "Phí khác", "Other fees", "기타수수료", "liability", "credit"),
    ("3382000", "Phí công đoàn", "Union fee", "노조비", "liability", "credit"),
    ("3383000", "Bảo hiểm xã hội", "Social Insurance", "사회보험", "liability", "credit"),
    ("3384000", "Bảo hiểm y tế", "Health Insurance", "의료보험", "liability", "credit"),
    ("3386000", "Bảo hiểm thất nghiệp", "Unemployment Insurance", "실업보험", "liability", "credit"),
    ("3388000", "Phải trả khác", "Other Payables", "기타미지급금", "liability", "credit"),
    # 자본 (Equity)
    ("4111000", "Vốn đầu tư", "Invested Capital", "자본금", "equity", "credit"),
    ("4211000", "Lợi nhuận chưa phân phối (kỳ trước)", "Retained Earnings (Prior)", "이익잉여금(전기)", "equity", "credit"),
    ("4212000", "Lợi nhuận chưa phân phối (kỳ này)", "Retained Earnings (Current)", "이익잉여금(당기)", "equity", "credit"),
    # 수익 (Revenue)
    ("5113001", "Doanh thu dịch vụ logistics", "Logistics Revenue", "물류서비스매출", "revenue", "credit"),
    ("5113002", "Doanh thu dịch vụ BCQT", "BCQT Revenue", "BCQT서비스매출", "revenue", "credit"),
    ("5113008", "Doanh thu dịch vụ khác", "Other Service Revenue", "기타서비스매출", "revenue", "credit"),
    ("5150000", "Doanh thu tài chính", "Financial Income", "금융수익", "revenue", "credit"),
    # 비용 (Expenses)
    ("6320000", "Giá vốn hàng bán", "COGS (Direct)", "매출원가", "expense", "debit"),
    ("6350000", "Chi phí tài chính", "Financial Expenses", "금융비용", "expense", "debit"),
    ("6351000", "Lỗ tỷ giá", "FX Loss", "환차손", "expense", "debit"),
    ("6352000", "Lãi tỷ giá", "FX Gain", "환차익", "expense", "credit"),
    ("6421000", "Lương", "Salaries", "급여", "expense", "debit"),
    ("6422000", "Vật liệu", "Materials", "재료비", "expense", "debit"),
    ("6423000", "Khấu hao", "Depreciation", "감가상각비", "expense", "debit"),
    ("6424000", "Sửa chữa bảo dưỡng", "Maintenance", "수선유지비", "expense", "debit"),
    ("6425000", "Thuế, phí lệ phí", "Taxes & Fees", "세금/수수료", "expense", "debit"),
    ("6426000", "Phân bổ chi phí trả trước", "Amortization", "선급비용상각", "expense", "debit"),
    ("6427000", "Dịch vụ thuê ngoài", "Outsourced Services", "외주서비스비", "expense", "debit"),
    ("6428000", "Chi phí QLDN khác", "Other SGA", "기타판관비", "expense", "debit"),
    ("7110000", "Thu nhập khác", "Other Income", "기타수익", "revenue", "credit"),
    ("8110000", "Chi phí khác", "Other Expenses", "기타비용", "expense", "debit"),
    ("8211000", "Chi phí thuế TNDN hiện hành", "CIT Current", "법인세비용", "expense", "debit"),
    ("8212000", "Chi phí thuế TNDN hoãn lại", "CIT Deferred", "법인세비용(이연)", "expense", "debit"),
    ("9110000", "Xác định kết quả kinh doanh", "P&L Settlement (911)", "손익결산", "equity", "debit"),
]

# 비용센터 시딩 데이터
COST_CENTERS_SEED = [
    ("LOGISTIC", "Bộ phận Logistics", "Logistics Division", "물류사업부", "logistic"),
    ("GENERAL", "Bộ phận Quản lý", "General Administration", "관리부", "general"),
]


def _account_type_to_group(code: str) -> str:
    """계정코드 앞 3자리를 그룹코드로 반환"""
    return code[:3]


async def seed_chart_of_accounts(db: AsyncSession) -> dict:
    """54개 계정과목 시딩 — 이미 존재하면 스킵"""
    created = 0
    skipped = 0

    for code, name_vn, name_en, name_kr, acc_type, normal_bal in CHART_OF_ACCOUNTS_SEED:
        existing = await db.execute(
            select(ChartOfAccount).where(ChartOfAccount.account_code == code)
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        account = ChartOfAccount(
            account_code=code,
            account_name_vn=name_vn,
            account_name_en=name_en,
            account_name_kr=name_kr,
            account_type=acc_type,
            account_group=_account_type_to_group(code),
            parent_account_code=None,
            is_detail_account=True,
            normal_balance=normal_bal,
            is_active=True,
            smartbooks_mapped=True,
        )
        db.add(account)
        created += 1

    await db.commit()
    return {"created": created, "skipped": skipped, "total": len(CHART_OF_ACCOUNTS_SEED)}


async def seed_cost_centers(db: AsyncSession) -> dict:
    """비용센터 2개 시딩 — 이미 존재하면 스킵"""
    created = 0
    skipped = 0

    for code, name_vn, name_en, name_kr, center_type in COST_CENTERS_SEED:
        existing = await db.execute(
            select(CostCenter).where(CostCenter.center_code == code)
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        center = CostCenter(
            center_code=code,
            center_name_vn=name_vn,
            center_name_en=name_en,
            center_name_kr=name_kr,
            center_type=center_type,
        )
        db.add(center)
        created += 1

    await db.commit()
    return {"created": created, "skipped": skipped, "total": len(COST_CENTERS_SEED)}


async def seed_fiscal_periods(db: AsyncSession, year: int = 2025) -> dict:
    """특정 연도 12개월 회계기간 시딩 — 이미 존재하면 스킵"""
    created = 0
    skipped = 0

    for month in range(1, 13):
        existing = await db.execute(
            select(FiscalPeriod).where(
                FiscalPeriod.fiscal_year == year,
                FiscalPeriod.period_month == month,
            )
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        _, last_day = monthrange(year, month)
        period = FiscalPeriod(
            fiscal_year=year,
            period_month=month,
            start_date=date(year, month, 1),
            end_date=date(year, month, last_day),
        )
        db.add(period)
        created += 1

    await db.commit()
    return {"created": created, "skipped": skipped, "total": 12}


async def seed_all(db: AsyncSession) -> dict:
    """전체 시딩: 계정과목 + 비용센터 + 회계기간"""
    coa = await seed_chart_of_accounts(db)
    cc = await seed_cost_centers(db)
    fp = await seed_fiscal_periods(db, 2025)
    return {
        "chart_of_accounts": coa,
        "cost_centers": cc,
        "fiscal_periods": fp,
    }


# ============================================================
# GLTran 임포트 (Sprint 8 확장)
# ============================================================
async def import_gltran_data(
    db: AsyncSession,
    rows: list[dict],
) -> dict:
    """GLTran Excel 행 데이터를 분개전표로 임포트

    rows: [{ Module, Batch Nbr, Ref Nbr, Acct Period, Voucher Date,
             Description VN, Description EN, Description KR,
             Account, Dr Amount, Cr Amount, Cury Dr Amount, Cury Cr Amount,
             Cury ID, Cury Rate, Vendor ID, Customer ID, Employee ID,
             Cost Center, Invoice No, Invoice Date, Serial No,
             Tax Code, Tax Amount, Tax Account, ... }, ...]

    전표 그룹핑: (Module, Batch Nbr, Ref Nbr)가 같은 행은 같은 전표의 라인
    """
    from decimal import Decimal as D
    from datetime import datetime as dt
    from app.models.journal import JournalEntry, JournalLine

    entries_created = 0
    lines_created = 0
    skipped = 0
    errors = []

    # 전표 그룹핑
    entry_groups: dict[str, list[dict]] = {}
    for row in rows:
        module = str(row.get("Module", "")).strip()
        batch = str(row.get("Batch Nbr", "")).strip()
        ref = str(row.get("Ref Nbr", "")).strip()
        if not module or not ref:
            skipped += 1
            continue
        key = f"{module}|{batch}|{ref}"
        entry_groups.setdefault(key, []).append(row)

    for key, group_rows in entry_groups.items():
        module, batch, ref = key.split("|", 2)
        first = group_rows[0]

        # 전표번호 중복 체크
        existing = await db.execute(
            select(JournalEntry).where(
                JournalEntry.entry_number == ref,
            )
        )
        if existing.scalar_one_or_none():
            skipped += len(group_rows)
            continue

        # 회계기간 파싱: "012025" → month=1, year=2025
        acct_period = str(first.get("Acct Period", "")).strip()
        try:
            fiscal_month = int(acct_period[:2])
            fiscal_year = int(acct_period[2:])
        except (ValueError, IndexError):
            fiscal_year = dt.utcnow().year
            fiscal_month = 1
            errors.append(f"{ref}: Invalid Acct Period '{acct_period}'")

        # 전표일자
        voucher_date = first.get("Voucher Date")
        if isinstance(voucher_date, str):
            try:
                voucher_date = dt.strptime(voucher_date, "%Y-%m-%d").date()
            except ValueError:
                voucher_date = None
        entry_date = voucher_date or date(fiscal_year, fiscal_month, 1)

        # 라인 생성 + 차대 합계
        total_debit = D("0")
        total_credit = D("0")
        lines = []

        for i, r in enumerate(group_rows, 1):
            dr = D(str(r.get("Dr Amount", 0) or 0))
            cr = D(str(r.get("Cr Amount", 0) or 0))
            total_debit += dr
            total_credit += cr

            line = JournalLine(
                line_number=i,
                account_code=str(r.get("Account", "")).strip()[:7],
                description_vn=str(r.get("Description VN", "") or "").strip()[:500] or None,
                description_en=str(r.get("Description EN", "") or "").strip()[:500] or None,
                debit_amount=dr,
                credit_amount=cr,
                currency_amount=D(str(r.get("Cury Dr Amount", 0) or 0))
                    or D(str(r.get("Cury Cr Amount", 0) or 0)) or None,
                currency_code=str(r.get("Cury ID", "VND")).strip()[:3] or None,
                exchange_rate=D(str(r.get("Cury Rate", 1) or 1)),
                vendor_id=str(r.get("Vendor ID", "") or "").strip()[:20] or None,
                customer_id=str(r.get("Customer ID", "") or "").strip()[:20] or None,
                employee_id=str(r.get("Employee ID", "") or "").strip()[:20] or None,
                cost_center_id=None,
                job_center=str(r.get("Job Center", "") or "").strip()[:20] or None,
                profit_center=str(r.get("Profit Center", "") or "").strip()[:20] or None,
                tax_code=str(r.get("Tax Code", "") or "").strip()[:10] or None,
                tax_amount=D(str(r.get("Tax Amount", 0) or 0)),
                tax_account=str(r.get("Tax Account", "") or "").strip()[:7] or None,
            )
            lines.append(line)

        entry = JournalEntry(
            entry_number=ref,
            module=module[:5],
            fiscal_year=fiscal_year,
            fiscal_month=fiscal_month,
            entry_date=entry_date,
            voucher_date=voucher_date,
            description_vn=str(first.get("Description VN", "") or "").strip()[:500] or None,
            description_en=str(first.get("Description EN", "") or "").strip()[:500] or None,
            description_kr=str(first.get("Description KR", "") or "").strip()[:500] or None,
            currency_code=str(first.get("Cury ID", "VND")).strip()[:3],
            exchange_rate=D(str(first.get("Cury Rate", 1) or 1)),
            total_debit=total_debit,
            total_credit=total_credit,
            status="posted",
            source="smartbooks_import",
            smartbooks_batch_nbr=batch[:20] if batch else None,
            vendor_id=str(first.get("Vendor ID", "") or "").strip()[:20] or None,
            customer_id=str(first.get("Customer ID", "") or "").strip()[:20] or None,
            employee_id=str(first.get("Employee ID", "") or "").strip()[:20] or None,
            invoice_no=str(first.get("Invoice No", "") or "").strip()[:50] or None,
            serial_no=str(first.get("Serial No", "") or "").strip()[:50] or None,
        )
        entry.lines = lines
        db.add(entry)
        entries_created += 1
        lines_created += len(lines)

    await db.commit()
    return {
        "entries_created": entries_created,
        "lines_created": lines_created,
        "errors": errors[:50],
        "skipped": skipped,
    }
