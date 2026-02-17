# Phase 21 — VistA HL7/HLO Interop Telemetry — Ops Summary

## What Changed (Hardening Pass)

### Original Delivery (Phase 21 initial)
1. **M Routine (ZVEMIOP.m)** — 4 read-only RPC entry points for VistA HL7/HLO telemetry
   - LINKS: HL7 logical links from file #870
   - MSGS: Message stats from files #773/#772
   - HLOSTAT: HLO system params + app registry
   - QLENGTH: Queue depth indicators

2. **API Endpoints (vista-interop.ts)** — 5 GET routes serving real VistA data
   - /vista/interop/hl7-links, hl7-messages, hlo-status, queue-depth, summary

3. **UI (integrations/page.tsx)** — New "VistA HL7/HLO" tab on Integration Console
   - 4 summary cards + logical links table + refresh button

4. **CI (verify.yml)** — TypeScript type-check + secret scan + build

5. **API Hardening (index.ts)** — EADDRINUSE detection with runbook reference

## How to Test Manually

```powershell
# 1. Start Docker
cd services\vista; docker compose --profile dev up -d

# 2. Install RPCs (first time only)
.\scripts\install-interop-rpcs.ps1

# 3. Start API
pnpm -C apps/api dev

# 4. Login + curl
curl.exe -s -c cookies.txt http://127.0.0.1:3001/auth/login -X POST -H "Content-Type: application/json" -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'
curl.exe -s -b cookies.txt http://127.0.0.1:3001/vista/interop/summary --max-time 30
# Expect: {"ok":true,"source":"vista","elapsedMs":...,"hl7":{...},"hlo":{...},"queues":{...}}

# 5. Start web
pnpm -C apps/web dev
# Navigate to /cprs/admin/integrations → "VistA HL7/HLO" tab
```

## Verifier Output

All 5 API endpoints tested and returning real VistA data:
- hl7-links: 260 logical links available, returns configurable sample
- hl7-messages: Message stats for configurable lookback window
- hlo-status: Domain=HL7.BETA.VISTA-OFFICE.ORG, Mode=TEST, 8 apps
- queue-depth: 60 total HL7 messages, 6 pending, 0 errors
- summary: Aggregates all 4 RPCs in ~3.3s round-trip

## Follow-ups

- Add HL7 link state probing (currently all "unknown" — need TCPIP tests)
- Add message flow sparklines to UI
- Add auto-refresh interval option
- WebSocket push for real-time queue monitoring

### Documentation
- Added Phase 19 section to `docs/runbooks/README.md`

### Reference Updates
- `scripts/verify-phase19-reporting-governance.ps1` — updated path references from `22-` to `21-`
- `ops/notion-update.json` — updated prompt_ref_path
- `prompts/21-PHASE-19-*/21-01-*.md` — updated self-references

## How to Test Manually

```powershell
# Start Docker + API
cd services\vista; docker compose --profile dev up -d; cd ..\..
pnpm -C apps/api start

# Login (captures cookie)
$body = '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'
$wc = New-Object Net.WebClient
$wc.Headers["Content-Type"] = "application/json"
$wc.UploadString("http://127.0.0.1:3001/auth/login","POST",$body)
# Copy ehr_session cookie value from Set-Cookie header

# Test reports (with cookie)
$wc.Headers["Cookie"] = "ehr_session=<TOKEN>"
$wc.DownloadString("http://127.0.0.1:3001/reports/operations")
$wc.DownloadString("http://127.0.0.1:3001/reports/clinical-activity")

# Test export
$wc.Headers["Content-Type"] = "application/json"
$wc.UploadString("http://127.0.0.1:3001/reports/export","POST",'{"reportType":"audit","format":"csv"}')

# Run verifier
.\scripts\verify-latest.ps1
```

## Verifier Output

```
=== RESULTS ===
  PASS: 130
  FAIL: 0
  WARN: 0
```

## Live Endpoint Test Results

| Section | Tests | PASS | FAIL | Notes |
|---------|-------|------|------|-------|
| 0: Prompts ordering | 4 | 4 | 0 | 3 renames, 1 move, 1 renumber, ordering rules updated |
| 1: Full regression | 130 | 130 | 0 | verify-phase19-reporting-governance.ps1 |
| 2: RBAC gating | 7 | 7 | 0 | 5 endpoints return 401 without auth, admin gets 200 |
| 3: Data minimization | 4 | 4 | 0 | Clinical = counts only; audit export = DFN only; clinical export blocked |
| 4: Export governance | 5 | 5 | 0 | Job create, policy check, listing, download, concurrent limit |
| 5: Pagination/limits | 5 | 5 | 0 | Page clamping, max audit range, export row cap, cache TTLs |
| 6: Ops analytics | 3 | 3 | 0 | Circuit breaker, RPC metrics, integration health |
| 7: Documentation | 2 | 2 | 0 | Runbook exists, linked in README |
| **Total** | **160** | **160** | **0** | |

## Follow-ups
- 16 pre-existing VERIFY files in phases 5-10 use sub-phase interleaving (02/04/06/08) — now codified as accepted variant in ordering rules
- Consider adding non-admin role test (NURSE123 should get 403 on all `/reports/*`)
- C0FHIR integration untested (requires C0FHIR_HOST env var + running C0FHIR)

---

## Hardening Pass — Phase 21B

Closed 7 of 8 known debt items:

| Debt Item | Resolution |
|-----------|-----------|
| Response caching | `cachedRpc` with 10s TTL (env-configurable `INTEROP_CACHE_TTL_MS`) |
| Circuit breaker | `cachedRpc` → `resilientRpc` (5 failures → open, 30s reset, 15s timeout, 2 retries) |
| Connection lifecycle | connect/callRpc/disconnect inside `cachedRpc` rpcFn; retries reconnect |
| Zod query validation | `Hl7LinksQuerySchema`, `Hl7MessagesQuerySchema` + `validate()` |
| Role gating | `requireRole(session, ["admin","provider"])` + AUTH_RULES admin rule |
| Graceful shutdown disconnect | `disconnectRpcBroker()` after `server.close()` in SIGTERM handler |
| verify-latest.ps1 delegation | Delegates to `verify-phase21-interop-reality.ps1` (34 gates) |
| Debug view env flag | Deferred to Phase 22+ |

### Verifier: 34 PASS, 0 FAIL (4 WARN — Docker skipped)
