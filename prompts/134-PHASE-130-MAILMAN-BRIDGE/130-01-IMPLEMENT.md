# Phase 130 -- IMPLEMENT: VistA MailMan Bridge (ZVEMSGR RPC + Portal VistA-first Inbox)

## Goal
Make portal messaging truly VistA-backed with Postgres durable fallback labeled "local mode".

## Work
1. Add `/vista/mailman/*` API routes (clinician-facing) wrapping existing ZVEMSGR.m RPCs
2. Add `/portal/mailman/*` API routes (patient-facing) for VistA-first inbox with fallback
3. Update portal Messages UI to try VistA-backed inbox first, fall back to Postgres with clear label
4. Audit: log access in HIPAA + immutable audit; redact message bodies from all logs
5. Register route in index.ts, ensure AUTH_RULES coverage

## Files Touched
- `prompts/134-PHASE-130-MAILMAN-BRIDGE/130-01-IMPLEMENT.md` (this file)
- `prompts/134-PHASE-130-MAILMAN-BRIDGE/130-99-VERIFY.md`
- `apps/api/src/routes/vista-mailman.ts` (new -- clinician mailman routes)
- `apps/api/src/routes/portal-mailman.ts` (new -- portal VistA-first inbox)
- `apps/api/src/index.ts` (register new routes)
- `apps/portal/src/app/dashboard/messages/page.tsx` (VistA-first inbox UI)
- `apps/portal/src/lib/api.ts` (new fetch helpers)
- `ops/summary.md`
- `ops/notion-update.json`

## Verification
- `pnpm -C apps/api exec tsc --noEmit` clean
- `curl /vista/mailman/inbox` returns structured response
- `curl /portal/mailman/inbox` returns VistA data or local fallback label
- Portal Messages page shows source badge (VistA vs Local)
