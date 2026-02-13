# Sprint 4: Selling 구조화 (Dual DB 조합) - PDCA Plan

> 작성일: 2026-02-11

## 1. 목표

MSSQL에 분산된 기존 매출 데이터(clearance/ops/co)를 PostgreSQL erp_selling_records/erp_selling_items로 구조화하여 통합 매출 조회 기반을 마련한다.

## 2. 신규 테이블 (PostgreSQL)

### erp_selling_records (매출 집계)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| selling_id | PK | 자동증가 |
| record_type | VARCHAR(20) | clearance / ops / co |
| mssql_source_id | INT | MSSQL scheme PK (소프트 참조) |
| mssql_cost_id | INT | MSSQL cost detail PK |
| customer_name | VARCHAR(255) | 고객명 |
| invoice_no | VARCHAR(255) | 인보이스 번호 |
| service_date | DATE | 서비스일 |
| total_selling_vnd | NUMERIC(15,2) | 매출 합계 (VND) |
| item_count | INT | 상세 항목 수 |
| sync_status | VARCHAR(20) | SYNCED / ERROR |
| synced_at | DATETIME | 동기화 시각 |
| created_at / updated_at | DATETIME | 타임스탬프 |

### erp_selling_items (매출 상세)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| item_id | PK | 자동증가 |
| selling_id | FK | erp_selling_records 참조 |
| fee_name | VARCHAR(100) | 비용 항목명 |
| fee_category | VARCHAR(50) | customs / transport / handling / other |
| amount | NUMERIC(15,2) | 금액 (VND) |
| currency | VARCHAR(10) | 통화 |
| mssql_source_column | VARCHAR(100) | 원본 MSSQL 컬럼명 |

## 3. 동기화 서비스 (selling_sync.py)

### 로직
1. MSSQL sync 세션으로 scheme_clearance + clearance 조회
2. clearance의 52개 비용 컬럼 중 0이 아닌 항목을 selling_items로 변환
3. scheme_ops + ops, scheme_co + co도 동일하게 처리
4. PostgreSQL async 세션으로 erp_selling_records + erp_selling_items 저장
5. mssql_source_id 기준 중복 방지 (upsert)

### 비용 컬럼 매핑
- clearance: phi_thong_quan, phi_van_chuyen 등 52개 → customs/transport/handling 카테고리
- ops: customs_clearance_fee, phi_luu_cont 등 15개 → customs/handling 카테고리
- co: le_phi_co, le_phi_bo_cong_thuong 등 5개 → co 카테고리

## 4. API (selling_records.py)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/v1/selling-records | 매출 목록 (필터/검색/페이지네이션) |
| GET | /api/v1/selling-records/{id} | 매출 상세 (items 포함) |
| POST | /api/v1/selling-records/sync | 전체 동기화 실행 |
| GET | /api/v1/selling-records/summary | 유형별 매출 집계 |

## 5. 프론트엔드 (SellingRecordsPage.tsx)

- 매출 종합 목록 테이블 (record_type 필터, 고객명 검색, 기간 필터)
- 상세 모달: selling_items 목록 표시
- 동기화 버튼 (POST /sync 호출)
- 상단 KPI 카드: 유형별 매출 합계

## 6. 산출물

| 파일 | 용도 |
|------|------|
| models/selling.py | erp_selling_records, erp_selling_items |
| schemas/selling.py | Pydantic 스키마 |
| services/selling_sync.py | MSSQL → PostgreSQL 동기화 |
| api/selling_records.py | 매출 조회 + 동기화 API |
| pages/SellingRecordsPage.tsx | 매출 종합 조회 |
