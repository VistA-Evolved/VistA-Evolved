# PCE Patient Care Encounter (PX)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `PX` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 46 |
| Menu Options | 24 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-reminder-category`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-reminders-and-categories`

---

### `ORQQPX GET NOT PURPOSE`

| Property | Value |
|----------|-------|
| Tag | `PURP` |
| Routine | `PXRMWHN` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/px/rpc/orqqpx-get-not-purpose`

---

### `ORQQPXRM GET WH PROC RESULT`

| Property | Value |
|----------|-------|
| Tag | `DX` |
| Routine | `PXRMWOBJ` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Return correct values for a WH procedure populate a combo box in Reminder Dialog.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STRING | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/orqqpxrm-get-wh-proc-result`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-education-subtopics`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-education-summary`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-education-topic`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-reminder-categories`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-reminder-dialog`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-reminder-dialog-prompts`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-reminder-evaluation`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-reminder-inquiry`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-reminder-web`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-reminders-(unevaluated)`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-reminder-detail`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-mental-health`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-progress-note-header`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-mental-health-results`

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

**API Endpoint:** `POST /vista/px/rpc/pxrm-mental-health-save`

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

**API Endpoint:** `GET /vista/px/rpc/pxrm-reminder-rpc`

---

### `PX SAVE DATA`

| Property | Value |
|----------|-------|
| Tag | `SAVE` |
| Routine | `PXRPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** The purpose of this RPC is to allow the calling application to save data  to PCE, such as Immunization data. See the Integration Control  Registration document for the full description of the data needed.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PCELIST | REFERENCE | No |
| 2 | LOC | LITERAL | No |
| 3 | PKGNAME | LITERAL | No |
| 4 | SRC | LITERAL | No |

**API Endpoint:** `POST /vista/px/rpc/px-save-data`

---

### `PXVIMM INFO SOURCE`

| Property | Value |
|----------|-------|
| Tag | `IMMSRC` |
| Routine | `PXVRPC2` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns entries from the IMMUNIZATION INFO SOURCE file (920.1).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvimm-info-source`

---

### `PXVIMM ADMIN ROUTE`

| Property | Value |
|----------|-------|
| Tag | `IMMROUTE` |
| Routine | `PXVRPC2` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Returns entries from the IMM ADMINISTRATION ROUTE file (920.2).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | LITERAL | No |
| 2 | PXVSITES | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvimm-admin-route`

---

### `PXVIMM ADMIN SITE`

| Property | Value |
|----------|-------|
| Tag | `IMMSITE` |
| Routine | `PXVRPC2` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns entries from the IMM ADMINISTRATION SITE (BODY) file (920.3).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvimm-admin-site`

---

### `PXVIMM IMM LOT`

| Property | Value |
|----------|-------|
| Tag | `ILOT` |
| Routine | `PXVRPC1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This RPC returns information from the IMMUNIZATION LOT file  (#9999999.41).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | LITERAL | No |
| 2 | PXVI | LITERAL | No |
| 3 | PXLOC | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvimm-imm-lot`

---

### `PXVIMM IMM MAN`

| Property | Value |
|----------|-------|
| Tag | `IMAN` |
| Routine | `PXVRPC1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This RPC returns information from the IMM MANUFACTURER file  (#9999999.04).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | LITERAL | No |
| 2 | PXVDATE | LITERAL | No |
| 3 | PXVI | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvimm-imm-man`

---

### `PXVIMM VIS`

| Property | Value |
|----------|-------|
| Tag | `IVIS` |
| Routine | `PXVRPC1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** This RPC returns information from the VACCINE INFORMATION STATEMENT file  (#920).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | LITERAL | No |
| 2 | PXVDATE | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvimm-vis`

---

### `PXVIMM IMMDATA`

| Property | Value |
|----------|-------|
| Tag | `IMMDATA` |
| Routine | `PXVRPC3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** Returns entries from the IMMUNIZATION file (9999999.14).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | LITERAL | No |
| 2 | SUBFILES | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvimm-immdata`

---

### `PXVIMM ICR LIST`

| Property | Value |
|----------|-------|
| Tag | `GETICR` |
| Routine | `PXVRPC5` |
| Return Type | ARRAY |
| Parameter Count | 4 |

**Description:** Returns entries from the IMM CONTRAINDICATION REASONS (#920.4) and IMM REFUSAL REASONS (#920.5) files.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PXFILE | LITERAL | No |
| 2 | FILTER | LITERAL | No |
| 3 | INST | LITERAL | No |
| 4 | LOC | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvimm-icr-list`

---

### `PXVIMM VICR EVENTS`

| Property | Value |
|----------|-------|
| Tag | `GETVICR` |
| Routine | `PXVRPC5` |
| Return Type | ARRAY |
| Parameter Count | 4 |

**Description:** Returns "active" entries from the V IMM CONTRA/REFUSAL EVENTS file  (#9000010.707) that are related to the given patient and immunization. "Active" is defined as entries where the Event Date and Time is <=  PXDATE@24 and the Warn Until Date is null or>= PXDATE.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | PXVIMM | LITERAL | No |
| 3 | PXDATE | LITERAL | No |
| 4 | PXFORMAT | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvimm-vicr-events`

---

### `PXVIMM IMM SHORT LIST`

| Property | Value |
|----------|-------|
| Tag | `IMMSHORT` |
| Routine | `PXVRPC4` |
| Return Type | ARRAY |
| Parameter Count | 4 |

**Description:** Returns a short list of immunizations.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | LITERAL | No |
| 2 | PXDATE | LITERAL | No |
| 3 | OREXCLUDE | LITERAL | No |
| 4 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvimm-imm-short-list`

---

### `PXVIMM IMM DETAILED`

| Property | Value |
|----------|-------|
| Tag | `IMMRPC` |
| Routine | `PXVRPC4` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** Returns a detailed Immunization record

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PXIMM | LITERAL | No |
| 2 | PXDATE | LITERAL | No |
| 3 | PXLOC | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvimm-imm-detailed`

---

### `PXVIMM ADMIN CODES`

| Property | Value |
|----------|-------|
| Tag | `IMMADMCODES` |
| Routine | `PXVRPC4` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Description:** Returns immunization administration CPT codes.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VISIT | LITERAL | No |
| 2 | PCELIST | REFERENCE | No |
| 3 | RETCPTDEL | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvimm-admin-codes`

---

### `PXVIMM IMM FORMAT`

| Property | Value |
|----------|-------|
| Tag | `GETTEXT` |
| Routine | `PXVRPC6` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC takes an input array of immunization properties set from the GUI. It returns a formatted text of an immunization for use in documentation.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/px/rpc/pxvimm-imm-format`

---

### `PXVIMM VIMM DATA`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PXVRPC7` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Returns immunization records from the V Immunization and V Immunization  Deleted file. There are two methods for defining the criteria to determine which records to return.     1. A specific list of record IDs can be passed in, and only those      records will be returned (if they exist on the syste

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | REFERENCE | No |
| 2 | LIST | REFERENCE | No |
| 3 | DATE | LITERAL | No |
| 4 | DEMOGRAPHICS | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvimm-vimm-data`

---

### `PXVSK SKIN SHORT LIST`

| Property | Value |
|----------|-------|
| Tag | `SKSHORT` |
| Routine | `PXVRPC8` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Returns one or more entries from the Skin Test file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATE | LITERAL | No |
| 2 | FILTER | LITERAL | No |
| 3 | OREXCLUDE | LITERAL | No |
| 4 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvsk-skin-short-list`

---

### `PXVSK DEF SITES`

| Property | Value |
|----------|-------|
| Tag | `SKSITES` |
| Routine | `PXVRPC8` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of default administration sites for skin tests.

**API Endpoint:** `GET /vista/px/rpc/pxvsk-def-sites`

---

### `PXVSK V SKIN TEST LIST`

| Property | Value |
|----------|-------|
| Tag | `SKLIST` |
| Routine | `PXVRPC8` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of V Skin Test entries that have been placed within the  last x days. The number of days to look back is defined in the PXV SK DAYS BACK parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | SKINTEST | LITERAL | No |
| 3 | DATE | LITERAL | No |
| 4 | MAX | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvsk-v-skin-test-list`

---

### `PXVIMM IMM DISCLOSURE`

| Property | Value |
|----------|-------|
| Tag | `SETDIS` |
| Routine | `PXVRPC9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |

**Description:** Save immunization disclosure information.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VIMM | LITERAL | No |
| 2 | AGENCY | LITERAL | No |
| 3 | DATE | LITERAL | No |
| 4 | TIMEZONE | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxvimm-imm-disclosure`

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

**API Endpoint:** `GET /vista/px/rpc/pxrmrpcg-genfupd`

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

**API Endpoint:** `GET /vista/px/rpc/pxrmrpcc-promptvl`

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

**API Endpoint:** `POST /vista/px/rpc/pxrmrpcg-cancel`

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

**API Endpoint:** `GET /vista/px/rpc/pxrmrpcg-view`

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

**API Endpoint:** `GET /vista/px/rpc/pxrmrpcg-genfvald`

---

### `PX ICE WEB`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PXVWICE` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Call the ICE web service to get the list of recommended immunizations for  a given patient. The RPC takes one parameter, the Patient IEN (DFN). See the RETURN PARAMETER DESCRIPTION for the details on the format of the  returned array. There must be at least one entry defined in File 920.75, PX ICE W

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | CACHE | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/px-ice-web`

---

### `PXRPC SAVE2`

| Property | Value |
|----------|-------|
| Tag | `SAVE2` |
| Routine | `PXRPC` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This is similar to PX SAVE DATA, except this RPC returns error  information.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PCELIST | REFERENCE | No |
| 2 | PKGNAME | LITERAL | No |
| 3 | SRC | LITERAL | No |
| 4 | VISIT | LITERAL | No |

**API Endpoint:** `GET /vista/px/rpc/pxrpc-save2`

---


## Menu Options

### Print

| Name | Security Key |
|------|-------------|
| PX PCE CODE MAPPING LIST | — |
| PX HS/RPT PARAMETERS PRINT | — |

### Menu

| Name | Security Key |
|------|-------------|
| PX PCE COORDINATOR MENU | — |
| PX IRM MAIN MENU | — |
| PX PCE CLINICIAN MENU | — |
| PX SITE PARAMETER MENU | — |
| PX HS/RPT PARAMETER MENU | — |
| PX MEASUREMENT CHECK/FIX MENU | — |
| PX COMPACT ACT EOC MAIN MENU | — |

### Edit

| Name | Security Key |
|------|-------------|
| PX EDIT LOCATION OF HOME | — |
| PX PCE SITE PARAMETERS EDIT | — |
| PX REPORT PARAMETER EDIT | — |

### Run routine

| Name | Security Key |
|------|-------------|
| PX V File Repair | — |
| PX DELETE ENCOUNTERS W/O VISIT | — |
| PX ICE WEB ENABLE/DISABLE | — |
| PX ICE WEB UPDATE CACHE | — |
| PX EDU MEASUREMENT CHECK/FIX | — |
| PX EXAM MEASUREMENT CHECK/FIX | — |
| PX HF MEASUREMENT CHECK/FIX | — |
| PX HF MEASUREMENT REPAIR | — |
| PX COMPACT ACT EOC EDIT | PX EOC EDIT |
| PX COMPACT EOC IP RETRACTION | PX EOC EDIT |
| PX COMPACT TE BACKGROUND JOB | — |
| PX COMPACT ACT EOC DISPLAY | PX EOC EDIT |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `PX EOC EDIT`

## API Route Summary

All routes are prefixed with `/vista/px/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/px/rpc/pxrm-reminder-category` | PXRM REMINDER CATEGORY | ARRAY |
| GET | `/vista/px/rpc/pxrm-reminders-and-categories` | PXRM REMINDERS AND CATEGORIES | ARRAY |
| GET | `/vista/px/rpc/orqqpx-get-not-purpose` | ORQQPX GET NOT PURPOSE | ARRAY |
| GET | `/vista/px/rpc/orqqpxrm-get-wh-proc-result` | ORQQPXRM GET WH PROC RESULT | ARRAY |
| GET | `/vista/px/rpc/pxrm-education-subtopics` | PXRM EDUCATION SUBTOPICS | ARRAY |
| GET | `/vista/px/rpc/pxrm-education-summary` | PXRM EDUCATION SUMMARY | ARRAY |
| GET | `/vista/px/rpc/pxrm-education-topic` | PXRM EDUCATION TOPIC | ARRAY |
| GET | `/vista/px/rpc/pxrm-reminder-categories` | PXRM REMINDER CATEGORIES | ARRAY |
| GET | `/vista/px/rpc/pxrm-reminder-dialog` | PXRM REMINDER DIALOG | ARRAY |
| GET | `/vista/px/rpc/pxrm-reminder-dialog-prompts` | PXRM REMINDER DIALOG PROMPTS | ARRAY |
| GET | `/vista/px/rpc/pxrm-reminder-evaluation` | PXRM REMINDER EVALUATION | ARRAY |
| GET | `/vista/px/rpc/pxrm-reminder-inquiry` | PXRM REMINDER INQUIRY | ARRAY |
| GET | `/vista/px/rpc/pxrm-reminder-web` | PXRM REMINDER WEB | ARRAY |
| GET | `/vista/px/rpc/pxrm-reminders-(unevaluated)` | PXRM REMINDERS (UNEVALUATED) | ARRAY |
| GET | `/vista/px/rpc/pxrm-reminder-detail` | PXRM REMINDER DETAIL | ARRAY |
| GET | `/vista/px/rpc/pxrm-mental-health` | PXRM MENTAL HEALTH | ARRAY |
| GET | `/vista/px/rpc/pxrm-progress-note-header` | PXRM PROGRESS NOTE HEADER | SINGLE VALUE |
| GET | `/vista/px/rpc/pxrm-mental-health-results` | PXRM MENTAL HEALTH RESULTS | ARRAY |
| POST | `/vista/px/rpc/pxrm-mental-health-save` | PXRM MENTAL HEALTH SAVE | ARRAY |
| GET | `/vista/px/rpc/pxrm-reminder-rpc` | PXRM REMINDER RPC | ARRAY |
| POST | `/vista/px/rpc/px-save-data` | PX SAVE DATA | SINGLE VALUE |
| GET | `/vista/px/rpc/pxvimm-info-source` | PXVIMM INFO SOURCE | ARRAY |
| GET | `/vista/px/rpc/pxvimm-admin-route` | PXVIMM ADMIN ROUTE | ARRAY |
| GET | `/vista/px/rpc/pxvimm-admin-site` | PXVIMM ADMIN SITE | ARRAY |
| GET | `/vista/px/rpc/pxvimm-imm-lot` | PXVIMM IMM LOT | GLOBAL ARRAY |
| GET | `/vista/px/rpc/pxvimm-imm-man` | PXVIMM IMM MAN | GLOBAL ARRAY |
| GET | `/vista/px/rpc/pxvimm-vis` | PXVIMM VIS | GLOBAL ARRAY |
| GET | `/vista/px/rpc/pxvimm-immdata` | PXVIMM IMMDATA | GLOBAL ARRAY |
| GET | `/vista/px/rpc/pxvimm-icr-list` | PXVIMM ICR LIST | ARRAY |
| GET | `/vista/px/rpc/pxvimm-vicr-events` | PXVIMM VICR EVENTS | ARRAY |
| GET | `/vista/px/rpc/pxvimm-imm-short-list` | PXVIMM IMM SHORT LIST | ARRAY |
| GET | `/vista/px/rpc/pxvimm-imm-detailed` | PXVIMM IMM DETAILED | GLOBAL ARRAY |
| GET | `/vista/px/rpc/pxvimm-admin-codes` | PXVIMM ADMIN CODES | ARRAY |
| GET | `/vista/px/rpc/pxvimm-imm-format` | PXVIMM IMM FORMAT | ARRAY |
| GET | `/vista/px/rpc/pxvimm-vimm-data` | PXVIMM VIMM DATA | GLOBAL ARRAY |
| GET | `/vista/px/rpc/pxvsk-skin-short-list` | PXVSK SKIN SHORT LIST | ARRAY |
| GET | `/vista/px/rpc/pxvsk-def-sites` | PXVSK DEF SITES | ARRAY |
| GET | `/vista/px/rpc/pxvsk-v-skin-test-list` | PXVSK V SKIN TEST LIST | ARRAY |
| GET | `/vista/px/rpc/pxvimm-imm-disclosure` | PXVIMM IMM DISCLOSURE | SINGLE VALUE |
| GET | `/vista/px/rpc/pxrmrpcg-genfupd` | PXRMRPCG GENFUPD | ARRAY |
| GET | `/vista/px/rpc/pxrmrpcc-promptvl` | PXRMRPCC PROMPTVL | SINGLE VALUE |
| POST | `/vista/px/rpc/pxrmrpcg-cancel` | PXRMRPCG CANCEL | SINGLE VALUE |
| GET | `/vista/px/rpc/pxrmrpcg-view` | PXRMRPCG VIEW | ARRAY |
| GET | `/vista/px/rpc/pxrmrpcg-genfvald` | PXRMRPCG GENFVALD | ARRAY |
| GET | `/vista/px/rpc/px-ice-web` | PX ICE WEB | GLOBAL ARRAY |
| GET | `/vista/px/rpc/pxrpc-save2` | PXRPC SAVE2 | ARRAY |
