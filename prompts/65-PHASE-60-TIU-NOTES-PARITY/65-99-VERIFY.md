# Phase 60 -- VERIFY: TIU Notes Parity

## Verification Gates

### G60-01: Plan artifact exists

- `artifacts/phase60/tiu-plan.json` contains per-flow RPC sequences

### G60-02: Notes list endpoint (READ)

- `GET /vista/cprs/notes` calls TIU DOCUMENTS BY CONTEXT or returns honest pending

### G60-03: Note text endpoint (READ)

- `GET /vista/cprs/notes/text` calls TIU GET RECORD TEXT

### G60-04: Note create endpoint (WRITE)

- `POST /vista/cprs/notes/create` calls TIU CREATE RECORD + TIU SET DOCUMENT TEXT
- Audit event emitted

### G60-05: Note sign endpoint

- `POST /vista/cprs/notes/sign` calls TIU SIGN RECORD or returns integration-pending

### G60-06: Addendum endpoint

- `POST /vista/cprs/notes/addendum` calls TIU CREATE ADDENDUM RECORD or returns integration-pending

### G60-07: Titles endpoint

- `GET /vista/cprs/notes/titles` calls TIU PERSONAL TITLE LIST or returns pending

### G60-08: Registry updated

- rpcRegistry.ts contains TIU SIGN RECORD, TIU LOCK RECORD, TIU UNLOCK RECORD, etc.

### G60-09: Audit actions

- audit.ts contains clinical.note-sign, clinical.note-addendum, clinical.note-view-text

### G60-10: NotesPanel upgraded

- NotesPanel.tsx shows note text body, sign button calls API, addendum button exists

### G60-11: No PHI in logs, no fake success

- No PHI in audit detail, no console.log in new code, no mock data

### G60-12: Dead-click audit

- Every button in Notes tab has a real endpoint or shows integration-pending

## Script

```
scripts/verify-phase60-tiu-notes.ps1
```

## Commit

```
Phase60: TIU notes parity (templates + drafts + signing posture)
```
