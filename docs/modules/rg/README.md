# Clinical Information Resource Network (RG)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `RG` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 3 |
| Menu Options | 18 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `RG REMOTE HL7 TASK`

| Property | Value |
|----------|-------|
| Tag | `TASK` |
| Routine | `RGMTRUN` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call will return the currently running Health Level Seven (HL7) tasks from a remote site to the Master Patient Index (MPI).

**API Endpoint:** `GET /vista/rg/rpc/rg-remote-hl7-task`

---

### `RG REM ACTIVITY`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RGACTIV` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call (RPC) returns Health Level Seven (HL7) message  information and exception information for a patient.  The HL7 data is from the ADT/HL7 PIVOT (#391.71) file and exception date is from the CIRN HL7  EXCEPTION LOG (#991.1) file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICN | LITERAL | No |
| 2 | SSN | LITERAL | No |

**API Endpoint:** `GET /vista/rg/rpc/rg-rem-activity`

---

### `RG VIEW VISTA EXCEPTIONS`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `RGRPC` |
| Return Type | ARRAY |
| Parameter Count | 5 |

**Description:** This RPC will allow the MPI IMDQ staff to view VistA exceptions for a  given patient logged during a specific date range.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICN | LITERAL | No |
| 2 | SSN | LITERAL | No |
| 3 | DFN | LITERAL | No |
| 4 | BRANGE | LITERAL | No |
| 5 | ERANGE | LITERAL | No |

**API Endpoint:** `GET /vista/rg/rpc/rg-view-vista-exceptions`

---


## Menu Options

### Menu

| Name | Security Key |
|------|-------------|
| RG IRM MENU | — |
| RG ADMIN COORD MENU | — |
| RG TRAN/AUD AUD REP | — |
| RG EXCEPTION MENU | — |
| RG MGT REPORTS | — |
| RG REMOTE PDAT MENU | — |

### Action

| Name | Security Key |
|------|-------------|
| RG EXCEPTION NOTIFIER | — |

### Run routine

| Name | Security Key |
|------|-------------|
| RG EXCEPTION PURGE | — |
| RG EXCEPTION TF INQUIRY | — |
| RG STATUS DISPLAY | — |
| RG PROCESS CONTROL | — |
| RG UPDATE POINT OF CONTACT | — |
| RG REMOTE PDAT SEND | — |
| RG REMOTE PDAT CHECK | — |
| RG REMOTE PDAT DISPLAY | — |
| RG LINKS & PROCESS DISPLAY | — |
| RG PRIMARY VIEW FROM MPI | — |
| RG TK POC USER SETUP | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/rg/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/rg/rpc/rg-remote-hl7-task` | RG REMOTE HL7 TASK | ARRAY |
| GET | `/vista/rg/rpc/rg-rem-activity` | RG REM ACTIVITY | ARRAY |
| GET | `/vista/rg/rpc/rg-view-vista-exceptions` | RG VIEW VISTA EXCEPTIONS | ARRAY |
