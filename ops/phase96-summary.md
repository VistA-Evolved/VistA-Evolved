# Phase 96 — PhilHealth eClaims 3.0 Adapter Skeleton — Summary

## What Changed

Phase 96 adds an **eClaims 3.0 adapter skeleton** that allows billing staff
to assemble claim packets from existing PhilHealth claim drafts (Phase 90),
export them in print-ready formats (JSON/PDF-text/XML-placeholder), and track
submission status honestly without faking automated submission.

### New Files (8)
| File | Purpose |
|------|---------|
| `apps/api/src/rcm/philhealth-eclaims3/types.ts` | Domain types: ClaimPacket, EClaimsSubmissionStatus (7-state FSM), ExportBundle, XmlGeneratorInterface, SpecAcquisitionGates |
| `apps/api/src/rcm/philhealth-eclaims3/packet-builder.ts` | Assembles ClaimPacket from PhilHealthClaimDraft with validation + SHA-256 content hash |
| `apps/api/src/rcm/philhealth-eclaims3/export-generators.ts` | Multi-format export: canonical JSON, PDF text summary, XML placeholder |
| `apps/api/src/rcm/philhealth-eclaims3/xml-generator.ts` | Strict XML generator interface with placeholder impl ("spec pending") |
| `apps/api/src/rcm/philhealth-eclaims3/submission-tracker.ts` | In-memory submission status FSM (draft→reviewed→exported→submitted_manual→accepted/denied→appealed) |
| `apps/api/src/rcm/philhealth-eclaims3/eclaims3-routes.ts` | 12 API endpoints at `/rcm/eclaims3/*` |
| `apps/web/src/app/cprs/admin/philhealth-eclaims3/page.tsx` | Operational UI — 4 tabs (Build & Export, Submissions, Denials, Spec Gates) |
| `docs/runbooks/philhealth-eclaims3-spec-status.md` | Spec acquisition gates tracker (5 gates) |

### Modified Files (2)
| File | Change |
|------|--------|
| `apps/api/src/index.ts` | Import + register `eclaims3Routes` |
| `apps/web/src/app/cprs/admin/layout.tsx` | Add "eClaims 3.0" nav entry |

## How to Test Manually

1. Start the API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
2. Check adapter status: `curl http://127.0.0.1:3001/rcm/eclaims3/status`
3. Check spec gates: `curl http://127.0.0.1:3001/rcm/eclaims3/spec-gates`
4. Build a packet (requires an existing claim draft from Phase 90):
   ```bash
   curl -X POST http://127.0.0.1:3001/rcm/eclaims3/packets \
     -H "Content-Type: application/json" \
     -d '{"draftId":"<draft-id>"}'
   ```
5. Open the web UI: `http://localhost:3000/cprs/admin/philhealth-eclaims3`

## Verifier Output

- `npx tsc --noEmit` (apps/api): 0 errors
- `npx tsc --noEmit` (apps/web): 0 errors
- Route wiring: import + register in index.ts confirmed
- Nav entry: layout.tsx confirmed
- Security: no hardcoded credentials, no fake submission success
- Status FSM: `isManualOnlyTransition()` guards accepted/denied from automated transitions

## Follow-ups

1. **Spec Gate 1**: Obtain official eClaims 3.0 XML/JSON schema from PhilHealth
2. **Spec Gate 2**: Build certified XML generator once spec acquired
3. **Spec Gate 3**: Register for PhilHealth eClaims 3.0 sandbox
4. **Spec Gate 4**: End-to-end sandbox testing
5. **Spec Gate 5**: PhilHealth certification
6. Add eClaims 3.0 version notes to PH-PHIC payer record via admin UI evidence upload
