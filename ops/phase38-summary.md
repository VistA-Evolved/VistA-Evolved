# Phase 38 Summary — VistA-First RCM + Payer Connectivity Platform

## What Changed

### New Files (17 TypeScript + 2 JSON seed + 6 docs + 1 verifier)

**Domain Model** (`apps/api/src/rcm/domain/`):
- `claim.ts` — 9-state FSM (draft→closed), Claim interface with VistA grounding fields
- `payer.ts` — Payer entity, 6 IntegrationMode types, PayerFilter
- `remit.ts` — Remittance/EOB types for 835 processing
- `claim-store.ts` — In-memory claim + remittance store with tenant indexing

**Payer Registry** (`apps/api/src/rcm/payer-registry/`):
- `registry.ts` — Seed loader from `data/payers/`, CRUD, filtering, stats

**Seed Data** (`data/payers/`):
- `us_core.json` — 12 US payers (Medicare A/B, Medicaid, TRICARE, BCBS, UHC, Aetna, etc.)
- `ph_hmos.json` — 15 PH payers (PhilHealth + 14 HMOs)

**EDI Pipeline** (`apps/api/src/rcm/edi/`):
- `types.ts` — All X12 transaction sets (837P/I, 835, 270/271, 276/277, 275, 278, 999/TA1)
- `pipeline.ts` — 10-stage pipeline tracking, Claim→837 builder, eligibility/status inquiry builders

**Validation Engine** (`apps/api/src/rcm/validation/`):
- `engine.ts` — 15+ rules in 5 categories (syntax, code_set, business_rule, timely_filing, payer_specific), readiness score

**Connectors** (`apps/api/src/rcm/connectors/`):
- `types.ts` — RcmConnector interface + pluggable connector registry
- `clearinghouse-connector.ts` — US EDI clearinghouse transport
- `philhealth-connector.ts` — PhilHealth eClaims API (CF2/CF3/CF4 mapping)
- `sandbox-connector.ts` — Simulated transport with configurable rejection
- `portal-batch-connector.ts` — HMO portal/batch upload queue

**Audit** (`apps/api/src/rcm/audit/`):
- `rcm-audit.ts` — SHA-256 hash-chained audit, PHI sanitization, 20K cap

**Routes**:
- `rcm-routes.ts` — ~30 REST endpoints (health, payers, claims, eligibility, pipeline, connectors, validation, remittances, audit)

**Docs** (6 files):
- `docs/runbooks/rcm-payer-connectivity.md`
- `docs/runbooks/rcm-philhealth-eclaims.md`
- `docs/runbooks/rcm-us-edi-clearinghouse.md`
- `docs/architecture/rcm-gateway-architecture.md`
- `docs/runbooks/payer-registry.md`
- `docs/security/rcm-phi-handling.md`

### Modified Files
- `apps/api/src/index.ts` — RCM routes registration
- `apps/api/src/middleware/security.ts` — `/rcm/` AUTH_RULE
- `config/capabilities.json` — 8 RCM capabilities (configured)
- `config/modules.json` — RCM module with 9 services
- `apps/web/src/app/cprs/admin/rcm/page.tsx` — Full tabbed UI (Claims, Payers, Connectors, Audit)
- `AGENTS.md` — Phase 38 section 7g + gotchas 83-88
- `scripts/verify-latest.ps1` — Delegates to Phase 38

## How to Test Manually

1. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
2. Login: `curl -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' -c cookies.txt`
3. RCM health: `curl -b cookies.txt http://127.0.0.1:3001/rcm/health`
4. List payers: `curl -b cookies.txt http://127.0.0.1:3001/rcm/payers`
5. Create draft: `curl -X POST -b cookies.txt http://127.0.0.1:3001/rcm/claims/draft -H "Content-Type: application/json" -d '{"patientDfn":"3","payerId":"US-CMS-MEDICARE-A","dateOfService":"2025-01-15"}'`
6. Connectors: `curl -b cookies.txt http://127.0.0.1:3001/rcm/connectors`
7. Validation rules: `curl -b cookies.txt http://127.0.0.1:3001/rcm/validation/rules`
8. Audit chain: `curl -b cookies.txt http://127.0.0.1:3001/rcm/audit/verify`

## Verifier Output

```
Phase 38 PASSED (95 gates)
TypeScript: 0 errors
```

## Follow-ups
- Wire VistA IB/AR RPCs when available in sandbox (currently in-memory)
- Add real X12 serialization (currently JSON envelope)
- Production EDI clearinghouse integration (SFTP/API credentials)
- PhilHealth eClaims API production enrollment
- 835 auto-reconciliation enhancements
- Patient portal claim view
