# EXIMUNI Debit Note System

베트남 물류 Debit Note(청구서) 자동 생성 시스템

---

## 🌐 접속 링크

### 👉 [시스템 바로가기](https://elvera-unoutlawed-guardedly.ngrok-free.dev)

> 처음 접속 시 ngrok 안내 페이지가 나오면 **"Visit Site"** 버튼을 클릭하세요.

---

## 🔐 테스트 계정

| 역할 | 아이디 | 비밀번호 | 할 수 있는 일 |
|------|--------|----------|---------------|
| 관리자 | `admin` | `admin123` | 전체 기능 사용 |
| 회계담당 | `accountant1` | `account123` | 거래 입력, DN 생성/제출 |
| 현장담당 | `pic1` | `pic123` | 거래 입력, DN 승인/거절 |

---

## 📋 테스트 순서 (따라하기)

### STEP 1. 로그인
- `admin` / `admin123` 으로 로그인

### STEP 2. 거래처 등록
- 좌측 메뉴 → **거래처 관리** → **[거래처 등록]**
- 거래처 코드: `TEST01`, 거래처명: `테스트 물류`
- 통화: `VND`, 복잡도: `Medium` → **[저장]**

### STEP 3. 환율 등록
- 좌측 메뉴 → **환율 관리** → **[환율 등록]**
- 기준일: 오늘 날짜, 환율: `25400` → **[등록]**

### STEP 4. 계정 전환
- 로그아웃 → `accountant1` / `account123` 로그인

### STEP 5. 거래 데이터 등록 (2~3건)
- 좌측 메뉴 → **거래 데이터** → **[거래 등록]**
- 거래처: `TEST01`, 유형: `IMPORT`, Invoice No.: `INV-001`
- **[비용 항목 추가]** → 항목 선택 → USD 금액 입력 (예: 500)
- **[등록]** → 같은 방법으로 2~3건 추가 (Invoice 번호 변경)

### STEP 6. Debit Note 생성
- 좌측 메뉴 → **Debit Note** → **[Debit Note 생성]**
- 거래처: `TEST01`, 기간: 이번 달 1일~말일
- 환율 자동 입력 확인 → **[생성]**

### STEP 7. 검토 제출
- 생성된 DN의 **[상세]** → **[검토 제출]**

### STEP 8. 계정 전환
- 로그아웃 → `pic1` / `pic123` 로그인

### STEP 9. 승인
- **Debit Note** → 해당 DN **[상세]** → **[승인]**

### STEP 10. Excel 다운로드
- Debit Note 목록에서 초록색 **[Excel]** 버튼 클릭
- `.xlsx` 파일 다운로드 확인 ✅

---

## 📌 주요 화면

| 메뉴 | 설명 |
|------|------|
| **Dashboard** | 전체 현황 요약 (미승인 건수, 청구액 등) |
| **거래처 관리** | 거래처 등록/수정 |
| **거래 데이터** | Shipment 등록 (비용 항목 포함) |
| **환율 관리** | USD→VND 환율 등록 |
| **Debit Note** | DN 생성 → 제출 → 승인 → Excel 출력 |

---

## 🔄 Debit Note 상태 흐름

```
DRAFT(초안) → PENDING_REVIEW(검토중) → APPROVED(승인) → EXPORTED(출력완료)
                                     ↘ REJECTED(거절)
```

---

## ⚠️ 참고 사항

- **본인이 만든 DN은 본인이 승인할 수 없습니다** → 다른 계정으로 승인
- Excel 출력은 **APPROVED** 상태에서만 가능
- 같은 Invoice No.로 등록 시 중복 경고 표시 (등록은 가능)
- 문제 발생 시 **화면 캡처**와 함께 보고 부탁드립니다

---

## 🛠 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Python 3.11, FastAPI, PostgreSQL 15, Redis 7 |
| Frontend | React 18, TypeScript, Ant Design 5 |
| Infra | Docker Compose, nginx, ngrok |
