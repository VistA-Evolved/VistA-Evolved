# Phase 42 — VistA Billing/RCM Binding Pack Summary

## What Changed

Phase 42 grounds the RCM claim draft pipeline in real VistA data by reading
PCE encounters, diagnoses, procedures, and insurance coverage via live RPCs,
then producing annotated claim draft candidates with explicit missing-field
markers for subsystems not available in the sandbox (IB charges, claims/AR).

### Deliverable A — Billing Capability Map v2
- `docs/vista/billing-grounding-v2.md`: Package availability table (PCE populated,
  IB/PRCA empty), object-to-RPC mappings for 7 billing domains, claim draft
  strategy, wrapper RPC spec, production migration path.

### Deliverable B — Safe Wrapper RPCs
- `services/vista/ZVERCMP.m`: Read-only M routine producing provider NPI +
  facility identifiers via `VE RCM PROVIDER INFO` RPC.
- `scripts/install-rcm-wrappers.ps1`: Docker install script.
- Added to `RPC_EXCEPTIONS` in rpcRegistry.ts (14 total).

### Deliverable C — Claim Draft Builder
- `apps/api/src/rcm/vistaBindings/buildClaimDraftFromVista.ts`:
  - Injectable `RpcCaller` interface (testable without VistA).
  - Calls ORWPCE VISIT, ORWPCE DIAG, ORWPCE PROC, IBCN INSURANCE QUERY.
  - Annotates `missingFields[]` and `sourceMissing[]` per candidate.
  - Max 20 encounters per call, date range filtering.

### Deliverable D — API Endpoints
- `GET /rcm/vista/encounters?patientIen=&from=&to=` — PCE encounters.
- `POST /rcm/vista/claim-drafts` — Generate claim draft candidates.
- `GET /rcm/vista/coverage?patientIen=` — Patient insurance coverage.

### Deliverable E — UI
- `DraftFromVistaTab` in RCM admin page: prerequisites checklist, coverage
  summary, encounter selection, draft generation, missing-field annotations.

### Deliverable F — Tests
- 25 unit tests (all pass): parser tests, builder tests, coverage tests,
  no-PHI-in-output tests. Uses injectable RpcCaller stubs.

### Deliverable G — Documentation
- `docs/runbooks/rcm-draft-from-vista.md` — Full runbook.
- `docs/runbooks/vista-billing-wrappers.md` — Wrapper install guide.
- Updated `docs/architecture/rcm-gateway-architecture.md` with Phase 42 pipeline.

### Additional Fix
- Added 3 new audit actions to `RcmAuditAction` type: `vista.encounters.read`,
  `vista.claim-drafts.created`, `vista.coverage.read`.

## How to Test Manually

```bash
# 1. Start VistA Docker + API
cd services/vista && docker compose --profile dev up -d
cd apps/api && npx tsx --env-file=.env.local src/index.ts

# 2. Login
curl -X POST http://127.0.0.1:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' -c cookies.txt

# 3. Test encounters endpoint
curl -b cookies.txt 'http://127.0.0.1:3001/rcm/vista/encounters?patientIen=3'

# 4. Test claim draft generation
curl -X POST -b cookies.txt 'http://127.0.0.1:3001/rcm/vista/claim-drafts' \
  -H 'Content-Type: application/json' \
  -d '{"patientIen":"3"}'

# 5. Test coverage
curl -b cookies.txt 'http://127.0.0.1:3001/rcm/vista/coverage?patientIen=3'
```

## Verifier Output
```
Phase 42 Verification: 42/42 PASS
```

## Follow-ups
- Install VE RCM PROVIDER INFO wrapper in Docker: `scripts/install-rcm-wrappers.ps1`
- Production: Integrate IB charge capture when IB subsystem populated
- Production: Add VistA claims tracking when DGCR(399) available
- Production: Replace in-memory claim store with VistA-native persistence
