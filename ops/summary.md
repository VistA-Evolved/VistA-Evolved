# Phase 22 - Imaging Platform V1 - Ops Summary

## What Changed

### Docker Services (services/imaging/)
- Orthanc DICOM Server (v24.12.1) on port 8042 (DICOMweb) + 4242 (DICOM C-STORE)
- OHIF Viewer (v3.9.2) on port 3003
- Docker Compose profile `imaging` isolates from VistA dev profile

### API - DICOMweb Proxy (apps/api/src/routes/imaging-proxy.ts)
- Session-gated proxy: browser never talks directly to Orthanc
- QIDO-RS, WADO-RS, STOW-RS routes under /imaging/dicom-web/*
- Demo upload, health check, viewer URL endpoints
- QIDO cache with configurable TTL

### API - Config (apps/api/src/config/server-config.ts)
- New IMAGING_CONFIG with env-var overrides for Orthanc/OHIF URLs, timeouts, cache

### API - Imaging Service Enhancements
- 3-tier study cascade: VistA MAG4 -> Orthanc QIDO-RS -> registry DICOMweb
- Status, viewer URL, metadata endpoints enhanced with Orthanc fallback

### Audit
- New actions: imaging.study-view, imaging.series-view, imaging.dicom-upload, imaging.proxy-request, imaging.orthanc-health

### UI - Imaging Tab
- ImagingPanel.tsx with study list, modality filters, OHIF viewer modal
- Added to CPRS tab routing and modern sidebar

## How to Test Manually

```powershell
cd services\imaging
docker compose --profile imaging up -d
curl.exe http://localhost:8042/system
curl.exe http://localhost:3001/imaging/health
```

## Verifier Output

```
Phase 22: 46 PASS, 0 FAIL, 1 WARN (Docker skipped)
ALL GATES PASSED
```

## Follow-ups
- Wire MAG4 PAT GET IMAGES when VistA MAG routines available
- Wire MAGG PAT PHOTOS for patient banner photo
- Add dcm4chee as optional long-term archive
- E2E Cypress tests for imaging tab
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

---

## VERIFY Pass — Phase 21 Full

Comprehensive 9-step verification (regression, live VistA, security, performance, UI, CI, prompts):

### Verifier Enhancement
- Added Section I: 9 security/PHI gates (SSN, DFN/ICN, HL7 segments, source metadata, credentials, httpOnly, secret scanner, prompts contiguity)
- Fixed Docker gates: VECHECK.m temp file approach, corrected `^XWB(8994)` global
- Fixed install-interop-rpcs.ps1: UTF-8 BOM removal for PowerShell 5.1

### Results: 48 PASS, 0 FAIL, 0 WARN

| Section | Gates | Status |
|---------|-------|--------|
| A — Interop route structure | 9 | ALL PASS |
| B — Zod query validation | 5 | ALL PASS |
| C — Circuit breaker + caching | 7 | ALL PASS |
| D — Role gating | 3 | ALL PASS |
| E — Security middleware | 4 | ALL PASS |
| F — TypeScript compilation | 2 | ALL PASS |
| G — Docker gates (M routine + RPCs) | 5 | ALL PASS |
| H — Regression gates | 4 | ALL PASS |
| I — Security / PHI gates | 9 | ALL PASS |

### Live Endpoint Test Results
All 5 interop endpoints return real VistA data with `source: "vista"`, `vistaFile` metadata, and proper `available` flags. Auth enforcement confirmed (401 without session).

### Known Debt (Not Blocking)
1. `VISTA_DEBUG` not admin-role-gated (env-only, off by default)
2. `RPC_CONNECT_TIMEOUT_MS` not wired to raw broker (hardcodes 10s)
3. Single global socket — no connection pooling/mutex
4. Interop routes use direct `callRpc` instead of `safeCallRpc`
5. `buildBye()` dead code (BUG-036)
