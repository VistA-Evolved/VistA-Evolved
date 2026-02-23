# Phase 100 -- Eligibility + Claim Status Polling Framework

## Overview

Adapter-first framework for verifying patient eligibility and tracking
claim status. Three adapter tiers:

| Adapter | Provenance | Status | Description |
|---------|-----------|--------|-------------|
| Manual | MANUAL | Available | User-entered results (phone/portal verified) |
| Sandbox | SANDBOX | Available | Deterministic simulation for dev/test |
| EDI 270/271 | EDI_270_271 | Integration Pending | ANSI X12 eligibility inquiry |
| EDI 276/277 | EDI_276_277 | Integration Pending | ANSI X12 claim status inquiry |
| Clearinghouse | CLEARINGHOUSE | Integration Pending | Clearinghouse-routed transactions |

## Architecture

### Durable Persistence (SQLite)

Phase 100 replaces the Phase 69 in-memory ring buffers with SQLite-backed
persistent storage:

- **Table O: `eligibility_check`** -- All eligibility verification results
- **Table P: `claim_status_check`** -- All claim status check results

Both tables have indexes on patient/claim, payer, provenance, status, and
timestamp for efficient querying.

### Data Flow

```
User/Scheduler --> POST /rcm/eligibility/check
                       |
                       v
                  Route Handler
                       |
              +--------+--------+
              |        |        |
           MANUAL   SANDBOX   EDI_STUB
              |        |        |
              v        v        v
           Direct   Adapter   integration_pending
           entry    call      (no external call)
              |        |        |
              +--------+--------+
                       |
                       v
                  Store (SQLite)
                       |
                       v
                  Audit (hash-chain)
```

### Provenance Tracking

Every result records its source adapter:
- **MANUAL**: Staff verified by phone/portal and entered result
- **SANDBOX**: Deterministic simulation (isTestData=true)
- **EDI_270_271**: Will use ANSI X12 270/271 when clearinghouse enrolled
- **EDI_276_277**: Will use ANSI X12 276/277 when clearinghouse enrolled
- **CLEARINGHOUSE**: Generic clearinghouse-routed transaction

## API Endpoints

### Eligibility

| Method | Path | Description |
|--------|------|-------------|
| POST | /rcm/eligibility/check | Run eligibility check |
| GET | /rcm/eligibility/history | Paginated check history |
| GET | /rcm/eligibility/stats | Aggregate statistics |
| GET | /rcm/eligibility/:id | Get single check |

### Claim Status

| Method | Path | Description |
|--------|------|-------------|
| POST | /rcm/claim-status/check | Run claim status check |
| POST | /rcm/claim-status/schedule | Schedule recurring poll (job queue) |
| GET | /rcm/claim-status/history | Paginated check history |
| GET | /rcm/claim-status/timeline | Claim-specific status timeline |
| GET | /rcm/claim-status/stats | Aggregate statistics |
| GET | /rcm/claim-status/:id | Get single check |

### Adapters

| Method | Path | Description |
|--------|------|-------------|
| GET | /rcm/eligibility-adapters | List all adapters + integration status |

## Manual Testing

### 1. Manual Eligibility Check

```bash
curl -X POST http://localhost:3001/rcm/eligibility/check \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"patientDfn":"3","payerId":"BCBS-001","provenance":"MANUAL","manualResult":{"eligible":true,"notes":"Verified by phone"}}'
```

### 2. Sandbox Eligibility Check

```bash
curl -X POST http://localhost:3001/rcm/eligibility/check \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"patientDfn":"3","payerId":"SBX-TEST","provenance":"SANDBOX"}'
```

### 3. EDI Stub (Integration Pending)

```bash
curl -X POST http://localhost:3001/rcm/eligibility/check \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"patientDfn":"3","payerId":"UHC-001","provenance":"EDI_270_271"}'
```

### 4. Claim Status Check

```bash
curl -X POST http://localhost:3001/rcm/claim-status/check \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"claimRef":"CLM-001","payerId":"BCBS-001","provenance":"SANDBOX"}'
```

### 5. Timeline

```bash
curl http://localhost:3001/rcm/claim-status/timeline?claimRef=CLM-001 \
  -b cookies.txt
```

### 6. Stats

```bash
curl http://localhost:3001/rcm/eligibility/stats -b cookies.txt
curl http://localhost:3001/rcm/claim-status/stats -b cookies.txt
```

## Security

- All `/rcm/*` routes require session auth (security.ts catch-all)
- Mutations audited via `appendRcmAudit` (hash-chained)
- Patient DFN never stored in audit trail (sanitized to `[DFN]`)
- No stored payer credentials
- No fake payer endpoints

## DB Schema

Tables O and P added to `apps/api/src/platform/db/schema.ts` and
`apps/api/src/platform/db/migrate.ts`. Created automatically on startup.

## Files

| File | Purpose |
|------|---------|
| apps/api/src/rcm/eligibility/types.ts | Domain types + provenance enums |
| apps/api/src/rcm/eligibility/store.ts | SQLite CRUD + stats + timeline |
| apps/api/src/rcm/eligibility/routes.ts | API route handlers |
| apps/api/src/rcm/eligibility/manual-adapter.ts | Manual entry adapter |
| apps/api/src/rcm/eligibility/edi-stub-adapters.ts | EDI 270/271 + 276/277 stubs |
| apps/api/src/platform/db/schema.ts | Tables O, P added |
| apps/api/src/platform/db/migrate.ts | DDL + indexes for O, P |
| apps/api/src/index.ts | Route registration |
| apps/web/src/app/cprs/admin/rcm/page.tsx | UI tabs (Eligibility + Claim Status) |

## Migration to Production EDI

When ready to connect to a real clearinghouse:

1. Set `EDI_CLEARINGHOUSE_URL`, `EDI_SENDER_ID`, `EDI_RECEIVER_ID` env vars
2. Implement `Edi270271Adapter` extending the stub in `edi-stub-adapters.ts`
3. Register the adapter with `registerPayerAdapter()`
4. Change provenance on new checks to `EDI_270_271` or `EDI_276_277`
5. Existing historical data is preserved with original provenance
