"""초기 시드 데이터 - 역할, 권한, 비용카테고리, NEXCON 거래처 및 템플릿"""
import asyncio
import hashlib
from datetime import date
from sqlalchemy import select

from app.core.database import async_session, engine, Base
from app.models import *


def hash_password(plain: str) -> str:
    """개발용 비밀번호 해싱 (SHA256) — 운영환경에서는 MSAL SSO 사용"""
    return hashlib.sha256(plain.encode()).hexdigest()


async def seed_roles():
    async with async_session() as session:
        existing = (await session.execute(select(Role))).scalars().all()
        if existing:
            print("Roles already seeded.")
            return

        roles = [
            Role(role_name="admin", description="시스템 관리자 - 전체 권한"),
            Role(role_name="accountant", description="회계담당자 - Debit Note 생성/검토/승인"),
            Role(role_name="pic", description="PIC 담당자 - 거래 데이터 입력"),
        ]
        session.add_all(roles)
        await session.commit()
        print("Roles seeded: admin, accountant, pic")


async def seed_permissions():
    async with async_session() as session:
        existing = (await session.execute(select(Permission))).scalars().all()
        if existing:
            print("Permissions already seeded.")
            return

        resources = ["user", "client", "shipment", "debit_note", "exchange_rate", "fee", "report", "audit_log"]
        actions = ["create", "read", "update", "delete"]
        extra_permissions = [
            ("debit_note", "approve"),
            ("debit_note", "reject"),
            ("debit_note", "export"),
            ("debit_note", "submit_review"),
        ]

        perms = []
        for resource in resources:
            for action in actions:
                perms.append(Permission(
                    permission_name=f"{resource}:{action}",
                    resource=resource,
                    action=action,
                    description=f"{action} {resource}",
                ))
        for resource, action in extra_permissions:
            perms.append(Permission(
                permission_name=f"{resource}:{action}",
                resource=resource,
                action=action,
                description=f"{action} {resource}",
            ))

        session.add_all(perms)
        await session.commit()
        print(f"Permissions seeded: {len(perms)} permissions")


async def seed_role_permissions():
    async with async_session() as session:
        existing = (await session.execute(select(RolePermission))).scalars().all()
        if existing:
            print("RolePermissions already seeded.")
            return

        roles = {r.role_name: r for r in (await session.execute(select(Role))).scalars().all()}
        perms = (await session.execute(select(Permission))).scalars().all()

        mappings = []
        # Admin: 전체 권한
        for perm in perms:
            mappings.append(RolePermission(role_id=roles["admin"].role_id, permission_id=perm.permission_id))

        # Accountant: 대부분 권한 (사용자 관리/감사로그 제외)
        for perm in perms:
            if perm.resource not in ("user", "audit_log") or perm.action == "read":
                mappings.append(RolePermission(role_id=roles["accountant"].role_id, permission_id=perm.permission_id))

        # PIC: 거래 데이터 입력, 조회 위주
        for perm in perms:
            if perm.action == "read":
                mappings.append(RolePermission(role_id=roles["pic"].role_id, permission_id=perm.permission_id))
            elif perm.resource == "shipment" and perm.action in ("create", "update"):
                mappings.append(RolePermission(role_id=roles["pic"].role_id, permission_id=perm.permission_id))

        session.add_all(mappings)
        await session.commit()
        print(f"RolePermissions seeded: {len(mappings)} mappings")


async def seed_users():
    async with async_session() as session:
        existing = (await session.execute(select(User))).scalars().all()
        if existing:
            print("Users already seeded.")
            return

        roles = {r.role_name: r for r in (await session.execute(select(Role))).scalars().all()}

        users = [
            User(
                username="admin",
                email="admin@eximuni.com",
                hashed_password=hash_password("admin123"),
                full_name="System Admin",
                role_id=roles["admin"].role_id,
            ),
            User(
                username="accountant1",
                email="accountant@eximuni.com",
                hashed_password=hash_password("account123"),
                full_name="Nguyen Van A",
                role_id=roles["accountant"].role_id,
            ),
            User(
                username="pic1",
                email="pic@eximuni.com",
                hashed_password=hash_password("pic123"),
                full_name="Tran Thi B",
                role_id=roles["pic"].role_id,
            ),
        ]
        session.add_all(users)
        await session.commit()
        print("Users seeded: admin, accountant1, pic1")


async def seed_fee_categories():
    async with async_session() as session:
        existing = (await session.execute(select(FeeCategory))).scalars().all()
        if existing:
            print("FeeCategories already seeded.")
            return

        categories = [
            FeeCategory(
                category_code="FREIGHT",
                category_name="Freight",
                category_name_vi="Cước vận chuyển",
                category_name_ko="운임",
                is_vat_applicable=False,
                vat_rate=0,
                sort_order=1,
            ),
            FeeCategory(
                category_code="HANDLING",
                category_name="Handling Fee",
                category_name_vi="Phí xử lý",
                category_name_ko="취급수수료",
                is_vat_applicable=True,
                vat_rate=8,
                sort_order=2,
            ),
            FeeCategory(
                category_code="DO_FEE",
                category_name="D/O Fee",
                category_name_vi="Phí D/O",
                category_name_ko="D/O 수수료",
                is_vat_applicable=True,
                vat_rate=8,
                sort_order=3,
            ),
            FeeCategory(
                category_code="TRUCKING",
                category_name="Trucking",
                category_name_vi="Phí vận tải nội địa",
                category_name_ko="내륙운송",
                is_vat_applicable=True,
                vat_rate=8,
                sort_order=4,
            ),
            FeeCategory(
                category_code="LOCAL_CHARGE",
                category_name="Local Charges",
                category_name_vi="Phí địa phương",
                category_name_ko="현지비용",
                is_vat_applicable=True,
                vat_rate=8,
                sort_order=5,
            ),
            FeeCategory(
                category_code="CUSTOMS",
                category_name="Customs Clearance",
                category_name_vi="Phí hải quan",
                category_name_ko="통관비용",
                is_vat_applicable=True,
                vat_rate=8,
                sort_order=6,
            ),
            FeeCategory(
                category_code="CO_FEE",
                category_name="C/O Fee",
                category_name_vi="Phí C/O",
                category_name_ko="원산지증명수수료",
                is_vat_applicable=True,
                vat_rate=8,
                sort_order=7,
            ),
            FeeCategory(
                category_code="OTHER",
                category_name="Other Charges",
                category_name_vi="Phí khác",
                category_name_ko="기타비용",
                is_vat_applicable=True,
                vat_rate=8,
                sort_order=8,
            ),
        ]
        session.add_all(categories)
        await session.commit()
        print(f"FeeCategories seeded: {len(categories)} categories")


async def seed_fee_items():
    async with async_session() as session:
        existing = (await session.execute(select(FeeItem))).scalars().all()
        if existing:
            print("FeeItems already seeded.")
            return

        cats = {c.category_code: c for c in (await session.execute(select(FeeCategory))).scalars().all()}

        items = [
            # Freight (VAT 0%)
            FeeItem(category_id=cats["FREIGHT"].category_id, item_code="OCEAN_FREIGHT", item_name="Ocean Freight", is_vat_applicable=False, sort_order=1),
            FeeItem(category_id=cats["FREIGHT"].category_id, item_code="AIR_FREIGHT", item_name="Air Freight", is_vat_applicable=False, sort_order=2),

            # Handling (VAT 8%, 세후)
            FeeItem(category_id=cats["HANDLING"].category_id, item_code="HANDLING_FEE", item_name="Handling Fee", is_vat_applicable=True, vat_rate=8, is_tax_inclusive=True, sort_order=1),
            FeeItem(category_id=cats["HANDLING"].category_id, item_code="CUSTOMS_HANDLING", item_name="Customs Handling", is_vat_applicable=True, vat_rate=8, sort_order=2),

            # D/O Fee (VAT 8%, 세후)
            FeeItem(category_id=cats["DO_FEE"].category_id, item_code="DO_FEE", item_name="D/O Fee", is_vat_applicable=True, vat_rate=8, is_tax_inclusive=True, sort_order=1),

            # Trucking
            FeeItem(category_id=cats["TRUCKING"].category_id, item_code="TRUCKING_IMP", item_name="Trucking (Import)", is_vat_applicable=True, vat_rate=8, sort_order=1),
            FeeItem(category_id=cats["TRUCKING"].category_id, item_code="TRUCKING_EXP", item_name="Trucking (Export)", is_vat_applicable=True, vat_rate=8, sort_order=2),

            # Local Charges
            FeeItem(category_id=cats["LOCAL_CHARGE"].category_id, item_code="THC", item_name="THC (Terminal Handling)", is_vat_applicable=True, vat_rate=8, sort_order=1),
            FeeItem(category_id=cats["LOCAL_CHARGE"].category_id, item_code="CFS_FEE", item_name="CFS Fee", is_vat_applicable=True, vat_rate=8, sort_order=2),
            FeeItem(category_id=cats["LOCAL_CHARGE"].category_id, item_code="SEAL_FEE", item_name="Seal Fee", is_vat_applicable=True, vat_rate=8, sort_order=3),
            FeeItem(category_id=cats["LOCAL_CHARGE"].category_id, item_code="LIFT_ON_OFF", item_name="Lift On/Off", is_vat_applicable=True, vat_rate=8, sort_order=4),
            FeeItem(category_id=cats["LOCAL_CHARGE"].category_id, item_code="STORAGE", item_name="Storage Fee", is_vat_applicable=True, vat_rate=8, sort_order=5),
            FeeItem(category_id=cats["LOCAL_CHARGE"].category_id, item_code="OVERTIME", item_name="Overtime", is_vat_applicable=True, vat_rate=8, sort_order=6),

            # Customs
            FeeItem(category_id=cats["CUSTOMS"].category_id, item_code="CUSTOMS_FEE", item_name="Customs Clearance Fee", is_vat_applicable=True, vat_rate=8, sort_order=1),
            FeeItem(category_id=cats["CUSTOMS"].category_id, item_code="INSPECTION", item_name="Inspection Fee", is_vat_applicable=True, vat_rate=8, sort_order=2),

            # C/O
            FeeItem(category_id=cats["CO_FEE"].category_id, item_code="CO_FEE", item_name="C/O Fee", is_vat_applicable=True, vat_rate=8, sort_order=1),

            # Other
            FeeItem(category_id=cats["OTHER"].category_id, item_code="AMENDMENT", item_name="Amendment Fee", is_vat_applicable=True, vat_rate=8, sort_order=1),
            FeeItem(category_id=cats["OTHER"].category_id, item_code="PAY_ON_BEHALF", item_name="Pay on Behalf", is_vat_applicable=False, sort_order=2),
            FeeItem(category_id=cats["OTHER"].category_id, item_code="OTHER_CHARGE", item_name="Other Charge", is_vat_applicable=True, vat_rate=8, sort_order=3),
        ]
        session.add_all(items)
        await session.commit()
        print(f"FeeItems seeded: {len(items)} items")


async def seed_nexcon_client():
    async with async_session() as session:
        existing = (await session.execute(select(Client).where(Client.client_code == "NEXCON"))).scalar_one_or_none()
        if existing:
            print("NEXCON client already seeded.")
            return

        nexcon = Client(
            client_code="NEXCON",
            client_name="NEXCON VIETNAM CO., LTD",
            client_name_en="NEXCON VIETNAM CO., LTD",
            currency="VND",
            complexity="High",
            batch="Batch 1",
            structure_type="Multi-sheet",
            is_active=True,
            notes="Phase 1 기준 거래처. IMPORT/EXPORT 시트 분리. 수식 370+개.",
        )
        session.add(nexcon)
        await session.flush()

        # IMPORT 템플릿 (NEXCON 기술사양서 기반)
        import_template = ClientTemplate(
            client_id=nexcon.client_id,
            template_name="NEXCON IMPORT Template",
            sheet_type="IMPORT",
            sheet_name_pattern="IMPORT NEX {MMYYYY}",
            column_range="A-BM",
            total_columns=65,
            header_end_row=15,
            data_start_row=16,
            fee_column_start="M",
            fee_column_end="AT",
            total_usd_column="BC",
            total_vnd_column="BD",
            vat_column="BE",
            grand_total_column="BF",
            exchange_rate_cell="D9",
            vat_rate=8.00,
            column_mapping={
                "A": "line_no", "B": "delivery_date", "C": "invoice_no",
                "D": "mbl", "E": "hbl", "F": "term",
                "G": "no_of_pkgs", "H": "gross_weight", "I": "chargeable_weight",
                "J": "cd_no", "K": "cd_type", "L": "air_ocean_rate",
                "M": "freight", "BC": "total_usd", "BD": "total_vnd",
                "BE": "vat_amount", "BF": "grand_total_vnd",
                "BG": "back_to_back_invoice", "BR": "note",
            },
            formula_mapping={
                "BC": "=SUM(M{row}:AT{row})",
                "BD": "=BC{row}*$BE$13",
                "BE": "=SUM(Z{row}:AT{row})*$BE$13*8%",
                "BF": "=BE{row}+BD{row}",
            },
        )

        # EXPORT 템플릿 (NEXCON 기술사양서 기반)
        export_template = ClientTemplate(
            client_id=nexcon.client_id,
            template_name="NEXCON EXPORT Template",
            sheet_type="EXPORT",
            sheet_name_pattern="EXPORT NEXCON {MMYYYY}",
            column_range="A-AQ",
            total_columns=43,
            header_end_row=15,
            data_start_row=16,
            fee_column_start="M",
            fee_column_end="AH",
            total_usd_column="AI",
            total_vnd_column="AJ",
            vat_column="AK",
            grand_total_column="AL",
            exchange_rate_cell="D9",
            vat_rate=8.00,
            column_mapping={
                "A": "line_no", "B": "delivery_date", "C": "invoice_no",
                "D": "mbl", "E": "hbl", "F": "term",
                "G": "no_of_pkgs", "H": "gross_weight", "I": "chargeable_weight",
                "M": "origin_destination", "N": "local_charge", "O": "overtime",
                "AI": "subtotal", "AJ": "total_vnd", "AK": "vat_amount",
                "AL": "grand_total_vnd", "AQ": "final_invoice_amount",
            },
            formula_mapping={
                "M": "=700000/$D$9",
                "AI": "=SUM(M{row}+N{row})",
                "AJ": "=ROUND(SUM(M{row}:AH{row})*$D$9,0)",
                "AK": "=AJ{row}*8%",
                "AL": "=SUM(AJ{row}+AK{row})",
                "AQ": "=ROUND(SUM(AL{row}+AP{row}),2)",
            },
        )

        session.add_all([import_template, export_template])
        await session.commit()
        print("NEXCON client + IMPORT/EXPORT templates seeded")


async def seed_exchange_rate():
    async with async_session() as session:
        existing = (await session.execute(select(ExchangeRate))).scalars().all()
        if existing:
            print("ExchangeRate already seeded.")
            return

        rate = ExchangeRate(
            currency_from="USD",
            currency_to="VND",
            rate=26446.00,
            rate_date=date.today(),
            source="manual",
        )
        session.add(rate)
        await session.commit()
        print("ExchangeRate seeded: 1 USD = 26,446 VND")


async def run_seed():
    print("=" * 50)
    print("Starting seed data...")
    print("=" * 50)
    await seed_roles()
    await seed_permissions()
    await seed_role_permissions()
    await seed_users()
    await seed_fee_categories()
    await seed_fee_items()
    await seed_nexcon_client()
    await seed_exchange_rate()
    print("=" * 50)
    print("Seed complete!")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(run_seed())
