# Phase 613 - CPRS Clinical Procedures Read Parity (IMPLEMENT)

## User Request

Continue closing AI-left UI and VistA integration gaps so the CPRS chart works truthfully for end users. The Clinical Procedures panel must stop claiming universal integration-pending status if live VistA read paths already exist through TIU Clinical Procedures class metadata and consult-side reads.

## Implementation Steps

1. Inventory the existing Clinical Procedures phase (`537-W39-P7-CLINICAL-PROCEDURES-V1-CPMD`) and the later burn-down guidance in Phase 581.
2. Verify which CP-related RPCs actually produce live VEHU data: `TIU IDENTIFY CLINPROC CLASS`, `TIU DOCUMENTS BY CONTEXT`, `TIU GET RECORD TEXT`, `TIU DETAILED DISPLAY`, `ORQQCN LIST`, and `ORQQCN DETAIL`.
3. Upgrade `apps/api/src/routes/clinical-procedures/index.ts` so:
   - Results use TIU Clinical Procedures class notes when present.
   - If the TIU Clinical Procedures class is empty in VEHU, the route truthfully falls back to consult-side reads from `ORQQCN LIST`/`ORQQCN DETAIL` instead of returning blanket integration-pending.
   - Medicine stays integration-pending only if MD package RPCs remain unavailable or empty.
   - Consult-link exposes real read-only consult data while keeping attach/write actions pending.
4. Upgrade `apps/web/src/components/cprs/panels/ClinicalProceduresPanel.tsx` so Results and Consult Link are usable read surfaces with real selection/detail behavior.
5. Keep the implementation VistA-first and honest. Do not fabricate CP results, MD records, or consult attachments.
6. Update runbook/parity docs and ops artifacts after live verification passes.

## Verification Steps

1. Confirm `vehu` and `ve-platform-db` are running and healthy.
2. Confirm `/health` and `/vista/ping` return `ok:true`.
3. Validate touched API/web files with TypeScript or diagnostics.
4. Login with VEHU credentials and verify `TIU IDENTIFY CLINPROC CLASS` returns a class IEN.
5. Verify `GET /vista/clinical-procedures?dfn=69` returns `ok:true` with live `rpcUsed` values and truthful source metadata.
6. Verify Clinical Procedures detail returns live text from either TIU or consult detail for a real returned item.
7. Verify `GET /vista/clinical-procedures/consult-link?dfn=69` returns real consult-side data and keeps attach/write actions honest.
8. Run `scripts/verify-latest.ps1` and only then update ops artifacts to Phase 613.

## Files Touched

- `apps/api/src/routes/clinical-procedures/index.ts`
- `apps/web/src/components/cprs/panels/ClinicalProceduresPanel.tsx`
- `docs/runbooks/vista-rpc-phase12-parity.md`
- `docs/parity-coverage-report.md`
- `ops/summary.md`
- `ops/notion-update.json`
- `prompts/613-PHASE-613-CPRS-CLINICAL-PROCEDURES-READ-PARITY/613-01-IMPLEMENT.md`
- `prompts/613-PHASE-613-CPRS-CLINICAL-PROCEDURES-READ-PARITY/613-99-VERIFY.md`