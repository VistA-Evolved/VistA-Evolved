# Oncology (ONC)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `ONC` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 1 |
| Menu Options | 4 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `ONC VACCR RPC`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `ONCRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This REMOTE PROCEDURE outputs OncoTrax data in the VACCR record layout format.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATEUSED | LITERAL | No |
| 2 | START | LITERAL | No |
| 3 | END | LITERAL | No |

**API Endpoint:** `GET /vista/onc/rpc/onc-vaccr-rpc`

---


## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| ONC TNM FORMS COMPLETE % | — |
| ONC TIMELINESS REPORT | — |
| ONC ENTER/EDIT CHEMO DRUGS | — |
| ONC NON-STANDARD CHARACTERS | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/onc/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/onc/rpc/onc-vaccr-rpc` | ONC VACCR RPC | GLOBAL ARRAY |
