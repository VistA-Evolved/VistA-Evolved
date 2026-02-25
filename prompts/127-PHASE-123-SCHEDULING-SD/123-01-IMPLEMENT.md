# Phase 123 — SCHEDULING SD* INTEGRATION PACK (VISTA-FIRST, TESTABLE)

## User Request

Turn the SCHEDULING module from "integration_pending" into **"wired (read)" + "partial (write)"** with honest limitations.

Wire real SD* RPCs for scheduling read paths, add encounter detail + waitlist endpoints, and implement at least one real VistA write path via SD W/L CREATE FILE. All responses must include `vistaGrounding` metadata showing exactly which RPCs/files are used.

## Implementation Steps

### Step 0 — Prompt files
- Created `prompts/127-PHASE-123-SCHEDULING-SD/123-01-IMPLEMENT.md` (this file)
- Created `prompts/127-PHASE-123-SCHEDULING-SD/123-99-VERIFY.md`

### Step 1 — RPC Inventory & Mapping

**Already wired (4 read RPCs):**
| RPC | Domain | Status |
|-----|--------|--------|
| SDOE LIST ENCOUNTERS FOR PAT | encounters | LIVE |
| SDOE LIST ENCOUNTERS FOR DATES | encounters | LIVE |
| SD W/L RETRIVE HOSP LOC(#44) | clinics | LIVE |
| SD W/L RETRIVE PERSON(200) | providers | LIVE |

**New RPCs to register (Phase 123):**
| RPC | Domain | Tag | Sandbox | Notes |
|-----|--------|-----|---------|-------|
| SDOE GET GENERAL DATA | encounters | read | check | Encounter detail fields |
| SDOE GET PROVIDERS | encounters | read | check | Providers assigned to encounter |
| SDOE GET DIAGNOSES | encounters | read | check | Diagnoses for encounter |
| SD W/L CREATE FILE | waitlist | write | check | Create wait-list entry — KEY WRITE |
| SD W/L RETRIVE FULL DATA | waitlist | read | check | Full wait-list data retrieval |
| DVBAB APPOINTMENT LIST | appointments | read | check | C&P appointment list fallback |
| SC BLD PAT APT LIST | appointments | read | check | Team-based appointment list |

### Step 2 — Read Path Wired
- Add encounter detail endpoint: `GET /scheduling/encounters/:ien/detail`
- Add encounter providers endpoint: `GET /scheduling/encounters/:ien/providers`
- Add wait-list read endpoint: `GET /scheduling/waitlist`
- Add `vistaGrounding` metadata to ALL scheduling responses
- Improve empty-state handling with clear VistA posture messaging
- Register new RPCs in `rpcRegistry.ts` + `RPC_EXCEPTIONS`

### Step 3 — Write Path Partial
- Wire `createAppointment()` to attempt SD W/L CREATE FILE first
- If RPC succeeds: real VistA wait-list entry created
- If RPC fails/unavailable: fall back to in-memory + DB request store
- Response includes `vistaGrounding` showing which path was used
- Update `scheduling.appointments.create` capability to `configured`

### Step 4 — Sandbox Probe (Optional)
- Attempt each new RPC in adapter with graceful error handling
- Log which RPCs are actually available vs absent

### Step 5 — Tests + Verify
- Integration tests for scheduling endpoints
- Run TypeScript check across api/web/portal
- Verify RPC registry consistency

## Files Touched
- `apps/api/src/vista/rpcRegistry.ts` — new SD* RPCs
- `apps/api/src/adapters/scheduling/vista-adapter.ts` — new methods + write wiring
- `apps/api/src/adapters/scheduling/interface.ts` — new types + methods
- `apps/api/src/routes/scheduling/index.ts` — new endpoints
- `config/capabilities.json` — update scheduling capabilities
- `apps/api/tests/scheduling-sd.test.ts` — integration tests (new)
- `prompts/127-PHASE-123-SCHEDULING-SD/123-01-IMPLEMENT.md` (this)
- `prompts/127-PHASE-123-SCHEDULING-SD/123-99-VERIFY.md`

## Verification
- `pnpm -C apps/api exec tsc --noEmit`
- `pnpm -C apps/web exec tsc --noEmit`
- All scheduling routes respond correctly
- RPC registry has no unregistered RPCs
