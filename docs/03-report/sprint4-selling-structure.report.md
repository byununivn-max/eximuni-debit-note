# Sprint 4 완료 보고서: Selling 구조화

## 개요
- **스프린트**: Sprint 4
- **목표**: MSSQL 기존 매출 데이터(clearance/ops/co)를 PostgreSQL로 구조화
- **커밋**: `441a164`
- **달성률**: 100%

## 산출물 검증

### 백엔드
| 파일 | 줄수 | 내용 |
|------|------|------|
| `models/selling.py` | 89줄 | SellingRecord(13컬럼) + SellingItem(7컬럼), 2 테이블 |
| `schemas/selling.py` | 98줄 | 7 스키마 클래스 |
| `api/selling_records.py` | 174줄 | 4 엔드포인트 (GET list, GET detail, POST sync, GET summary) |
| `services/selling_sync.py` | 309줄 | MSSQL→PG 동기화 서비스 (2 함수) |
| Alembic | `31aad5754c4f_sprint4_selling_records.py` |
| 라우터 등록 | main.py에서 확인됨 |

### 프론트엔드
| 파일 | 줄수 | 주요 기능 |
|------|------|----------|
| `SellingRecordsPage.tsx` | 436줄 | 매출 종합 목록, record_type 필터, 고객명 검색, 상세 모달, 동기화 버튼, KPI 카드 |

### 핵심 설계
- **erp_selling_records**: clearance/ops/co 3가지 유형의 매출 집계
- **erp_selling_items**: 비용 컬럼별 상세 항목 (fee_name + fee_category)
- **동기화**: MSSQL scheme + cost 테이블 → PG upsert (중복 방지)
- **unique 인덱스**: (record_type, mssql_source_id) 복합 유니크

## 결론
Sprint 4 Selling 구조화 모듈 100% 완료. MSSQL 52개 비용 컬럼 매핑 포함.
