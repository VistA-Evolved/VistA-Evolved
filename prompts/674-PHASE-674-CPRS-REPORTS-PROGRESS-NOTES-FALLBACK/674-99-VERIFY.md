# Phase 674 - CPRS Reports Progress Notes Fallback Verify

## Verification Steps
1. Confirm Docker and the VEHU-backed API are running cleanly.
2. Log in with `PRO1234 / PRO1234!!`.
3. Call `GET /vista/reports?dfn=46` and confirm the catalog still includes the live `Progress Notes` report entry.
4. Call `GET /vista/reports/text?dfn=46&id=OR_PN` and confirm the response returns `ok:true` with non-empty text plus fallback provenance.
5. Call `GET /vista/notes?dfn=46` and `GET /vista/tiu-text?id=727` to confirm the fallback content is grounded in live TIU data.
6. Open `http://127.0.0.1:3000/cprs/chart/46/reports`, select `Progress Notes`, and confirm the viewer shows note content instead of the empty-report message.

## Acceptance Criteria
- `GET /vista/reports/text?dfn=46&id=OR_PN` no longer returns `ok:true` with an empty `text` field when live TIU notes are available.
- The response clearly reports fallback provenance instead of pretending `ORWRP REPORT TEXT` alone returned useful content.
- The Reports browser tab shows readable Progress Notes content for DFN 46.
- Existing Health Summary, date-range, local-only, and non-empty report behavior remains unchanged.