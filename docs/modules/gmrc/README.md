# Consult Request Tracking (GMRC)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `GMRC` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 3 |
| Menu Options | 61 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `GMRC LIST CONSULT REQUESTS`

| Property | Value |
|----------|-------|
| Tag | `RPCLIST` |
| Routine | `GMRCTIU` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return a list of active and pending consult requests to associate a result with.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/gmrc/rpc/gmrc-list-consult-requests`

---

### `GMRCSTLM SERVICE AND STATUS`

| Property | Value |
|----------|-------|
| Tag | `ENOR` |
| Routine | `GMRCSTLM` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Description:** This returns a report of consults for a service/grouper for a given set of statuses and date range.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SERVICE | LITERAL | No |
| 2 | START DATE | LITERAL | No |
| 3 | END DATE | LITERAL | No |
| 4 | STATUSES | LITERAL | No |
| 5 | LIST TEMPLATE | LITERAL | No |
| 6 | LIST CONTROL | LITERAL | No |

**API Endpoint:** `GET /vista/gmrc/rpc/gmrcstlm-service-and-status`

---

### `GMRCSTU COMPLETION STATISTICS`

| Property | Value |
|----------|-------|
| Tag | `ENOR` |
| Routine | `GMRCSTU` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This returns a report of completion time statistics for a consult service/grouper for a given set of statuses and date range.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SERVICE | LITERAL | No |
| 2 | START DATE | LITERAL | No |
| 3 | END DATE | LITERAL | No |

**API Endpoint:** `GET /vista/gmrc/rpc/gmrcstu-completion-statistics`

---


## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| GMRC SETUP REQUEST SERVICES | — |
| GMRC SERVICE TRACKING | — |
| GMRC PHARMACY TPN CONSULTS | — |
| GMRC RPT PENDING CONSULTS | — |
| GMRC QUICK ORDER SETUP | — |
| GMRC QC PENDING CONSULTS | — |
| GMRC COMPLETION STATISTICS | — |
| GMRC PRINT TEST PAGE | — |
| GMRC UPDATE AUTHORITY | — |
| GMRC USER NOTIFICATION | — |
| GMRC TEST DEFAULT REASON | — |
| GMRC LIST HIERARCHY | — |
| GMRC RPT COMPLETE/PENDING | — |
| GMRC RPT COMPLETE CONSULTS | — |
| GMRC NOTIFICATION RECIPS | — |
| GMRC RPT CONSULTS BY STATUS | — |
| GMRC RPT NUMBERED CONSULTS | — |
| GMRC DUPLICATE SUB-SERVICE | — |
| GMRC PRINT COMPLETION STAT | — |
| GMRC PRINT RPT NUMBERED | — |
| GMRC CLONE PROSTHETICS | — |
| GMRC PROCEDURE SETUP | — |
| GMRC PRINT BY SEARCH | — |
| GMRC IFC RPT CONSULTS | — |
| GMRC IFC INC TRANS | — |
| GMRC IFC TEST SETUP | — |
| GMRC IFC TRANS | — |
| GMRC IFC REMOTE NUMBER | — |
| GMRC IFC PRINT RPT NUMBERED | — |
| GMRC IFC RPT CONSULTS BY PT | — |
| GMRC IFC RPT CONSULTS BY REMPR | — |
| GMRC IFC BACKGROUND STARTUP | — |
| GMRC IFC BKG PARAM MON | — |
| GMRC IFC TEST PT MPI | — |
| GMRC IFC INC RPT | — |
| GMRC ADMP31 CORRECTIONS | — |
| GMRC RPT PERF MONITOR | — |
| GMRC RPT SD SCH-MGT CONSULTS | — |
| GMRC RPT LOCAL COMPLETE RATE | — |
| GMRC CONSULT CLOSE TOOL RUN | — |
| GMRC RPT ADMIN RELEASE CONSULT | — |
| GMRC RPT ADMIN REL CONS USER | — |
| GMRC RPT ADMIN REL CONS GROUPR | — |
| GMRC CHANGE STATUS X TO DC | — |
| GMRC CX TO DC PARAMETER EDIT | — |
| GMRC IFC ERR COMM RPT 1 | — |
| GMRC IFC ERR COMM RPT 2 | — |

### Menu

| Name | Security Key |
|------|-------------|
| GMRC MGR | — |
| GMRC REPORTS | — |
| GMRC PHARMACY USER | — |
| GMRC GENERAL SERVICE USER | — |
| GMRC IFC MGMT | — |
| GMRC CONSULT CLOSURE TOOL | — |
| GMRC IFC ERR COMM RPT | — |

### Edit

| Name | Security Key |
|------|-------------|
| GMRC SERVICE USER MGMT | — |

### Action

| Name | Security Key |
|------|-------------|
| GMRC TERMINATE CLEANUP | — |
| GMRC IFC PARAMETER EDIT | — |
| GMRC FEE PARAM | — |
| GMRC FSC HCP MAIL GROUP | — |

### Other(C)

| Name | Security Key |
|------|-------------|
| GMRC CONSULT CLOSE TOOL EDT | — |

### Inquire

| Name | Security Key |
|------|-------------|
| GMRC CONSULT CLOSE TOOL INQ | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/gmrc/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/gmrc/rpc/gmrc-list-consult-requests` | GMRC LIST CONSULT REQUESTS | ARRAY |
| GET | `/vista/gmrc/rpc/gmrcstlm-service-and-status` | GMRCSTLM SERVICE AND STATUS | GLOBAL ARRAY |
| GET | `/vista/gmrc/rpc/gmrcstu-completion-statistics` | GMRCSTU COMPLETION STATISTICS | GLOBAL ARRAY |
