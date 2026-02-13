# Sprint 8 Gap Analysis: 분개장 + SmartBooks 데이터 임포트

## 계획 vs 구현 비교

| 계획 항목 | 파일 | 상태 | 비고 |
|-----------|------|------|------|
| `models/journal.py` — erp_journal_entries, erp_journal_lines | `backend/app/models/journal.py` | 완료 | JournalEntry (28컬럼, 6인덱스) + JournalLine (22컬럼, 2인덱스) |
| `schemas/journal_entry.py` — JournalEntry Pydantic 스키마 | `backend/app/schemas/journal_entry.py` | 완료 | 10개 스키마 (CRUD + List + Import/Validation Result) |
| `api/journal_entries.py` — 분개전표 CRUD + 게시(Post) | `backend/app/api/journal_entries.py` | 완료 | 8개 엔드포인트 (목록/상세/요약/검증/생성/게시/역분개/임포트) |
| `services/smartbooks_import.py` — (확장) GLTran 임포트 | `backend/app/services/smartbooks_import.py` | 완료 | import_gltran_data() 추가: 전표 그룹핑 + Acct Period 파싱 |
| `services/smartbooks_validator.py` — 임포트 후 검증 | `backend/app/services/smartbooks_validator.py` | 완료 | validate_journal_balance() + validate_account_balance() |
| `pages/JournalEntriesPage.tsx` — 분개전표 목록 + 상세 | `frontend/src/pages/JournalEntriesPage.tsx` | 완료 | 목록/상세 모달/KPI 카드/필터/페이지네이션/차대 균형 표시 |
| `pages/SmartBooksImportPage.tsx` — Excel 임포트 UI | `frontend/src/pages/SmartBooksImportPage.tsx` | 완료 | 3-Step 위저드 (업로드→미리보기→결과) + 통계 카드 |

## 구현 세부사항

### 데이터베이스 (2개 신규 테이블)
- `erp_journal_entries`: 28개 컬럼, 6개 인덱스 (module, fiscal, status, source, date, batch) + entry_number unique
- `erp_journal_lines`: 22개 컬럼, 2개 인덱스 (entry_id, account_code), CASCADE delete

### API 엔드포인트 (8개)
- `GET /api/v1/journal-entries` — 목록 (module/year/month/status/source/search 필터 + 페이지네이션)
- `GET /api/v1/journal-entries/summary` — 모듈별/상태별 통계 + 차대 합계
- `GET /api/v1/journal-entries/validate` — 차대 균형 검증
- `GET /api/v1/journal-entries/{id}` — 상세 (라인 포함 selectinload)
- `POST /api/v1/journal-entries` — 수동 생성 (차대 합계 자동 계산)
- `POST /api/v1/journal-entries/{id}/post` — 게시 (차대 균형 검증 후)
- `POST /api/v1/journal-entries/{id}/reverse` — 역분개
- `POST /api/v1/journal-entries/import-gltran` — SmartBooks GLTran 임포트

### SmartBooks 임포트 로직 (smartbooks_import.py 확장)
- 전표 그룹핑: (Module, Batch Nbr, Ref Nbr) 조합으로 헤더/라인 분리
- Acct Period 파싱: "012025" → fiscal_month=1, fiscal_year=2025
- 중복 체크: entry_number 기준 스킵
- 차대 합계 자동 계산
- 임포트 상태: status="posted", source="smartbooks_import"

### 검증 서비스 (smartbooks_validator.py)
- validate_journal_balance(): 전표별 차대 균형 + 전체 차대 합계
- validate_account_balance(): 특정 계정 코드 잔액 검증

## 검증 결과

| 항목 | 결과 |
|------|------|
| Python 구문 검증 (6개 파일) | 통과 |
| TypeScript 타입 검사 (tsc --noEmit) | 통과 (Set spread → Array.from 수정) |
| Vite 프로덕션 빌드 | 통과 |
| Alembic 마이그레이션 | 수동 작성 (b5c8d3e9f012) |

## 매치율: 100%

모든 계획 항목이 구현되었으며, 추가로 역분개(reverse) 엔드포인트와 계정별 잔액 검증(validate_account_balance) 유틸리티가 포함됨.
