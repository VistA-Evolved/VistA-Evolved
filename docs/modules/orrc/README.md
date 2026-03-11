# Care Management (ORRC)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `ORRC` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 4 |
| Menu Options | 0 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `ORRC AUTHENTICATE`

| Property | Value |
|----------|-------|
| Tag | `AUTHNTC` |
| Routine | `ORRZAUTH` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This call is currently in use as an abstraction around a general  interface for authentication. It accepts the ACCESS and VERIFY codes for  the current user and returns a userIdTable and a rolesTable.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ACCESS | LITERAL | No |
| 2 | VERIFY | LITERAL | No |

**API Endpoint:** `GET /vista/orrc/rpc/orrc-authenticate`

---

### `ORRCQLPT PTDFN`

| Property | Value |
|----------|-------|
| Tag | `PTDFN` |
| Routine | `ORRCQLPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** RETURNS THE DFN GIVEN A REPORT LINE IDENTIFIER

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OID | LITERAL | No |

**API Endpoint:** `GET /vista/orrc/rpc/orrcqlpt-ptdfn`

---

### `ORRCQLPT PTDEMOS`

| Property | Value |
|----------|-------|
| Tag | `PTDEMOS` |
| Routine | `ORRCQLPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Returns patient demographics info in the form: <dfn>^<name>^<ssn>^<dob>^<age>

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/orrc/rpc/orrcqlpt-ptdemos`

---

### `ORRC SYSID`

| Property | Value |
|----------|-------|
| Tag | `SYS` |
| Routine | `ORRCLNP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the system identifier as a prodcution system or not.

**API Endpoint:** `GET /vista/orrc/rpc/orrc-sysid`

---


## Menu Options

No menu options found for this package namespace.

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/orrc/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/orrc/rpc/orrc-authenticate` | ORRC AUTHENTICATE | GLOBAL ARRAY |
| GET | `/vista/orrc/rpc/orrcqlpt-ptdfn` | ORRCQLPT PTDFN | SINGLE VALUE |
| GET | `/vista/orrc/rpc/orrcqlpt-ptdemos` | ORRCQLPT PTDEMOS | SINGLE VALUE |
| GET | `/vista/orrc/rpc/orrc-sysid` | ORRC SYSID | SINGLE VALUE |
