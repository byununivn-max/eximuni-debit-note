# Sprint 9 Gap Analysis: AP/AR 보조원장 + 거래처 통합

## 계획 vs 구현 비교

| 계획 항목 | 파일 | 상태 | 비고 |
|-----------|------|------|------|
| `models/accounting_parties.py` — 3개 모델 | `backend/app/models/accounting_parties.py` | 완료 | AccountingVendor, AccountingCustomer, AccountBalance |
| `schemas/accounting_parties.py` — CRUD 스키마 | `backend/app/schemas/accounting_parties.py` | 완료 | 11개 스키마 (Vendor/Customer CRUD + Balance + Trial + Match) |
| `services/party_matcher.py` — 거래처 매칭 | `backend/app/services/party_matcher.py` | 완료 | extract_vendors/customers + match_vendors_to_suppliers |
| `api/accounting_vendors.py` — AP 공급사 API | `backend/app/api/accounting_vendors.py` | 완료 | 5개 엔드포인트 (목록/상세/생성/추출/매칭) |
| `api/accounting_customers.py` — AR 고객 API | `backend/app/api/accounting_customers.py` | 완료 | 4개 엔드포인트 (목록/상세/생성/추출) |
| `api/account_balances.py` — 시산표 API | `backend/app/api/account_balances.py` | 완료 | 2개 엔드포인트 (시산표 실시간 계산/유형별 요약) |
| `pages/AccountingVendorsPage.tsx` — AP 공급사 UI | `frontend/src/pages/AccountingVendorsPage.tsx` | 완료 | 목록/검색/매핑필터/분개장추출/공급사매칭 |
| `pages/AccountingCustomersPage.tsx` — AR 고객 UI | `frontend/src/pages/AccountingCustomersPage.tsx` | 완료 | 목록/검색/매핑필터/분개장추출 |
| `pages/TrialBalancePage.tsx` — 시산표 UI | `frontend/src/pages/TrialBalancePage.tsx` | 완료 | 연월 선택/기초·당월·기말 차대/합계 행 |
| Alembic 마이그레이션 | `c6d9e4f0a123_sprint9_accounting_parties.py` | 완료 | 3개 테이블 + 5개 인덱스 |
| App.tsx 라우트 등록 | `frontend/src/App.tsx` | 완료 | 3개 라우트 추가 |
| AppLayout.tsx 메뉴 등록 | `frontend/src/components/AppLayout.tsx` | 완료 | 3개 메뉴 항목 추가 |

## 구현 세부사항

### 데이터베이스 (3개 신규 테이블)
- `erp_accounting_vendors`: vendor_id PK, tax_id unique, mssql_supplier_ref nullable, 2개 인덱스
- `erp_accounting_customers`: customer_id PK, tax_id unique, mssql_client_ref nullable, 2개 인덱스
- `erp_account_balances`: balance_id PK, (account_code+year+month) unique 복합 인덱스

### API 엔드포인트 (11개)
- `GET /api/v1/accounting-vendors` — 목록 (검색/매핑필터/페이지네이션)
- `GET /api/v1/accounting-vendors/{id}` — 상세
- `POST /api/v1/accounting-vendors` — 생성 (admin/accountant)
- `POST /api/v1/accounting-vendors/extract-from-journal` — 분개장 추출 (admin)
- `POST /api/v1/accounting-vendors/match-suppliers` — ERP 공급사 매칭 (admin)
- `GET /api/v1/accounting-customers` — 목록 (검색/매핑필터/페이지네이션)
- `GET /api/v1/accounting-customers/{id}` — 상세
- `POST /api/v1/accounting-customers` — 생성 (admin/accountant)
- `POST /api/v1/accounting-customers/extract-from-journal` — 분개장 추출 (admin)
- `GET /api/v1/account-balances/trial-balance` — 시산표 (실시간 계산)
- `GET /api/v1/account-balances/summary` — 유형별 차대 합계

### 비즈니스 로직
- **Vendor/Customer 추출**: 분개장의 vendor_id/customer_id 필드에서 고유값 추출 → accounting 테이블에 시딩
- **공급사 매칭**: tax_id 기준으로 erp_accounting_vendors ↔ erp_suppliers 자동 매칭
- **시산표 계산**: 분개장 라인에서 실시간 집계, 기초잔액 = 1월~(month-1)월 누적

### 프론트엔드 (3개 페이지)
- `AccountingVendorsPage`: 검색/매핑필터 + 분개장추출 버튼 + 공급사매칭 버튼
- `AccountingCustomersPage`: 검색/매핑필터 + 분개장추출 버튼
- `TrialBalancePage`: 연월 선택기 + 기초/당월/기말 6컬럼 + 합계 Summary Row

## 검증 결과

| 검증 항목 | 결과 |
|-----------|------|
| Python 구문 검증 (ast.parse) | 통과 (8개 파일) |
| TypeScript 타입 검사 (tsc --noEmit) | 통과 |
| Vite 프로덕션 빌드 | 통과 |
| Alembic 마이그레이션 | 작성 완료 (c6d9e4f0a123) |

## Gap Analysis 결과: **100%** (12/12 항목 완료)
