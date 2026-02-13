# Design: Sprint 1 - MSSQL 25개 테이블 모델 매핑

## 테이블 분류

### 그룹 A: 핵심 비즈니스 (이미 완료)
| 테이블 | 행 수 | 기존 모델 | 상태 |
|--------|------:|----------|------|
| clients | 2,724 | MssqlClient | ✅ 완료 |
| clearance | 1,289 | MssqlClearance | ⚠️ 컬럼 불완전 |
| (shipment) | - | MssqlShipment | ⚠️ 실제 테이블 없음 → 삭제 필요 |

### 그룹 B: 핵심 비즈니스 (신규)
| 테이블 | 행 수 | 모델명 | 파일 |
|--------|------:|--------|------|
| debit_sharepoint | 6,309 | MssqlDebitSharepoint | debit_sharepoint.py |
| scheme_clearance | 2,914 | MssqlSchemeClearance | scheme_clearance.py |
| scheme_ops | 1,823 | MssqlSchemeOps | scheme_ops.py |
| ops | 1,823 | MssqlOps | ops.py |
| scheme_co | 2,132 | MssqlSchemeCo | scheme_co.py |
| co | 2,132 | MssqlCo | co.py |
| an_sharepoint | 391 | MssqlAnSharepoint | an_sharepoint.py |

### 그룹 C: 마스터/설정
| 테이블 | 행 수 | 모델명 | 파일 |
|--------|------:|--------|------|
| companies | 6 | MssqlCompany | companies.py |
| contract | 13 | MssqlContract | contract.py |
| customer_clearance | 19 | MssqlCustomerClearance | customer_clearance.py |
| customer_config | 38 | MssqlCustomerConfig | customer_config.py |
| origin | 241 | MssqlOrigin | origin.py |
| npl_code | 135 | MssqlNplCode | npl_code.py |

### 그룹 D: 커뮤니케이션/이메일
| 테이블 | 행 수 | 모델명 | 파일 |
|--------|------:|--------|------|
| email_job | 1,778 | MssqlEmailJob | email_job.py |
| emails_fails | 0 | MssqlEmailFail | email_job.py (같은 파일) |
| newsletter | 5 | MssqlNewsletter | newsletter.py |
| articles_newsletter | 15 | MssqlArticleNewsletter | newsletter.py (같은 파일) |

### 그룹 E: 미팅/보상
| 테이블 | 행 수 | 모델명 | 파일 |
|--------|------:|--------|------|
| meeting_schedule | 8 | MssqlMeetingSchedule | meeting.py |
| meeting_contacts_gr | 18 | MssqlMeetingContact | meeting.py (같은 파일) |
| praise | 219 | MssqlPraise | praise.py |
| rewards | 5 | MssqlReward | praise.py (같은 파일) |
| sumary_point | 11 | MssqlSummaryPoint | praise.py (같은 파일) |

### 그룹 F: 시스템
| 테이블 | 행 수 | 모델명 | 파일 |
|--------|------:|--------|------|
| user_tokens | 1 | MssqlUserToken | user_tokens.py |

## 파일 구조

```
backend/app/models/mssql/
├── __init__.py              # 모든 모델 export (업데이트)
├── client.py                # ✅ 기존 (컬럼 업데이트 필요)
├── clearance.py             # ✅ 기존 → 전체 52개 컬럼으로 업데이트
├── shipment.py              # ❌ 삭제 (실제 테이블 없음)
├── debit_sharepoint.py      # 신규 (96개 컬럼)
├── scheme_clearance.py      # 신규 (33개 컬럼)
├── scheme_ops.py            # 신규 (19개 컬럼)
├── ops.py                   # 신규 (17개 컬럼)
├── scheme_co.py             # 신규 (14개 컬럼)
├── co.py                    # 신규 (8개 컬럼)
├── an_sharepoint.py         # 신규 (16개 컬럼)
├── companies.py             # 신규 (8개 컬럼)
├── contract.py              # 신규 (4개 컬럼)
├── customer_clearance.py    # 신규 (3개 컬럼)
├── customer_config.py       # 신규 (10개 컬럼)
├── origin.py                # 신규 (3개 컬럼)
├── npl_code.py              # 신규 (3개 컬럼)
├── email_job.py             # 신규 (email_job + emails_fails)
├── newsletter.py            # 신규 (newsletter + articles_newsletter)
├── meeting.py               # 신규 (meeting_schedule + meeting_contacts_gr)
├── praise.py                # 신규 (praise + rewards + sumary_point)
└── user_tokens.py           # 신규 (1개 컬럼)
```

## 타입 매핑 규칙

| MSSQL 타입 | SQLAlchemy 타입 |
|-----------|----------------|
| int | Integer |
| bigint | BigInteger |
| float | Float |
| decimal(p,s) | Numeric(p, s) |
| varchar(n) | String(n) |
| nvarchar(n) | String(n) (n=실제 max_length/2) |
| nvarchar(MAX) | Text |
| text | Text |
| bit | Boolean |
| date | Date |
| datetime | DateTime |
| datetime2 | DateTime |

## 기존 모델 수정 필요사항

### client.py — 컬럼 불일치 수정
- 실제 PK: `id_clients` (현재 `ClientID` → 수정)
- 실제 테이블명: `clients` (현재 `T_Client` → 수정)
- 실제 컬럼명: snake_case (현재 PascalCase → 수정)
- 누락 컬럼 추가: position, industry, fdi, province, key_contact, campaign 등

### clearance.py — 전면 재작성
- 실제 PK: `id_clearance` (현재 `ClearanceID` → 수정)
- 실제 테이블명: `clearance` (현재 `T_Clearance` → 수정)
- 현재 13개 컬럼 → 실제 52개 컬럼 (모두 비용 관련 float)

### shipment.py — 삭제
- MSSQL에 `T_Shipment` 테이블 없음 (가상으로 만들었던 것)
- debit_sharepoint 테이블이 실제 선적 정보 담당

## 검증 기준
- [ ] 25개 테이블 모두 매핑 완료
- [ ] 각 모델의 __tablename__이 실제 MSSQL 테이블명과 정확히 일치
- [ ] 컬럼명이 실제 MSSQL 컬럼명과 정확히 일치
- [ ] PK, 타입, nullable 속성 정확
- [ ] __init__.py에서 모든 모델 export
- [ ] 기존 client.py, clearance.py 수정 완료
- [ ] shipment.py 삭제 및 참조 정리
