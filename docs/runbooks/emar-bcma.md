# eMAR + BCMA Posture -- Phase 85 Runbook

## Overview

Phase 85 adds an electronic Medication Administration Record (eMAR) module
with VistA-first read posture and a truthful BCMA fallback strategy. The module
now provides real medication schedule data from VistA, chart-embedded fallback
administration capture through TIU nursing notes, and VistA-backed barcode
matching while still naming the missing BCMA package targets explicitly.

Phase 685 additionally aligned the barcode-scan workflow with the same
order-based medication fallback used by the schedule view, so scan-time
matching no longer falsely reports zero active medications when `ORWPS ACTIVE`
returns no rows but live CPRS medication orders still exist.

Phase 686 grounded the standalone allergy workflow to live `PSB ALLERGY`
output, so the eMAR Allergy Warnings tab now shows real BCMA scan-time allergy
warnings instead of stale integration-pending messaging.

The chart Nursing panel now uses the same `/emar/*` fallback routes for MAR
workflows. Nursing task rows remain a separate chart endpoint and are derived
from `ORWPS ACTIVE` until BCMA task-specific data is available.

## Architecture

### API Endpoints (apps/api/src/routes/emar/index.ts)

| Endpoint                      | Method | Source              | RPCs                        |
| ----------------------------- | ------ | ------------------- | --------------------------- |
| `/emar/schedule?dfn=N`        | GET    | vista fallback      | ORWPS ACTIVE, ORWORR AGET, ORWORR GETBYIFN, ORWORR GETTXT |
| `/emar/allergies?dfn=N`       | GET    | vista               | ORQQAL LIST, PSB ALLERGY    |
| `/emar/duplicate-check?dfn=N` | GET    | heuristic           | ORWPS ACTIVE                |
| `/emar/history?dfn=N`         | GET    | vista fallback      | ORWPS ACTIVE                |
| `/emar/administer`            | POST   | vista fallback      | TIU CREATE RECORD, TIU SET DOCUMENT TEXT |
| `/emar/barcode-scan`          | POST   | vista fallback      | ORWPS ACTIVE, ORWORR AGET, ORWORR GETBYIFN, ORWORR GETTXT, PSB VALIDATE ORDER |

### Related Nursing Chart Endpoints

| Endpoint                     | Method | Source         | RPCs         |
| ---------------------------- | ------ | -------------- | ------------ |
| `/vista/nursing/tasks?dfn=N` | GET    | vista fallback | ORWPS ACTIVE |

Nursing tasks are currently derived from active medication orders rather than a
true BCMA task list. This is deliberate and truthful for the current VEHU lane.

### Web UI

- Standalone workspace: `apps/web/src/app/cprs/emar/page.tsx`
- Chart-embedded Nursing MAR tab: `apps/web/src/components/cprs/panels/NursingPanel.tsx`

4 tabs:

1. **Medication Schedule** -- Active meds from ORWPS ACTIVE with derived schedule/route/frequency
2. **Allergy Warnings** -- ORQQAL LIST documented allergies plus live BCMA scan-time warnings from PSB ALLERGY
3. **Administration** -- Med admin recording through TIU fallback note capture with explicit BCMA limitation messaging
4. **BCMA Scanner** -- Barcode verification against active VistA meds with explicit PSJBCMA limitation messaging

### Auth

- All `/emar/*` routes require session auth (AUTH_RULES in security.ts)
- Write operations (administer, barcode-scan) log attempts for audit trail
- Admin actions require nurse/admin session (enforced at route level)

## Data Sources

### Real VistA Data (working now)

| RPC           | Data                            | Notes                                                 |
| ------------- | ------------------------------- | ----------------------------------------------------- |
| ORWPS ACTIVE  | Active medication list          | First read path for schedule + scanner candidate set  |
| ORWORR AGET   | Active CPRS order list          | Fallback when ORWPS ACTIVE yields no active med rows  |
| ORWORR GETBYIFN | Order metadata enrichment     | Fallback order classification + package metadata      |
| ORWORR GETTXT | Order text for empty drug names | Fallback drug text and sig enrichment                 |
| ORQQAL LIST   | Patient allergies               | Returns id^allergen^severity^reactions                |
| PSB ALLERGY   | BCMA allergy warnings           | Returns live scan-time allergy/reaction warnings      |

### Integration-Pending (requires broader BCMA/PSB package support)

| RPC         | Purpose                            | VistA File                     |
| ----------- | ---------------------------------- | ------------------------------ |
| PSB MED LOG | Production administration history + certified BCMA recording | PSB(53.79) BCMA MEDICATION LOG |
| PSJBCMA     | Barcode-to-medication lookup       | (PSJ/PSB packages)             |

### Current fallback posture in VEHU

| Capability | Current behavior | Production target |
| ---------- | ---------------- | ----------------- |
| Medication schedule | Real VistA read via ORWPS ACTIVE | Keep |
| Allergy warnings | Real VistA read via ORQQAL LIST + PSB ALLERGY | Keep |
| Nursing task list | ORWPS-derived medication task posture | Replace with BCMA task derivation when available |
| History tab | Current medication posture derived from ORWPS ACTIVE | Replace with PSB MED LOG read mode |
| Administration | TIU nursing-note documentation path | Replace with PSB MED LOG write mode |
| Barcode verification | Match against the same schedule candidate hierarchy, optional PSB VALIDATE ORDER call | Replace with PSJBCMA + PSB workflow |

## Heuristic Features

### Duplicate Therapy Detection

The `/emar/duplicate-check` endpoint uses a name-based therapeutic class
matching heuristic to flag potential duplicate therapies. This is:

- Based on a static list of ~130 drug names across 14 therapeutic classes
- NOT a clinical decision support engine
- NOT a substitute for pharmacist review
- Labeled as "heuristic" in both API responses and UI

### Schedule Derivation

Due times and frequencies are derived from sig text using regex pattern
matching (BID, TID, Q8H, PRN, etc.). This is labeled as heuristic because
actual BCMA due times come from the PSB MED LOG file, which requires the
BCMA package.

## Manual Testing

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
$login = curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
$csrf = ($login | ConvertFrom-Json).csrfToken

# 1. Nursing tasks posture (DFN 46 is currently truthful empty/no-active-meds)
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/nursing/tasks?dfn=46"

# 2. Schedule (DFN 46 currently exercises the live order fallback path)
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/emar/schedule?dfn=46"

# 3. History (VistA fallback)
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/emar/history?dfn=46"

# 4. Allergy warnings (documented allergies + PSB ALLERGY scan-time warnings)
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/emar/allergies?dfn=46"

# 5. Barcode scan (CSRF-protected VistA-backed active-med match)
Set-Content -Path emar-scan.json -Value '{"dfn":"46","barcode":"OXYCODONE"}' -NoNewline -Encoding ASCII
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/emar/barcode-scan -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@emar-scan.json"

# 6. Administer (TIU fallback capture, use a med-bearing patient/order)
Set-Content -Path emar-admin.json -Value '{"dfn":"56","orderIEN":"48584","action":"given"}' -NoNewline -Encoding ASCII
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/emar/administer -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d "@emar-admin.json"

Remove-Item login-body.json,cookies.txt,emar-scan.json,emar-admin.json -ErrorAction SilentlyContinue
```

## UI Access

- Menu: Tools > eMAR (Medication Admin)
- Direct URL: `/cprs/emar?dfn=46`
- Back navigation: "Back to Inpatient" button in header
- Patient chart: Nursing tab > MAR now surfaces the same fallback flows inside the main chart
- Patient chart: Nursing tab > Tasks uses `/vista/nursing/tasks` and truthfully derives task posture from active meds when BCMA task RPCs are absent

## Migration Path to Production BCMA

1. **Install BCMA package** in VistA instance
2. **Enable PSB RPCs** in the OR CPRS GUI CHART context
3. **Configure PSB site parameters** (pharmacy setup)
4. **Wire PSB MED LOG** RPC for real administration reads/writes
5. **Wire PSJBCMA** routines for barcode verification
6. **Replace heuristic due times** with actual PSB schedule data
7. **Add hardware barcode scanner** support (USB HID or camera-based)

## Related Files

- API routes: `apps/api/src/routes/emar/index.ts`
- Web page: `apps/web/src/app/cprs/emar/page.tsx`
- Menu entry: `apps/web/src/components/cprs/CPRSMenuBar.tsx`
- Auth rule: `apps/api/src/middleware/security.ts`
- Grounding: `docs/grounding/emar-bcma-grounding.md`
- Existing nursing MAR: `apps/api/src/routes/nursing/index.ts` (Phase 68)
- Existing NursingPanel MAR tab: `apps/web/src/components/cprs/panels/NursingPanel.tsx`
