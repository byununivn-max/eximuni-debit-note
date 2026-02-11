# Sprint 2: 기존 데이터 API + 기본 페이지

## 개요
- **스프린트**: Sprint 2
- **목표**: MSSQL 기존 데이터를 웹 UI로 조회/관리
- **선행 조건**: Sprint 1 완료 (25개 MSSQL 모델 매핑, 97% Gap Analysis)

## 범위

### 백엔드 (FastAPI)

#### 스키마 확장 (`schemas/mssql.py`)
| 스키마 | 모델 소스 | 용도 |
|--------|----------|------|
| MssqlSchemeOpsResponse | MssqlSchemeOps | Ops 스킴 목록 응답 |
| MssqlOpsDetailResponse | MssqlOps | Ops 비용 상세 응답 |
| MssqlSchemeCoResponse | MssqlSchemeCo | CO 스킴 목록 응답 |
| MssqlCoDetailResponse | MssqlCo + MssqlContract | CO 비용 + 계약 응답 |
| MssqlCustomerClearanceResponse | MssqlCustomerClearance | 고객별 동적 폼 설정 응답 |
| MssqlCustomerConfigResponse | MssqlCustomerConfig | 고객별 자동입력 설정 응답 |

#### API 엔드포인트 확장 (`api/mssql.py`)
| 메서드 | 경로 | 용도 |
|--------|------|------|
| GET | /api/v1/mssql/ops | Ops 스킴 목록 (필터, 페이지네이션) |
| GET | /api/v1/mssql/ops/{scheme_ops_id}/costs | Ops 비용 상세 |
| GET | /api/v1/mssql/co | CO 스킴 목록 (필터, 페이지네이션) |
| GET | /api/v1/mssql/co/{scheme_co_id}/costs | CO 비용 + 계약 상세 |
| GET | /api/v1/mssql/debit-sharepoint | Debit Sharepoint 목록 (필터, 페이지네이션) |
| GET | /api/v1/mssql/customer-forms/{customer_name} | 고객별 동적 폼 설정 |
| GET | /api/v1/mssql/customer-config | 고객별 자동입력 설정 목록 |

### 프론트엔드 (React + Ant Design)

#### 타입 정의
- `types/mssql.ts` — MSSQL 데이터 전용 TypeScript 인터페이스

#### 새 페이지
| 파일 | 용도 |
|------|------|
| `pages/ClearancePage.tsx` | CD 통관 목록 + 비용 상세 모달 |
| `pages/OpsPage.tsx` | Ops 운영 목록 + 비용 상세 모달 |
| `pages/COPage.tsx` | CO 목록 + 비용/계약 상세 모달 |

#### 새 컴포넌트
| 파일 | 용도 |
|------|------|
| `components/DynamicForm.tsx` | customer_clearance JSON 기반 동적 폼 렌더링 |

#### 기존 페이지 수정
| 파일 | 변경 |
|------|------|
| `ClientsPage.tsx` | PostgreSQL → MSSQL clients API 전환 |
| `ShipmentsPage.tsx` | PostgreSQL → MSSQL debit_sharepoint API 전환 |

#### 라우팅/메뉴
| 파일 | 변경 |
|------|------|
| `App.tsx` | /clearance, /ops, /co 라우트 추가 |
| `AppLayout.tsx` | 사이드바 메뉴 항목 추가 (통관, Ops, CO) |

## 제약 조건
- MSSQL 테이블은 읽기 전용 (스키마 변경 불가)
- 기존 PostgreSQL API는 유지 (향후 Selling/Buying 모듈용)
- 모든 MSSQL 조회는 `get_mssql_db` 의존성 사용
- 프론트엔드는 기존 Ant Design 패턴 유지

## 완료 기준
- [ ] 7개 MSSQL API 엔드포인트 정상 동작
- [ ] 3개 신규 페이지 렌더링 확인
- [ ] 기존 2개 페이지 MSSQL 전환 완료
- [ ] DynamicForm 컴포넌트 JSON 파싱/렌더링 동작
- [ ] 사이드바 메뉴 6개 항목 표시
