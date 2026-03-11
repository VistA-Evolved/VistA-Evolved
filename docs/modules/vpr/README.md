# Virtual Patient Record (VPR)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `VPR` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 4 |
| Menu Options | 14 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `VPR GET PATIENT DATA`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `VPRD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 7 |
| Status | Inactive (may still be callable) |

**Description:** This RPC retrieves the requested data from VistA, and returns it in ^TMP("VPR",$J,n) as XML.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | TYPE | LITERAL | No |
| 3 | START | LITERAL | No |
| 4 | STOP | LITERAL | No |
| 5 | MAX | LITERAL | No |
| 6 | ITEM | LITERAL | No |
| 7 | FILTER | REFERENCE | No |

**API Endpoint:** `GET /vista/vpr/rpc/vpr-get-patient-data`

---

### `VPR DATA VERSION`

| Property | Value |
|----------|-------|
| Tag | `VERSION` |
| Routine | `VPRD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the current version of the XML returned by the RPC 'VPR GET PATIENT DATA.'

**API Endpoint:** `GET /vista/vpr/rpc/vpr-data-version`

---

### `VPR GET PATIENT DATA JSON`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `VPRDJ` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC retrieves the requested data from VistA, and returns it in ^TMP("VPR",$J,n) as JSON.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | REFERENCE | No |

**API Endpoint:** `GET /vista/vpr/rpc/vpr-get-patient-data-json`

---

### `VPR GET CHECKSUM`

| Property | Value |
|----------|-------|
| Tag | `CHECK` |
| Routine | `VPRDCRC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC retrieves the requested data from VistA and returns its checksum.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | REFERENCE | No |

**API Endpoint:** `GET /vista/vpr/rpc/vpr-get-checksum`

---


## Menu Options

### Broker

| Name | Security Key |
|------|-------------|
| VPR APPLICATION PROXY | — |

### Run routine

| Name | Security Key |
|------|-------------|
| VPR TEST JSON | — |
| VPR TEST XML | — |
| VPR HS ENABLE | VPR HS ENABLE |
| VPR HS PUSH | — |
| VPR HS TEST | — |
| VPR HS LOG | — |
| VPR HS PATIENTS | — |
| VPR HS SDA MONITOR | — |
| VPR HS TASK MONITOR | — |
| VPR PCMM PTPEVT TASK | — |

### Menu

| Name | Security Key |
|------|-------------|
| VPR HS MENU | — |
| VPR HS MGR | — |
| VPR HS TESTER | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `VPR HS ENABLE`

## API Route Summary

All routes are prefixed with `/vista/vpr/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/vpr/rpc/vpr-get-patient-data` | VPR GET PATIENT DATA | GLOBAL ARRAY |
| GET | `/vista/vpr/rpc/vpr-data-version` | VPR DATA VERSION | SINGLE VALUE |
| GET | `/vista/vpr/rpc/vpr-get-patient-data-json` | VPR GET PATIENT DATA JSON | GLOBAL ARRAY |
| GET | `/vista/vpr/rpc/vpr-get-checksum` | VPR GET CHECKSUM | GLOBAL ARRAY |
