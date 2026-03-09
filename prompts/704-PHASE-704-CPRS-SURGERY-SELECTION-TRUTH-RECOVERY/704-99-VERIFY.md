# Phase 704 - CPRS Surgery Selection Truth Recovery Verification

## Verification goals

1. Prove the live `/vista/surgery` route response for the chart patient.
2. Prove the Surgery panel no longer preserves stale surgery rows after refreshes or patient changes.
3. Confirm the panel still renders correctly with the current live surgery payload.

## Verification steps

1. Verify Docker and API health.
   - `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
   - `curl.exe -s http://127.0.0.1:3001/health`
   - `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate if needed with `PRO1234 / PRO1234!!`.
3. Fetch the live route:
   - `curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/surgery?dfn=46"`
4. Open `/cprs/chart/46/surgery` and confirm the UI matches the live route result.
5. If a patient with surgery rows is available, select a case, refresh or switch patients, and confirm stale rows and stale detail do not remain when the selected case disappears from the live list.
6. Run editor diagnostics for the touched files.

## Expected result

- The Surgery panel only shows the current live surgery rows.
- If the selected case is no longer present, the detail pane clears.
- No stale client-side surgery list survives when the live VistA list is empty.