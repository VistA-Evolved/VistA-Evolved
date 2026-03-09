# Phase 599 — Patient Search Problem Write Recovery (VERIFY)

## Verification Steps

1. `docker ps` shows `vehu` and `ve-platform-db` healthy.
2. API startup shows `Server listening` and no migration failures.
3. `curl.exe -s http://127.0.0.1:3001/vista/ping` returns `{"ok":true,...}`.
4. Login succeeds with `PRO1234 / PRO1234!!` and cookies are issued.
5. Live add-problem proof uses the same route the UI now calls.
6. Response is not fake success: it must clearly indicate `mode: real` or `mode: draft`.
7. Problem list refresh path remains intact after the write attempt.
8. Edited frontend file has no diagnostics errors.

## Acceptance Criteria

- Patient-search no longer calls the stale `POST /vista/problems` blocker path.
- Patient-search uses the CPRS write route that is already implemented in the API.
- Success and error copy reflect actual backend behavior.
- The UI no longer labels this flow as “Not Yet Implemented” when the wired route exists.
- The change is narrow, truthful, and verified against live VEHU-connected API behavior.