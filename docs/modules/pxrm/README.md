# Clinical Reminders (PXRM)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `PXRM` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 24 |
| Menu Options | 114 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `PXRM REMINDER DIALOG (TIU)`

| Property | Value |
|----------|-------|
| Tag | `TDIALOG` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Dialog for a given dialog ien.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIALOG IEN | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | VISITID | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-reminder-dialog-(tiu)`

---

### `PXRM REMINDER CATEGORY`

| Property | Value |
|----------|-------|
| Tag | `CATEGORY` |
| Routine | `PXRMRPCD` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** List reminders and categories in display order for a reminder category.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CATEGORY | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-reminder-category`

---

### `PXRM REMINDERS AND CATEGORIES`

| Property | Value |
|----------|-------|
| Tag | `SEL` |
| Routine | `PXRMRPCD` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns list of reminders and categories.

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-reminders-and-categories`

---

### `PXRM EDUCATION SUBTOPICS`

| Property | Value |
|----------|-------|
| Tag | `EDS` |
| Routine | `PXRMRPCB` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns array of subtopics for any given education topic

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EDUCATION TOPIC ID | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-education-subtopics`

---

### `PXRM EDUCATION SUMMARY`

| Property | Value |
|----------|-------|
| Tag | `EDL` |
| Routine | `PXRMRPCB` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns list of education topics for a reminder

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINICAL REMINDER ID | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-education-summary`

---

### `PXRM EDUCATION TOPIC`

| Property | Value |
|----------|-------|
| Tag | `EDU` |
| Routine | `PXRMRPCB` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Detailed description of education topic

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EDUCATION TOPIC ID | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-education-topic`

---

### `PXRM REMINDER CATEGORIES`

| Property | Value |
|----------|-------|
| Tag | `CATEGORY` |
| Routine | `PXRMRPCA` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns list of all CPRS lookup categories and associated reminders

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | HOSPITAL LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-reminder-categories`

---

### `PXRM REMINDER DIALOG`

| Property | Value |
|----------|-------|
| Tag | `DIALOG` |
| Routine | `PXRMRPCC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Dialog for a given reminder

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINICAL REMINDER ID | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-reminder-dialog`

---

### `PXRM REMINDER DIALOG PROMPTS`

| Property | Value |
|----------|-------|
| Tag | `PROMPT` |
| Routine | `PXRMRPCC` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Additional prompts for a given dialog element

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIALOG ELEMENT IEN | LITERAL | No |
| 2 | CURRENT/HISTORICAL | LITERAL | No |
| 3 | DIALOG LINE CPT/POV | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-reminder-dialog-prompts`

---

### `PXRM REMINDER EVALUATION`

| Property | Value |
|----------|-------|
| Tag | `ALIST` |
| Routine | `PXRMRPCA` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Allows evaluation of a list of reminders. Returns a list of clinical  reminders due/applicable or not applicable to the patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | REMINDER ARRAY | REFERENCE | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-reminder-evaluation`

---

### `PXRM REMINDER INQUIRY`

| Property | Value |
|----------|-------|
| Tag | `RES` |
| Routine | `PXRMRPCC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Detailed description of reminder

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINICAL REMINDER ID | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-reminder-inquiry`

---

### `PXRM REMINDER WEB`

| Property | Value |
|----------|-------|
| Tag | `WEB` |
| Routine | `PXRMRPCA` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Web addresses for selected reminder

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINICAL REMINDER ID | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-reminder-web`

---

### `PXRM REMINDERS (UNEVALUATED)`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `PXRMRPCA` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns list of CPRS reminders for patient/location (no evaluation is done)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | HOSPITAL LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-reminders-(unevaluated)`

---

### `PXRM REMINDER DETAIL`

| Property | Value |
|----------|-------|
| Tag | `REMDET` |
| Routine | `PXRMRPCA` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the details of a clinical reminder

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | CLINICAL REMINDER ID | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-reminder-detail`

---

### `PXRM MENTAL HEALTH`

| Property | Value |
|----------|-------|
| Tag | `MH` |
| Routine | `PXRMRPCC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns array for given mental health instrument

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MENTAL HEALTH INSTRUMENT | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-mental-health`

---

### `PXRM PROGRESS NOTE HEADER`

| Property | Value |
|----------|-------|
| Tag | `HDR` |
| Routine | `PXRMRPCC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns header text to be inserted in each progress note.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HOSPITAL LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-progress-note-header`

---

### `PXRM MENTAL HEALTH RESULTS`

| Property | Value |
|----------|-------|
| Tag | `MHR` |
| Routine | `PXRMRPCC` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns progress note text based on the results of the test.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TEST RESULTS | LITERAL | No |
| 2 | RESULT GROUP/ELEMENT | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-mental-health-results`

---

### `PXRM MENTAL HEALTH SAVE`

| Property | Value |
|----------|-------|
| Tag | `MHS` |
| Routine | `PXRMRPCC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Stores test result responses from a reminder dialog.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TEST RESULTS | LITERAL | No |

**API Endpoint:** `POST /vista/pxrm/rpc/pxrm-mental-health-save`

---

### `PXRM REMINDER RPC`

| Property | Value |
|----------|-------|
| Tag | `TAG` |
| Routine | `PXRMRPC` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Standard RPC for all Reminder GUI applications

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TYPE | LITERAL | No |
| 2 | INPUT | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrm-reminder-rpc`

---

### `PXRMRPCG GENFUPD`

| Property | Value |
|----------|-------|
| Tag | `GENFUPD` |
| Routine | `PXRMRPCG` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Process general findings selected in a reminder dialog.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrmrpcg-genfupd`

---

### `PXRMRPCC PROMPTVL`

| Property | Value |
|----------|-------|
| Tag | `PROMPTVL` |
| Routine | `PXRMRPCC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Calculate the value for a prompt based on the value of another prompt.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VALUE | LITERAL | No |
| 2 | DIEN | LITERAL | No |
| 3 | OVALUE | LITERAL | No |
| 4 | PAT | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrmrpcc-promptvl`

---

### `PXRMRPCG CANCEL`

| Property | Value |
|----------|-------|
| Tag | `CANCEL` |
| Routine | `PXRMRPCG` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Cancel processing a reminder dialog.

**API Endpoint:** `POST /vista/pxrm/rpc/pxrmrpcg-cancel`

---

### `PXRMRPCG VIEW`

| Property | Value |
|----------|-------|
| Tag | `VIEW` |
| Routine | `PXRMRPCG` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Retrieve text for display in a pop-up dialog that is activated from a  button within a reminder dialog.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PAT | LITERAL | No |
| 2 | IEN | LITERAL | No |
| 3 | VALUE | LITERAL | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrmrpcg-view`

---

### `PXRMRPCG GENFVALD`

| Property | Value |
|----------|-------|
| Tag | `GENFVALD` |
| Routine | `PXRMRPCG` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Validate general findings selected in a reminder dialog.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/pxrm/rpc/pxrmrpcg-genfvald`

---


## Menu Options

### Menu

| Name | Security Key |
|------|-------------|
| PXRM REMINDER MENU | — |
| PXRM REMINDER REPORTS | — |
| PXRM DIALOG MANAGEMENT | — |
| PXRM REMINDER MANAGEMENT | — |
| PXRM INFO ONLY | — |
| PXRM OTHER SUPPORTING MENUS | — |
| PXRM MANAGERS MENU | — |
| PXRM TERM MANAGEMENT | — |
| PXRM DIALOG PARAMETERS | — |
| PXRM CF MANAGEMENT | — |
| PXRM CPRS CONFIGURATION | — |
| PXRM SPONSOR MANAGEMENT | — |
| PXRM MST MANAGEMENT | — |
| PXRM INDEX MANAGEMENT | — |
| PXRM EXTRACT MENU | — |
| PXRM REMINDER PARAMETERS | — |
| PXRM LOCATION LIST MANAGEMENT | — |
| PXRM PATIENT LIST MENU | — |
| PXRM DIALOG TOOLS MENU | — |
| PXRM ORDER CHECK MENU | — |

### Run routine

| Name | Security Key |
|------|-------------|
| PXRM REMINDER TEST | — |
| PXRM REMINDER EXCHANGE | — |
| PXRM DEFINITION EDIT | — |
| PXRM DEFINITION INQUIRY | — |
| PXRM DEFINITION COPY | — |
| PXRM REMINDERS DUE | — |
| PXRM RESOLUTION EDIT/INQUIRE | — |
| PXRM CATEGORY EDIT/INQUIRE | — |
| PXRM FINDING TYPE PARAMETERS | — |
| PXRM FINDING ITEM PARAMETERS | — |
| PXRM HEALTH FACTOR RESOLUTIONS | — |
| PXRM TERM COPY | — |
| PXRM TERM EDIT | — |
| PXRM TERM INQUIRY | — |
| PXRM DIALOG/COMPONENT EDIT | — |
| PXRM COMPUTED FINDING EDIT | — |
| PXRM DEFINITION LIST | — |
| PXRM SPONSOR EDIT | — |
| PXRM SPONSOR LIST | — |
| PXRM REMINDERS DUE (USER) | — |
| PXRM REVIEW DATES | — |
| PXRM MST SYNCHRONIZATION | — |
| PXRM SPONSOR INQUIRY | — |
| PXRM MST REPORT | — |
| PXRM INDEX BUILD | XUPROGMODE |
| PXRM INDEX COUNT | — |
| PXRM EXTRACT PATIENT LIST | — |
| PXRM EXTRACT MANAGEMENT | — |
| PXRM LOCATION LIST EDIT | — |
| PXRM LOCATION LIST INQUIRY | — |
| PXRM LOCATION LIST LIST | — |
| PXRM GEC REFERRAL REPORT | — |
| PXRM REMINDER EDIT HISTORY | — |
| PXRM GEC2 QUARTERLY ROLLUP | — |
| PXRM LOCATION LIST COPY | — |
| PXRM FINDING USAGE REPORT | — |
| PXRM COMPUTED FINDING INQUIRY | — |
| PXRM DEF INTEGRITY CHECK ALL | — |
| PXRM DEF INTEGRITY CHECK ONE | — |
| PXRM TAXONOMY MANAGEMENT | — |
| PXRM DISABLE/ENABLE EVALUATION | — |
| PXRM HT HEALTH FACTOR | — |
| PXRM HT DEFINITION EDIT | — |
| PXRM NLM VALUE SET MENU | — |
| PXRM NLM CQM MENU | — |
| PXRM TERM TESTER | — |
| PXRM DEF PRINT NAME EDIT | — |
| PXRM DEF PRINT NAME REPORT | — |
| PXRM CPRS TESTER | — |
| PXRM TERM INTEGRITY CHECK ALL | — |
| PXRM TERM INTEGRITY CHECK ONE | — |
| PXRM DIALOG LINK TO TEMPLATE | — |
| PXRM COVER SHEET REMINDER RPT | — |

### Edit

| Name | Security Key |
|------|-------------|
| PXRM (IN)/ACTIVATE REMINDERS | — |
| PXRM (IN)/ACTIVATE TAXONOMIES | — |
| PXRM PARAMETER EDIT | — |

### Action

| Name | Security Key |
|------|-------------|
| PXRM CPRS COVER SHEET LIST | — |
| PXRM CPRS LOOKUP CATEGORIES | — |
| PXRM PROGRESS NOTE HEADERS | — |
| PXRM MENTAL HEALTH ACTIVE | — |
| PXRM GUI REMINDERS ACTIVE | — |
| PXRM NEW REMINDER PARAMETERS | — |
| PXRM DEFAULT LOCATION | — |
| PXRM TEXT AT CURSOR | — |
| PXRM REPORT TEMPLATE (USER) | — |
| PXRM EDIT SITE DISCLAIMER | — |
| PXRM EDIT WEB SITES | — |
| PXRM LIST RULE MANAGEMENT | — |
| PXRM EXTRACT DEFINITION | — |
| PXRM EXTRACT COUNTING RULES | — |
| PXRM DIALOG ORPHAN REPORT | — |
| PXRM DIALOG EMPTY REPORT | — |
| PXRM EXTRACT COUNTING GROUPS | — |
| PXRM WH PRINT NOW | — |
| PXRM GEC STATUS CHECK | — |
| PXRM GEC DEBUG REPORTS | — |
| PXRM TIU DIALOG TEMPLATE | — |
| PXRM MH QUESTIONS | — |
| PXRM DIALOG CHECKER | — |
| PXRM ORDER CHK ITEMS GROUP INQ | — |
| PXRM ORDER CHK ITEMS GROUP EDT | — |
| PXRM ORDER CHECK TESTER | — |
| PXRM DIALOG CHECKER ALL | — |
| PXRM ORDER CHECK RULE EDIT | — |
| PXRM ORDER CHECK RULE INQ | — |
| PXRM DIALOG SEARCH REPORT | — |
| PXRM DIALOG VIMM PRE REPORT | — |
| PXRM EVALUATE COVERSHEET | — |

### Print

| Name | Security Key |
|------|-------------|
| PXRM COMPUTED FINDING LIST | — |
| PXRM TERM LIST | — |
| PXRM EXTRACT EPI FINDING LIST | — |
| PXRM EXTRACT EPI TOTALS | — |
| PXRM EXTRACT QUERI TOTALS | — |

### Broker

| Name | Security Key |
|------|-------------|
| PXRM REMINDER GUI | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `XUPROGMODE`

## API Route Summary

All routes are prefixed with `/vista/pxrm/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/pxrm/rpc/pxrm-reminder-dialog-(tiu)` | PXRM REMINDER DIALOG (TIU) | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-reminder-category` | PXRM REMINDER CATEGORY | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-reminders-and-categories` | PXRM REMINDERS AND CATEGORIES | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-education-subtopics` | PXRM EDUCATION SUBTOPICS | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-education-summary` | PXRM EDUCATION SUMMARY | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-education-topic` | PXRM EDUCATION TOPIC | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-reminder-categories` | PXRM REMINDER CATEGORIES | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-reminder-dialog` | PXRM REMINDER DIALOG | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-reminder-dialog-prompts` | PXRM REMINDER DIALOG PROMPTS | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-reminder-evaluation` | PXRM REMINDER EVALUATION | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-reminder-inquiry` | PXRM REMINDER INQUIRY | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-reminder-web` | PXRM REMINDER WEB | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-reminders-(unevaluated)` | PXRM REMINDERS (UNEVALUATED) | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-reminder-detail` | PXRM REMINDER DETAIL | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-mental-health` | PXRM MENTAL HEALTH | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-progress-note-header` | PXRM PROGRESS NOTE HEADER | SINGLE VALUE |
| GET | `/vista/pxrm/rpc/pxrm-mental-health-results` | PXRM MENTAL HEALTH RESULTS | ARRAY |
| POST | `/vista/pxrm/rpc/pxrm-mental-health-save` | PXRM MENTAL HEALTH SAVE | ARRAY |
| GET | `/vista/pxrm/rpc/pxrm-reminder-rpc` | PXRM REMINDER RPC | ARRAY |
| GET | `/vista/pxrm/rpc/pxrmrpcg-genfupd` | PXRMRPCG GENFUPD | ARRAY |
| GET | `/vista/pxrm/rpc/pxrmrpcc-promptvl` | PXRMRPCC PROMPTVL | SINGLE VALUE |
| POST | `/vista/pxrm/rpc/pxrmrpcg-cancel` | PXRMRPCG CANCEL | SINGLE VALUE |
| GET | `/vista/pxrm/rpc/pxrmrpcg-view` | PXRMRPCG VIEW | ARRAY |
| GET | `/vista/pxrm/rpc/pxrmrpcg-genfvald` | PXRMRPCG GENFVALD | ARRAY |
