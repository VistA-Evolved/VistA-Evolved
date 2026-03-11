# Functional Independence (RMIM)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `RMIM` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 19 |
| Menu Options | 5 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `RMIM CONVERT DATE`

| Property | Value |
|----------|-------|
| Tag | `DTFMT` |
| Routine | `RMIMRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/rmim/rpc/rmim-convert-date`

---

### `RMIM SEND EMAIL`

| Property | Value |
|----------|-------|
| Tag | `XM` |
| Routine | `RMIMRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/rmim/rpc/rmim-send-email`

---

### `RMIM GET FORM`

| Property | Value |
|----------|-------|
| Tag | `FRM` |
| Routine | `RMIMRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/rmim/rpc/rmim-get-form`

---

### `RMIM GET CASES`

| Property | Value |
|----------|-------|
| Tag | `LC` |
| Routine | `RMIMRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/rmim/rpc/rmim-get-cases`

---

### `RMIM GET SELECTED CASE`

| Property | Value |
|----------|-------|
| Tag | `GC` |
| Routine | `RMIMRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/rmim/rpc/rmim-get-selected-case`

---

### `RMIM GET USER INFO`

| Property | Value |
|----------|-------|
| Tag | `DUZ` |
| Routine | `RMIMRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/rmim/rpc/rmim-get-user-info`

---

### `RMIM GET DFN`

| Property | Value |
|----------|-------|
| Tag | `DFN` |
| Routine | `RMIMRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/rmim/rpc/rmim-get-dfn`

---

### `RMIM FIM PARAMETER`

| Property | Value |
|----------|-------|
| Tag | `PRM` |
| Routine | `RMIMRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure will return the local site parameters in an array.  There are no input parameters.

**API Endpoint:** `GET /vista/rmim/rpc/rmim-fim-parameter`

---

### `RMIM GET PATIENT DME`

| Property | Value |
|----------|-------|
| Tag | `DME` |
| Routine | `RMIMRP` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure will return a list of durable medical equipment which has been issued to a patient within a date range. Required input consists of a single parameter representing the internal entry number of a patient from file #2, and two dates in FileMan format. The three pieces will be deli

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM1 | LITERAL | No |

**API Endpoint:** `GET /vista/rmim/rpc/rmim-get-patient-dme`

---

### `RMIM SAVE FSOD`

| Property | Value |
|----------|-------|
| Tag | `SAV` |
| Routine | `RMIMRP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARRAY | REFERENCE | No |

**API Endpoint:** `POST /vista/rmim/rpc/rmim-save-fsod`

---

### `RMIM PATIENT LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `PL` |
| Routine | `RMIMRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Input parameter is any string that a user would normally enter to look up a patient. Output is an array of DFN^PATIENT NAME^SSN^DOB.

**API Endpoint:** `GET /vista/rmim/rpc/rmim-patient-lookup`

---

### `RMIM PATIENT INFO`

| Property | Value |
|----------|-------|
| Tag | `PI` |
| Routine | `RMIMRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Input parameter is PATIENT DFN. Output parameter is a ^ delimited string as follows: DFN^PATIENT NAME^SSN^DOB^AGE^SEX^MARITAL STATUS^ACTIVE DUTY^ CITY^STATE^ZIP^COUNTY^TELEPHONE

**API Endpoint:** `GET /vista/rmim/rpc/rmim-patient-info`

---

### `RMIM AUTHOR LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `AL` |
| Routine | `RMIMRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/rmim/rpc/rmim-author-lookup`

---

### `RMIM LOCATION LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `LL` |
| Routine | `RMIMRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/rmim/rpc/rmim-location-lookup`

---

### `RMIM RESTRICTED RECORD`

| Property | Value |
|----------|-------|
| Tag | `RRN` |
| Routine | `RMIMRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/rmim/rpc/rmim-restricted-record`

---

### `RMIM VERSION`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `RMIMV` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/rmim/rpc/rmim-version`

---

### `RMIM CONSULT LIST`

| Property | Value |
|----------|-------|
| Tag | `CON` |
| Routine | `RMIMV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of consult requests for a patient within optional date range and optional service.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT | LITERAL | No |
| 2 | START DATE | LITERAL | No |
| 3 | STOP DATE | LITERAL | No |
| 4 | SERVICE | LITERAL | No |

**API Endpoint:** `GET /vista/rmim/rpc/rmim-consult-list`

---

### `RMIM LOCK PATIENT`

| Property | Value |
|----------|-------|
| Tag | `PTL` |
| Routine | `RMIMRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/rmim/rpc/rmim-lock-patient`

---

### `RMIM CHECK DUPLICATE`

| Property | Value |
|----------|-------|
| Tag | `DUP` |
| Routine | `RMIMV` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/rmim/rpc/rmim-check-duplicate`

---


## Menu Options

### Edit

| Name | Security Key |
|------|-------------|
| RMIM EDIT SITE PARAMETER | — |

### Run routine

| Name | Security Key |
|------|-------------|
| RMIM NIGHTLY TRANSMISSION TASK | — |

### Menu

| Name | Security Key |
|------|-------------|
| RMIM REPORTS | — |

### Server

| Name | Security Key |
|------|-------------|
| RMIM MAIL SERVER | — |

### Print

| Name | Security Key |
|------|-------------|
| RMIM MAIL SERVER REPORT | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/rmim/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/rmim/rpc/rmim-convert-date` | RMIM CONVERT DATE | ARRAY |
| GET | `/vista/rmim/rpc/rmim-send-email` | RMIM SEND EMAIL | ARRAY |
| GET | `/vista/rmim/rpc/rmim-get-form` | RMIM GET FORM | ARRAY |
| GET | `/vista/rmim/rpc/rmim-get-cases` | RMIM GET CASES | ARRAY |
| GET | `/vista/rmim/rpc/rmim-get-selected-case` | RMIM GET SELECTED CASE | ARRAY |
| GET | `/vista/rmim/rpc/rmim-get-user-info` | RMIM GET USER INFO | ARRAY |
| GET | `/vista/rmim/rpc/rmim-get-dfn` | RMIM GET DFN | ARRAY |
| GET | `/vista/rmim/rpc/rmim-fim-parameter` | RMIM FIM PARAMETER | ARRAY |
| GET | `/vista/rmim/rpc/rmim-get-patient-dme` | RMIM GET PATIENT DME | ARRAY |
| POST | `/vista/rmim/rpc/rmim-save-fsod` | RMIM SAVE FSOD | SINGLE VALUE |
| GET | `/vista/rmim/rpc/rmim-patient-lookup` | RMIM PATIENT LOOKUP | ARRAY |
| GET | `/vista/rmim/rpc/rmim-patient-info` | RMIM PATIENT INFO | ARRAY |
| GET | `/vista/rmim/rpc/rmim-author-lookup` | RMIM AUTHOR LOOKUP | ARRAY |
| GET | `/vista/rmim/rpc/rmim-location-lookup` | RMIM LOCATION LOOKUP | ARRAY |
| GET | `/vista/rmim/rpc/rmim-restricted-record` | RMIM RESTRICTED RECORD | ARRAY |
| GET | `/vista/rmim/rpc/rmim-version` | RMIM VERSION | ARRAY |
| GET | `/vista/rmim/rpc/rmim-consult-list` | RMIM CONSULT LIST | GLOBAL ARRAY |
| POST | `/vista/rmim/rpc/rmim-lock-patient` | RMIM LOCK PATIENT | ARRAY |
| GET | `/vista/rmim/rpc/rmim-check-duplicate` | RMIM CHECK DUPLICATE | ARRAY |
