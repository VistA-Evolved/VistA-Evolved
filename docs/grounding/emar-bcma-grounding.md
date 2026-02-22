# eMAR + BCMA Grounding Document -- Phase 85

## Purpose

This document grounds the eMAR module's capabilities to specific VistA
packages, files, routines, and RPCs. Every feature is either backed by
real VistA data or explicitly marked as integration-pending with the
exact VistA target identified.

## VistA Package Dependencies

### Available in WorldVistA Docker (working now)

| Package | RPCs Used | Status |
|---------|-----------|--------|
| Order Entry/Results Reporting (OR) | ORWPS ACTIVE | Wired -- returns active medications |
| Order Entry/Results Reporting (OR) | ORWORR GETTXT | Wired -- resolves empty drug names |
| Order Entry/Results Reporting (OR) | ORQQAL LIST | Wired -- returns patient allergies |

### NOT Available in WorldVistA Docker (integration-pending)

| Package | RPCs Needed | VistA Files | Status |
|---------|-------------|-------------|--------|
| BCMA (PSB) | PSB MED LOG | PSB(53.79) BCMA MEDICATION LOG | Not installed |
| BCMA (PSB) | PSB ALLERGY | (PSB package allergy check) | Not installed |
| Inpatient Pharmacy (PSJ) | PSJBCMA, PSJBCMA1 | PSJ(53.45), PSJ(53.461) | Not installed |

## Feature-to-RPC Mapping

| Feature | Data Source | RPC | Real/Pending |
|---------|------------|-----|-------------|
| Medication schedule | VistA OR package | ORWPS ACTIVE | REAL |
| Drug name resolution | VistA OR package | ORWORR GETTXT | REAL |
| Allergy warnings | VistA OR package | ORQQAL LIST | REAL |
| Duplicate therapy check | Heuristic (local) | ORWPS ACTIVE | REAL (data), HEURISTIC (logic) |
| Administration history | VistA BCMA package | PSB MED LOG | PENDING |
| Record administration | VistA BCMA package | PSB MED LOG | PENDING |
| Barcode verification | VistA PSJ package | PSJBCMA | PENDING |
| Drug-allergy check at scan | VistA BCMA package | PSB ALLERGY | PENDING |
| Real-time due times | VistA BCMA package | PSB MED LOG | PENDING |

## VistA File References

| File # | Name | Purpose | Status |
|--------|------|---------|--------|
| 53.79 | BCMA MEDICATION LOG | Med admin records | Not available (PSB package) |
| 53.795 | BCMA UNABLE TO SCAN LOG | Scan failure tracking | Not available (PSB package) |
| 53.45 | PHARMACY PATIENT | Inpatient pharmacy orders | Available but limited data |
| 53.461 | UNIT DOSE DISPENSE | Unit dose tracking | Available but limited data |
| 120.5 | ALLERGY/ADVERSE REACTIONS | Patient allergies | Available (via ORQQAL LIST) |
| 100 | ORDER | Active medication orders | Available (via ORWPS ACTIVE) |

## Heuristic Declarations

### Duplicate Therapy Detection
- **Type**: Name-based therapeutic class matching
- **Data source**: Drug names from ORWPS ACTIVE (real VistA data)
- **Logic**: Local heuristic comparing drug names against 14 static therapeutic classes (~130 drugs)
- **NOT**: A clinical decision support engine
- **NOT**: A substitute for pharmacist review or drug interaction database
- **Label**: All responses and UI include explicit "heuristic" disclaimer

### Schedule/Frequency Derivation
- **Type**: Regex-based sig text parsing
- **Data source**: Sig field from ORWPS ACTIVE (real VistA data)
- **Logic**: Pattern matching for BID, TID, QID, Q8H, PRN, etc.
- **NOT**: Actual BCMA scheduled due times
- **Label**: All responses include `_heuristicWarning` field

## BCMA 5-Rights Framework

The BCMA posture establishes the framework for the 5 Rights of medication
administration but cannot enforce them without the PSB/PSJ packages:

1. **Right Patient** -- Patient context from ORWPT16 ID INFO (working)
2. **Right Medication** -- Drug name from ORWPS ACTIVE (working); barcode verify needs PSJBCMA (pending)
3. **Right Dose** -- Sig from ORWPS ACTIVE (working); dose calc needs PSJ (pending)
4. **Right Route** -- Derived from sig text (heuristic); actual route needs pharmacy order (pending)
5. **Right Time** -- Due times are heuristic; actual schedule needs PSB MED LOG (pending)

## Migration Prerequisites

To enable full BCMA functionality:

1. BCMA (PSB) package must be installed in VistA
2. Inpatient Pharmacy (PSJ) package must be configured for the facility
3. Pharmacy Data Management (PDM) must have active drug file entries
4. National Drug File (NDF) must be loaded for VA drug classes
5. Barcode scanner hardware must be configured
6. PSB site parameters must be set (pharmacy windows, admin times)
7. PSB RPCs must be added to OR CPRS GUI CHART context
