# Toolkit (XT)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `XT` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 13 |
| Menu Options | 0 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `XTMUNIT-TEST LOAD`

| Property | Value |
|----------|-------|
| Tag | `GUILOAD` |
| Routine | `XTMUNIT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/xt/rpc/xtmunit-test-load`

---

### `XTMUNIT-TEST NEXT`

| Property | Value |
|----------|-------|
| Tag | `GUINEXT` |
| Routine | `XTMUNIT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/xt/rpc/xtmunit-test-next`

---

### `XTMUNIT-TEST GROUP LOAD`

| Property | Value |
|----------|-------|
| Tag | `GUISET` |
| Routine | `XTMUNIT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/xt/rpc/xtmunit-test-group-load`

---

### `XT ECLIPSE M EDITOR`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `XTECLIPS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/xt/rpc/xt-eclipse-m-editor`

---

### `XTDEBUG DO LINE`

| Property | Value |
|----------|-------|
| Tag | `DOLINE` |
| Routine | `XTDEBUG` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/xt/rpc/xtdebug-do-line`

---

### `XTDEBUG NEXT`

| Property | Value |
|----------|-------|
| Tag | `NEXT` |
| Routine | `XTDEBUG` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/xt/rpc/xtdebug-next`

---

### `XTDEBUG START`

| Property | Value |
|----------|-------|
| Tag | `START` |
| Routine | `XTDEBUG` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/xt/rpc/xtdebug-start`

---

### `XTDEBUG SYMBOL TABLE`

| Property | Value |
|----------|-------|
| Tag | `GETVALS` |
| Routine | `XTDEBUG` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/xt/rpc/xtdebug-symbol-table`

---

### `XTDEBUG ADD BREAKPOINT`

| Property | Value |
|----------|-------|
| Tag | `SETBREAK` |
| Routine | `XTDEBUG` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/xt/rpc/xtdebug-add-breakpoint`

---

### `XTDEBUG ADD WATCH`

| Property | Value |
|----------|-------|
| Tag | `SETWATCH` |
| Routine | `XTDEBUG` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/xt/rpc/xtdebug-add-watch`

---

### `XTDEBUG DELETE BREAK`

| Property | Value |
|----------|-------|
| Tag | `CLRBREAK` |
| Routine | `XTDEBUG5` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/xt/rpc/xtdebug-delete-break`

---

### `XTDEBUG DELETE WATCH`

| Property | Value |
|----------|-------|
| Tag | `CLRWATCH` |
| Routine | `XTDEBUG5` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/xt/rpc/xtdebug-delete-watch`

---

### `XTDEBUG READ INPUT`

| Property | Value |
|----------|-------|
| Tag | `READDATA` |
| Routine | `XTDEBUG` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XTDEBVAL | LITERAL | No |
| 2 | TIMEDOUT | LITERAL | No |

**API Endpoint:** `GET /vista/xt/rpc/xtdebug-read-input`

---


## Menu Options

No menu options found for this package namespace.

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/xt/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/xt/rpc/xtmunit-test-load` | XTMUNIT-TEST LOAD | GLOBAL ARRAY |
| GET | `/vista/xt/rpc/xtmunit-test-next` | XTMUNIT-TEST NEXT | GLOBAL ARRAY |
| GET | `/vista/xt/rpc/xtmunit-test-group-load` | XTMUNIT-TEST GROUP LOAD | GLOBAL ARRAY |
| GET | `/vista/xt/rpc/xt-eclipse-m-editor` | XT ECLIPSE M EDITOR | GLOBAL ARRAY |
| GET | `/vista/xt/rpc/xtdebug-do-line` | XTDEBUG DO LINE | GLOBAL ARRAY |
| GET | `/vista/xt/rpc/xtdebug-next` | XTDEBUG NEXT | GLOBAL ARRAY |
| GET | `/vista/xt/rpc/xtdebug-start` | XTDEBUG START | GLOBAL ARRAY |
| GET | `/vista/xt/rpc/xtdebug-symbol-table` | XTDEBUG SYMBOL TABLE | GLOBAL ARRAY |
| POST | `/vista/xt/rpc/xtdebug-add-breakpoint` | XTDEBUG ADD BREAKPOINT | GLOBAL ARRAY |
| POST | `/vista/xt/rpc/xtdebug-add-watch` | XTDEBUG ADD WATCH | GLOBAL ARRAY |
| POST | `/vista/xt/rpc/xtdebug-delete-break` | XTDEBUG DELETE BREAK | GLOBAL ARRAY |
| POST | `/vista/xt/rpc/xtdebug-delete-watch` | XTDEBUG DELETE WATCH | GLOBAL ARRAY |
| GET | `/vista/xt/rpc/xtdebug-read-input` | XTDEBUG READ INPUT | GLOBAL ARRAY |
