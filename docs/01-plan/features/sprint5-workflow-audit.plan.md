# Sprint 5: 워크플로우 + 감사 - PDCA Plan

> 작성일: 2026-02-11

## 1. 목표

범용 승인 워크플로우(debit_note/purchase_order/selling_record)와 ERP 전용 감사 로그를 구축하여, 모든 상태 변경 이력 및 데이터 변경 추적을 통합 관리한다.

## 2. 신규 테이블 (PostgreSQL)

### erp_approval_workflows (승인 워크플로우)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| workflow_id | PK | 자동증가 |
| entity_type | VARCHAR(50) | debit_note / purchase_order / selling_record |
| entity_id | INT | 대상 엔티티 PK |
| action | VARCHAR(30) | submit / approve / reject / confirm / cancel |
| from_status | VARCHAR(30) | 변경 전 상태 |
| to_status | VARCHAR(30) | 변경 후 상태 |
| performed_by | FK(users) | 수행자 |
| comment | TEXT | 코멘트 |
| created_at | DATETIME | 생성 시각 |

### erp_audit_logs (ERP 감사 로그)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| audit_id | PK | 자동증가 |
| entity_type | VARCHAR(100) | 테이블명 (erp_suppliers 등) |
| entity_id | INT | 레코드 PK |
| action | VARCHAR(20) | INSERT / UPDATE / DELETE |
| old_values | JSON | 변경 전 값 |
| new_values | JSON | 변경 후 값 |
| performed_by | FK(users) | 수행자 |
| ip_address | VARCHAR(50) | IP 주소 |
| action_at | DATETIME | 발생 시각 |

## 3. API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/v1/workflows | 워크플로우 이력 목록 (필터/페이지네이션) |
| GET | /api/v1/workflows/{entity_type}/{entity_id} | 특정 엔티티 워크플로우 이력 |
| POST | /api/v1/workflows | 워크플로우 이벤트 기록 |
| GET | /api/v1/erp-audit-logs | 감사 로그 목록 (필터/페이지네이션) |
| GET | /api/v1/erp-audit-logs/summary | 감사 로그 통계 |

## 4. 감사 유틸 함수

`services/audit_service.py`에 재사용 가능한 함수 제공:
- `record_workflow()` — 워크플로우 이벤트 기록
- `record_audit_log()` — 감사 로그 기록

## 5. 프론트엔드

- `AuditLogsPage.tsx`: 탭 구조 (워크플로우 이력 | 감사 로그)
- 워크플로우 탭: 타임라인 형태 상태 변경 이력
- 감사 로그 탭: 테이블 형태 데이터 변경 이력

## 6. 산출물

| 파일 | 용도 |
|------|------|
| models/workflow.py | erp_approval_workflows |
| models/erp_audit.py | erp_audit_logs |
| schemas/workflow.py | Pydantic 스키마 |
| services/audit_service.py | 감사/워크플로우 기록 유틸 |
| api/workflows.py | 워크플로우 + 감사 API |
| pages/AuditLogsPage.tsx | 감사/워크플로우 이력 조회 |
