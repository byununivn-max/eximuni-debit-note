# ERP v2 Planning Document

> **Summary**: Upgrade EXIMUNI Debit Note System with Dual-DB (PostgreSQL + MSSQL), Microsoft MSAL SSO authentication, and ERP infrastructure hardening.
>
> **Project**: EXIMUNI ERP System
> **Version**: 2.0.0
> **Author**: CTO Lead (PDCA Team Mode)
> **Date**: 2026-02-11
> **Status**: In Progress (Partial Implementation)

---

## 1. Overview

### 1.1 Purpose

Transform the EXIMUNI Debit Note system from a single-database JWT-only application
into a production-grade ERP system that:

1. Connects to the existing MSSQL operational database (AWS `54.180.220.143/UNI_DebitNote`) for legacy data while maintaining PostgreSQL for new ERP tables.
2. Adds Microsoft Azure AD SSO (MSAL) as the primary authentication mechanism for production, with JWT fallback for development/testing.
3. Strengthens the infrastructure with ODBC driver support, dual-DB health checks, and proper Docker configuration.

### 1.2 Background

- The v1 system uses a single PostgreSQL database and simple JWT authentication.
- The operations team already uses Microsoft 365 and needs SSO integration.
- Existing operational data (clients, clearance records) resides in a MSSQL server on AWS.
- The system must read/write to this MSSQL instance alongside the new PostgreSQL tables.
- Docker images need ODBC Driver 18 for SQL Server installed to communicate with MSSQL.

### 1.3 Related Documents

- Requirements: `docs/EXIMUNI_DebitNote_시스템설계서_v1.0.docx`
- NEXCON spec: `docs/NEXCON_기술사양서_v1.0.docx`
- Client comparison: `docs/EXIMUNI_거래처_비교표_31사.xlsx`

---

## 2. Scope

### 2.1 In Scope

- [x] Dual-DB architecture (PostgreSQL async + MSSQL sync)
- [x] Microsoft MSAL SSO authentication (backend token verification)
- [x] Microsoft MSAL SSO frontend (MsalProvider, popup login)
- [x] Dual auth middleware (MSAL first, JWT fallback)
- [x] Health check endpoint with Redis + PostgreSQL + MSSQL status
- [x] User model: `azure_oid` field for AD mapping
- [x] Seed data: SHA256 password hashing (replaces bcrypt)
- [x] Docker: ODBC Driver 18 for SQL Server in Dockerfile
- [x] docker-compose: MSSQL + Azure AD environment variables
- [x] Frontend: `@azure/msal-browser` + `@azure/msal-react` dependencies
- [x] Frontend: `msalConfig.ts` with conditional enablement
- [x] Frontend: Dual login UI (Microsoft SSO button + username/password form)
- [x] Frontend: AuthContext with `loginWithMsal()` method
- [x] Frontend: auth service with MSAL token relay to backend `/me` endpoint
- [ ] MSSQL model definitions for legacy tables (clients, clearance, shipment)
- [ ] MSSQL data sync/read APIs
- [ ] Integration tests for dual-auth flow
- [ ] Integration tests for MSSQL connectivity
- [ ] MSAL logout flow (frontend session cleanup)
- [ ] User auto-provisioning from Azure AD (new users not in DB)
- [ ] Role mapping from Azure AD groups to ERP roles
- [ ] Environment variable documentation (.env.example)
- [ ] Alembic migration for `azure_oid` column

### 2.2 Out of Scope

- Azure AD app registration (admin-side Azure Portal setup)
- MSSQL schema modifications (read-only against existing structure)
- Kubernetes/Terraform infrastructure (remains Docker Compose for now)
- CI/CD pipeline changes
- Performance load testing
- Multi-tenant Azure AD support

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Dual-DB: PostgreSQL (new ERP) + MSSQL (legacy ops) | High | Done |
| FR-02 | MSAL SSO: Backend token verification via JWKS | High | Done |
| FR-03 | MSAL SSO: Frontend popup login with MsalProvider | High | Done |
| FR-04 | Dual auth: MSAL-first with JWT fallback | High | Done |
| FR-05 | Azure OID user mapping (existing users) | High | Done |
| FR-06 | Health endpoint: Redis + PG + MSSQL status | Medium | Done |
| FR-07 | MSSQL legacy table models (read access) | High | Pending |
| FR-08 | MSSQL data APIs (clients, clearance lookup) | High | Pending |
| FR-09 | Dual-auth integration tests | Medium | Pending |
| FR-10 | MSSQL connectivity tests | Medium | Pending |
| FR-11 | MSAL logout cleanup (frontend + backend) | Medium | Partial |
| FR-12 | Azure AD role-to-ERP role mapping | Low | Pending |
| FR-13 | Alembic migration for azure_oid | Medium | Pending |
| FR-14 | Environment variable docs (.env.example) | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | MSAL token verification < 500ms (JWKS cached 1hr) | Backend logging |
| Performance | MSSQL query response < 1s for standard lookups | Health endpoint timing |
| Security | Azure AD tokens verified via RS256 + JWKS | jose library validation |
| Security | JWT secret not hardcoded in production | Environment variable check |
| Security | MSSQL credentials never in source code | .env file only |
| Reliability | Graceful fallback when MSSQL unavailable | Health endpoint status |
| Reliability | Graceful fallback when Azure AD unavailable | JWT auth fallback |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] Dual-DB engine initialization (PG async + MSSQL sync)
- [x] MSAL token verification with JWKS caching
- [x] Frontend dual-login UI operational
- [x] Auth middleware supports both MSAL and JWT
- [ ] MSSQL legacy models defined and queryable
- [ ] All existing v1 features still work (regression-free)
- [ ] Integration tests for auth flows pass
- [ ] .env.example documents all new environment variables
- [ ] Alembic migration for `azure_oid` created and tested

### 4.2 Quality Criteria

- [ ] Test coverage above 80% for new auth module
- [ ] Zero lint errors (backend: ruff/flake8, frontend: eslint)
- [ ] Docker build succeeds (including ODBC driver)
- [ ] Health endpoint returns all services status correctly

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| MSSQL ODBC driver fails on arm64 (Apple Silicon) | High | Medium | Provide x86 fallback Dockerfile; test on CI Linux |
| Azure AD tenant not configured for testing | High | High | JWT fallback ensures dev/test works without Azure |
| JWKS endpoint downtime causes auth failure | Medium | Low | 1-hour cache; retry with cache invalidation |
| Password stored as SHA256 (weak for production) | Medium | Low | Production uses MSAL only; SHA256 is dev-only |
| MSSQL connection pool exhaustion | Medium | Low | Pool size=5, max_overflow=10, pool_pre_ping=True |
| LoginPage uses conditional hook call (useMsal) | Medium | Medium | Refactor to avoid rules-of-hooks violation |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites, portfolios | |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend, SaaS MVPs | X |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | |

Rationale: Dynamic level is appropriate. The project has a single FastAPI backend
(not microservices), Docker Compose for local development, and a React frontend.
The dual-DB and MSAL additions add complexity but do not warrant Enterprise-level
infrastructure (no Kubernetes, no Terraform, no service mesh).

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Frontend Framework | Next.js / React+Vite | React+Vite | Existing stack, SPA is sufficient |
| UI Library | Ant Design / MUI | Ant Design (antd 5) | Already integrated v1 |
| Auth (Production) | MSAL SSO / Keycloak / Auth0 | MSAL SSO | Company uses Microsoft 365 |
| Auth (Dev/Test) | JWT / Basic Auth | JWT (HS256) | Existing v1 compatibility |
| Backend DB (New) | PostgreSQL (async) | PostgreSQL + asyncpg | Existing v1 stack |
| Backend DB (Legacy) | MSSQL (sync) | MSSQL + pyodbc | Existing operational data |
| Token Library | python-jose / PyJWT | python-jose | Supports RS256 JWKS |
| API Client | axios / fetch | axios | Already integrated v1 |
| State Management | Context API / Zustand | Context API | Auth state is simple |

### 6.3 Dual-DB Architecture

```
Frontend (React + Vite, port 3001)
    |
    | HTTP (Bearer token: MSAL or JWT)
    v
Backend (FastAPI, port 8000)
    |
    +--- PostgreSQL (Docker, port 5432) [async, asyncpg]
    |    - users, roles, permissions
    |    - debit_notes, shipments, fees
    |    - exchange_rates, clients (ERP)
    |
    +--- MSSQL (AWS 54.180.220.143) [sync, pyodbc]
    |    - UNI_DebitNote database
    |    - Legacy clients, clearance records
    |
    +--- Redis (Docker, port 6379)
         - Cache, session data
```

### 6.4 Dual-Auth Flow

```
Request with Bearer token
    |
    v
get_current_user()
    |
    +-- AZURE_CLIENT_ID set?
    |       |
    |       YES -> verify_msal_token(token)
    |       |       |
    |       |       SUCCESS -> lookup user by azure_oid
    |       |       |           -> fallback: lookup by email
    |       |       |           -> link azure_oid if found by email
    |       |       |
    |       |       FAIL -> fall through to JWT
    |       |
    |       NO -> skip MSAL
    |
    +-- _verify_local_jwt(token)
            |
            SUCCESS -> lookup user by user_id
            FAIL -> 401 Unauthorized
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [ ] `docs/01-plan/conventions.md` exists
- [ ] `CONVENTIONS.md` exists at project root
- [ ] ESLint configuration
- [ ] Prettier configuration
- [x] TypeScript configuration (`tsconfig.json`)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | Defined in CLAUDE.md | Backend: snake_case, Frontend: camelCase/PascalCase | High |
| **Folder structure** | Defined in CLAUDE.md | MSSQL models in `models/mssql/` or `models/legacy/` | High |
| **Import order** | Defined in CLAUDE.md | Keep existing convention | Medium |
| **Environment variables** | Partially defined | Document all MSSQL + Azure vars | High |
| **Error handling** | Generic | Standardize dual-auth error responses | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | Status |
|----------|---------|-------|:------:|
| `DATABASE_URL` | PostgreSQL async connection | Server | Exists |
| `DATABASE_URL_SYNC` | PostgreSQL sync connection | Server | Exists |
| `REDIS_URL` | Redis connection | Server | Exists |
| `MSSQL_SERVER` | MSSQL host (AWS) | Server | New |
| `MSSQL_DATABASE` | MSSQL database name | Server | New |
| `MSSQL_USER` | MSSQL username | Server | New |
| `MSSQL_PASSWORD` | MSSQL password | Server | New |
| `MSSQL_DRIVER` | ODBC driver name | Server | New |
| `AZURE_CLIENT_ID` | Azure AD app client ID | Server | New |
| `AZURE_TENANT_ID` | Azure AD tenant ID | Server | New |
| `AZURE_CLIENT_SECRET` | Azure AD client secret | Server | New |
| `JWT_SECRET_KEY` | JWT signing key | Server | Exists |
| `VITE_AZURE_CLIENT_ID` | Azure AD client ID (frontend) | Client | New |
| `VITE_AZURE_TENANT_ID` | Azure AD tenant ID (frontend) | Client | New |
| `VITE_AZURE_REDIRECT_URI` | MSAL redirect URI | Client | New |
| `VITE_API_BASE` | API base URL | Client | Exists |

---

## 8. Implementation Status Analysis

### 8.1 Completed Work (568 lines added across 18 files)

**Backend (6 files modified, 1 Dockerfile updated):**

| File | Changes | Status |
|------|---------|--------|
| `core/config.py` | Added MSSQL + Azure AD settings, property methods | Complete |
| `core/database.py` | Dual-DB engine (PG async + MSSQL sync lazy init) | Complete |
| `core/security.py` | MSAL JWKS verification + dual-auth middleware | Complete |
| `core/seed.py` | SHA256 password hashing (replaced bcrypt/passlib) | Complete |
| `api/auth.py` | Dual auth endpoints (/config, /login, /refresh, /me) | Complete |
| `api/health.py` | Triple-check health (Redis + PG + MSSQL) | Complete |
| `models/user.py` | Added `azure_oid` column | Complete |
| `main.py` | Updated CORS, startup logging, version 2.0.0 | Complete |
| `requirements.txt` | Added pyodbc, msal, cryptography | Complete |
| `Dockerfile` | Added ODBC Driver 18 for SQL Server | Complete |

**Frontend (7 files modified, 1 new file):**

| File | Changes | Status |
|------|---------|--------|
| `msalConfig.ts` | NEW: MSAL configuration with conditional enable | Complete |
| `App.tsx` | Conditional MsalProvider wrapping | Complete |
| `contexts/AuthContext.tsx` | Added `loginWithMsal`, `msalEnabled` state | Complete |
| `pages/LoginPage.tsx` | Dual login UI (Microsoft SSO + password form) | Complete |
| `services/auth.ts` | Added `loginWithMsalToken` (relay to /me) | Complete |
| `services/api.ts` | Added `auth_mode` cleanup on 401 | Complete |
| `components/AppLayout.tsx` | MSAL logout handling | Partial |
| `package.json` | Added @azure/msal-browser, @azure/msal-react | Complete |

**Infrastructure (1 file):**

| File | Changes | Status |
|------|---------|--------|
| `docker-compose.yml` | MSSQL + Azure env vars passed to backend | Complete |

### 8.2 Remaining Work

| Task | Priority | Estimated Effort | Assignee |
|------|----------|-----------------|----------|
| MSSQL legacy table models | High | 4-6 hours | developer |
| MSSQL data read APIs | High | 4-6 hours | developer |
| Alembic migration for azure_oid | Medium | 1 hour | developer |
| .env.example documentation | Medium | 30 min | developer |
| Fix LoginPage conditional hook | Medium | 1 hour | frontend |
| MSAL logout flow (complete) | Medium | 2 hours | frontend |
| MSAL silent token renewal | Low | 2 hours | frontend |
| Dual-auth integration tests | Medium | 3-4 hours | qa |
| MSSQL connectivity tests | Medium | 2 hours | qa |
| Regression test (v1 features) | High | 3-4 hours | qa |
| Security review (token handling) | Medium | 2 hours | qa |

---

## 9. Team Task Distribution (Dynamic Level: 3 Teammates)

### 9.1 Developer (Backend Focus)

**Priority 1 - MSSQL Integration:**
1. Define MSSQL models for legacy tables in `backend/app/models/mssql/`
   - Tables: clients, clearance, shipment (from UNI_DebitNote DB)
   - Use `MSSQLBase` from `core/database.py`
   - Read-only ORM mappings (reflect existing schema)
2. Create MSSQL read APIs in `backend/app/api/mssql/`
   - GET /api/v1/mssql/clients - List legacy clients
   - GET /api/v1/mssql/clearance/{id} - Lookup clearance record
3. Create Alembic migration for `azure_oid` column on users table
4. Create `.env.example` with all environment variables documented

**Priority 2 - Hardening:**
5. Add proper error handling for MSSQL connection failures
6. Add connection retry logic for MSSQL
7. Review and fix SHA256 password comparison in `auth.py` (line 52-70)

### 9.2 Frontend (React/TypeScript Focus)

**Priority 1 - Fix Issues:**
1. Fix `LoginPage.tsx` conditional hook violation (line 18: `useMsal` called conditionally)
   - Extract MSAL login into a separate component `MsalLoginButton.tsx`
   - Or use `useIsAuthenticated` / `useMsalAuthentication` pattern
2. Complete MSAL logout flow in `AppLayout.tsx`
   - Call `instance.logoutPopup()` or `instance.logoutRedirect()`
   - Clear both MSAL session and localStorage tokens

**Priority 2 - Enhancements:**
3. Add MSAL silent token acquisition for session persistence
4. Add loading spinner during MSAL initialization
5. Handle MSAL redirect flow (in addition to popup)
6. Add user display name from Azure AD in AppLayout header

### 9.3 QA (Testing & Verification Focus)

**Priority 1 - Functional Testing:**
1. Test JWT login flow (dev mode, no Azure vars set)
   - admin/admin123, accountant1/account123, pic1/pic123
2. Test health endpoint reports correct status for all 3 services
3. Test 401 handling and automatic redirect to login
4. Verify role-based access control still works

**Priority 2 - Integration Testing:**
5. Write pytest integration tests for dual-auth middleware
   - Test with mock MSAL token
   - Test with valid JWT token
   - Test with expired/invalid tokens
6. Write pytest tests for MSSQL connection (mock or test server)
7. Regression test all v1 API endpoints
8. Security review: check for hardcoded secrets, token leakage

---

## 10. Next Steps

1. [x] Create PDCA Plan document (this document)
2. [ ] Write design document (`erp-v2.design.md`) with detailed API specs
3. [ ] Team review and task acceptance
4. [ ] Start implementation (Do phase)
5. [ ] Gap analysis (Check phase)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-11 | Initial draft with full analysis of existing erp-v2 changes | CTO Lead |
