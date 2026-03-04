# Phase 130 -- VERIFY: VistA MailMan Bridge

## Verification Steps

### Gate 1: Files exist

- [ ] `apps/api/src/routes/vista-mailman.ts` exists
- [ ] `apps/api/src/routes/portal-mailman.ts` exists

### Gate 2: TypeScript passes

- [ ] `pnpm -C apps/api exec tsc --noEmit` clean

### Gate 3: Route registration

- [ ] Routes registered in `apps/api/src/index.ts`
- [ ] AUTH_RULES cover `/vista/mailman/` (session) and `/portal/mailman/` (portal auth)

### Gate 4: Clinician mailman endpoints

- [ ] GET `/vista/mailman/inbox` returns `{ok, source, messages}`
- [ ] GET `/vista/mailman/message/:ien` returns `{ok, source, message}`
- [ ] POST `/vista/mailman/send` returns `{ok}` with VistA sync status

### Gate 5: Portal mailman endpoints

- [ ] GET `/portal/mailman/inbox` returns VistA data or local fallback
- [ ] Response includes `source` field ("vista" or "local")

### Gate 6: Audit

- [ ] Messaging access logged in immutable audit
- [ ] Message bodies NOT in audit entries

### Gate 7: Portal UI

- [ ] Messages page shows source badge (VistA vs Local)
- [ ] Fallback labeled "Local Mode"

## Files Touched

- `apps/api/src/routes/vista-mailman.ts`
- `apps/api/src/routes/portal-mailman.ts`
- `apps/api/src/index.ts`
- `apps/portal/src/app/dashboard/messages/page.tsx`
- `apps/portal/src/lib/api.ts`
