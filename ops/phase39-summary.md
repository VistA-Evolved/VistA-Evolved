# Phase 39 Summary -- VistA Billing Grounding + Capability Map + Read-Only RCM Surfaces

## What Changed

Phase 39 grounds the Phase 38 RCM Gateway in real VistA billing data by:

1. **Probing the VistA sandbox** for IB/PRCA/PCE/scheduling globals and RPCs
   - Found 85 billing-related RPCs (ORWPCE, IBD, IBCN, IBARXM, SD W/L)
   - PCE encounters: 68 visits, 32 CPT codes, 28 diagnoses -- LIVE
   - IB charges, claims, AR: EMPTY in sandbox -- documented as integration-pending

2. **Machine-readable capability map** (`data/vista/capability-map-billing.json`)
   - 11 VistA globals probed with counts and status
   - 85 RPCs cataloged across 10 functional groups
   - 6 routines verified present
   - 7 API endpoints mapped with live/pending status

3. **7 read-only API endpoints** (`/vista/rcm/*`):
   - 3 LIVE endpoints: encounters, insurance, ICD-10 search
   - 3 integration-pending endpoints: charges, claims-status, ar-status
   - 1 capability-map endpoint
   - All session-protected, PHI-audited, error-sanitized

4. **VistA Billing tab** in RCM admin UI:
   - Patient DFN selector with fetch button
   - Capability summary banner
   - Encounter table with live VistA data
   - Insurance coverage with live VistA data
   - ICD-10 search widget with live results
   - Integration-pending panels for charges/claims/AR with VistA grounding metadata

5. **Billing RPCs added to capability discovery** (15 new RPCs in KNOWN_RPCS)

## Files Added/Changed

### New Files (10)

- `data/vista/capability-map-billing.json` -- machine-readable billing capability map
- `docs/vista/capability-map-billing.md` -- human-readable billing capability map
- `apps/api/src/routes/vista-rcm.ts` -- VistA RCM read-only API routes (7 endpoints)
- `services/vista/ZVEBILP.m` -- VistA billing probe routine (globals)
- `services/vista/ZVEBILR.m` -- VistA billing probe routine (RPCs)
- `docs/runbooks/rcm-billing-grounding.md` -- Phase 39 runbook
- `prompts/43-PHASE-39-BILLING-GROUNDING/prompt.md` -- prompt capture
- `scripts/verify-phase39-billing-grounding.ps1` -- verification script
- `ops/phase39-summary.md` -- this file
- `ops/phase39-notion-update.json` -- Notion update payload

### Modified Files (4)

- `apps/api/src/index.ts` -- register vistaRcmRoutes
- `apps/api/src/vista/rpcCapabilities.ts` -- add 15 billing RPCs to KNOWN_RPCS
- `apps/api/src/lib/audit.ts` -- add 6 billing audit actions
- `apps/web/src/app/cprs/admin/rcm/page.tsx` -- add VistA Billing tab
- `AGENTS.md` -- add Phase 39 architecture map + 5 gotchas (89-93)

## How to Test Manually

```bash
# Login
curl -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'

# Live: encounters for patient 3
curl -s -b cookies.txt http://127.0.0.1:3001/vista/rcm/encounters?dfn=3

# Live: insurance
curl -s -b cookies.txt http://127.0.0.1:3001/vista/rcm/insurance?dfn=3

# Live: ICD search
curl -s -b cookies.txt "http://127.0.0.1:3001/vista/rcm/icd-search?text=diabetes"

# Pending: charges
curl -s -b cookies.txt http://127.0.0.1:3001/vista/rcm/charges?dfn=3

# Capability map
curl -s -b cookies.txt http://127.0.0.1:3001/vista/rcm/capability-map
```

## Verifier Output

Run `scripts/verify-phase39-billing-grounding.ps1`

## Follow-ups

- When VistA IB billing is configured in production, activate the charges/claims/AR endpoints
- Consider adding ORWPCE PROC and ORWPCE DIAG detail views
- Phase 40 could implement encounter-to-claim pipeline grounded in IBD RPCs
