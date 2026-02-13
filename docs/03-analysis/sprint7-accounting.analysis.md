# Sprint 7 Gap Analysis: 계정과목 + 회계기간 관리

## 계획 vs 구현 비교

| 계획 항목 | 파일 | 상태 | 비고 |
|-----------|------|------|------|
| `models/accounting.py` — erp_chart_of_accounts, erp_fiscal_periods, erp_cost_centers | `backend/app/models/accounting.py` | 완료 | ChartOfAccount, FiscalPeriod, CostCenter 3개 모델 |
| `schemas/chart_of_accounts.py` — CoA Pydantic 스키마 | `backend/app/schemas/chart_of_accounts.py` | 완료 | CoA + FiscalPeriod + CostCenter 스키마 통합 |
| `api/chart_of_accounts.py` — 계정과목 CRUD + 트리 구조 조회 | `backend/app/api/chart_of_accounts.py` | 완료 | 7개 엔드포인트 (목록/트리/요약/상세/생성/수정/시딩 + 비용센터 2개) |
| `api/fiscal_periods.py` — 회계기간 관리 API | `backend/app/api/fiscal_periods.py` | 완료 | 5개 엔드포인트 (목록/상세/생성/마감/재개) |
| `services/smartbooks_import.py` — SmartBooks Excel → PostgreSQL 임포트 서비스 | `backend/app/services/smartbooks_import.py` | 완료 | 54개 계정 + 2개 비용센터 + 12개월 기간 시딩 |
| `pages/ChartOfAccountsPage.tsx` — 계정과목 트리 뷰 | `frontend/src/pages/ChartOfAccountsPage.tsx` | 완료 | 테이블/트리/비용센터 3탭 + 요약 카드 + 3개국어 표시 + 시딩 버튼 |
| `pages/FiscalPeriodsPage.tsx` — 회계기간 관리 | `frontend/src/pages/FiscalPeriodsPage.tsx` | 완료 | 연도별 목록 + 마감/재개 + 기간 자동 생성 |

## 구현 세부사항

### 데이터베이스 (3개 신규 테이블)
- `erp_chart_of_accounts`: 14개 컬럼, 4개 인덱스 (code unique, type, group, parent)
- `erp_fiscal_periods`: 10개 컬럼, 1개 복합 유니크 인덱스 (year+month)
- `erp_cost_centers`: 9개 컬럼, 1개 유니크 인덱스 (center_code)

### 시딩 데이터
- SmartBooks 54개 계정과목 (자산 15 + 부채 13 + 자본 3 + 수익 4 + 비용 15+4)
- 비용센터 2개 (LOGISTIC, GENERAL)
- 회계기간: 2025년 12개월 자동 생성

### API 엔드포인트 (12개)
**계정과목 (7개)**:
- `GET /api/v1/chart-of-accounts` — 목록 (type/active/search 필터)
- `GET /api/v1/chart-of-accounts/tree` — 트리 구조 (type별 그룹핑)
- `GET /api/v1/chart-of-accounts/summary` — 유형별 통계
- `GET /api/v1/chart-of-accounts/{code}` — 상세
- `POST /api/v1/chart-of-accounts` — 생성
- `PATCH /api/v1/chart-of-accounts/{code}` — 수정
- `POST /api/v1/chart-of-accounts/seed` — SmartBooks 시딩

**비용센터 (2개)**:
- `GET /api/v1/chart-of-accounts/cost-centers/list` — 목록
- `POST /api/v1/chart-of-accounts/cost-centers` — 생성

**회계기간 (5개)**:
- `GET /api/v1/fiscal-periods` — 목록 (year/is_closed 필터)
- `GET /api/v1/fiscal-periods/{id}` — 상세
- `POST /api/v1/fiscal-periods/generate?year=` — 연도 자동 생성
- `POST /api/v1/fiscal-periods/{id}/close` — 마감
- `POST /api/v1/fiscal-periods/{id}/reopen` — 재개

### 프론트엔드
- `ChartOfAccountsPage.tsx`: 3탭 (테이블/트리/비용센터) + KPI 요약 카드 + 검색/필터 + SmartBooks 시딩 버튼
- `FiscalPeriodsPage.tsx`: 연도 선택 + 요약 카드 (전체/오픈/마감) + 마감/재개 Popconfirm + 기간 자동 생성

## 검증 결과

| 항목 | 결과 |
|------|------|
| Python 구문 검증 (6개 파일) | 통과 |
| TypeScript 타입 검사 (tsc --noEmit) | 통과 |
| Vite 프로덕션 빌드 | 통과 |
| Alembic 마이그레이션 | 수동 작성 (a4f7e2c8d901) |

## 초기 데이터 시딩 상세

### 계정 유형별 자동 분류 (account_code 첫 자리 기준)
- 1xx: asset (자산) — normal_balance: debit
- 2xx: asset (자산) — normal_balance: debit
- 3xx: liability (부채) — normal_balance: credit
- 4xx: equity (자본) — normal_balance: credit
- 5xx: revenue (수익) — normal_balance: credit
- 6xx: expense (비용) — normal_balance: debit
- 7xx: revenue (기타수익) — normal_balance: credit
- 8xx: expense (기타비용) — normal_balance: debit
- 9xx: equity (손익결산) — normal_balance: debit

## 매치율: 100%

모든 계획 항목이 구현되었으며, 추가로 CoATreeItem의 model_rebuild()와 비용센터 API가 chart_of_accounts 라우터에 통합 포함됨.
