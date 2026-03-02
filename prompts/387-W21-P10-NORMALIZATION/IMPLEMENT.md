# Phase 387 — W21-P10 LOINC/UCUM Normalization — IMPLEMENT

## User Request
Build the LOINC/UCUM normalization engine per Wave 21 manifest W21-P10.
Maps proprietary device codes (MDC, ASTM, POCT1-A) to LOINC and converts
device units to UCUM standard representations.

## Implementation Steps
1. Create `normalization-engine.ts` — curated mapping tables:
   - MDC_TO_LOINC: 13 vital sign mappings (SpO2, HR, BP, temp, resp, EtCO2, ABP)
   - LAB_TO_LOINC: 24 lab analyte mappings (chem, blood gas, hematology, coag, POCT)
   - UNIT_TO_UCUM: 30 unit mappings with conversion factors (F→C, etc.)
   - Normalization engine: single + batch + QA validation
2. Create `normalization-routes.ts` — 7 REST endpoints
3. Wire barrel export, register-routes

## Files Touched
- `apps/api/src/devices/normalization-engine.ts` (NEW)
- `apps/api/src/devices/normalization-routes.ts` (NEW)
- `apps/api/src/devices/index.ts` (MODIFIED)
- `apps/api/src/server/register-routes.ts` (MODIFIED)
