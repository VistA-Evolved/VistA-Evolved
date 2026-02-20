# Phase 40 (Superseding) -- Global RCM Connectivity Foundation

## Request
Build a comprehensive, VistA-first Global Claims / RCM Connectivity Foundation that supersedes the
initial Phase 40 payer connectivity work. This expands coverage to 5 countries (US, PH, AU, SG, NZ),
adds 6 new integration-ready connectors, VistA binding points, job queue, importer framework,
country-specific claim validation rules, and UI enhancements.

## Implementation Steps

### A. Inventory existing RCM code
- Created `docs/rcm/phase40-inventory.md` with complete analysis of all existing files, routes, types, and gaps.

### B. Canonical models + event flow
- Created `apps/api/src/rcm/jobs/queue.ts` -- job queue with 5 types, dead-letter, retry, idempotency
- Created `apps/api/src/rcm/importers/payer-catalog-importer.ts` -- CSV + JSON importer interfaces

### C. Expanded payer registry
- Rewrote `data/payers/ph_hmos.json` to 28 payers (PhilHealth + 27 Insurance Commission HMOs)
- Created `data/payers/au_core.json` (7 AU payers including Medicare, DVA)
- Created `data/payers/sg_core.json` (6 SG payers including NPHC)
- Created `data/payers/nz_core.json` (4 NZ payers including ACC)
- Updated `payer.ts` PayerCountry type and `registry.ts` to load all 5 seed files

### D. Connector framework expansion
- Created `officeally-connector.ts` -- OfficeAlly SFTP+HTTPS (US)
- Created `availity-connector.ts` -- Availity OAuth2 (US)
- Created `stedi-connector.ts` -- Stedi API (US, feature-flagged)
- Created `eclipse-au-connector.ts` -- ECLIPSE PRODA+PKI (AU)
- Created `acc-nz-connector.ts` -- ACC REST/OAuth2 (NZ)
- Created `nphc-sg-connector.ts` -- NPHC CorpPass (SG)
- Registered all 6 in rcm-routes.ts (total: 10 connectors)

### E. VistA-first binding points
- Created `vistaBindings/encounter-to-claim.ts` -- PCE encounter to Claim mapping
- Created `vistaBindings/era-to-vista.ts` -- ERA/835 to VistA AR posting
- Created `vistaBindings/charge-capture.ts` -- Unbilled encounter detection
- Created `vistaBindings/index.ts` -- barrel export

### F. API routes expansion
- Added job queue routes: /rcm/jobs, /rcm/jobs/stats, /rcm/jobs/:id, /rcm/jobs/enqueue, /rcm/jobs/:id/cancel
- Added JSON payer import: /rcm/payers/import/json
- Added connector capabilities: /rcm/connectors/capabilities
- Added VistA bindings: /rcm/vista/encounter-to-claim, /rcm/vista/charge-candidates, /rcm/vista/era-post

### G. UI enhancements
- Added AU/SG/NZ country filters to Payer Registry tab
- Added Job Queue stats to Connectors & EDI tab
- Updated header branding to "Global RCM"

### H. Claim scrubber enhancement
- Added 5 country-specific validation rules (CTY-001 through CTY-005)
- PhilHealth PIN check, AU Medicare card format, NZ ACC injury data
- Connector readiness check, US NPI format validation

### I. Verification script
- Created `scripts/verify-phase40-global-rcm.ps1` with 71 gates

### J. Documentation
- Created `docs/runbooks/rcm-global-connectivity.md`
- Created this prompt file

## Verification
```powershell
.\scripts\verify-phase40-global-rcm.ps1
.\scripts\verify-phase38-rcm.ps1           # regression
.\scripts\verify-phase39-billing-grounding.ps1  # regression
```

## Files touched
- apps/api/src/rcm/rcm-routes.ts (import + register connectors, add routes)
- apps/api/src/rcm/domain/payer.ts (PayerCountry expansion)
- apps/api/src/rcm/payer-registry/registry.ts (load new seed files)
- apps/api/src/rcm/validation/engine.ts (country-specific rules)
- apps/web/src/app/cprs/admin/rcm/page.tsx (UI enhancements)
- data/payers/ph_hmos.json (28 PH payers)
- data/payers/au_core.json (NEW)
- data/payers/sg_core.json (NEW)
- data/payers/nz_core.json (NEW)
- apps/api/src/rcm/jobs/queue.ts (NEW)
- apps/api/src/rcm/importers/payer-catalog-importer.ts (NEW)
- apps/api/src/rcm/connectors/officeally-connector.ts (NEW)
- apps/api/src/rcm/connectors/availity-connector.ts (NEW)
- apps/api/src/rcm/connectors/stedi-connector.ts (NEW)
- apps/api/src/rcm/connectors/eclipse-au-connector.ts (NEW)
- apps/api/src/rcm/connectors/acc-nz-connector.ts (NEW)
- apps/api/src/rcm/connectors/nphc-sg-connector.ts (NEW)
- apps/api/src/rcm/vistaBindings/encounter-to-claim.ts (NEW)
- apps/api/src/rcm/vistaBindings/era-to-vista.ts (NEW)
- apps/api/src/rcm/vistaBindings/charge-capture.ts (NEW)
- apps/api/src/rcm/vistaBindings/index.ts (NEW)
- scripts/verify-phase40-global-rcm.ps1 (NEW)
- docs/runbooks/rcm-global-connectivity.md (NEW)
- docs/rcm/phase40-inventory.md (NEW)
