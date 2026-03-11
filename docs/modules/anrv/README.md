# Visual Impairment Service Team (ANRV)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `ANRV` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 17 |
| Menu Options | 41 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `ANRV CREATE OUTCOME`

| Property | Value |
|----------|-------|
| Tag | `MKREC` |
| Routine | `ANRVOB` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Creates new Outcome Record.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RESULTS | LITERAL | No |
| 2 | PTDFN | LITERAL | No |
| 3 | STATUS | LITERAL | No |

**API Endpoint:** `POST /vista/anrv/rpc/anrv-create-outcome`

---

### `ANRV GET OUTCOME TEXT`

| Property | Value |
|----------|-------|
| Tag | `GETTXT` |
| Routine | `ANRVOB` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns subrecord text.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RESULTS | LITERAL | No |
| 2 | SUBREC | LITERAL | No |
| 3 | TOPREC | LITERAL | No |

**API Endpoint:** `GET /vista/anrv/rpc/anrv-get-outcome-text`

---

### `ANRV GET PT OUTCOMES`

| Property | Value |
|----------|-------|
| Tag | `GETREC` |
| Routine | `ANRVOB` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns top level IEN and sub record IEN plus statuses.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RESULTS | LITERAL | No |
| 2 | PTDFN | LITERAL | No |

**API Endpoint:** `GET /vista/anrv/rpc/anrv-get-pt-outcomes`

---

### `ANRV GET PTALL`

| Property | Value |
|----------|-------|
| Tag | `LISTALL` |
| Routine | `ANRVOA` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of all patients beginning with(x), from(x), to(x) direction.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RESULTS | LITERAL | No |
| 2 | FROM | LITERAL | No |
| 3 | DIR | LITERAL | No |

**API Endpoint:** `GET /vista/anrv/rpc/anrv-get-ptall`

---

### `ANRV GET PTLAST5`

| Property | Value |
|----------|-------|
| Tag | `LAST5` |
| Routine | `ANRVOA` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of patients using the last 5 format for inquiry e.g. Z9999.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RESULTS | LITERAL | No |
| 2 | PTID | LITERAL | No |

**API Endpoint:** `GET /vista/anrv/rpc/anrv-get-ptlast5`

---

### `ANRV PTINFO CORE`

| Property | Value |
|----------|-------|
| Tag | `PINF` |
| Routine | `ANRVOA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns patient information for verification.  Must be changed eventually to include current Sensitive Patient Check.(TO DO).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PTDFN | LITERAL | No |
| 2 | RESULTS | LITERAL | No |

**API Endpoint:** `GET /vista/anrv/rpc/anrv-ptinfo-core`

---

### `ANRV OUTCOME SECTION TEXT`

| Property | Value |
|----------|-------|
| Tag | `ADDTXT` |
| Routine | `ANRVOB` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/anrv/rpc/anrv-outcome-section-text`

---

### `ANRV TANRVMESSAGE`

| Property | Value |
|----------|-------|
| Tag | `SNDTXT` |
| Routine | `ANRVOB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Create's and sends completed VIST Outcomes to the national mailgroup to  populate the national database.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ANRVCMD | LITERAL | No |

**API Endpoint:** `GET /vista/anrv/rpc/anrv-tanrvmessage`

---

### `ANRV SET RECORD STATUS`

| Property | Value |
|----------|-------|
| Tag | `UPREC` |
| Routine | `ANRVOB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Updates the status of the top level Outcome record.

**API Endpoint:** `POST /vista/anrv/rpc/anrv-set-record-status`

---

### `ANRV TANRVPATIENT`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `ANRVOA` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/anrv/rpc/anrv-tanrvpatient`

---

### `ANRV GUI PARAMETER`

| Property | Value |
|----------|-------|
| Tag | `RPCA` |
| Routine | `ANRVOA` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Manages the ANRV system parameters.

**API Endpoint:** `GET /vista/anrv/rpc/anrv-gui-parameter`

---

### `ANRV TANRVUSER`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `ANRVOA` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Manages all User calls.

**API Endpoint:** `GET /vista/anrv/rpc/anrv-tanrvuser`

---

### `ANRV FULLSSN`

| Property | Value |
|----------|-------|
| Tag | `FULLSSN` |
| Routine | `ANRVOA` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Given an SSN in the format 999999999(P), return a list of matching patients. patients.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/anrv/rpc/anrv-fullssn`

---

### `ANRVJ1_RPC_MAIN`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `ANRVJ1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This is the main entry point for calling line tags in routine ANRVJ1.   The format is:         Parameter 1 = OPTION (name of the line tag to call)         Parameter 2 = DFN (value being passed in)         Parameter 3 = DATA (any additional values to be passed in)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTION | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/anrv/rpc/anrvj1_rpc_main`

---

### `ANRV CREATE ENCOUNTER`

| Property | Value |
|----------|-------|
| Tag | `ENCNTR` |
| Routine | `ANRVJ1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Create an encounter.

**API Endpoint:** `POST /vista/anrv/rpc/anrv-create-encounter`

---

### `ANRV PROBLEM LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORQQPL` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STATUS | LITERAL | No |

**API Endpoint:** `GET /vista/anrv/rpc/anrv-problem-list`

---

### `ANRV GET PN TITLES`

| Property | Value |
|----------|-------|
| Tag | `NOTES` |
| Routine | `TIUSRVD` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This API returns a list of Progress Notes Titles, including a SHORT LIST  or preferred titles as defined by the user, and a LONG LIST of all titles  defined at the site.  This has been added to the Blind Rehab software to  allow the lookup of TIU Document Definitions to set as site parameters  for t

**API Endpoint:** `GET /vista/anrv/rpc/anrv-get-pn-titles`

---


## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| ANRV VIST ROSTER PRINT | — |
| ANRV COUNTY LISTING | — |
| ANRV OUTPATIENT APPT. LIST | — |
| ANRV AMIS REPORT | — |
| ANRV PRINT VARO CLAIMS | — |
| ANRV PRINT PATIENT RECORD | — |
| ANRV ADDRESS LIST | — |
| ANRV STATE LIST | — |
| ANRV CITY LIST | — |
| ANRV ZIP CODE LIST | — |
| ANRV POS LIST | — |
| ANRV MAIL LABELS | — |
| ANRV PRINT LETTER | — |
| ANRV TEST LABEL | — |
| ANRV LABELS BY STATE | — |
| ANRV LABELS BY CITY | — |
| ANRV LABELS BY COUNTY | — |

### Menu

| Name | Security Key |
|------|-------------|
| ANRV VIST MENU | — |
| ANRV PRINT VIST OPTIONS | — |
| ANRV INDIVIDUAL RECORDS | — |
| ANRV ROSTER SORTS | — |

### Print

| Name | Security Key |
|------|-------------|
| ANRV REFERRAL PRINT | — |
| ANRV INPATIENT LIST | — |
| ANRV ANNUAL REVIEW LIST | — |
| ANRV PRINT INACTIVE VIST | — |
| ANRV ADD TO VIST ROSTER | — |
| ANRV FIELD VISIT DATES | — |
| ANRV ROSTER A/R PRINT | — |
| ANRV INCOMPLETE AMIS LISTING | — |
| ANRV DECEASED PATIENTS | — |
| ANRV AGE LIST | — |
| ANRV BIRTH LIST | — |
| ANRV EYE DIAG PRINT | — |
| ANRV REFERRAL SOURCE LIST | — |
| ANRV FEE PT | — |
| ANRV VIST ELIG LIST | — |

### Inquire

| Name | Security Key |
|------|-------------|
| ANRV PRINT IND. REFERRAL | — |
| ANRV CHECKLIST INQ | — |
| ANRV INDIVIDUAL EYE DIAG | — |
| ANRV CLAIM REC INQ | — |

### Action

| Name | Security Key |
|------|-------------|
| ANRV ANNUAL REVIEW INQ | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/anrv/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| POST | `/vista/anrv/rpc/anrv-create-outcome` | ANRV CREATE OUTCOME | ARRAY |
| GET | `/vista/anrv/rpc/anrv-get-outcome-text` | ANRV GET OUTCOME TEXT | ARRAY |
| GET | `/vista/anrv/rpc/anrv-get-pt-outcomes` | ANRV GET PT OUTCOMES | ARRAY |
| GET | `/vista/anrv/rpc/anrv-get-ptall` | ANRV GET PTALL | ARRAY |
| GET | `/vista/anrv/rpc/anrv-get-ptlast5` | ANRV GET PTLAST5 | ARRAY |
| GET | `/vista/anrv/rpc/anrv-ptinfo-core` | ANRV PTINFO CORE | SINGLE VALUE |
| GET | `/vista/anrv/rpc/anrv-outcome-section-text` | ANRV OUTCOME SECTION TEXT | ARRAY |
| GET | `/vista/anrv/rpc/anrv-tanrvmessage` | ANRV TANRVMESSAGE | GLOBAL ARRAY |
| POST | `/vista/anrv/rpc/anrv-set-record-status` | ANRV SET RECORD STATUS | SINGLE VALUE |
| GET | `/vista/anrv/rpc/anrv-tanrvpatient` | ANRV TANRVPATIENT | GLOBAL ARRAY |
| GET | `/vista/anrv/rpc/anrv-gui-parameter` | ANRV GUI PARAMETER | GLOBAL ARRAY |
| GET | `/vista/anrv/rpc/anrv-tanrvuser` | ANRV TANRVUSER | GLOBAL ARRAY |
| GET | `/vista/anrv/rpc/anrv-fullssn` | ANRV FULLSSN | ARRAY |
| GET | `/vista/anrv/rpc/anrvj1_rpc_main` | ANRVJ1_RPC_MAIN | GLOBAL ARRAY |
| POST | `/vista/anrv/rpc/anrv-create-encounter` | ANRV CREATE ENCOUNTER | ARRAY |
| GET | `/vista/anrv/rpc/anrv-problem-list` | ANRV PROBLEM LIST | ARRAY |
| GET | `/vista/anrv/rpc/anrv-get-pn-titles` | ANRV GET PN TITLES | ARRAY |
