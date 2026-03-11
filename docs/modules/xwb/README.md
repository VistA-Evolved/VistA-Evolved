# RPC Broker (XWB)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Remote procedure call infrastructure, context management

| Property | Value |
|----------|-------|
| Namespace | `XWB` |
| Tier | 5 |
| FileMan Files | 2 |
| RPCs | 33 |
| Menu Options | 11 |
| VDL Manual | `rpc-broker-developer-guide.pdf` |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 8994 | File #8994 | ? | ? |
| 8994.5 | File #8994.5 | ? | ? |

## Remote Procedure Calls (RPCs)

### `XWB EGCHO STRING`

| Property | Value |
|----------|-------|
| Tag | `ECHO1` |
| Routine | `XWBZ1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC receives a string which will be sent right back to the client. It exists for support of EGcho - Broker demonstration program. to run d ECHO^XWBZ1(something)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INP | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-egcho-string`

---

### `XWB EGCHO LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `XWBZ1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC brings back a small list of elements to the client.  It exists for support of EGcho - Broker demonstration program.

**API Endpoint:** `GET /vista/xwb/rpc/xwb-egcho-list`

---

### `XWB EGCHO BIG LIST`

| Property | Value |
|----------|-------|
| Tag | `BIG` |
| Routine | `XWBZ1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC brings back a lot of meaningless data to the client.  It exists for support of EGcho - Broker demonstration program.

**API Endpoint:** `GET /vista/xwb/rpc/xwb-egcho-big-list`

---

### `XWB EGCHO SORT LIST`

| Property | Value |
|----------|-------|
| Tag | `SRT` |
| Routine | `XWBZ1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Sorts a given numeric array, starting from HI or LO It exists for support of EGcho - Broker demonstration program.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIRECTION | LITERAL | No |
| 2 | ARRAY | REFERENCE | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-egcho-sort-list`

---

### `XWB EGCHO MEMO`

| Property | Value |
|----------|-------|
| Tag | `MEMO` |
| Routine | `XWBZ1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC accepts text from a client which it will send right back to the client.  It exists for support of EGcho - Broker demonstration program.

**API Endpoint:** `GET /vista/xwb/rpc/xwb-egcho-memo`

---

### `XWB FILE LIST`

| Property | Value |
|----------|-------|
| Tag | `FILELIST` |
| Routine | `XWBFM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | START | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-file-list`

---

### `XWB FILENAME CHECK`

| Property | Value |
|----------|-------|
| Tag | `FILECHK` |
| Routine | `XWBFM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | START | LITERAL | No |
| 2 | FNAME | UNKNOWN() | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-filename-check`

---

### `XWB RPC LIST`

| Property | Value |
|----------|-------|
| Tag | `APILIST` |
| Routine | `XWBFM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of remote procedures from the REMOTE PROCEDURE file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | START | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-rpc-list`

---

### `XWB GET VARIABLE VALUE`

| Property | Value |
|----------|-------|
| Tag | `VARVAL` |
| Routine | `XWBLIB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC accepts the name of a variable which will be evaluated and its value returned to the server.  For example, this RPC may be called with a parameter variable like DUZ which will be returned as 123456.   It should NOT be used to return the value of anything other than a  variable. For example,

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VARIABLE | WORD-PROCESSING | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-get-variable-value`

---

### `XWB CREATE CONTEXT`

| Property | Value |
|----------|-------|
| Tag | `CRCONTXT` |
| Routine | `XWBSEC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Establishes context on the server, which will be checked by the Broker before executing any other remote procedure.  Since context is nothing more than a client/server "B"-type option in the OPTION file (#19), standard MenuMan security is applied in establishing a context.  Therefore, a context opti

**API Endpoint:** `POST /vista/xwb/rpc/xwb-create-context`

---

### `XWB EXAMPLE ECHO STRING`

| Property | Value |
|----------|-------|
| Tag | `ECHOSTR` |
| Routine | `XWBEXMPL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC receives a string which will be sent right back to the client. It exists for support of RPC Broker Example program.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INP | LITERAL | No |
| 2 | STR | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-example-echo-string`

---

### `XWB EXAMPLE GET LIST`

| Property | Value |
|----------|-------|
| Tag | `GETLIST` |
| Routine | `XWBEXMPL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC brings back a list of elements to the client.  The user can request either a number of lines or a number of Kilobytes of data to be returned. This RPC exists support of RPC Broker Example program.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ITEMS | LITERAL | No |
| 2 | QUANTITY | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-example-get-list`

---

### `XWB EXAMPLE WPTEXT`

| Property | Value |
|----------|-------|
| Tag | `WPTEXT` |
| Routine | `XWBEXMPL` |
| Return Type | WORD PROCESSING |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-example-wptext`

---

### `XWB EXAMPLE SORT NUMBERS`

| Property | Value |
|----------|-------|
| Tag | `SORTNUM` |
| Routine | `XWBEXMPL` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-example-sort-numbers`

---

### `XWB GET BROKER INFO`

| Property | Value |
|----------|-------|
| Tag | `BRKRINFO` |
| Routine | `XWBLIB` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns info regarding setup and parameters of the Broker.

**API Endpoint:** `GET /vista/xwb/rpc/xwb-get-broker-info`

---

### `XWB IM HERE`

| Property | Value |
|----------|-------|
| Tag | `IMHERE` |
| Routine | `XWBLIB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a simple value to the client.  Used to establish continued  existence of the client to the server: resets the server READ timeout.

**API Endpoint:** `GET /vista/xwb/rpc/xwb-im-here`

---

### `XWB IS RPC AVAILABLE`

| Property | Value |
|----------|-------|
| Tag | `CKRPC` |
| Routine | `XWBLIB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** If RPC is installed, available in relevant context, and of proper version returns 1.   Otherwise, returns 0.   Integration Agreement (IA) #3011

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RPC | LITERAL | No |
| 2 | RUN CONTEXT | LITERAL | No |
| 3 | VERSION NUMBER | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-is-rpc-available`

---

### `XWB ARE RPCS AVAILABLE`

| Property | Value |
|----------|-------|
| Tag | `CKRPCS` |
| Routine | `XWBLIB` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** If RPC in the passed array is installed, available in relevant context, and of proper version returns 1 for that RPC. Otherwise, returns 0.   Integration Agreement (IA) #3012

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RPC | REFERENCE | No |
| 2 | RUN CONTEXT | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-are-rpcs-available`

---

### `XWB REMOTE RPC`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `XWB2HL7` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This is the RPC that is called to request that an application RPC be run on a remote system.  The data is passed by HL7 to the remote system as is the return value.     This RPC will return a HANDLE that can be used to check if the data has been sent back from the remote system.  The HANDLE can be u

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOC | LITERAL | No |
| 2 | RRPC | LITERAL | No |
| 3 | IP1 | LITERAL | No |
| 4 | IP2 | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-remote-rpc`

---

### `XWB REMOTE STATUS CHECK`

| Property | Value |
|----------|-------|
| Tag | `RPCCHK` |
| Routine | `XWB2HL7` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the status of a remote RPC.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HANDLE | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-remote-status-check`

---

### `XWB REMOTE GETDATA`

| Property | Value |
|----------|-------|
| Tag | `RTNDATA` |
| Routine | `XWBDRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return an ARRAY with what ever data has been sent back from the remote site.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HANDLE | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-remote-getdata`

---

### `XWB DEFERRED RPC`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `XWBDRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This is the RPC that is called to request that a RPC be run through taskman in the background.   The first parameter is the name of the RPC to be run.   The next 1-10 parameters are the ones for the RPC.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RPC | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-deferred-rpc`

---

### `XWB DEFERRED STATUS`

| Property | Value |
|----------|-------|
| Tag | `RPCCHK` |
| Routine | `XWBDRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the status of a deferred RPC.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HANDLE | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-deferred-status`

---

### `XWB DEFERRED GETDATA`

| Property | Value |
|----------|-------|
| Tag | `RTNDATA` |
| Routine | `XWBDRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to return the data from the XWB DEFERRED RPC call.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HANDLE | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-deferred-getdata`

---

### `XWB DIRECT RPC`

| Property | Value |
|----------|-------|
| Tag | `DIRECT` |
| Routine | `XWB2HL7` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This is the Broker RPC that is called to request that a RPC be run on a remote system.  The data is passed by HL7 to the remote system as is the return value.  The difference between this and the XWB REMOTE RPC is this is a blocking call meaning the user's workstation will not process anything else

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOC | LITERAL | No |
| 2 | RRPC | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-direct-rpc`

---

### `XWB REMOTE CLEAR`

| Property | Value |
|----------|-------|
| Tag | `CLEAR` |
| Routine | `XWBDRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to CLEAR the data under a HANDLE in the ^XTMP global.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HANDLE | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-remote-clear`

---

### `XWB DEFERRED CLEAR`

| Property | Value |
|----------|-------|
| Tag | `CLEAR` |
| Routine | `XWBDRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to CLEAR the data under a handle in the ^XTMP global.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HANDLE | LITERAL | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-deferred-clear`

---

### `XWB DEFERRED CLEARALL`

| Property | Value |
|----------|-------|
| Tag | `CLEARALL` |
| Routine | `XWBDRPC` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to CLEAR all the data known to this job in the ^XTMP global.  Makes use of the list in ^TMP("XWBHDL",$J,handle).

**API Endpoint:** `GET /vista/xwb/rpc/xwb-deferred-clearall`

---

### `XWB EXAMPLE TRAP PARAMS`

| Property | Value |
|----------|-------|
| Tag | `ERRTRAP` |
| Routine | `XWBEXMPL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is for testing use only. It calls the Error Trap to save off the symbol table for debuging.   The call accepts up to 9 parameters that are labeled P1 to P9.

**API Endpoint:** `GET /vista/xwb/rpc/xwb-example-trap-params`

---

### `XWB M2M EXAMPLE LARRY`

| Property | Value |
|----------|-------|
| Tag | `LARRYRP` |
| Routine | `XWBM2MT` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARRAY | REFERENCE | No |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-m2m-example-larry`

---

### `XWB M2M EXAMPLE REF`

| Property | Value |
|----------|-------|
| Tag | `REFRP` |
| Routine | `XWBM2MT` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Test RPC for M2M.  This just returns result by reference.

**API Endpoint:** `GET /vista/xwb/rpc/xwb-m2m-example-ref`

---

### `XWB EXAMPLE GLOBAL SORT`

| Property | Value |
|----------|-------|
| Tag | `GSORT` |
| Routine | `XWBEXMPL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC uses the new Global call to send down a BIG list of number to   sort.  In the old Broker it would cause an allocation error but this one   saves the data into a temp global.

**API Endpoint:** `GET /vista/xwb/rpc/xwb-example-global-sort`

---

### `XWB EXAMPLE BIG TEXT`

| Property | Value |
|----------|-------|
| Tag | `BIGTXT` |
| Routine | `XWBEXMPL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/xwb/rpc/xwb-example-big-text`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| INP: | XWB EGCHO STRING | INP | LITERAL | rpc |
| DIRECTION: | XWB EGCHO SORT LIST | DIRECTION | LITERAL | rpc |
| ARRAY: | XWB EGCHO SORT LIST | ARRAY | REFERENCE | rpc |
| START: | XWB FILE LIST | START | LITERAL | rpc |
| START: | XWB FILENAME CHECK | START | LITERAL | rpc |
| FNAME: | XWB FILENAME CHECK | FNAME | UNKNOWN() | rpc |
| START: | XWB RPC LIST | START | LITERAL | rpc |
| VARIABLE: | XWB GET VARIABLE VALUE | VARIABLE | WORD-PROCESSING | rpc |
| INP: | XWB EXAMPLE ECHO STRING | INP | LITERAL | rpc |
| STR: | XWB EXAMPLE ECHO STRING | STR | LITERAL | rpc |
| ITEMS: | XWB EXAMPLE GET LIST | ITEMS | LITERAL | rpc |
| QUANTITY: | XWB EXAMPLE GET LIST | QUANTITY | LITERAL | rpc |
| RPC: | XWB IS RPC AVAILABLE | RPC | LITERAL | rpc |
| RUN CONTEXT: | XWB IS RPC AVAILABLE | RUN CONTEXT | LITERAL | rpc |
| VERSION NUMBER: | XWB IS RPC AVAILABLE | VERSION NUMBER | LITERAL | rpc |
| RPC: | XWB ARE RPCS AVAILABLE | RPC | REFERENCE | rpc |
| RUN CONTEXT: | XWB ARE RPCS AVAILABLE | RUN CONTEXT | LITERAL | rpc |
| LOC: | XWB REMOTE RPC | LOC | LITERAL | rpc |
| RRPC: | XWB REMOTE RPC | RRPC | LITERAL | rpc |
| IP1: | XWB REMOTE RPC | IP1 | LITERAL | rpc |
| IP2: | XWB REMOTE RPC | IP2 | LITERAL | rpc |
| HANDLE: | XWB REMOTE STATUS CHECK | HANDLE | LITERAL | rpc |
| HANDLE: | XWB REMOTE GETDATA | HANDLE | LITERAL | rpc |
| RPC: | XWB DEFERRED RPC | RPC | LITERAL | rpc |
| HANDLE: | XWB DEFERRED STATUS | HANDLE | LITERAL | rpc |
| HANDLE: | XWB DEFERRED GETDATA | HANDLE | LITERAL | rpc |
| LOC: | XWB DIRECT RPC | LOC | LITERAL | rpc |
| RRPC: | XWB DIRECT RPC | RRPC | LITERAL | rpc |
| HANDLE: | XWB REMOTE CLEAR | HANDLE | LITERAL | rpc |
| HANDLE: | XWB DEFERRED CLEAR | HANDLE | LITERAL | rpc |
| ARRAY: | XWB M2M EXAMPLE LARRY | ARRAY | REFERENCE | rpc |

## Menu Options

### Broker

| Name | Security Key |
|------|-------------|
| XWB EGCHO | — |
| XWB RPC TEST | — |
| XWB BROKER EXAMPLE | — |

### Run routine

| Name | Security Key |
|------|-------------|
| XWB LISTENER STARTER | — |
| XWB LISTENER STOP ALL | — |
| XWB M2M CACHE LISTENER | — |
| XWB DEBUG EDIT | — |
| XWB LOG VIEW | — |
| XWB LOG CLEAR | — |

### Menu

| Name | Security Key |
|------|-------------|
| XWB MENU | — |

### Edit

| Name | Security Key |
|------|-------------|
| XWB LISTENER EDIT | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/xwb/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/xwb/rpc/xwb-egcho-string` | XWB EGCHO STRING | SINGLE VALUE |
| GET | `/vista/xwb/rpc/xwb-egcho-list` | XWB EGCHO LIST | ARRAY |
| GET | `/vista/xwb/rpc/xwb-egcho-big-list` | XWB EGCHO BIG LIST | GLOBAL ARRAY |
| GET | `/vista/xwb/rpc/xwb-egcho-sort-list` | XWB EGCHO SORT LIST | ARRAY |
| GET | `/vista/xwb/rpc/xwb-egcho-memo` | XWB EGCHO MEMO | GLOBAL ARRAY |
| GET | `/vista/xwb/rpc/xwb-file-list` | XWB FILE LIST | ARRAY |
| GET | `/vista/xwb/rpc/xwb-filename-check` | XWB FILENAME CHECK | SINGLE VALUE |
| GET | `/vista/xwb/rpc/xwb-rpc-list` | XWB RPC LIST | ARRAY |
| GET | `/vista/xwb/rpc/xwb-get-variable-value` | XWB GET VARIABLE VALUE | SINGLE VALUE |
| POST | `/vista/xwb/rpc/xwb-create-context` | XWB CREATE CONTEXT | SINGLE VALUE |
| GET | `/vista/xwb/rpc/xwb-example-echo-string` | XWB EXAMPLE ECHO STRING | SINGLE VALUE |
| GET | `/vista/xwb/rpc/xwb-example-get-list` | XWB EXAMPLE GET LIST | GLOBAL ARRAY |
| GET | `/vista/xwb/rpc/xwb-example-wptext` | XWB EXAMPLE WPTEXT | WORD PROCESSING |
| GET | `/vista/xwb/rpc/xwb-example-sort-numbers` | XWB EXAMPLE SORT NUMBERS | ARRAY |
| GET | `/vista/xwb/rpc/xwb-get-broker-info` | XWB GET BROKER INFO | ARRAY |
| GET | `/vista/xwb/rpc/xwb-im-here` | XWB IM HERE | SINGLE VALUE |
| GET | `/vista/xwb/rpc/xwb-is-rpc-available` | XWB IS RPC AVAILABLE | SINGLE VALUE |
| GET | `/vista/xwb/rpc/xwb-are-rpcs-available` | XWB ARE RPCS AVAILABLE | ARRAY |
| GET | `/vista/xwb/rpc/xwb-remote-rpc` | XWB REMOTE RPC | ARRAY |
| GET | `/vista/xwb/rpc/xwb-remote-status-check` | XWB REMOTE STATUS CHECK | ARRAY |
| GET | `/vista/xwb/rpc/xwb-remote-getdata` | XWB REMOTE GETDATA | ARRAY |
| GET | `/vista/xwb/rpc/xwb-deferred-rpc` | XWB DEFERRED RPC | ARRAY |
| GET | `/vista/xwb/rpc/xwb-deferred-status` | XWB DEFERRED STATUS | ARRAY |
| GET | `/vista/xwb/rpc/xwb-deferred-getdata` | XWB DEFERRED GETDATA | ARRAY |
| GET | `/vista/xwb/rpc/xwb-direct-rpc` | XWB DIRECT RPC | ARRAY |
| GET | `/vista/xwb/rpc/xwb-remote-clear` | XWB REMOTE CLEAR | ARRAY |
| GET | `/vista/xwb/rpc/xwb-deferred-clear` | XWB DEFERRED CLEAR | ARRAY |
| GET | `/vista/xwb/rpc/xwb-deferred-clearall` | XWB DEFERRED CLEARALL | ARRAY |
| GET | `/vista/xwb/rpc/xwb-example-trap-params` | XWB EXAMPLE TRAP PARAMS | SINGLE VALUE |
| GET | `/vista/xwb/rpc/xwb-m2m-example-larry` | XWB M2M EXAMPLE LARRY | ARRAY |
| GET | `/vista/xwb/rpc/xwb-m2m-example-ref` | XWB M2M EXAMPLE REF | ARRAY |
| GET | `/vista/xwb/rpc/xwb-example-global-sort` | XWB EXAMPLE GLOBAL SORT | GLOBAL ARRAY |
| GET | `/vista/xwb/rpc/xwb-example-big-text` | XWB EXAMPLE BIG TEXT | SINGLE VALUE |

## VDL Documentation Reference

Source manual: `data/vista/vdl-manuals/rpc-broker-developer-guide.pdf`

Refer to the official VA VistA Documentation Library (VDL) manual for:

- Roll & Scroll terminal operation procedures
- Security key assignments and menu management
- FileMan file relationships and data entry rules
- MUMPS routine reference and entry points
