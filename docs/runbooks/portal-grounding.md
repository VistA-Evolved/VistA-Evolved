# Portal Grounding Runbook — Phase 26

> Step-by-step guide to running, testing, and extending the patient portal.

---

## Prerequisites

- Node.js ≥24
- pnpm ≥10
- VistA Docker sandbox running on port 9430 (for full integration)
- API server running on port 3001

## 1. Install Dependencies

```powershell
cd <repo-root>
pnpm install
```

## 2. Start the API Server

```powershell
cd apps/api
npx tsx --env-file=.env.local src/index.ts
```

Verify portal routes are registered:
```powershell
curl.exe -s http://localhost:3001/portal/auth/session | ConvertFrom-Json
# Expected: {"ok":false,"error":"Not authenticated"}
```

## 3. Start the Portal Dev Server

```powershell
cd apps/portal
pnpm dev
# Runs on http://localhost:3002
```

## 4. Log In (Dev Mode)

1. Open http://localhost:3002
2. Enter `patient1` / `patient1`
3. You'll be redirected to `/dashboard`

### Dev Mode Patient Map

| Username | Password | Patient | DFN |
|----------|----------|---------|-----|
| patient1 | patient1 | CARTER,DAVID | 100022 |
| patient2 | patient2 | SMITH,JOHN | 100033 |

## 5. Navigate the Portal

| Page | URL | Data Source |
|------|-----|-------------|
| Dashboard | `/dashboard` | Summary cards |
| Health Records | `/dashboard/health` | VistA RPCs (skeleton) |
| Medications | `/dashboard/medications` | VistA RPCs (skeleton) |
| Messages | `/dashboard/messages` | Placeholder |
| Appointments | `/dashboard/appointments` | Placeholder |
| Telehealth | `/dashboard/telehealth` | Placeholder |
| Profile | `/dashboard/profile` | VistA RPCs (skeleton) |

## 6. Test Portal Auth API

```powershell
# Login
$resp = Invoke-WebRequest -Uri http://localhost:3001/portal/auth/login `
  -Method POST -ContentType "application/json" `
  -Body '{"username":"patient1","password":"patient1"}' `
  -UseBasicParsing -SessionVariable sess

# Session check
Invoke-WebRequest -Uri http://localhost:3001/portal/auth/session `
  -UseBasicParsing -WebSession $sess

# Health data (returns skeleton)
Invoke-WebRequest -Uri http://localhost:3001/portal/health/allergies `
  -UseBasicParsing -WebSession $sess

# Audit events
Invoke-WebRequest -Uri http://localhost:3001/portal/audit/stats `
  -UseBasicParsing

# Logout
Invoke-WebRequest -Uri http://localhost:3001/portal/auth/logout `
  -Method POST -UseBasicParsing -WebSession $sess
```

## 7. Run License Guard

```powershell
.\scripts\license-guard.ps1 -Verbose
```

All gates should PASS:
- No AIOTP code in source tree
- No VA terminology in portal UI strings
- THIRD_PARTY_NOTICES.md exists
- Reference folders intact
- Portal contract artifacts present

## 8. Build All Apps

```powershell
pnpm -r build
```

## Architecture Notes

### Session Isolation

Portal sessions (`portal_session` cookie) are completely separate from
clinician sessions (`ehr_session` cookie). They use different:
- Cookie names
- Session stores (in-memory Map each)
- TTL settings (portal: 30min absolute, 15min idle)
- Rate limits (portal: 5 login attempts / 15 min)

### Data Flow

```
Patient Browser
    → Portal App (Next.js, port 3002)
    → API Gateway (Fastify, port 3001)
    → /portal/health/* routes (DFN-scoped)
    → [Future] VistA RPC Broker (port 9430)
    → VistA M Database
```

### PHI Safety

- Portal audit events use `hashPatientId(dfn)` — never raw DFN
- Portal session never exposes DFN to the client
- No PHI in structured log output
- DataSourceBadge uses plain-language labels (no VA terminology)

### Future Phases

The portal contract (`docs/contracts/portal/portal-contract-v1.yaml`)
defines future modules:
- Secure messaging (SM API integration)
- Appointment scheduling (SD RPCs)
- Medication refill requests (provider approval workflow)
- Telehealth video (WebRTC integration)
- CCD/CCR export (Blue Button)
- OIDC/SAML production auth
