# Sprint 10 Gap Analysis: 비용 분류 + 고정비/변동비 관리

## 계획 vs 구현 비교

| 계획 항목 | 파일 | 상태 | 비고 |
|-----------|------|------|------|
| `models/cost_management.py` — 2개 모델 | `backend/app/models/cost_management.py` | 완료 | CostClassification, MonthlyCostSummary |
| `schemas/cost_classification.py` — Pydantic 스키마 | `backend/app/schemas/cost_classification.py` | 완료 | 11개 스키마 (CRUD + Monthly + Overview + Seed) |
| `services/cost_allocator.py` — 비용 집계 + 일할 안분 | `backend/app/services/cost_allocator.py` | 완료 | 642x 시딩 8개 + calculate_monthly_cost() |
| `api/cost_classifications.py` — CRUD + 집계 API | `backend/app/api/cost_classifications.py` | 완료 | 8개 엔드포인트 |
| `pages/CostClassificationsPage.tsx` — 비용분류 관리 UI | `frontend/src/pages/CostClassificationsPage.tsx` | 완료 | 목록+KPI카드+642x시딩+유형필터 |
| `pages/MonthlyCostSummaryPage.tsx` — 월별 비용 대시보드 | `frontend/src/pages/MonthlyCostSummaryPage.tsx` | 완료 | 연월 선택+집계실행+유형별카드+합계행 |
| Alembic 마이그레이션 | `d7e0f5a1b234_sprint10_cost_management.py` | 완료 | 2개 테이블 + 5개 인덱스 |
| App.tsx 라우트 등록 | `frontend/src/App.tsx` | 완료 | 2개 라우트 추가 |
| AppLayout.tsx 메뉴 등록 | `frontend/src/components/AppLayout.tsx` | 완료 | 2개 메뉴 항목 추가 |

## 구현 세부사항

### 데이터베이스 (2개 신규 테이블)
- `erp_cost_classifications`: classification_id PK, 3개 인덱스 (account/cost_type/category)
- `erp_monthly_cost_summary`: summary_id PK, (year+month+account_code) unique 복합 인덱스, cost_type 인덱스

### 비용 분류 시드 데이터 (8개 642x 계정)
| 계정 | 분류 | 카테고리 | 안분방법 |
|------|------|----------|----------|
| 6421000 (급여) | 고정비 | salary | 일할안분 |
| 6422000 (재료비) | 변동비 | material | 일할안분 |
| 6423000 (감가상각비) | 고정비 | depreciation | 일할안분 |
| 6424000 (수선유지비) | 반변동비 | maintenance | 일할안분 |
| 6425000 (세금/수수료) | 고정비 | tax | 월 일괄 |
| 6426000 (선급비용상각) | 고정비 | prepaid | 일할안분 |
| 6427000 (외주서비스비) | 변동비 | outsourced | 일할안분 |
| 6428000 (기타판관비) | 반변동비 | other | 일할안분 |

### API 엔드포인트 (8개)
- `GET /api/v1/cost-classifications` — 비용 분류 목록 (유형/카테고리/활성 필터)
- `GET /api/v1/cost-classifications/{id}` — 상세
- `POST /api/v1/cost-classifications` — 생성 (admin/accountant)
- `PATCH /api/v1/cost-classifications/{id}` — 수정 (admin/accountant)
- `POST /api/v1/cost-classifications/seed` — 642x 초기 시딩 (admin)
- `POST /api/v1/cost-classifications/calculate-monthly` — 월별 비용 집계 실행
- `GET /api/v1/cost-classifications/monthly-summary` — 월별 비용 목록
- `GET /api/v1/cost-classifications/monthly-overview` — 월별 유형별 개요

### 일할 안분 로직
- 분개장에서 6xxx 계정 차변 합계 집계
- 비용 분류 테이블과 조인하여 고정/변동/반변동 분류
- `daily_prorate`: total ÷ 해당월 역일수
- `monthly_lump`: 일할하지 않음 (세금/수수료 등)
- 기존 해당월 데이터 삭제 후 재생성 (upsert 패턴)

## 검증 결과

| 검증 항목 | 결과 |
|-----------|------|
| Python 구문 검증 (ast.parse) | 통과 (6개 파일) |
| TypeScript 타입 검사 (tsc --noEmit) | 통과 |
| Vite 프로덕션 빌드 | 통과 |
| Alembic 마이그레이션 | 작성 완료 (d7e0f5a1b234) |

## Gap Analysis 결과: **100%** (9/9 항목 완료)
