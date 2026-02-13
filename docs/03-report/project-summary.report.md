# EXIMUNI ERP v2 전체 프로젝트 요약 보고서

> 작성일: 2026-02-13
> 브랜치: erp-v2
> 상태: Sprint 0~13 전체 완료 (100%)

---

## 1. 프로젝트 개요

EXIMUNI Debit Note 시스템을 Dual-DB(PostgreSQL + MSSQL) 기반 ERP 시스템으로 전면 업그레이드.
Microsoft MSAL SSO 인증, MSSQL 레거시 데이터 연동, 회계/손익 분석/재무제표 등 포괄적 ERP 기능을 구현하였다.

---

## 2. 스프린트 완료 현황

| Sprint | 제목 | 커밋 | 달성률 |
|--------|------|------|--------|
| **0** | Dual DB + MSAL SSO 인프라 | `b86ac1a` | 100% |
| **1** | MSSQL 25개 테이블 모델 매핑 | `30edb60` | 100% |
| **2** | 데이터 API 12개 + 페이지 5개 | `7d39865` | 100% |
| **3** | Buying 모듈 (공급사+매입) | `cb53096` | 100% |
| **4** | Selling 구조화 (MSSQL→PG 동기화) | `441a164` | 100% |
| **5** | 워크플로우 + 감사 로그 | `0750078` | 100% |
| **6** | 대시보드 KPI + 수익성 차트 | `9fd3100` | 100% |
| **7** | SmartBooks 계정과목+회계기간+비용센터 | `667af49` | 100% |
| **8** | 분개장 + SmartBooks GLTran 임포트 | `a3a6183` | 100% |
| **9** | AP/AR 보조원장+거래처 통합+시산표 | `a8fac60` | 100% |
| **10** | 비용 분류(고정비/변동비)+월별 집계 | `e9078e1` | 100% |
| **11** | 종합 P&L 대시보드 매출-원가-순이익 | `88da3d0` | 100% |
| **12** | 고객별/건별 수익성 분석 GP 랭킹 | `74031c7` | 100% |
| **13** | 견적-실적 비교 + VAS 재무제표 | `6a4f2c5` | 100% |

---

## 3. 아키텍처 요약

### 3.1 Dual-DB 아키텍처
```
Frontend (React + Vite + Ant Design, port 3001)
    |
    | HTTP (Bearer: MSAL or JWT)
    v
Backend (FastAPI, port 8000) — 22개 API 라우터
    |
    +--- PostgreSQL (async, asyncpg) — 20+ 신규 ERP 테이블
    +--- MSSQL (sync, pyodbc) — 25개 레거시 테이블 (읽기 전용)
    +--- Redis — 캐시/세션
```

### 3.2 인증 흐름
```
MSAL SSO (Azure AD) → JWT 폴백 (개발용)
  ↓
get_current_user() → MSAL 토큰 검증 → JWT 검증 → User 조회
```

---

## 4. 코드베이스 통계

### 4.1 백엔드 파일 구성

| 분류 | 파일 수 | 총 줄수 | 비고 |
|------|---------|---------|------|
| **모델 (PostgreSQL)** | 12 | ~1,100 | 20+ 신규 테이블 |
| **모델 (MSSQL)** | 20 | ~2,500 | 25개 레거시 테이블, 395컬럼 |
| **API 라우터** | 22 | ~3,600 | 71+ 엔드포인트 |
| **Pydantic 스키마** | 14 | ~1,300 | 80+ 스키마 클래스 |
| **서비스** | 12 | ~2,970 | 비즈니스 로직 |
| **Core** | 4 | ~500 | config, database, security, seed |
| **합계** | **84** | **~12,000** | |

### 4.2 프론트엔드 파일 구성

| 분류 | 파일 수 | 총 줄수 | 비고 |
|------|---------|---------|------|
| **페이지 컴포넌트** | 28 | ~8,700 | 28개 페이지 |
| **레이아웃/컴포넌트** | 2 | ~530 | AppLayout + 기타 |
| **서비스/설정** | 5 | ~300 | api, auth, msalConfig 등 |
| **합계** | **35** | **~9,500** | |

### 4.3 Alembic 마이그레이션

| 마이그레이션 | 스프린트 | 테이블 |
|-------------|---------|--------|
| `19aac71a7784` | 초기 | 기존 20 테이블 |
| `b7c4d9e8f123` | 0 | users.azure_oid 추가 |
| `9e0655b5d748` | 3 | erp_suppliers, erp_purchase_orders, erp_purchase_items |
| `31aad5754c4f` | 4 | erp_selling_records, erp_selling_items |
| `9bd2b3cd3e62` | 5 | erp_approval_workflows, erp_audit_logs |
| `a4f7e2c8d901` | 7 | erp_chart_of_accounts, erp_fiscal_periods, erp_cost_centers |
| `b5c8d3e9f012` | 8 | erp_journal_entries, erp_journal_lines |
| `c6d9e4f0a123` | 9 | erp_accounting_vendors, erp_accounting_customers, erp_account_balances |
| `d7e0f5a1b234` | 10 | erp_cost_classifications, erp_monthly_cost_summary |
| `e8f1a6b2c345` | 11 | erp_daily_pnl, erp_monthly_pnl |
| `f9a2b7c3d456` | 13 | erp_quotation_actuals |

**PostgreSQL 신규 테이블 총 20개** (Sprint 3~13)

---

## 5. 기능 모듈 요약

### 5.1 운영 모듈 (Sprint 1~2)
- MSSQL 25개 테이블 매핑 (395 컬럼, 100% 일치)
- 12개 데이터 API 엔드포인트
- 5개 조회 페이지 (거래데이터, CD통관, Ops, CO, 거래처)

### 5.2 매매 관리 모듈 (Sprint 3~4)
- **공급사**: CRUD 4 엔드포인트 (5종 유형: 선사/운송/관세/CO/기타)
- **매입주문**: CRUD + 확정/취소 6 엔드포인트 (PO-YYYYMM-XXXXX 자동생성)
- **매출 종합**: MSSQL→PG 동기화 + 조회 4 엔드포인트 (clearance/ops/co 3유형)

### 5.3 회계 모듈 (Sprint 7~9)
- **계정과목**: SmartBooks 7자리 코드 체계, 트리 구조, 다국어(VN/EN/KR)
- **회계기간**: 연/월 단위 관리, 마감 기능
- **분개전표**: GL/AP/AR/CA/OF 모듈, 전기/역분개, SmartBooks GLTran 임포트
- **AP/AR**: 회계 거래처 매핑 (세금ID 기준), 보조원장
- **시산표**: 계정별 기초/당기/기말 잔액 조회

### 5.4 분석/보고서 모듈 (Sprint 6, 10~13)
- **대시보드**: KPI 카드 + 월별 추이 차트
- **비용 관리**: 고정비/변동비 분류, 일할 안분, 월별 집계
- **P&L 손익**: 일별/월별/YTD 매출-원가-판관비-순이익
- **수익성 분석**: 고객별 GP 랭킹, 건별 마진 분석
- **견적-실적**: 견적 금액 vs 실제 매출/매입 차이 분석
- **재무제표**: VAS 형식 B01(대차대조표)/B02(손익계산서)/B03(현금흐름)

### 5.5 관리 모듈 (Sprint 5)
- **워크플로우**: 범용 승인 이력 (debit_note/purchase_order/selling_record)
- **감사 로그**: ERP 데이터 변경 추적 (INSERT/UPDATE/DELETE + old/new JSON)

---

## 6. 사이드바 메뉴 구조

| 그룹 | 메뉴 항목 수 | 페이지 |
|------|-------------|--------|
| 홈 | 1 | 매출/매입 현황 |
| 운영 | 4 | 거래데이터, CD통관, Ops, CO |
| 매매 관리 | 4 | 매출종합, Debit Note, 공급사, 매입관리 |
| 회계 | 7 | 계정과목, 분개전표, 시산표, 재무제표, AP공급사, AR고객, SB임포트 |
| 분석/보고서 | 7 | P&L, 수익성, 고객수익성, 건별수익성, 견적비교, 비용분류, 월별비용 |
| 마스터 데이터 | 3 | 거래처, 회계기간, 환율 |
| 관리자 | 1 | 감사이력 |
| **합계** | **27** | |

---

## 7. 기술 스택

| 계층 | 기술 | 버전/비고 |
|------|------|----------|
| 프론트엔드 | React + TypeScript + Vite | Ant Design 5 + @ant-design/charts |
| 백엔드 | FastAPI + Python | async/await |
| DB (신규) | PostgreSQL | asyncpg (async) |
| DB (레거시) | MSSQL | pyodbc (sync), ODBC Driver 18 |
| 인증 | MSAL SSO + JWT | Azure AD + python-jose |
| ORM | SQLAlchemy | Dual Base (Base + MSSQLBase) |
| 마이그레이션 | Alembic | 11개 버전 |
| 캐시 | Redis | 세션/토큰 캐시 |
| 차트 | @ant-design/charts | Column, Bar, Pie 등 |

---

## 8. 개별 스프린트 보고서

| 보고서 파일 | 스프린트 |
|------------|---------|
| `sprint1-mssql-models.report.md` | Sprint 1: MSSQL 25개 모델 |
| `sprint2-data-api-pages.report.md` | Sprint 2: 데이터 API + 페이지 |
| `sprint3-buying-module.report.md` | Sprint 3: Buying 모듈 |
| `sprint4-selling-structure.report.md` | Sprint 4: Selling 구조화 |
| `sprint5-workflow-audit.report.md` | Sprint 5: 워크플로우+감사 |
| `sprint6-dashboard-kpi.report.md` | Sprint 6: 대시보드 KPI |
| `sprint7-smartbooks-accounting.report.md` | Sprint 7: SmartBooks 회계 |
| `sprint8-journal-smartbooks.report.md` | Sprint 8: 분개장+임포트 |
| `sprint9-ap-ar-trial-balance.report.md` | Sprint 9: AP/AR+시산표 |
| `sprint10-cost-management.report.md` | Sprint 10: 비용 관리 |
| `sprint11-pnl-dashboard.report.md` | Sprint 11: P&L 대시보드 |
| `sprint12-customer-profitability.report.md` | Sprint 12: 수익성 분석 |
| `sprint13-quotation-financial.report.md` | Sprint 13: 견적비교+재무제표 |

---

## 9. 결론

EXIMUNI ERP v2 프로젝트가 Sprint 0~13 전체 14개 스프린트, **100% 완료**되었다.

**주요 성과:**
- 백엔드 84개 파일, ~12,000줄
- 프론트엔드 35개 파일, ~9,500줄
- PostgreSQL 신규 20개 테이블 + MSSQL 25개 테이블 매핑
- 71+ API 엔드포인트, 28개 페이지
- 12개 비즈니스 서비스 (동기화, 임포트, 분석, 보고서 생성 등)
- 11개 Alembic 마이그레이션
- Dual-DB + MSAL SSO + VAS 재무제표 통합 ERP 시스템 완성
