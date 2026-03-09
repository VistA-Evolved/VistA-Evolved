# Phase 705 - CPRS D/C Summary Selection Truth Recovery Verification

## Verification goals

1. Prove the live `/vista/dc-summaries` route response for the chart patient.
2. Prove the D/C Summary panel no longer preserves stale summary text after refreshes or patient changes.
3. Confirm the panel still renders correctly with the current live D/C summary payload.

## Verification steps

1. Verify Docker and API health.
   - `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
   - `curl.exe -s http://127.0.0.1:3001/health`
   - `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate if needed with `PRO1234 / PRO1234!!`.
3. Fetch the live route:
   - `curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/dc-summaries?dfn=46"`
4. Open `/cprs/chart/46/dcsumm` and confirm the UI matches the live route result.
5. If a patient with D/C summary rows is available, select a summary, refresh or switch patients, and confirm stale text does not remain when the selected summary disappears from the live list.
6. Run editor diagnostics for the touched files.

## Expected result

- The D/C Summary panel only shows the current live summary selection and text.
- If the selected summary is no longer present, the text pane clears.
- No stale full-text carryover survives when the live TIU summary list is empty.