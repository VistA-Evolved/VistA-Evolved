# IFCAP (PRC)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `PRC` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 3 |
| Menu Options | 16 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `PRCHL LIST`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `PRCHL4` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATE1 | LITERAL | No |
| 2 | DATE2 | LITERAL | No |

**API Endpoint:** `GET /vista/prc/rpc/prchl-list`

---

### `PRCHL LIST X`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `PRCHL5` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GUI REMOTE PROCEDURE, LIST DATA           ;RESULTS passed to broker in ^TMP($J,         ;delimited by "^"         ;piece 1 = DATA TO DISPLAY         ;piece 2 = FIELD NUMBER

**API Endpoint:** `GET /vista/prc/rpc/prchl-list-x`

---

### `PRCHL ITEM DET`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `PRCHL6` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** A         ;piece 1 - line item number          ;piece 2 - Item Master number          ;piece 3 - qty          ;piece 4 - unit of purchase          ;piece 5 - BOC          ;piece 6 - contract BOA          ;piece 7 - actual unit cost          ;piece 8 - fed supply classification          ;piece 9 - ve

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/prc/rpc/prchl-item-det`

---


## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| PRC RPT DOC REQUIRED DATA | — |
| PRC REVIEW OF VOUCHERS | — |
| PRC SO TO AR | PRCFA SUPERVISOR |
| PRC 1358 MONITORING | — |
| PRC 1358 SEPARATION VIOL | — |
| PRC DELETE SITE/FCP=0 | — |

### Action

| Name | Security Key |
|------|-------------|
| PRC GECS CODE EDIT | — |
| PRC GECS CREATE | — |
| PRC GECS DELETE | — |
| PRC GECS PURGE | PRCFA SUPERVISOR |
| PRC GECS REVIEW CODE SHEET | — |
| PRC GECS STACK RETRANSMIT | PRCFA SUPERVISOR |
| PRC GECS STACK REPORT | — |
| PRC GECS STACK USER COMMENTS | — |

### Menu

| Name | Security Key |
|------|-------------|
| PRC GECS MAIN MENU | — |
| PRC 1358 COMPLIANCE REPORTS | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `PRCFA SUPERVISOR`

## API Route Summary

All routes are prefixed with `/vista/prc/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/prc/rpc/prchl-list` | PRCHL LIST | GLOBAL ARRAY |
| GET | `/vista/prc/rpc/prchl-list-x` | PRCHL LIST X | GLOBAL ARRAY |
| GET | `/vista/prc/rpc/prchl-item-det` | PRCHL ITEM DET | ARRAY |
