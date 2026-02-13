# Sprint 11 Gap Analysis: 종합 P&L 대시보드

## 계획 vs 구현 비교

| 계획 항목 | 파일 | 상태 | 비고 |
|-----------|------|------|------|
| `models/pnl.py` — DailyPnL, MonthlyPnL | `backend/app/models/pnl.py` | 완료 | DailyPnL (17 금액컬럼) + MonthlyPnL (13당월+5YTD) |
| `services/revenue_aggregator.py` — 매출 집계 | `backend/app/services/revenue_aggregator.py` | 완료 | 511x 매출 + 632x 원가 + 515x/635x 금융수익비용 |
| `services/pnl_calculator.py` — P&L 계산 엔진 | `backend/app/services/pnl_calculator.py` | 완료 | 월별 P&L 계산 + Sprint 10 비용분류 연동 + YTD 누계 |
| `api/pnl.py` — P&L 조회 API | `backend/app/api/pnl.py` | 완료 | 5개 엔드포인트 (월별목록/상세/연간요약/월계산/연계산) |
| `pages/PnLDashboardPage.tsx` — P&L 대시보드 | `frontend/src/pages/PnLDashboardPage.tsx` | 완료 | 6개 YTD KPI 카드 + 월별 테이블 + YTD 합계행 |
| Alembic 마이그레이션 | `e8f1a6b2c345_sprint11_pnl_tables.py` | 완료 | 2개 테이블 + 3개 인덱스 |
| App.tsx 라우트 등록 | `frontend/src/App.tsx` | 완료 | 1개 라우트 추가 |
| AppLayout.tsx 메뉴 등록 | `frontend/src/components/AppLayout.tsx` | 완료 | 1개 메뉴 항목 추가 |

## 구현 세부사항

### 데이터베이스 (2개 신규 테이블)
- `erp_daily_pnl`: pnl_date UNIQUE, 매출(4) + 원가(1) + GP + SGA(2) + 영업이익 + 금융(2) + 기타 + 순이익 = 13 금액컬럼
- `erp_monthly_pnl`: (fiscal_year+fiscal_month) UNIQUE, 당월 13컬럼 + YTD 5컬럼

### P&L 계산 로직
```
매출(Revenue) = SUM(JournalLine.credit WHERE 511%)
  - 물류(5113001) + BCQT(5113002) + 기타(5113xxx)
매출원가(COGS) = SUM(JournalLine.debit WHERE 632%)
매출총이익(GP) = 매출 - 원가
고정비 = MonthlyCostSummary WHERE cost_type='fixed'
변동비 = MonthlyCostSummary WHERE cost_type='variable' + 'semi_variable'
영업이익 = GP - 고정비 - 변동비
금융수익 = SUM(JournalLine.credit WHERE 515%)
금융비용 = SUM(JournalLine.debit WHERE 635%)
순이익 = 영업이익 + 금융수익 - 금융비용 + 기타
```

### API 엔드포인트 (5개)
- `GET /api/v1/pnl/monthly` — 연도별 월별 P&L 목록
- `GET /api/v1/pnl/monthly/{year}/{month}` — 특정 월 P&L 상세
- `GET /api/v1/pnl/year-summary` — 연간 P&L 요약 (월별 추이 + YTD)
- `POST /api/v1/pnl/calculate` — 월별 P&L 계산 실행
- `POST /api/v1/pnl/calculate-year` — 연간 P&L 일괄 계산 (1~12월)

### 프론트엔드
- 6개 YTD KPI 카드: 매출, 매출원가, 매출총이익(GP율), 영업이익, 순이익, 순이익률
- 월별 테이블: 매출/원가/GP/GP율/영업이익/순이익/순이익률
- YTD 합계 Summary Row
- 연간 P&L 일괄 계산 버튼

## 검증 결과

| 검증 항목 | 결과 |
|-----------|------|
| Python 구문 검증 (ast.parse) | 통과 (6개 파일) |
| TypeScript 타입 검사 (tsc --noEmit) | 통과 |
| Vite 프로덕션 빌드 | 통과 |
| Alembic 마이그레이션 | 작성 완료 (e8f1a6b2c345) |

## Gap Analysis 결과: **100%** (8/8 항목 완료)
