# Phase 60 -- IMPLEMENT: TIU Notes Parity (Create/Edit/Templates/Sign/Cosign/Addenda)

## Governance Preamble (mandatory)
- Never fragment the system. Inventory first, reuse existing patterns, then verify.
- VistA-first rule: all VistA interactions through rpcRegistry. Every RPC name present in Vivian index OR explicitly allowlisted.
- No dead clicks: every clickable element must work OR show "integration pending" with target RPC(s).
- Prompts folder integrity: 60-01-IMPLEMENT.md + 60-99-VERIFY.md.
- Minimal edits, deterministic changes, commit discipline.

## Mission
Implement a CPRS-like notes experience backed by VistA TIU where supported:
- List notes (signed + unsigned, merged)
- View note text (TIU GET RECORD TEXT)
- Create note (TIU CREATE RECORD + TIU SET DOCUMENT TEXT)
- Templates/boilerplate
- Save draft
- Sign note OR explicit pending (TIU SIGN RECORD)
- Addendum (TIU CREATE ADDENDUM RECORD or pending)
- Cosign rules (TIU REQUIRES COSIGNATURE or pending)
No fake success.

## Definition of Done
A) Notes list and detail are VistA-backed (or honest pending with target RPCs).
B) Create note produces a persistent artifact (draft or signed) visible in list afterward.
C) Template chooser exists (facility + local templates).
D) Signing posture is honest and consistent.
E) Dead clicks = 0 on Notes flows.
F) Audit + PHI logging constraints satisfied.

## Implementation Steps

### Step 0: Prompts folder
- Create prompts/65-PHASE-60-TIU-NOTES-PARITY/60-01-IMPLEMENT.md (this file)
- Create prompts/65-PHASE-60-TIU-NOTES-PARITY/60-99-VERIFY.md

### A) Inventory + Plan
- artifacts/phase60/tiu-plan.json (per-flow RPC sequences, sandbox status)

### B) API: TIU routes (apps/api/src/routes/cprs/tiu-notes.ts)
Endpoints:
- GET  /vista/cprs/notes          -- TIU DOCUMENTS BY CONTEXT (list)
- GET  /vista/cprs/notes/text     -- TIU GET RECORD TEXT (view body)
- POST /vista/cprs/notes/create   -- TIU CREATE RECORD + TIU SET DOCUMENT TEXT
- POST /vista/cprs/notes/sign     -- TIU SIGN RECORD (or integration-pending)
- POST /vista/cprs/notes/addendum -- TIU CREATE ADDENDUM RECORD (or pending)
- GET  /vista/cprs/notes/titles   -- TIU PERSONAL TITLE LIST (or pending)

### C) Registry + Audit
- rpcRegistry.ts: add TIU SIGN RECORD, TIU LOCK RECORD, TIU UNLOCK RECORD, TIU CREATE ADDENDUM RECORD, TIU REQUIRES COSIGNATURE, TIU PERSONAL TITLE LIST
- audit.ts: add clinical.note-sign, clinical.note-addendum, clinical.note-view-text

### D) UI: Upgrade NotesPanel.tsx
- Note text viewer (fetches /vista/cprs/notes/text)
- Sign button -> POST /vista/cprs/notes/sign (or pending)
- Addendum button -> POST /vista/cprs/notes/addendum (or pending)
- Refresh button
- Status badges (unsigned, signed, cosigned, amended)
- Template chooser (existing + enhanced)
- Source indicator

### E) Verifier
- scripts/verify-phase60-tiu-notes.ps1 (12 gates)

## Files Touched
- NEW  apps/api/src/routes/cprs/tiu-notes.ts
- MOD  apps/api/src/index.ts (import + register)
- MOD  apps/api/src/vista/rpcRegistry.ts (+6 RPCs)
- MOD  apps/api/src/lib/audit.ts (+3 actions)
- MOD  apps/web/src/components/cprs/panels/NotesPanel.tsx (major upgrade)
- NEW  scripts/verify-phase60-tiu-notes.ps1
- MOD  scripts/verify-latest.ps1
- NEW  artifacts/phase60/tiu-plan.json
- NEW  prompts/65-PHASE-60-TIU-NOTES-PARITY/60-01-IMPLEMENT.md
- NEW  prompts/65-PHASE-60-TIU-NOTES-PARITY/60-99-VERIFY.md

## Commit
```
Phase60: TIU notes parity (templates + drafts + signing posture)
```
