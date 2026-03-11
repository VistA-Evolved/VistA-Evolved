# Womens Health (WV)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `WV` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 10 |
| Menu Options | 57 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `ORQQPXRM GET WH LETTER TEXT`

| Property | Value |
|----------|-------|
| Tag | `LETTER` |
| Routine | `WVRPCNO1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Retrieve letter text for a WH letter

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | WVIEN | LITERAL | No |

**API Endpoint:** `GET /vista/wv/rpc/orqqpxrm-get-wh-letter-text`

---

### `ORQQPXRM GET WH LETTER TYPE`

| Property | Value |
|----------|-------|
| Tag | `GETTYPE` |
| Routine | `WVRPCNO` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Return value from file 790.403

**API Endpoint:** `GET /vista/wv/rpc/orqqpxrm-get-wh-letter-type`

---

### `WVRPCOR COVER`

| Property | Value |
|----------|-------|
| Tag | `COVER` |
| Routine | `WVRPCOR` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the content of the Women's Health panel on the cover sheet.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | CLEAR CACHE | LITERAL | No |

**API Endpoint:** `GET /vista/wv/rpc/wvrpcor-cover`

---

### `WVRPCOR POSTREP`

| Property | Value |
|----------|-------|
| Tag | `POSTREP` |
| Routine | `WVRPCOR` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the content of the pop-up details window when the user clicks on  an item in the Postings cover sheet panel.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | REPORT TYPE | LITERAL | No |

**API Endpoint:** `GET /vista/wv/rpc/wvrpcor-postrep`

---

### `WVRPCOR SAVEDATA`

| Property | Value |
|----------|-------|
| Tag | `SAVEDATA` |
| Routine | `WVRPCOR2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Saves data entered from the CPRS cover sheet.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/wv/rpc/wvrpcor-savedata`

---

### `WVRPCOR EIE`

| Property | Value |
|----------|-------|
| Tag | `EIE` |
| Routine | `WVRPCOR1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Allows a user to mark a record selected on the CPRS cover sheet as  entered in error.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RECORD ID | LITERAL | No |
| 2 | REASONS | REFERENCE | No |

**API Endpoint:** `GET /vista/wv/rpc/wvrpcor-eie`

---

### `WVRPCOR REASONS`

| Property | Value |
|----------|-------|
| Tag | `REASONS` |
| Routine | `WVRPCOR1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the predefined set of reasons a user may select from when marking  a pregnancy or lactation status as entered in error.

**API Endpoint:** `GET /vista/wv/rpc/wvrpcor-reasons`

---

### `WVRPCOR SITES`

| Property | Value |
|----------|-------|
| Tag | `SITES` |
| Routine | `WVRPCOR1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of website names and hyperlinks, as well as the submenu  name, for use in populating the menu that appears when the user right-clicks on the Women's Health panel on the CPRS cover sheet.

**API Endpoint:** `GET /vista/wv/rpc/wvrpcor-sites`

---

### `WVRPCOR CONSAVE`

| Property | Value |
|----------|-------|
| Tag | `CONSAVE` |
| Routine | `WVRPCOR1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Determines whether to prompt the user to confirm updating pregnancy  and/or lactation data for a patient prior to displaying the update form.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |

**API Endpoint:** `GET /vista/wv/rpc/wvrpcor-consave`

---

### `WVRPCOR DETAIL`

| Property | Value |
|----------|-------|
| Tag | `DETAIL` |
| Routine | `WVRPCOR` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the content of the pop-up details window when the user clicks on  an item in the Women's Health panel on the cover sheet.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RECORD ID | LITERAL | No |

**API Endpoint:** `GET /vista/wv/rpc/wvrpcor-detail`

---


## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| WV ADD A NEW PROCEDURE | — |
| WV EDIT PROCEDURE | — |
| WV ADD A NEW NOTIFICATION | — |
| WV EDIT NOTIFICATION | — |
| WV BROWSE NOTIFICATIONS | — |
| WV BROWSE PROCEDURES | — |
| WV PATIENT PROFILE | — |
| WV ADD/EDIT NOT PURPOSE&LETTER | — |
| WV PRINT NOTIF PURPOSE&LETTER | — |
| WV PRINT QUEUED LETTERS | — |
| WV EDIT PATIENT CASE DATA | — |
| WV ADD/EDIT CASE MANAGERS | — |
| WV EDIT SITE PARAMETERS | — |
| WV PRINT RES/DIAG FILE | — |
| WV PRINT INDIVIDUAL LETTERS | — |
| WV PATIENT PROFILE W/ERRORS | — |
| WV EDIT PAP REGIMEN LOG | — |
| WV EDIT PREG/LAC STATUS DATA | — |
| WV PRINT A PROCEDURE | — |
| WV ADD AN HISTORICAL PROCEDURE | — |
| WV PRINT PROCEDURE STATS | — |
| WV BROWSE NEEDS PAST DUE | — |
| WV PRINT SNAPSHOT | — |
| WV PRINT/RETRIEVE SNAPSHOT | — |
| WV EDIT NOTIF TYPE SYNONYM | — |
| WV ADD/EDIT NOTIF OUTCOME | — |
| WV PATIENT DEMOGRAPHIC INFO | — |
| WV PRINT DIAG TRANSLATION | — |
| WV EDIT DIAG TRANSLATION | — |
| WV AUTOLOAD PATIENTS | — |
| WV EDIT RES/DIAG SYNONYMS | — |
| WV PRINT RES/DIAG SYNONYMS | — |
| WV BROWSE PROCEDURES DUPLICATE | — |
| WV PRINT COMPLIANCE RATES | — |
| WV TRANSFER CASE MANAGER | — |
| WV ADD/EDIT REFERRAL SOURCE | — |
| WV REFUSED PROC-ADD | — |
| WV REFUSED PROC-EDIT | — |
| WV SEXUAL TRAUMA SUMMARY | — |
| WV IMPORT RAD/NM EXAMS | — |
| WV LAB ADD A NEW PROCEDURE | — |
| WV LAB EDIT ACCESSION | — |
| WV LAB PRINT LOG | — |
| WV LAB EDIT PROCEDURE RESULT | — |
| WV HS-USER DEFINED | — |
| WV SAVE LAB TEST | — |
| WV SEXUAL TRAUMA LIST | — |
| WV PAP SMEAR SNOMED CODES | — |
| WV ADD/EDIT MAT CARE COORS | — |
| WV TRANSFER MAT CARE COOR | — |
| WV EDIT PACKAGE PARAMETERS | — |

### Menu

| Name | Security Key |
|------|-------------|
| WV MENU-FILE MAINTENANCE | — |
| WV MENU-PATIENT MANAGEMENT | — |
| WV MENU-MANAGER'S FUNCTIONS | — |
| WV MENU-MANAGEMENT REPORTS | — |
| WV MENU-MGR PATIENT MGT | — |
| WV MENU-LAB DATA ENTRY | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/wv/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/wv/rpc/orqqpxrm-get-wh-letter-text` | ORQQPXRM GET WH LETTER TEXT | ARRAY |
| GET | `/vista/wv/rpc/orqqpxrm-get-wh-letter-type` | ORQQPXRM GET WH LETTER TYPE | ARRAY |
| GET | `/vista/wv/rpc/wvrpcor-cover` | WVRPCOR COVER | ARRAY |
| GET | `/vista/wv/rpc/wvrpcor-postrep` | WVRPCOR POSTREP | ARRAY |
| GET | `/vista/wv/rpc/wvrpcor-savedata` | WVRPCOR SAVEDATA | SINGLE VALUE |
| GET | `/vista/wv/rpc/wvrpcor-eie` | WVRPCOR EIE | SINGLE VALUE |
| GET | `/vista/wv/rpc/wvrpcor-reasons` | WVRPCOR REASONS | ARRAY |
| GET | `/vista/wv/rpc/wvrpcor-sites` | WVRPCOR SITES | ARRAY |
| GET | `/vista/wv/rpc/wvrpcor-consave` | WVRPCOR CONSAVE | ARRAY |
| GET | `/vista/wv/rpc/wvrpcor-detail` | WVRPCOR DETAIL | ARRAY |
