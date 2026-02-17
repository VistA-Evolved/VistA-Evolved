# Phase 21 IMPLEMENT — VistA HL7/HLO Interop Telemetry + CI + Ops Hardening

## User Request

Implement Phase 21: real VistA HL7/HLO interop telemetry surfaced in the
Integration Console, CI pipeline expansion, and API process hardening.

## Implementation Steps

### Step 0 — Inventory
- Grounding docs (AGENTS.md, BUG-TRACKER.md, runbooks)
- Current interop UI page (`apps/web/src/app/cprs/admin/integrations/page.tsx`)
- Existing API routes, RPC broker client, prompt numbering
- GitHub workflows, API startup code

### Step 1 — M Routine + RPC Pack
- Probed VistA Docker HL7 globals: ^HLCS(870), ^HL(772), ^HLMA(773), ^HLD(779.x)
- Created `services/vista/ZVEMIOP.m` — 4 read-only entry points:
  - `LINKS^ZVEMIOP` → HL7 logical links from file #870
  - `MSGS^ZVEMIOP` → HL7 message stats from file #773/#772
  - `HLOSTAT^ZVEMIOP` → HLO system params + app registry
  - `QLENGTH^ZVEMIOP` → Queue depth indicators
- Created `services/vista/ZVEMINS.m` — RPC registration installer
- Created `services/vista/VEMCTX3.m` — Safe context adder
- Registered 4 RPCs (IENs 3108–3111) in OR CPRS GUI CHART context
- Created `scripts/install-interop-rpcs.ps1` — automated installer

### Step 2 — API Endpoints
- Created `apps/api/src/routes/vista-interop.ts` with 5 GET endpoints:
  - `/vista/interop/hl7-links` — logical link inventory
  - `/vista/interop/hl7-messages` — message activity summary
  - `/vista/interop/hlo-status` — HLO engine status
  - `/vista/interop/queue-depth` — queue depth indicators
  - `/vista/interop/summary` — combined dashboard (all 4 RPCs)
- Registered in `apps/api/src/index.ts`
- Fixed critical Fastify bug: requireSession as preHandler causes hang

### Step 3 — UI Interop Monitor
- Added "VistA HL7/HLO" tab to Integration Console
- 4 summary cards: HLO Engine, HL7 Links, Message Stats, Queue Depth
- HL7 Logical Links table with real VistA data
- Refresh button with last-updated timestamp
- Updated architecture note

### Step 4 — CI Pipeline
- Created `.github/workflows/verify.yml`:
  - TypeScript type-check (API + Web)
  - Secret scanner
  - Build all packages

### Step 5 — API Process Hardening
- EADDRINUSE detection with helpful error message + runbook reference
- Updated phase tag to "21-interop-telemetry"
- (Graceful shutdown already existed in security middleware)

### Step 6 — Prompt + Commit
- Created prompt folder `prompts/23-PHASE-21-INTEROP-REALITY/`
- Created runbook `docs/runbooks/interop-rpcs.md`
- Created ops summary

## Verification Steps
- All 5 API endpoints return real VistA data via curl
- UI TypeScript compiles without errors
- API TypeScript compiles without errors

## Files Touched

### New Files
- `services/vista/ZVEMIOP.m` — Production M routine
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
