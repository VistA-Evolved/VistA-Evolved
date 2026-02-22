# Phase 39 — VistA Billing Grounding + Capability Map + Read-Only RCM Surfaces

## Request

Build a VistA-first read-only billing module that:
1. Probes the WorldVistA sandbox for IB/PRCA/PCE/scheduling globals & RPCs
2. Creates a machine-readable capability map documenting what's live vs integration-pending
3. Exposes read-only API endpoints for encounters, charges, insurance, and billing status
4. Builds UI surfaces that show real VistA data where available, integration-pending where not
5. Grounds every "pending" stub with the specific VistA file/RPC/routine it targets

## Implementation Steps

### A. VistA Billing Capability Probe (MUMPS)
- [x] Write ZVEBILP.m + ZVEBILR.m probe routines
- [x] Docker exec probes to discover:
  - PCE encounters: 68 visits, 32 V CPT, 28 V POV -- LIVE
  - IB Action: EMPTY, IB Action Types: 122 entries
  - Claims Tracking (399): EMPTY
  - AR Transaction (430): EMPTY, AR Payment (433): 2 entries
  - Insurance (36): 2 entries, Patient insurance: PARTIAL
  - Hospital Locations (44): 10 entries
  - 85 billing-related RPCs found (ORWPCE*, IBD*, IBCN*, IBARXM*, etc.)

### B. Capability Map
- [ ] `data/vista/capability-map-billing.json` -- machine-readable
- [ ] `docs/vista/capability-map-billing.md` -- human-readable

### C. API Endpoints (read-only, VistA-first)
- [ ] `GET /vista/rcm/encounters?dfn=N` -- PCE visits via ORWPCE GET VISIT + ORWPCE DIAG + ORWPCE PROC
- [ ] `GET /vista/rcm/insurance?dfn=N` -- Patient insurance via IBCN INSURANCE QUERY
- [ ] `GET /vista/rcm/icd-search?text=X` -- ICD/diagnosis search via ORWPCE4 LEX
- [ ] `GET /vista/rcm/charges?dfn=N` -- IB charges (integration-pending, sandbox empty)
- [ ] `GET /vista/rcm/claims-status?dfn=N` -- Claims tracking (integration-pending)
- [ ] `GET /vista/rcm/ar-status?dfn=N` -- AR balance (integration-pending)
- [ ] New Fastify plugin: `apps/api/src/routes/vista-rcm.ts`

### D. UI Screens
- [ ] Update `apps/web/src/app/cprs/admin/rcm/page.tsx` with VistA Billing tab
- [ ] Show encounters, insurance, ICD search from live VistA RPCs
- [ ] Show charges/claims/AR as "integration-pending" with target VistA file refs

### E. Quality
- [ ] Add billing RPCs to rpcCapabilities.ts KNOWN_RPCS
- [ ] cachedRpc for encounter reads
- [ ] PHI audit for all billing reads

### F. Docs & Ops
- [ ] `docs/runbooks/rcm-billing-grounding.md`
- [ ] Update AGENTS.md with Phase 39 gotchas
- [ ] Update BUG-TRACKER.md if needed
- [ ] Verification script
- [ ] ops/ artifacts

## Files Touched
- `data/vista/capability-map-billing.json` (NEW)
- `docs/vista/capability-map-billing.md` (NEW)
- `apps/api/src/routes/vista-rcm.ts` (NEW)
- `apps/api/src/index.ts` (register new routes)
- `apps/api/src/vista/rpcCapabilities.ts` (add billing RPCs)
- `apps/web/src/app/cprs/admin/rcm/page.tsx` (add VistA Billing tab)
- `docs/runbooks/rcm-billing-grounding.md` (NEW)
- `services/vista/ZVEBILP.m` (NEW probe routine)
- `services/vista/ZVEBILR.m` (NEW probe routine)
- `scripts/verify-phase39-billing-grounding.ps1` (NEW)
- `AGENTS.md` (update)
- `ops/phase39-summary.md` (NEW)
- `ops/phase39-notion-update.json` (NEW)

## Verification
- `scripts/verify-phase39-billing-grounding.ps1`
