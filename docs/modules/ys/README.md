# Mental Health (YS)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `YS` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 5 |
| Menu Options | 28 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `YS GAF API`

| Property | Value |
|----------|-------|
| Tag | `GAFHX` |
| Routine | `YSGAFAPI` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/ys/rpc/ys-gaf-api`

---

### `YTAPI NEW GAF`

| Property | Value |
|----------|-------|
| Tag | `ENT` |
| Routine | `YSGAFAP1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Allows entry of a new GAF rating.   Input Required:         DFN  - Patient IEN         GAF - GAF Score (Axis 5)         DATE - Date/Time of Diagnosis         STAFF - Diagnosis By DUZ Output: only reports success vs. error         YSDATA(1)=[DATA] VS. YSDATA(1)=[ERROR]

**API Endpoint:** `GET /vista/ys/rpc/ytapi-new-gaf`

---

### `YSRP ASI NARRATIVE`

| Property | Value |
|----------|-------|
| Tag | `ASINAR` |
| Routine | `YSASRPWP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This procedure prints the selected ASI in narrative form.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | YSASDA | LITERAL | No |

**API Endpoint:** `GET /vista/ys/rpc/ysrp-asi-narrative`

---

### `YSRP ASI ITEM`

| Property | Value |
|----------|-------|
| Tag | `ASIITM` |
| Routine | `YSASRPWP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This procedure prints the selected Addiction Severity Index in a captioned format.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | YSASDA | LITERAL | No |

**API Endpoint:** `GET /vista/ys/rpc/ysrp-asi-item`

---

### `YTAPI ASI FACTORS`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `YSASFS` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Input IEN of file 604, Addiction Severity Index Returns the 5 factor scores for an ASI in the following format:   YSDATA(1)=[DATA] YSDATA(2)=ALCOHOL^FACTOR SCORE^T SCORE . . YSDATA(6)=LEGAL^FACTOR SCORE^T SCORE

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | UNKNOWN() | No |

**API Endpoint:** `GET /vista/ys/rpc/ytapi-asi-factors`

---


## Menu Options

### Menu

| Name | Security Key |
|------|-------------|
| YS SITE PARAMETERS | — |
| YS GECS MAINTENANCE USER MENU | — |
| YS GECS REPORTS MENU | — |
| YS GECS USER MENU | — |
| YS GECS TRANSMIT USER | — |
| YS GECS MAIN MENU | — |

### Run routine

| Name | Security Key |
|------|-------------|
| YS SITE-FILE 615.5 | — |
| YS SITE-FILE 615.6 | — |
| YS SITE-FILE 615.7 | — |
| YS SITE-FILE 615.8 | — |
| YS SITE-FILE 615.9 | — |
| YS GAF TRANSMISSION | — |

### Action

| Name | Security Key |
|------|-------------|
| YS GECS BATCH | — |
| YS GECS BATCH EDIT | — |
| YS GECS BATCHES STATUS | — |
| YS GECS BATCHES WAITING TRANS | — |
| YS GECS CODE EDIT | — |
| YS GECS CREATE | — |
| YS GECS DELETE | — |
| YS GECS KEYPUNCH | — |
| YS GECS PURGE | — |
| YS GECS READY FOR BATCHING LIS | — |
| YS GECS REBATCH | — |
| YS GECS RETRANSMIT | — |
| YS GECS REVIEW CODE SHEET | — |
| YS GECS TRANSMIT | — |

### Broker

| Name | Security Key |
|------|-------------|
| YS BROKER1 | — |

### Server

| Name | Security Key |
|------|-------------|
| YS TEST USAGE | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/ys/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/ys/rpc/ys-gaf-api` | YS GAF API | ARRAY |
| GET | `/vista/ys/rpc/ytapi-new-gaf` | YTAPI NEW GAF | ARRAY |
| GET | `/vista/ys/rpc/ysrp-asi-narrative` | YSRP ASI NARRATIVE | GLOBAL ARRAY |
| GET | `/vista/ys/rpc/ysrp-asi-item` | YSRP ASI ITEM | GLOBAL ARRAY |
| GET | `/vista/ys/rpc/ytapi-asi-factors` | YTAPI ASI FACTORS | ARRAY |
