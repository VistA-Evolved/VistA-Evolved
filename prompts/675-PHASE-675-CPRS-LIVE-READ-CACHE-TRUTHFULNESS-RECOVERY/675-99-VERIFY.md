# Phase 675 - VERIFY: CPRS Live Read Cache Truthfulness Recovery

## Verification Steps

1. Confirm the web files compile cleanly after the fetch-path changes.
2. Open a fresh authenticated browser session to `/cprs/chart/46/cover`.
3. Compare the Cover Sheet cards against live authenticated API responses for:
   - `/vista/medications?dfn=46`
   - `/vista/notes?dfn=46`
   - `/vista/labs?dfn=46`
   - `/vista/immunizations?dfn=46`
   - `/vista/cprs/reminders?dfn=46`
4. Verify the Cover Sheet no longer renders stale medication, note, lab, immunization, or reminder content from older browser-cached responses.
5. Verify the standalone Immunizations panel reflects the same live response posture as `/vista/immunizations?dfn=46`.

## Acceptance Criteria

- The browser live-read path uses fresh responses instead of stale cached payloads.
- Cover Sheet panels align with the current authenticated API responses in the same session.
- Immunizations panel and Cover Sheet immunizations card show the same current live posture.
- No new TypeScript or lint errors are introduced in the touched files.