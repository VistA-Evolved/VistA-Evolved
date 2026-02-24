# Phase 112 — Evidence Pipeline + No-Fake-Integrations Gate (IMPLEMENT)

## User Request
Enforce that any payer/integration claim in the codebase is backed by evidence
and is not fabricated. Build evidence registry, CI enforcement gate, and
research helper template.

## Implementation Steps

1. **DB schema** — Add `integration_evidence` table (AE) to `schema.ts` + `migrate.ts`
   - Fields: id, payerId, method (api/portal/manual/edi/fhir), source (URL/doc ref),
     channel, contactInfo, submissionRequirements, supportedChannelsJson,
     lastVerifiedAt, verifiedBy, notes, status, createdAt, updatedAt

2. **Evidence repo** — `apps/api/src/rcm/evidence/evidence-registry-repo.ts`
   - CRUD for integration_evidence rows
   - Query: by payer, by method, by status, unverified, stale

3. **Evidence routes** — `apps/api/src/rcm/evidence/evidence-routes.ts`
   - GET /rcm/evidence — list all entries
   - GET /rcm/evidence/:id — single entry
   - GET /rcm/evidence/by-payer/:payerId — per-payer evidence
   - POST /rcm/evidence — create entry
   - PUT /rcm/evidence/:id — update entry
   - DELETE /rcm/evidence/:id — soft-delete (status=archived)
   - GET /rcm/evidence/coverage — cross-ref payers vs evidence
   - GET /rcm/evidence/gaps — payers with api/fhir mode but no evidence

4. **Wire routes** in `index.ts`

5. **CI gate** — `scripts/qa-gates/evidence-gate.mjs`
   - Scan payer seed JSON for api/fhir modes without evidence
   - Scan connector code for undeclared endpoints
   - Scan docs for ungrounded integration claims

6. **Research template** — `docs/templates/payer-evidence-template.md`

7. **UI admin tab** — Add "Evidence Registry" tab to RCM page

8. **Runbook** — `docs/runbooks/phase112-evidence-gating.md`

## Verification Steps
- `npx tsc --noEmit` — zero errors
- `npx next build` — clean build
- API starts, evidence endpoints return data
- CI gate runs and reports coverage

## Files Touched
- `apps/api/src/platform/db/schema.ts` — add integration_evidence table (AE)
- `apps/api/src/platform/db/migrate.ts` — add CREATE TABLE + indexes
- `apps/api/src/rcm/evidence/evidence-registry-repo.ts` — NEW
- `apps/api/src/rcm/evidence/evidence-routes.ts` — NEW
- `apps/api/src/index.ts` — import + register
- `scripts/qa-gates/evidence-gate.mjs` — NEW
- `docs/templates/payer-evidence-template.md` — NEW
- `apps/web/src/app/cprs/admin/rcm/page.tsx` — add Evidence tab
- `docs/runbooks/phase112-evidence-gating.md` — NEW
