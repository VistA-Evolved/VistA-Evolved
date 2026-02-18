# Phase 31 IMPLEMENT -- Patient-Directed Sharing + Exports + SHC Lane

## User request
PHASE 31 -- PATIENT-DIRECTED SHARING + EXPORTS (Share-code lane + SHC lane)

A) Share-code lane (web)
- TTL configurable (default <= 60 min), one-time redeem, DOB verification
- Invalidate after 3 wrong DOB attempts
- CAPTCHA stub (no provider yet)
- Curated subset only: meds, allergies, problems, immunizations, results
- Audit everything (issue/redeem/view)

B) Export lane
- PDF clinical summary export (patient readable)
- Structured JSON for portability (later IPS/FHIR mapping)

C) SMART Health Cards (feature-flagged)
- SHC export for selected datasets (e.g., immunizations)
- Minimal spec adapter
- Read-only, patient-initiated only

D) VistA-first data sourcing
E) Docs: runbook + threat model

## Implementation steps
1. Inventory existing portal, audit, clinical data services
2. Create sharing types + share-code store (issue/redeem/invalidate)
3. Create export service (PDF via HTML template, JSON structured)
4. Create SHC adapter (feature-flagged, minimal spec)
5. Create sharing + export routes (portal-scoped)
6. Create portal UI pages (share, export, SHC)
7. Wire into index.ts + security middleware
8. TSC check all 3 projects
9. Docs: runbook, threat model, AGENTS.md updates
10. Commit

## Verification steps
- TSC clean across api, web, portal
- All files exist and compile
- Share codes use crypto randomBytes, DOB hashing, constant-time compare
- Audit trail for all share actions
- SHC behind feature flag
- No raw backend dumps in exports

## Files touched
- apps/api/src/sharing/ (new directory)
- apps/api/src/routes/sharing-routes.ts (new)
- apps/portal/src/app/dashboard/sharing/ (new)
- apps/portal/src/app/dashboard/export/ (new)
- apps/portal/src/lib/api.ts (modified)
- apps/api/src/services/portal-audit.ts (modified)
- apps/api/src/index.ts (modified)
- apps/api/src/middleware/security.ts (modified)
- docs/runbooks/phase31-sharing-and-exports.md (new)
- docs/security/sharing-threat-model.md (new)
- AGENTS.md (modified)
- ops/phase31-summary.md (new)
- ops/phase31-notion-update.json (new)
