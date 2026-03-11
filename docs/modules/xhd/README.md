# XHD (XHD)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `XHD` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 16 |
| Menu Options | 0 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `XHD DELETE PARAMETER CATEGORY`

| Property | Value |
|----------|-------|
| Tag | `DELETE` |
| Routine | `XHDPCAT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This call deletes parameter categories from the M backing store. If the  second parameter, DELKIDS is passed as "1" (boolean true by M programming  convention), all descendents of the category in question will also be  deleted.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PCAT | LITERAL | No |
| 2 | DELKIDS | LITERAL | No |

**API Endpoint:** `POST /vista/xhd/rpc/xhd-delete-parameter-category`

---

### `XHD GET ALL PARAMETER DEFS`

| Property | Value |
|----------|-------|
| Tag | `GETXML` |
| Routine | `XHDPDEF` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns all Parameter Definitions.

**API Endpoint:** `GET /vista/xhd/rpc/xhd-get-all-parameter-defs`

---

### `XHD GET CONFIGURATION`

| Property | Value |
|----------|-------|
| Tag | `GETTREE` |
| Routine | `XHDPTREE` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns Configuration tree as XML in the following format:

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MODULEID | LITERAL | No |

**API Endpoint:** `GET /vista/xhd/rpc/xhd-get-configuration`

---

### `XHD GET MUTABLE CONFIGURATION`

| Property | Value |
|----------|-------|
| Tag | `GETTREE` |
| Routine | `XHDPMUT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns Configuration tree as XML in the following format:

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MODULEID | LITERAL | No |

**API Endpoint:** `GET /vista/xhd/rpc/xhd-get-mutable-configuration`

---

### `XHD GET PARAMETER DEF LIST`

| Property | Value |
|----------|-------|
| Tag | `GETALL` |
| Routine | `XHDPDEF` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Gets all parameter definitions as a list with IEN^NAME^DISPLAY NAME in  each node of the return array.

**API Endpoint:** `GET /vista/xhd/rpc/xhd-get-parameter-def-list`

---

### `XHD GET PARAMETER DEFINITION`

| Property | Value |
|----------|-------|
| Tag | `GETXML` |
| Routine | `XHDPDEF` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This call returns an XML representation of a Parameter Definition.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XHDDA | LITERAL | No |

**API Endpoint:** `GET /vista/xhd/rpc/xhd-get-parameter-definition`

---

### `XHD GET PARAMETER DEFINITIONS`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `XHDPDEF` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Gets parameter definitions as a list with IEN^NAME^DISPLAY NAME^ENTITYLIST in each node of the return array. This call returns a local array of SIZE  elements in DIR direction from the initial Definition FROM.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FROM | LITERAL | No |
| 2 | DIR | LITERAL | No |
| 3 | SIZE | LITERAL | No |

**API Endpoint:** `GET /vista/xhd/rpc/xhd-get-parameter-definitions`

---

### `XHD INSERT PARAMETER CATEGORY`

| Property | Value |
|----------|-------|
| Tag | `INSERT` |
| Routine | `XHDPCAT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Inserts new parameter categories.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMS | REFERENCE | No |

**API Endpoint:** `GET /vista/xhd/rpc/xhd-insert-parameter-category`

---

### `XHD PUT PARAMETER`

| Property | Value |
|----------|-------|
| Tag | `PUT` |
| Routine | `XHDPARAM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Call PUT^XPAR or PUTWP^XPAR to file a given parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | KEY | LITERAL | No |
| 2 | VALUE | REFERENCE | No |

**API Endpoint:** `GET /vista/xhd/rpc/xhd-put-parameter`

---

### `XHD REMOVE PARAMETER CATEGORY`

| Property | Value |
|----------|-------|
| Tag | `REMOVE` |
| Routine | `XHDPCAT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This call removes parameter categories from their parents (i.e., "prunes"  the branch of which the the category is the root). It does NOT delete the  Category or its descendents. Use the ORR DELETE PARAMETER CATEGORY to  delete a given categor and all its descendents.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PCAT | LITERAL | No |
| 2 | PARENT | LITERAL | No |

**API Endpoint:** `GET /vista/xhd/rpc/xhd-remove-parameter-category`

---

### `XHD UPDATE PARAMETER CATEGORY`

| Property | Value |
|----------|-------|
| Tag | `UPDATE` |
| Routine | `XHDPCAT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This call updates ParameterCategories.

**API Endpoint:** `POST /vista/xhd/rpc/xhd-update-parameter-category`

---

### `XHD GET SITE INFO`

| Property | Value |
|----------|-------|
| Tag | `SITE` |
| Routine | `XHDLSITE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns Division and Integration names and IDs.

**API Endpoint:** `GET /vista/xhd/rpc/xhd-get-site-info`

---

### `XHD GET USER DEMOGRAPHICS`

| Property | Value |
|----------|-------|
| Tag | `BYPASS` |
| Routine | `XHDAUTH` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Returns same demographics as XHD AUTHORIZE, w/o the authorization step.  Used to populate the JAAS Subject when the SharedBroker is in use.

**API Endpoint:** `GET /vista/xhd/rpc/xhd-get-user-demographics`

---

### `XHDX PERSEL`

| Property | Value |
|----------|-------|
| Tag | `PERSEL` |
| Routine | `XHDX` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This returns the list of perspective id's that should be visible for the current user.

**API Endpoint:** `GET /vista/xhd/rpc/xhdx-persel`

---

### `XHDX VERSRV`

| Property | Value |
|----------|-------|
| Tag | `VERSRV` |
| Routine | `XHDX` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns a list of options and the associated version numbers.  The list of options is passed in.  Returns is a list of OptionName^VersionNumber.  The version number must be the last space piece in the MENU TEXT of the option.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPT | REFERENCE | No |

**API Endpoint:** `GET /vista/xhd/rpc/xhdx-versrv`

---

### `XHD TEST INPUT LIST`

| Property | Value |
|----------|-------|
| Tag | `INLST` |
| Routine | `XHDTST` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This RPC returns the list that it's been passed. It's for test purposes  only.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORX | REFERENCE | No |

**API Endpoint:** `GET /vista/xhd/rpc/xhd-test-input-list`

---


## Menu Options

No menu options found for this package namespace.

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/xhd/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| POST | `/vista/xhd/rpc/xhd-delete-parameter-category` | XHD DELETE PARAMETER CATEGORY | SINGLE VALUE |
| GET | `/vista/xhd/rpc/xhd-get-all-parameter-defs` | XHD GET ALL PARAMETER DEFS | GLOBAL ARRAY |
| GET | `/vista/xhd/rpc/xhd-get-configuration` | XHD GET CONFIGURATION | GLOBAL ARRAY |
| GET | `/vista/xhd/rpc/xhd-get-mutable-configuration` | XHD GET MUTABLE CONFIGURATION | GLOBAL ARRAY |
| GET | `/vista/xhd/rpc/xhd-get-parameter-def-list` | XHD GET PARAMETER DEF LIST | GLOBAL ARRAY |
| GET | `/vista/xhd/rpc/xhd-get-parameter-definition` | XHD GET PARAMETER DEFINITION | GLOBAL ARRAY |
| GET | `/vista/xhd/rpc/xhd-get-parameter-definitions` | XHD GET PARAMETER DEFINITIONS | ARRAY |
| GET | `/vista/xhd/rpc/xhd-insert-parameter-category` | XHD INSERT PARAMETER CATEGORY | SINGLE VALUE |
| GET | `/vista/xhd/rpc/xhd-put-parameter` | XHD PUT PARAMETER | SINGLE VALUE |
| GET | `/vista/xhd/rpc/xhd-remove-parameter-category` | XHD REMOVE PARAMETER CATEGORY | SINGLE VALUE |
| POST | `/vista/xhd/rpc/xhd-update-parameter-category` | XHD UPDATE PARAMETER CATEGORY | SINGLE VALUE |
| GET | `/vista/xhd/rpc/xhd-get-site-info` | XHD GET SITE INFO | SINGLE VALUE |
| GET | `/vista/xhd/rpc/xhd-get-user-demographics` | XHD GET USER DEMOGRAPHICS | GLOBAL ARRAY |
| GET | `/vista/xhd/rpc/xhdx-persel` | XHDX PERSEL | ARRAY |
| GET | `/vista/xhd/rpc/xhdx-versrv` | XHDX VERSRV | ARRAY |
| GET | `/vista/xhd/rpc/xhd-test-input-list` | XHD TEST INPUT LIST | GLOBAL ARRAY |
