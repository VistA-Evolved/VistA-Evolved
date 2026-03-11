# XOB (XOB)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `XOB` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 19 |
| Menu Options | 0 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `XOBV TEST STRING`

| Property | Value |
|----------|-------|
| Tag | `STRRP` |
| Routine | `XOBVLT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This simple RPC takes a string as input, adds some additional text  to the string and returns the string back to the client.   This RPC is used as part of the test and learning application distributed as part of VistALink.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STRING | LITERAL | No |

**API Endpoint:** `GET /vista/xob/rpc/xobv-test-string`

---

### `XOBV TEST GLOBAL ARRAY`

| Property | Value |
|----------|-------|
| Tag | `GARRRP` |
| Routine | `XOBVLT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This simple RPC takes an array as input, sets the array into a global  array and returns the global array information back to the client.   This RPC is used as part of the test and learning application distributed  as part of VistALink.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARRAY | REFERENCE | No |

**API Endpoint:** `GET /vista/xob/rpc/xobv-test-global-array`

---

### `XOBV TEST GLOBAL NODE`

| Property | Value |
|----------|-------|
| Tag | `GNODERP` |
| Routine | `XOBVLT` |
| Return Type | GLOBAL INSTANCE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This simple RPC takes a string as input, sets it as a global node and returns the global node back to the client.   This RPC is used as part of the test and learning application distributed as part of VistALink.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STRING | LITERAL | No |

**API Endpoint:** `GET /vista/xob/rpc/xobv-test-global-node`

---

### `XOBV TEST LOCAL ARRAY`

| Property | Value |
|----------|-------|
| Tag | `LARRRP` |
| Routine | `XOBVLT` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This simple RPC takes an array as input, sets the array into a local  array and returns the local array information back to the client.   This RPC is used as part of the test and learning application distributed  as part of VistALink.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARRAY | REFERENCE | No |

**API Endpoint:** `GET /vista/xob/rpc/xobv-test-local-array`

---

### `XOBV TEST VAR LENGTH REC`

| Property | Value |
|----------|-------|
| Tag | `VLRRP` |
| Routine | `XOBVLT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STRING | LITERAL | No |

**API Endpoint:** `GET /vista/xob/rpc/xobv-test-var-length-rec`

---

### `XOBV TEST WORD PROCESSING`

| Property | Value |
|----------|-------|
| Tag | `WPRP` |
| Routine | `XOBVLT` |
| Return Type | WORD PROCESSING |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This simple RPC takes no input parameters and returns a 'chunk' of text. This RPC is used to test whether VistALink properly transports 'chunks' of text.   This RPC is used as part of the test and learning application distributed as part of VistALink.

**API Endpoint:** `GET /vista/xob/rpc/xobv-test-word-processing`

---

### `XOBV TEST PING`

| Property | Value |
|----------|-------|
| Tag | `PINGRP` |
| Routine | `XOBVLT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This simple RPC takes no input and returns a success message. This is the  primary mechanism to test whether the client successfully connects to an M server using VistALink.                                        This RPC is used as part of the test and learning application distributed as part of Vi

**API Endpoint:** `GET /vista/xob/rpc/xobv-test-ping`

---

### `XOBV TEST RPC LIST`

| Property | Value |
|----------|-------|
| Tag | `RPCRP` |
| Routine | `XOBVLT` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns a list of RPC names that begin with the characters  indicated in the one input parameter.   This RPC is used as part of the test and learning application distributed as part of VistALink.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PREFIX | LITERAL | No |

**API Endpoint:** `GET /vista/xob/rpc/xobv-test-rpc-list`

---

### `XOBV TEST XML RESULTS`

| Property | Value |
|----------|-------|
| Tag | `XMLRP` |
| Routine | `XOBVLT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This simple RPC takes no input parameters and returns a 'chunk' of data  that is in XML format.   This RPC is used to test whether VistALink properly transports and parses  application results in XML format.   This RPC is used as part of the test and learning application distributed as part of VistA

**API Endpoint:** `GET /vista/xob/rpc/xobv-test-xml-results`

---

### `XOBV TEST NOT IN CONTEXT`

| Property | Value |
|----------|-------|
| Tag | `NOCNTXT` |
| Routine | `XOBVLT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC should not be used and returns the empty string (null).   This RPC is used to test the 'not in RPC context' check.    For this reason, this RPC is specifically NOT in the 'XOBV VISTALINK TESTER' B-type option in the OPTION (#19) file.   This RPC is used as part of the test and learning appl

**API Endpoint:** `GET /vista/xob/rpc/xobv-test-not-in-context`

---

### `XOBV TEST MULTIPLE SUBSCRIPTS`

| Property | Value |
|----------|-------|
| Tag | `MSUBS` |
| Routine | `XOBVLT` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC receives an array set up by a client. The client code indicates that the array should be presented to the RPC as multiple M subscripts (ex: DATA("TEXT",1,0) and not the usual DATA(1).   It sets the array into a local array and returns the local array information back to the client.   This R

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARRAY | REFERENCE | No |

**API Endpoint:** `GET /vista/xob/rpc/xobv-test-multiple-subscripts`

---

### `XOBV TEST MULT ARRAY PARAMS`

| Property | Value |
|----------|-------|
| Tag | `MARRAYS` |
| Routine | `XOBVLT` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC receives 3 arrays set up by a client. This tests the capability of VistaLink to support multiple array-type RPC parameters.   It sets each of the three arrays into a local array, sequentially, and returns the local array back to the client.   This RPC is used as part of the test and learnin

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARRAY | REFERENCE | No |
| 2 | ARRAY2 | REFERENCE | No |
| 3 | ARRAY3 | REFERENCE | No |

**API Endpoint:** `GET /vista/xob/rpc/xobv-test-mult-array-params`

---

### `XOBV SYSTEMINFO`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `XOBVSYSI` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns name^value pairs of system information about the M system.

**API Endpoint:** `GET /vista/xob/rpc/xobv-systeminfo`

---

### `XOBE ESIG GET CODE`

| Property | Value |
|----------|-------|
| Tag | `GETCODE` |
| Routine | `XOBESIG` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the electronic signature code for the user from the NEW PERSON file.

**API Endpoint:** `GET /vista/xob/rpc/xobe-esig-get-code`

---

### `XOBE ESIG SET CODE`

| Property | Value |
|----------|-------|
| Tag | `SETCODE` |
| Routine | `XOBESIG` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Saves the user's electronic signature code in the NEW PERSON file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ESIG | LITERAL | No |

**API Endpoint:** `POST /vista/xob/rpc/xobe-esig-set-code`

---

### `XOBE ESIG GET DATA`

| Property | Value |
|----------|-------|
| Tag | `GETDATA` |
| Routine | `XOBESIG` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns the data for the electronic signature block-related  fields from  the NEW PERSON file.

**API Endpoint:** `GET /vista/xob/rpc/xobe-esig-get-data`

---

### `XOBE ESIG SET DATA`

| Property | Value |
|----------|-------|
| Tag | `SETDATA` |
| Routine | `XOBESIG` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Saves the electronic signature block-related data in the NEW PERSON file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VALUES | REFERENCE | No |

**API Endpoint:** `POST /vista/xob/rpc/xobe-esig-set-data`

---

### `XOBE ESIG IS DEFINED`

| Property | Value |
|----------|-------|
| Tag | `ISDEF` |
| Routine | `XOBESIG` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns whether the user currently has an Electronic Signature Code  defined. Returns 0 if the e-sig code is null, 1 otherwise.

**API Endpoint:** `GET /vista/xob/rpc/xobe-esig-is-defined`

---

### `XOBV VALIDATE SAML`

| Property | Value |
|----------|-------|
| Tag | `SAML` |
| Routine | `XOBVSAML` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC receives a SAML token to validate a user logon to VistA.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DOC | LITERAL | No |

**API Endpoint:** `GET /vista/xob/rpc/xobv-validate-saml`

---


## Menu Options

No menu options found for this package namespace.

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/xob/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/xob/rpc/xobv-test-string` | XOBV TEST STRING | SINGLE VALUE |
| GET | `/vista/xob/rpc/xobv-test-global-array` | XOBV TEST GLOBAL ARRAY | GLOBAL ARRAY |
| GET | `/vista/xob/rpc/xobv-test-global-node` | XOBV TEST GLOBAL NODE | GLOBAL INSTANCE |
| GET | `/vista/xob/rpc/xobv-test-local-array` | XOBV TEST LOCAL ARRAY | ARRAY |
| GET | `/vista/xob/rpc/xobv-test-var-length-rec` | XOBV TEST VAR LENGTH REC | SINGLE VALUE |
| GET | `/vista/xob/rpc/xobv-test-word-processing` | XOBV TEST WORD PROCESSING | WORD PROCESSING |
| GET | `/vista/xob/rpc/xobv-test-ping` | XOBV TEST PING | SINGLE VALUE |
| GET | `/vista/xob/rpc/xobv-test-rpc-list` | XOBV TEST RPC LIST | ARRAY |
| GET | `/vista/xob/rpc/xobv-test-xml-results` | XOBV TEST XML RESULTS | SINGLE VALUE |
| GET | `/vista/xob/rpc/xobv-test-not-in-context` | XOBV TEST NOT IN CONTEXT | SINGLE VALUE |
| GET | `/vista/xob/rpc/xobv-test-multiple-subscripts` | XOBV TEST MULTIPLE SUBSCRIPTS | ARRAY |
| GET | `/vista/xob/rpc/xobv-test-mult-array-params` | XOBV TEST MULT ARRAY PARAMS | ARRAY |
| GET | `/vista/xob/rpc/xobv-systeminfo` | XOBV SYSTEMINFO | ARRAY |
| GET | `/vista/xob/rpc/xobe-esig-get-code` | XOBE ESIG GET CODE | SINGLE VALUE |
| POST | `/vista/xob/rpc/xobe-esig-set-code` | XOBE ESIG SET CODE | SINGLE VALUE |
| GET | `/vista/xob/rpc/xobe-esig-get-data` | XOBE ESIG GET DATA | ARRAY |
| POST | `/vista/xob/rpc/xobe-esig-set-data` | XOBE ESIG SET DATA | ARRAY |
| GET | `/vista/xob/rpc/xobe-esig-is-defined` | XOBE ESIG IS DEFINED | SINGLE VALUE |
| GET | `/vista/xob/rpc/xobv-validate-saml` | XOBV VALIDATE SAML | ARRAY |
