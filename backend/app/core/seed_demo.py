"""전체 메뉴 데모 데이터 시드 — RBAC 테스트용

모든 27개 메뉴 페이지에 샘플 데이터를 생성하여
admin / accountant / pic 역할별 화면을 즉시 확인할 수 있도록 한다.

실행: docker compose exec backend python -m app.core.seed_demo
(기본 seed 실행 후에 돌려야 함)
"""
import asyncio
import random
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.core.database import async_session
from app.models import *


# ── 헬퍼 ──────────────────────────────────────────
def d(y: int, m: int, day: int) -> date:
    return date(y, m, day)


def rand_vnd(low: int, high: int) -> Decimal:
    return Decimal(random.randint(low, high))


CUSTOMERS = [
    ("NEXCON", "NEXCON VIETNAM CO., LTD"),
    ("INZI", "INZI CONTROLS VINA CO., LTD"),
    ("SEOYON", "SEOYON E-HWA VINA CO., LTD"),
    ("DONGWON", "DONGWON SYSTEMS VIETNAM"),
    ("ILJIN", "ILJIN ELECTRIC CO., LTD"),
]

SUPPLIERS_DATA = [
    ("SUP-HAIPHONG", "Hai Phong Logistics Co.", "shipping_line", "VND"),
    ("SUP-COSCO", "COSCO Shipping Lines Vietnam", "shipping_line", "USD"),
    ("SUP-VIETRANS", "Vietrans Forwarding", "trucking", "VND"),
    ("SUP-HANSOL", "Hansol Logistics", "trucking", "VND"),
    ("SUP-CUSTOMS01", "Vietnam Customs Broker JSC", "customs_broker", "VND"),
    ("SUP-CO-AGENT", "VCCI CO Agent", "co_agent", "VND"),
]


# ── 1. 거래처 (Clients) ──────────────────────────────
async def seed_clients():
    async with async_session() as s:
        existing = (await s.execute(select(Client))).scalars().all()
        existing_codes = {c.client_code for c in existing}
        new_clients = []
        for code, name in CUSTOMERS:
            if code not in existing_codes:
                new_clients.append(Client(
                    client_code=code, client_name=name,
                    client_name_en=name, currency="VND",
                    complexity="High", batch="Batch 1",
                    structure_type="Multi-sheet", is_active=True,
                ))
        if new_clients:
            s.add_all(new_clients)
            await s.commit()
        print(f"Clients: {len(new_clients)} 추가 (기존 {len(existing_codes)})")


# ── 2. 환율 (Exchange Rates) ─────────────────────────
async def seed_exchange_rates():
    async with async_session() as s:
        existing = (await s.execute(select(ExchangeRate))).scalars().all()
        existing_dates = {(r.currency_from, r.rate_date) for r in existing}
        rates = []
        base = date(2025, 1, 1)
        for i in range(24):  # 24개월치
            m = base.month + i
            y = base.year + (m - 1) // 12
            m = ((m - 1) % 12) + 1
            rd = date(y, m, 1)
            if ("USD", rd) not in existing_dates:
                rates.append(ExchangeRate(
                    currency_from="USD", currency_to="VND",
                    rate=Decimal(str(round(25400 + random.randint(0, 1200), -1))),
                    rate_date=rd, source="bank",
                ))
        if rates:
            s.add_all(rates)
            await s.commit()
        print(f"ExchangeRates: {len(rates)} 추가")


# ── 3. 선적 (Shipments) — 거래데이터 페이지 ────────────
async def seed_shipments():
    async with async_session() as s:
        existing = (await s.execute(select(Shipment))).scalars().all()
        if len(existing) >= 20:
            print(f"Shipments: 이미 {len(existing)}건 존재, 건너뜀")
            return

        clients = {c.client_code: c for c in (await s.execute(select(Client))).scalars().all()}
        fee_items = (await s.execute(select(FeeItem))).scalars().all()
        users = (await s.execute(select(User))).scalars().all()
        user_ids = [u.user_id for u in users]

        shipments = []
        details = []
        terms = ["FOB", "EXW", "DAP", "CIF", "CFR"]
        cd_types = ["A12", "E21", "A11", "E31"]
        ship_types = ["IMPORT", "EXPORT"]

        for idx in range(1, 51):
            ccode = random.choice(list(clients.keys()))
            stype = random.choice(ship_types)
            sd = date(2025, random.randint(1, 12), random.randint(1, 28))
            inv = f"INV-{sd.strftime('%y%m')}-{idx:04d}"
            shp = Shipment(
                client_id=clients[ccode].client_id,
                line_no=idx,
                delivery_date=sd,
                invoice_no=inv,
                mbl=f"MBL{random.randint(10000, 99999)}",
                hbl=f"HBL{random.randint(10000, 99999)}",
                term=random.choice(terms),
                no_of_pkgs=random.randint(1, 50),
                gross_weight=Decimal(str(round(random.uniform(100, 5000), 1))),
                chargeable_weight=Decimal(str(round(random.uniform(100, 5000), 1))),
                cd_no=f"CD{random.randint(100000, 999999)}",
                cd_type=random.choice(cd_types),
                shipment_type=stype,
                source_app=random.choice(["OPS", "Clearance", "CO"]),
                status="ACTIVE",
                created_by=random.choice(user_ids),
            )
            shipments.append(shp)

        s.add_all(shipments)
        await s.flush()

        for shp in shipments:
            for fi in random.sample(fee_items, min(4, len(fee_items))):
                amt = Decimal(str(round(random.uniform(50, 2000), 2)))
                details.append(ShipmentFeeDetail(
                    shipment_id=shp.shipment_id,
                    fee_item_id=fi.fee_item_id,
                    amount_usd=amt,
                    amount_vnd=amt * 25800,
                    currency="USD",
                ))

        s.add_all(details)
        await s.commit()
        print(f"Shipments: {len(shipments)}건 + FeeDetails: {len(details)}건")


# ── 4. 공급사 (Suppliers) ──────────────────────────────
async def seed_suppliers():
    async with async_session() as s:
        existing = {sup.supplier_code for sup in (await s.execute(select(Supplier))).scalars().all()}
        new_sups = []
        for code, name, stype, cur in SUPPLIERS_DATA:
            if code not in existing:
                new_sups.append(Supplier(
                    supplier_code=code, supplier_name=name,
                    supplier_type=stype, currency=cur,
                    contact_person=f"{name} 담당자",
                    contact_email=f"{code.lower().replace('-', '')}@example.com",
                    payment_terms="NET30", is_active=True,
                ))
        if new_sups:
            s.add_all(new_sups)
            await s.commit()
        print(f"Suppliers: {len(new_sups)} 추가")


# ── 5. 매입 (Purchase Orders) ─────────────────────────
async def seed_purchase_orders():
    async with async_session() as s:
        existing = (await s.execute(select(PurchaseOrder))).unique().scalars().all()
        if len(existing) >= 10:
            print(f"PurchaseOrders: 이미 {len(existing)}건, 건너뜀")
            return

        suppliers = (await s.execute(select(Supplier))).scalars().all()
        if not suppliers:
            print("PurchaseOrders: 공급사 없음, 건너뜀")
            return

        pos = []
        items_list = []
        statuses = ["DRAFT", "CONFIRMED", "CONFIRMED", "CONFIRMED"]
        pay_statuses = ["UNPAID", "PARTIAL", "PAID", "PAID"]
        svc_types = ["freight", "handling", "customs", "trucking", "co"]

        for idx in range(1, 21):
            sup = random.choice(suppliers)
            amt = Decimal(str(round(random.uniform(5000000, 50000000), 0)))
            vat = amt * Decimal("0.08")
            po = PurchaseOrder(
                po_number=f"PO-2025{random.randint(1, 12):02d}-{idx:05d}",
                supplier_id=sup.supplier_id,
                service_type=random.choice(svc_types),
                invoice_no=f"SINV-{idx:04d}",
                invoice_date=date(2025, random.randint(1, 12), random.randint(1, 28)),
                amount=amt, currency=sup.currency,
                vat_rate=Decimal("8"), vat_amount=vat,
                total_amount=amt + vat,
                status=random.choice(statuses),
                payment_status=random.choice(pay_statuses),
            )
            pos.append(po)

        s.add_all(pos)
        await s.flush()

        for po in pos:
            for j in range(random.randint(1, 3)):
                unit_price = Decimal(str(round(random.uniform(500000, 10000000), 0)))
                items_list.append(PurchaseItem(
                    po_id=po.po_id,
                    description=f"서비스 항목 {j + 1}",
                    cost_category=po.service_type,
                    quantity=Decimal("1"),
                    unit_price=unit_price,
                    currency=po.currency,
                    amount=unit_price,
                ))

        s.add_all(items_list)
        await s.commit()
        print(f"PurchaseOrders: {len(pos)}건 + Items: {len(items_list)}건")


# ── 6. 매출 (Selling Records) ─────────────────────────
async def seed_selling_records():
    async with async_session() as s:
        existing = (await s.execute(select(SellingRecord))).unique().scalars().all()
        if len(existing) >= 20:
            print(f"SellingRecords: 이미 {len(existing)}건, 건너뜀")
            return

        record_types = ["clearance", "ops", "co"]
        fee_names_map = {
            "clearance": ["통관비", "검역비", "핸들링비", "기타"],
            "ops": ["운송비", "하역비", "창고비", "포장비"],
            "co": ["CO 발급비", "원산지 증명비", "수수료"],
        }
        records = []
        items = []
        for idx in range(1, 61):
            rtype = random.choice(record_types)
            cname = random.choice(CUSTOMERS)[1]
            total = rand_vnd(2000000, 80000000)
            rec = SellingRecord(
                record_type=rtype,
                mssql_source_id=10000 + idx,
                mssql_cost_id=20000 + idx,
                customer_name=cname,
                invoice_no=f"SI-{rtype[0].upper()}{idx:04d}",
                service_date=date(2025, random.randint(1, 12), random.randint(1, 28)),
                total_selling_vnd=total,
                item_count=random.randint(2, 5),
                sync_status="SYNCED",
            )
            records.append(rec)

        s.add_all(records)
        await s.flush()

        for rec in records:
            fnames = fee_names_map[rec.record_type]
            for fn in random.sample(fnames, min(3, len(fnames))):
                items.append(SellingItem(
                    selling_id=rec.selling_id,
                    fee_name=fn,
                    fee_category=rec.record_type,
                    amount=rand_vnd(500000, 20000000),
                    currency="VND",
                ))

        s.add_all(items)
        await s.commit()
        print(f"SellingRecords: {len(records)}건 + Items: {len(items)}건")


# ── 7. Debit Notes ────────────────────────────────────
async def seed_debit_notes():
    async with async_session() as s:
        existing = (await s.execute(select(DebitNote))).scalars().all()
        if len(existing) >= 5:
            print(f"DebitNotes: 이미 {len(existing)}건, 건너뜀")
            return

        clients = (await s.execute(select(Client))).scalars().all()
        shipments = (await s.execute(select(Shipment))).scalars().all()
        users = (await s.execute(select(User))).scalars().all()
        if not clients or not shipments:
            print("DebitNotes: 필요 데이터 없음, 건너뜀")
            return

        admin_user = next((u for u in users if u.username == "admin"), users[0])
        dns = []
        dn_lines = []
        statuses = ["DRAFT", "PENDING_REVIEW", "APPROVED", "APPROVED", "EXPORTED"]

        for idx in range(1, 11):
            cl = random.choice(clients)
            month = random.randint(1, 12)
            dn = DebitNote(
                debit_note_number=f"DN-2025{month:02d}-{idx:05d}",
                client_id=cl.client_id,
                period_from=date(2025, month, 1),
                period_to=date(2025, month, 28),
                billing_date=date(2025, month, 28),
                total_usd=Decimal(str(round(random.uniform(5000, 50000), 2))),
                total_vnd=rand_vnd(100000000, 1200000000),
                total_vat=rand_vnd(8000000, 96000000),
                grand_total_vnd=rand_vnd(108000000, 1296000000),
                exchange_rate=Decimal("25800"),
                status=random.choice(statuses),
                sheet_type=random.choice(["IMPORT", "EXPORT"]),
                created_by=admin_user.user_id,
                total_lines=random.randint(3, 10),
            )
            dns.append(dn)

        s.add_all(dns)
        await s.flush()

        for dn in dns:
            cl_shipments = [sh for sh in shipments if sh.client_id == dn.client_id]
            if not cl_shipments:
                cl_shipments = shipments[:5]
            for line_idx, sh in enumerate(random.sample(cl_shipments, min(5, len(cl_shipments))), 1):
                total_usd = Decimal(str(round(random.uniform(100, 5000), 2)))
                total_vnd = total_usd * 25800
                vat = total_vnd * Decimal("0.08")
                dn_lines.append(DebitNoteLine(
                    debit_note_id=dn.debit_note_id,
                    shipment_id=sh.shipment_id,
                    line_no=line_idx,
                    total_usd=total_usd,
                    total_vnd=total_vnd,
                    vat_amount=vat,
                    grand_total_vnd=total_vnd + vat,
                    freight_usd=Decimal(str(round(random.uniform(50, 2000), 2))),
                    local_charges_usd=Decimal(str(round(random.uniform(30, 800), 2))),
                ))

        s.add_all(dn_lines)
        await s.commit()
        print(f"DebitNotes: {len(dns)}건 + Lines: {len(dn_lines)}건")


# ── 8. 계정과목 (Chart of Accounts) ───────────────────
async def seed_chart_of_accounts():
    async with async_session() as s:
        existing = (await s.execute(select(ChartOfAccount))).scalars().all()
        if len(existing) >= 10:
            print(f"ChartOfAccounts: 이미 {len(existing)}건, 건너뜀")
            return

        accounts = [
            # 자산
            ("1111000", "Tiền mặt VND", "Cash VND", "현금 VND", "asset", "111", "debit"),
            ("1121000", "Tiền gửi ngân hàng VND", "Bank deposit VND", "보통예금 VND", "asset", "112", "debit"),
            ("1122000", "Tiền gửi ngân hàng USD", "Bank deposit USD", "외화예금 USD", "asset", "112", "debit"),
            ("1311000", "Phải thu khách hàng", "Accounts receivable", "매출채권", "asset", "131", "debit"),
            ("1331000", "Thuế GTGT đầu vào", "VAT input", "매입 부가세", "asset", "133", "debit"),
            # 부채
            ("3311000", "Phải trả người bán", "Accounts payable", "매입채무", "liability", "331", "credit"),
            ("3331000", "Thuế GTGT đầu ra", "VAT output", "매출 부가세", "liability", "333", "credit"),
            ("3341000", "Phải trả nhân viên", "Payable to employees", "미지급급여", "liability", "334", "credit"),
            # 자본
            ("4111000", "Vốn đầu tư CSH", "Owner's equity", "자본금", "equity", "411", "credit"),
            ("4211000", "Lợi nhuận chưa phân phối", "Retained earnings", "이익잉여금", "equity", "421", "credit"),
            # 수익
            ("5113001", "DT cung cấp dịch vụ logistics", "Logistics service revenue", "물류 서비스 매출", "revenue", "511", "credit"),
            ("5113002", "DT dịch vụ BCQT", "BCQT service revenue", "BCQT 서비스 매출", "revenue", "511", "credit"),
            ("5113008", "DT dịch vụ khác", "Other service revenue", "기타 서비스 매출", "revenue", "511", "credit"),
            ("5158000", "DT hoạt động tài chính", "Financial income", "금융수익", "revenue", "515", "credit"),
            # 비용
            ("6320000", "Giá vốn hàng bán", "COGS", "매출원가", "expense", "632", "debit"),
            ("6421000", "Lương nhân viên", "Employee salary", "급여", "expense", "642", "debit"),
            ("6422000", "Tiền thuê văn phòng", "Office rent", "임차료", "expense", "642", "debit"),
            ("6423000", "Điện nước", "Utilities", "수도광열비", "expense", "642", "debit"),
            ("6424000", "Khấu hao TSCĐ", "Depreciation", "감가상각비", "expense", "642", "debit"),
            ("6425000", "Chi phí thuê ngoài", "Outsourcing expense", "외주비", "expense", "642", "debit"),
            ("6358000", "Chi phí tài chính", "Financial expense", "금융비용", "expense", "635", "debit"),
        ]
        coa_list = []
        existing_codes = {a.account_code for a in existing}
        for code, vn, en, kr, atype, grp, nb in accounts:
            if code not in existing_codes:
                coa_list.append(ChartOfAccount(
                    account_code=code, account_name_vn=vn,
                    account_name_en=en, account_name_kr=kr,
                    account_type=atype, account_group=grp,
                    normal_balance=nb, is_detail_account=True,
                    is_active=True, smartbooks_mapped=True,
                ))
        if coa_list:
            s.add_all(coa_list)
            await s.commit()
        print(f"ChartOfAccounts: {len(coa_list)} 추가")


# ── 9. 회계기간 (Fiscal Periods) ──────────────────────
async def seed_fiscal_periods():
    async with async_session() as s:
        existing = (await s.execute(select(FiscalPeriod))).scalars().all()
        if len(existing) >= 12:
            print(f"FiscalPeriods: 이미 {len(existing)}건, 건너뜀")
            return

        existing_keys = {(fp.fiscal_year, fp.period_month) for fp in existing}
        periods = []
        for year in [2025, 2026]:
            for month in range(1, 13):
                if (year, month) not in existing_keys:
                    from calendar import monthrange
                    last_day = monthrange(year, month)[1]
                    periods.append(FiscalPeriod(
                        fiscal_year=year,
                        period_month=month,
                        start_date=date(year, month, 1),
                        end_date=date(year, month, last_day),
                        is_closed=month <= 11 and year == 2025,
                    ))
        if periods:
            s.add_all(periods)
            await s.commit()
        print(f"FiscalPeriods: {len(periods)} 추가")


# ── 10. 분개장 (Journal Entries) ──────────────────────
async def seed_journal_entries():
    async with async_session() as s:
        existing = (await s.execute(select(JournalEntry))).unique().scalars().all()
        if len(existing) >= 10:
            print(f"JournalEntries: 이미 {len(existing)}건, 건너뜀")
            return

        modules = ["GL", "AP", "AR"]
        entries = []
        lines = []

        journal_data = [
            ("GL", "5113001", "1311000", 45000000, "매출 인식 — NEXCON 1월"),
            ("GL", "5113001", "1311000", 62000000, "매출 인식 — INZI 1월"),
            ("GL", "6320000", "3311000", 28000000, "매출원가 — 운송비"),
            ("AP", "6421000", "3341000", 35000000, "1월 급여"),
            ("AP", "6422000", "3311000", 15000000, "1월 임차료"),
            ("AR", "1311000", "5113001", 38000000, "매출 인식 — SEOYON 2월"),
            ("GL", "6320000", "3311000", 22000000, "매출원가 — 통관비 2월"),
            ("AP", "6423000", "1111000", 3500000, "2월 수도광열비"),
            ("GL", "5113002", "1311000", 18000000, "BCQT 매출 3월"),
            ("AP", "6424000", "1111000", 8000000, "3월 감가상각비"),
            ("GL", "5113001", "1311000", 72000000, "매출 인식 — DONGWON 4월"),
            ("GL", "6320000", "3311000", 41000000, "매출원가 4월"),
            ("AP", "6421000", "3341000", 36000000, "4월 급여"),
            ("GL", "5158000", "1121000", 2500000, "이자 수익 4월"),
            ("GL", "6358000", "1121000", 1800000, "환차손 4월"),
        ]

        for idx, (mod, debit_acc, credit_acc, amount, desc) in enumerate(journal_data, 1):
            month = min(((idx - 1) // 3) + 1, 12)
            entry = JournalEntry(
                entry_number=f"{mod}25/{month:02d}{idx:04d}",
                module=mod,
                fiscal_year=2025,
                fiscal_month=month,
                entry_date=date(2025, month, random.randint(1, 28)),
                description_vn=desc,
                description_en=desc,
                description_kr=desc,
                currency_code="VND",
                exchange_rate=Decimal("1"),
                total_debit=Decimal(str(amount)),
                total_credit=Decimal(str(amount)),
                status="posted",
                source="manual",
            )
            entries.append(entry)

        s.add_all(entries)
        await s.flush()

        for idx, (entry, (mod, debit_acc, credit_acc, amount, _)) in enumerate(
            zip(entries, journal_data)
        ):
            amt = Decimal(str(amount))
            lines.append(JournalLine(
                entry_id=entry.entry_id, line_number=1,
                account_code=debit_acc, debit_amount=amt, credit_amount=Decimal("0"),
            ))
            lines.append(JournalLine(
                entry_id=entry.entry_id, line_number=2,
                account_code=credit_acc, debit_amount=Decimal("0"), credit_amount=amt,
            ))

        s.add_all(lines)
        await s.commit()
        print(f"JournalEntries: {len(entries)}건 + Lines: {len(lines)}건")


# ── 11. 시산표 / 계정잔액 (Account Balances) ──────────
async def seed_account_balances():
    async with async_session() as s:
        existing = (await s.execute(select(AccountBalance))).scalars().all()
        if len(existing) >= 10:
            print(f"AccountBalances: 이미 {len(existing)}건, 건너뜀")
            return

        balance_data = [
            ("1111000", 2025, 1, 50000000, 0, 120000000, 80000000),
            ("1121000", 2025, 1, 500000000, 0, 350000000, 280000000),
            ("1311000", 2025, 1, 0, 0, 145000000, 95000000),
            ("3311000", 2025, 1, 0, 200000000, 85000000, 130000000),
            ("5113001", 2025, 1, 0, 0, 0, 107000000),
            ("6320000", 2025, 1, 0, 0, 50000000, 0),
            ("6421000", 2025, 1, 0, 0, 35000000, 0),
            ("1111000", 2025, 2, 90000000, 0, 95000000, 75000000),
            ("1121000", 2025, 2, 570000000, 0, 280000000, 220000000),
            ("1311000", 2025, 2, 50000000, 0, 38000000, 28000000),
            ("5113001", 2025, 2, 0, 0, 0, 38000000),
            ("6320000", 2025, 2, 0, 0, 22000000, 0),
            ("6423000", 2025, 2, 0, 0, 3500000, 0),
            ("1111000", 2025, 3, 110000000, 0, 80000000, 65000000),
            ("5113002", 2025, 3, 0, 0, 0, 18000000),
            ("6424000", 2025, 3, 0, 0, 8000000, 0),
            ("5113001", 2025, 4, 0, 0, 0, 72000000),
            ("6320000", 2025, 4, 0, 0, 41000000, 0),
            ("6421000", 2025, 4, 0, 0, 36000000, 0),
            ("5158000", 2025, 4, 0, 0, 0, 2500000),
            ("6358000", 2025, 4, 0, 0, 1800000, 0),
        ]
        balances = []
        for code, fy, fm, od, oc, pd, pc in balance_data:
            closing_d = od + pd - pc
            closing_c = oc + pc - pd
            if closing_d < 0:
                closing_c = abs(closing_d)
                closing_d = 0
            if closing_c < 0:
                closing_d = abs(closing_c)
                closing_c = 0
            balances.append(AccountBalance(
                account_code=code, fiscal_year=fy, fiscal_month=fm,
                opening_debit=Decimal(str(od)), opening_credit=Decimal(str(oc)),
                period_debit=Decimal(str(pd)), period_credit=Decimal(str(pc)),
                closing_debit=Decimal(str(closing_d)),
                closing_credit=Decimal(str(closing_c)),
            ))
        s.add_all(balances)
        await s.commit()
        print(f"AccountBalances: {len(balances)}건")


# ── 12. 회계 공급사/고객 ─────────────────────────────
async def seed_accounting_parties():
    async with async_session() as s:
        av_existing = (await s.execute(select(AccountingVendor))).scalars().all()
        ac_existing = (await s.execute(select(AccountingCustomer))).scalars().all()

        vendors = []
        if len(av_existing) < 5:
            vendor_data = [
                ("0101234567", "Công ty TNHH Vận tải Hải Phòng", "Hai Phong Transport Co."),
                ("0102345678", "COSCO Shipping VN", "COSCO Shipping Vietnam"),
                ("0103456789", "Đại lý Hải quan Việt Nam", "Vietnam Customs Agent JSC"),
                ("0104567890", "Hansol Logistics VN", "Hansol Logistics VN"),
                ("0105678901", "VCCI CO Agent", "VCCI CO Agent"),
            ]
            existing_tax = {v.tax_id for v in av_existing}
            for tid, vn, en in vendor_data:
                if tid not in existing_tax:
                    vendors.append(AccountingVendor(
                        tax_id=tid, vendor_name_vn=vn, vendor_name_en=en,
                        default_ap_account="3311000", currency_code="VND",
                        source="manual", is_active=True,
                    ))
            if vendors:
                s.add_all(vendors)

        customers = []
        if len(ac_existing) < 5:
            customer_data = [
                ("0201111111", "NEXCON VIETNAM CO., LTD", "NEXCON VIETNAM"),
                ("0202222222", "INZI CONTROLS VINA CO., LTD", "INZI CONTROLS VINA"),
                ("0203333333", "SEOYON E-HWA VINA CO., LTD", "SEOYON E-HWA VINA"),
                ("0204444444", "DONGWON SYSTEMS VIETNAM", "DONGWON SYSTEMS VN"),
                ("0205555555", "ILJIN ELECTRIC CO., LTD", "ILJIN ELECTRIC"),
            ]
            existing_tax = {c.tax_id for c in ac_existing}
            for tid, vn, en in customer_data:
                if tid not in existing_tax:
                    customers.append(AccountingCustomer(
                        tax_id=tid, customer_name_vn=vn, customer_name_en=en,
                        default_ar_account="1311000",
                        default_revenue_account="5113001",
                        currency_code="VND", source="manual", is_active=True,
                    ))
            if customers:
                s.add_all(customers)

        await s.commit()
        print(f"AccountingVendors: {len(vendors)} / Customers: {len(customers)} 추가")


# ── 13. 비용분류 (Cost Classifications) ───────────────
async def seed_cost_classifications():
    async with async_session() as s:
        existing = (await s.execute(select(CostClassification))).scalars().all()
        if len(existing) >= 5:
            print(f"CostClassifications: 이미 {len(existing)}건, 건너뜀")
            return

        classifications = [
            ("6421000", "fixed", "salary", "daily_prorate", "급여", "Employee salary"),
            ("6422000", "fixed", "rent", "monthly_lump", "임차료", "Office rent"),
            ("6423000", "semi_variable", "utilities", "daily_prorate", "수도광열비", "Utilities"),
            ("6424000", "fixed", "depreciation", "daily_prorate", "감가상각비", "Depreciation"),
            ("6425000", "variable", "outsourced", "revenue_based", "외주비", "Outsourcing"),
            ("6320000", "variable", "material", "revenue_based", "매출원가", "COGS"),
        ]
        cls_list = []
        for code, ctype, cat, method, vn, en in classifications:
            cls_list.append(CostClassification(
                account_code=code, cost_type=ctype, cost_category=cat,
                allocation_method=method,
                description_vn=vn, description_en=en,
                is_active=True,
                effective_from=date(2025, 1, 1),
            ))
        s.add_all(cls_list)
        await s.commit()
        print(f"CostClassifications: {len(cls_list)}건")


# ── 14. 월별 비용 (Monthly Cost Summary) ──────────────
async def seed_monthly_cost_summary():
    async with async_session() as s:
        existing = (await s.execute(select(MonthlyCostSummary))).scalars().all()
        if len(existing) >= 10:
            print(f"MonthlyCostSummary: 이미 {len(existing)}건, 건너뜀")
            return

        cost_data = [
            ("6421000", "fixed", 35000000),
            ("6422000", "fixed", 15000000),
            ("6423000", "semi_variable", 3500000),
            ("6424000", "fixed", 8000000),
            ("6425000", "variable", 12000000),
            ("6320000", "variable", 50000000),
        ]
        summaries = []
        for month in range(1, 7):
            from calendar import monthrange
            days = monthrange(2025, month)[1]
            for code, ctype, base_amt in cost_data:
                variance = random.randint(-3000000, 3000000)
                total = max(base_amt + variance, 1000000)
                summaries.append(MonthlyCostSummary(
                    fiscal_year=2025, fiscal_month=month,
                    account_code=code, cost_type=ctype,
                    total_amount=Decimal(str(total)),
                    daily_allocated_amount=Decimal(str(round(total / days))),
                    working_days=days,
                ))
        s.add_all(summaries)
        await s.commit()
        print(f"MonthlyCostSummary: {len(summaries)}건")


# ── 15. P&L (Daily + Monthly) ────────────────────────
async def seed_pnl():
    async with async_session() as s:
        existing_m = (await s.execute(select(MonthlyPnL))).scalars().all()
        if len(existing_m) >= 3:
            print(f"MonthlyPnL: 이미 {len(existing_m)}건, 건너뜀")
            return

        # 월별 P&L
        monthly_list = []
        ytd_rev, ytd_cogs, ytd_gp, ytd_op, ytd_np = 0, 0, 0, 0, 0
        for month in range(1, 7):
            rev = random.randint(80000000, 180000000)
            cogs = int(rev * random.uniform(0.35, 0.50))
            gp = rev - cogs
            fixed = random.randint(45000000, 65000000)
            variable = random.randint(8000000, 20000000)
            op = gp - fixed - variable
            fin_inc = random.randint(1000000, 4000000)
            fin_exp = random.randint(500000, 3000000)
            other = random.randint(-2000000, 2000000)
            np = op + fin_inc - fin_exp + other

            ytd_rev += rev
            ytd_cogs += cogs
            ytd_gp += gp
            ytd_op += op
            ytd_np += np

            monthly_list.append(MonthlyPnL(
                fiscal_year=2025, fiscal_month=month,
                revenue_total=rev,
                revenue_logistics=int(rev * 0.7),
                revenue_bcqt=int(rev * 0.2),
                revenue_other=int(rev * 0.1),
                cogs_total=cogs, gross_profit=gp,
                fixed_cost_allocated=fixed,
                variable_cost_total=variable,
                operating_profit=op,
                financial_income=fin_inc,
                financial_expense=fin_exp,
                other_income_expense=other,
                net_profit=np,
                ytd_revenue=ytd_rev, ytd_cogs=ytd_cogs,
                ytd_gross_profit=ytd_gp,
                ytd_operating_profit=ytd_op, ytd_net_profit=ytd_np,
            ))

        s.add_all(monthly_list)
        await s.flush()

        # 일별 P&L (최근 1개월분)
        daily_list = []
        for day_offset in range(30):
            dt = date(2025, 6, 1) + timedelta(days=day_offset)
            if dt.month != 6:
                break
            rev_d = random.randint(3000000, 8000000)
            cogs_d = int(rev_d * random.uniform(0.35, 0.50))
            gp_d = rev_d - cogs_d
            fixed_d = random.randint(1500000, 2200000)
            var_d = random.randint(300000, 700000)
            op_d = gp_d - fixed_d - var_d
            daily_list.append(DailyPnL(
                pnl_date=dt, fiscal_year=2025, fiscal_month=6,
                revenue_total=rev_d,
                revenue_logistics=int(rev_d * 0.7),
                revenue_bcqt=int(rev_d * 0.2),
                revenue_other=int(rev_d * 0.1),
                cogs_total=cogs_d, gross_profit=gp_d,
                fixed_cost_allocated=fixed_d,
                variable_cost_total=var_d,
                operating_profit=op_d,
                financial_income=random.randint(50000, 200000),
                financial_expense=random.randint(30000, 100000),
                other_income_expense=0,
                net_profit=op_d,
            ))

        s.add_all(daily_list)
        await s.commit()
        print(f"MonthlyPnL: {len(monthly_list)}건 + DailyPnL: {len(daily_list)}건")


# ── 16. 견적-실적 비교 (Quotation Comparison) ─────────
async def seed_quotation_actuals():
    async with async_session() as s:
        existing = (await s.execute(select(QuotationActual))).scalars().all()
        if len(existing) >= 10:
            print(f"QuotationActuals: 이미 {len(existing)}건, 건너뜀")
            return

        qa_list = []
        for idx in range(1, 31):
            cust = random.choice(CUSTOMERS)
            stype = random.choice(["clearance", "ops", "co"])
            quot = rand_vnd(5000000, 50000000)
            actual_sell = quot + rand_vnd(-5000000, 10000000)
            actual_buy = rand_vnd(2000000, 30000000)
            qa_list.append(QuotationActual(
                mssql_shipment_ref=str(10000 + idx),
                customer_id=idx % 5 + 1,
                customer_name=cust[1],
                service_type=stype,
                quotation_amount=quot,
                actual_selling=actual_sell,
                actual_buying=actual_buy,
                variance_selling=actual_sell - quot,
                variance_buying=actual_buy - quot,
                variance_gp=(actual_sell - actual_buy) - (quot - actual_buy),
                invoice_no=f"QA-{stype[0].upper()}{idx:04d}",
                analysis_date=date(2025, random.randint(1, 6), random.randint(1, 28)),
            ))
        s.add_all(qa_list)
        await s.commit()
        print(f"QuotationActuals: {len(qa_list)}건")


# ── 17. 감사 로그 (Audit Logs) ────────────────────────
async def seed_audit_logs():
    async with async_session() as s:
        existing = (await s.execute(select(ErpAuditLog))).scalars().all()
        if len(existing) >= 10:
            print(f"AuditLogs: 이미 {len(existing)}건, 건너뜀")
            return

        users = (await s.execute(select(User))).scalars().all()
        user_ids = [u.user_id for u in users]

        entity_types = [
            "erp_suppliers", "erp_purchase_orders", "erp_selling_records",
            "debit_notes", "shipments", "erp_journal_entries",
        ]
        actions = ["INSERT", "UPDATE", "DELETE"]
        logs = []
        for idx in range(1, 31):
            etype = random.choice(entity_types)
            action = random.choice(actions)
            logs.append(ErpAuditLog(
                entity_type=etype,
                entity_id=random.randint(1, 50),
                action=action,
                old_values={"status": "DRAFT"} if action == "UPDATE" else None,
                new_values={"status": "CONFIRMED"} if action != "DELETE" else None,
                performed_by=random.choice(user_ids),
                ip_address=f"192.168.1.{random.randint(10, 200)}",
                action_at=datetime(
                    2025, random.randint(1, 6),
                    random.randint(1, 28),
                    random.randint(8, 18), random.randint(0, 59),
                ),
            ))
        s.add_all(logs)
        await s.commit()
        print(f"AuditLogs: {len(logs)}건")


# ── 18. 비용센터 (Cost Centers) ───────────────────────
async def seed_cost_centers():
    async with async_session() as s:
        existing = (await s.execute(select(CostCenter))).scalars().all()
        if len(existing) >= 3:
            print(f"CostCenters: 이미 {len(existing)}건, 건너뜀")
            return

        centers = [
            ("CC-LOG", "Bộ phận Logistics", "Logistics Dept", "물류부", "logistic"),
            ("CC-GEN", "Bộ phận Hành chính", "General Admin", "총무부", "general"),
            ("CC-FIN", "Bộ phận Tài chính", "Finance Dept", "재무부", "general"),
        ]
        cc_list = []
        for code, vn, en, kr, ctype in centers:
            cc_list.append(CostCenter(
                center_code=code, center_name_vn=vn,
                center_name_en=en, center_name_kr=kr,
                center_type=ctype, is_active=True,
            ))
        s.add_all(cc_list)
        await s.commit()
        print(f"CostCenters: {len(cc_list)}건")


# ── 메인 실행 ─────────────────────────────────────────
async def run_demo_seed():
    print("=" * 60)
    print("  EXIMUNI ERP — 전체 메뉴 데모 데이터 시드")
    print("=" * 60)

    await seed_clients()
    await seed_exchange_rates()
    await seed_shipments()
    await seed_suppliers()
    await seed_purchase_orders()
    await seed_selling_records()
    await seed_debit_notes()
    await seed_chart_of_accounts()
    await seed_fiscal_periods()
    await seed_cost_centers()
    await seed_journal_entries()
    await seed_account_balances()
    await seed_accounting_parties()
    await seed_cost_classifications()
    await seed_monthly_cost_summary()
    await seed_pnl()
    await seed_quotation_actuals()
    await seed_audit_logs()

    print("=" * 60)
    print("  데모 시드 완료! 모든 메뉴에 데이터가 입력되었습니다.")
    print()
    print("  테스트 계정:")
    print("    admin      / admin123   (전체 접근)")
    print("    accountant1 / account123 (감사이력 제외)")
    print("    pic1       / pic123     (회계 제외)")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_demo_seed())
