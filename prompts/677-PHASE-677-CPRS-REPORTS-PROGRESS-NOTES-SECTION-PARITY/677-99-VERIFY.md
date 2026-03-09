# Phase 677 - CPRS Reports Progress Notes Section Parity (VERIFY)

## Verification Steps

1. Confirm Docker and API readiness before retesting:
- `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
- `curl.exe -s http://127.0.0.1:3001/health`

2. Log in with `PRO1234 / PRO1234!!` and call:
- `GET /vista/reports?dfn=46`

3. Verify the catalog response still includes:
- a real `Progress Notes` report row (`id=OR_PN`)
- a dedicated `Progress Notes` section (`id=OR_PNMN`)
- a corrected `sectionId` / `sectionLabel` for the `OR_PN` report row

4. Open `http://127.0.0.1:3000/cprs/chart/46/reports` and verify:
- `Progress Notes` is grouped under the dedicated `Progress Notes` section instead of `Graphing (local only)`
- selecting `Progress Notes` still loads the existing TIU-backed fallback content truthfully

5. Re-test one normal Graphing report and one local-only report to ensure the section recovery does not break other report categories.

6. Confirm touched files have no new workspace diagnostics.

## Acceptance Criteria

- The live reports catalog maps `OR_PN` to the `Progress Notes` section.
- The browser Reports tree shows `Progress Notes` under a dedicated `Progress Notes` heading.
- Selecting `Progress Notes` still renders truthful report content or fallback provenance.
- Graphing and local-only report behavior is unchanged except for the corrected grouping.