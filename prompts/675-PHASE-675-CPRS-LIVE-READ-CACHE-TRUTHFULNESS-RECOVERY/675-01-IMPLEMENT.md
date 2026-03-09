# Phase 675 - IMPLEMENT: CPRS Live Read Cache Truthfulness Recovery

## User Request

- Continue the live clinician audit until the CPRS UI behaves like a truthful production system.
- Keep the implementation VistA-first and repair real frontend/backend defects rather than accepting stale or misleading chart state.

## Problem

- Fresh Cover Sheet loads can render older clinical payloads than the live API now returns.
- The browser session showed stale medication, notes, and labs content on the Cover Sheet even while direct authenticated fetches against the same API routes returned newer live data.
- This creates a clinician-facing truthfulness defect: the UI can display cached historical responses instead of the current VistA-backed state.

## Inventory

- Inspected: `apps/web/src/lib/fetch-with-correlation.ts`
- Inspected: `apps/web/src/stores/data-cache.tsx`
- Inspected: `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`
- Inspected: `apps/web/src/components/cprs/panels/ImmunizationsPanel.tsx`
- Inspected: `apps/api/src/server/inline-routes.ts`
- Verified in browser: `/cprs/chart/46/cover`
- Verified live API routes: `/vista/medications`, `/vista/notes`, `/vista/labs`, `/vista/immunizations`, `/vista/cprs/reminders`

## Implementation Steps

1. Make the shared correlated browser fetch path default to uncached (`no-store`) for live clinical GETs unless a caller explicitly overrides it.
2. Remove the Cover Sheet's local bare-fetch helper and route its custom read calls through the shared correlated fetch path so it inherits the same no-store behavior as the cache-backed domains.
3. Align the standalone Immunizations panel read path with the same uncached fetch contract so it cannot drift from live API truth.
4. Tighten the medications route fallback so concurrent Cover Sheet load bursts can retry the order-derived recovery path once before settling on an empty list.
5. Keep existing response contracts and UI semantics unchanged apart from ensuring the browser uses fresh live responses.
6. Re-verify in a fresh authenticated Cover Sheet session that panel content matches the live API responses.

## Files Touched

- `prompts/675-PHASE-675-CPRS-LIVE-READ-CACHE-TRUTHFULNESS-RECOVERY/675-01-IMPLEMENT.md`
- `prompts/675-PHASE-675-CPRS-LIVE-READ-CACHE-TRUTHFULNESS-RECOVERY/675-99-VERIFY.md`
- `apps/web/src/lib/fetch-with-correlation.ts`
- `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`
- `apps/web/src/components/cprs/panels/ImmunizationsPanel.tsx`
- `apps/api/src/server/inline-routes.ts`
- `docs/runbooks/vista-rpc-phase12-parity.md`
- `ops/summary.md`