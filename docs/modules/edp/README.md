# Emergency Department Integration Software (EDP)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `EDP` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 3 |
| Menu Options | 1 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `EDPCTRL RPC`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `EDPCTRL` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC acts as the "front controller" for the EDIS Tracking Application. It accepts requests that are initially passed into a web server.  The RPC uses the parameters that are passed in to determine which command to  execute.  The returned data is formatted as XML.  The XML structure varies based

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMS | REFERENCE | No |

**API Endpoint:** `GET /vista/edp/rpc/edpctrl-rpc`

---

### `EDPCBRD RPC`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `EDPCBRD` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC acts as the "front controller" for the EDIS Display Board.  It  accepts requests that are initially passed into a web server.  The RPC  uses the parameters that are passed in to determine which command to  execute.  The returned data is formatted as XML.  The XML structure  varies based a w

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SESS | LITERAL | No |
| 2 | PARAMS | REFERENCE | No |

**API Endpoint:** `GET /vista/edp/rpc/edpcbrd-rpc`

---

### `EDPGLOB RPC`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `EDPGLOB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC acts as the "front controller" for laboratory data calls. The  RPC uses the parameters passed in to gather lab data for a given patient,  and return the data in XML format.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMS | REFERENCE | No |
| 2 | PARAMS2 | REFERENCE | No |

**API Endpoint:** `GET /vista/edp/rpc/edpglob-rpc`

---


## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| EDP CONVERSION | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/edp/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/edp/rpc/edpctrl-rpc` | EDPCTRL RPC | ARRAY |
| GET | `/vista/edp/rpc/edpcbrd-rpc` | EDPCBRD RPC | ARRAY |
| GET | `/vista/edp/rpc/edpglob-rpc` | EDPGLOB RPC | GLOBAL ARRAY |
