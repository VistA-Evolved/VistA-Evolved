# Wave 9 Integrity Audit — Implementation

## User Request
Comprehensive 3-tier "progressive sanity and integrity check" on Wave 9 (Phases 274-281, commit 9792fc6).
Mandate: fix all issues found including pre-existing cosmetic defects.

## Issues Identified

### MODERATE (wiring gaps)
| ID | Description |
|----|-------------|
| M1 | HL7 barrel (`hl7/index.ts`) missing re-exports for fhir-bridge, channel-health, outbound-builder |
| M2 | No HTTP routes consume 3 new HL7 modules (fhir-bridge, channel-health, outbound-builder) |
| M3 | `migration-routes.ts` missing imports and routes for fhir-bundle-parser, ccda-parser, reconciliation, migration-orchestrator |
| M4 | `channel-health` endpointMetrics Map not in store-policy |
| M5 | `read-through.ts` exports not in PG barrel (`platform/pg/index.ts`) |

### MINOR (token divergence)
| ID | Description |
|----|-------------|
| N1 | CSS `:root` had 22 variables vs 32 in theme-tokens.ts — missing 10+ tokens |

### PRE-EXISTING (cosmetic / code quality)
| ID | Description |
|----|-------------|
| P1 | MenuBar.module.css: 4 hardcoded hex colors |
| P2 | cprs.module.css: 7 badge styles with hardcoded hex colors |
| P3 | panels.module.css: 2 listBadge hardcoded background colors |
| P4 | page.module.css: 1 hardcoded #ffffff background |
| P5 | fhir-bridge.ts: 2 unnecessary `(resource as any).id` casts |
| P6 | store-policy.ts: 3 missing entries (pack-registry, mllp-client-pool, mllp-connections) |

## Implementation Steps

1. **M1** — Add 3 re-export lines to `apps/api/src/hl7/index.ts`
2. **M2** — Wire 5 new routes into `apps/api/src/routes/hl7-engine.ts` (channel-health GET, fhir conversions GET, fhir convert POST, outbound types GET, outbound build POST)
3. **M3** — Wire 10 new routes into `apps/api/src/migration/migration-routes.ts` (fhir resource-types, fhir-bundle import, ccda sections, ccda import, reconcile, reconcile verify, dependency-order, plan, execute)
4. **M4** — Add `hl7-channel-health` store entry to `store-policy.ts`
5. **M5** — Add readThroughGet, readThroughList, hydrateMapsFromPg, HydrateTask to PG barrel
6. **N1** — Expand `:root` and `[data-theme='dark']` from 22 to 48 CSS variables, adding all missing tokens from theme-tokens.ts
7. **P1** — Replace 4 MenuBar.module.css hardcoded hex with `var(--cprs-text-muted, #xxx)`
8. **P2** — Replace 7 cprs.module.css badge hardcoded hex with `var(--cprs-xxx, #fallback)`
9. **P3** — Replace 2 panels.module.css listBadge bg with `var(--cprs-badge-xxx, #fallback)`
10. **P4** — Replace page.module.css `#ffffff` with `var(--cprs-content-bg, #ffffff)`
11. **P5** — Remove `as any` casts from fhir-bridge.ts lines 196/198
12. **P6** — Add 3 store-policy entries: hl7-pack-registry, hl7-mllp-client-pool, hl7-mllp-connections

## Files Touched
- `apps/api/src/hl7/index.ts` — barrel re-exports
- `apps/api/src/routes/hl7-engine.ts` — 5 new routes (~90→234 lines)
- `apps/api/src/migration/migration-routes.ts` — 10 new routes
- `apps/api/src/platform/store-policy.ts` — 4 new store entries
- `apps/api/src/platform/pg/index.ts` — read-through barrel exports
- `apps/api/src/hl7/fhir-bridge.ts` — remove `as any`
- `apps/web/src/components/cprs/cprs.module.css` — 48 CSS vars + badge token fix
- `apps/web/src/components/chart/MenuBar.module.css` — 4 hex→var()
- `apps/web/src/components/chart/panels/panels.module.css` — 2 hex→var()
- `apps/web/src/app/chart/[dfn]/[tab]/page.module.css` — 1 hex→var()

## Verification
- `pnpm -C apps/api exec tsc --noEmit` — CLEAN (0 errors)
- IDE error scan on all 10 modified files — 0 code errors
