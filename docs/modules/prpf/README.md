# Integrated Patient Fund (PRPF)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `PRPF` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 2 |
| Menu Options | 61 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `PRPF DATABASE DIAG`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PRPFDR3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PRPFRPC | WORD-PROCESSING | No |

**API Endpoint:** `GET /vista/prpf/rpc/prpf-database-diag`

---

### `PRPF DATABASE EXTR`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PRPFMR1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** THIS USED FOR J2EE MIGRATION

**API Endpoint:** `GET /vista/prpf/rpc/prpf-database-extr`

---


## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| PRPF LONG REGISTRATION | — |
| PRPF SELECTED DATA EDIT | — |
| PRPF BALANCE CHECK | — |
| PRPF SHORT REGISTRATION | — |
| PRPF CHANGE ACCOUNT STATUS | — |
| PRPF POST | — |
| PRPF ALL CARDS | — |
| PRPF CARD | — |
| PRPF MULTIPLE POST | — |
| PRPF ADDRESS EDIT | — |
| PRPF GUARDIAN EDIT | — |
| PRPF POST BAL CAR FWD | — |
| PRPF CLEAR LOCK | — |
| PRPF DEFERRAL DATE EDIT | — |
| PRPF PRODUCTIVITY REPORT | — |
| PRPF UPDATE STATUS (ALL) | — |
| PRPF VERIFY & CORRECT | — |
| PRPF INFORMATION DISPLAY | — |
| PRPF TRANSACTION DISPLAY | — |
| PRPF ACTIVITY LIST | — |
| PRPF BALANCE IN ACCOUNTS | — |
| PRPF DORMANT | — |
| PRPF LIST OF PATIENTS | — |
| PRPF INDIGENT PATIENT LIST | — |
| PRPF OUT OF BALANCE REPORT | — |
| PRPF OVERDUE RESTRICTION | — |
| PRPF PATIENT SUMMARY | — |
| PRPF SEARCH FOR MIN/MAX | — |
| PRPF TRANSACTION LIST | — |
| PRPF SUSPENSE ADD | — |
| PRPF TASKMAN OUT OF BALANCE | — |
| PRPF TASKMAN UPDATE STATUS | — |
| PRPF SUSPENSE ITEM DELETE | — |
| PRPF SUSPENSE DATE DELETE | — |
| PRPF SUSPENSE REVIEW | — |
| PRPF SUSPENSE REPORT | — |
| PRPF FORMS EDIT | — |
| PRPF TRANSACTION REVIEW | — |
| PRPF FISCAL ACTIVITY  | — |
| PRPF FISCAL TRANS SUMMARY | — |
| PRPF REMARKS CODE EDIT | — |
| PRPF SUSPENSE REPORT (TASKMAN) | — |
| PRPF NEGATIVE BALANCES | — |
| PRPF ARCHIVE | PRPF SUPERVISOR |
| PRPF PURGE | PRPF SUPERVISOR |
| PRPF LOOK BACK REPORT | — |
| PRPF TASKMAN NEGATIVE BAL | — |
| PRPF UNASSIGNED STATION LIST | — |
| PRPF DATA DIAGNOSTIC REPORT | PRPF SUPERVISOR |

### Menu

| Name | Security Key |
|------|-------------|
| PRPF MASTER | — |
| PRPF REGISTRATION | — |
| PRPF DISPLAY/PRINT | — |
| PRPF SUPERVISOR | PRPF SUPERVISOR |
| PRPF OUTPUT (REPORTS) | — |
| PRPF SUSPENSE MASTER | — |
| PRPF FISCAL REPORTS | — |
| PRPF WARD CLERK | — |

### Print

| Name | Security Key |
|------|-------------|
| PRPF RANGE OF CARDS | — |
| PRPF CURRENT BAL | — |
| PRPF DATE VARIANCE REPORT | — |

### Broker

| Name | Security Key |
|------|-------------|
| PRPF RPC UTILS | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `PRPF SUPERVISOR`

## API Route Summary

All routes are prefixed with `/vista/prpf/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/prpf/rpc/prpf-database-diag` | PRPF DATABASE DIAG | GLOBAL ARRAY |
| GET | `/vista/prpf/rpc/prpf-database-extr` | PRPF DATABASE EXTR | GLOBAL ARRAY |
