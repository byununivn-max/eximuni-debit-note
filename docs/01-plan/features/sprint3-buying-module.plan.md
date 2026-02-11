# Sprint 3: Buying 모듈 (PostgreSQL 신규 테이블)

## 개요
- **스프린트**: Sprint 3
- **목표**: 공급사/매입 관리 신규 구축 (PostgreSQL)
- **선행 조건**: Sprint 2 완료 (데이터 API 12개 + 페이지 5개, 98%)

## 범위

### 신규 PostgreSQL 테이블 (Alembic 마이그레이션)

| 테이블 | 용도 | 주요 컬럼 |
|--------|------|----------|
| erp_suppliers | 공급사 마스터 | supplier_code(unique), supplier_name, supplier_type, 연락처, 은행, 결제조건 |
| erp_purchase_orders | 매입 기록 | po_number(PO-YYYYMM-XXXXX), supplier_id(FK), mssql_shipment_ref, 금액, 상태 |
| erp_purchase_items | 매입 상세 | po_id(FK), cost_category, quantity, unit_price, amount |

### 백엔드 파일

| 파일 | 용도 |
|------|------|
| `models/buying.py` | 3개 SQLAlchemy 모델 (Base 상속, Alembic 대상) |
| `schemas/supplier.py` | Supplier CRUD 스키마 |
| `schemas/purchase_order.py` | PO + PO Item 스키마 |
| `api/suppliers.py` | 공급사 CRUD (GET/POST/PUT/DELETE) |
| `api/purchase_orders.py` | PO CRUD + 승인 + MSSQL shipment 연결 |

### 프론트엔드 파일

| 파일 | 용도 |
|------|------|
| `pages/SuppliersPage.tsx` | 공급사 목록 + CRUD 모달 |
| `pages/PurchaseOrdersPage.tsx` | 매입 관리 + 상세 모달 + 승인 |
| `App.tsx` | /suppliers, /purchase-orders 라우트 추가 |
| `AppLayout.tsx` | 사이드바 Buying 그룹 추가 |

## 핵심 설계

### supplier_type enum
- `shipping_line`: 선사
- `trucking`: 운송사
- `customs_broker`: 관세사
- `co_agent`: CO 대행사
- `other`: 기타

### PO 상태 흐름
```
DRAFT → CONFIRMED → (CANCELLED)
         ↓
   payment_status: UNPAID → PARTIAL → PAID
```

### MSSQL 연결
- erp_purchase_orders.mssql_shipment_ref → debit_sharepoint.id_invoice (정수 참조, FK 아님)

## 완료 기준
- [ ] 3개 PostgreSQL 테이블 생성 (Alembic 마이그레이션)
- [ ] 공급사 CRUD API 4개 엔드포인트
- [ ] PO CRUD + 승인 API 6개 엔드포인트
- [ ] SuppliersPage 렌더링/CRUD 동작
- [ ] PurchaseOrdersPage 렌더링/CRUD 동작
- [ ] TypeScript/Vite 빌드 통과
