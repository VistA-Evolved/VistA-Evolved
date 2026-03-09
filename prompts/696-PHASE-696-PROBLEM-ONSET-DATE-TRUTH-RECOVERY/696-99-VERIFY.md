# Phase 696 - Problem Onset Date Truth Recovery Verify

## Verification Steps
1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `GET /vista/problems?dfn=46` and confirm onset dates do not contain impossible day `00` output.
3. Open `/cprs/chart/46/cover` and confirm the Problems section no longer renders impossible onset dates.
4. Open `/cprs/chart/46/problems` and confirm the same onset date formatting is preserved there.
5. If portal problem health output is used elsewhere, confirm `/portal/health/problems` follows the same normalization.
6. Run diagnostics or compile checks for the edited files.

## Acceptance Criteria
- No user-facing problem onset date renders as `YYYY-MM-00`.
- Partial FileMan dates remain truthful rather than being coerced into fake full dates.
- Clinician and portal problem parsing stay aligned.
- Edited files remain error-free.

## Evidence
- Browser proof on Cover Sheet and Problems.
- Route proof from `/vista/problems?dfn=46`.
- Diagnostics or compile proof.
