# Sprint 12 Gap Analysis: 고객별/건별 수익성 분석

## 개요
- **Sprint**: 12
- **기능**: 고객별 수익성 랭킹 + 건별(shipment) 수익성 분석 + 월별 추이
- **분석일**: 2026-02-11
- **Match Rate**: 100% (8/8)

## 설계 vs 구현 대조

| # | 설계 항목 | 구현 상태 | 파일 |
|---|----------|----------|------|
| 1 | 수익성 분석 서비스 (고객별/건별/월별) | ✅ 완료 | `services/profitability_analyzer.py` |
| 2 | API 3개 엔드포인트 (by-customer, by-shipment, monthly-trend) | ✅ 완료 | `api/profitability.py` |
| 3 | main.py 라우터 등록 | ✅ 완료 | `main.py` |
| 4 | 고객별 수익성 페이지 (KPI + 랭킹 테이블) | ✅ 완료 | `ProfitabilityPage.tsx` |
| 5 | 건별 수익성 페이지 (유형 태그 + 페이지네이션) | ✅ 완료 | `ShipmentProfitPage.tsx` |
| 6 | App.tsx 라우트 등록 (2개 경로) | ✅ 완료 | `App.tsx` |
| 7 | AppLayout.tsx 메뉴 추가 (2개 항목) | ✅ 완료 | `AppLayout.tsx` |
| 8 | 신규 테이블 없음 (기존 테이블 활용) | ✅ 확인 | Alembic 마이그레이션 불필요 |

## 핵심 로직 검증

### 매출-매입 조인
- SellingRecord.mssql_source_id ↔ PurchaseOrder.mssql_shipment_ref
- CANCELLED 상태 PO는 매입에서 제외
- outerjoin으로 매입 없는 매출 건도 표시

### GP 계산
- GP = 매출(total_selling_vnd) - 매입(total_amount)
- GP율 = GP / 매출 × 100 (매출 0이면 0%)
- 고객별: GP 내림차순 정렬
- 건별: 서비스 날짜 내림차순 + 페이지네이션(50건)

### 프론트엔드 UX
- 고객별: 6개 KPI 카드(고객수, 건수, 매출, 매입, GP, 평균 GP율) + 랭킹 테이블
- 건별: 유형 태그(clearance/ops/co) + 고객명 검색 + 연도/월 필터
- GP율 색상: >= 30% green, >= 15% orange, >= 0% default, < 0% red

## 코드 품질 검증

| 검증 항목 | 결과 |
|----------|------|
| Python AST (3 파일) | ✅ PASS |
| TypeScript tsc --noEmit | ✅ PASS |
| Vite 프로덕션 빌드 | ✅ PASS (5.18s) |
| Alembic 마이그레이션 | N/A (신규 테이블 없음) |

## 결론
Sprint 12 수익성 분석 기능이 설계대로 100% 구현 완료.
기존 selling_records + purchase_orders 테이블을 활용한 분석 전용 모듈로,
신규 DB 스키마 변경 없이 3개 API + 2개 프론트엔드 페이지 구현.
