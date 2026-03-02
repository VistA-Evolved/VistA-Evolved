# Phase 541 — VA GUI Hybrids Capability Map (Wave 39, P11)

## Objective
Create a machine-readable cross-reference map of all VA/IHS desktop GUI
applications (CPRS, BCMA, VistA Imaging, MHA, VSE, CP/MD, JLV, VistAWeb, CDSP,
etc.) and their feature overlap / migration readiness with VistA-Evolved.

For each hybrid: thick-client origin, browser-replacement status, RPC overlap,
feature-gap list, migration readiness score.

## Artifacts

### 1. Builder script — `scripts/ui-estate/build-hybrids-map.mjs`
Cross-references:
- `data/ui-estate/va-ui-estate.json` (24 VA + 4 IHS systems, 103 surfaces)
- `docs/vista-alignment/rpc-coverage.json` (1016 tracked RPCs)
- `config/capabilities.json` (177 capabilities)
- `docs/grounding/parity-matrix.json` (975 CPRS Delphi RPCs)

Computes per-hybrid:
- `hostPlatform`: delphi | java | dotnet | web | electron
- `deploymentModel`: thick-client | browser | hybrid | api-only
- `authMechanism`: xwb-rpc | saml | oauth2 | iam-sts
- `migrationStrategy`: replace | wrap | coexist | deprecate
- RPC overlap (wired in VE) vs RPC gap (not yet wired)
- Capability overlap from capabilities.json
- Migration readiness score (0-100)

### 2. Data file — `data/ui-estate/va-gui-hybrids-map.json`
Generated output. Committed.

### 3. API route — `apps/api/src/routes/hybrids/index.ts`
- `GET /vista/hybrids/map` — full hybrid cross-reference map
- `GET /vista/hybrids/summary` — rollup with per-system scores

### 4. Admin UI — new Hybrids tab on integrations console
Shows per-system card with overlap %, migration readiness, RPC coverage bar.

### 5. Capabilities — `config/capabilities.json`
- `migration.hybrids.map` (live)
- `migration.hybrids.summary` (live)

### 6. Store policy
- `hybrids-map-cache`

## Files touched
- `scripts/ui-estate/build-hybrids-map.mjs` (NEW)
- `data/ui-estate/va-gui-hybrids-map.json` (NEW, generated)
- `apps/api/src/routes/hybrids/index.ts` (NEW)
- `apps/api/src/server/register-routes.ts` (wire route)
- `apps/web/src/app/cprs/admin/integrations/page.tsx` (add Hybrids tab)
- `config/capabilities.json` (2 new entries)
- `config/modules.json` (route pattern)
- `apps/api/src/platform/store-policy.ts` (1 entry)
