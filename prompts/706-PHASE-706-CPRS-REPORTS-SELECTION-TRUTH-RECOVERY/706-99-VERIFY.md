# Phase 706 - CPRS Reports Selection Truth Recovery Verification

## Verification goals

1. Prove the live `/vista/reports` route response for the chart patient.
2. Prove the Reports panel no longer preserves stale report or qualifier state after live catalog changes or patient changes.
3. Confirm the panel still renders correctly with the current live reports catalog.

## Verification steps

1. Verify Docker and API health.
   - `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
   - `curl.exe -s http://127.0.0.1:3001/health`
   - `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate if needed with `PRO1234 / PRO1234!!`.
3. Fetch the live route:
   - `curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/reports?dfn=46"`
4. Open `/cprs/chart/46/reports` and confirm the catalog renders from the live route.
5. Select a report and qualifier, then refresh or switch patients and confirm stale report text does not remain if the selected report or qualifier is no longer valid.
6. Run editor diagnostics for the touched files.

## Expected result

- The Reports panel only shows the current live report selection and qualifier context.
- If the selected report disappears or the qualifier is no longer valid, the rendered report text clears.
- No stale report context survives a live catalog change.