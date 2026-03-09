# Phase 612 - CPRS Surgery Detail + Operative Report Parity (VERIFY)

## Verification Steps

1. Confirm `vehu` and `ve-platform-db` are running and healthy.
2. Confirm the API starts cleanly and `/health` plus `/vista/ping` return `ok:true`.
3. Validate the touched surgery files with TypeScript or diagnostics.
4. Login with the VEHU clinician account and fetch `GET /vista/surgery?dfn=46`.
5. Fetch the new surgery detail route for a real returned case id.
6. Confirm the response includes `rpcUsed` showing `ORWSR ONECASE` and, when linked TIU content exists, `TIU GET RECORD TEXT` and `TIU DETAILED DISPLAY`.
7. Confirm the Surgery panel no longer shows a hardcoded operative-report integration-pending banner for cases that resolve live TIU content.
8. Confirm the panel still stays truthful if a case has no linked TIU note.
9. Run `scripts/verify-latest.ps1` and require a passing result.
10. Update runbook and ops artifacts to Phase 612 only after the live checks pass.

## Acceptance Criteria

- Surgery list truthfulness names the real `ORWSR LIST` RPC.
- Selecting a surgery case loads grounded detail instead of a static placeholder banner.
- Operative note text is retrieved through TIU when a linked note can be resolved.
- Detailed display is exposed for the selected operative note when available.
- No fake report text or synthetic surgery detail is introduced.
- Documentation reflects the real surgery detail/read contract.