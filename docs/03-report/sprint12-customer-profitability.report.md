# Sprint 12 완료 보고서: 고객별/건별 수익성 분석

## 개요
- **스프린트**: Sprint 12
- **목표**: 고객별 GP 랭킹 + 건(shipment)별 수익성 상세 분석
- **커밋**: `74031c7`
- **달성률**: 100%

## 산출물 검증

### 백엔드
| 파일 | 줄수 | 내용 |
|------|------|------|
| `api/profitability.py` | 55줄 | 3 엔드포인트 (고객별 수익성, 건별 수익성, 기간별 추이) |
| `services/profitability_analyzer.py` | 268줄 | 수익성 분석 엔진 (3 함수) |
| 라우터 등록 | main.py에서 확인됨 (profit_router) |

### 프론트엔드
| 파일 | 줄수 | 주요 기능 |
|------|------|----------|
| `ProfitabilityPage.tsx` | 224줄 | 고객별 GP 랭킹 테이블, GP 마진율 바 차트, 기간 필터 |
| `ShipmentProfitPage.tsx` | 200줄 | 건별 수익성 상세 (매출-매입-GP), shipment 검색, 상세 모달 |

### 핵심 설계
- **고객별 수익성**: 매출합계 - 매입합계 = GP, GP 마진율 = GP/매출 × 100
- **건별 수익성**: mssql_shipment_ref 기준 매출/매입 매칭
- **신규 테이블 없음**: selling_records + purchase_orders 기존 데이터 활용
- **분석 엔진**: profitability_analyzer.py에서 집계 쿼리 실행

## 결론
Sprint 12 수익성 분석 100% 완료. 고객 GP 랭킹 + 건별 마진 분석 2개 페이지.
