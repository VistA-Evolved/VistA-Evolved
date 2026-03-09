# Phase 602 - Portal Export Truthfulness Recovery - VERIFY

## Verification Steps

1. Reconfirm Docker, API, and VistA health before testing exports.
2. Log in through `POST /portal/auth/login` with the portal fixture account.
3. Call `GET /portal/health/immunizations` and `GET /portal/health/labs` to
   capture the live portal-side data posture for the patient.
4. Call `GET /portal/export/section/immunizations` and verify the generated
   PDF text no longer says "integration pending" when the live route is simply empty.
5. Call `POST /portal/record/export` for immunizations and labs and verify the
   response `pendingTargets` reflects actual pending state, not the old
   hardcoded immunization placeholder.
6. Run TypeScript validation for the API and portal workspaces.
7. Regenerate prompt metadata after adding the Phase 602 prompt pack.
8. Run `scripts/verify-latest.ps1` from the repo root.

## Acceptance Criteria

- Portal immunizations export uses the live immunization path.
- Portal labs export uses the live labs path.
- Empty live sections say "no records on file" instead of false integration-pending copy.
- Genuine pending/unavailable sections still surface pending targets truthfully.
- Record portability no longer hardcodes immunizations as pending.
- API typecheck passes.
- Portal typecheck passes.
- Repo verification returns green.