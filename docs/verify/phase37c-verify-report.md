# Phase 37C Verify Report -- Product Modularity & Adapter Layer

**Date:** 2026-02-19  
**Verifier:** Copilot Agent (automated live-boot testing)  
**VistA Container:** WorldVistA Docker (port 9430)  
**API:** Fastify on port 3001  
**Login:** PROV123 / PROV123!! (DUZ 87, PROVIDER,CLYDE WV, role=admin)

---

## Gate Summary

| Gate | Description | Result |
|------|-------------|--------|
| G37C-0 | Regression: `verify-phase37c-modularity.ps1` | **PASS** (65/65, 0 FAIL, 0 WARN) |
| G37C-1 | SKU: TELEHEALTH_ONLY blocks CPRS routes | **PASS** |
| G37C-2 | SKU: PORTAL_ONLY blocks clinician routes | **PASS** |
| G37C-3 | SKU: CLINICIAN_ONLY blocks portal routes | **PASS** |
| G37C-4 | Adapter swap: clinical stub shows "pending" | **PASS** |
| G37C-5 | Capability registry drives UI decisions | **PASS** |
| G37C-6 | Security: disabled modules don't leak endpoints | **PASS** |

**Overall: 7/7 PASS**

---

## G37C-0: Static Regression

```powershell
cd C:\Users\kmoul\OneDrive\Documents\GitHub\VistA-Evolved
.\scripts\verify-phase37c-modularity.ps1
```

Result: `PASS: 65  FAIL: 0  WARN: 0`

All 65 static gates verified: config manifests, module registry, capability
service, adapter layer (5 types x 3 files), middleware, routes, architecture
doc, TypeScript compilation (0 errors).

---

## G37C-1: TELEHEALTH_ONLY SKU

**Boot command:**
```powershell
cd apps\api
$env:DEPLOY_SKU="TELEHEALTH_ONLY"
npx tsx --env-file=.env.local src/index.ts
```

**SKU modules:** kernel, telehealth, portal

**Route test results:**

| Route | Expected | Actual | Result |
|-------|----------|--------|--------|
| `/vista/default-patient-list` (clinical) | 403 | 403 | PASS |
| `/imaging/health` (imaging) | 403 | 403 | PASS |
| `/telehealth/health` (telehealth) | 200 | 200 | PASS |
| `/analytics/events` (analytics) | 403 | 403 | PASS |

**403 body sample:**
```json
{"ok":false,"error":"Module not enabled","module":"clinical","message":"Module 'clinical' (Clinician CPRS Shell) is not enabled for this facility"}
```

---

## G37C-2: PORTAL_ONLY SKU

**Boot command:**
```powershell
$env:DEPLOY_SKU="PORTAL_ONLY"
npx tsx --env-file=.env.local src/index.ts
```

**SKU modules:** kernel, portal, intake

**Route test results:**

| Route | Expected | Actual | Result |
|-------|----------|--------|--------|
| `/vista/default-patient-list` (clinical) | 403 | 403 | PASS |
| `/telehealth/health` (telehealth) | 403 | 403 | PASS |
| `/imaging/health` (imaging) | 403 | 403 | PASS |
| `/analytics/events` (analytics) | 403 | 403 | PASS |
| `/portal/auth/session` (portal) | non-403 | 401 (portal-specific auth) | PASS |
| `/intake/packs` (intake) | 200 | 200 | PASS |

---

## G37C-3: CLINICIAN_ONLY SKU

**Boot command:**
```powershell
$env:DEPLOY_SKU="CLINICIAN_ONLY"
npx tsx --env-file=.env.local src/index.ts
```

**SKU modules:** kernel, clinical, analytics

**Route test results:**

| Route | Expected | Actual | Result |
|-------|----------|--------|--------|
| `/vista/default-patient-list` (clinical) | 200 | 200 | PASS |
| `/portal/auth/session` (portal) | 403 | 403 | PASS |
| `/telehealth/health` (telehealth) | 403 | 403 | PASS |
| `/imaging/health` (imaging) | 403 | 403 | PASS |
| `/analytics/events` (analytics) | 200 | 200 | PASS |
| `/intake/packs` (intake) | 403 | 403 | PASS |

---

## G37C-4: Adapter Swap (Clinical Engine -> Stub)

**Boot command:**
```powershell
$env:DEPLOY_SKU="FULL_SUITE"
$env:ADAPTER_CLINICAL_ENGINE="stub"
npx tsx --env-file=.env.local src/index.ts
```

**Adapter list response (`GET /api/adapters/list`):**
```json
{
  "ok": true,
  "adapters": [
    {"type": "clinical-engine", "implementation": "external-stub", "isStub": true},
    {"type": "scheduling", "implementation": "vista-rpc", "isStub": false},
    {"type": "billing", "implementation": "vista-rpc", "isStub": false},
    {"type": "imaging", "implementation": "vista-orthanc", "isStub": false},
    {"type": "messaging", "implementation": "vista-hlo", "isStub": false}
  ]
}
```

**Capability summary (`GET /api/capabilities/summary`):**
```json
{
  "ok": true,
  "summary": {
    "total": 53,
    "live": 19,
    "pending": 34,
    "disabled": 0,
    "byModule": {
      "clinical": {"live": 0, "pending": 24, "disabled": 0}
    }
  }
}
```

- All 24 clinical capabilities show `effectiveStatus: "pending"`
- Reason: `"Adapter 'clinical-engine' is using stub implementation"`
- Clinical routes still respond (no crash): `{"ok":true,"count":0,"results":[]}`
- Other adapters unaffected (all remain vista-native)

---

## G37C-5: Capability Registry Drives UI

**Full capability resolution (`GET /api/capabilities`):**
- 53 capabilities returned with full schema
- Each capability includes: `name`, `effectiveStatus`, `configuredStatus`, `reason`, `module`, `targetRpc`, `targetPackage`, `description`
- `effectiveStatus` differs from `configuredStatus` when adapter is stub:
  - `configuredStatus: "live"` + stub adapter = `effectiveStatus: "pending"`
- UI can key on `effectiveStatus` to show "integration pending" banners and prevent dead clicks
- Example capability:
  ```json
  {
    "name": "clinical.patient.search",
    "effectiveStatus": "pending",
    "configuredStatus": "live",
    "reason": "Adapter 'clinical-engine' is using stub implementation",
    "module": "clinical",
    "targetRpc": "ORWPT LIST ALL",
    "description": "Search patients by name"
  }
  ```

---

## G37C-6: Security -- Disabled Modules Don't Leak

**Test: Unauthenticated request to disabled module route**
```
GET /vista/default-patient-list (no cookie)
-> 401 {"ok":false,"error":"Authentication required"}
```
Module existence is NOT revealed to unauthenticated callers.

**Test: Authenticated request to disabled module routes**

| Route | HTTP Status | Body |
|-------|-------------|------|
| `/vista/allergies?dfn=3` | 403 | Module not enabled (clinical) |
| `/imaging/health` | 403 | Module not enabled (imaging) |
| `/analytics/events` | 403 | Module not enabled (analytics) |
| `/intake/packs` | 403 | Module not enabled (intake) |

All disabled module routes return consistent 403 with safe JSON error body.
No stack traces, no internal paths, no 500 errors.

**Test: Allowed routes still work**

| Route | HTTP Status |
|-------|-------------|
| `/telehealth/health` | 200 |
| `/health` | 200 |

---

## Run Commands Reference

### Prerequisites
```powershell
# VistA Docker running
cd services\vista
docker compose --profile dev up -d

# .env.local configured
# apps/api/.env.local must exist with PROV123 credentials
```

### Static verification
```powershell
.\scripts\verify-phase37c-modularity.ps1
```

### Live SKU testing
```powershell
cd apps\api

# FULL_SUITE (default)
$env:DEPLOY_SKU="FULL_SUITE"
npx tsx --env-file=.env.local src/index.ts

# TELEHEALTH_ONLY
$env:DEPLOY_SKU="TELEHEALTH_ONLY"
npx tsx --env-file=.env.local src/index.ts

# PORTAL_ONLY
$env:DEPLOY_SKU="PORTAL_ONLY"
npx tsx --env-file=.env.local src/index.ts

# CLINICIAN_ONLY
$env:DEPLOY_SKU="CLINICIAN_ONLY"
npx tsx --env-file=.env.local src/index.ts
```

### Adapter swap testing
```powershell
$env:DEPLOY_SKU="FULL_SUITE"
$env:ADAPTER_CLINICAL_ENGINE="stub"
npx tsx --env-file=.env.local src/index.ts
```

### Login (all SKUs)
```powershell
curl.exe -s -c cookies.txt -H "Content-Type: application/json" `
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' `
  http://127.0.0.1:3001/auth/login
```

### Route testing
```powershell
# Blocked route (expect 403)
curl.exe -s -b cookies.txt http://127.0.0.1:3001/vista/default-patient-list

# Adapter list
curl.exe -s -b cookies.txt http://127.0.0.1:3001/api/adapters/list

# Capabilities
curl.exe -s -b cookies.txt http://127.0.0.1:3001/api/capabilities/summary

# Module status
curl.exe -s -b cookies.txt http://127.0.0.1:3001/api/modules/status
```
