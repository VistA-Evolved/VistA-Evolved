# Remote Order Entry System (RMPF)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `RMPF` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 1 |
| Menu Options | 8 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `RMPFDEMOG`

| Property | Value |
|----------|-------|
| Tag | `START` |
| Routine | `RMPFRPC1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Accepts the patient DFN and returns an array containing predefined demographic information

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/rmpf/rpc/rmpfdemog`

---


## Menu Options

### Menu

| Name | Security Key |
|------|-------------|
| RMPF O/E STATION ASPS | — |
| RMPF STATION SUPER MENU | — |
| RMPF ASPS STATION SUPER MENU | — |
| RMPF PRINT/DISPLAY ASPS MENU | — |
| RMPF PSAS STATION SUPER MENU | — |
| RMPF PRINT/DISPLAY PSAS MENU | — |
| RMPF O/E STATION PSAS | — |

### Broker

| Name | Security Key |
|------|-------------|
| RMPF ROES3 | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/rmpf/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/rmpf/rpc/rmpfdemog` | RMPFDEMOG | ARRAY |
