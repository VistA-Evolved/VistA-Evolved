# FM (FM)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Data dictionary, file editing, inquire, search, print

| Property | Value |
|----------|-------|
| Namespace | `FM` |
| Tier | 5 |
| FileMan Files | 7 |
| RPCs | 10 |
| Menu Options | 0 |
| VDL Manual | `fileman-technical-manual.pdf` |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 0 | File #0 | ? | ? |
| 0.4 | File #0.4 | ? | ? |
| 1 | File #1 | ? | ? |
| 1.1 | File #1.1 | ? | ? |
| 1.2 | File #1.2 | ? | ? |
| 1.5 | File #1.5 | ? | ? |
| 1.6 | File #1.6 | ? | ? |

## Remote Procedure Calls (RPCs)

### `DDR GETS ENTRY DATA`

| Property | Value |
|----------|-------|
| Tag | `GETSC` |
| Routine | `DDR2` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Calls database server at GETS^DIQ.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GETS ATTRIBUTES | REFERENCE | No |

**API Endpoint:** `GET /vista/fm/rpc/ddr-gets-entry-data`

---

### `DDR LISTER`

| Property | Value |
|----------|-------|
| Tag | `LISTC` |
| Routine | `DDR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LIST ATTRIBUTES | REFERENCE | No |

**API Endpoint:** `GET /vista/fm/rpc/ddr-lister`

---

### `DDR FILER`

| Property | Value |
|----------|-------|
| Tag | `FILEC` |
| Routine | `DDR3` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Generic call to file edits into FM file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EDIT RESULTS | REFERENCE | No |
| 2 | EDIT MODE | LITERAL | No |

**API Endpoint:** `GET /vista/fm/rpc/ddr-filer`

---

### `DDR VALIDATOR`

| Property | Value |
|----------|-------|
| Tag | `VALC` |
| Routine | `DDR3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This function allows the application to validate user input to a field before filing data. The call uses the database server VAL^DIE call.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMETERS | REFERENCE | No |

**API Endpoint:** `GET /vista/fm/rpc/ddr-validator`

---

### `DDR DELETE ENTRY`

| Property | Value |
|----------|-------|
| Tag | `DIKC` |
| Routine | `DDR1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This function deletes an entry in a FileMan file using ^DIK.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMETERS | REFERENCE | No |

**API Endpoint:** `POST /vista/fm/rpc/ddr-delete-entry`

---

### `DDR LOCK/UNLOCK NODE`

| Property | Value |
|----------|-------|
| Tag | `LOCKC` |
| Routine | `DDR1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This function will lock or unlock an M global node.  Also, this function allows the calling application to specify the timeout (in seconds) for a 'lock' command.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMETERS | REFERENCE | No |

**API Endpoint:** `POST /vista/fm/rpc/ddr-lock/unlock-node`

---

### `DDR FIND1`

| Property | Value |
|----------|-------|
| Tag | `FIND1C` |
| Routine | `DDR2` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This function returns the internal entry number of a record using $$FIND1^DIC.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMETERS | REFERENCE | No |

**API Endpoint:** `GET /vista/fm/rpc/ddr-find1`

---

### `DDR GET DD HELP`

| Property | Value |
|----------|-------|
| Tag | `GETHLPC` |
| Routine | `DDR2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/fm/rpc/ddr-get-dd-help`

---

### `DDR FINDER`

| Property | Value |
|----------|-------|
| Tag | `FINDC` |
| Routine | `DDR0` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FIND ATTRIBUTES | REFERENCE | No |

**API Endpoint:** `GET /vista/fm/rpc/ddr-finder`

---

### `DDR KEY VALIDATOR`

| Property | Value |
|----------|-------|
| Tag | `KEYVAL` |
| Routine | `DDR3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Validates that values passed in do not violate key integrity.  Underlying DBS call is KEYVAL^DIE.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VALUES TO VALIDATE | REFERENCE | No |

**API Endpoint:** `GET /vista/fm/rpc/ddr-key-validator`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| GETS ATTRIBUTES: | DDR GETS ENTRY DATA | GETS ATTRIBUTES | REFERENCE | rpc |
| LIST ATTRIBUTES: | DDR LISTER | LIST ATTRIBUTES | REFERENCE | rpc |
| EDIT RESULTS: | DDR FILER | EDIT RESULTS | REFERENCE | rpc |
| EDIT MODE: | DDR FILER | EDIT MODE | LITERAL | rpc |
| PARAMETERS: | DDR VALIDATOR | PARAMETERS | REFERENCE | rpc |
| PARAMETERS: | DDR DELETE ENTRY | PARAMETERS | REFERENCE | rpc |
| PARAMETERS: | DDR LOCK/UNLOCK NODE | PARAMETERS | REFERENCE | rpc |
| PARAMETERS: | DDR FIND1 | PARAMETERS | REFERENCE | rpc |
| FIND ATTRIBUTES: | DDR FINDER | FIND ATTRIBUTES | REFERENCE | rpc |
| VALUES TO VALIDATE: | DDR KEY VALIDATOR | VALUES TO VALIDATE | REFERENCE | rpc |

## Menu Options

No menu options found for this package namespace.

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/fm/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/fm/rpc/ddr-gets-entry-data` | DDR GETS ENTRY DATA | ARRAY |
| GET | `/vista/fm/rpc/ddr-lister` | DDR LISTER | GLOBAL ARRAY |
| GET | `/vista/fm/rpc/ddr-filer` | DDR FILER | ARRAY |
| GET | `/vista/fm/rpc/ddr-validator` | DDR VALIDATOR | ARRAY |
| POST | `/vista/fm/rpc/ddr-delete-entry` | DDR DELETE ENTRY | SINGLE VALUE |
| POST | `/vista/fm/rpc/ddr-lock/unlock-node` | DDR LOCK/UNLOCK NODE | SINGLE VALUE |
| GET | `/vista/fm/rpc/ddr-find1` | DDR FIND1 | ARRAY |
| GET | `/vista/fm/rpc/ddr-get-dd-help` | DDR GET DD HELP | ARRAY |
| GET | `/vista/fm/rpc/ddr-finder` | DDR FINDER | GLOBAL ARRAY |
| GET | `/vista/fm/rpc/ddr-key-validator` | DDR KEY VALIDATOR | ARRAY |

## VDL Documentation Reference

Source manual: `data/vista/vdl-manuals/fileman-technical-manual.pdf`

Refer to the official VA VistA Documentation Library (VDL) manual for:

- Roll & Scroll terminal operation procedures
- Security key assignments and menu management
- FileMan file relationships and data entry rules
- MUMPS routine reference and entry points
