# Beneficiary Travel (DGBT)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `DGBT` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 1 |
| Menu Options | 25 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `DGBT CLAIM DEDUCTIBLE PAID`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `DGBTRDV` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** THIS RPC IS USED BY BENEFICIARY TRAVEL PACKAGE TO RETRIEVE TRAVEL CLAIM  INFORMATION ABOUT ANY TRAVEL CLAIMS FOR PATIENT.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ICN | LITERAL | No |
| 2 | CLAIM DATE | LITERAL | No |

**API Endpoint:** `GET /vista/dgbt/rpc/dgbt-claim-deductible-paid`

---


## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| DGBT BENE TRAVEL RATES | DGBT SUPERVISOR |
| DGBT BENE TRAVEL SCREEN | — |
| DGBT BENE TRAVEL REPORT | — |
| DGBT BENE TRAVEL CERTIFICATION | — |
| DGBT BENE TRAVEL VIEW | — |
| DGBT BENE TRAVEL REPRINT | — |
| DGBT BENE TRAVEL ACCOUNT | DGBT SUPERVISOR |
| DGBT LOCAL VENDOR ADD | — |
| DGBT LOCAL VENDOR UPDATE | — |
| DGBT MANUAL DEDUCTIBLE WAIVER | — |
| DGBT EDIT DENIAL LETTERS | DGBT EDIT DENIAL LTRS |
| DGBT ALTERNATE INCOME | — |
| DGBT REPRINT DENIAL LETTERS | — |
| DGBT SUMMARY REPORT | — |
| DGBT SPECIAL MODE REPORT | — |
| DGBT CLERK REPORT | — |
| DGBT AUDIT REPORT | — |
| DGBT TRAVEL PATTERN REPORT | — |
| DGBT FISCAL REPORT | — |

### Menu

| Name | Security Key |
|------|-------------|
| DGBT BENE TRAVEL MENU | — |
| DGBT LOCAL VENDOR MENU | DGBT LOCAL VENDOR |
| DGBT TRAVEL REPORTS MENU | — |

### Edit

| Name | Security Key |
|------|-------------|
| DGBT BENE TRAVEL CONFIG EDIT | DGBT SUPERVISOR |

### Broker

| Name | Security Key |
|------|-------------|
| DGBT CLAIM DEDUCTIBLE PAID | — |

### Other()

| Name | Security Key |
|------|-------------|
| DGBT BENE TRAVEL CLAIM AMT RPT | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `DGBT SUPERVISOR`
- `DGBT LOCAL VENDOR`
- `DGBT EDIT DENIAL LTRS`

## API Route Summary

All routes are prefixed with `/vista/dgbt/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/dgbt/rpc/dgbt-claim-deductible-paid` | DGBT CLAIM DEDUCTIBLE PAID | ARRAY |
