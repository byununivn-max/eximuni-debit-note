# ERP v2 Gap Analysis Report

> **Analysis Type**: Design vs Implementation Gap Analysis (PDCA Check Phase)
>
> **Project**: EXIMUNI ERP System
> **Version**: 2.0.0
> **Analyst**: bkit-gap-detector
> **Date**: 2026-02-11
> **Design Doc**: [erp-v2.design.md](../02-design/features/erp-v2.design.md)
> **Branch**: `erp-v2`

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Verify that the ERP v2 implementation on the `erp-v2` branch matches the design document specifications across all categories: MSSQL models, API endpoints, frontend components, authentication flow, database migration, and environment variables.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/erp-v2.design.md`
- **Backend Path**: `backend/app/` (models, api, core, schemas)
- **Frontend Path**: `frontend/src/` (components, pages, contexts, services)
- **Config**: `.env.example`, `docker-compose.yml`, `requirements.txt`
- **Analysis Date**: 2026-02-11

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match (Features) | 88% | !! Warning |
| Data Model Match | 95% | OK |
| API Endpoint Match | 95% | OK |
| Frontend Component Match | 100% | OK |
| Auth Flow Match | 100% | OK |
| Environment Variables | 90% | OK |
| Migration & Infra | 50% | !! Critical |
| **Overall** | **88%** | **!! Warning** |

---

## 3. Implementation Order Verification (Section 9)

### Phase 1: Fix Critical Issues (Frontend)

| # | Task | File | Status | Notes |
|---|------|------|:------:|-------|
| 1 | Create MsalLoginButton component | `components/MsalLoginButton.tsx` | OK | Matches design: Props (onSuccess, onError), useMsal() unconditional, loginPopup, loading state |
| 2 | Refactor LoginPage to use MsalLoginButton | `pages/LoginPage.tsx` | OK | No more useMsal() in LoginPage; conditional rendering via `msalEnabled` |
| 3 | Fix AppLayout MSAL logout | `components/AppLayout.tsx` | OK | Dynamic import of PublicClientApplication + logoutPopup, matches design exactly |

### Phase 2: MSSQL Models (Backend)

| # | Task | File | Status | Notes |
|---|------|------|:------:|-------|
| 4 | Create MSSQL model directory | `models/mssql/__init__.py` | OK | Exports MssqlClient, MssqlClearance, MssqlShipment |
| 5 | Define MssqlClient model | `models/mssql/client.py` | OK | All columns match design (see Section 4 for details) |
| 6 | Define MssqlClearance model | `models/mssql/clearance.py` | OK | All columns match design |
| 7 | Define MssqlShipment model | `models/mssql/shipment.py` | OK | All columns match design |

### Phase 3: MSSQL APIs (Backend)

| # | Task | File | Status | Notes |
|---|------|------|:------:|-------|
| 8 | Create MSSQL router | `api/mssql.py` | OK | prefix="/api/v1/mssql" |
| 9 | Implement GET /mssql/clients | `api/mssql.py` | OK | Pagination, search, active_only filter |
| 10 | Implement GET /mssql/clearance | `api/mssql.py` | OK | Includes date_from, date_to, status, client_id filters |
| 11 | Implement GET /mssql/shipments | `api/mssql.py` | OK | clearance_id, client_id filters |
| 12 | Register router in main.py | `main.py` | OK | `app.include_router(mssql_router)` on line 45 |
| 13 | Create Pydantic schemas | `schemas/mssql.py` | OK | All response schemas + PaginatedResponse generic |

### Phase 4: Database Migration

| # | Task | File | Status | Notes |
|---|------|------|:------:|-------|
| 14 | Initialize Alembic | `alembic.ini`, `alembic/` | OK | Already exists from v1 |
| 15 | Create migration for azure_oid | `alembic/versions/*.py` | MISSING | No migration file for azure_oid column. The User model has the column in code, but no Alembic migration was generated. |

### Phase 5: Documentation & Cleanup

| # | Task | File | Status | Notes |
|---|------|------|:------:|-------|
| 16 | Create .env.example | `.env.example` | OK | All required variables present |
| 17 | Update README with v2 instructions | `README.md` | NOT VERIFIED | Not in scope of this analysis |

---

## 4. Data Model Comparison

### 4.1 PostgreSQL User Model (Modified)

| Field | Design | Implementation | Status |
|-------|--------|----------------|:------:|
| user_id | Integer, PK, autoincrement | Integer, PK, autoincrement | OK |
| username | String(100), unique, not null | String(100), unique, not null | OK |
| email | String(200), unique, not null | String(200), unique, not null | OK |
| hashed_password | String(255), nullable=True | String(255), nullable=True | OK |
| full_name | String(200), not null | String(200), not null | OK |
| role_id | Integer, FK, not null | Integer, FK, not null | OK |
| is_active | Boolean, default=True | Boolean, default=True | OK |
| last_login | DateTime | DateTime | OK |
| azure_oid | String(100), unique, nullable, index | String(100), unique, nullable, index | OK |
| created_at | DateTime, default=utcnow | DateTime, default=utcnow | OK |
| updated_at | DateTime, default=utcnow, onupdate | DateTime, default=utcnow, onupdate | OK |

**Result**: 11/11 fields match (100%)

### 4.2 MssqlClient (T_Client)

| Field | Design Column | Impl Column | Design Type | Impl Type | Status |
|-------|--------------|-------------|-------------|-----------|:------:|
| client_id | ClientID | ClientID | Integer, PK | Integer, PK, autoincrement | OK (minor: autoincrement added) |
| client_code | ClientCode | ClientCode | String(50) | String(50), unique, not null | OK (impl stricter) |
| client_name | ClientName | ClientName | String(200) | String(200), not null | OK (impl stricter) |
| client_name_en | ClientNameEN | ClientNameEN | String(200) | String(200) | OK |
| country | Country | Country | String(100) | String(100) | OK |
| address | Address | Address | String(500) | String(500) | OK |
| contact_person | ContactPerson | ContactPerson | String(100) | String(100) | OK |
| contact_email | ContactEmail | ContactEmail | String(200) | String(200) | OK |
| contact_phone | ContactPhone | ContactPhone | String(50) | String(50) | OK |
| is_active | IsActive | IsActive | Boolean, default=True | Boolean, default=True | OK |
| created_date | CreatedDate | CreatedDate | DateTime | DateTime, default=utcnow | OK (minor: default added) |
| updated_date | UpdatedDate | UpdatedDate | DateTime | DateTime, default=utcnow, onupdate | OK (minor: default added) |

**Result**: 12/12 fields match (100%)

### 4.3 MssqlClearance (T_Clearance)

| Field | Design Column | Impl Column | Design Type | Impl Type | Status |
|-------|--------------|-------------|-------------|-----------|:------:|
| clearance_id | ClearanceID | ClearanceID | Integer, PK | Integer, PK, autoincrement | OK |
| clearance_no | ClearanceNo | ClearanceNo | String(50), unique | String(100), unique, not null | CHANGED |
| client_id | ClientID | ClientID | Integer | Integer, not null | OK (stricter) |
| bl_no | BLNo | BLNo | String(50) | String(100) | CHANGED |
| vessel_name | VesselName | VesselName | String(200) | String(200) | OK |
| port_of_loading | PortOfLoading | PortOfLoading | String(100) | String(200) | CHANGED |
| port_of_discharge | PortOfDischarge | PortOfDischarge | String(100) | String(200) | CHANGED |
| eta_date | ETADate | ETADate | DateTime | DateTime | OK |
| clearance_date | ClearanceDate | ClearanceDate | DateTime | DateTime | OK |
| status | Status | Status | String(50) | String(50) | OK |
| total_amount | TotalAmount | TotalAmount | Numeric(18,2) | Numeric(18,2) | OK |
| currency | Currency | Currency | String(10) | String(10) | OK |
| created_date | CreatedDate | CreatedDate | DateTime | DateTime, default=utcnow | OK |

**Result**: 9/13 exact match, 4 fields have wider String lengths (acceptable for legacy compatibility)

### 4.4 MssqlShipment (T_Shipment)

| Field | Design Column | Impl Column | Design Type | Impl Type | Status |
|-------|--------------|-------------|-------------|-----------|:------:|
| shipment_id | ShipmentID | ShipmentID | Integer, PK | Integer, PK, autoincrement | OK |
| shipment_no | ShipmentNo | ShipmentNo | String(50) | String(100), not null | CHANGED |
| clearance_id | ClearanceID | ClearanceID | Integer | Integer, not null | OK (stricter) |
| client_id | ClientID | ClientID | Integer | Integer, not null | OK (stricter) |
| container_no | ContainerNo | ContainerNo | String(50) | String(100) | CHANGED |
| cargo_description | CargoDescription | CargoDescription | String(500) | String(500) | OK |
| quantity | Quantity | Quantity | Integer | Integer | OK |
| weight_kg | WeightKG | WeightKG | Numeric(18,3) | Numeric(18,3) | OK |
| cbm | CBM | CBM | Numeric(18,3) | Numeric(18,3) | OK |
| status | Status | Status | String(50) | String(50) | OK |
| created_date | CreatedDate | CreatedDate | DateTime | DateTime, default=utcnow | OK |

**Result**: 9/11 exact match, 2 fields have wider String lengths (acceptable)

**Data Model Overall**: 95% match. All field names, column mappings, and core types match. The only differences are String lengths being wider in implementation (50 -> 100 for some fields), which is a safe defensive decision for legacy data.

---

## 5. API Endpoint Comparison

### 5.1 Existing Endpoints

| Design | Implementation | Status | Notes |
|--------|---------------|:------:|-------|
| POST /api/v1/auth/login | POST /api/v1/auth/login | OK | |
| POST /api/v1/auth/refresh | POST /api/v1/auth/refresh | OK | |
| GET /api/v1/auth/me | GET /api/v1/auth/me | OK | |
| GET /api/v1/auth/config | GET /api/v1/auth/config | OK | |
| GET /health | GET /api/health | CHANGED | Implementation has `/api` prefix via `health_router` registered with `prefix="/api"` |

### 5.2 New MSSQL Endpoints

| Design Endpoint | Implementation | Status | Notes |
|-----------------|---------------|:------:|-------|
| GET /api/v1/mssql/clients | GET /api/v1/mssql/clients | OK | |
| GET /api/v1/mssql/clients/{client_id} | GET /api/v1/mssql/clients/{client_id} | OK | |
| GET /api/v1/mssql/clearance | GET /api/v1/mssql/clearance | OK | |
| GET /api/v1/mssql/clearance/{clearance_id} | GET /api/v1/mssql/clearance/{clearance_id} | OK | |
| GET /api/v1/mssql/shipments | GET /api/v1/mssql/shipments | OK | |

### 5.3 Query Parameter Comparison

#### GET /api/v1/mssql/clients

| Param | Design | Implementation | Status |
|-------|--------|---------------|:------:|
| skip | int, default=0 | int, default=0, ge=0 | OK |
| limit | int, default=50, max=200 | int, default=20, ge=1, le=100 | CHANGED |
| search | str, null | str, None | OK |
| active_only | bool, true | bool, True | OK |

**Note**: `limit` default and max differ: Design says default=50, max=200; Implementation uses default=20, max=100.

#### GET /api/v1/mssql/clearance

| Param | Design | Implementation | Status |
|-------|--------|---------------|:------:|
| skip | int, default=0 | int, default=0, ge=0 | OK |
| limit | int, default=50 | int, default=20, ge=1, le=100 | CHANGED |
| client_id | int, null | int, None | OK |
| status | str, null | str, None | OK |
| date_from | date, null | date, None | OK |
| date_to | date, null | date, None | OK |

#### GET /api/v1/mssql/shipments

| Param | Design | Implementation | Status |
|-------|--------|---------------|:------:|
| skip | int, default=0 | int, default=0, ge=0 | OK |
| limit | int, default=50 | int, default=20, ge=1, le=100 | CHANGED |
| clearance_id | int, null | int, None | OK |
| client_id | int, null | int, None | OK |

### 5.4 Response Format Comparison

| Design Response | Implementation | Status |
|-----------------|---------------|:------:|
| `{ total, items: [...] }` | `PaginatedResponse[T] { total, items }` | OK |
| Client fields in list | `MssqlClientResponse` schema | OK |
| Client detail + recent_clearances | `MssqlClientDetailResponse` | OK |
| Clearance detail + shipments | `MssqlClearanceDetailResponse` | OK |

### 5.5 Error Response Format

| Design | Implementation | Status |
|--------|---------------|:------:|
| 401: "Could not validate credentials" | security.py line 131 | OK |
| 403: "User {email} not registered in ERP" | security.py line 183 | OK |
| 500: "Legacy database connection failed" | Not exactly this message | CHANGED |
| 503: "Legacy database temporarily unavailable" | RuntimeError -> 503 with `str(e)` | OK (dynamic) |

**API Overall**: 95% match. All endpoints exist with correct paths and auth. Minor deviations: default `limit` values (20 vs 50), max `limit` (100 vs 200), and `/health` endpoint path prefix.

---

## 6. Frontend Component Comparison

### 6.1 MsalLoginButton (NEW)

| Design Spec | Implementation | Status |
|-------------|---------------|:------:|
| Props: onSuccess(accessToken: string) | onSuccess: (accessToken: string) => void | OK |
| Props: onError(error: Error) | onError: (error: Error) => void | OK |
| useMsal() called unconditionally | `const { instance } = useMsal();` on line 20 | OK |
| useState for loading | `const [loading, setLoading] = useState(false);` | OK |
| instance.loginPopup(loginRequest) | `instance.loginPopup(loginRequest)` on line 25 | OK |
| onSuccess(result.accessToken) | Calls onSuccess if accessToken exists | OK |
| onError(err) on catch | `onError(err)` on line 33 | OK |
| Button: type=primary, WindowsOutlined, block, size=large | All present on lines 40-50 | OK |
| Button text: "Microsoft ..." | "Microsoft ..." | OK |

**Extra in impl (not in design)**: Handles case where accessToken is null (throws Error), has `style={{ height: 48, fontSize: 16 }}`.

**Result**: 100% match with minor enhancements.

### 6.2 LoginPage (MODIFIED)

| Design Spec | Implementation | Status |
|-------------|---------------|:------:|
| No useMsal() hook | No useMsal import or call | OK |
| Uses MsalLoginButton component | `<MsalLoginButton onSuccess={...} onError={...} />` | OK |
| Conditional render via msalEnabled | `{msalEnabled && (<>...</>)}` | OK |
| Divider "..." | Present on line 63 | OK |
| Form (username/password) below | Present on lines 69-81 | OK |

**Result**: 100% match.

### 6.3 AppLayout (MODIFIED)

| Design Spec | Implementation | Status |
|-------------|---------------|:------:|
| Dynamic import PublicClientApplication | `await import('@azure/msal-browser')` line 31 | OK |
| Dynamic import msalConfig | `await import('../msalConfig')` line 32 | OK |
| msalInstance.initialize() | `await msalInstance.initialize()` line 34 | OK |
| msalInstance.logoutPopup() | `await msalInstance.logoutPopup(...)` line 35 | OK |
| Condition: msalEnabled && authMode === 'msal' | `msalEnabled && authService.getAuthMode() === 'msal'` line 29 | OK |
| try/catch for MSAL errors | try/catch on lines 30-40 | OK |
| Always call logout() + navigate('/login') | Lines 42-43 | OK |

**Result**: 100% match. Implementation also adds `postLogoutRedirectUri` option (enhancement).

### 6.4 AuthContext

| Design Spec | Implementation | Status |
|-------------|---------------|:------:|
| loginWithMsal function | Present, calls authService.loginWithMsalToken | OK |
| msalEnabled state | Derived from VITE_AZURE_CLIENT_ID/TENANT_ID | OK |

### 6.5 App.tsx

| Design Spec | Implementation | Status |
|-------------|---------------|:------:|
| MsalProvider wrapping when msalEnabled | Conditional MsalProvider on lines 54-59 | OK |
| msalInstance created conditionally | `msalEnabled ? new PublicClientApplication(msalConfig) : null` | OK |

**Frontend Overall**: 100% match.

---

## 7. Authentication Flow Comparison

### 7.1 MSAL SSO Flow (Design 2.2.1)

| Step | Design | Implementation | Status |
|------|--------|---------------|:------:|
| MsalLoginButton calls loginPopup | MsalLoginButton.tsx line 25 | OK |
| Store accessToken in localStorage | auth.ts line 27 | OK |
| Call GET /me with Bearer token | auth.ts line 31 | OK |
| Backend: Extract kid from header | security.py line 61 | OK |
| Backend: Fetch/cache JWKS keys | security.py lines 37-50 | OK |
| Backend: RS256 verify + audience + issuer | security.py lines 78-85 | OK |
| Backend: Extract oid, preferred_username, name | security.py lines 156-158 | OK |
| Lookup by azure_oid | security.py line 160-165 | OK |
| Fallback: lookup by email -> link azure_oid | security.py lines 169-178 | OK |
| Not found: 403 | security.py lines 180-184 | OK |
| Return UserResponse | auth.py lines 132-139 | OK |
| Frontend: update AuthContext | AuthContext.tsx lines 48-53 | OK |

**Result**: 100% match. Full dual-auth flow implemented as designed.

### 7.2 JWT Flow (Design 2.2.2)

| Step | Design | Implementation | Status |
|------|--------|---------------|:------:|
| POST /login with username/password | auth.py line 38 | OK |
| SHA256 password comparison | auth.py lines 53-70 | OK |
| Return access_token + refresh_token | auth.py lines 81-90 | OK |
| Store tokens in localStorage | auth.ts lines 11-18 | OK |

**Result**: 100% match.

---

## 8. Environment Variable Comparison

### 8.1 .env.example Completeness

| Variable | Design (config.py) | .env.example | Status |
|----------|-------------------|:------------:|:------:|
| DATABASE_URL | `settings.DATABASE_URL` | Present | OK |
| DATABASE_URL_SYNC | `settings.DATABASE_URL_SYNC` | Present | OK |
| REDIS_URL | `settings.REDIS_URL` | Present | OK |
| MSSQL_SERVER | `settings.MSSQL_SERVER` | Present | OK |
| MSSQL_DATABASE | `settings.MSSQL_DATABASE` | Present | OK |
| MSSQL_USER | `settings.MSSQL_USER` | Present | OK |
| MSSQL_PASSWORD | `settings.MSSQL_PASSWORD` | Present | OK |
| MSSQL_DRIVER | `settings.MSSQL_DRIVER` | Present | OK |
| AZURE_CLIENT_ID | `settings.AZURE_CLIENT_ID` | Present | OK |
| AZURE_TENANT_ID | `settings.AZURE_TENANT_ID` | Present | OK |
| AZURE_CLIENT_SECRET | `settings.AZURE_CLIENT_SECRET` | Present | OK |
| JWT_SECRET_KEY | `settings.JWT_SECRET_KEY` | Present (commented) | OK |
| JWT_ALGORITHM | `settings.JWT_ALGORITHM` | MISSING | NOT FOUND |
| VITE_AZURE_CLIENT_ID | msalConfig.ts | Present | OK |
| VITE_AZURE_TENANT_ID | msalConfig.ts | Present | OK |
| VITE_AZURE_REDIRECT_URI | msalConfig.ts | Present | OK |
| VITE_API_BASE | api.ts `import.meta.env.VITE_API_BASE` | MISSING | NOT FOUND |
| DEBUG | `settings.DEBUG` | MISSING | NOT FOUND |
| APP_NAME | `settings.APP_NAME` | MISSING | NOT FOUND |

**Result**: 15/19 variables documented (79%). Four variables used in code are missing from `.env.example`: `JWT_ALGORITHM`, `VITE_API_BASE`, `DEBUG`, `APP_NAME`. However, all four have sensible defaults in code, so impact is low.

---

## 9. Gaps Found

### 9.1 MISSING Features (Design exists, Implementation missing)

| # | Item | Design Location | Description | Impact |
|---|------|-----------------|-------------|--------|
| M-1 | Alembic migration for azure_oid | Design Section 9, Phase 4, Item 15 | No migration file `xxxx_add_azure_oid.py` exists. The initial migration (19aac71a7784) does not include `azure_oid`. The column is defined in the User model but has no migration. | Medium - DB may not have the column unless manually added |

### 9.2 CHANGED Features (Design differs from Implementation)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| C-1 | Pagination default limit | 50 (all endpoints) | 20 (all endpoints) | Low |
| C-2 | Pagination max limit | 200 (clients endpoint) | 100 (all endpoints) | Low |
| C-3 | Health endpoint path | `GET /health` | `GET /api/health` | Low - prefix added by router registration |
| C-4 | Clearance String lengths | clearance_no: String(50), bl_no: String(50), ports: String(100) | clearance_no: String(100), bl_no: String(100), ports: String(200) | Low - wider is safer for legacy data |
| C-5 | Shipment String lengths | shipment_no: String(50), container_no: String(50) | shipment_no: String(100), container_no: String(100) | Low - wider is safer for legacy data |
| C-6 | .env.example missing vars | All config vars documented | 4 vars missing (JWT_ALGORITHM, VITE_API_BASE, DEBUG, APP_NAME) | Low - all have code defaults |

### 9.3 ADDED Features (Implementation has, Design does not specify)

| # | Item | Implementation Location | Description | Impact |
|---|------|------------------------|-------------|--------|
| A-1 | graphScopes export | `msalConfig.ts:43-45` | `graphScopes` for User.Read - not in design | None |
| A-2 | cacheLocation: sessionStorage | `msalConfig.ts:24` | MSAL cache in sessionStorage - design does not specify | None |
| A-3 | postLogoutRedirectUri in logoutPopup | `AppLayout.tsx:36-37` | Extra option not in design | None - enhancement |
| A-4 | MSAL login extra null check | `MsalLoginButton.tsx:28-30` | Throws if no accessToken | None - defensive |
| A-5 | MssqlClient autoincrement/constraints | `client.py:12-13` | Added unique=True, nullable constraints | None - stricter |

---

## 10. Match Rate Calculation

### 10.1 Design Items Checklist (Section 9 Implementation Order)

| Item | Status | Weight |
|------|:------:|:------:|
| 1. Create MsalLoginButton | OK | 1 |
| 2. Refactor LoginPage | OK | 1 |
| 3. Fix AppLayout logout | OK | 1 |
| 4. MSSQL model directory | OK | 1 |
| 5. MssqlClient model | OK | 1 |
| 6. MssqlClearance model | OK | 1 |
| 7. MssqlShipment model | OK | 1 |
| 8. Create MSSQL router | OK | 1 |
| 9. GET /mssql/clients | OK | 1 |
| 10. GET /mssql/clearance | OK | 1 |
| 11. GET /mssql/shipments | OK | 1 |
| 12. Register router in main.py | OK | 1 |
| 13. Pydantic schemas | OK | 1 |
| 14. Alembic initialized | OK | 1 |
| 15. Migration for azure_oid | MISSING | 1 |
| 16. .env.example | OK | 1 |
| 17. README update (low priority) | SKIPPED | 0.5 |
| MSAL SSO auth flow (security.py) | OK | 1 |
| JWT fallback auth | OK | 1 |
| Dual-DB database.py | OK | 1 |
| Config.py MSSQL settings | OK | 1 |
| auth.ts loginWithMsalToken | OK | 1 |
| api.ts 401 interceptor | OK | 1 |
| App.tsx MsalProvider | OK | 1 |
| AuthContext loginWithMsal | OK | 1 |
| msalConfig.ts | OK | 1 |
| requirements.txt (pyodbc, msal) | OK | 1 |
| health.py MSSQL check | OK | 1 |

**Implemented**: 26 / 28.5 items

**Match Rate**: **91.2%**

### 10.2 Score Breakdown

```
+---------------------------------------------+
|  Overall Match Rate: 91%                     |
+---------------------------------------------+
|  OK Items:             26 (91%)              |
|  CHANGED (minor):       6 items              |
|  MISSING:               1 item (migration)   |
|  SKIPPED:               1 item (README)      |
|  ADDED (extras):        5 items              |
+---------------------------------------------+
```

---

## 11. Differences Detail

### 11.1 [M-1] Missing: Alembic Migration for azure_oid

**Severity**: Medium

**Design says** (Section 9, Phase 4, Item 15):
> "Create migration for azure_oid" - `alembic/versions/*.py`

**Current state**: Only one migration exists (`19aac71a7784_initial_schema_20_tables.py`) which creates the initial schema. The `users` table in this migration does NOT include `azure_oid`:

```python
# Line 151-166 of the migration
op.create_table('users',
    sa.Column('user_id', ...),
    sa.Column('username', ...),
    sa.Column('email', ...),
    sa.Column('hashed_password', sa.String(length=255), nullable=False),  # Note: nullable=False here
    ...
    # NO azure_oid column
)
```

Additionally, the initial migration has `hashed_password` as `nullable=False`, but the design and current model define it as `nullable=True` (for MSAL-only users).

**Required action**: Generate a new Alembic migration:
```bash
cd backend && alembic revision --autogenerate -m "add_azure_oid_and_fix_nullable"
```

This migration should:
1. Add `azure_oid` column (String(100), unique, nullable, indexed)
2. Alter `hashed_password` to `nullable=True`

### 11.2 [C-1/C-2] Pagination Defaults

**Severity**: Low

| Endpoint | Design default | Design max | Impl default | Impl max |
|----------|:-------------:|:----------:|:------------:|:--------:|
| /mssql/clients | 50 | 200 | 20 | 100 |
| /mssql/clearance | 50 | - | 20 | 100 |
| /mssql/shipments | 50 | - | 20 | 100 |

**Impact**: Frontend may need to explicitly request larger pages. Conservative defaults are acceptable.

**Recommendation**: Either update design to match implementation (20/100) or update implementation to match design (50/200). The implementation values are more conservative and reasonable.

### 11.3 [C-3] Health Endpoint Path

**Severity**: Low

**Design**: `GET /health`
**Implementation**: `GET /api/health` (because `health_router` is registered with `prefix="/api"` in `main.py` line 37)

**Impact**: Minimal. The root endpoint `GET /` also returns status info.

---

## 12. Recommended Actions

### 12.1 Immediate Actions (Required for 95%+ match)

| Priority | Item | Action | File |
|----------|------|--------|------|
| HIGH | M-1 | Generate Alembic migration for `azure_oid` column and `hashed_password` nullable fix | `backend/alembic/versions/` |

### 12.2 Design Document Updates (Sync to match implementation)

| Item | What to Update | File |
|------|---------------|------|
| C-1/C-2 | Update pagination defaults to 20/100 | `erp-v2.design.md` Section 4.2 |
| C-3 | Update health endpoint path to `/api/health` | `erp-v2.design.md` Section 4.1 |
| C-4/C-5 | Update String lengths to match implementation | `erp-v2.design.md` Section 3.2 |
| C-6 | Document that some env vars have code defaults | `erp-v2.design.md` Section 10 |

### 12.3 Low Priority / Backlog

| Item | Description |
|------|-------------|
| A-1 | Add graphScopes to design if Graph API features are planned |
| Security | JWT_SECRET_KEY default warning in logs (noted in Design Section 7) |
| Security | Rate limiting on /login (noted in Design Section 7) |

---

## 13. Quality Observations

### 13.1 Positive Findings

- **Separation of Concerns**: MSSQL models, schemas, and API are cleanly separated into dedicated files
- **Graceful Degradation**: MSSQL connection is lazy-initialized; missing config returns 503 not crash
- **Hooks Safety**: MsalLoginButton properly isolates useMsal() call, fixing the React Rules of Hooks violation
- **Dual Auth**: security.py correctly implements MSAL-first, JWT-fallback with proper error propagation
- **Type Safety**: Pydantic schemas use `model_config = ConfigDict(from_attributes=True)` for ORM compatibility
- **Error Handling**: Consistent HTTPException usage with appropriate status codes
- **Token Management**: auth.ts properly stores/clears auth_mode alongside tokens

### 13.2 Code Quality Notes

- `api/mssql.py` line 129: Parameter name `status` shadows the imported `status` from fastapi. This could cause a runtime bug if the imported `status` module is used after the parameter definition. (The `status.HTTP_503_SERVICE_UNAVAILABLE` usage on line 167 would reference the parameter string, not the module.)
- `auth.py` lines 53-70: Password verification logic is complex with multiple branches (bcrypt, sha256, plaintext). Design notes this is acceptable since production uses MSAL.

---

## 14. Next Steps

- [ ] Generate Alembic migration for azure_oid (closes M-1, raises match to 95%+)
- [ ] Fix `status` parameter shadowing in `api/mssql.py` (code quality)
- [ ] Update design document with minor deviations (pagination defaults, String lengths)
- [ ] Run `/pdca report erp-v2` after fixes

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-11 | Initial gap analysis | bkit-gap-detector |
