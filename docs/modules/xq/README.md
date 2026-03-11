# XQ (XQ)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `XQ` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 2 |
| Menu Options | 3 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `XQAL GUI ALERTS`

| Property | Value |
|----------|-------|
| Tag | `ENTRY` |
| Routine | `XQALGUI` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This is the RPC that handles the XUAlert component

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/xq/rpc/xqal-gui-alerts`

---

### `XU REBUILD MENU TREE`

| Property | Value |
|----------|-------|
| Tag | `REBUILD` |
| Routine | `XQ84` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This API rebuilds the menu trees and display nodes for a single user  (DUZ). It returns 0 if unsuccessful, 1 if successful.

**API Endpoint:** `GET /vista/xq/rpc/xu-rebuild-menu-tree`

---


## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| XQ UNREF'D OPTIONS | — |
| XQ XUTL $J NODES | — |
| XQ LIST UNREFERENCED OPTIONS | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/xq/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/xq/rpc/xqal-gui-alerts` | XQAL GUI ALERTS | GLOBAL ARRAY |
| GET | `/vista/xq/rpc/xu-rebuild-menu-tree` | XU REBUILD MENU TREE | SINGLE VALUE |
