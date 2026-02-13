# Sprint 6 Gap Analysis: 대시보드 (매출/매입/영업이익)

## 계획 vs 구현 비교

| 계획 항목 | 파일 | 상태 | 비고 |
|-----------|------|------|------|
| `api/dashboard.py` — Dual DB 조회 → 매출/매입/GP 집계 | `backend/app/api/dashboard.py` | 완료 | 3개 엔드포인트 (kpi, monthly-trend, customer-profit) |
| `services/profit_calc.py` — Selling - Buying = GP 계산 | `backend/app/services/profit_calc.py` | 완료 | get_kpi_summary, get_monthly_trend, get_customer_profit |
| `pages/DashboardPage.tsx` — KPI 카드 + 차트 (강화) | `frontend/src/pages/DashboardPage.tsx` | 완료 | KPI 4개 카드 + Column 차트 + 고객 TOP 10 테이블 |
| `pages/ProfitDashboardPage.tsx` — 고객별/월별 수익성 | `frontend/src/pages/ProfitDashboardPage.tsx` | 완료 | 월별 수익성 테이블 + Bar 차트 + 고객 상세 테이블 |

## 구현 세부사항

### 백엔드 API (3개 엔드포인트)
- `GET /api/v1/dashboard/kpi` — 매출/매입/영업이익/GP마진/건수
- `GET /api/v1/dashboard/monthly-trend?year=` — 월별 12개월 매출/매입/이익 추이
- `GET /api/v1/dashboard/customer-profit?limit=` — 고객별 매출 TOP N

### 수익 계산 로직 (`profit_calc.py`)
- 매출: `erp_selling_records.total_selling_vnd` 합계
- 매입: `erp_purchase_orders.total_amount` 합계 (CONFIRMED 상태만)
- 영업이익 = 매출 - 매입
- GP 마진 = (영업이익 / 매출) * 100

### 프론트엔드
- `DashboardPage.tsx`: KPI Statistic 카드 4개 (매출/매입/영업이익/GP마진) + @ant-design/charts Column 차트 (월별 추이) + 고객 TOP 10 Table
- `ProfitDashboardPage.tsx`: 월별 수익성 Table (합계 행 포함) + @ant-design/charts Bar 차트 (고객별 매출) + 고객별 상세 Table + 연도/TOP N 필터

### 라우팅 & 메뉴
- `App.tsx`: `/profit-dashboard` 라우트 추가
- `AppLayout.tsx`: PieChartOutlined 아이콘 + '수익성 분석' 메뉴 항목

## 검증 결과

| 항목 | 결과 |
|------|------|
| Python 구문 검증 | 통과 |
| TypeScript 타입 검사 (tsc --noEmit) | 통과 |
| Vite 프로덕션 빌드 | 통과 |
| Alembic 마이그레이션 | 불필요 (새 테이블 없음, 기존 erp_selling_records + erp_purchase_orders 활용) |

## 매치율: 100%

모든 계획 항목이 구현되었으며, 추가로 인라인 Pydantic 스키마(KpiResponse, MonthlyTrendItem, CustomerProfitItem)와 차트 라이브러리(@ant-design/charts) 설치가 포함됨.
