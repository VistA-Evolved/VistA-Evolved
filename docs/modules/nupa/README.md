# Patient Assessment Documentation (NUPA)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `NUPA` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 36 |
| Menu Options | 3 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `NUPA PAST/FUTURE DATE`

| Property | Value |
|----------|-------|
| Tag | `PF` |
| Routine | `NUPABCL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Returns a 1 or a 0 when checking to see if a date is in the past or  future, based on $H.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VAR 1 | LITERAL | No |
| 2 | VAR 2 | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-past/future-date`

---

### `NUPA GET CAREPLAN DA`

| Property | Value |
|----------|-------|
| Tag | `CPID` |
| Routine | `NUPABCL1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Gets the DA of the latest care plan, or creates a new one if none on  file since the last admission.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-get-careplan-da`

---

### `NUPA CAREPLAN PROBS`

| Property | Value |
|----------|-------|
| Tag | `PICP` |
| Routine | `NUPABCL1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Provides a list of the problems and interventions for a patient's care plan for the current admission.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DA  | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-careplan-probs`

---

### `NUPA SET PU AND ALT`

| Property | Value |
|----------|-------|
| Tag | `SL` |
| Routine | `NUPABCL2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Sets Pressure Ulcer and Skin Alteration data.  Deletes old info for this  careplan and inserts from the reassessment.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ALT | REFERENCE | No |

**API Endpoint:** `POST /vista/nupa/rpc/nupa-set-pu-and-alt`

---

### `NUPA WP GET`

| Property | Value |
|----------|-------|
| Tag | `WPGET` |
| Routine | `NUPABCL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** Returns data from a Word Processing field.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILE | LITERAL | No |
| 2 | IEN | LITERAL | No |
| 3 | NODE | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-wp-get`

---

### `NUPA WP SET`

| Property | Value |
|----------|-------|
| Tag | `WPSET` |
| Routine | `NUPABCL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** Sets data into a word processing field.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILE | LITERAL | No |
| 2 | LINE | LITERAL | No |
| 3 | DATA | LITERAL | No |

**API Endpoint:** `POST /vista/nupa/rpc/nupa-wp-set`

---

### `NUPA RUN OBJECT (>1 LINE)`

| Property | Value |
|----------|-------|
| Tag | `RUNMANY` |
| Routine | `NUPABCL1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** Gathers data from a program that is similar to a TIU object.  This RPC  calls an M program that places more than one node data into ^TMP($J).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | CODE | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-run-object-(>1-line)`

---

### `NUPA USER CLASS`

| Property | Value |
|----------|-------|
| Tag | `UC` |
| Routine | `NUPABCL1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Checks if a user is in a certain TIU User Class.  Useful to determine if  the nurse doing the assessment is a student.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLASS | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-user-class`

---

### `NUPA SCREEN`

| Property | Value |
|----------|-------|
| Tag | `SCREEN` |
| Routine | `NUPABCL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Allows M code to be executed from inside a Delphi program.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CODE | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-screen`

---

### `NUPA DLOOK`

| Property | Value |
|----------|-------|
| Tag | `DLOOK` |
| Routine | `NUPABCL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** Does a lookup on the B Xref of a file, and does not convert dates or pointers.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILE | LITERAL | No |
| 2 | VAL | LITERAL | No |
| 3 | TYPE | LITERAL | No |
| 4 | SCR | LITERAL | No |
| 5 | IND | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-dlook`

---

### `NUPA LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `NUPABCL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** Returns a list of all entries in a file (.01 field only).  You can specify a screen, in regular Fileman format.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILE | LITERAL | No |
| 2 | SCREEN | LITERAL | No |
| 3 | MULT | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-list`

---

### `NUPA LIST2`

| Property | Value |
|----------|-------|
| Tag | `LIST2` |
| Routine | `NUPABCL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** List of all entries from a file including other fields.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILE | LITERAL | No |
| 2 | FILEDS | LITERAL | No |
| 3 | SCREEN | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-list2`

---

### `NUPA REMINDERS COLLECT`

| Property | Value |
|----------|-------|
| Tag | `REM` |
| Routine | `NUPABCL1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Queues the collection of reminders for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-reminders-collect`

---

### `NUPA REMINDERS GET`

| Property | Value |
|----------|-------|
| Tag | `REM1` |
| Routine | `NUPABCL1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Pulls in queued reminders for a patient.

**API Endpoint:** `GET /vista/nupa/rpc/nupa-reminders-get`

---

### `NUPA REMINDERS MANUAL`

| Property | Value |
|----------|-------|
| Tag | `REM2` |
| Routine | `NUPABCL1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Manual gathering of reminders for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-reminders-manual`

---

### `NUPA FILE`

| Property | Value |
|----------|-------|
| Tag | `FILE` |
| Routine | `NUPABCL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 5 |

**Description:** Files data into Fileman files.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIE | LITERAL | No |
| 2 | IEN | LITERAL | No |
| 3 | FIELD | LITERAL | No |
| 4 | VALUE | LITERAL | No |
| 5 | SLASHES | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-file`

---

### `NUPA LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `LOOK` |
| Routine | `NUPABCL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Does lookups on files.  Returns info in ^TMP("DILIST",$J) or -1 if record not in file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMETERS | REFERENCE | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-lookup`

---

### `NUPA NEW`

| Property | Value |
|----------|-------|
| Tag | `NEW` |
| Routine | `NUPABCL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** Adds a new entry to a file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIC | LITERAL | No |
| 2 | ENTRY | LITERAL | No |
| 3 | three | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-new`

---

### `NUPA NEW IF NONE`

| Property | Value |
|----------|-------|
| Tag | `NEWN` |
| Routine | `NUPABCL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** Adds a new entry to a file, if that entry did not previously exist.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIC | LITERAL | No |
| 2 | ENTRY | LITERAL | No |
| 3 | SCREEN | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-new-if-none`

---

### `NUPA CAREPLAN PROBLEM HISTORY`

| Property | Value |
|----------|-------|
| Tag | `HIST` |
| Routine | `NUPABCL1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Provides the history for a selected problem & intervention in a patient's  care plan for the current admission.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DA  | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-careplan-problem-history`

---

### `NUPA PRINT`

| Property | Value |
|----------|-------|
| Tag | `P` |
| Routine | `NUPABCL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Prints an array to a printer

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ZTIO | LITERAL | No |
| 2 | ARRAY | REFERENCE | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-print`

---

### `NUPA ORDERS`

| Property | Value |
|----------|-------|
| Tag | `APO` |
| Routine | `NUPABCL2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Provides a list of Active/pending orders for the patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-orders`

---

### `NUPA INP MEDS LIST`

| Property | Value |
|----------|-------|
| Tag | `IM` |
| Routine | `NUPABCL2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Returns the Inpatient med list for the patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-inp-meds-list`

---

### `NUPA CAREPLAN HISTORY`

| Property | Value |
|----------|-------|
| Tag | `CPH` |
| Routine | `NUPABCL2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Provides a history of all changes made to a patient's care plan for the  current admission.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DA  | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-careplan-history`

---

### `NUPA LOOKUP TRY 2`

| Property | Value |
|----------|-------|
| Tag | `LK` |
| Routine | `NUPAAS1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Not currently used.

**API Endpoint:** `GET /vista/nupa/rpc/nupa-lookup-try-2`

---

### `NUPA DP COMMENT HISTORY`

| Property | Value |
|----------|-------|
| Tag | `DPH` |
| Routine | `NUPABCL2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** Pulls in the comments for Discharge Planning issues for a care plan.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | FLAG | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-dp-comment-history`

---

### `NUPA GET PRESSURE ULCERS`

| Property | Value |
|----------|-------|
| Tag | `UL` |
| Routine | `NUPABCL2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Returns information on the patient's pressure ulcers for this care plan.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-get-pressure-ulcers`

---

### `NUPA GET IVS`

| Property | Value |
|----------|-------|
| Tag | `IV` |
| Routine | `NUPABCL2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Returns information on the patient's IVs for this care plan.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-get-ivs`

---

### `NUPA GET COMPONENTS`

| Property | Value |
|----------|-------|
| Tag | `GC` |
| Routine | `NUPABCL2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Gets the possible responses for various components in the GUIs.

**API Endpoint:** `GET /vista/nupa/rpc/nupa-get-components`

---

### `NUPA GET SKIN ALT`

| Property | Value |
|----------|-------|
| Tag | `UL` |
| Routine | `NUPABCL2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Returns information on the patient's skin alterations & pressure ulcers for this care plan.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-get-skin-alt`

---

### `NUPA GET GI DEVICES`

| Property | Value |
|----------|-------|
| Tag | `GI` |
| Routine | `NUPABCL2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Returns a list of all GI devices applicable to this care plan.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-get-gi-devices`

---

### `NUPA REASSESSMENT RADIOBUTTONS`

| Property | Value |
|----------|-------|
| Tag | `RAOK` |
| Routine | `NUPABCL2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Determines if the nurse can do a partial reassessment.  If response is  true, these radiobuttons appear on the initial reassessment screen.   1. Medical/Surgical update reassessment (full reassessment completed previously on current shift)   2. Critical Care update reassessment (full reassessment co

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-reassessment-radiobuttons`

---

### `NUPA GET HEALTH FACTORS`

| Property | Value |
|----------|-------|
| Tag | `HF` |
| Routine | `NUPABCL2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of Office of Nursing Services (ONS) Health Factors.

**API Endpoint:** `GET /vista/nupa/rpc/nupa-get-health-factors`

---

### `NUPA GET ALLERGIES`

| Property | Value |
|----------|-------|
| Tag | `ALG` |
| Routine | `NUPABCL2` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Returns the patient's allergies.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | dfn | UNKNOWN() | No |
| 2 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-get-allergies`

---

### `NUPA GET APPTS`

| Property | Value |
|----------|-------|
| Tag | `APPTS` |
| Routine | `NUPABCL2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Returns appointments in the next year.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-get-appts`

---

### `NUPA AUDITC NOTE TEXT`

| Property | Value |
|----------|-------|
| Tag | `ACNOTE` |
| Routine | `NUPABCL2` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Saves an Audit-C note for the patient.  Uses the last administration from  file 601.84.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | STRING | LITERAL | No |

**API Endpoint:** `GET /vista/nupa/rpc/nupa-auditc-note-text`

---


## Menu Options

### Broker

| Name | Security Key |
|------|-------------|
| NUPA ASSESSMENT GUI | — |

### Run routine

| Name | Security Key |
|------|-------------|
| NUPA PURGE SAVED NOTES | — |

### Edit

| Name | Security Key |
|------|-------------|
| NUPA PCE EDIT | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/nupa/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/nupa/rpc/nupa-past/future-date` | NUPA PAST/FUTURE DATE | SINGLE VALUE |
| GET | `/vista/nupa/rpc/nupa-get-careplan-da` | NUPA GET CAREPLAN DA | SINGLE VALUE |
| GET | `/vista/nupa/rpc/nupa-careplan-probs` | NUPA CAREPLAN PROBS | GLOBAL ARRAY |
| POST | `/vista/nupa/rpc/nupa-set-pu-and-alt` | NUPA SET PU AND ALT | SINGLE VALUE |
| GET | `/vista/nupa/rpc/nupa-wp-get` | NUPA WP GET | GLOBAL ARRAY |
| POST | `/vista/nupa/rpc/nupa-wp-set` | NUPA WP SET | SINGLE VALUE |
| GET | `/vista/nupa/rpc/nupa-run-object-(>1-line)` | NUPA RUN OBJECT (>1 LINE) | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-user-class` | NUPA USER CLASS | SINGLE VALUE |
| GET | `/vista/nupa/rpc/nupa-screen` | NUPA SCREEN | SINGLE VALUE |
| GET | `/vista/nupa/rpc/nupa-dlook` | NUPA DLOOK | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-list` | NUPA LIST | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-list2` | NUPA LIST2 | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-reminders-collect` | NUPA REMINDERS COLLECT | SINGLE VALUE |
| GET | `/vista/nupa/rpc/nupa-reminders-get` | NUPA REMINDERS GET | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-reminders-manual` | NUPA REMINDERS MANUAL | ARRAY |
| GET | `/vista/nupa/rpc/nupa-file` | NUPA FILE | SINGLE VALUE |
| GET | `/vista/nupa/rpc/nupa-lookup` | NUPA LOOKUP | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-new` | NUPA NEW | SINGLE VALUE |
| GET | `/vista/nupa/rpc/nupa-new-if-none` | NUPA NEW IF NONE | SINGLE VALUE |
| GET | `/vista/nupa/rpc/nupa-careplan-problem-history` | NUPA CAREPLAN PROBLEM HISTORY | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-print` | NUPA PRINT | SINGLE VALUE |
| GET | `/vista/nupa/rpc/nupa-orders` | NUPA ORDERS | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-inp-meds-list` | NUPA INP MEDS LIST | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-careplan-history` | NUPA CAREPLAN HISTORY | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-lookup-try-2` | NUPA LOOKUP TRY 2 | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-dp-comment-history` | NUPA DP COMMENT HISTORY | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-get-pressure-ulcers` | NUPA GET PRESSURE ULCERS | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-get-ivs` | NUPA GET IVS | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-get-components` | NUPA GET COMPONENTS | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-get-skin-alt` | NUPA GET SKIN ALT | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-get-gi-devices` | NUPA GET GI DEVICES | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-reassessment-radiobuttons` | NUPA REASSESSMENT RADIOBUTTONS | SINGLE VALUE |
| GET | `/vista/nupa/rpc/nupa-get-health-factors` | NUPA GET HEALTH FACTORS | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-get-allergies` | NUPA GET ALLERGIES | ARRAY |
| GET | `/vista/nupa/rpc/nupa-get-appts` | NUPA GET APPTS | GLOBAL ARRAY |
| GET | `/vista/nupa/rpc/nupa-auditc-note-text` | NUPA AUDITC NOTE TEXT | ARRAY |
