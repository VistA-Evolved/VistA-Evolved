# Phase 613 - CPRS Clinical Procedures Read Parity (VERIFY)

## Verification Steps

1. Confirm `vehu` and `ve-platform-db` are healthy.
2. Confirm the API starts cleanly and `/health` plus `/vista/ping` return `ok:true`.
3. Validate the touched Clinical Procedures files with TypeScript or diagnostics.
4. Verify `TIU IDENTIFY CLINPROC CLASS` returns a live class IEN in VEHU.
5. Verify `GET /vista/clinical-procedures?dfn=69` returns live read data or a truthful consult-side fallback instead of a blanket integration-pending response.
6. Verify `GET /vista/clinical-procedures/:id` returns live detail text for a real returned item.
7. Verify `GET /vista/clinical-procedures/consult-link?dfn=69` returns live consult-side data and detail.
8. Verify the Clinical Procedures panel no longer shows an all-panel integration-pending banner for the Results and Consult Link reads.
9. Verify the Medicine tab remains honest if MD package RPCs are still unavailable.
10. Run `scripts/verify-latest.ps1` and require a passing result.

## Acceptance Criteria

- Results read path uses real VistA RPCs.
- Consult Link read path uses real `ORQQCN LIST`/`ORQQCN DETAIL` data.
- Detail view shows grounded TIU or consult text for selected items.
- Medicine remains integration-pending only if the MD package is still unavailable or empty.
- No fake CP results, synthetic consult attachments, or simulated MD data are introduced.
- Documentation reflects the actual Clinical Procedures read contract and remaining honest gaps.