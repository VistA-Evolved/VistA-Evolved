# Phase 390 — W22-P2 VERIFY: Clinical Content Pack Framework v2

## Verification Steps

1. `tsc --noEmit` clean for API
2. Content pack routes registered in register-routes.ts
3. AUTH_RULES cover /content-packs/ (admin for mutate, session for read)
4. Store policy has 7 content-pack entries
5. Install + rollback lifecycle produces correct events

## Acceptance Criteria

- [ ] types.ts defines: OrderSet, Flowsheet, InboxRule, Dashboard, CdsRule, ContentPackV2, PackInstallEvent
- [ ] pack-store.ts has CRUD for all 5 content types + install/rollback
- [ ] pack-routes.ts has endpoints: preview, install, rollback, list, history, stats, CRUD
- [ ] Barrel index.ts exports all public API
- [ ] Build clean (0 errors)
- [ ] Forked items survive rollback (non-forked deleted)
