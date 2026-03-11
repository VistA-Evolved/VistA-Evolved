# National Health Information Network (NHIN)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `NHIN` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 1 |
| Menu Options | 2 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `NHIN GET VISTA DATA`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `NHINV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Description:** This RPC retrieves the requested data from VistA, and returns it in ^TMP($J,"NHINV",n) as XML.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | TYPE | LITERAL | No |
| 3 | START | LITERAL | No |
| 4 | STOP | LITERAL | No |
| 5 | MAX | LITERAL | No |
| 6 | ITEM | LITERAL | No |

**API Endpoint:** `GET /vista/nhin/rpc/nhin-get-vista-data`

---


## Menu Options

### Broker

| Name | Security Key |
|------|-------------|
| NHIN APPLICATION PROXY | — |
| NHIN DAS CC | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/nhin/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/nhin/rpc/nhin-get-vista-data` | NHIN GET VISTA DATA | GLOBAL ARRAY |
