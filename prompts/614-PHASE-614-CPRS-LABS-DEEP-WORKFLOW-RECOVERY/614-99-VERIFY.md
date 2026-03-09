# Phase 614 — VERIFY: CPRS Labs Deep Workflow Recovery

## Verification Steps

1. Confirm VEHU and platform DB containers are running.
2. Start the API with `npx tsx --env-file=.env.local src/index.ts` from `apps/api` and verify `/health` and `/vista/ping` return `ok: true`.
3. Log in as `PRO1234 / PRO1234!!` and fetch `GET /vista/labs?dfn=46`.
4. Call `GET /lab/orders`, `GET /lab/specimens`, `GET /lab/critical-alerts`, `GET /lab/dashboard`, and `GET /lab/writeback-posture` with the authenticated clinician session.
5. Submit a lab order via `POST /vista/cprs/orders/lab` and confirm the UI shows either a real VistA order or an honest draft/pending posture.
6. If a local lab order exists, exercise specimen creation and at least one specimen transition through the Phase 393 endpoints.
7. If critical alerts exist, acknowledge and resolve one through the API and confirm the Labs tab reflects the updated state.
8. Run TypeScript validation for `apps/web`.
9. Regenerate the phase index and generated phase QA specs if prompt metadata changed.
10. Run `scripts/verify-latest.ps1` and record the outcome.

## Acceptance Criteria

- The Labs tab exposes more than read-only results and uses the existing backend workflow surfaces.
- No action claims VistA writeback when the backend returned draft, pending, or unsupported status.
- Orders, specimens, alerts, and posture are visible from the CPRS Labs experience.
- Live verification commands were run against the current API and VEHU environment.
- Runbook, parity report, and ops artifacts reflect the recovered Labs workflow truthfully.