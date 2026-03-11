# Electronic Signature (XOBE)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `XOBE` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 5 |
| Menu Options | 1 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `XOBE ESIG GET CODE`

| Property | Value |
|----------|-------|
| Tag | `GETCODE` |
| Routine | `XOBESIG` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the electronic signature code for the user from the NEW PERSON file.

**API Endpoint:** `GET /vista/xobe/rpc/xobe-esig-get-code`

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

**API Endpoint:** `POST /vista/xobe/rpc/xobe-esig-set-code`

---

### `XOBE ESIG GET DATA`

| Property | Value |
|----------|-------|
| Tag | `GETDATA` |
| Routine | `XOBESIG` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns the data for the electronic signature block-related  fields from  the NEW PERSON file.

**API Endpoint:** `GET /vista/xobe/rpc/xobe-esig-get-data`

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

**API Endpoint:** `POST /vista/xobe/rpc/xobe-esig-set-data`

---

### `XOBE ESIG IS DEFINED`

| Property | Value |
|----------|-------|
| Tag | `ISDEF` |
| Routine | `XOBESIG` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns whether the user currently has an Electronic Signature Code  defined. Returns 0 if the e-sig code is null, 1 otherwise.

**API Endpoint:** `GET /vista/xobe/rpc/xobe-esig-is-defined`

---


## Menu Options

### Broker

| Name | Security Key |
|------|-------------|
| XOBE ESIG USER | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/xobe/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/xobe/rpc/xobe-esig-get-code` | XOBE ESIG GET CODE | SINGLE VALUE |
| POST | `/vista/xobe/rpc/xobe-esig-set-code` | XOBE ESIG SET CODE | SINGLE VALUE |
| GET | `/vista/xobe/rpc/xobe-esig-get-data` | XOBE ESIG GET DATA | ARRAY |
| POST | `/vista/xobe/rpc/xobe-esig-set-data` | XOBE ESIG SET DATA | ARRAY |
| GET | `/vista/xobe/rpc/xobe-esig-is-defined` | XOBE ESIG IS DEFINED | SINGLE VALUE |
