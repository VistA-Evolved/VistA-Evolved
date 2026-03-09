# Phase 588 - Production Stabilization Execution Runbook

## Scope
This runbook captures the production-readiness stabilization pass that converted a green-looking but partially stale repo state into a verified, truthful state against the live VEHU lane.

## What Changed
1. Added the Phase 588 prompt capture:
- `prompts/588-PHASE-588-PRODUCTION-STABILIZATION-EXECUTION/588-01-IMPLEMENT.md`
- `prompts/588-PHASE-588-PRODUCTION-STABILIZATION-EXECUTION/588-99-VERIFY.md`

2. Restored prompt and gate consistency:
- Regenerated `docs/qa/phase-index.json` so prompt-tree integrity matched the real set of prompt folders.

3. Fixed certification gate drift:
- `scripts/qa-gates/certification-runner.mjs` now recognizes typed Fastify route registrations and normalizes parameterized route patterns.
- `config/certification-scenarios.json` now points at current canonical endpoints and truthful RPC names.

4. Closed scheduling API compatibility gaps:
- Added `POST /scheduling/book` and `POST /scheduling/check-in` in `apps/api/src/routes/scheduling/index.ts`.
- Both aliases reuse the canonical request and check-in logic instead of forking behavior.

5. Closed scheduling writeback honesty gap:
- Approval in `apps/api/src/routes/scheduling/index.ts` now tracks writeback entries, resolves writeback policy, and applies the Phase 170 truth gate.
- Approved requests remain `approved` unless VistA truth verifies that the appointment is actually scheduled.

## Runtime Verification Commands
Run from repository root after the VEHU and platform DB containers are up.

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
curl.exe -s http://127.0.0.1:3001/vista/ping
curl.exe -s http://127.0.0.1:3001/health
```

Start the API:

```powershell
cd apps/api
npx tsx --env-file=.env.local src/index.ts
```

Authenticated scheduling proof:

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/scheduling/book -H "Content-Type: application/json" -d '{"patientDfn":"46","clinicName":"CARDIOLOGY","preferredDate":"2026-03-10","reason":"Follow-up visit","appointmentType":"in_person"}'
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/scheduling/check-in -H "Content-Type: application/json" -d '{"appointmentId":"req-1-mmgyeaeg","patientDfn":"46","clinicName":"CARDIOLOGY"}'
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

Full verifier:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Verification Results Snapshot
1. Docker and API runtime checks passed against live VEHU.
2. Certification gate reached full readiness: 12 ready, 0 partial, 49 of 49 reachable.
3. Full RC verification passed: 15 PASS, 0 FAIL, 0 SKIP, overall `RC_READY`.
4. Tier-0 outpatient proof passed end-to-end.
5. Live scheduling approval proof returned truthful state: the request remained `approved` when the truth gate could not confirm a booked VistA appointment.

## Operational Meaning
1. Static readiness is now aligned with the real API surface.
2. Scheduling compatibility routes exist for expected external flows.
3. The scheduling UI and API contract no longer overstate booking success when only staff approval has happened.

## Next Recommended Step
If scheduling is taken beyond request-only or partial mode, prove SDES-backed direct writeback in VEHU first and keep the Phase 170 truth gate mandatory.