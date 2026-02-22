# eMAR + BCMA Posture -- Phase 85 Runbook

## Overview

Phase 85 adds an electronic Medication Administration Record (eMAR) module
with VistA-first read posture and BCMA (Barcode Medication Administration)
write-path posture. The module provides real medication schedule data from
VistA while clearly marking all BCMA write operations as integration-pending
with named VistA targets.

## Architecture

### API Endpoints (apps/api/src/routes/emar/index.ts)

| Endpoint | Method | Source | RPCs |
|----------|--------|--------|------|
| `/emar/schedule?dfn=N` | GET | vista | ORWPS ACTIVE, ORWORR GETTXT |
| `/emar/allergies?dfn=N` | GET | vista | ORQQAL LIST |
| `/emar/duplicate-check?dfn=N` | GET | heuristic | ORWPS ACTIVE |
| `/emar/history?dfn=N` | GET | integration-pending | PSB MED LOG |
| `/emar/administer` | POST | integration-pending | PSB MED LOG |
| `/emar/barcode-scan` | POST | integration-pending | PSB MED LOG, PSJBCMA |

### Web UI (apps/web/src/app/cprs/emar/page.tsx)

4 tabs:
1. **Medication Schedule** -- Active meds from ORWPS ACTIVE with derived schedule/route/frequency
2. **Allergy Warnings** -- ORQQAL LIST data with severity-based interaction warnings
3. **Administration** -- Med admin recording (integration-pending with PSB MED LOG target)
4. **BCMA Scanner** -- Barcode verification (integration-pending with PSJBCMA target)

### Auth

- All `/emar/*` routes require session auth (AUTH_RULES in security.ts)
- Write operations (administer, barcode-scan) log attempts for audit trail
- Admin actions require nurse/admin session (enforced at route level)

## Data Sources

### Real VistA Data (working now)

| RPC | Data | Notes |
|-----|------|-------|
| ORWPS ACTIVE | Active medication list | Returns ~TYPE^rxIEN;kind^drugName^...^orderIEN^status |
| ORWORR GETTXT | Order text for empty drug names | Fallback when ORWPS ACTIVE has empty drugName |
| ORQQAL LIST | Patient allergies | Returns id^allergen^severity^reactions |

### Integration-Pending (requires BCMA/PSB package)

| RPC | Purpose | VistA File |
|-----|---------|------------|
| PSB MED LOG | Administration history + recording | PSB(53.79) BCMA MEDICATION LOG |
| PSB ALLERGY | Drug-allergy check at scan time | (PSB package) |
| PSJBCMA | Barcode-to-medication lookup | (PSJ/PSB packages) |

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

```bash
# 1. Schedule (real VistA data)
curl -b cookies.txt http://localhost:3001/emar/schedule?dfn=3

# 2. Allergies (real VistA data)
curl -b cookies.txt http://localhost:3001/emar/allergies?dfn=3

# 3. Duplicate check (heuristic)
curl -b cookies.txt http://localhost:3001/emar/duplicate-check?dfn=3

# 4. History (integration-pending)
curl -b cookies.txt http://localhost:3001/emar/history?dfn=3

# 5. Administer (integration-pending)
curl -b cookies.txt -X POST -H "Content-Type: application/json" \
  -d '{"dfn":"3","orderIEN":"12345","action":"given"}' \
  http://localhost:3001/emar/administer

# 6. Barcode scan (integration-pending)
curl -b cookies.txt -X POST -H "Content-Type: application/json" \
  -d '{"dfn":"3","barcode":"12345678"}' \
  http://localhost:3001/emar/barcode-scan
```

## UI Access

- Menu: Tools > eMAR (Medication Admin)
- Direct URL: `/cprs/emar?dfn=3`
- Back navigation: "Back to Inpatient" button in header

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
