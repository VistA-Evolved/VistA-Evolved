# Phase 324 — W14-P8: Integration Marketplace & Registry

## User Request

Build a marketplace/registry for discovering, publishing, installing, and
managing integration packages (connectors, templates, adapters).

## Implementation Steps

1. **Service layer** (`services/integration-marketplace.ts`):
   - MarketplaceCategory: taxonomy for discovery (HL7v2, X12, FHIR, Imaging, RCM, Transport)
   - MarketplaceListing: published packages with SemVer versions, ratings, install counts
   - ListingReview: community ratings (1-5) with average recalculation
   - ListingInstall: per-tenant install tracking with status lifecycle
   - Search: full-text across name/description/tags + filters (type, category, status, tag, publisher)
   - Seed catalog: 6 built-in VistA-Evolved integrations pre-published

2. **Routes** (`routes/marketplace.ts`):
   - Categories: POST create, GET list
   - Listings: POST create, GET list/search, GET :id (by ID or slug), POST version, POST status
   - Reviews: POST add, GET list
   - Installs: POST install, POST uninstall, GET list, GET :id
   - Stats: GET /marketplace/stats

3. **Wiring**:
   - register-routes.ts: import + server.register
   - security.ts: `/marketplace/` → session (reads available to all authenticated users)
   - store-policy.ts: 4 entries (categories/registry, listings/registry, reviews/cache, installs/critical)

## Verification Steps

- `npx tsc --noEmit` — zero errors
- 17 endpoints registered
- Seed catalog: 6 categories + 6 listings with v1.0.0 published
- Install/uninstall lifecycle works with count tracking

## Files Touched

- `apps/api/src/services/integration-marketplace.ts` (NEW)
- `apps/api/src/routes/marketplace.ts` (NEW)
- `apps/api/src/server/register-routes.ts` (MODIFIED)
- `apps/api/src/middleware/security.ts` (MODIFIED)
- `apps/api/src/platform/store-policy.ts` (MODIFIED)
