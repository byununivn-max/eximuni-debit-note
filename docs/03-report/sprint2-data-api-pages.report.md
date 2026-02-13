# Sprint 2 완료 보고서 — 기존 데이터 API + 기본 페이지

## 개요

| 항목 | 내용 |
|------|------|
| 기능명 | sprint2-data-api-pages |
| 상태 | 완료 (100%) |
| 커밋 | `7d39865` (초기, 98%) → 최종 검증 완료 |

## 달성 현황

### 백엔드 API (12개 엔드포인트)

| # | 메서드 | 경로 | 설명 | 상태 |
|---|--------|------|------|------|
| 1 | GET | /api/v1/mssql/clients | 고객사 목록 (페이지네이션, 검색) | 완료 |
| 2 | GET | /api/v1/mssql/clients/{id} | 고객사 상세 | 완료 |
| 3 | GET | /api/v1/mssql/clearance | 통관 스킴 목록 (필터, 페이지네이션) | 완료 |
| 4 | GET | /api/v1/mssql/clearance/{id}/costs | 통관 비용 상세 | 완료 |
| 5 | GET | /api/v1/mssql/debit-sharepoint | Debit Sharepoint 목록 | 완료 |
| 6 | GET | /api/v1/mssql/debit-sharepoint/{id} | Debit 상세 | 완료 |
| 7 | GET | /api/v1/mssql/ops | Ops 스킴 목록 | 완료 |
| 8 | GET | /api/v1/mssql/ops/{id}/costs | Ops 비용 상세 | 완료 |
| 9 | GET | /api/v1/mssql/co | CO 스킴 목록 | 완료 |
| 10 | GET | /api/v1/mssql/co/{id}/costs | CO 비용 + 계약 상세 | 완료 |
| 11 | GET | /api/v1/mssql/customer-forms/{name} | 고객별 동적 폼 | 완료 |
| 12 | GET | /api/v1/mssql/customer-config | 고객별 자동입력 설정 | 완료 |

### Pydantic 스키마 (14개 클래스)

| # | 클래스명 | 용도 |
|---|----------|------|
| 1 | MssqlClientResponse | 고객사 목록 응답 |
| 2 | MssqlClientDetailResponse | 고객사 상세 응답 |
| 3 | MssqlSchemeClearanceResponse | 통관 스킴 응답 |
| 4 | MssqlClearanceResponse | 통관 목록 응답 |
| 5 | MssqlClearanceDetailResponse | 통관 비용 상세 응답 |
| 6 | MssqlDebitSharepointResponse | Debit Sharepoint 목록 응답 |
| 7 | MssqlDebitSharepointDetailResponse | Debit 상세 응답 |
| 8 | MssqlSchemeOpsResponse | Ops 스킴 응답 |
| 9 | MssqlOpsDetailResponse | Ops 비용 상세 응답 |
| 10 | MssqlSchemeCoResponse | CO 스킴 응답 |
| 11 | MssqlCoDetailResponse | CO 비용 상세 응답 |
| 12 | MssqlCoWithContractResponse | CO 비용 + 계약 통합 응답 |
| 13 | MssqlCustomerClearanceResponse | 고객별 통관 폼 응답 |
| 14 | MssqlCustomerConfigResponse | 고객별 자동입력 설정 응답 |
| - | PaginatedResponse | 제네릭 페이지네이션 래퍼 |

### 프론트엔드 신규 페이지 (3개)

| 페이지 | 경로 | API 연동 | 기능 |
|--------|------|----------|------|
| ClearancePage | /clearance | /api/v1/mssql/clearance | 통관 목록 + 비용 상세 모달 |
| OpsPage | /ops | /api/v1/mssql/ops | Ops 목록 + 비용 상세 모달 |
| COPage | /co | /api/v1/mssql/co | CO 목록 + 비용/계약 모달 |

### 프론트엔드 기존 페이지 전환 (2개)

| 페이지 | 변경 내용 |
|--------|-----------|
| ClientsPage | PostgreSQL → MSSQL /api/v1/mssql/clients 전환 |
| ShipmentsPage | PostgreSQL → MSSQL /api/v1/mssql/debit-sharepoint 전환 |

### 프론트엔드 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| DynamicForm.tsx | customer_clearance JSON 기반 동적 폼 렌더링 |

### TypeScript 타입

- **파일**: `types/mssql.ts`
- **인터페이스**: 11개 + PaginatedResponse 제네릭

### 라우팅/메뉴 변경

| 파일 | 변경 내용 |
|------|-----------|
| App.tsx | /clearance, /ops, /co 라우트 등록 |
| AppLayout.tsx | 운영 그룹에 CD통관, Ops운영, CO원산지 메뉴 추가 |

## 기능 특징

- **페이지네이션**: 모든 목록 API에 skip/limit 기반 페이지네이션 지원
- **다중 필터**: 고객사, 수출입, 날짜범위, 상태별 필터링
- **전문 검색**: Invoice/BL/고객명/HBL 복합 검색
- **FK 관계 해결**: scheme → detail → contract 3단계 관계 탐색
- **인증 필수**: 모든 엔드포인트에 get_current_user 의존성 적용
- **에러 처리**: MSSQL 연결 실패 시 503 에러 응답 반환

## 수량 요약

| 구분 | 계획 | 실제 | 비고 |
|------|-----:|-----:|------|
| 백엔드 API | 7개 | 12개 | 계획 대비 5개 추가 |
| Pydantic 스키마 | - | 14개 + 제네릭 1개 | |
| 신규 페이지 | 3개 | 3개 | |
| 기존 페이지 전환 | 2개 | 2개 | |
| 신규 컴포넌트 | - | 1개 | DynamicForm |
| TypeScript 타입 | - | 11개 + 제네릭 1개 | |

## 검증 기준 달성

- [x] 12개 MSSQL API 엔드포인트 구현 (계획 7개 + 추가 5개)
- [x] 3개 신규 페이지 렌더링 확인
- [x] 기존 2개 페이지 MSSQL 전환 완료
- [x] DynamicForm 컴포넌트 JSON 파싱/렌더링 동작
- [x] 사이드바 메뉴 운영 그룹 4개 항목 + 마스터 그룹
