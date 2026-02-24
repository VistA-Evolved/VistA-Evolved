# Phase 110 — RCM Core v1: Credential Vault + LOA Engine

## Overview

Phase 110 introduces DB-backed credentialing, accreditation tracking, and
LOA (Letter of Authorization/Pre-Authorization) engine as durable platform
capabilities. These coexist alongside the existing Phase 87 in-memory
PayerOps credential vault and Phase 94 in-memory LOA workflow.

**VistA IB/AR/PCE remains the authoritative billing ledger.** Phase 110
adds credentialing metadata and payer enrollment tracking *above* VistA.

## Architecture

### New DB Tables (U-Z in platform.db)

| Table | Purpose |
|-------|---------|
| `credential_artifact` (U) | Provider/facility credential metadata |
| `credential_document` (V) | Document upload pointers (FK to credential) |
| `accreditation_status` (W) | Per-payer enrollment/accreditation tracking |
| `accreditation_task` (X) | Next-steps task lists per accreditation |
| `loa_request` (Y) | LOA/pre-auth request lifecycle |
| `loa_attachment` (Z) | LOA supporting document references |

### Coexistence with Existing Systems

| Existing | Phase 110 Addition |
|----------|--------------------|
| `/rcm/payerops/credentials/*` (Phase 87, in-memory) | `/rcm/credential-vault/*` (DB-backed) |
| `/rcm/loa/*` (Phase 94, in-memory) | `loa-repo.ts` + `loa-engine.ts` + `loa-adapter.ts` (DB layer) |
| N/A | `/rcm/accreditation/*` (DB-backed, new) |

Both in-memory and DB-backed variants are registered and functional. The
DB-backed versions are the long-term path; in-memory versions remain for
backward compatibility.

## API Endpoints

### Credential Vault (`/rcm/credential-vault/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/rcm/credential-vault` | List all credentials |
| POST | `/rcm/credential-vault` | Create credential |
| GET | `/rcm/credential-vault/expiring` | Get expiring credentials (`?withinDays=90`) |
| GET | `/rcm/credential-vault/stats` | Aggregate stats |
| GET | `/rcm/credential-vault/:id` | Get credential + documents |
| PATCH | `/rcm/credential-vault/:id` | Update credential |
| POST | `/rcm/credential-vault/:id/verify` | Mark as verified |
| POST | `/rcm/credential-vault/:id/documents` | Add document reference |
| GET | `/rcm/credential-vault/:id/documents` | List documents |
| DELETE | `/rcm/credential-vault/documents/:docId` | Delete document |

### Accreditation (`/rcm/accreditation/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/rcm/accreditation` | List all accreditations |
| POST | `/rcm/accreditation` | Create accreditation |
| GET | `/rcm/accreditation/stats` | Aggregate stats by status |
| GET | `/rcm/accreditation/:id` | Get accreditation + tasks |
| PATCH | `/rcm/accreditation/:id` | Update accreditation |
| POST | `/rcm/accreditation/:id/verify` | Mark as verified |
| POST | `/rcm/accreditation/:id/notes` | Add note |
| GET | `/rcm/accreditation/:id/tasks` | List tasks |
| POST | `/rcm/accreditation/:id/tasks` | Create task |
| PATCH | `/rcm/accreditation/tasks/:taskId` | Update task |
| POST | `/rcm/accreditation/tasks/:taskId/complete` | Complete task |
| DELETE | `/rcm/accreditation/tasks/:taskId` | Delete task |

### LOA Engine (DB Layer — Library)

The LOA engine provides DB-backed domain logic consumed by existing or
future LOA routes:

- **`loa-repo.ts`** — CRUD for `loa_request` and `loa_attachment` tables
- **`loa-engine.ts`** — FSM transitions, packet generation, adapter delegation
- **`loa-adapter.ts`** — `LoaAdapter` interface + stub adapter + registry

#### LOA FSM States

```
draft -> pending_review -> submitted -> approved | denied -> appealed -> expired -> closed
```

#### Adapter Selection

Set `LOA_ADAPTER` env var (default: `"stub"`). The stub adapter returns
simulated tracking numbers. Real payer adapters implement the `LoaAdapter`
interface: `submitLOA()`, `checkLOAStatus()`, `getRequirements()`.

## Admin UI

Two new tabs are added to the RCM admin dashboard (`/cprs/admin/rcm`):

- **Credential Vault** — Stats bar, expiring credentials alert, add/edit
  form, table with status badges, document viewer
- **Accreditation** — Status breakdown, add form, detail panel with notes
  and task management, table with status badges

## Credential Types

Provider/facility credentials tracked:

| Type | Description |
|------|-------------|
| `npi` | National Provider Identifier |
| `state_license` | State medical license |
| `dea` | Drug Enforcement Administration registration |
| `board_cert` | Board certification |
| `clia` | Clinical Laboratory Improvement Amendments |
| `facility_license` | Facility operating license |
| `malpractice` | Malpractice insurance |
| `caqh` | CAQH ProView profile |
| `tax_id` | Tax identification number |

## Accreditation Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Application submitted, awaiting response |
| `active` | Currently credentialed with payer |
| `contracting_needed` | Approved but contract not signed |
| `expiring` | Active but approaching expiration |
| `denied` | Application denied by payer |
| `suspended` | Temporarily suspended |

## Testing

### Manual Endpoint Tests

```bash
# Login (get session cookie)
curl -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'

# Read CSRF token
CSRF=$(curl -s -b cookies.txt http://127.0.0.1:3001/auth/csrf | jq -r '.csrfToken')

# --- Credential Vault ---
# List
curl -s -b cookies.txt http://127.0.0.1:3001/rcm/credential-vault | jq .

# Create
curl -s -b cookies.txt -X POST http://127.0.0.1:3001/rcm/credential-vault \
  -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" \
  -d '{"entityType":"provider","entityId":"1234567890","entityName":"Dr. Smith","credentialType":"npi","credentialValue":"1234567890","createdBy":"admin"}'

# Stats
curl -s -b cookies.txt http://127.0.0.1:3001/rcm/credential-vault/stats | jq .

# Expiring
curl -s -b cookies.txt "http://127.0.0.1:3001/rcm/credential-vault/expiring?withinDays=90" | jq .

# --- Accreditation ---
# Create
curl -s -b cookies.txt -X POST http://127.0.0.1:3001/rcm/accreditation \
  -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" \
  -d '{"payerId":"BCBS001","payerName":"Blue Cross Blue Shield","providerEntityId":"1234567890","status":"pending","createdBy":"admin"}'

# List
curl -s -b cookies.txt http://127.0.0.1:3001/rcm/accreditation | jq .

# Stats
curl -s -b cookies.txt http://127.0.0.1:3001/rcm/accreditation/stats | jq .
```

## Files Changed

### Created
- `apps/api/src/rcm/credential-vault/credential-vault-repo.ts`
- `apps/api/src/rcm/credential-vault/accreditation-repo.ts`
- `apps/api/src/rcm/credential-vault/credential-vault-routes.ts`
- `apps/api/src/rcm/loa/loa-repo.ts`
- `apps/api/src/rcm/loa/loa-engine.ts`
- `apps/api/src/rcm/loa/loa-adapter.ts`

### Modified
- `apps/api/src/platform/db/schema.ts` — 6 new table definitions
- `apps/api/src/platform/db/migrate.ts` — 6 CREATE TABLE + indexes
- `apps/api/src/index.ts` — Route registration
- `apps/web/src/app/cprs/admin/rcm/page.tsx` — 2 new tabs

## Follow-ups

1. Wire DB-backed LOA repos into existing Phase 94 LOA routes (replace in-memory)
2. Wire DB-backed credential vault into Phase 87 PayerOps routes (replace in-memory)
3. Real payer LOA adapters (Availity, Change Healthcare, PhilHealth)
4. Document upload storage backend (S3/local filesystem)
5. Credential expiration alert system (email/webhook notifications)
6. Automated credential verification via primary source APIs
