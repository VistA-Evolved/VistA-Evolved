# Phase 611 — CPRS Reports Tree + Qualifier Parity (VERIFY)

## Verification Steps

1. Confirm `vehu` and `ve-platform-db` are running and healthy.
2. Confirm the API starts cleanly and `/health` plus `/vista/ping` return `ok:true`.
3. Validate the touched code with TypeScript or diagnostics for the affected files.
4. Login with the VEHU clinician account and fetch `GET /vista/reports?dfn=46`.
5. Verify the response exposes enough metadata for grouped report rendering and qualifier-aware selection.
6. Fetch a date-range report with a CPRS-style qualifier token and confirm `ok:true` plus `rpcUsed:"ORWRP REPORT TEXT"`.
7. Fetch a Health Summary report with a CPRS-style qualifier token and confirm the route parses it without dropping the token on the floor.
8. Verify the Reports panel still shows truthful pending posture if the catalog cannot be trusted.
9. Run `scripts/verify-latest.ps1` and require a passing result.
10. Update runbook and ops artifacts to Phase 611 only after the live checks pass.

## Acceptance Criteria

- Reports UI is no longer limited to a flat list when the backend has grouped report metadata.
- Date-range reports can be selected with a real qualifier path instead of a blind text fetch.
- Health Summary report selection is grounded in VistA qualifier data.
- `GET /vista/reports/text` remains VistA-first and uses `ORWRP REPORT TEXT`.
- Documentation reflects the real qualifier contract.
- Repo verification passes after the implementation.
