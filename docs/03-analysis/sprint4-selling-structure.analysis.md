# Sprint 4: Selling 구조화 - Gap Analysis

> 분석일: 2026-02-11
> 분석 대상: Sprint 4 PDCA Plan vs 실제 구현

## 1. 계획 대비 구현 현황

| 항목 | 계획 | 구현 | 상태 |
|------|------|------|------|
| SellingRecord 모델 (erp_selling_records) | 12개 컬럼 + 4 index | 12개 컬럼 + type/customer/date/source(unique) | PASS |
| SellingItem 모델 (erp_selling_items) | 7개 컬럼 + FK CASCADE | 7개 컬럼 + FK CASCADE + ix_si_selling | PASS |
| 동기화 서비스 (selling_sync.py) | clearance+ops+co → erp_selling | 52+11+3 비용 컬럼 매핑, full sync | PASS |
| Pydantic 스키마 | Record/Item/Sync/Summary | 8개 스키마 클래스 | PASS |
| GET /selling-records | 목록 조회 + 필터/검색 | type/customer/date/search 필터 | PASS |
| GET /selling-records/{id} | 상세 조회 (items 포함) | selectinload items | PASS |
| POST /selling-records/sync | 동기화 트리거 | admin/accountant 권한 체크 | PASS |
| GET /selling-records/summary | 유형별 집계 | record_type GROUP BY 집계 | PASS |
| SellingRecordsPage.tsx | 목록 + 검색/필터 + 상세 모달 | Table + Summary KPI + 동기화 버튼 | PASS |
| 사이드바 메뉴 | 매출 종합 메뉴 추가 | FundOutlined 아이콘 + '매출 종합' | PASS |
| 라우팅 | /selling-records | App.tsx 라우트 등록 완료 | PASS |
| Alembic 마이그레이션 | 2개 테이블 생성 | 31aad5754c4f 적용 완료 | PASS |

## 2. 검증 결과

### 백엔드 검증
- Selling 라우트: 4개 엔드포인트 (list, detail, sync, summary)
- 모델 import: SellingRecord, SellingItem OK
- Sync 서비스: selling_sync.sync_selling_records import OK
- DB 테이블: erp_selling_records, erp_selling_items 확인

### 프론트엔드 검증
- TypeScript: `tsc --noEmit` 에러 없음
- Vite build: 성공 (2.05s, 1,290 kB)

### Alembic 마이그레이션
- 리비전: 31aad5754c4f (9e0655b5d748 기반)
- upgrade: 2개 테이블 + 5개 인덱스 (source unique 포함)
- downgrade: 정리 완료

### 동기화 서비스 특이사항
- Clearance 비용 매핑: 47개 컬럼 (customs/transport/handling/other)
- Ops 비용 매핑: 11개 컬럼
- CO 비용 매핑: 3개 컬럼
- CO scheme_co PK가 varchar → 숫자 변환 로직 포함
- Full sync 방식: 기존 레코드 삭제 후 재생성 (mssql_source_id unique 보장)

## 3. 매칭률

**12 / 12 = 100% PASS**

## 4. 다음 단계

Sprint 5: 워크플로우 + 감사 (erp_approval_workflows, erp_audit_logs)
