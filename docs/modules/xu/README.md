# Kernel (XU)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

User accounts, access codes, security keys, menu assignments

| Property | Value |
|----------|-------|
| Namespace | `XU` |
| Tier | 5 |
| FileMan Files | 6 |
| RPCs | 5 |
| Menu Options | 38 |
| VDL Manual | `kernel-technical-manual.pdf` |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 200 | File #200 | ? | ? |
| 3.1 | File #3.1 | ? | ? |
| 19 | File #19 | ? | ? |
| 19.1 | File #19.1 | ? | ? |
| 8989.3 | File #8989.3 | ? | ? |
| 8989.5 | File #8989.5 | ? | ? |

## Remote Procedure Calls (RPCs)

### `XUPS PERSONQUERY`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `XUPSQRY` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 8 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XUPSLNAM | LITERAL | No |
| 2 | XUPSFNAM | LITERAL | No |
| 3 | XUPSSSN | LITERAL | No |
| 4 | XUPSPROV | LITERAL | No |
| 5 | XUPSSTN | LITERAL | No |
| 6 | XUPSMNM | LITERAL | No |
| 7 | XUPSDATE | LITERAL | No |
| 8 | XUPSVPID | LITERAL | No |

**API Endpoint:** `GET /vista/xu/rpc/xups-personquery`

---

### `XU EPCS EDIT`

| Property | Value |
|----------|-------|
| Tag | `ENTRY` |
| Routine | `XUEPCSED` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure stores information on editing changes in file 200 related to the electronic prescribing of controlled substances.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/xu/rpc/xu-epcs-edit`

---

### `MPI VISTA HWS CONFIG`

| Property | Value |
|----------|-------|
| Tag | `CHANGE` |
| Routine | `XUMVIWSC` |
| Return Type | ARRAY |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure Call (RPC) will be used to update the following fields for the 'MPI_NEW_PSIM EXECUTE' entry in the WEB SERVER (#18.12) file in VistA:         - USERNAME      - PASSWORD      - SERVER      - SSL PORT      - SSL CONFIGURATION   In addition, the HTTPS parameter can be updated in t

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER | LITERAL | No |
| 2 | PASS | LITERAL | No |
| 3 | SWITCH | LITERAL | No |
| 4 | SERVER | LITERAL | No |
| 5 | SSL PORT | LITERAL | No |
| 6 | SSL CONFIGURATION | LITERAL | No |

**API Endpoint:** `GET /vista/xu/rpc/mpi-vista-hws-config`

---

### `XULM GET LOCK TABLE`

| Property | Value |
|----------|-------|
| Tag | `LOCKS` |
| Routine | `XULMRPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used by the Lock Manager to obtain the lock table on a specific node.  The lock table is returned in a global.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCKGBL | LITERAL | No |
| 2 | RESULT | LITERAL | No |

**API Endpoint:** `POST /vista/xu/rpc/xulm-get-lock-table`

---

### `XULM KILL PROCESS`

| Property | Value |
|----------|-------|
| Tag | `KILLPROC` |
| Routine | `XULMRPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used by the Kernel Lock Manager to terminate a process.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PID | LITERAL | No |
| 2 | RETURN | LITERAL | No |

**API Endpoint:** `GET /vista/xu/rpc/xulm-kill-process`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| XWBUSRNM: | XUS SIGNON SETUP | XWBUSRNM | LITERAL | rpc |
| ASOSKIP: | XUS SIGNON SETUP | ASOSKIP | LITERAL | rpc |
| D20: | XUS SIGNON SETUP | D20 | LITERAL | rpc |
| AVCODE: | XUS AV CODE | AVCODE | LITERAL | rpc |
| KEY: | XUS KEY CHECK | KEY | REFERENCE | rpc |
| IEN: | XUS KEY CHECK | IEN | LITERAL | rpc |
| XU1: | XUS CVC | XU1 | LITERAL | rpc |
| DIV: | XUS DIVISION SET | DIV | LITERAL | rpc |
| IEN: | XUS DIVISION GET | IEN | LITERAL | rpc |
| CLIENT-IP: | XUS KAAJEE GET USER VIA PROXY | CLIENT-IP | LITERAL | rpc |
| SERVER-NM: | XUS KAAJEE GET USER VIA PROXY | SERVER-NM | LITERAL | rpc |
| CCOWTOK: | XUS KAAJEE GET USER VIA PROXY | CCOWTOK | LITERAL | rpc |
| IP-ADDRESS: | XUS KAAJEE GET CCOW TOKEN | IP-ADDRESS | LITERAL | rpc |
| IEN: | XUS ALLKEYS | IEN | LITERAL | rpc |
| FLAG: | XUS ALLKEYS | FLAG | LITERAL | rpc |
| TOKEN: | XUS GET VISITOR | TOKEN | LITERAL | rpc |
| CLIENT-IP: | XUS KAAJEE GET USER INFO | CLIENT-IP | LITERAL | rpc |
| SERVER-NM: | XUS KAAJEE GET USER INFO | SERVER-NM | LITERAL | rpc |
| SIGNON-LOG-DA: | XUS KAAJEE LOGOUT | SIGNON-LOG-DA | LITERAL | rpc |
| UPN: | XUS PKI SET UPN | UPN | LITERAL | rpc |
| NAME: | XUS IAM ADD USER | NAME | LITERAL | rpc |
| SECID: | XUS IAM ADD USER | SECID | LITERAL | rpc |
| EMAIL: | XUS IAM ADD USER | EMAIL | LITERAL | rpc |
| ADUPN: | XUS IAM ADD USER | ADUPN | LITERAL | rpc |
| SSN: | XUS IAM ADD USER | SSN | LITERAL | rpc |
| DOB: | XUS IAM ADD USER | DOB | LITERAL | rpc |
| STATION: | XUS IAM ADD USER | STATION | LITERAL | rpc |
| AUTHCODE: | XUS IAM ADD USER | AUTHCODE | LITERAL | rpc |
| INARRY: | XUS IAM EDIT USER | INARRY | REFERENCE | rpc |
| AUTHCODE: | XUS IAM EDIT USER | AUTHCODE | LITERAL | rpc |
| NAME: | XUS IAM FIND USER | NAME | LITERAL | rpc |
| SSN: | XUS IAM FIND USER | SSN | LITERAL | rpc |
| DOB: | XUS IAM FIND USER | DOB | LITERAL | rpc |
| ADUPN: | XUS IAM FIND USER | ADUPN | LITERAL | rpc |
| SECID: | XUS IAM FIND USER | SECID | LITERAL | rpc |
| AUTHCODE: | XUS IAM FIND USER | AUTHCODE | LITERAL | rpc |
| DISPDUZ: | XUS IAM DISPLAY USER | DISPDUZ | LITERAL | rpc |
| AUTHCODE: | XUS IAM DISPLAY USER | AUTHCODE | LITERAL | rpc |
| DOC: | XUS ESSO VALIDATE | DOC | LITERAL | rpc |
| SECID: | XUS IAM BIND USER | SECID | LITERAL | rpc |
| AUTHCODE: | XUS IAM BIND USER | AUTHCODE | LITERAL | rpc |
| ADUPN: | XUS IAM BIND USER | ADUPN | LITERAL | rpc |
| SECID: | XUS IAM TERMINATE USER | SECID | LITERAL | rpc |
| TERMDATE: | XUS IAM TERMINATE USER | TERMDATE | LITERAL | rpc |
| TERMRESN: | XUS IAM TERMINATE USER | TERMRESN | LITERAL | rpc |
| AUTHCODE: | XUS IAM TERMINATE USER | AUTHCODE | LITERAL | rpc |
| SECID: | XUS IAM REACTIVATE USER | SECID | LITERAL | rpc |
| AUTHCODE: | XUS IAM REACTIVATE USER | AUTHCODE | LITERAL | rpc |
| XPHRASE: | XUS BSE TOKEN | XPHRASE | LITERAL | rpc |
| DUZ: | XUS MVI NEW PERSON GET | DUZ | LITERAL | rpc |
| SECID: | XUS MVI NEW PERSON GET | SECID | LITERAL | rpc |
| NPI: | XUS MVI NEW PERSON GET | NPI | LITERAL | rpc |
| SSN: | XUS MVI NEW PERSON GET | SSN | LITERAL | rpc |
| XUARR: | XUS MVI NEW PERSON UPDATE | XUARR | REFERENCE | rpc |
| SEL: | XUS MVI NEW PERSON DATA | SEL | LITERAL | rpc |
| ACTSEL: | XUS MVI NEW PERSON DATA | ACTSEL | LITERAL | rpc |
| PARAM: | XUS MVI ENRICH NEW PERSON | PARAM | REFERENCE | rpc |
| FLAG: | XUS MVI ENRICH NEW PERSON | FLAG | LITERAL | rpc |
| XUDUZ: | XUS MVI NEW PERSON BULK GET | XUDUZ | LITERAL | rpc |
| XUTYPE: | XUS MVI NEW PERSON BULK GET | XUTYPE | LITERAL | rpc |
| XUIEN: | XUS IS USER ACTIVE | XUIEN | LITERAL | rpc |
| PARAM: | XUS MVI NEW PERSON RMTE AUDIT | PARAM | REFERENCE | rpc |
| XWBUSRNM: | XUS SIGNON SETUP | XWBUSRNM | LITERAL | rpc |
| ASOSKIP: | XUS SIGNON SETUP | ASOSKIP | LITERAL | rpc |
| D20: | XUS SIGNON SETUP | D20 | LITERAL | rpc |
| AVCODE: | XUS AV CODE | AVCODE | LITERAL | rpc |
| KEY: | XUS KEY CHECK | KEY | REFERENCE | rpc |
| IEN: | XUS KEY CHECK | IEN | LITERAL | rpc |
| XU1: | XUS CVC | XU1 | LITERAL | rpc |
| DIV: | XUS DIVISION SET | DIV | LITERAL | rpc |
| IEN: | XUS DIVISION GET | IEN | LITERAL | rpc |
| CLIENT-IP: | XUS KAAJEE GET USER VIA PROXY | CLIENT-IP | LITERAL | rpc |
| SERVER-NM: | XUS KAAJEE GET USER VIA PROXY | SERVER-NM | LITERAL | rpc |
| CCOWTOK: | XUS KAAJEE GET USER VIA PROXY | CCOWTOK | LITERAL | rpc |
| IP-ADDRESS: | XUS KAAJEE GET CCOW TOKEN | IP-ADDRESS | LITERAL | rpc |
| IEN: | XUS ALLKEYS | IEN | LITERAL | rpc |
| FLAG: | XUS ALLKEYS | FLAG | LITERAL | rpc |
| XUPSLNAM: | XUPS PERSONQUERY | XUPSLNAM | LITERAL | rpc |
| XUPSFNAM: | XUPS PERSONQUERY | XUPSFNAM | LITERAL | rpc |
| XUPSSSN: | XUPS PERSONQUERY | XUPSSSN | LITERAL | rpc |
| XUPSPROV: | XUPS PERSONQUERY | XUPSPROV | LITERAL | rpc |
| XUPSSTN: | XUPS PERSONQUERY | XUPSSTN | LITERAL | rpc |
| XUPSMNM: | XUPS PERSONQUERY | XUPSMNM | LITERAL | rpc |
| XUPSDATE: | XUPS PERSONQUERY | XUPSDATE | LITERAL | rpc |
| XUPSVPID: | XUPS PERSONQUERY | XUPSVPID | LITERAL | rpc |
| TOKEN: | XUS GET VISITOR | TOKEN | LITERAL | rpc |
| CLIENT-IP: | XUS KAAJEE GET USER INFO | CLIENT-IP | LITERAL | rpc |
| SERVER-NM: | XUS KAAJEE GET USER INFO | SERVER-NM | LITERAL | rpc |
| SIGNON-LOG-DA: | XUS KAAJEE LOGOUT | SIGNON-LOG-DA | LITERAL | rpc |
| UPN: | XUS PKI SET UPN | UPN | LITERAL | rpc |
| DATA: | XU EPCS EDIT | DATA | REFERENCE | rpc |
| NAME: | XUS IAM ADD USER | NAME | LITERAL | rpc |
| SECID: | XUS IAM ADD USER | SECID | LITERAL | rpc |
| EMAIL: | XUS IAM ADD USER | EMAIL | LITERAL | rpc |
| ADUPN: | XUS IAM ADD USER | ADUPN | LITERAL | rpc |
| SSN: | XUS IAM ADD USER | SSN | LITERAL | rpc |
| DOB: | XUS IAM ADD USER | DOB | LITERAL | rpc |
| STATION: | XUS IAM ADD USER | STATION | LITERAL | rpc |
| AUTHCODE: | XUS IAM ADD USER | AUTHCODE | LITERAL | rpc |
| INARRY: | XUS IAM EDIT USER | INARRY | REFERENCE | rpc |
| AUTHCODE: | XUS IAM EDIT USER | AUTHCODE | LITERAL | rpc |
| NAME: | XUS IAM FIND USER | NAME | LITERAL | rpc |
| SSN: | XUS IAM FIND USER | SSN | LITERAL | rpc |
| DOB: | XUS IAM FIND USER | DOB | LITERAL | rpc |
| ADUPN: | XUS IAM FIND USER | ADUPN | LITERAL | rpc |
| SECID: | XUS IAM FIND USER | SECID | LITERAL | rpc |
| AUTHCODE: | XUS IAM FIND USER | AUTHCODE | LITERAL | rpc |
| DISPDUZ: | XUS IAM DISPLAY USER | DISPDUZ | LITERAL | rpc |
| AUTHCODE: | XUS IAM DISPLAY USER | AUTHCODE | LITERAL | rpc |
| DOC: | XUS ESSO VALIDATE | DOC | LITERAL | rpc |
| SECID: | XUS IAM BIND USER | SECID | LITERAL | rpc |
| AUTHCODE: | XUS IAM BIND USER | AUTHCODE | LITERAL | rpc |
| ADUPN: | XUS IAM BIND USER | ADUPN | LITERAL | rpc |
| SECID: | XUS IAM TERMINATE USER | SECID | LITERAL | rpc |
| TERMDATE: | XUS IAM TERMINATE USER | TERMDATE | LITERAL | rpc |
| TERMRESN: | XUS IAM TERMINATE USER | TERMRESN | LITERAL | rpc |
| AUTHCODE: | XUS IAM TERMINATE USER | AUTHCODE | LITERAL | rpc |
| SECID: | XUS IAM REACTIVATE USER | SECID | LITERAL | rpc |
| AUTHCODE: | XUS IAM REACTIVATE USER | AUTHCODE | LITERAL | rpc |
| XPHRASE: | XUS BSE TOKEN | XPHRASE | LITERAL | rpc |
| USER: | MPI VISTA HWS CONFIG | USER | LITERAL | rpc |
| PASS: | MPI VISTA HWS CONFIG | PASS | LITERAL | rpc |
| SWITCH: | MPI VISTA HWS CONFIG | SWITCH | LITERAL | rpc |
| SERVER: | MPI VISTA HWS CONFIG | SERVER | LITERAL | rpc |
| SSL PORT: | MPI VISTA HWS CONFIG | SSL PORT | LITERAL | rpc |
| SSL CONFIGURATION: | MPI VISTA HWS CONFIG | SSL CONFIGURATION | LITERAL | rpc |
| DUZ: | XUS MVI NEW PERSON GET | DUZ | LITERAL | rpc |
| SECID: | XUS MVI NEW PERSON GET | SECID | LITERAL | rpc |
| NPI: | XUS MVI NEW PERSON GET | NPI | LITERAL | rpc |
| SSN: | XUS MVI NEW PERSON GET | SSN | LITERAL | rpc |
| XUARR: | XUS MVI NEW PERSON UPDATE | XUARR | REFERENCE | rpc |
| SEL: | XUS MVI NEW PERSON DATA | SEL | LITERAL | rpc |
| ACTSEL: | XUS MVI NEW PERSON DATA | ACTSEL | LITERAL | rpc |
| PARAM: | XUS MVI ENRICH NEW PERSON | PARAM | REFERENCE | rpc |
| FLAG: | XUS MVI ENRICH NEW PERSON | FLAG | LITERAL | rpc |
| XUDUZ: | XUS MVI NEW PERSON BULK GET | XUDUZ | LITERAL | rpc |
| XUTYPE: | XUS MVI NEW PERSON BULK GET | XUTYPE | LITERAL | rpc |
| LOCKGBL: | XULM GET LOCK TABLE | LOCKGBL | LITERAL | rpc |
| RESULT: | XULM GET LOCK TABLE | RESULT | LITERAL | rpc |
| PID: | XULM KILL PROCESS | PID | LITERAL | rpc |
| RETURN: | XULM KILL PROCESS | RETURN | LITERAL | rpc |
| XUIEN: | XUS IS USER ACTIVE | XUIEN | LITERAL | rpc |
| PARAM: | XUS MVI NEW PERSON RMTE AUDIT | PARAM | REFERENCE | rpc |

## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| XU BLOCK COUNT | — |
| XU FIRST LINE PRINT | — |
| XU FINDUSER | — |
| XU OPTION QUEUE | — |
| XU DA EDIT | — |
| XU SWITCH UCI | — |
| XU PROC CNT CLUP | — |
| XU SID STARTUP | — |
| XU SID ASK | XUMGR |
| XU IP RELEASE | — |
| XU CHECKSUM REPORT | — |
| XU CHECKSUM LOAD | — |
| XU SID EDIT | — |
| XU EPCS LOGICAL ACCESS | — |
| XU EPCS PSDRPH KEY | — |
| XU EPCS PSDRPH AUDIT | — |
| XU EPCS PRINT EDIT AUDIT | — |

### Menu

| Name | Security Key |
|------|-------------|
| XU SEC OFCR | — |
| XU NOP MENU | — |
| XU EPCS UTILITY FUNCTIONS | — |

### Action

| Name | Security Key |
|------|-------------|
| XU OPTION START | — |
| XU SITE LOCKOUT | — |
| XU PURGE PRINT QUEUE HFS FILES | — |

### Extended action

| Name | Security Key |
|------|-------------|
| XU USER SIGN-ON | — |
| XU USER TERMINATE | — |
| XU USER ADD | — |
| XU USER CHANGE | — |
| XU USER START-UP | — |

### Broker

| Name | Security Key |
|------|-------------|
| XU EPCS EDIT DATA | XUEPCSEDIT |

### Print

| Name | Security Key |
|------|-------------|
| XU EPCS EXP DATE | — |
| XU EPCS PSDRPH | — |
| XU EPCS SET PARMS | — |
| XU EPCS PRIVS | — |
| XU EPCS XDATE EXPIRES | — |
| XU EPCS DISUSER EXP DATE | — |
| XU EPCS DISUSER PRIVS | — |
| XU EPCS DISUSER XDATE EXPIRES | — |

### Edit

| Name | Security Key |
|------|-------------|
| XU EPCS EDIT DEA# AND XDATE | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `XUMGR`
- `XUEPCSEDIT`

## API Route Summary

All routes are prefixed with `/vista/xu/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/xu/rpc/xups-personquery` | XUPS PERSONQUERY | GLOBAL ARRAY |
| GET | `/vista/xu/rpc/xu-epcs-edit` | XU EPCS EDIT | SINGLE VALUE |
| GET | `/vista/xu/rpc/mpi-vista-hws-config` | MPI VISTA HWS CONFIG | ARRAY |
| POST | `/vista/xu/rpc/xulm-get-lock-table` | XULM GET LOCK TABLE | SINGLE VALUE |
| GET | `/vista/xu/rpc/xulm-kill-process` | XULM KILL PROCESS | SINGLE VALUE |

## VDL Documentation Reference

Source manual: `data/vista/vdl-manuals/kernel-technical-manual.pdf`

Refer to the official VA VistA Documentation Library (VDL) manual for:

- Roll & Scroll terminal operation procedures
- Security key assignments and menu management
- FileMan file relationships and data entry rules
- MUMPS routine reference and entry points
