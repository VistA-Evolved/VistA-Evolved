# Phase 673 - IMPLEMENT: CPRS Medications Route Orders Fallback

## User Request

- Continue the live clinician chart audit until the CPRS workflow is truthful across frontend, backend, and VistA.
- Use prompt lineage before changing stale medication behavior.
- Treat the Medications tab as a production-facing surface that must agree with Orders and Nursing MAR.

## Problem Statement

- Live browser verification showed `/cprs/chart/46/meds` rendered `All (0)` and `No medications`.
- Live API verification showed `GET /vista/medications?dfn=46` returned `count:0` from `ORWPS ACTIVE`.
- The same patient still had a live active medication order in CPRS Orders and a recovered active row in Nursing MAR.

## Implementation Steps

1. Preserve `ORWPS ACTIVE` as the primary read path for `/vista/medications`.
2. When `ORWPS ACTIVE` returns no active rows, fall back to live active CPRS medication orders from `ORWORR AGET`.
3. Enrich fallback rows with `ORWORR GETBYIFN` and `ORWORR GETTXT` so medication rows keep truthful names and sig text.
4. Return provenance fields that make the fallback explicit instead of silently pretending the primary RPC succeeded.
5. Update the medications runbook so the documented route contract matches the live VEHU lane behavior.

## Files Touched

- apps/api/src/server/inline-routes.ts
- docs/runbooks/vista-rpc-medications.md
- ops/summary.md

## Notes

- Keep true live-empty responses rendering as normal empty results when both the primary and fallback VistA read paths are empty.
- Do not fabricate BCMA timing or outpatient data that VistA did not return.