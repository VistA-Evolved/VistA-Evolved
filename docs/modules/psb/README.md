# Barcode Medication Administration (PSB)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Outpatient prescriptions, inpatient meds, drug file, formulary

| Property | Value |
|----------|-------|
| Namespace | `PSB` |
| Tier | 5 |
| FileMan Files | 6 |
| RPCs | 44 |
| Menu Options | 38 |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 50 | File #50 | ? | ? |
| 52 | File #52 | ? | ? |
| 52.6 | File #52.6 | ? | ? |
| 52.7 | File #52.7 | ? | ? |
| 55 | File #55 | ? | ? |
| 59.7 | File #59.7 | ? | ? |

## Remote Procedure Calls (RPCs)

### `PSB SCANPT`

| Property | Value |
|----------|-------|
| Tag | `SCANPT` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to validate the data scanned in at the scan patient  wristband prompt of the mnOpenPatient component.  The value passed in  is either the full SSN scanned in from the patient wristband -or- the  1U4N syntax of the patient lookup.  In either case the call must  return only one patien

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBDATA | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-scanpt`

---

### `PSB INSTRUCTOR`

| Property | Value |
|----------|-------|
| Tag | `INST` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Used by frmInstructor to validate that an instructor is at the client  with a student.  Validation is acheived via the instructor entering  their SSN and electronic signature code.  This is then validated  against the NEW PERSON file (#200).  If a valid user is obtained,  that user must posses the P

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBACC | LITERAL | No |
| 2 | PSBVER | UNKNOWN() | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-instructor`

---

### `PSB USERLOAD`

| Property | Value |
|----------|-------|
| Tag | `USRLOAD` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is called at application startup to populate the BCMA_User  object with the users defaults.  No parameters are passed, the current  DUZ is assumed.

**API Endpoint:** `GET /vista/psb/rpc/psb-userload`

---

### `PSB USERSAVE`

| Property | Value |
|----------|-------|
| Tag | `USRSAVE` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 13 |

**Description:** Save the users current window settings for the next session.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBWIN | LITERAL | No |
| 2 | PSBVDL | LITERAL | No |
| 3 | PSBUDCW  | LITERAL | No |
| 4 | PSBPBCW | LITERAL | No |
| 5 | PSBIVCW | LITERAL | No |
| 6 | PSBDEV | LITERAL | No |
| 7 | PSBCSRT | LITERAL | No |
| 8 | PSBCV1 | LITERAL | No |
| 9 | PSBCV2 | LITERAL | No |
| 10 | PSBCV3 | LITERAL | No |
| 11 | PSBCV4 | LITERAL | No |
| 12 | PSBORMODE | LITERAL | No |
| 13 | PSBCLSRCH | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-usersave`

---

### `PSB FMDATE`

| Property | Value |
|----------|-------|
| Tag | `FMDATE` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Used to validate Fileman dates.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBVAL | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-fmdate`

---

### `PSB SCANMED`

| Property | Value |
|----------|-------|
| Tag | `SCANMED` |
| Routine | `PSBRPC2` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Takes the scanned valued from the medication and does a lookup on file  50 for an exact match.  If more than one or less than one entry are  found for the lookup an error is returned to the client.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SCANVAL | LITERAL | No |
| 2 | PSBDIEN | LITERAL | No |
| 3 | PSBTAB | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-scanmed`

---

### `PSB PARAMETER`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBPAR` |
| Return Type | ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** Called by client to return or set parameters

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBCMD | LITERAL | No |
| 2 | PSBENT | LITERAL | No |
| 3 | PSBPAR | LITERAL | No |
| 4 | PSBINS | LITERAL | No |
| 5 | PSBVAL | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-parameter`

---

### `PSB TRANSACTION`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBML` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This is the filing RPC for all data returning from the client regarding the medication log.  Filing is handled by business rules on the server and this RPC will return either '1^Data Filed' or '-1^reason for not filing data' to the client.  Results of the  processed transaction is communicated via t

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBHDR | LITERAL | No |
| 2 | PSBREC | REFERENCE | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-transaction`

---

### `PSB VALIDATE ORDER`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `PSBVDLVL` |
| Return Type | ARRAY |
| Parameter Count | 11 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | PSBIEN | LITERAL | No |
| 3 | PSBTYPE | LITERAL | No |
| 4 | PSBADMIN | LITERAL | No |
| 5 | PSBTAB | LITERAL | No |
| 6 | PSBUID | LITERAL | No |
| 7 | PSBASTS | LITERAL | No |
| 8 | PSBORSTS | LITERAL | No |
| 9 | PSBRMV | UNKNOWN() | No |
| 10 | psbdien | UNKNOWN() | No |
| 11 | PSBRMVTM | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-validate-order`

---

### `PSB SERVER CLOCK VARIANCE`

| Property | Value |
|----------|-------|
| Tag | `CLOCK` |
| Routine | `PSBUTL` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Client date/time in external FileMan format. Returns the variance from the server to the client in minutes.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBX | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-server-clock-variance`

---

### `PSB MEDICATION HISTORY`

| Property | Value |
|----------|-------|
| Tag | `HISTORY` |
| Routine | `PSBMLHS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the history of a medication for a patient from the orderable item.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | PSBOI | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-medication-history`

---

### `PSB GETPRNS`

| Property | Value |
|----------|-------|
| Tag | `GETPRNS` |
| Routine | `PSBPRN` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns all administrations of a PRN order that have NOT had the PRN Effectiveness documented in the current admission or within the hours  defined in PRN documentation site parameter whichever is greater of the  two.  When the PRN medication is administered a flag is set based on the  given PRN Rea

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | PSBORD | LITERAL | No |
| 3 | PSBSIOPI | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-getprns`

---

### `PSB REPORT`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBO` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 26 |
| Status | Inactive (may still be callable) |

**Description:** Return the text for the specified report and the user has the option to  print the reports.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBTYPE | LITERAL | No |
| 2 | PSBDFN | LITERAL | No |
| 3 | PSBSTRT | LITERAL | No |
| 4 | PSBSTOP | LITERAL | No |
| 5 | PSBINCL | LITERAL | No |
| 6 | PSBDEV | LITERAL | No |
| 7 | PSBSORT | LITERAL | No |
| 8 | PSBOI | LITERAL | No |
| 9 | PSBWLOC | LITERAL | No |
| 10 | PSBWSORT | LITERAL | No |
| 11 | PSBFUT | LITERAL | No |
| 12 | PSBORDNUM | LITERAL | No |
| 13 | PSBLIST | REFERENCE | No |
| 14 | PSBRCRI | LITERAL | No |
| 15 | PSBORDNM | UNKNOWN() | No |
| 16 | PSBPST | LITERAL | No |
| 17 | PSBTR | LITERAL | No |
| 18 | PSBSIFIL | LITERAL | No |
| 19 | PSBCLINORD | LITERAL | No |
| 20 | PSB20 | LITERAL | No |
| 21 | PSB21 | LITERAL | No |
| 22 | PSB22 | LITERAL | No |
| 23 | PSB23 | LITERAL | No |
| 24 | PSB24 | LITERAL | No |
| 25 | PSBCLLIST | REFERENCE | No |
| 26 | PSBDIV | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-report`

---

### `PSB SUBMIT MISSING DOSE`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBMD` |
| Return Type | ARRAY |
| Parameter Count | 11 |
| Status | Inactive (may still be callable) |

**Description:** Allows the client to submit a missing dose interactively.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBDFN | LITERAL | No |
| 2 | PSBDRUG | LITERAL | No |
| 3 | PSBDOSE | LITERAL | No |
| 4 | PSBRSN | LITERAL | No |
| 5 | PSBADMIN | LITERAL | No |
| 6 | PSBNEED | LITERAL | No |
| 7 | PSBUID | LITERAL | No |
| 8 | PSBON | LITERAL | No |
| 9 | PSBSCHD | LITERAL | No |
| 10 | PSBCLIN | LITERAL | No |
| 11 | PSBCLNIEN | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-submit-missing-dose`

---

### `PSB VALIDATE ESIG`

| Property | Value |
|----------|-------|
| Tag | `ESIG` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Validate the data in PSBESIG against the user currently signed on (DUZ)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBESIG | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-validate-esig`

---

### `PSB LOCK`

| Property | Value |
|----------|-------|
| Tag | `LOCK` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** LOCKING NO LONGER USED AS OF PATCH 7.  INCLUDED FOR BACKWARD COMPATABILITY WITH GUI.  CALL WILL BE REMOVED IN PATCH 8.

**API Endpoint:** `POST /vista/psb/rpc/psb-lock`

---

### `PSB CHECK SERVER`

| Property | Value |
|----------|-------|
| Tag | `CHECK` |
| Routine | `PSBUTL` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Returns -1 or 1 when checking for patches and build on the server.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBWHAT | REFERENCE | No |
| 2 | PSBDATA | REFERENCE | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-check-server`

---

### `PSB MAIL`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBRPCXM` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** A call is made that allows the GUI to send its' own formatted mail message.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBCMD | LITERAL | No |
| 2 | PSBDATA | WORD-PROCESSING | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-mail`

---

### `PSB GETORDERTAB`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBVDLTB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** Gives the client VDL information for the specified patient and time frame.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | VDL TAB | LITERAL | No |
| 3 | VDL DATE | LITERAL | No |
| 4 | PSBSIOPI | LITERAL | No |
| 5 | PSBCLINORD | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-getordertab`

---

### `PSB WARDLIST`

| Property | Value |
|----------|-------|
| Tag | `WLIST` |
| Routine | `PSBPARIV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of active wards that are available for the definition of IV parameters in the BCMA IV PARAMETERS file 53.66. Wards already in file 53.66 are returned with the type of IV PARAMETERS defined.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBEDIV | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-wardlist`

---

### `PSB GETIVPAR`

| Property | Value |
|----------|-------|
| Tag | `GETPAR` |
| Routine | `PSBPARIV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns the IV parameters by IV type, as defined for a ward in file 53.66.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBWARD | LITERAL | No |
| 2 | PSBIVPT | LITERAL | No |
| 3 | PSBDIV | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-getivpar`

---

### `PSB DEVICE`

| Property | Value |
|----------|-------|
| Tag | `DEVICE` |
| Routine | `PSBRPC1` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Allows user to select a Printer from the GUI.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FROM | LITERAL | No |
| 2 | DIR | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-device`

---

### `PSB PUTIVPAR`

| Property | Value |
|----------|-------|
| Tag | `PUTPAR` |
| Routine | `PSBPARIV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Sets 53.66 or parameters file w/input from 53.66 if ward is not "ALL"

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBWARD | LITERAL | No |
| 2 | PSBPARS | LITERAL | No |
| 3 | PSBDIV | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-putivpar`

---

### `PSB IV ORDER HISTORY`

| Property | Value |
|----------|-------|
| Tag | `GETOHIST` |
| Routine | `PSBRPC2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns individual detailed bag history.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | PSBORD | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-iv-order-history`

---

### `PSB BAG DETAIL`

| Property | Value |
|----------|-------|
| Tag | `BAGDTL` |
| Routine | `PSBRPC2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a chronological detailed history on each specific IV bag that is selected.     [0] = -1^No History On File                [0] = Number of Nodes [1] = Action Date/Time^User ID^Action Status^Comments

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBUID | LITERAL | No |
| 2 | PSBORD | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-bag-detail`

---

### `PSB ALLERGY`

| Property | Value |
|----------|-------|
| Tag | `ALLR` |
| Routine | `PSBALL` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of allergies for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 |  PATIENT ID | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-allergy`

---

### `PSB GETPROVIDER`

| Property | Value |
|----------|-------|
| Tag | `PROVLST` |
| Routine | `PSBRPCMO` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Used to get a list of active providers.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBIN | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-getprovider`

---

### `PSB MOB DRUG LIST`

| Property | Value |
|----------|-------|
| Tag | `OILST` |
| Routine | `PSBRPCMO` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Used by the BCMA/CPRS Med Order Button to return an array of drug.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBSCAN | LITERAL | No |
| 2 | PSBOTYP | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-mob-drug-list`

---

### `PSB CPRS ORDER`

| Property | Value |
|----------|-------|
| Tag | `ORDER` |
| Routine | `PSBRPCMO` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC sets results of a Med Order Button transaction in a global for  Inpatient Pharmacy to pick up.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBHDR | LITERAL | No |
| 2 | PSBREC | REFERENCE | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-cprs-order`

---

### `PSB NURS WARDLIST`

| Property | Value |
|----------|-------|
| Tag | `NWLIST` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This will return a list of active ward from the NURS LOCATION, file 211.4.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | none | UNKNOWN() | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-nurs-wardlist`

---

### `PSB MAXDAYS`

| Property | Value |
|----------|-------|
| Tag | `MAX` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the maximum number of days a user can view or print the  MAH report. This parameter is set using CPRS and is call ORRP BCMA MAH.

**API Endpoint:** `GET /vista/psb/rpc/psb-maxdays`

---

### `PSB VERSION CHECK`

| Property | Value |
|----------|-------|
| Tag | `GUICHK` |
| Routine | `PSBRPC3` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is called at startup. No parameters are passed.

**API Endpoint:** `GET /vista/psb/rpc/psb-version-check`

---

### `PSB CHECK IV`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBCHKIV` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** RPC PSB CHECK IV - When given a patient's data file number(DFN), this  process will return infusing IV information pertaining to the given  DFN.  The information will be returned at the location presented by the "RESULTS" parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | ORDIV | REFERENCE | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-check-iv`

---

### `PSB VITALS`

| Property | Value |
|----------|-------|
| Tag | `VITALS` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Passes array of Vital entries - Temp,Pulse,Resp,BP,Pain in the last 7 days

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-vitals`

---

### `PSB VITAL MEAS FILE`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBVITFL` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This RPC has been built specifically to process the filing of BCMA  Pain Score data. The processing of other VITAL type may be incorporated  with some adjustments.       This routine is to service BCMA 3.0 functionality and store VITALs'   data into the VITAL MEASUREMENT FILE - ^GMR(120.5  using the

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBDFN | LITERAL | No |
| 2 | PSBRATE | LITERAL | No |
| 3 | PSBVTYPE | LITERAL | No |
| 4 | PSBDTTKN | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-vital-meas-file`

---

### `PSB MED LOG LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBMLLKU` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** BCMA Medication Log Look Up Remote Procedures.   This routine is a conglomerate of  Medication Log lookup functionality per the BCMA Graphical User Interface software.   Input:  PSBREC (array)         PSBREC (0)     determine  "lookup" function                        "PTLKUP" (patient file (#2) look

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBREC | REFERENCE | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-med-log-lookup`

---

### `PSB COVERSHEET1`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBCSUTL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** (modified 05/08/2007)   PSB COVERSHEET1 is to return order data per patient and construction of  BCMA Coversheet view as presented by the BCMA-HSC Coversheet Phase II SRS and SDD documentation.   INPUT:  communications area -  ""          patient's DFN       -  DFN     (patient ptr.)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | HRSBACK | LITERAL | No |
| 3 | PSBSIOPI | LITERAL | No |
| 4 | PSBCLINORD | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-coversheet1`

---

### `PSB UTL XSTATUS SRCH`

| Property | Value |
|----------|-------|
| Tag | `FNDACTV` |
| Routine | `PSBVDLU3` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** RESULTS(0)=returned line count RESULTS(1)=patients location during activity RESULTS(2)=medication^ordernumber RESULTS(3)= action fileman date&time RESULTS(4)= scheduled administration fileman date&time

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMS | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-utl-xstatus-srch`

---

### `PSB MAN SCAN FAILURE`

| Property | Value |
|----------|-------|
| Tag | `SCANFAIL` |
| Routine | `PSBVDLU3` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** SCANFAIL(RESULTS,PSBPARAM)      ;  TEJ 05/12/2006  BCMA-Managing Scanning Failures (MSF)         ;       Process Scanning Failures         ;               Parameters:         ;               Input (via GUI):         ;        Per Wristband  (0)      -       Pat IEN ^ ^ Failure Reason ^ User's Comment

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-man-scan-failure`

---

### `PSB GETINJECTIONSITE`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBINJEC` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Get the last nn injections site info from the BCMA MEDICATION LOG file  #53.9.   Get only of specific Orderable Items per patient in reverse chronology date/time order or All Orderable Items per patient in  reverse chronology date/time order.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | TIME | LITERAL | No |
| 3 | MAX | LITERAL | No |
| 4 | PSBOI | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-getinjectionsite`

---

### `PSB WITNESS`

| Property | Value |
|----------|-------|
| Tag | `WITNESS` |
| Routine | `PSBRPC1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Used by frmWintess to validate if a Witness at the client is authorized  to be a witness for a BCMA action, i.e. High Risk Drug administration.   Validation is achieved via not allowing the logged in person to witness  for themselves, also persons that hold certain keys can't be a valid  witness.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBACC | LITERAL | No |
| 2 | PSBVER | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-witness`

---

### `PSB CLINICLIST`

| Property | Value |
|----------|-------|
| Tag | `GETLIST` |
| Routine | `PSBRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns Active Clinic names based on Search criteria.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PREFIX | LITERAL | No |
| 2 | CONTAINS | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-cliniclist`

---

### `PSB MEDS ON PATIENT`

| Property | Value |
|----------|-------|
| Tag | `MEDSONPT` |
| Routine | `PSBRPC1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns indicators if medications are still on a patient.  The  patient's DFN will be passed in and a RESULTS array returned with three  flags set.  Flags set to 1 for meds are on patient or 0 none per this category.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-meds-on-patient`

---

### `PSB GETSETWP`

| Property | Value |
|----------|-------|
| Tag | `MDRPC` |
| Routine | `PSBPAR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows the GUI to add and update body site locations graphically  by sending the coordinates of the loction on the body and storing these using word processing free form text type field.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTION | LITERAL | No |

**API Endpoint:** `GET /vista/psb/rpc/psb-getsetwp`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| NDCUPN: | PSOERXA0 DRGMTCH | NDCUPN | LITERAL | rpc |
| DGDESC: | PSOERXA0 DRGMTCH | DGDESC | LITERAL | rpc |
| NPI: | PSOERXA0 PRVMTCH | NPI | LITERAL | rpc |
| DEA: | PSOERXA0 PRVMTCH | DEA | LITERAL | rpc |
| CSUB: | PSOERXA0 PRVMTCH | CSUB | LITERAL | rpc |
| XML: | PSOERXA1 INCERX | XML | LITERAL | rpc |
| PRCHK: | PSOERXA1 INCERX | PRCHK | REFERENCE | rpc |
| PACHK: | PSOERXA1 INCERX | PACHK | REFERENCE | rpc |
| DACHK: | PSOERXA1 INCERX | DACHK | REFERENCE | rpc |
| STATION: | PSOERXA1 INCERX | STATION | LITERAL | rpc |
| DIV: | PSOERXA1 INCERX | DIV | LITERAL | rpc |
| ERXHID: | PSOERXA1 INCERX | ERXHID | LITERAL | rpc |
| ERXVALS: | PSOERXA1 INCERX | ERXVALS | REFERENCE | rpc |
| XML2: | PSOERXA1 INCERX | XML2 | LITERAL | rpc |
| SOURCE: | PSOERXA1 INCERX | SOURCE | LITERAL | rpc |
| XML: | PSOERXI1 INCERX | XML | LITERAL | rpc |
| PRCHK: | PSOERXI1 INCERX | PRCHK | REFERENCE | rpc |
| PACHK: | PSOERXI1 INCERX | PACHK | REFERENCE | rpc |
| DACHK: | PSOERXI1 INCERX | DACHK | REFERENCE | rpc |
| STATION: | PSOERXI1 INCERX | STATION | LITERAL | rpc |
| DIV: | PSOERXI1 INCERX | DIV | LITERAL | rpc |
| ERXHID: | PSOERXI1 INCERX | ERXHID | LITERAL | rpc |
| ERXVALS: | PSOERXI1 INCERX | ERXVALS | REFERENCE | rpc |
| XML2: | PSOERXI1 INCERX | XML2 | LITERAL | rpc |
| XML3: | PSOERXI1 INCERX | XML3 | LITERAL | rpc |
| DFN: | PSO VCC REFILL | DFN | LITERAL | rpc |
| RXN: | PSO VCC REFILL | RXN | LITERAL | rpc |
| USER: | PSO VCC REFILL | USER | LITERAL | rpc |
| REFILL SOURCE: | PSO VCC REFILL | REFILL SOURCE | LITERAL | rpc |
| RETURN FLAG: | PSO VCC REFILL | RETURN FLAG | LITERAL | rpc |
| OPTION: | PSORPC | OPTION | LITERAL | rpc |
| DATA: | PSO EPCS EDIT | DATA | REFERENCE | rpc |
| DATA: | PSO EPCS ADD DEA | DATA | LITERAL | rpc |
| NPIEN: | PSO EPCS ADD DEA | NPIEN | LITERAL | rpc |
| Provider DEA#: | PSO EPCS DEADOJ | Provider DEA# | LITERAL | rpc |
| NPIEN: | PSO EPCS REMOVE DEA | NPIEN | LITERAL | rpc |
| DEATXT: | PSO EPCS REMOVE DEA | DEATXT | LITERAL | rpc |
| DEATXT: | PSO EPCS DEA DUP CHECK | DEATXT | LITERAL | rpc |
| SUFFIX: | PSO EPCS DEA DUP CHECK | SUFFIX | LITERAL | rpc |
| NPIEN: | PSO EPCS DEALIST | NPIEN | LITERAL | rpc |
| EPCSARY: | PSO EPCS VERSION | EPCSARY | LITERAL | rpc |
| DEA NUMBER: | PSO EPCS DETOX CHECK | DEA NUMBER | LITERAL | rpc |
| DETOX NUMBER: | PSO EPCS DETOX CHECK | DETOX NUMBER | LITERAL | rpc |
| VANUM: | PSO EPCS VA# DUP CHECK | VANUM | LITERAL | rpc |
| NPIEN: | PSO EPCS VA# DUP CHECK | NPIEN | LITERAL | rpc |
| FIELD: | PSO EPCS FILER | FIELD | LITERAL | rpc |
| DATA: | PSO EPCS FILER | DATA | LITERAL | rpc |
| NPIEN: | PSO EPCS FILER | NPIEN | LITERAL | rpc |
| EPCSARY: | PSO EPCS REPORTS | EPCSARY | REFERENCE | rpc |
| EPCSARY: | PSO EPCS SYSTEM DATE TIME | EPCSARY | LITERAL | rpc |
| EPCSARY: | PSO EPCS FIELD HELP | EPCSARY | LITERAL | rpc |
| EPCSARY: | PSO EPCS GET LIST | EPCSARY | LITERAL | rpc |
| NPIEN: | PSO EPCS LIST NP SCHED | NPIEN | LITERAL | rpc |
| NPIEN: | PSO EPCS FILE NP SCHED | NPIEN | LITERAL | rpc |
| DATA: | PSO EPCS FILE NP SCHED | DATA | LITERAL | rpc |
| OPTNM: | PSO EPCS LIST OPTN DESC | OPTNM | LITERAL | rpc |
| EPCSARY: | PSO EPCS TOPIC HELP | EPCSARY | LITERAL | rpc |
| IEN: | PSO ACTIVITY LOG | IEN | LITERAL | rpc |
| PSOIEN: | PSO COPAY LOG | PSOIEN | LITERAL | rpc |
| PIEN: | PSO ECME LOG | PIEN | LITERAL | rpc |
| PIEN: | PSO ERX LOG | PIEN | LITERAL | rpc |
| PIEN: | PSO LABEL LOG | PIEN | LITERAL | rpc |
| PIEN: | PSO LOT EXPIRATION | PIEN | LITERAL | rpc |
| PIEN: | PSO PARTIALS LOG | PIEN | LITERAL | rpc |
| PIEN: | PSO REFILL LOG | PIEN | LITERAL | rpc |
| DUZ: | PSO EPCS CRED | DUZ | LITERAL | rpc |
| PSOSUBJ: | PSO EPCS PSDRPH FILER | PSOSUBJ | LITERAL | rpc |
| PSOACTOR: | PSO EPCS PSDRPH FILER | PSOACTOR | LITERAL | rpc |
| PSOACTION: | PSO EPCS PSDRPH FILER | PSOACTION | LITERAL | rpc |
| PSOVICN: | PSO ADDRESS UPDATE | PSOVICN | LITERAL | rpc |
| PSOVADDR: | PSO ADDRESS UPDATE | PSOVADDR | REFERENCE | rpc |
| PSOVTYP: | PSO ADDRESS UPDATE | PSOVTYP | LITERAL | rpc |
| PSOVATYP: | PSO ADDRESS UPDATE | PSOVATYP | UNKNOWN() | rpc |
| PSOVATYP: | PSO GET ADDRESS | PSOVATYP | LITERAL | rpc |
| PSOVICN: | PSO GET ADDRESS | PSOVICN | LITERAL | rpc |
| PSOVICN: | PSO TEMP ADDRESS ACTIVE FLAG | PSOVICN | LITERAL | rpc |
| PSOVSTA: | PSO TEMP ADDRESS ACTIVE FLAG | PSOVSTA | LITERAL | rpc |
| PSOVSTRT: | PSO TEMP ADDRESS ACTIVE FLAG | PSOVSTRT | LITERAL | rpc |
| PSOVEND: | PSO TEMP ADDRESS ACTIVE FLAG | PSOVEND | LITERAL | rpc |
| PSOVICN: | PSO DEL TEMPORARY ADDRESS | PSOVICN | LITERAL | rpc |
| PSBDATA: | PSB SCANPT | PSBDATA | LITERAL | rpc |
| PSBACC: | PSB INSTRUCTOR | PSBACC | LITERAL | rpc |
| PSBVER: | PSB INSTRUCTOR | PSBVER | UNKNOWN() | rpc |
| PSBWIN: | PSB USERSAVE | PSBWIN | LITERAL | rpc |
| PSBVDL: | PSB USERSAVE | PSBVDL | LITERAL | rpc |
| PSBUDCW : | PSB USERSAVE | PSBUDCW  | LITERAL | rpc |
| PSBPBCW: | PSB USERSAVE | PSBPBCW | LITERAL | rpc |
| PSBIVCW: | PSB USERSAVE | PSBIVCW | LITERAL | rpc |
| PSBDEV: | PSB USERSAVE | PSBDEV | LITERAL | rpc |
| PSBCSRT: | PSB USERSAVE | PSBCSRT | LITERAL | rpc |
| PSBCV1: | PSB USERSAVE | PSBCV1 | LITERAL | rpc |
| PSBCV2: | PSB USERSAVE | PSBCV2 | LITERAL | rpc |
| PSBCV3: | PSB USERSAVE | PSBCV3 | LITERAL | rpc |
| PSBCV4: | PSB USERSAVE | PSBCV4 | LITERAL | rpc |
| PSBORMODE: | PSB USERSAVE | PSBORMODE | LITERAL | rpc |
| PSBCLSRCH: | PSB USERSAVE | PSBCLSRCH | LITERAL | rpc |
| PSBVAL: | PSB FMDATE | PSBVAL | LITERAL | rpc |
| SCANVAL: | PSB SCANMED | SCANVAL | LITERAL | rpc |
| PSBDIEN: | PSB SCANMED | PSBDIEN | LITERAL | rpc |
| PSBTAB: | PSB SCANMED | PSBTAB | LITERAL | rpc |
| PSBCMD: | PSB PARAMETER | PSBCMD | LITERAL | rpc |
| PSBENT: | PSB PARAMETER | PSBENT | LITERAL | rpc |
| PSBPAR: | PSB PARAMETER | PSBPAR | LITERAL | rpc |
| PSBINS: | PSB PARAMETER | PSBINS | LITERAL | rpc |
| PSBVAL: | PSB PARAMETER | PSBVAL | LITERAL | rpc |
| PSBHDR: | PSB TRANSACTION | PSBHDR | LITERAL | rpc |
| PSBREC: | PSB TRANSACTION | PSBREC | REFERENCE | rpc |
| DFN: | PSB VALIDATE ORDER | DFN | LITERAL | rpc |
| PSBIEN: | PSB VALIDATE ORDER | PSBIEN | LITERAL | rpc |
| PSBTYPE: | PSB VALIDATE ORDER | PSBTYPE | LITERAL | rpc |
| PSBADMIN: | PSB VALIDATE ORDER | PSBADMIN | LITERAL | rpc |
| PSBTAB: | PSB VALIDATE ORDER | PSBTAB | LITERAL | rpc |
| PSBUID: | PSB VALIDATE ORDER | PSBUID | LITERAL | rpc |
| PSBASTS: | PSB VALIDATE ORDER | PSBASTS | LITERAL | rpc |
| PSBORSTS: | PSB VALIDATE ORDER | PSBORSTS | LITERAL | rpc |
| PSBRMV: | PSB VALIDATE ORDER | PSBRMV | UNKNOWN() | rpc |
| psbdien: | PSB VALIDATE ORDER | psbdien | UNKNOWN() | rpc |
| PSBRMVTM: | PSB VALIDATE ORDER | PSBRMVTM | LITERAL | rpc |
| PSBX: | PSB SERVER CLOCK VARIANCE | PSBX | LITERAL | rpc |
| DFN: | PSB MEDICATION HISTORY | DFN | LITERAL | rpc |
| PSBOI: | PSB MEDICATION HISTORY | PSBOI | LITERAL | rpc |
| DFN: | PSB GETPRNS | DFN | LITERAL | rpc |
| PSBORD: | PSB GETPRNS | PSBORD | LITERAL | rpc |
| PSBSIOPI: | PSB GETPRNS | PSBSIOPI | LITERAL | rpc |
| PSBTYPE: | PSB REPORT | PSBTYPE | LITERAL | rpc |
| PSBDFN: | PSB REPORT | PSBDFN | LITERAL | rpc |
| PSBSTRT: | PSB REPORT | PSBSTRT | LITERAL | rpc |
| PSBSTOP: | PSB REPORT | PSBSTOP | LITERAL | rpc |
| PSBINCL: | PSB REPORT | PSBINCL | LITERAL | rpc |
| PSBDEV: | PSB REPORT | PSBDEV | LITERAL | rpc |
| PSBSORT: | PSB REPORT | PSBSORT | LITERAL | rpc |
| PSBOI: | PSB REPORT | PSBOI | LITERAL | rpc |
| PSBWLOC: | PSB REPORT | PSBWLOC | LITERAL | rpc |
| PSBWSORT: | PSB REPORT | PSBWSORT | LITERAL | rpc |
| PSBFUT: | PSB REPORT | PSBFUT | LITERAL | rpc |
| PSBORDNUM: | PSB REPORT | PSBORDNUM | LITERAL | rpc |
| PSBLIST: | PSB REPORT | PSBLIST | REFERENCE | rpc |
| PSBRCRI: | PSB REPORT | PSBRCRI | LITERAL | rpc |
| PSBORDNM: | PSB REPORT | PSBORDNM | UNKNOWN() | rpc |
| PSBPST: | PSB REPORT | PSBPST | LITERAL | rpc |
| PSBTR: | PSB REPORT | PSBTR | LITERAL | rpc |
| PSBSIFIL: | PSB REPORT | PSBSIFIL | LITERAL | rpc |
| PSBCLINORD: | PSB REPORT | PSBCLINORD | LITERAL | rpc |
| PSB20: | PSB REPORT | PSB20 | LITERAL | rpc |
| PSB21: | PSB REPORT | PSB21 | LITERAL | rpc |
| PSB22: | PSB REPORT | PSB22 | LITERAL | rpc |
| PSB23: | PSB REPORT | PSB23 | LITERAL | rpc |
| PSB24: | PSB REPORT | PSB24 | LITERAL | rpc |
| PSBCLLIST: | PSB REPORT | PSBCLLIST | REFERENCE | rpc |
| PSBDIV: | PSB REPORT | PSBDIV | LITERAL | rpc |
| PSBDFN: | PSB SUBMIT MISSING DOSE | PSBDFN | LITERAL | rpc |
| PSBDRUG: | PSB SUBMIT MISSING DOSE | PSBDRUG | LITERAL | rpc |
| PSBDOSE: | PSB SUBMIT MISSING DOSE | PSBDOSE | LITERAL | rpc |
| PSBRSN: | PSB SUBMIT MISSING DOSE | PSBRSN | LITERAL | rpc |
| PSBADMIN: | PSB SUBMIT MISSING DOSE | PSBADMIN | LITERAL | rpc |
| PSBNEED: | PSB SUBMIT MISSING DOSE | PSBNEED | LITERAL | rpc |
| PSBUID: | PSB SUBMIT MISSING DOSE | PSBUID | LITERAL | rpc |
| PSBON: | PSB SUBMIT MISSING DOSE | PSBON | LITERAL | rpc |
| PSBSCHD: | PSB SUBMIT MISSING DOSE | PSBSCHD | LITERAL | rpc |
| PSBCLIN: | PSB SUBMIT MISSING DOSE | PSBCLIN | LITERAL | rpc |
| PSBCLNIEN: | PSB SUBMIT MISSING DOSE | PSBCLNIEN | LITERAL | rpc |
| PSBESIG: | PSB VALIDATE ESIG | PSBESIG | LITERAL | rpc |
| PSBWHAT: | PSB CHECK SERVER | PSBWHAT | REFERENCE | rpc |
| PSBDATA: | PSB CHECK SERVER | PSBDATA | REFERENCE | rpc |
| PSBCMD: | PSB MAIL | PSBCMD | LITERAL | rpc |
| PSBDATA: | PSB MAIL | PSBDATA | WORD-PROCESSING | rpc |
| DFN: | PSB GETORDERTAB | DFN | LITERAL | rpc |
| VDL TAB: | PSB GETORDERTAB | VDL TAB | LITERAL | rpc |
| VDL DATE: | PSB GETORDERTAB | VDL DATE | LITERAL | rpc |
| PSBSIOPI: | PSB GETORDERTAB | PSBSIOPI | LITERAL | rpc |
| PSBCLINORD: | PSB GETORDERTAB | PSBCLINORD | LITERAL | rpc |
| PSBEDIV: | PSB WARDLIST | PSBEDIV | LITERAL | rpc |
| PSBWARD: | PSB GETIVPAR | PSBWARD | LITERAL | rpc |
| PSBIVPT: | PSB GETIVPAR | PSBIVPT | LITERAL | rpc |
| PSBDIV: | PSB GETIVPAR | PSBDIV | LITERAL | rpc |
| FROM: | PSB DEVICE | FROM | LITERAL | rpc |
| DIR: | PSB DEVICE | DIR | LITERAL | rpc |
| PSBWARD: | PSB PUTIVPAR | PSBWARD | LITERAL | rpc |
| PSBPARS: | PSB PUTIVPAR | PSBPARS | LITERAL | rpc |
| PSBDIV: | PSB PUTIVPAR | PSBDIV | LITERAL | rpc |
| DFN: | PSB IV ORDER HISTORY | DFN | LITERAL | rpc |
| PSBORD: | PSB IV ORDER HISTORY | PSBORD | LITERAL | rpc |
| PSBUID: | PSB BAG DETAIL | PSBUID | LITERAL | rpc |
| PSBORD: | PSB BAG DETAIL | PSBORD | LITERAL | rpc |
|  PATIENT ID: | PSB ALLERGY |  PATIENT ID | LITERAL | rpc |
| PSBIN: | PSB GETPROVIDER | PSBIN | LITERAL | rpc |
| PSBSCAN: | PSB MOB DRUG LIST | PSBSCAN | LITERAL | rpc |
| PSBOTYP: | PSB MOB DRUG LIST | PSBOTYP | LITERAL | rpc |
| PSBHDR: | PSB CPRS ORDER | PSBHDR | LITERAL | rpc |
| PSBREC: | PSB CPRS ORDER | PSBREC | REFERENCE | rpc |
| none: | PSB NURS WARDLIST | none | UNKNOWN() | rpc |
| DFN: | PSB CHECK IV | DFN | LITERAL | rpc |
| ORDIV: | PSB CHECK IV | ORDIV | REFERENCE | rpc |
| DFN: | PSB VITALS | DFN | LITERAL | rpc |
| PSBDFN: | PSB VITAL MEAS FILE | PSBDFN | LITERAL | rpc |
| PSBRATE: | PSB VITAL MEAS FILE | PSBRATE | LITERAL | rpc |
| PSBVTYPE: | PSB VITAL MEAS FILE | PSBVTYPE | LITERAL | rpc |
| PSBDTTKN: | PSB VITAL MEAS FILE | PSBDTTKN | LITERAL | rpc |
| PSBREC: | PSB MED LOG LOOKUP | PSBREC | REFERENCE | rpc |
| DFN: | PSB COVERSHEET1 | DFN | LITERAL | rpc |
| HRSBACK: | PSB COVERSHEET1 | HRSBACK | LITERAL | rpc |
| PSBSIOPI: | PSB COVERSHEET1 | PSBSIOPI | LITERAL | rpc |
| PSBCLINORD: | PSB COVERSHEET1 | PSBCLINORD | LITERAL | rpc |
| PARAMS: | PSB UTL XSTATUS SRCH | PARAMS | LITERAL | rpc |
| PSBPARAM: | PSB MAN SCAN FAILURE | PSBPARAM | REFERENCE | rpc |
| DFN: | PSB GETINJECTIONSITE | DFN | LITERAL | rpc |
| TIME: | PSB GETINJECTIONSITE | TIME | LITERAL | rpc |
| MAX: | PSB GETINJECTIONSITE | MAX | LITERAL | rpc |
| PSBOI: | PSB GETINJECTIONSITE | PSBOI | LITERAL | rpc |
| PSBACC: | PSB WITNESS | PSBACC | LITERAL | rpc |
| PSBVER: | PSB WITNESS | PSBVER | LITERAL | rpc |
| PREFIX: | PSB CLINICLIST | PREFIX | LITERAL | rpc |
| CONTAINS: | PSB CLINICLIST | CONTAINS | LITERAL | rpc |
| DFN: | PSB MEDS ON PATIENT | DFN | LITERAL | rpc |
| OPTION: | PSB GETSETWP | OPTION | LITERAL | rpc |
| AIP: | PSN FDA MED GUIDE PRINT QUEUE | AIP | LITERAL | rpc |
| TMP: | PSA UPLOAD | TMP | REFERENCE | rpc |

## Menu Options

### Broker

| Name | Security Key |
|------|-------------|
| PSB GUI CONTEXT - USER | — |

### Menu

| Name | Security Key |
|------|-------------|
| PSB USER | — |
| PSB MGR | PSB MANAGER |
| PSB NURSE | — |
| PSB PHARMACY | — |
| PSB BCBU WRKSTN MAIN | — |
| PSB BCBU MANAGEMENT MENU | PSB BUMGR |
| PSB BCBU VISTA MAIN | PSB BUMGR |

### Run routine

| Name | Security Key |
|------|-------------|
| PSB MISSING DOSE FOLLOWUP | — |
| PSB DRUG INQUIRY | — |
| PSB MED LOG PRN EFFECT | — |
| PSB MED LOG NEW ENTRY | — |
| PSB USER PARAM RESET | — |
| PSB MED LOG TROUBLE SHOOTER | — |
| PSB SAGG MONTHLY REPORT | — |
| PSB PRN DOCUMENTING | — |
| PSB BCBU LINK ASSOCIATIONS | — |
| PSB BCBU WARD LIST | — |
| PSB BCBU PRINT MAR ALL | — |
| PSB BCBU PRINT MAR WARD | — |
| PSB BCBU PRINT MAR PATIENT | — |
| PSB BCBU SHOW PATIENT | — |
| PSB BCBU SHOW WARD | — |
| PSB BCBU ERROR LOG | — |
| PSB BCBU USER INIT | — |
| PSB BCBU INIT WRKSTN DFT | — |
| PSB BCBU INIT WRKSTN DIV | — |
| PSB BCBU INIT SINGLE PT | — |
| PSB BCBU PRINT BLK MAR | — |
| PSB BCBU WRKSTN PURGE ORDERS | — |
| PSB PX BCMA2PCE TASK | — |
| PSB BCBU PRINT MAR ALL CLINICS | — |
| PSB BCBU PRINT MAR CLINIC | — |
| PSB DRUG IEN CHECK | — |
| PSB RPT RESP THERAPY MEDS | — |

### Action

| Name | Security Key |
|------|-------------|
| PSB BCBU PMU MESSAGE BUILDER | — |
| PSB TOOL MENU ITEMS | — |

### Other(C)

| Name | Security Key |
|------|-------------|
| PSB BCBU WRKSTN PARAMETER EDIT | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `PSB MANAGER`
- `PSB BUMGR`

## API Route Summary

All routes are prefixed with `/vista/psb/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/psb/rpc/psb-scanpt` | PSB SCANPT | ARRAY |
| GET | `/vista/psb/rpc/psb-instructor` | PSB INSTRUCTOR | ARRAY |
| GET | `/vista/psb/rpc/psb-userload` | PSB USERLOAD | ARRAY |
| GET | `/vista/psb/rpc/psb-usersave` | PSB USERSAVE | ARRAY |
| GET | `/vista/psb/rpc/psb-fmdate` | PSB FMDATE | ARRAY |
| GET | `/vista/psb/rpc/psb-scanmed` | PSB SCANMED | ARRAY |
| GET | `/vista/psb/rpc/psb-parameter` | PSB PARAMETER | ARRAY |
| GET | `/vista/psb/rpc/psb-transaction` | PSB TRANSACTION | ARRAY |
| GET | `/vista/psb/rpc/psb-validate-order` | PSB VALIDATE ORDER | ARRAY |
| GET | `/vista/psb/rpc/psb-server-clock-variance` | PSB SERVER CLOCK VARIANCE | ARRAY |
| GET | `/vista/psb/rpc/psb-medication-history` | PSB MEDICATION HISTORY | GLOBAL ARRAY |
| GET | `/vista/psb/rpc/psb-getprns` | PSB GETPRNS | GLOBAL ARRAY |
| GET | `/vista/psb/rpc/psb-report` | PSB REPORT | GLOBAL ARRAY |
| GET | `/vista/psb/rpc/psb-submit-missing-dose` | PSB SUBMIT MISSING DOSE | ARRAY |
| GET | `/vista/psb/rpc/psb-validate-esig` | PSB VALIDATE ESIG | ARRAY |
| POST | `/vista/psb/rpc/psb-lock` | PSB LOCK | ARRAY |
| GET | `/vista/psb/rpc/psb-check-server` | PSB CHECK SERVER | ARRAY |
| GET | `/vista/psb/rpc/psb-mail` | PSB MAIL | GLOBAL ARRAY |
| GET | `/vista/psb/rpc/psb-getordertab` | PSB GETORDERTAB | GLOBAL ARRAY |
| GET | `/vista/psb/rpc/psb-wardlist` | PSB WARDLIST | GLOBAL ARRAY |
| GET | `/vista/psb/rpc/psb-getivpar` | PSB GETIVPAR | GLOBAL ARRAY |
| GET | `/vista/psb/rpc/psb-device` | PSB DEVICE | ARRAY |
| GET | `/vista/psb/rpc/psb-putivpar` | PSB PUTIVPAR | GLOBAL ARRAY |
| GET | `/vista/psb/rpc/psb-iv-order-history` | PSB IV ORDER HISTORY | GLOBAL ARRAY |
| GET | `/vista/psb/rpc/psb-bag-detail` | PSB BAG DETAIL | ARRAY |
| GET | `/vista/psb/rpc/psb-allergy` | PSB ALLERGY | ARRAY |
| GET | `/vista/psb/rpc/psb-getprovider` | PSB GETPROVIDER | ARRAY |
| GET | `/vista/psb/rpc/psb-mob-drug-list` | PSB MOB DRUG LIST | ARRAY |
| GET | `/vista/psb/rpc/psb-cprs-order` | PSB CPRS ORDER | ARRAY |
| GET | `/vista/psb/rpc/psb-nurs-wardlist` | PSB NURS WARDLIST | ARRAY |
| GET | `/vista/psb/rpc/psb-maxdays` | PSB MAXDAYS | ARRAY |
| GET | `/vista/psb/rpc/psb-version-check` | PSB VERSION CHECK | ARRAY |
| GET | `/vista/psb/rpc/psb-check-iv` | PSB CHECK IV | ARRAY |
| GET | `/vista/psb/rpc/psb-vitals` | PSB VITALS | ARRAY |
| GET | `/vista/psb/rpc/psb-vital-meas-file` | PSB VITAL MEAS FILE | ARRAY |
| GET | `/vista/psb/rpc/psb-med-log-lookup` | PSB MED LOG LOOKUP | ARRAY |
| GET | `/vista/psb/rpc/psb-coversheet1` | PSB COVERSHEET1 | GLOBAL ARRAY |
| GET | `/vista/psb/rpc/psb-utl-xstatus-srch` | PSB UTL XSTATUS SRCH | ARRAY |
| GET | `/vista/psb/rpc/psb-man-scan-failure` | PSB MAN SCAN FAILURE | ARRAY |
| GET | `/vista/psb/rpc/psb-getinjectionsite` | PSB GETINJECTIONSITE | ARRAY |
| GET | `/vista/psb/rpc/psb-witness` | PSB WITNESS | ARRAY |
| GET | `/vista/psb/rpc/psb-cliniclist` | PSB CLINICLIST | GLOBAL ARRAY |
| GET | `/vista/psb/rpc/psb-meds-on-patient` | PSB MEDS ON PATIENT | ARRAY |
| GET | `/vista/psb/rpc/psb-getsetwp` | PSB GETSETWP | GLOBAL ARRAY |
