# Phase 682 - VERIFY: CPRS Notes Refresh Continuity Recovery

## Verification Goals

1. The Notes panel keeps existing trustworthy note rows visible while a live refresh is in flight.
2. Notes create still uses the live TIU-backed route and returns a real document IEN or truthful fallback posture.
3. The panel still preserves pending-banner semantics when no trustworthy notes are available.

## Manual Verification

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/notes?dfn=46"
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

```text
Browser:
1. Open /cprs/chart/46/notes with a live clinician session.
2. Create a note from + New Note.
3. Confirm the success message includes a created note ID.
4. While the refresh is still in flight, confirm the note table remains visible and the panel does not collapse to a blank loading-only state.
5. Confirm the list converges to the refreshed live notes set after the request settles.
```

## Acceptance Criteria

- Existing notes remain visible during a Notes refresh when cached note rows already exist.
- The Notes panel does not regress to a blank loading-only pane after a successful create.
- The live TIU-backed notes route remains the source of truth.

## Files Touched

- prompts/682-PHASE-682-CPRS-NOTES-REFRESH-CONTINUITY-RECOVERY/682-01-IMPLEMENT.md
- prompts/682-PHASE-682-CPRS-NOTES-REFRESH-CONTINUITY-RECOVERY/682-99-VERIFY.md
- apps/web/src/components/cprs/panels/NotesPanel.tsx
- docs/runbooks/vista-rpc-notes.md
- ops/summary.md
- ops/notion-update.json