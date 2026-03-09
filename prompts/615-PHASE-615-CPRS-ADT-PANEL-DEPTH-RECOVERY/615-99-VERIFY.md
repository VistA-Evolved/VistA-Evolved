# Phase 615 — VERIFY: CPRS ADT Panel Depth Recovery

## Verification Steps

1. Confirm Docker prerequisites and API health:
- `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
- `curl.exe -s http://127.0.0.1:3001/health`
- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate with the VEHU sandbox account and call the ADT routes used by the recovered panel:
- `GET /vista/adt/wards`
- `GET /vista/adt/census`
- `GET /vista/adt/census?ward=...`
- `GET /vista/adt/movements?dfn=46`
3. Start the web app and open `/cprs/chart/46/adt`.
4. Verify the chart tab renders the recovered panel without runtime errors.
5. Verify the panel surfaces the deeper ADT views added in this phase and that at least one view loads real data or an honest integration-pending response from the live API.
6. Run `pnpm -C apps/web exec tsc --noEmit`.
7. Update runbook and ops artifacts with the live verification evidence.

## Acceptance Criteria

- The CPRS ADT chart tab exposes more than the original Phase 67 list-only views.
- The panel consumes the existing `/vista/adt/census` and `/vista/adt/movements` routes.
- DG write actions remain explicitly pending and grounded instead of being presented as complete.
- Web TypeScript passes.
- Manual browser verification on the real chart route is completed.
- Documentation and ops artifacts reflect the recovery.
