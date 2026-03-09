# Phase 632 — CPRS Cover Sheet Read Resilience Recovery

## User Request

- Continue autonomously until the CPRS UI behaves like a production clinical system.
- Keep the implementation VistA-first, inspect prompt lineage before editing, and avoid fake completion states.
- Recover Cover Sheet cards that still drift into pending state because their underlying live routes are transport-fragile.

## Scope

- Restore resilient live reads for Cover Sheet vitals and recent notes.
- Ensure Cover Sheet cards only show pending posture when the live route actually fails, not because of fragile raw broker transport.
- Reuse the same route recovery pattern already applied to Surgery, D/C Summaries, and Labs.

## Prompt Lineage

- Phase 12 parity wiring
- Phase 606 — Cover Sheet cache truthfulness recovery
- Phase 610 — CPRS Phase 12 parity panel truthfulness recovery
- Phase 628 — Nursing data normalization recovery

## Inventory

- Inspected route: `apps/api/src/server/inline-routes.ts` (`GET /vista/vitals`, `GET /vista/notes`)
- Inspected Cover Sheet rendering: `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`
- Verified live failures/successes against VEHU for DFN 46 before editing

## Implementation Steps

1. Confirm the live VEHU posture for `GET /vista/vitals?dfn=46` and `GET /vista/notes?dfn=46`.
2. Replace raw broker calls in both list routes with `safeCallRpc(...)`.
3. Preserve existing parsing and successful payload contracts.
4. Return explicit `request-failed` metadata and pending targets so the Cover Sheet cards can remain truthful on failure.
5. Restart the API and re-verify the live routes plus the Cover Sheet browser state.

## Files To Change

- `apps/api/src/server/inline-routes.ts`
- `prompts/632-PHASE-632-CPRS-COVERSHEET-READ-RESILIENCE-RECOVERY/632-01-IMPLEMENT.md`
- `prompts/632-PHASE-632-CPRS-COVERSHEET-READ-RESILIENCE-RECOVERY/632-99-VERIFY.md`

## Verification Notes

- Check `/ready` before browser verification.
- Call both live routes with an authenticated clinician session.
- Reload `http://127.0.0.1:3000/cprs/chart/46/cover` and confirm Vitals and Recent Notes align with the live route posture.