# Sprint 3 완료 보고서: Buying 모듈

## 개요
- **스프린트**: Sprint 3
- **목표**: 공급사/매입 관리 신규 구축 (PostgreSQL)
- **커밋**: `cb53096`
- **달성률**: 100%

## 완료 기준 검증

| 항목 | 상태 | 비고 |
|------|------|------|
| 3개 PostgreSQL 테이블 생성 | 완료 | erp_suppliers, erp_purchase_orders, erp_purchase_items |
| Alembic 마이그레이션 | 완료 | `9e0655b5d748_sprint3_buying_module.py` |
| 공급사 CRUD API 4개 엔드포인트 | 완료 | GET list, GET detail, POST create, PUT update |
| PO CRUD + 승인 API 6개 엔드포인트 | 완료 | GET list, GET detail, POST create, PUT update, POST confirm, POST cancel |
| SuppliersPage 렌더링/CRUD | 완료 | 304줄, 테이블+검색+유형필터+CRUD 모달 |
| PurchaseOrdersPage 렌더링/CRUD | 완료 | 480줄, 테이블+검색+상태필터+등록모달+상세모달+확정/취소 |
| 라우터 등록 (main.py) | 완료 | suppliers_router + purchase_orders_router |
| 라우트 등록 (App.tsx) | 완료 | /suppliers, /purchase-orders |
| 사이드바 메뉴 (AppLayout.tsx) | 완료 | '매매 관리' 그룹에 공급사+매입 관리 |

## 산출물 상세

### 백엔드 (5 파일)

| 파일 | 줄수 | 내용 |
|------|------|------|
| `models/buying.py` | 132줄 | Supplier(17컬럼), PurchaseOrder(21컬럼), PurchaseItem(10컬럼) |
| `schemas/supplier.py` | 60줄 | SupplierBase/Create/Update/Response/ListResponse |
| `schemas/purchase_order.py` | 100줄 | PurchaseItem+PurchaseOrder 각 Base/Create/Update/Response/ListResponse |
| `api/suppliers.py` | 123줄 | 공급사 CRUD 4개 엔드포인트 (검색, 유형필터, 활성여부 필터) |
| `api/purchase_orders.py` | 286줄 | PO CRUD 6개 엔드포인트 (자동 PO번호 생성, 공급사명 포함 응답) |

### 프론트엔드 (2 파일)

| 파일 | 줄수 | 내용 |
|------|------|------|
| `pages/SuppliersPage.tsx` | 304줄 | 공급사 목록 테이블, 코드/이름 검색, 유형 필터, 등록/수정 모달 |
| `pages/PurchaseOrdersPage.tsx` | 480줄 | 매입 목록 테이블, PO번호/Invoice 검색, 상태 필터, 등록 모달(상세 항목 Form.List), 상세 보기 모달, 확정/취소 Popconfirm |

### 핵심 설계 요약

**공급사 유형 (supplier_type)**
- shipping_line(선사), trucking(운송사), customs_broker(관세사), co_agent(CO 대행사), other(기타)

**PO 상태 흐름**
```
DRAFT → CONFIRMED → (CANCELLED)
결제 상태: UNPAID → PARTIAL → PAID
```

**PO 번호 형식**: `PO-YYYYMM-XXXXX` (자동 생성)

**MSSQL 연동**: `mssql_shipment_ref` → debit_sharepoint.id_invoice (정수 참조, FK 아님)

## 결론

Sprint 3 Buying 모듈이 계획대로 100% 구현 완료되었습니다.
PostgreSQL 3개 테이블, 백엔드 API 10개 엔드포인트, 프론트엔드 2개 페이지가 모두 정상 동작합니다.
