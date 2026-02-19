# Access Control Policy — VistA-Evolved

> **Owner**: Engineering / Compliance  
> **Last updated**: Phase 34 — Regulated SDLC  
> **Review cadence**: Every 90 days

---

## 1. Purpose

Define all access control mechanisms in VistA-Evolved, covering authentication,
authorization (RBAC), session management, and service-to-service auth.
Implements HIPAA Security Rule requirements for access control (45 CFR 164.312(a)(1))
and person/entity authentication (45 CFR 164.312(d)).

## 2. Authentication

### 2.1 User Authentication (Clinical / Admin)

| Aspect | Implementation |
|--------|---------------|
| **Method** | VistA XWB RPC Broker — `XUS AV CODE` |
| **Credentials** | Access Code + Verify Code (encrypted via XUSRB1 cipher pads) |
| **Session** | httpOnly cookie (not Bearer token) — `credentials: 'include'` on all fetches |
| **Session store** | In-memory `session-store.ts` with configurable TTL |
| **Timeout** | Configurable via `SESSION_TIMEOUT_MS` (default: 30 min) |
| **Credential storage** | NEVER stored in API — pass-through to VistA only |

### 2.2 Patient Portal Authentication

| Aspect | Implementation |
|--------|---------------|
| **Method** | Email + password via portal-IAM (`portal-iam-routes.ts`) |
| **Password hashing** | PBKDF2 with per-user salt |
| **Session** | httpOnly cookie, same pattern as clinical |
| **Proxy access** | Invitation-based, requires admin approval |

### 2.3 Service-to-Service Authentication

| Aspect | Implementation |
|--------|---------------|
| **Method** | `X-Service-Key` header with constant-time comparison |
| **Used by** | Orthanc `OnStableStudy` webhook → `/imaging/ingest/callback` |
| **Config** | `IMAGING_INGEST_WEBHOOK_SECRET` env var |
| **Auth level** | `"service"` in security.ts — bypasses session checks |

## 3. Authorization (RBAC)

### 3.1 Roles

| Role | Description | Mapped from |
|------|-------------|-------------|
| `admin` | Full system access | VistA user mapping in `session-store.ts` |
| `provider` | Clinical read/write, orders | VistA provider flag |
| `nurse` | Clinical read, vitals write | VistA nurse flag |
| `pharmacist` | Clinical read, medication management | VistA pharmacist flag |
| `clerk` | Limited clinical read | VistA clerk flag |

### 3.2 Permission Matrix

| Permission | Admin | Provider | Nurse | Pharmacist | Clerk |
|-----------|-------|----------|-------|------------|-------|
| `clinical_read` | Yes | Yes | Yes | Yes | Yes |
| `clinical_write` | Yes | Yes | Limited | Limited | No |
| `imaging_view` | Yes | Yes | Yes | No | No |
| `imaging_admin` | Yes | No | No | No | No |
| `analytics_viewer` | Yes | Yes | Yes | Yes | No |
| `analytics_admin` | Yes | No | No | No | No |
| `admin_panel` | Yes | No | No | No | No |
| `telehealth_create` | Yes | Yes | No | No | No |
| `telehealth_join` | Yes | Yes | Yes | No | No |

### 3.3 Break-Glass Access (Phase 24)

Emergency access for imaging data outside normal RBAC:

| Aspect | Rule |
|--------|------|
| **Scope** | Patient-specific (single DFN) |
| **Duration** | Max 4 hours (`MAX_BREAK_GLASS_TTL_MS`), default 30 min |
| **Requirement** | Documented reason (free text, audited) |
| **Audit** | Logged to both general and imaging hash-chained audit |
| **Auto-expiry** | `setTimeout` — cannot be extended, only re-created |
| **API** | `POST /security/break-glass/start` |

## 4. Route Protection

### 4.1 Auth Levels in security.ts

| Auth Level | Behaviour |
|-----------|-----------|
| `"none"` | No authentication required (e.g., health check) |
| `"session"` | Valid session cookie required |
| `"admin"` | Valid session + admin role |
| `"service"` | X-Service-Key header validation |

### 4.2 Route → Auth Level Mapping

| Route Pattern | Auth Level | Additional Checks |
|--------------|------------|-------------------|
| `GET /health` | none | — |
| `POST /auth/login` | none | — |
| `GET /vista/*` | session | — |
| `GET /patients/*` | session | Clinical role |
| `GET /imaging/*` | session | `imaging_view` permission |
| `POST /imaging/*` | session | `imaging_admin` permission |
| `GET /analytics/*` | session | `analytics_viewer` permission |
| `POST /analytics/export` | session | `analytics_admin` permission |
| `GET /admin/*` | admin | Strict admin role |
| `POST /imaging/ingest/callback` | service | X-Service-Key |
| `GET /ws/console` | admin | RPC blocklist enforced |

### 4.3 Implementation Rules

1. **Never use `requireSession` as Fastify `preHandler`** — it returns SessionData,
   which Fastify treats as response. Call inside handler body. (BUG-023)
2. **All new fetches use `credentials: 'include'`** — httpOnly cookie auth. (Gotcha #20)
3. **WebSocket console blocks credential RPCs** — `XUS AV CODE`, `XUS SET VISITOR`. (Gotcha #25)

## 5. Session Security

| Control | Implementation |
|---------|---------------|
| **Cookie flags** | httpOnly, Secure (prod), SameSite=Lax |
| **Session ID** | Cryptographically random, 128-bit minimum |
| **Idle timeout** | Configurable, default 30 min |
| **Absolute timeout** | Configurable, default 8 hours |
| **Concurrent sessions** | Allowed (last-writer-wins in VistA) |
| **Logout** | Session destroyed + VistA `#BYE#` disconnect |

## 6. Rate Limiting

| Scope | Limit | Window | Config |
|-------|-------|--------|--------|
| General API | 100 req | 60s | `security.ts` |
| DICOMweb proxy | 120 req | 60s | `DICOMWEB_RATE_LIMIT` / `DICOMWEB_RATE_WINDOW_MS` |
| Login | 5 attempts | 300s | `security.ts` |

## 7. Compliance Mapping

| Requirement | Reference | Implementation |
|-------------|-----------|----------------|
| Access control | 45 CFR 164.312(a)(1) | RBAC + session auth + break-glass |
| Unique user ID | 45 CFR 164.312(a)(2)(i) | VistA DUZ → session mapping |
| Emergency access | 45 CFR 164.312(a)(2)(ii) | Break-glass (Phase 24) |
| Auto logoff | 45 CFR 164.312(a)(2)(iii) | Session idle timeout |
| Encryption | 45 CFR 164.312(a)(2)(iv) | TLS 1.2+ in transit |
| Person/entity auth | 45 CFR 164.312(d) | XWB cipher auth + session validation |

## 8. References

- [Data Classification Policy](data-classification.md)
- [HIPAA Security Rule — 45 CFR 164.312](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [OWASP ASVS v4.0 — V2 Authentication, V3 Session Management](https://owasp.org/www-project-application-security-verification-standard/)
