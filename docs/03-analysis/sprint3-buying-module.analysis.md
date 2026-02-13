# Sprint 3: Buying Module - Gap Analysis

> 분석일: 2026-02-11
> 분석 대상: Sprint 3 PDCA Plan vs 실제 구현

## 1. 계획 대비 구현 현황

| 항목 | 계획 | 구현 | 상태 |
|------|------|------|------|
| Supplier 모델 (erp_suppliers) | 15개 컬럼 + unique index | 15개 컬럼 + ix_erp_suppliers_supplier_code (unique) | PASS |
| PurchaseOrder 모델 (erp_purchase_orders) | 20개 컬럼 + 4 index | 20개 컬럼 + po_number(unique), status, payment, supplier index | PASS |
| PurchaseItem 모델 (erp_purchase_items) | 10개 컬럼 + FK CASCADE | 10개 컬럼 + FK CASCADE + ix_pi_po | PASS |
| Supplier API (4개) | list/detail/create/update | GET list, GET detail, POST, PUT | PASS |
| PO API (6개) | CRUD + confirm/cancel | GET list, GET detail, POST, PUT, confirm, cancel | PASS |
| Pydantic 스키마 | Supplier + PO + Item | supplier.py + purchase_order.py | PASS |
| SuppliersPage | 목록 + CRUD 모달 + 검색/필터 | Table + Modal + Search + TypeFilter | PASS |
| PurchaseOrdersPage | 목록 + CRUD + 품목관리 + 승인 | Table + Modal + Form.List + Popconfirm | PASS |
| 사이드바 메뉴 | 공급사 + 매입 관리 추가 | ShopOutlined + ShoppingCartOutlined | PASS |
| 라우팅 | /suppliers, /purchase-orders | App.tsx 라우트 등록 완료 | PASS |
| Alembic 마이그레이션 | 3개 테이블 생성 | 9e0655b5d748 적용 완료 | PASS |
| DB 테이블 확인 | erp_suppliers, erp_purchase_orders, erp_purchase_items | 3개 테이블 생성 확인 | PASS |

## 2. 검증 결과

### 백엔드 검증
- Supplier 라우트: 4개 엔드포인트
- PurchaseOrder 라우트: 6개 엔드포인트
- 모델 import: Supplier, PurchaseOrder, PurchaseItem OK
- DB 테이블: erp_suppliers, erp_purchase_orders, erp_purchase_items 확인

### 프론트엔드 검증
- TypeScript: `tsc --noEmit` 에러 없음
- Vite build: 성공 (2.07s, 1,282 kB)
- 페이지: SuppliersPage, PurchaseOrdersPage 정상 빌드

### Alembic 마이그레이션
- 리비전: 9e0655b5d748 (b7c4d9e8f123 기반)
- upgrade: 3개 테이블 + 6개 인덱스 생성
- downgrade: 정리 완료 (기존 테이블 인덱스 건드리지 않음)

## 3. 매칭률

**12 / 12 = 100% PASS**

## 4. 특이사항

- PO 번호 자동 생성 패턴: `PO-YYYYMM-XXXXX` (월별 순번)
- mssql_shipment_ref: MSSQL debit_sharepoint.id_invoice 소프트 참조 (FK 아님)
- PurchaseItem: po_id FK CASCADE 적용 (PO 삭제 시 품목도 삭제)
- Supplier-PO 관계: dynamic lazy loading, PO-Item: joined eager loading

## 5. 다음 단계

Sprint 4: Financial Dashboard (매출/매입 집계, 수익 분석)
