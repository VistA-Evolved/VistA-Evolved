# Phase 60 Summary -- TIU Notes Parity

## What Changed

### API (apps/api/src/)

- **NEW** `routes/cprs/tiu-notes.ts` -- 5 TIU endpoints following Wave 2 safety model:
  - `GET /vista/cprs/notes` -- TIU DOCUMENTS BY CONTEXT (signed + unsigned merge)
  - `GET /vista/cprs/notes/text` -- TIU GET RECORD TEXT (note body viewer)
  - `POST /vista/cprs/notes/sign` -- TIU LOCK/SIGN/UNLOCK with draft fallback
  - `POST /vista/cprs/notes/addendum` -- TIU CREATE ADDENDUM RECORD + SET TEXT
  - `GET /vista/cprs/notes/titles` -- TIU PERSONAL TITLE LIST with default fallback
- **UPDATED** `vista/rpcRegistry.ts` -- +6 RPCs: TIU SIGN RECORD, TIU LOCK RECORD, TIU UNLOCK RECORD, TIU CREATE ADDENDUM RECORD, TIU REQUIRES COSIGNATURE, TIU PERSONAL TITLE LIST
- **UPDATED** `lib/audit.ts` -- +3 actions: clinical.note-sign, clinical.note-addendum, clinical.note-view-text
- **UPDATED** `index.ts` -- import + register tiuNotesRoutes

### UI (apps/web/src/)

- **UPGRADED** `NotesPanel.tsx` (178 -> ~330 lines):
  - Note text viewer: fetches full body via GET /vista/cprs/notes/text on selection
  - Sign dialog: electronic signature code input, calls POST /vista/cprs/notes/sign
  - Addendum form: textarea + save, calls POST /vista/cprs/notes/addendum
  - Refresh button in toolbar
  - Status badges (Signed/Unsigned with color coding)
  - VistA title selector: fetches from /vista/cprs/notes/titles on mount
  - Source indicator (VistA TIU | IEN) in detail pane
  - Note create now calls wave2 endpoint /vista/cprs/notes/create with titleIen

### Governance

- Prompt: prompts/65-PHASE-60-TIU-NOTES-PARITY/60-01-IMPLEMENT.md + 60-99-VERIFY.md
- Artifact: artifacts/phase60/tiu-plan.json (7 flows with per-flow RPC sequences)
- Verifier: scripts/verify-phase60-tiu-notes.ps1 (12 gates)

## How to Test Manually

1. Start VistA Docker + API
2. Login as PROV123 / PROV123!!
3. Select a patient, navigate to Notes tab
4. Verify notes list loads (signed + unsigned merged)
5. Click a note -- full text body should appear in detail pane
6. Click "+ New Note" -- VistA title selector should populate
7. Create note with template -- should call wave2 create endpoint
8. Select unsigned note -- Sign button should appear in toolbar
9. Click Sign -- enter ES code dialog
10. Select any note -- + Addendum button should appear
11. Click + Addendum -- addendum form with save

## Verifier Output

```
12/12 gates pass (G60-01 through G60-12)
```

## Follow-ups

- TIU SIGN RECORD esCode: sandbox may reject if electronic signature not configured for user
- TIU CREATE ADDENDUM RECORD: sandbox may return error if parent doc is not in signed state
- Note edit (TIU UPDATE RECORD): deferred to future phase -- edit is destructive and rare in CPRS
- Cosign workflow (TIU REQUIRES COSIGNATURE + cosign UI): deferred -- registry entry added, UI pending
