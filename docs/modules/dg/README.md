# Registration (DG)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Patient demographics, insurance, eligibility, means test

| Property | Value |
|----------|-------|
| Namespace | `DG` |
| Tier | 5 |
| FileMan Files | 6 |
| RPCs | 31 |
| Menu Options | 286 |
| VDL Manual | `pims-registration-scheduling-tm.pdf` |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 2 | File #2 | ? | ? |
| 2.98 | File #2.98 | ? | ? |
| 355.3 | File #355.3 | ? | ? |
| 391.91 | File #391.91 | ? | ? |
| 408.12 | File #408.12 | ? | ? |
| 408.13 | File #408.13 | ? | ? |

## Remote Procedure Calls (RPCs)

### `DG SENSITIVE RECORD ACCESS`

| Property | Value |
|----------|-------|
| Tag | `PTSEC` |
| Routine | `DGSEC4` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure Call (RPC) will:           - Verify user is not accessing his/her own Patient file record if the Restrict Patient Record Access (#1201) field in the MAS parameters (#43) file is set to yes and the user does not hold the DG RECORD ACCESS security key.  If parameter set to yes an

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | DGMSG | LITERAL | No |
| 3 | DGOPT | LITERAL | No |

**API Endpoint:** `GET /vista/dg/rpc/dg-sensitive-record-access`

---

### `DG SENSITIVE RECORD BULLETIN`

| Property | Value |
|----------|-------|
| Tag | `NOTICE` |
| Routine | `DGSEC4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure Call (RPC) will add an entry to the DG SECURITY LOG (#38.1) file and/or generate the sensitive record access bulletin depending on the value in ACTION input parameter.  If ACTION parameter not defined, defaults to update DG Security Log file and generate Sensitive Record Access

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ACTION | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | DGOPT | LITERAL | No |

**API Endpoint:** `GET /vista/dg/rpc/dg-sensitive-record-bulletin`

---

### `DG CHK BS5 XREF Y/N`

| Property | Value |
|----------|-------|
| Tag | `GUIBS5` |
| Routine | `DPTLK6` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** CHECKS IF OTHER PATIENTS ON "BS5" XREF WITH SAME LAST NAME RETURNS 1 OR 0 IN 1ST STRING (OR -1 IF BAD DFN OR NO ZERO NODE) IF 1 RETURNS TEXT TO BE DISPLAYED

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/dg/rpc/dg-chk-bs5-xref-y/n`

---

### `DG CHK BS5 XREF ARRAY`

| Property | Value |
|----------|-------|
| Tag | `GUIBS5A` |
| Routine | `DPTLK6` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** CHECKS IF OTHER PATIENTS ON 'BS5' XREF WITH SAME LAST NAME RETURN 1 OR 0 IN 1ST STRING (-1 IF BAD DFN OR NO ZERO NODE). RETURNS ARRAY NODES WHERE TEXT IS PRECEEDED BY 0 AND PATIENT DATA IS PRECEEDED BY 1.  PATIENT DATA WILL BE IN FOLLOWING FORMAT:  1^DFN^PATIENT NAME^DOB^SSN

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/dg/rpc/dg-chk-bs5-xref-array`

---

### `DG CHK MEANS TEST DIV DISPLAY`

| Property | Value |
|----------|-------|
| Tag | `GUIDMT` |
| Routine | `DPTLK6` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** CHECKS DIVISION FILE FOR DIV USER IS IN  IF MEANS TEST REQUIRED IS SET TO YES RETURNS 1 IN 1ST STRING AND MEANS TEST TEXT   IN 2ND AND 3RD STRING (IF ANY) OTHERWISE RETURNS 0 IN 1ST STRING

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUZ2 | LITERAL | No |

**API Endpoint:** `GET /vista/dg/rpc/dg-chk-means-test-div-display`

---

### `DG CHK PAT MEANS TEST REQUIRED`

| Property | Value |
|----------|-------|
| Tag | `GUIMT` |
| Routine | `DPTLK6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** CHECKS WHETHER MEANS TEST IS REQUIRED FOR PATIENT RETURNS 1 OR 0

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/dg/rpc/dg-chk-pat-means-test-required`

---

### `DG CHK PAT/DIV MEANS TEST`

| Property | Value |
|----------|-------|
| Tag | `GUIMTD` |
| Routine | `DPTLK6` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** CHECKS IF MEANS TEST REQUIRED FOR PATIENT AND CHECKS IF MEANS TEST DISPLAY REQUIRED FOR USER'S DIVISION RETURNS 1 IN 1ST STRING IF BOTH TRUE OTHERWISE 0 IF BOTH TRUE RETURNS TEXT IN 2ND AND 3RD STRING (IF ANY)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | DUZ2 | LITERAL | No |

**API Endpoint:** `GET /vista/dg/rpc/dg-chk-pat/div-means-test`

---

### `DG PATIENT TREATMENT DATA`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `DGPTFAPI` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return data from the Patient Treatment (#45) file.   Input:   PTFNUMBR - The Patient Treatment IFN (.001 of the #45 file record)    RESULTS - Results array (passed by reference)       Output:      RESULTS - Results array (passed by reference) with the following                nodes.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PTFNUMBER | LITERAL | No |

**API Endpoint:** `GET /vista/dg/rpc/dg-patient-treatment-data`

---

### `DGWPT DFLTSRC`

| Property | Value |
|----------|-------|
| Tag | `DFLTSRC` |
| Routine | `DGWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return user's default patient list source.

**API Endpoint:** `GET /vista/dg/rpc/dgwpt-dfltsrc`

---

### `DGWPT TOP`

| Property | Value |
|----------|-------|
| Tag | `TOP` |
| Routine | `DGWPT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns the last selected patient by the defined user.

**API Endpoint:** `GET /vista/dg/rpc/dgwpt-top`

---

### `DGWPT SELCHK`

| Property | Value |
|----------|-------|
| Tag | `SELCHK` |
| Routine | `DGWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns a 1 if the patient record is flagged as senstive, otherwise returns 0.

**API Endpoint:** `GET /vista/dg/rpc/dgwpt-selchk`

---

### `DGWPT SAVDFLT`

| Property | Value |
|----------|-------|
| Tag | `SAVDFLT` |
| Routine | `DGWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Saves user's preference for default list source.

**API Endpoint:** `GET /vista/dg/rpc/dgwpt-savdflt`

---

### `DGWPT CLINRNG`

| Property | Value |
|----------|-------|
| Tag | `CLINRNG` |
| Routine | `DGWPT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of selectable options from which a user can choose a date range for appointments.

**API Endpoint:** `GET /vista/dg/rpc/dgwpt-clinrng`

---

### `DGWPT BYWARD`

| Property | Value |
|----------|-------|
| Tag | `BYWARD` |
| Routine | `DGWPT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of patients currently residing on a specified ward location.

**API Endpoint:** `GET /vista/dg/rpc/dgwpt-byward`

---

### `DGWPT DIEDON`

| Property | Value |
|----------|-------|
| Tag | `DIEDON` |
| Routine | `DGWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns date of death if patient has expired.  Otherwise returns 0.

**API Endpoint:** `GET /vista/dg/rpc/dgwpt-diedon`

---

### `DGWPT1 PRCARE`

| Property | Value |
|----------|-------|
| Tag | `PRCARE` |
| Routine | `DGWPT1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return primary care information for a patient in the format:   VAL=Primary Care Team^Primary Care Provider^Attending

**API Endpoint:** `GET /vista/dg/rpc/dgwpt1-prcare`

---

### `DGWPT SELECT`

| Property | Value |
|----------|-------|
| Tag | `SELECT` |
| Routine | `DGWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** RPC to return key information on a patient as follows:   1    2   3   4    5      6    7    8       9       10      11   12 13  14 NAME^SEX^DOB^SSN^LOCIEN^LOCNM^RMBD^CWAD^SENSITIVE^ADMITTED^CONV^SC^SC%^ICN

**API Endpoint:** `GET /vista/dg/rpc/dgwpt-select`

---

### `DGRR PATIENT LOOKUP SEARCH`

| Property | Value |
|----------|-------|
| Tag | `SEARCH` |
| Routine | `DGRRLU` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This rpc is set to return an xml document via VistaLink that contains the display data for a gui patient lookup.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/dg/rpc/dgrr-patient-lookup-search`

---

### `DGRR GET PTLK BUSINESS DATA`

| Property | Value |
|----------|-------|
| Tag | `BUS` |
| Routine | `DGRRLU1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns XML document containing data needed to perform business logic checks on patient lookup.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/dg/rpc/dgrr-get-ptlk-business-data`

---

### `DGRR SET SENSITIVE ACCESS LOG`

| Property | Value |
|----------|-------|
| Tag | `NOTICE` |
| Routine | `DGRRLU2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure Call (RPC) will add an entry to the DG SECURITY LOG (#38.1) file and/or generate the sensitive record access bulletin depending on the value in ACTION input parameter.  If ACTION parameter not defined, defaults to update DG Security Log file and generate Sensitive Record Access

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ACTION | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | DGOPT | LITERAL | No |

**API Endpoint:** `POST /vista/dg/rpc/dgrr-set-sensitive-access-log`

---

### `DGRR GET LOOKUP TYPE LIST`

| Property | Value |
|----------|-------|
| Tag | `GETLIST` |
| Routine | `DGRRLU3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns an XML document containing a list of wards or a list of clinics (depending on what was requested)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/dg/rpc/dgrr-get-lookup-type-list`

---

### `DGRR PATIENT LKUP PREFERENCES`

| Property | Value |
|----------|-------|
| Tag | `START` |
| Routine | `DGRRLU4` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns an xml document containing the division or package preferences.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/dg/rpc/dgrr-patient-lkup-preferences`

---

### `DGRR SET PTLK PREFERENCES`

| Property | Value |
|----------|-------|
| Tag | `UPDATE` |
| Routine | `DGRRLU4` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call updates the division/institutional preferences  passed to the call. It returns an xml document containing the station number and status.  If update was successful, status is returned as true.  If errors were encountered during the update, false is returned with an error me

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMS | REFERENCE | No |

**API Endpoint:** `POST /vista/dg/rpc/dgrr-set-ptlk-preferences`

---

### `DGRR CANCEL SEARCH`

| Property | Value |
|----------|-------|
| Tag | `CANCEL` |
| Routine | `DGRRLU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** The DGRR CANCEL SEARCH RPC will cancel a patient search in VistA.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | JOB | LITERAL | No |

**API Endpoint:** `POST /vista/dg/rpc/dgrr-cancel-search`

---

### `DGRR GET PATIENT SERVICES DATA`

| Property | Value |
|----------|-------|
| Tag | `PATIENT` |
| Routine | `DGRRPSGT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return an XML via VistaLink containing Patient Service Demographic information for any given Patient ICN

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/dg/rpc/dgrr-get-patient-services-data`

---

### `DG VIC PATIENT LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `RPCVIC` |
| Routine | `DPTLK` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will allow lookup of a patient with the input from a VIC card or DOD CAC card. The VIC card can be an old VIC card or the newer VIC 4.0 card.  The entire card's input should be provided.  If the patient is known locally the patient's DFN will be returned.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DPTX | LITERAL | No |

**API Endpoint:** `GET /vista/dg/rpc/dg-vic-patient-lookup`

---

### `DG PATIENT ADMISSIONS`

| Property | Value |
|----------|-------|
| Tag | `ADMITS` |
| Routine | `DGRPCLV` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC retrieves all admissions for the last year for a specific  patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/dg/rpc/dg-patient-admissions`

---

### `DGBT CLAIM DEDUCTIBLE PAID`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `DGBTRDV` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** THIS RPC IS USED BY BENEFICIARY TRAVEL PACKAGE TO RETRIEVE TRAVEL CLAIM  INFORMATION ABOUT ANY TRAVEL CLAIMS FOR PATIENT.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ICN | LITERAL | No |
| 2 | CLAIM DATE | LITERAL | No |

**API Endpoint:** `GET /vista/dg/rpc/dgbt-claim-deductible-paid`

---

### `DG DEATH SOURCE/DOC UPDATE`

| Property | Value |
|----------|-------|
| Tag | `BRDATA` |
| Routine | `DGDTHBR` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will receive data from the MPI for updates to selectable Source of Notifications and Supporting Documents and their associated Business Rules.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DGDATA | REFERENCE | No |

**API Endpoint:** `POST /vista/dg/rpc/dg-death-source/doc-update`

---

### `DG FULL ICN SHOW/UPDATE`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `DGFLICN` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is invoked by MPI option - MPI SHOW/UPDATE VISTA ICN. It will  send ICN related fields (FULL ICN, INTEGRATION CONTROL NUMBER, ICN  CHECKSUM) from PATIENT file #2 to MPI for given DFN. It will also update  ICN fields in Patient file if user have selected to update them with  Primary View ICN

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DGDATA | LITERAL | No |

**API Endpoint:** `POST /vista/dg/rpc/dg-full-icn-show/update`

---

### `DG UPDATE NAME COMPONENTS`

| Property | Value |
|----------|-------|
| Tag | `UPDNC` |
| Routine | `DGNAME` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure updates or retrieves values in a NAME COMPONENTS  file (#20) entry.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FLAG | LITERAL | No |
| 2 | IEN | LITERAL | No |
| 3 | NAME COMPONENTS | REFERENCE | No |

**API Endpoint:** `POST /vista/dg/rpc/dg-update-name-components`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| DFN: | DG SENSITIVE RECORD ACCESS | DFN | LITERAL | rpc |
| DGMSG: | DG SENSITIVE RECORD ACCESS | DGMSG | LITERAL | rpc |
| DGOPT: | DG SENSITIVE RECORD ACCESS | DGOPT | LITERAL | rpc |
| ACTION: | DG SENSITIVE RECORD BULLETIN | ACTION | LITERAL | rpc |
| DFN: | DG SENSITIVE RECORD BULLETIN | DFN | LITERAL | rpc |
| DGOPT: | DG SENSITIVE RECORD BULLETIN | DGOPT | LITERAL | rpc |
| DFN: | DG CHK BS5 XREF Y/N | DFN | LITERAL | rpc |
| DFN: | DG CHK BS5 XREF ARRAY | DFN | LITERAL | rpc |
| DUZ2: | DG CHK MEANS TEST DIV DISPLAY | DUZ2 | LITERAL | rpc |
| DFN: | DG CHK PAT MEANS TEST REQUIRED | DFN | LITERAL | rpc |
| DFN: | DG CHK PAT/DIV MEANS TEST | DFN | LITERAL | rpc |
| DUZ2: | DG CHK PAT/DIV MEANS TEST | DUZ2 | LITERAL | rpc |
| PTFNUMBER: | DG PATIENT TREATMENT DATA | PTFNUMBER | LITERAL | rpc |
| PARAM: | DGRR PATIENT LOOKUP SEARCH | PARAM | REFERENCE | rpc |
| PARAM: | DGRR GET PTLK BUSINESS DATA | PARAM | REFERENCE | rpc |
| ACTION: | DGRR SET SENSITIVE ACCESS LOG | ACTION | LITERAL | rpc |
| DFN: | DGRR SET SENSITIVE ACCESS LOG | DFN | LITERAL | rpc |
| DGOPT: | DGRR SET SENSITIVE ACCESS LOG | DGOPT | LITERAL | rpc |
| PARAM: | DGRR GET LOOKUP TYPE LIST | PARAM | REFERENCE | rpc |
| PARAM: | DGRR PATIENT LKUP PREFERENCES | PARAM | REFERENCE | rpc |
| PARAMS: | DGRR SET PTLK PREFERENCES | PARAMS | REFERENCE | rpc |
| JOB: | DGRR CANCEL SEARCH | JOB | LITERAL | rpc |
| PARAM: | DGRR GET PATIENT SERVICES DATA | PARAM | REFERENCE | rpc |
| DPTX: | DG VIC PATIENT LOOKUP | DPTX | LITERAL | rpc |
| DFN: | DG PATIENT ADMISSIONS | DFN | LITERAL | rpc |
| PATIENT ICN: | DGBT CLAIM DEDUCTIBLE PAID | PATIENT ICN | LITERAL | rpc |
| CLAIM DATE: | DGBT CLAIM DEDUCTIBLE PAID | CLAIM DATE | LITERAL | rpc |
| DGDATA: | DG DEATH SOURCE/DOC UPDATE | DGDATA | REFERENCE | rpc |
| DGDATA: | DG FULL ICN SHOW/UPDATE | DGDATA | LITERAL | rpc |
| FLAG: | DG UPDATE NAME COMPONENTS | FLAG | LITERAL | rpc |
| IEN: | DG UPDATE NAME COMPONENTS | IEN | LITERAL | rpc |
| NAME COMPONENTS: | DG UPDATE NAME COMPONENTS | NAME COMPONENTS | REFERENCE | rpc |
| PARAM: | DGRR PATIENT LOOKUP SEARCH | PARAM | REFERENCE | rpc |
| PARAM: | DGRR GET PTLK BUSINESS DATA | PARAM | REFERENCE | rpc |
| ACTION: | DGRR SET SENSITIVE ACCESS LOG | ACTION | LITERAL | rpc |
| DFN: | DGRR SET SENSITIVE ACCESS LOG | DFN | LITERAL | rpc |
| DGOPT: | DGRR SET SENSITIVE ACCESS LOG | DGOPT | LITERAL | rpc |
| PARAM: | DGRR GET LOOKUP TYPE LIST | PARAM | REFERENCE | rpc |
| PARAM: | DGRR PATIENT LKUP PREFERENCES | PARAM | REFERENCE | rpc |
| PARAMS: | DGRR SET PTLK PREFERENCES | PARAMS | REFERENCE | rpc |
| JOB: | DGRR CANCEL SEARCH | JOB | LITERAL | rpc |
| PARAM: | DGRR GET PATIENT SERVICES DATA | PARAM | REFERENCE | rpc |

## Menu Options

### Menu

| Name | Security Key |
|------|-------------|
| DG MANAGER MENU | — |
| DG BED CONTROL | — |
| DG OUTPUTS MENU | — |
| DG SUPERVISOR MENU | DG SUPERVISOR |
| DG PTF MENU | — |
| DG REGISTRATION MENU | — |
| DG PTF OUTPUT MENU | — |
| DG MEANS TEST SUPERVISOR MENU | DG MEANSTEST |
| DG AMIS REPORTS | — |
| DG INPATIENT REPORTS | — |
| DG RUG MENU | — |
| DG PTF DRG REPORTS | DG PTFSUP |
| DG PTF UPDATE DRG INFO | DG PTFSUP |
| DG RUG OUTPUTS | — |
| DG VBC MENU | — |
| DG SCHED ADMIT | — |
| DG DISPOSITION OUTPUT MENU | — |
| DG CONSISTENCY SUPERVISOR MENU | DG CONSISTENCY |
| DG MEANS TEST USER MENU | — |
| DG SYSTEM DEFINITION MENU | — |
| DG THIRD PARTY OUTPUT MENU | — |
| DG SECURITY OFFICER MENU | DG SECURITY OFFICER |
| DG GECS MAINTENANCE USER MENU | — |
| DG GECS REPORTS MENU | — |
| DG GECS USER MENU | — |
| DG GECS TRANSMIT USER | — |
| DG GECS MAIN MENU | — |
| DG GECS BATCH MENU | — |
| DG GECS TRANSMIT MENU | — |
| DG ELIG MAINTENANCE | — |
| DG CO-PAY TEST USER MENU | DG MEANSTEST |
| DG CO-PAY TEST SUPERVISOR MENU | DG MEANSTEST |
| DG MEANS TEST OUTPUTS | — |
| DG CNH RUG MENU | — |
| DG NPTF HL7 REPORT MENU | — |
| DG NPTF MAIN | — |
| DG NPTF XMIT MENU | DG PTFTRANS |
| DG OTH MENU | — |
| DG OTH REPORTS MENU | — |
| DG PRESUMP. PSYCHOSIS REPORTS | — |
| DG VAS MENU | DG SECURITY OFFICER |

### Action

| Name | Security Key |
|------|-------------|
| DG ADMIT PATIENT | — |
| DG TRANSFER PATIENT | — |
| DG DISCHARGE PATIENT | — |
| DG G&L SHEET | — |
| DG TREATING TRANSFER | — |
| DG DEVICE SELECTION | — |
| DG MEANS TEST EDIT | DG MEANSTEST |
| DG MEANS TEST ADJUDICATE | DG MEANSTEST |
| DG MEANS TEST ADD | DG MEANSTEST |
| DG MEANS TEST THRESHOLD EDIT | — |
| DG MEANS TEST VIEW EDITING | — |
| DG PTF TRIM REPORT | — |
| DG PTF FREQUENCY REPORT | — |
| DG PTF DRG ALOS | — |
| DG MEANS TEST DELETE | DG MTDELETE |
| DG MEANS TEST REQUIRED | — |
| DG PTF QUICK LOAD | — |
| DG RELEASE NOTES | — |
| DG AMIS 400 PENDING | — |
| DG PTF DRG INFORMATION OUTPUT | — |
| DG GECS BATCH | — |
| DG GECS BATCH EDIT | — |
| DG GECS BATCHES STATUS | — |
| DG GECS BATCHES WAITING TRANS | — |
| DG GECS CODE EDIT | — |
| DG GECS CREATE | — |
| DG GECS DELETE | — |
| DG GECS KEYPUNCH | — |
| DG GECS PURGE | — |
| DG GECS REBATCH | — |
| DG GECS RETRANSMIT | — |
| DG GECS REVIEW CODE SHEET | — |
| DG GECS TRANSMIT | — |
| DG GECS READY FOR BATCHING LIS | — |
| DG GECS READY FOR BATCH LIST | — |
| DG MEANS TEST VIEW TEST | — |
| DG CO-PAY TEST ADD | DG MEANSTEST |
| DG CO-PAY TEST EDIT | DG MEANSTEST |
| DG CO-PAY TEST DELETE | DG MTDELETE |
| DG CO-PAY TEST INCOMPLETE | DG MEANSTEST |
| DG CO-PAY TEST VIEW EDITING | — |
| DG CO-PAY TEST VIEW TEST | — |
| DG MEANS TEST FUTURE LIST | — |
| DG CO-PAY TEST FUTURE LIST | — |
| DG MEANS TEST HARDSHIP REVIEW | — |
| DG MEANS TEST COMMENTS | — |
| DG DUPLICATE SSN REPORT | — |
| DG PTF DRG CASE MIX SUMMARY | — |
| DG PTF TRANS MT EQUAL U RPT | — |

### Run routine

| Name | Security Key |
|------|-------------|
| DG BED SWITCH | — |
| DG BED AVAILABILITY | — |
| DG DISPOSITION APPLICATION | — |
| DG SCHED ADMIT PRINT | — |
| DG SCHED ADMIT ENTRY | — |
| DG ABSENCE OUTPUT | — |
| DG DISPOSITION LOG | — |
| DG DISPOSITION SUMMARY | — |
| DG INPATIENT LIST | — |
| DG AMIS 334-341 | — |
| DG AMIS 345-346 | — |
| DG SERIOUSLY ILL LIST | — |
| DG REGISTER PATIENT | — |
| DG LOAD PATIENT DATA | — |
| DG DISPOSITION EDIT | — |
| DG PARAMETER ENTRY | — |
| DG G&L INIT | — |
| DG DRG CALCULATION | — |
| DG PTF MESSAGE ENTER | — |
| DG PTF MESSAGE INQUIRE | — |
| DG PTF MESSAGE CHECK | — |
| DG PTF SCREEN | — |
| DG PATIENT INQUIRY | — |
| DG DEATH ENTRY | DG DETAIL |
| DG SERIOUSLY ILL ENTRY | — |
| DG WAITING LIST ENTRY | — |
| DG ELIGIBILITY VERIFICATION | — |
| DG TREATING SETUP | — |
| DG TREATING PRINT | — |
| DG PTF DELETE | DG PTFREL |
| DG PTF RELEASE RECORD | DG PTFREL |
| DG PTF OPEN CLOSED RECORD | DG PTFREL |
| DG G&L RECALC | — |
| DG FEMALE CURRENT INPT LIST | — |
| DG REGISTRATION DELETE | — |
| DG INPATIENT INQUIRY EXTENDED | — |
| DG PTF CREATE | — |
| DG PTF FEE BASIS ADD | — |
| DG PTF CODING REPORT | — |
| DG PTF CODING CLERK REPORT | DG PTFSUP |
| DG PTF VALIDITY CHECK | — |
| DG PTF ICD DIAGNOSTIC SEARCH | DG PTFSUP |
| DG PTF ICD SURGICAL SEARCH | DG PTFSUP |
| DG REGISTRATION 10/10 REPRINT | — |
| DG INPATIENT HISTORICAL | — |
| DG BED CONTROL EXTENDED | — |
| DG FEMALE HISTORICAL | — |
| DG G&L RECALCULATION AUTO | — |
| DG BED CONTROL MOVEMENT EDIT | — |
| DG PTF TRANSMISSION VADATS | DG PTFTRANS |
| DG ASIH LIST | — |
| DG MEANS TEST COMPLETE | — |
| DG PTF COMPREHENSIVE INQUIRY | — |
| DG THIRD PARTY REIMBURSEMENT | — |
| DG PTF OPEN RELEASED | DG PTFTRANS |
| DG CONSISTENCY UPDATE | DG CONSISTENCY |
| DG CONSISTENCY PATIENT | — |
| DG CONSISTENCY PRINT | — |
| DG THIRD PARTY ADMIT REVIEW | — |
| DG THIRD PARTY PATIENT REVIEW | — |
| DG RUG CLOSE | DG RUG CLOSE PAI |
| DG RUG CREATE | — |
| DG RUG DELETE | — |
| DG RUG OPEN | — |
| DG RUG ENTER/EDIT | — |
| DG RUG GROUPER | — |
| DG PTF BATCH REPORTS | — |
| DG PTF DRG INDEX | — |
| DG CONSISTENCY PURGE | DG CONSISTENCY |
| DG CONSISTENCY REBUILD | DG CONSISTENCY |
| DG VBC PATIENT | — |
| DG VBC ADMISSION | — |
| DG RUG PAI SINGLE | — |
| DG RUG PAI RANGE | — |
| DG RUG INCOMPLETE | — |
| DG RUG BACKGROUND JOB | — |
| DG INTEGRITY CHECKER | — |
| DG INSURANCE COMPANY EDIT | — |
| DG PTF MEANS TEST OF 'U' | — |
| DG TEMPLATE LOCAL | — |
| DG CONSISTENCY CHECK | DG CONSISTENCY |
| DG SCHED ADMIT PURGE | — |
| DG SCHED ADMIT CANCEL | — |
| DG SCHED ADMIT STATS | — |
| DG COLLATERAL PATIENT | — |
| DG RUG TRANSMISSION | DG RUG TRANSMISSION |
| DG DISPOSITION TIME STATS | — |
| DG BULLETIN LOCAL | — |
| DG PTF 099 TRANSMISSION | DG PTFTRANS |
| DG SECURITY ENTER/EDIT | DG SENSITIVITY |
| DG SECURITY PURGE PATIENTS | DG SECURITY OFFICER |
| DG SECURITY PURGE LOG | DG SECURITY OFFICER |
| DG SECURITY DISPLAY LOG | DG SECURITY OFFICER |
| DG RELEASE COMMENTS | DG SUPERVISOR |
| DG RUG INDEX | — |
| DG RUG SEMI ANNUAL BGJ | — |
| DG RUG WWU | — |
| DG RUG TEST GROUPER | — |
| DG PTF TRANSMITTED RECORDS | — |
| DG REGISTRATION VIEW | — |
| DG AMIS 401-420 | — |
| DG TRANSMISSION ROUTER EDIT | — |
| DG PTF SUMMARY DIAG/OP OUTPUT | — |
| DG RUG SEMI ANNUAL - TASKED | — |
| DG SHOW STATUS | — |
| DG RUG STATUS | — |
| DG RELIGION LIST | — |
| DG INSURANCE LIST | — |
| DG PTF BACKGROUND JOB | — |
| DG INPATIENT ROSTER | — |
| DG WAITING LIST DELETE | — |
| DG GECS GENERATE | — |
| DG GECS PRINT | — |
| DG PTF UPDATE TRANSFER DRG'S | DG PTFSUP |
| DG PATIENT ELIGIBILITY INQUIRY | — |
| DG ELIG ID FORMAT EDIT | — |
| DG ELIG CODE ENTER/EDIT | — |
| DG ELIG ID FORMAT RESET | — |
| DG ELIG PRI ELIG RESET | — |
| DG ELIG ID RESET | — |
| DG ELIG RESET PATIENT | — |
| DG ELIG RESET ALL | — |
| DG PT EXPANDED CODE LIST | — |
| DG MEANS TEST DEDUCTIBLE | — |
| DG MEANS TEST PREV THRESHOLD | — |
| DG PTF SUFFIX EFF DATE EDIT | DG PTFSUP |
| DG CNH PAI CLOSE RECORD | — |
| DG CNH PAI CREATE RECORD | — |
| DG CNH PAI DELETE RECORD | — |
| DG CNH PAI OPEN | — |
| DG CNH PAI EDIT | — |
| DG SHARING AGREEMENT UPDATE | — |
| DG NPTF XMIT ADMISSION | — |
| DG NPTF XMIT DEMOGRAPHICS | — |
| DG NPTF XMIT PIVOT | — |
| DG MEANS TEST SPEC INCOME RPT | — |
| DG MEANS TEST INC < THRESH RPT | — |
| DG PH HIST | — |
| DG PH STATUS | — |
| DG ALL ADDRESS CHANGE REPORT | — |
| DG CV STATUS | — |
| DG CLEANUP INCOME TEST DUPES | — |
| DG CLEANUP INCOME TEST MONITOR | — |
| DG ALL ADDRESS CHANGE WITH RX | — |
| DG MS INCONSISTENCIES RPT | — |
| DG PRINT PATIENT LABEL | — |
| DG UNSUPPORTED CV END DATE RPT | — |
| DG PATIENT CE REPORT | DG SUPERVISOR |
| DG SENSITIVE RCDS RPT-TASK | — |
| DG PRO FEE NOT SENT TO PCE | — |
| DG ADDRESS UPDATE | — |
| DG REIMBURSABLE PRIM EC RPT | — |
| DG INVALID STATE/COUNTY REPORT | — |
| DG PATIENT PSEUDO SSN REPORT | — |
| DG DEPENDENT PSEUDO SSN REPORT | — |
| DG Z07 CONSISTENCY CHECK | DG CONSISTENCY |
| DG VTS RIDESHARE | DG VTS RIDESHARE |
| DG MEANINGFUL USE LANG STATS | — |
| DG OTH 90-DAY PERIOD | — |
| DG OTH PATIENT INQUIRY | — |
| DG OTH MANAGEMENT | — |
| DG OTH OTH90 AUTH REPORTS | — |
| DG OTH MH STATUS REPORT | — |
| DG OTH POTENTIAL OTH | — |
| DG EVENT NOTIFIER | — |
| DG OTH STATISTICAL REPORT | — |
| DG PRESUMP. PSYCHOSIS STATUS | — |
| DG PRESUMP. PSYCH. STATS | — |
| DG PRESUMP. PSYCH. PAT. PROF | — |
| DG PRESUMP. PSYCH. GENDER | — |
| DG PRESUMP. PSYCH. FISCAL YEAR | — |
| DG OTH FSM ELIG. CHANGE REPORT | — |
| DG OTH FSM DETAIL REPORT | — |
| DG PRESUMP. PSYCH. RECON RPT | — |
| DG PRESUMP. PSYCH. PAT. DETAIL | — |
| DG POTEN PRESUMPT PSYCHOSIS | — |
| DG VAS EXPORT | — |
| DG VAS MODIFY | DG SECURITY OFFICER |
| DG VAS DISPLAY | — |
| DG AUDIT TASKMAN | — |
| DG NAME COMPONENT UPDATE | DGPNC |

### Edit

| Name | Security Key |
|------|-------------|
| DG WARD DEFINITION | — |
| DG PATIENT TYPE PARAMETER EDIT | DG SUPERVISOR |
| DG INSTITUTION EDIT | DG INSTITUTION |

### Print

| Name | Security Key |
|------|-------------|
| DG WAITING LIST PRINT | — |
| DG PTF OPEN RECORD OUTPUT | — |
| DG PTF COMPREHENSIVE REPORT | — |
| DG PTF NO ADMISSION | — |
| DG PTF OPEN RECORD LIST | — |
| DG NPTF HL7 REPORT (YESTERDAY) | — |
| DG NPTF HL7 REPORT (ASK DATES) | — |
| DG MISSING NEW PERSON FILE SSN | — |
| DG ALL BAI REPORT | — |
| DG SENSITIVE RCDS RPT-EXPORT | — |
| DG SENSITIVE RCDS RPT-FORMAT | — |

### Inquire

| Name | Security Key |
|------|-------------|
| DG G&L CHANGES VIEW | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `DG DETAIL`
- `DG SUPERVISOR`
- `DG PTFREL`
- `DG PTFSUP`
- `DG PTFTRANS`
- `DG MEANSTEST`
- `DG CONSISTENCY`
- `DG RUG CLOSE PAI`
- `DG MTDELETE`
- `DG RUG TRANSMISSION`
- `DG SENSITIVITY`
- `DG SECURITY OFFICER`
- `DG INSTITUTION`
- `DG VTS RIDESHARE`
- `DGPNC`

## API Route Summary

All routes are prefixed with `/vista/dg/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/dg/rpc/dg-sensitive-record-access` | DG SENSITIVE RECORD ACCESS | ARRAY |
| GET | `/vista/dg/rpc/dg-sensitive-record-bulletin` | DG SENSITIVE RECORD BULLETIN | SINGLE VALUE |
| GET | `/vista/dg/rpc/dg-chk-bs5-xref-y/n` | DG CHK BS5 XREF Y/N | ARRAY |
| GET | `/vista/dg/rpc/dg-chk-bs5-xref-array` | DG CHK BS5 XREF ARRAY | ARRAY |
| GET | `/vista/dg/rpc/dg-chk-means-test-div-display` | DG CHK MEANS TEST DIV DISPLAY | ARRAY |
| GET | `/vista/dg/rpc/dg-chk-pat-means-test-required` | DG CHK PAT MEANS TEST REQUIRED | SINGLE VALUE |
| GET | `/vista/dg/rpc/dg-chk-pat/div-means-test` | DG CHK PAT/DIV MEANS TEST | ARRAY |
| GET | `/vista/dg/rpc/dg-patient-treatment-data` | DG PATIENT TREATMENT DATA | ARRAY |
| GET | `/vista/dg/rpc/dgwpt-dfltsrc` | DGWPT DFLTSRC | SINGLE VALUE |
| GET | `/vista/dg/rpc/dgwpt-top` | DGWPT TOP | ARRAY |
| GET | `/vista/dg/rpc/dgwpt-selchk` | DGWPT SELCHK | SINGLE VALUE |
| GET | `/vista/dg/rpc/dgwpt-savdflt` | DGWPT SAVDFLT | SINGLE VALUE |
| GET | `/vista/dg/rpc/dgwpt-clinrng` | DGWPT CLINRNG | ARRAY |
| GET | `/vista/dg/rpc/dgwpt-byward` | DGWPT BYWARD | ARRAY |
| GET | `/vista/dg/rpc/dgwpt-diedon` | DGWPT DIEDON | SINGLE VALUE |
| GET | `/vista/dg/rpc/dgwpt1-prcare` | DGWPT1 PRCARE | SINGLE VALUE |
| GET | `/vista/dg/rpc/dgwpt-select` | DGWPT SELECT | SINGLE VALUE |
| GET | `/vista/dg/rpc/dgrr-patient-lookup-search` | DGRR PATIENT LOOKUP SEARCH | GLOBAL ARRAY |
| GET | `/vista/dg/rpc/dgrr-get-ptlk-business-data` | DGRR GET PTLK BUSINESS DATA | GLOBAL ARRAY |
| POST | `/vista/dg/rpc/dgrr-set-sensitive-access-log` | DGRR SET SENSITIVE ACCESS LOG | SINGLE VALUE |
| GET | `/vista/dg/rpc/dgrr-get-lookup-type-list` | DGRR GET LOOKUP TYPE LIST | GLOBAL ARRAY |
| GET | `/vista/dg/rpc/dgrr-patient-lkup-preferences` | DGRR PATIENT LKUP PREFERENCES | GLOBAL ARRAY |
| POST | `/vista/dg/rpc/dgrr-set-ptlk-preferences` | DGRR SET PTLK PREFERENCES | GLOBAL ARRAY |
| POST | `/vista/dg/rpc/dgrr-cancel-search` | DGRR CANCEL SEARCH | SINGLE VALUE |
| GET | `/vista/dg/rpc/dgrr-get-patient-services-data` | DGRR GET PATIENT SERVICES DATA | GLOBAL ARRAY |
| GET | `/vista/dg/rpc/dg-vic-patient-lookup` | DG VIC PATIENT LOOKUP | SINGLE VALUE |
| GET | `/vista/dg/rpc/dg-patient-admissions` | DG PATIENT ADMISSIONS | ARRAY |
| GET | `/vista/dg/rpc/dgbt-claim-deductible-paid` | DGBT CLAIM DEDUCTIBLE PAID | ARRAY |
| POST | `/vista/dg/rpc/dg-death-source/doc-update` | DG DEATH SOURCE/DOC UPDATE | ARRAY |
| POST | `/vista/dg/rpc/dg-full-icn-show/update` | DG FULL ICN SHOW/UPDATE | SINGLE VALUE |
| POST | `/vista/dg/rpc/dg-update-name-components` | DG UPDATE NAME COMPONENTS | ARRAY |

## VDL Documentation Reference

Source manual: `data/vista/vdl-manuals/pims-registration-scheduling-tm.pdf`

Refer to the official VA VistA Documentation Library (VDL) manual for:

- Roll & Scroll terminal operation procedures
- Security key assignments and menu management
- FileMan file relationships and data entry rules
- MUMPS routine reference and entry points
