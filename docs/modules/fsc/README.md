# National Online Information Sharing (FSC)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `FSC` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 1 |
| Menu Options | 12 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `FSC RPC`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `FSCRPX` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** NOIS remote procedure entry. All RPCs for NOIS route through this entry.

**API Endpoint:** `GET /vista/fsc/rpc/fsc-rpc`

---


## Menu Options

### Action

| Name | Security Key |
|------|-------------|
| FSC QUERY CALLS | — |
| FSC EDIT CALL | — |
| FSC LIST CALLS | — |
| FSC NEW CALL | — |
| FSC REPORTS | — |
| FSC CLOSE CALL | — |
| FSC FILE SETUP | — |
| FSC EVENTS | — |
| FSC VIEW CALLS | — |

### Menu

| Name | Security Key |
|------|-------------|
| FSC MENU NOIS | — |

### Run routine

| Name | Security Key |
|------|-------------|
| FSC TASK AGE | — |

### Broker

| Name | Security Key |
|------|-------------|
| FSC RPC | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/fsc/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/fsc/rpc/fsc-rpc` | FSC RPC | GLOBAL ARRAY |
