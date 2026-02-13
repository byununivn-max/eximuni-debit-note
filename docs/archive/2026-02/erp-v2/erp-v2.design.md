# ERP v2 Design Document

> **Summary**: Dual-DB (PostgreSQL + MSSQL), Microsoft MSAL SSO, ERP 인프라 강화를 위한 상세 설계
>
> **Project**: EXIMUNI ERP System
> **Version**: 2.0.0
> **Author**: CTO Lead (PDCA Team Mode)
> **Date**: 2026-02-11
> **Status**: Draft
> **Planning Doc**: [erp-v2.plan.md](../../01-plan/features/erp-v2.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. MSSQL 레거시 테이블을 ORM 모델로 정의하여 안정적인 데이터 접근 계층 구축
2. MSAL SSO의 React Hooks 위반 수정 및 로그아웃 플로우 완성
3. Alembic 마이그레이션으로 `azure_oid` 컬럼 안전하게 추가
4. 기존 v1 기능의 회귀 없이 Dual-DB/Dual-Auth 통합 완료

### 1.2 Design Principles

- **Backward Compatibility**: v1 JWT 인증과 PostgreSQL 기능을 그대로 유지
- **Graceful Degradation**: MSSQL 또는 Azure AD 미설정 시 정상 동작 보장
- **Separation of Concerns**: MSSQL 모델/API를 별도 모듈로 분리
- **Rules of Hooks**: React Hooks 규칙 준수를 위한 컴포넌트 분리

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                │
│  :3001                                                    │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │LoginPage │  │MsalLoginBtn  │  │ AppLayout         │  │
│  │(form)    │  │(hooks-safe)  │  │ (logout handler)  │  │
│  └────┬─────┘  └──────┬───────┘  └─────────┬─────────┘  │
│       │               │                     │            │
│  ┌────▼───────────────▼─────────────────────▼────────┐  │
│  │           AuthContext + authService                 │  │
│  │           (JWT / MSAL token management)             │  │
│  └────────────────────┬──────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────┘
                        │ HTTP (Bearer token)
┌───────────────────────┼──────────────────────────────────┐
│                    Backend (FastAPI)                       │
│  :8000                │                                   │
│  ┌────────────────────▼──────────────────────────────┐   │
│  │  security.py: get_current_user()                   │   │
│  │  MSAL (RS256/JWKS) → JWT (HS256) fallback          │   │
│  └────┬───────────────────────────┬──────────────────┘   │
│       │                           │                       │
│  ┌────▼────────┐  ┌──────────────▼───────────────────┐   │
│  │ api/auth.py │  │ api/mssql.py (NEW)               │   │
│  │ /login      │  │ /api/v1/mssql/clients            │   │
│  │ /me         │  │ /api/v1/mssql/clearance/{id}     │   │
│  │ /config     │  │ /api/v1/mssql/shipments          │   │
│  └────┬────────┘  └──────────────┬───────────────────┘   │
│       │                          │                        │
│  ┌────▼─────┐  ┌────────────┐  ┌▼──────────────────┐    │
│  │PostgreSQL│  │   Redis    │  │  MSSQL (AWS)      │    │
│  │:5432     │  │   :6379    │  │  54.180.220.143   │    │
│  │(async)   │  │            │  │  (sync/pyodbc)    │    │
│  └──────────┘  └────────────┘  └───────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

#### 2.2.1 MSAL SSO Login Flow

```
User clicks "Microsoft 로그인"
  → MsalLoginButton calls instance.loginPopup(loginRequest)
  → Azure AD returns accessToken (RS256, signed by Microsoft)
  → Frontend stores accessToken in localStorage
  → Frontend calls GET /api/v1/auth/me (Bearer: msalToken)
  → Backend verify_msal_token():
      1. Extract kid from token header
      2. Fetch/cache Microsoft JWKS public keys
      3. Verify RS256 signature + audience + issuer
      4. Extract claims: oid, preferred_username, name
  → Backend lookup User by azure_oid
      → if not found: lookup by email → link azure_oid
      → if still not found: 403 "User not registered"
  → Return UserResponse (user_id, username, email, role_name)
  → Frontend updates AuthContext state
```

#### 2.2.2 JWT Login Flow (Dev/Test)

```
User submits username/password form
  → Frontend calls POST /api/v1/auth/login
  → Backend verifies SHA256(password) against hashed_password
  → Returns access_token (HS256) + refresh_token
  → Frontend stores tokens in localStorage
  → Subsequent requests use Bearer: jwtToken
```

#### 2.2.3 MSSQL Data Read Flow

```
Authenticated request → GET /api/v1/mssql/clients
  → get_current_user() verifies token (MSAL or JWT)
  → get_mssql_db() lazy-initializes MSSQL connection
  → Query legacy table via SQLAlchemy ORM (sync session)
  → Return JSON response
  → Session auto-closed by generator cleanup
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| MsalLoginButton | @azure/msal-react | React Hooks-safe MSAL popup login |
| AuthContext | authService | Token storage, state management |
| security.py | httpx, python-jose | JWKS fetch, RS256 verification |
| api/mssql.py | database.get_mssql_db | Legacy data access |
| models/mssql/ | database.MSSQLBase | ORM mapping to legacy tables |

---

## 3. Data Model

### 3.1 PostgreSQL Models (Existing + Modified)

#### User Model (Modified - azure_oid added)

```python
class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # NULL for MSAL-only users
    full_name = Column(String(200), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.role_id"), nullable=False)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    azure_oid = Column(String(100), unique=True, nullable=True, index=True)  # NEW in v2
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Migration Required**: Alembic migration to add `azure_oid` column.

### 3.2 MSSQL Legacy Models (NEW)

> Read-only ORM mappings against existing MSSQL tables in `UNI_DebitNote` database.
> These models do NOT have Alembic migrations — they reflect the existing schema.

#### 3.2.1 MssqlClient (거래처)

```python
# backend/app/models/mssql/client.py

class MssqlClient(MSSQLBase):
    __tablename__ = "T_Client"
    __table_args__ = {"schema": "dbo"}

    client_id = Column("ClientID", Integer, primary_key=True)
    client_code = Column("ClientCode", String(50))
    client_name = Column("ClientName", String(200))
    client_name_en = Column("ClientNameEN", String(200))
    country = Column("Country", String(100))
    address = Column("Address", String(500))
    contact_person = Column("ContactPerson", String(100))
    contact_email = Column("ContactEmail", String(200))
    contact_phone = Column("ContactPhone", String(50))
    is_active = Column("IsActive", Boolean, default=True)
    created_date = Column("CreatedDate", DateTime)
    updated_date = Column("UpdatedDate", DateTime)
```

#### 3.2.2 MssqlClearance (통관)

```python
# backend/app/models/mssql/clearance.py

class MssqlClearance(MSSQLBase):
    __tablename__ = "T_Clearance"
    __table_args__ = {"schema": "dbo"}

    clearance_id = Column("ClearanceID", Integer, primary_key=True)
    clearance_no = Column("ClearanceNo", String(50), unique=True)
    client_id = Column("ClientID", Integer)
    bl_no = Column("BLNo", String(50))
    vessel_name = Column("VesselName", String(200))
    port_of_loading = Column("PortOfLoading", String(100))
    port_of_discharge = Column("PortOfDischarge", String(100))
    eta_date = Column("ETADate", DateTime)
    clearance_date = Column("ClearanceDate", DateTime)
    status = Column("Status", String(50))
    total_amount = Column("TotalAmount", Numeric(18, 2))
    currency = Column("Currency", String(10))
    created_date = Column("CreatedDate", DateTime)
```

#### 3.2.3 MssqlShipment (선적)

```python
# backend/app/models/mssql/shipment.py

class MssqlShipment(MSSQLBase):
    __tablename__ = "T_Shipment"
    __table_args__ = {"schema": "dbo"}

    shipment_id = Column("ShipmentID", Integer, primary_key=True)
    shipment_no = Column("ShipmentNo", String(50))
    clearance_id = Column("ClearanceID", Integer)
    client_id = Column("ClientID", Integer)
    container_no = Column("ContainerNo", String(50))
    cargo_description = Column("CargoDescription", String(500))
    quantity = Column("Quantity", Integer)
    weight_kg = Column("WeightKG", Numeric(18, 3))
    cbm = Column("CBM", Numeric(18, 3))
    status = Column("Status", String(50))
    created_date = Column("CreatedDate", DateTime)
```

### 3.3 Entity Relationships

```
PostgreSQL (ERP):
[Role] 1 ──── N [User]
[User] 1 ──── N [DebitNote] (created_by)
[User] 1 ──── N [DebitNote] (approved_by)

MSSQL (Legacy, read-only):
[T_Client] 1 ──── N [T_Clearance]
[T_Clearance] 1 ──── N [T_Shipment]
[T_Client] 1 ──── N [T_Shipment]
```

---

## 4. API Specification

### 4.1 Existing Endpoints (No Changes)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/v1/auth/login | JWT 로그인 (dev/test) | No |
| POST | /api/v1/auth/refresh | JWT 토큰 갱신 | No |
| GET | /api/v1/auth/me | 현재 사용자 정보 | Required |
| GET | /api/v1/auth/config | 인증 설정 (MSAL 여부) | No |
| GET | /health | 서비스 상태 확인 | No |

### 4.2 New MSSQL Endpoints

#### `GET /api/v1/mssql/clients`

**Description**: 레거시 MSSQL 거래처 목록 조회

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| skip | int | 0 | 페이지 오프셋 |
| limit | int | 50 | 페이지 크기 (max: 200) |
| search | str | null | 이름/코드 검색 |
| active_only | bool | true | 활성 거래처만 |

**Response (200)**:
```json
{
  "total": 31,
  "items": [
    {
      "client_id": 1,
      "client_code": "NEXCON-001",
      "client_name": "넥스콘 물류",
      "client_name_en": "NEXCON Logistics",
      "country": "Korea",
      "contact_person": "김담당",
      "contact_email": "contact@nexcon.co.kr",
      "is_active": true
    }
  ]
}
```

**Auth**: Required (any authenticated user)

#### `GET /api/v1/mssql/clients/{client_id}`

**Description**: 거래처 상세 조회 (통관/선적 이력 포함)

**Response (200)**:
```json
{
  "client_id": 1,
  "client_code": "NEXCON-001",
  "client_name": "넥스콘 물류",
  "client_name_en": "NEXCON Logistics",
  "country": "Korea",
  "address": "서울시 강남구...",
  "contact_person": "김담당",
  "contact_email": "contact@nexcon.co.kr",
  "contact_phone": "02-1234-5678",
  "is_active": true,
  "recent_clearances": [
    {
      "clearance_id": 100,
      "clearance_no": "CLR-2026-001",
      "bl_no": "COSU123456",
      "status": "completed",
      "clearance_date": "2026-01-15"
    }
  ]
}
```

#### `GET /api/v1/mssql/clearance`

**Description**: 통관 목록 조회

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| skip | int | 0 | 페이지 오프셋 |
| limit | int | 50 | 페이지 크기 |
| client_id | int | null | 거래처 필터 |
| status | str | null | 상태 필터 |
| date_from | date | null | 시작일 필터 |
| date_to | date | null | 종료일 필터 |

**Response (200)**:
```json
{
  "total": 150,
  "items": [
    {
      "clearance_id": 100,
      "clearance_no": "CLR-2026-001",
      "client_id": 1,
      "client_name": "넥스콘 물류",
      "bl_no": "COSU123456",
      "vessel_name": "EVER GIVEN",
      "port_of_loading": "BUSAN",
      "port_of_discharge": "JAKARTA",
      "eta_date": "2026-01-20",
      "clearance_date": "2026-01-22",
      "status": "completed",
      "total_amount": 15000.00,
      "currency": "USD"
    }
  ]
}
```

#### `GET /api/v1/mssql/clearance/{clearance_id}`

**Description**: 통관 상세 조회 (선적 목록 포함)

#### `GET /api/v1/mssql/shipments`

**Description**: 선적 목록 조회

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| skip | int | 0 | 페이지 오프셋 |
| limit | int | 50 | 페이지 크기 |
| clearance_id | int | null | 통관 필터 |
| client_id | int | null | 거래처 필터 |

### 4.3 Error Response Format

```json
{
  "detail": "User-friendly error message"
}
```

| Code | Scenario | Detail |
|------|----------|--------|
| 401 | Token expired/invalid | "Could not validate credentials" |
| 403 | User not in ERP | "User {email} not registered in ERP. Contact admin." |
| 403 | Insufficient role | "Access denied. Required role: admin" |
| 500 | MSSQL connection failure | "Legacy database connection failed" |
| 503 | MSSQL unavailable | "Legacy database temporarily unavailable" |

---

## 5. UI/UX Design

### 5.1 LoginPage Refactoring

**Problem**: `LoginPage.tsx:18` — `useMsal()` 이 조건부로 호출되어 React Rules of Hooks 위반

**Solution**: MSAL 로그인 버튼을 별도 컴포넌트로 분리

```
LoginPage
├── MsalLoginButton (NEW component)
│   └── useMsal() — always called (hooks-safe)
│   └── Button "Microsoft 계정으로 로그인"
├── Divider "또는 개발자 로그인"
└── Form (username/password)
```

**File Structure**:
```
frontend/src/
├── components/
│   └── MsalLoginButton.tsx  (NEW)
├── pages/
│   └── LoginPage.tsx         (MODIFIED - remove useMsal, use MsalLoginButton)
```

#### MsalLoginButton Component Design

```typescript
// frontend/src/components/MsalLoginButton.tsx
// Only rendered when msalEnabled === true (parent checks)
// Safely calls useMsal() hook unconditionally inside component

interface Props {
  onSuccess: (accessToken: string) => void;
  onError: (error: Error) => void;
}

const MsalLoginButton: React.FC<Props> = ({ onSuccess, onError }) => {
  const { instance } = useMsal();  // Always called — hooks-safe
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await instance.loginPopup(loginRequest);
      if (result.accessToken) onSuccess(result.accessToken);
    } catch (err) {
      onError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="primary" icon={<WindowsOutlined />} loading={loading}
            onClick={handleClick} block size="large">
      Microsoft 계정으로 로그인
    </Button>
  );
};
```

### 5.2 AppLayout Logout Refactoring

**Problem**: `AppLayout.tsx:28-36` — dead dynamic import of `useMsal`

**Solution**: MSAL 로그아웃을 별도 유틸리티 함수로 분리

```typescript
// AppLayout.tsx handleLogout:
const handleLogout = async () => {
  if (msalEnabled && authService.getAuthMode() === 'msal') {
    try {
      const { PublicClientApplication } = await import('@azure/msal-browser');
      const { msalConfig } = await import('../msalConfig');
      const msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();
      await msalInstance.logoutPopup();
    } catch {}
  }
  logout();
  navigate('/login');
};
```

**Alternative (Recommended)**: MSAL instance를 App.tsx에서 Context로 공유하여 AppLayout에서 접근

### 5.3 User Flow

```
[MSAL Login]
  Landing → LoginPage → Click "Microsoft 로그인"
  → Azure AD Popup → Consent → Token → /me → Dashboard

[JWT Login]
  Landing → LoginPage → Enter username/password
  → /login → Token → Dashboard

[Logout]
  AppLayout → Click "로그아웃"
  → Clear localStorage → (MSAL: logoutPopup) → /login
```

---

## 6. Error Handling

### 6.1 Backend Error Handling

| Scenario | HTTP Code | Response | Recovery |
|----------|-----------|----------|----------|
| MSAL token invalid | 401 | "Invalid Microsoft token: {reason}" | Redirect to login |
| JWT token expired | 401 | "Could not validate credentials" | Auto-refresh or redirect |
| User not in ERP DB | 403 | "User {email} not registered" | Contact admin |
| MSSQL not configured | 503 | "Legacy database not configured" | Graceful skip |
| MSSQL connection timeout | 500 | "Legacy database connection failed" | Retry or skip |
| MSSQL query error | 500 | "Legacy data query failed" | Log + return partial |

### 6.2 Frontend Error Handling

| Scenario | Handling |
|----------|----------|
| MSAL popup blocked | Show message: "팝업을 허용해주세요" |
| MSAL user cancel | Silent return, no error message |
| 401 response | Auto-clear tokens, redirect to /login |
| 403 response | Show "권한이 없습니다" message |
| Network error | Show "서버 연결 실패" message |

---

## 7. Security Considerations

- [x] MSAL RS256 token verification via Microsoft JWKS public keys
- [x] JWT HS256 token signing with configurable secret
- [x] MSSQL credentials only in .env (never in source code)
- [x] CORS configuration in FastAPI
- [ ] **FIX**: JWT_SECRET_KEY default should warn in logs if not overridden
- [ ] **FIX**: SHA256 password hashing is weak — acceptable since production uses MSAL only
- [ ] **ADD**: Rate limiting on /api/v1/auth/login endpoint
- [ ] **ADD**: MSAL token audience validation (already done in security.py)
- [x] 401 interceptor clears all auth data from localStorage

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Unit Test | MSAL token verification (mock JWKS) | pytest + httpx mock |
| Unit Test | JWT create/verify | pytest |
| Unit Test | Password hashing comparison | pytest |
| Integration Test | /auth/login endpoint | pytest + httpx |
| Integration Test | /auth/me with MSAL token | pytest + mock |
| Integration Test | /mssql/* endpoints | pytest + MSSQL test DB |
| E2E Test | JWT login flow | Manual / Docker |
| E2E Test | MSAL login flow | Manual (requires Azure AD) |

### 8.2 Key Test Cases

- [ ] JWT login with valid credentials → 200 + token
- [ ] JWT login with wrong password → 401
- [ ] JWT login with inactive user → 403
- [ ] MSAL /me with valid Azure token → 200 + user info
- [ ] MSAL /me with expired token → 401
- [ ] MSAL /me with unregistered email → 403
- [ ] MSAL /me auto-links azure_oid on first login
- [ ] /mssql/clients returns paginated list (with MSSQL configured)
- [ ] /mssql/clients returns 503 when MSSQL not configured
- [ ] /health reports all 3 services status
- [ ] 401 response triggers frontend redirect to /login

---

## 9. Implementation Order

### Phase 1: Fix Critical Issues (Frontend)

| # | Task | File | Priority |
|---|------|------|----------|
| 1 | Create MsalLoginButton component | `components/MsalLoginButton.tsx` (NEW) | High |
| 2 | Refactor LoginPage to use MsalLoginButton | `pages/LoginPage.tsx` | High |
| 3 | Fix AppLayout MSAL logout | `components/AppLayout.tsx` | Medium |

### Phase 2: MSSQL Models (Backend)

| # | Task | File | Priority |
|---|------|------|----------|
| 4 | Create MSSQL model directory | `models/mssql/__init__.py` (NEW) | High |
| 5 | Define MssqlClient model | `models/mssql/client.py` (NEW) | High |
| 6 | Define MssqlClearance model | `models/mssql/clearance.py` (NEW) | High |
| 7 | Define MssqlShipment model | `models/mssql/shipment.py` (NEW) | High |

### Phase 3: MSSQL APIs (Backend)

| # | Task | File | Priority |
|---|------|------|----------|
| 8 | Create MSSQL router | `api/mssql.py` (NEW) | High |
| 9 | Implement GET /mssql/clients | `api/mssql.py` | High |
| 10 | Implement GET /mssql/clearance | `api/mssql.py` | High |
| 11 | Implement GET /mssql/shipments | `api/mssql.py` | Medium |
| 12 | Register router in main.py | `main.py` | High |
| 13 | Create Pydantic schemas | `schemas/mssql.py` (NEW) | High |

### Phase 4: Database Migration

| # | Task | File | Priority |
|---|------|------|----------|
| 14 | Initialize Alembic (if not done) | `alembic.ini`, `alembic/` | Medium |
| 15 | Create migration for azure_oid | `alembic/versions/*.py` | Medium |

### Phase 5: Documentation & Cleanup

| # | Task | File | Priority |
|---|------|------|----------|
| 16 | Create .env.example | `.env.example` (NEW) | Medium |
| 17 | Update README with v2 instructions | `README.md` | Low |

---

## 10. File Structure (New/Modified Files)

```
backend/
├── app/
│   ├── api/
│   │   ├── auth.py           # (existing, no changes)
│   │   ├── health.py         # (existing, no changes)
│   │   └── mssql.py          # NEW: MSSQL legacy data APIs
│   ├── models/
│   │   ├── user.py           # (existing, azure_oid already added)
│   │   └── mssql/            # NEW: Legacy table mappings
│   │       ├── __init__.py
│   │       ├── client.py     # T_Client model
│   │       ├── clearance.py  # T_Clearance model
│   │       └── shipment.py   # T_Shipment model
│   ├── schemas/
│   │   └── mssql.py          # NEW: Pydantic schemas for MSSQL
│   └── main.py               # MODIFIED: register mssql router
├── alembic/                   # NEW: migration directory
│   └── versions/
│       └── xxxx_add_azure_oid.py
└── alembic.ini                # NEW: Alembic config

frontend/
├── src/
│   ├── components/
│   │   ├── AppLayout.tsx      # MODIFIED: fix MSAL logout
│   │   └── MsalLoginButton.tsx # NEW: hooks-safe MSAL login
│   └── pages/
│       └── LoginPage.tsx      # MODIFIED: use MsalLoginButton

.env.example                   # NEW: environment variable documentation
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-11 | Initial design based on Plan analysis | CTO Lead |
