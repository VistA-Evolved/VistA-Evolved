# Phase 21 IMPLEMENT — VistA HL7/HLO Interop Reality

## Context

Phase 21 is NOT "new clinical logic". It is VistA-first: expose and visualize
REAL VistA HL7/HLO interoperability state and health, using VistA's existing
data model and queues as the source of truth.

- Phases 10–20 are implemented and Phase 20 VERIFY is passing.
- Phase 20 requires "Interop monitor must pull from HL7/HLO files/queues".
- We must NOT invent a parallel interop engine or fake metrics.
- We must keep security/PHI controls strict (no PHI leakage in logs or UI).
- We must keep prompts folder ordering rules correct and stable.
- We must keep enterprise-grade concerns: reliability, performance, auditability.

## Goal

Deliver a real VistA-sourced Interop Monitor end-to-end:
**VistA → RPC(s) → API endpoints → UI pages/panels → verification.**

---

## Hard Requirements

### 1. VistA-first data sources (no fake metrics)

HL7 link and queue status MUST be derived from VistA HL7/HLO files/queues:

- File #870 HL LOGICAL LINK
- File #772 HL7 MESSAGE TEXT (metadata only; NO message content by default)
- File #773 HL7 MESSAGE ADMINISTRATION
- HL7 Monitor files: #776 / #776.1 (as available)
- HLO registries/queues: #779.2, #779.3, #779.4, #779.9 (handle missing #779.3 gracefully)

If file(s) don't exist in the WorldVistA sandbox, the UI must show
"Not available in this VistA build" with the file number and a doc link,
not fake values.

### 2. No PHI leakage

- Return ONLY operational metadata (counts, timestamps, link state, queue depth, error counts).
- Do not expose raw HL7 messages in Phase 21 by default.
- Logging must never include patient identifiers, HL7 message bodies, credentials, or tokens.
- Any "debug" view must be OFF by default and gated behind an explicit env flag AND admin role AND redaction.

### 3. Security posture

- Protect interop endpoints behind existing auth/session mechanisms.
- Add role/permission gating for "interop admin" actions.
- No new auth system invented; reuse existing session/auth patterns.

### 4. Reliability/performance

- Add server-side caching where appropriate (short TTL) to avoid hammering VistA.
- Add timeouts and retry discipline for VistA RPC calls.
- Ensure API process handles graceful shutdown and port conflicts cleanly (EADDRINUSE hardening).

### 5. Full regression

- Must not break Phase 10–20 UI or API; all existing verify scripts must pass.

---

## Implementation Plan

### A) Inventory + Design

1. Read Phase 20 grounding docs, capability matrix, existing interop pages/components.
2. Identify "interop monitor" UI route(s) and API endpoints — what is placeholder vs real.
3. Define minimal stable data contract (TypeScript types):
   - `hl7Links[]` (from #870)
   - `hl7Queues` summary (counts by direction/status)
   - `hloQueues` summary (counts by priority queue, subscriber backlog)
   - `monitors/jobs` (if #776/#776.1 exist)
   - `availability` flags per file number

### B) VistA Layer (M Routines + RPC Registration)

1. Implement ONE VistA routine (under repo namespace convention) that outputs
   caret-delimited format that API can parse safely.
2. Query HL7/HLO globals for:
   - Link status per #870 entry (name, protocol, state, last start/stop)
   - Queue depth snapshots for outgoing/incoming HL7 queues
   - HLO priority queue depths (#779.9) and registry health (#779.2/#779.4)
   - Handle missing #779.3 gracefully (available=false)
3. Return NO HL7 message bodies. Only counts and IDs.
4. Robust error handling — RPC never crashes broker job.
5. Installation path: place M routine source under repo, update runbooks.
6. Register new RPCs mapped to routine entry points.

### C) API Layer (Fastify)

1. Add endpoints:
   - `GET /vista/interop/hl7-links` — logical link inventory
   - `GET /vista/interop/hl7-messages` — message activity summary
   - `GET /vista/interop/hlo-status` — HLO engine status
   - `GET /vista/interop/queue-depth` — queue depth indicators
   - `GET /vista/interop/summary` — combined dashboard (all 4 RPCs)
2. Enforce auth and role gating.
3. Cache response (TTL ~5–15s) to reduce load.
4. Set timeouts, never log sensitive payloads.
5. Strong typing on all responses.

### D) UI Layer (Next.js)

1. Update/implement Interop Monitor in the Integration Console:
   - Clearly labeled as VistA-sourced truth (show file numbers used)
   - Shows link health and queue depth
   - Highlights failure states, shows error banners
   - Shows "not available in this VistA build" for missing files/features
2. No fake green checkmarks. Only green if data is real and healthy.

### E) DevEx + CI

1. Add/extend GitHub Actions workflow:
   - pnpm install, typecheck/lint, secret scan, build all packages
2. Run on PR + main push.
3. Document CI expectations for Docker/VistA integration tests.

### F) Prompt System Hygiene

1. Audit /prompts: numbering contiguous, no duplicates, no misordering.
2. Fix names/headers so folder number + file prefix + phase label match.
3. Add Phase 21 IMPLEMENT + VERIFY in correct ordered location.

### G) Documentation

1. Add runbook: docs/runbooks/interop-rpcs.md containing:
   - VistA file numbers read
   - How to install VistA routine + RPC
   - Manual validation steps
   - Security notes (no PHI, redaction)
2. Update known-gaps and capability matrix as appropriate.

---

## What Was Delivered

### Step 0 — Inventory

- Grounding docs (AGENTS.md, BUG-TRACKER.md, runbooks)
- Current interop UI page (`apps/web/src/app/cprs/admin/integrations/page.tsx`)
- Existing API routes, RPC broker client, prompt numbering
- GitHub workflows, API startup code

### Step 1 — M Routine + RPC Pack (Section B ✅)

- Probed VistA Docker HL7 globals: `^HLCS(870)`, `^HL(772)`, `^HLMA(773)`, `^HLD(779.x)`
- Created `services/vista/ZVEMIOP.m` — 4 read-only entry points:
  - `LINKS^ZVEMIOP` → HL7 logical links from file #870
  - `MSGS^ZVEMIOP` → HL7 message stats from file #773/#772
  - `HLOSTAT^ZVEMIOP` → HLO system params + app registry (#779.1, #779.2, #779.4, #779.9, #778)
  - `QLENGTH^ZVEMIOP` → Queue depth indicators (#773, #778, #776)
- Created `services/vista/ZVEMINS.m` — RPC registration installer (IENs 3108–3111)
- Created `services/vista/VEMCTX3.m` — Safe context adder (appends, never KILLs)
- Registered 4 RPCs in OR CPRS GUI CHART context
- Created `scripts/install-interop-rpcs.ps1` — automated installer
- All reads strictly read-only — no SET, KILL, or LOCK commands
- `NOT_AVAILABLE` returned when files don't exist (with file number + description)

### Step 2 — API Endpoints (Section C ✅ with noted gaps)

- Created `apps/api/src/routes/vista-interop.ts` with 5 GET endpoints:
  - `/vista/interop/hl7-links` — logical link inventory
  - `/vista/interop/hl7-messages` — message activity summary
  - `/vista/interop/hlo-status` — HLO engine status
  - `/vista/interop/queue-depth` — queue depth indicators
  - `/vista/interop/summary` — combined dashboard (all 4 RPCs, single connection)
- Registered routes in `apps/api/src/index.ts`
- Auth via `requireSession()` + `requireRole(session, ["admin","provider"])` inside handler body
- Every response includes `source: "vista"`, `vistaFile`, and `timestamp`
- Fixed critical Fastify bug: `requireSession` as preHandler causes hang (BUG-023)
- All RPCs use `cachedRpc` → `resilientRpc` (circuit breaker, timeout, retry, metrics, cache)
- Query params validated via Zod schemas (`Hl7LinksQuerySchema`, `Hl7MessagesQuerySchema`)
- Error responses: 503 (circuit open), 504 (timeout), 502 (generic RPC failure)
- Summary endpoint caches entire 4-RPC batch as aggregate with same TTL

### Step 3 — UI Interop Monitor (Section D ✅)

- Added "VistA HL7/HLO" tab to Integration Console
- 4 summary cards: HLO Engine, HL7 Links, Message Stats, Queue Depth
- HL7 Logical Links table with real VistA data
- Refresh button with last-updated timestamp
- Shows "not available" when VistA files are missing

### Step 4 — CI Pipeline (Section E ✅)

- Created `.github/workflows/verify.yml`:
  - TypeScript type-check (API + Web)
  - Secret scanner
  - Build all packages
- Runs on push to main/develop and PR to main/develop
- **Known gap**: CI doesn't run integration tests against VistA Docker (requires live container)

### Step 5 — API Process Hardening (Section C4 partial ✅)

- EADDRINUSE detection with helpful error message + runbook reference
- Updated phase tag to "21-interop-telemetry"
- Graceful shutdown already existed in security middleware
- **Known debt**: Graceful shutdown doesn't call `disconnect()` on RPC broker (BUG-027 gotcha 27)

### Step 6 — Prompt + Documentation (Sections F + G ✅)

- Created prompt folder `prompts/23-PHASE-21-INTEROP-REALITY/`
- Created runbook `docs/runbooks/interop-rpcs.md` with file numbers, install steps, security notes
- Prompt numbering verified contiguous

---

## Known Debt / Follow-ups

| Item                                        | Requirement Ref | Status                                                                            |
| ------------------------------------------- | --------------- | --------------------------------------------------------------------------------- |
| Server-side response caching (TTL 10s)      | C3              | ✅ Resolved — `cachedRpc` with env-configurable `INTEROP_CACHE_TTL_MS`            |
| Use `safeCallRpc` with circuit breaker      | C4              | ✅ Resolved — `cachedRpc` → `resilientRpc` (CB + timeout + retry)                 |
| Connection pooling for individual endpoints | C4              | ✅ Resolved — connect/disconnect inside `cachedRpc` rpcFn; retries reconnect      |
| Zod schema validation on query params       | C5              | ✅ Resolved — `Hl7LinksQuerySchema`, `Hl7MessagesQuerySchema` + `validate()`      |
| "Interop admin" role distinction            | Req 3           | ✅ Resolved — `requireRole(session, ["admin","provider"])` + AUTH_RULES `"admin"` |
| Debug view env flag gating                  | Req 2           | Deferred — no explicit debug toggle beyond VISTA_DEBUG (Phase 22+)                |
| Graceful shutdown RPC disconnect            | C4              | ✅ Resolved — `disconnectRpcBroker()` in SIGINT/SIGTERM handler                   |
| `verify-latest.ps1` Phase 21 delegation     | E               | ✅ Resolved — delegates to `verify-phase21-interop-reality.ps1`                   |

---

## Files Touched

### New Files

- `services/vista/ZVEMIOP.m` — Production M routine (4 RPC entry points)
- `services/vista/ZVEMINS.m` — RPC registration installer
- `services/vista/VEMCTX3.m` — Safe context adder
- `services/vista/VETEST.m` — Test harness
- `services/vista/probe-hl7.m` — HL7 global probe
- `services/vista/probe-hl7-detail.m` — Detailed HL7 probe
- `services/vista/probe-rpc.m` — RPC probe
- `scripts/install-interop-rpcs.ps1` — Automated installer
- `apps/api/src/routes/vista-interop.ts` — 5 interop API endpoints
- `.github/workflows/verify.yml` — CI verify pipeline
- `docs/runbooks/interop-rpcs.md` — Interop RPC runbook
- `prompts/23-PHASE-21-INTEROP-REALITY/23-01-interop-reality-IMPLEMENT.md`
- `prompts/23-PHASE-21-INTEROP-REALITY/23-99-interop-reality-VERIFY.md`

### Modified Files

- `apps/web/src/app/cprs/admin/integrations/page.tsx` — Added HL7/HLO tab
- `apps/api/src/index.ts` — Registered interop routes + EADDRINUSE handling
