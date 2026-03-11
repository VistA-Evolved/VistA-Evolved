# E Claims Management Engine (BPS)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `BPS` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 4 |
| Menu Options | 38 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `BPS TAS CLAIM DATA EXTRACT`

| Property | Value |
|----------|-------|
| Tag | `EXTRACT` |
| Routine | `BPSRPC02` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Extract Data Fields for BPS Claims reports to save in TAS database.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BPS59 | LITERAL | No |

**API Endpoint:** `GET /vista/bps/rpc/bps-tas-claim-data-extract`

---

### `BPS TAS TXN IENS NEW`

| Property | Value |
|----------|-------|
| Tag | `RPC2` |
| Routine | `BPSRPC01` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Gather NEW/UPDATED Transaction IENs from BPS LOG OF TRANSACTIONS file  (#9002313.57) since last time an extract was run.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | COUNT | LITERAL | No |
| 2 | LOG | LITERAL | No |

**API Endpoint:** `GET /vista/bps/rpc/bps-tas-txn-iens-new`

---

### `BPS TAS CLAIM WRITE BACK`

| Property | Value |
|----------|-------|
| Tag | `PUT` |
| Routine | `BPSRPC03` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Update BPS LOG OF TRANSACTIONS field MCCF EDI TAS STATUS to indicate the  transaction was successfully copied to the TAS database.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/bps/rpc/bps-tas-claim-write-back`

---

### `BPS TAS DATABASE RESET`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `BPSTASDB` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Reset values in BPS LOG OF TRANSACTIONS to 1.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FLAG | LITERAL | No |
| 2 | DATE | LITERAL | No |

**API Endpoint:** `GET /vista/bps/rpc/bps-tas-database-reset`

---


## Menu Options

### Menu

| Name | Security Key |
|------|-------------|
| BPS SETUP MENU | BPS MASTER |
| BPS MANAGER MENU | BPS MANAGER |
| BPS MENU RPT MAIN | BPS REPORTS |
| BPS MENU RPT CLAIM STATUS | BPS REPORTS |
| BPS MENU RPT OTHER | BPS REPORTS |
| BPS MENU MAINTENANCE | BPS MANAGER |
| BPS COB MENU | — |

### Run routine

| Name | Security Key |
|------|-------------|
| BPS SETUP REGISTER PHARMACY | BPS MASTER |
| BPS USER SCREEN | BPS USER |
| BPS SETUP PHARMACY | BPS MASTER |
| BPS RPT REJECTION | BPS REPORTS |
| BPS RPT PAYABLE | BPS REPORTS |
| BPS RPT TOTALS BY DAY | BPS REPORTS |
| BPS RPT NOT RELEASED | BPS REPORTS |
| BPS RPT REVERSAL | BPS REPORTS |
| BPS RPT CLOSED CLAIMS | BPS REPORTS |
| BPS RPT CMOP/ECME ACTIVITY | BPS REPORTS |
| BPS NIGHTLY BACKGROUND JOB | — |
| BPS UNSTRAND SCREEN | BPS MANAGER |
| BPS RPT PAYER SHEET DETAIL | BPS REPORTS |
| BPS STATISTICS SCREEN | BPS MANAGER |
| BPS RPT TURNAROUND STATS | BPS REPORTS |
| BPS RPT RECENT TRANSACTIONS | BPS REPORTS |
| BPS SETUP BASIC PARAMS | BPS MASTER |
| BPS REOPEN CLOSED CLAIM | BPS MANAGER |
| BPS RPT CLAIMS RESPONSE | BPS REPORTS |
| BPS COB PROCESS SECOND TRICARE | BPS USER |
| BPS COB RPT SECONDARY CLAIMS | — |
| BPS POTENTIAL CLAIMS RPT DUAL | — |
| BPS RPT SPENDING ACCOUNT | BPS REPORTS |
| BPS RPT VIEW ECME RX | — |
| BPS RPT NON-BILLABLE REPORT | BPS REPORTS |
| BPS OPECC PRODUCTIVITY REPORT | BPS SUPERVISOR |
| BPS RPT DUPLICATE CLAIMS | BPS REPORTS |
| BPS RPT ERRORS | BPS REPORTS |
| BPS AUTO CLOSE REJECT | BPS SUPERVISOR |

### Print

| Name | Security Key |
|------|-------------|
| BPS RPT SETUP PHARMACIES | BPS REPORTS |

### Broker

| Name | Security Key |
|------|-------------|
| BPS EPHARMACY RPCS | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `BPS MASTER`
- `BPS MANAGER`
- `BPS USER`
- `BPS REPORTS`
- `BPS SUPERVISOR`

## API Route Summary

All routes are prefixed with `/vista/bps/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/bps/rpc/bps-tas-claim-data-extract` | BPS TAS CLAIM DATA EXTRACT | GLOBAL ARRAY |
| GET | `/vista/bps/rpc/bps-tas-txn-iens-new` | BPS TAS TXN IENS NEW | GLOBAL ARRAY |
| GET | `/vista/bps/rpc/bps-tas-claim-write-back` | BPS TAS CLAIM WRITE BACK | ARRAY |
| GET | `/vista/bps/rpc/bps-tas-database-reset` | BPS TAS DATABASE RESET | ARRAY |
