# Lab Service (LR)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Lab orders, results, specimen collection, accession

| Property | Value |
|----------|-------|
| Namespace | `LR` |
| Tier | 5 |
| FileMan Files | 6 |
| RPCs | 26 |
| Menu Options | 112 |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 60 | File #60 | ? | ? |
| 63 | File #63 | ? | ? |
| 65 | File #65 | ? | ? |
| 65.1 | File #65.1 | ? | ? |
| 68 | File #68 | ? | ? |
| 69 | File #69 | ? | ? |

## Remote Procedure Calls (RPCs)

### `ORWLR CUMULATIVE REPORT`

| Property | Value |
|----------|-------|
| Tag | `CUM` |
| Routine | `ORWLR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This call returns an up to date laboratory cumulative report for a given  patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/lr/rpc/orwlr-cumulative-report`

---

### `ORWLR REPORT LISTS`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORWLR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** This remote procedure call returns a list of lab cumulative sections, and date ranges that can be displayed at the workstation. There are no input parameters fo this rpc.

**API Endpoint:** `GET /vista/lr/rpc/orwlr-report-lists`

---

### `ORWLR CUMULATIVE SECTION`

| Property | Value |
|----------|-------|
| Tag | `RPT` |
| Routine | `ORWLR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |

**Description:** This rpc retrieves the part of the lab cumulative report  selected by the user on the Labs tab.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | PART OF CUMULATIVE | LITERAL | No |
| 3 | DATE RANGE | LITERAL | No |
| 4 | REPORT SECTION | LITERAL | No |

**API Endpoint:** `GET /vista/lr/rpc/orwlr-cumulative-section`

---

### `ORWLRR ATOMICS`

| Property | Value |
|----------|-------|
| Tag | `ATOMICS` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-atomics`

---

### `ORWLRR SPEC`

| Property | Value |
|----------|-------|
| Tag | `SPEC` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-spec`

---

### `ORWLRR ALLTESTS`

| Property | Value |
|----------|-------|
| Tag | `ALLTESTS` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-alltests`

---

### `ORWLRR USERS`

| Property | Value |
|----------|-------|
| Tag | `USERS` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-users`

---

### `ORWLRR TG`

| Property | Value |
|----------|-------|
| Tag | `TG` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-tg`

---

### `ORWLRR ATESTS`

| Property | Value |
|----------|-------|
| Tag | `ATESTS` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-atests`

---

### `ORWLRR ATG`

| Property | Value |
|----------|-------|
| Tag | `ATG` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-atg`

---

### `ORWLRR UTGA`

| Property | Value |
|----------|-------|
| Tag | `UTGA` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-utga`

---

### `ORWLRR UTGR`

| Property | Value |
|----------|-------|
| Tag | `UTGR` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-utgr`

---

### `ORWLRR UTGD`

| Property | Value |
|----------|-------|
| Tag | `UTGD` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-utgd`

---

### `ORWLRR INTERIM`

| Property | Value |
|----------|-------|
| Tag | `INTERIM` |
| Routine | `ORWLRR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-interim`

---

### `ORWLRR INTERIMS`

| Property | Value |
|----------|-------|
| Tag | `INTERIMS` |
| Routine | `ORWLRR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-interims`

---

### `ORWLRR GRID`

| Property | Value |
|----------|-------|
| Tag | `GRID` |
| Routine | `ORWLRR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-grid`

---

### `ORWLRR INTERIMG`

| Property | Value |
|----------|-------|
| Tag | `INTERIMG` |
| Routine | `ORWLRR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-interimg`

---

### `ORWLRR NEWOLD`

| Property | Value |
|----------|-------|
| Tag | `NEWOLD` |
| Routine | `ORWLRR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-newold`

---

### `ORWLRR MICRO`

| Property | Value |
|----------|-------|
| Tag | `MICRO` |
| Routine | `ORWLRR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-micro`

---

### `ORWLRR CHART`

| Property | Value |
|----------|-------|
| Tag | `CHART` |
| Routine | `ORWLRR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-chart`

---

### `ORWLRR CHEMTEST`

| Property | Value |
|----------|-------|
| Tag | `CHEMTEST` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-chemtest`

---

### `ORWLRR PARAM`

| Property | Value |
|----------|-------|
| Tag | `PARAM` |
| Routine | `ORWLRR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-param`

---

### `ORWLRR INFO`

| Property | Value |
|----------|-------|
| Tag | `INFO` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return lab test description information.

**API Endpoint:** `GET /vista/lr/rpc/orwlrr-info`

---

### `ORWLRAP1 CONFIG`

| Property | Value |
|----------|-------|
| Tag | `CONFIG` |
| Routine | `ORWLRAP1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TYP | LITERAL | No |
| 2 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/lr/rpc/orwlrap1-config`

---

### `ORWLRAP1 SPEC`

| Property | Value |
|----------|-------|
| Tag | `SPEC` |
| Routine | `ORWLRAP1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/lr/rpc/orwlrap1-spec`

---

### `ORWLRAP1 APORDITM`

| Property | Value |
|----------|-------|
| Tag | `APORDITM` |
| Routine | `ORWLRAP1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns an array of orderable items for the CPRS Anatomic Pathology  order dialog in the format:     Y(n)=IEN^.01 Name^.01 Name  -or-  IEN^Synonym <.01 Name>^.01 Name

**API Endpoint:** `GET /vista/lr/rpc/orwlrap1-aporditm`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| DFN: | ORWLR CUMULATIVE REPORT | DFN | LITERAL | rpc |
| DFN: | ORWLR CUMULATIVE SECTION | DFN | LITERAL | rpc |
| PART OF CUMULATIVE: | ORWLR CUMULATIVE SECTION | PART OF CUMULATIVE | LITERAL | rpc |
| DATE RANGE: | ORWLR CUMULATIVE SECTION | DATE RANGE | LITERAL | rpc |
| REPORT SECTION: | ORWLR CUMULATIVE SECTION | REPORT SECTION | LITERAL | rpc |
| TYP: | ORWLRAP1 CONFIG | TYP | LITERAL | rpc |
| IEN: | ORWLRAP1 CONFIG | IEN | LITERAL | rpc |
| IEN: | ORWLRAP1 SPEC | IEN | LITERAL | rpc |

## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| LR SUP SUMMARY | LRSUPER |
| LR COUNT ACC TESTS | LRSUPER |
| LR LOOKUP ACCESSION | — |
| LR HEALTH DEPT | — |
| LR ACC THEN DATA | — |
| LR CAPTT | — |
| LR INTEGRITY LOAD | — |
| LR INTEGRITY SINGLE | — |
| LR INTEGRITY LOOP | — |
| LR BARCODE FORMAT LOAD | LRLIASON |
| LR WKLD MANUAL | LRLIASON |
| LR WKLD AUDIT | — |
| LR WKLD REVIEW AUSTIN DATA | — |
| LR WKLD LMIP 1 | LRSUPER |
| LR WKLD LMIP 2 | LRSUPER |
| LR WKLD LMIP 3 | LRSUPER |
| LR WKLD LMIP 4 | LRSUPER |
| LR ROLLOVER | — |
| LR WKLD LMIP 5 | LRLIASON |
| LR WKLD LMIP 1 REPEAT | LRSUPER |
| LR WKLD CODE EDIT PRINT | — |
| LR WKLD LOCATION | — |
| LR WKLD ACC AREA LOCATION | — |
| LR REVIEW DATA NAMES | LRLIASON |
| LR TASK 7 9s | — |
| LR TAT URGENCY | — |
| LR ORDERED TESTS BY PHY | — |
| LR BAR CF | LRLIASON |
| LR LOINC MAP | — |
| LR LOINC TOPOGRAPHY | — |
| LR LOINC PRINT NLT/LOINC | — |
| LR LOINC LEDI HL7 CODE | — |
| LR LOINC LOOKUP | — |
| LR LOINC PRINT RESULT NLT | — |
| LR LOINC PRINT 60/LOINC MAP | — |
| LR LOINC HL7 SPECIMENS | — |
| LR BAR ZEBRA UTILITY | — |
| LR LOINC MAP DEFAULT | — |
| LR LOINC UNMAP/DELETE LOINC | — |
| LR LOINC UNMAP/DELETE DEFAULT | — |
| LR LOINC PRINT LOINC CODE | — |
| LR LOINC PRINT DEFAULT/LOINC | — |
| LR LOINC EXTRACT LAB NAMES | — |
| LR LOINC VALIDATE | — |
| LR LOINC MAP ANTIMICROBIAL | — |
| LR LOINC HISTORICAL MAPPER 63 | XUPROGMODE |
| LR LOINC HISTORICAL STOP 63 | — |
| LR LOINC HISTORICAL RESTART 63 | XUPROGMODE |
| LR LOINC HISTORICAL MODIFY | XUPROGMODE |
| LR LOINC STATUS PRINT | — |
| LR NDS ASSOCIATE TEST TO MLTF | — |
| LR NDS MLTF EXTRACT | — |
| LR NDS AUDIT PURGE | — |
| LR NDS FILE 60 AUDIT PRINT | — |
| LR NDS SPECIMENS W/O VUIDS | — |
| LR NDS WALK ASSOCIATE | — |
| LR NDS TESTS W/INACTIVE VUIDS | — |

### Menu

| Name | Security Key |
|------|-------------|
| LR IN | — |
| LR OUT | — |
| LR GET | — |
| LR DO! | — |
| LR INTEGRITY | — |
| LR GECS MAINTENANCE USER MENU | — |
| LR GECS REPORTS MENU | — |
| LR GECS USER MENU | — |
| LR GECS TRANSMIT USER | — |
| LR GECS MAIN MENU | — |
| LR WKLD2 | LRSUPER |
| LR WKLD3 | LRSUPER |
| LR WKLD | — |
| LR PROCESS, MISC | — |
| LR WKLD4 | LRLIASON |
| LR LIM/WKLD MENU | — |
| LR SUPER/WKLD MENU | — |
| LR LOINC UTILITY | — |
| LR LOINC HISTORICAL MAP MENU | XUPROGMODE |
| LR NDS LIM MENU | — |

### Action

| Name | Security Key |
|------|-------------|
| LR INF WARN | LRSUPER |
| LR GECS BATCH | — |
| LR GECS BATCH EDIT | — |
| LR GECS BATCHES STATUS | — |
| LR GECS BATCHES WAITING TRANS | — |
| LR GECS CODE EDIT | — |
| LR GECS CREATE | — |
| LR GECS DELETE | — |
| LR GECS KEYPUNCH | — |
| LR GECS PURGE | — |
| LR GECS READY FOR BATCHING LIS | — |
| LR GECS REBATCH | — |
| LR GECS RETRANSMIT | — |
| LR GECS REVIEW CODE SHEET | — |
| LR GECS TRANSMIT | — |
| LR LAB LIM FILE | LRLIASON |
| LR USER PARAM | — |

### Protocol

| Name | Security Key |
|------|-------------|
| LR CHEM 7 | — |

### Edit

| Name | Security Key |
|------|-------------|
| LR ACC CONTROLS | LRSUPER |
| LR WKLD COMMENTS | — |
| LR WKLD MANUAL INPUT | — |
| LR WKLD STD/QC/REPS | — |
| LR WKLD STATS ON | LRLIASON |
| LR WKLD STATS ON ACC AREA | LRLIASON |
| LR NDS MANAGED ITEMS EDIT | — |

### Print

| Name | Security Key |
|------|-------------|
| LR WKLD CODE BY NAME | — |
| LR WKLD SUB BY SECTION | — |
| LR WKLD SECTION BY CODE | — |
| LR WKLD SECTION BY NAME | — |
| LR WKLD SERVICE | — |
| LR WKLD REQUEST | — |
| LR WKLD CODE BY CODE | — |
| LR WKLD SUBSECTION | — |
| LR WKLD TEST DICT | — |
| LR CAP ELROY | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `LRSUPER`
- `LRLIASON`
- `XUPROGMODE`

## API Route Summary

All routes are prefixed with `/vista/lr/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/lr/rpc/orwlr-cumulative-report` | ORWLR CUMULATIVE REPORT | GLOBAL ARRAY |
| GET | `/vista/lr/rpc/orwlr-report-lists` | ORWLR REPORT LISTS | GLOBAL ARRAY |
| GET | `/vista/lr/rpc/orwlr-cumulative-section` | ORWLR CUMULATIVE SECTION | GLOBAL ARRAY |
| GET | `/vista/lr/rpc/orwlrr-atomics` | ORWLRR ATOMICS | ARRAY |
| GET | `/vista/lr/rpc/orwlrr-spec` | ORWLRR SPEC | ARRAY |
| GET | `/vista/lr/rpc/orwlrr-alltests` | ORWLRR ALLTESTS | ARRAY |
| GET | `/vista/lr/rpc/orwlrr-users` | ORWLRR USERS | ARRAY |
| GET | `/vista/lr/rpc/orwlrr-tg` | ORWLRR TG | ARRAY |
| GET | `/vista/lr/rpc/orwlrr-atests` | ORWLRR ATESTS | ARRAY |
| GET | `/vista/lr/rpc/orwlrr-atg` | ORWLRR ATG | ARRAY |
| GET | `/vista/lr/rpc/orwlrr-utga` | ORWLRR UTGA | ARRAY |
| GET | `/vista/lr/rpc/orwlrr-utgr` | ORWLRR UTGR | ARRAY |
| GET | `/vista/lr/rpc/orwlrr-utgd` | ORWLRR UTGD | ARRAY |
| GET | `/vista/lr/rpc/orwlrr-interim` | ORWLRR INTERIM | GLOBAL ARRAY |
| GET | `/vista/lr/rpc/orwlrr-interims` | ORWLRR INTERIMS | GLOBAL ARRAY |
| GET | `/vista/lr/rpc/orwlrr-grid` | ORWLRR GRID | GLOBAL ARRAY |
| GET | `/vista/lr/rpc/orwlrr-interimg` | ORWLRR INTERIMG | GLOBAL ARRAY |
| GET | `/vista/lr/rpc/orwlrr-newold` | ORWLRR NEWOLD | SINGLE VALUE |
| GET | `/vista/lr/rpc/orwlrr-micro` | ORWLRR MICRO | GLOBAL ARRAY |
| GET | `/vista/lr/rpc/orwlrr-chart` | ORWLRR CHART | GLOBAL ARRAY |
| GET | `/vista/lr/rpc/orwlrr-chemtest` | ORWLRR CHEMTEST | ARRAY |
| GET | `/vista/lr/rpc/orwlrr-param` | ORWLRR PARAM | SINGLE VALUE |
| GET | `/vista/lr/rpc/orwlrr-info` | ORWLRR INFO | ARRAY |
| GET | `/vista/lr/rpc/orwlrap1-config` | ORWLRAP1 CONFIG | GLOBAL ARRAY |
| GET | `/vista/lr/rpc/orwlrap1-spec` | ORWLRAP1 SPEC | GLOBAL ARRAY |
| GET | `/vista/lr/rpc/orwlrap1-aporditm` | ORWLRAP1 APORDITM | ARRAY |
