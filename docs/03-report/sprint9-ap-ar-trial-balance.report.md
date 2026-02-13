# Sprint 9 완료 보고서: AP/AR 보조원장 + 거래처 통합 + 시산표

## 개요
- **스프린트**: Sprint 9
- **목표**: 회계 거래처(AP 공급사/AR 고객) 관리 + 계정잔액 + 시산표
- **커밋**: `a8fac60`
- **달성률**: 100%

## 산출물 검증

### 백엔드
| 파일 | 줄수 | 내용 |
|------|------|------|
| `models/accounting_parties.py` | 114줄 | AccountingVendor(13컬럼) + AccountingCustomer(13컬럼) + AccountBalance(12컬럼), 3 테이블 |
| `schemas/accounting_parties.py` | 120줄 | 12 스키마 클래스 |
| `api/accounting_vendors.py` | 117줄 | 5 엔드포인트 (CRUD + SmartBooks 매핑) |
| `api/accounting_customers.py` | 107줄 | 4 엔드포인트 (CRUD) |
| `api/account_balances.py` | 161줄 | 2 엔드포인트 (시산표 조회 + 잔액 계산) |
| `services/party_matcher.py` | 110줄 | 거래처 매칭 서비스 (3 함수) |
| Alembic | `c6d9e4f0a123_sprint9_accounting_parties.py` |
| 라우터 등록 | main.py에서 확인됨 (acc_vendor_router + acc_customer_router + acc_balance_router) |

### 프론트엔드
| 파일 | 줄수 | 주요 기능 |
|------|------|----------|
| `AccountingVendorsPage.tsx` | 201줄 | AP 공급사 목록, CRUD, SmartBooks VendorID 매핑 |
| `AccountingCustomersPage.tsx` | 184줄 | AR 고객 목록, CRUD, 매출채권 계정 관리 |
| `TrialBalancePage.tsx` | 210줄 | 시산표 조회 (기간 선택, 차변/대변/잔액 표시) |

### 핵심 설계
- **AP 공급사**: SmartBooks VendorID(세금ID) 기반, default_ap_account(3311000)
- **AR 고객**: SmartBooks CustomerID 기반, default_ar_account(1311000)
- **거래처 매핑**: erp_suppliers ↔ erp_accounting_vendors (mssql_supplier_ref)
- **시산표**: 계정별 기초/당기/기말 잔액 (opening/period/closing × debit/credit)

## 결론
Sprint 9 AP/AR+시산표 100% 완료. 11개 엔드포인트 + 3개 페이지, 거래처 통합 매핑.
