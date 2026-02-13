# Sprint 11 완료 보고서: 종합 P&L 대시보드

## 개요
- **스프린트**: Sprint 11
- **목표**: 매출-원가-판관비-순이익 종합 손익계산(P&L) 대시보드
- **커밋**: `88da3d0`
- **달성률**: 100%

## 산출물 검증

### 백엔드
| 파일 | 줄수 | 내용 |
|------|------|------|
| `models/pnl.py` | 139줄 | DailyPnL(19컬럼) + MonthlyPnL(23컬럼), 2 테이블 |
| `api/pnl.py` | 206줄 | 5 엔드포인트 (일별/월별/YTD 조회 + P&L 계산 실행 + 추이 데이터) |
| `services/pnl_calculator.py` | 160줄 | P&L 계산 엔진 (1 클래스) |
| `services/revenue_aggregator.py` | 131줄 | 매출 집계 서비스 (3 함수) |
| Alembic | `e8f1a6b2c345_sprint11_pnl_tables.py` |
| 라우터 등록 | main.py에서 확인됨 (pnl_router) |

### 프론트엔드
| 파일 | 줄수 | 주요 기능 |
|------|------|----------|
| `PnLDashboardPage.tsx` | 354줄 | P&L KPI 카드, 매출/원가/GP/순이익 추이 차트, 월별 상세 테이블, YTD 누계 |

### 핵심 설계
- **매출 구조**: revenue_logistics(5113001) + revenue_bcqt(5113002) + revenue_other
- **원가**: cogs_total(6320000)
- **손익 흐름**: 매출 → 매출총이익(GP) → 영업이익 → 순이익
- **일별 P&L**: 고정비 일할안분 + 변동비 = 일별 비용
- **월별 P&L**: 일별 집계 + YTD 누계 (ytd_revenue~ytd_net_profit)

## 결론
Sprint 11 P&L 대시보드 100% 완료. 일별/월별/YTD 손익 실시간 산출.
