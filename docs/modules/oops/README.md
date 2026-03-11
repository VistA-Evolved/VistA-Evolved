# Asists (OOPS)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `OOPS` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 65 |
| Menu Options | 10 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `OOPS REMOTE GET USER OPTIONS`

| Property | Value |
|----------|-------|
| Tag | `OPT` |
| Routine | `OOPSGUI1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This call returns what ASISTS GUI menu options the user has assigned to them.

**API Endpoint:** `GET /vista/oops/rpc/oops-remote-get-user-options`

---

### `OOPS GET POINTED TO`

| Property | Value |
|----------|-------|
| Tag | `GETLIST` |
| Routine | `OOPSGUI3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** The broker call passes the file and field number back to the variable FLD on the M side.  The M code will return the code (pointer) and the description for set of codes or table files to be used in lookups.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | single | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-pointed-to`

---

### `OOPS GET BODY PART`

| Property | Value |
|----------|-------|
| Tag | `BODY` |
| Routine | `OOPSGUI3` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Call this to return a list of body parts from file ^OOPS(2261.1 that do not have a numeric value in the code field.

**API Endpoint:** `GET /vista/oops/rpc/oops-get-body-part`

---

### `OOPS GET CASE NUMBERS`

| Property | Value |
|----------|-------|
| Tag | `GETCASE` |
| Routine | `OOPSGUI0` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** This call returns a list of cases that match the search criteria and are  eligible for editing.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PERSON | LITERAL | No |
| 2 | CSTAT | LITERAL | No |
| 3 | PSTAT | LITERAL | No |
| 4 | CALL | LITERAL | No |
| 5 | OPT | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-case-numbers`

---

### `OOPS GET DUPLICATES`

| Property | Value |
|----------|-------|
| Tag | `DUP` |
| Routine | `OOPSGUI4` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This broker call returns the Case Number, Type of Incident and Date/Time of  any Open Case that matches the social Security Number that was entered in the Create Accident/Illness Report Option.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-duplicates`

---

### `OOPS LOAD OOPS`

| Property | Value |
|----------|-------|
| Tag | `LOAD` |
| Routine | `OOPSGUI4` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This broker call files data entered in the Create Accident/Illness Report Option.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LIST | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-load-oops`

---

### `OOPS EMPLOYEE DATA`

| Property | Value |
|----------|-------|
| Tag | `PAID` |
| Routine | `OOPSGUI4` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This call returns a listing of individuals in the PAID file #450 that match the Name or partial name entered.  It returns PAID fields 6, 10, 13, 16, 31, 32, 38, 186.1, 186.3, 186, 186.4, 458, 604.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NAME | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-employee-data`

---

### `OOPS NEW PERSON DATA`

| Property | Value |
|----------|-------|
| Tag | `PER` |
| Routine | `OOPSGUI4` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This call returns the name of new person, sex, DOB, and SSN of the individual whose name is passed in the input parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NAME | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-new-person-data`

---

### `OOPS GET 2260 DATA`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `OOPSGUI2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This broker call will return data from ASISTS file 2260.  The fields (in the array) returned will vary depending on the input parameter. One field of the input parameter is FORM. If the claim is for a 2162, all the  fields associated with "2162" nodes along with zero nodes will be returned. If the f

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | PERS | UNKNOWN() | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-2260-data`

---

### `OOPS REPLACE DATE/TIME`

| Property | Value |
|----------|-------|
| Tag | `DTFC` |
| Routine | `OOPSGUI8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This call assures the date and/or time is a valid and reformats it.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATE | LITERAL | No |
| 2 | FLAG | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-replace-date/time`

---

### `OOPS GET CKRANGE`

| Property | Value |
|----------|-------|
| Tag | `GETSCHED` |
| Routine | `OOPSGUI3` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This broker call is used to return an array which holds the integer values  stored in the field included in the input parameter. Currently in ASISTS, the  fields that are evaluated/returned via this broker are: 140 Regular Work Schedule for CA1 244 Regular Work Schedule for CA2

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-ckrange`

---

### `OOPS GET WITNESSES`

| Property | Value |
|----------|-------|
| Tag | `WITR` |
| Routine | `OOPSGUI2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This broker call with take and IEN as input and retrieve witness information and associated comments from the ASISTS 2260 file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-witnesses`

---

### `OOPS GET DEFAULT MD`

| Property | Value |
|----------|-------|
| Tag | `DEFMD` |
| Routine | `OOPSGUI2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This call will return the Default Medical Doctor information based on an IEN in the ASISTS 2260 file being passed in. The information returned is from the file 2262.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-default-md`

---

### `OOPS GET SUPERVISOR`

| Property | Value |
|----------|-------|
| Tag | `SUPER` |
| Routine | `OOPSGUI4` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** This call looks up the Supervisor from the new person file.  The IEN of the claim is passed in to make sure that the person involved is not the supervisor.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NAME | LITERAL | No |
| 2 | CASESSN | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-supervisor`

---

### `OOPS CREATE AMENDMENT`

| Property | Value |
|----------|-------|
| Tag | `AMEND` |
| Routine | `OOPSGUI8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Files an Amendment for the selected case in ASISTS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SING | LITERAL | No |

**API Endpoint:** `POST /vista/oops/rpc/oops-create-amendment`

---

### `OOPS EDIT 2260`

| Property | Value |
|----------|-------|
| Tag | `EDIT` |
| Routine | `OOPSGUI5` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This broker call passes in ASISTS data and files it in the ASISTS Accident Reporting File (#2260).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | ARR | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-edit-2260`

---

### `OOPS CHANGE CASE STATUS`

| Property | Value |
|----------|-------|
| Tag | `CHGCASE` |
| Routine | `OOPSGUI6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This broker call passes in the ASISTS IEN, new case status and if the case status is deleted the reason for deletion.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | FLD58 | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-change-case-status`

---

### `OOPS REPLACE WP`

| Property | Value |
|----------|-------|
| Tag | `REPLWP` |
| Routine | `OOPSGUI2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This call will replace Word Processing fields based on input paramters indicating the file, field and IEN of the record that will be changed. Another input parameter contains the data via a list or pointer that will be placed into the "new" word processing fields.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-replace-wp`

---

### `OOPS VALIDATE TIME`

| Property | Value |
|----------|-------|
| Tag | `DTVALID` |
| Routine | `OOPSGUI2` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This broker call will compare two dates (which are part of the input) based  on the 3rd input paramater which is a flag indicating which type of compare  should be done.  The RESULTS output indicates whether the dates pass (VALID DATE) or fail (DATE ERROR) the compare.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IDT | LITERAL | No |
| 2 | PDT | LITERAL | No |
| 3 | FLAG | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-validate-time`

---

### `OOPS GET DATA`

| Property | Value |
|----------|-------|
| Tag | `GETDATA` |
| Routine | `OOPSGUI3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This broker call returns the data in the ASISTS Accident Reporting File (#2260) for fields that are 1) Set of Codes, 2) Set of Codes Multiple, 3) Pointer to a file, and 4) Pointer to a file multiple.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-data`

---

### `OOPS GET UNION`

| Property | Value |
|----------|-------|
| Tag | `UNIGET` |
| Routine | `OOPSGUI6` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This call retrieves a listing of all Unions.

**API Endpoint:** `GET /vista/oops/rpc/oops-get-union`

---

### `OOPS DELETE UNION`

| Property | Value |
|----------|-------|
| Tag | `UNIKILL` |
| Routine | `OOPSGUI6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This broker call will delete an entry in the Union File (#2263.7).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |

**API Endpoint:** `POST /vista/oops/rpc/oops-delete-union`

---

### `OOPS PUT UNION`

| Property | Value |
|----------|-------|
| Tag | `UNIEDT` |
| Routine | `OOPSGUI6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This call will either file a new Union record if there is no internal record number passed back or it will edit an existing union record if the internal  record number is present and passed back.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-put-union`

---

### `OOPS GET SITE PARAMETER`

| Property | Value |
|----------|-------|
| Tag | `SITEPGET` |
| Routine | `OOPSGUI6` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This broker call returns the Site Parameter Name, IEN and the DOL District Office and is used to obtain the entries in the Station multiple.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FORM | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-site-parameter`

---

### `OOPS SET FIELD`

| Property | Value |
|----------|-------|
| Tag | `SETFIELD` |
| Routine | `OOPSGUI2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This broker call will set a single field in file 2260.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | VALUE | LITERAL | No |

**API Endpoint:** `POST /vista/oops/rpc/oops-set-field`

---

### `OOPS DELETE SITEP STATION`

| Property | Value |
|----------|-------|
| Tag | `N/A` |
| Routine | `N/A` |
| Return Type | UNKNOWN() |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/oops/rpc/oops-delete-sitep-station`

---

### `OOPS DELETE SITEPAR STATION`

| Property | Value |
|----------|-------|
| Tag | `SITEPKIL` |
| Routine | `OOPSGUI6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This broker call deletes the Station Subfile for the IEN passed into it.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |

**API Endpoint:** `POST /vista/oops/rpc/oops-delete-sitepar-station`

---

### `OOPS EDIT SITEPAR STATION`

| Property | Value |
|----------|-------|
| Tag | `SITEPEDT` |
| Routine | `OOPSGUI6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** This broker call will either add a new Station subfile to the Site parameter file or will allow for editing an existing Station subfile.  If the Station IEN is passed in the INPUT parameter, the record will be edited.  If a Station IEN is not passed in the input parameter, a new record will be creat

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | DATA | LITERAL | No |
| 3 | FORM | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-edit-sitepar-station`

---

### `OOPS DELETE WITNESS`

| Property | Value |
|----------|-------|
| Tag | `DELWITN` |
| Routine | `OOPSGUI2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This broker call will delete witness information from the "CA1W" node in  file 2260 based on the IEN and sub file id passed in.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | OOPS CHANGE CAS | UNKNOWN() | No |

**API Endpoint:** `POST /vista/oops/rpc/oops-delete-witness`

---

### `OOPS WITNESS CREATE`

| Property | Value |
|----------|-------|
| Tag | `ADDWITN` |
| Routine | `OOPSGUI2` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This broker call will add a new Witness record for a case in the ASISTS  Accident Reporting File (#2260).  It is called by the CA1 form in Delphi.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | INFO | LITERAL | No |
| 3 | CMNT | UNKNOWN() | No |
| 4 | COMMENT | LITERAL | No |

**API Endpoint:** `POST /vista/oops/rpc/oops-witness-create`

---

### `OOPS WITNESS EDIT`

| Property | Value |
|----------|-------|
| Tag | `EDTWITN` |
| Routine | `OOPSGUI2` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This broker call files any changes entered on an existing Witness.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | INFO | LITERAL | No |
| 3 | CMNT | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-witness-edit`

---

### `OOPS WITNESS DELETE`

| Property | Value |
|----------|-------|
| Tag | `DELWITN` |
| Routine | `OOPSGUI2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** The broker call will remove witness information (stored in node "CA1W") from the 2260 file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |

**API Endpoint:** `POST /vista/oops/rpc/oops-witness-delete`

---

### `OOPS EDIT SITE PARAMETER`

| Property | Value |
|----------|-------|
| Tag | `PARMEDT` |
| Routine | `OOPSGUI6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This broker call files changes to the Site Parameter File (#2262) name and  District Office, if made.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-edit-site-parameter`

---

### `OOPS APPROVE SIGN FOR EMPLOYEE`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `OOPSGUI8` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This broker call will determine whether the individual can approve the Workers' Comp person being able to sign for the employee if accessed from the Safety or Employee Health menus.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |

**API Endpoint:** `POST /vista/oops/rpc/oops-approve-sign-for-employee`

---

### `OOPS VALIDATE AND SIGN`

| Property | Value |
|----------|-------|
| Tag | `SETSIGN` |
| Routine | `OOPSGUI1` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** This broker call handles the validation of data prior to a user entering their  electronic signature code.  It also validates the electronic signature code  and then assures that the users electronic signature code, the date/time of  signature, and the users DUZ is filed in the Vista database.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | SIGN | LITERAL | No |

**API Endpoint:** `POST /vista/oops/rpc/oops-validate-and-sign`

---

### `OOPS REPLACE MULTIPLE`

| Property | Value |
|----------|-------|
| Tag | `REPLMULT` |
| Routine | `OOPSGUI3` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** This procedure is for updating entries in a multiple, in 2 stages. Stage 1 deletes all current entries, step 2 creates new entries  using data passed back from the GUI form.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SINGLE | LITERAL | No |
| 2 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-replace-multiple`

---

### `OOPS UNION CONSENT`

| Property | Value |
|----------|-------|
| Tag | `CONSENT` |
| Routine | `OOPSGUI7` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This broker call will send the Bulletin to the union representative selected. Note: a ASISTS legacy routine is called from this broker call to send the bulletin.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | UNIREP | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-union-consent`

---

### `OOPS GET STATION INFORMATION`

| Property | Value |
|----------|-------|
| Tag | `STATINFO` |
| Routine | `OOPSGUI3` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This broker call returns the Address, City, State and Zip code for a station stored in DIC(4 Institution file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STATIEN | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-station-information`

---

### `OOPS MANUAL XMIT DATA`

| Property | Value |
|----------|-------|
| Tag | `ENT` |
| Routine | `OOPSGUI7` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This broker call is the front end for calling the routine to transmit data to the AAC for DOL (CA1 and CA2s) or to transmit data to the National  Database (NDB).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-manual-xmit-data`

---

### `OOPS INCIDENT REPORT`

| Property | Value |
|----------|-------|
| Tag | `ENT` |
| Routine | `OOPSGUIT` |
| Return Type | ARRAY |
| Parameter Count | 6 |

**Description:** This broker call returns the data for creating the Type of Incident reports. This report provides information on different Types of incidents.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RPTTYP | LITERAL | No |
| 2 | CSTAT | LITERAL | No |
| 3 | STDT | LITERAL | No |
| 4 | ENDDT | LITERAL | No |
| 5 | LTNTT | LITERAL | No |
| 6 | STAT | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-incident-report`

---

### `OOPS WCEDIT`

| Property | Value |
|----------|-------|
| Tag | `OWCPCLR` |
| Routine | `OOPSGUI7` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** This call clears the Supervisor signature and related fields if the Workers Compensation specialist has edited fields INJURED PERFORMING DUTY (#146), NOT INJURED PERFORMING JOB (#147), INJURY CAUSED BY EMPLOYEE (#148), CAUSED BY EMPLOYEE EXPLAIN (#149), SUPERVISOR NOT AGREE EXPLAN (#164), or  REASON

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | CALLER | LITERAL | No |
| 3 | FORM | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-wcedit`

---

### `OOPS GET OSHA DATA`

| Property | Value |
|----------|-------|
| Tag | `OSHA` |
| Routine | `OOPSGUIF` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** This broker call returns the data needed to produce the Log of Federal  Occupational Injuries and Illnesses Report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | CALL | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-osha-data`

---

### `OOPS GET PRT ACC STATUS RPT`

| Property | Value |
|----------|-------|
| Tag | `ACCID` |
| Routine | `OOPSGUIT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** This broker call retrieves the data required to generate the PRINT ACCIDENT REPORT STATUS Report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | CALL | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-prt-acc-status-rpt`

---

### `OOPS CLEAR SIGNATURE`

| Property | Value |
|----------|-------|
| Tag | `CSIGN` |
| Routine | `OOPSGUI8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** This broker call clears the signature from the ASISTS case for Form and  discipline (calling menu).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | FORM | LITERAL | No |
| 3 | CALL | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-clear-signature`

---

### `OOPS NEEDLESTICK LOG`

| Property | Value |
|----------|-------|
| Tag | `NSTICK` |
| Routine | `OOPSGUIF` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** This broker call retrieves the data necessary to produce the Log of Needlestick report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | CALL | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-needlestick-log`

---

### `OOPS GET NOI CODE`

| Property | Value |
|----------|-------|
| Tag | `GETNOI` |
| Routine | `OOPSGUI8` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This broker call returns the listing of NOI codes.  If the claim is a CA1 then only codes begining with T are returned, if the claim is a CA2 only codes that do not begin with a T are returned.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPT | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-noi-code`

---

### `OOPS SET RECORD LOCK`

| Property | Value |
|----------|-------|
| Tag | `SETLCK` |
| Routine | `OOPSGUI3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This broker call attempt to lock the record and if not successful, returns a  message indicating that the record is in use by another user.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `POST /vista/oops/rpc/oops-set-record-lock`

---

### `OOPS RELEASE RECORD LOCK`

| Property | Value |
|----------|-------|
| Tag | `CLRLCK` |
| Routine | `OOPSGUI3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This broker call will release the previously locked ASISTS record.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `POST /vista/oops/rpc/oops-release-record-lock`

---

### `OOPS GET ASISTS CASE`

| Property | Value |
|----------|-------|
| Tag | `ASISTS` |
| Routine | `OOPSGUI4` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This broker call completes a lookup on the ASISTS Accident Reporting file and returns a list of valid ASISTS cases for selection.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NAME | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-asists-case`

---

### `OOPS CHECK PAID EMP DATA`

| Property | Value |
|----------|-------|
| Tag | `VALEMP` |
| Routine | `OOPSGUI1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This broker call checks to make sure that if the PERSONNEL STATUS (field #2) is an employee and the Pay Plan is equal to "OT" that the Grade (#16), Step (#17), and Retirement (#60) fields contain valid responses.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | INPUT | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-check-paid-emp-data`

---

### `OOPS GET SINGLE FIELD`

| Property | Value |
|----------|-------|
| Tag | `GETFLD` |
| Routine | `OOPSGUI7` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This broker call will return a single data element from the file and field  that is passed in as a parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | FLD | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-single-field`

---

### `OOPS GET INSTITUTIONS`

| Property | Value |
|----------|-------|
| Tag | `GETINST` |
| Routine | `OOPSGUI7` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This broker call will retrieve all the stations from the INSTITUTION (#4) file.

**API Endpoint:** `GET /vista/oops/rpc/oops-get-institutions`

---

### `OOPS SENSITIVE DATA`

| Property | Value |
|----------|-------|
| Tag | `SENSDATA` |
| Routine | `OOPSGUI7` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This Broker call is used to pass data to the bulletin routine for supervisors accessing sensitive data and not creating an ASISTS case.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDUZ | LITERAL | No |
| 2 | EMP | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-sensitive-data`

---

### `OOPS GET MISC REPORT DATA`

| Property | Value |
|----------|-------|
| Tag | `ENT` |
| Routine | `OOPSGUIR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** This broker call will return data to generate reports on the Delphi Client side.  It is a generic call that needs the start date, end date, station number (or A for all stations), and the report call or name.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | REPORT | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-misc-report-data`

---

### `OOPS GET FAC SHORT LIST`

| Property | Value |
|----------|-------|
| Tag | `STA` |
| Routine | `OOPSGUIS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-fac-short-list`

---

### `OOPS SELECT CA7`

| Property | Value |
|----------|-------|
| Tag | `CA7LIST` |
| Routine | `OOPSGUIC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** This broker call returns a list of valid Request for Compensation claims (CA-7) for the employee or Workers' Comp Specialist.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PERSON | LITERAL | No |
| 2 | CALL | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-select-ca7`

---

### `OOPS LIST CAS`

| Property | Value |
|----------|-------|
| Tag | `LISTCA` |
| Routine | `OOPSGUIC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This broker call returns a listing of all the valid CA's (either 1 or 2) that can be selected by this user to create a new Request for Compensation (CA-7) claim.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-list-cas`

---

### `OOPS MULTIPLE DATA`

| Property | Value |
|----------|-------|
| Tag | `MULTIPLE` |
| Routine | `OOPSGUIC` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** This broker call will be used to both get and set data stored in a sub-record or multiple.  When saving (setting) data, the entire subrecord is deleted then re-filed.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-multiple-data`

---

### `OOPS SET DUAL BENEFITS DATA`

| Property | Value |
|----------|-------|
| Tag | `DUAL` |
| Routine | `OOPSGUID` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This broker call files data in the DUAL Node of the ASISTS Accident Reporting File (#2260).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | DATA | LITERAL | No |

**API Endpoint:** `POST /vista/oops/rpc/oops-set-dual-benefits-data`

---

### `OOPS SIGN CA7`

| Property | Value |
|----------|-------|
| Tag | `SIGNCA7` |
| Routine | `OOPSGUIS` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This broker call accepts an encrypted electronic signature, validates the  entry and files the signature fields in the ASISTS COMPENSATION CLAIM (CA7)  File (#2264).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |
| 2 | SIGN | LITERAL | No |

**API Endpoint:** `POST /vista/oops/rpc/oops-sign-ca7`

---

### `OOPS SIGNATURE VALIDATION`

| Property | Value |
|----------|-------|
| Tag | `DECODE` |
| Routine | `OOPSGUIS` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** This broker call will return the SIGNATURE BLOCK PRINTED NAME from the New Person File (#200) if the validation logic for signing the case passes.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | CALL | LITERAL | No |
| 3 | FORM | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-signature-validation`

---

### `OOPS ZIP CODE MISMATCH CHECK`

| Property | Value |
|----------|-------|
| Tag | `ZIPCHK` |
| Routine | `OOPSGUI8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This broker call will take the Zip Code and State Name and validate that the Zip Code exists and is valid for the State.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-zip-code-mismatch-check`

---

### `OOPS SET OSHA300A`

| Property | Value |
|----------|-------|
| Tag | `OSHA300` |
| Routine | `OOPSGUIC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STA | LITERAL | No |
| 2 | DATA | REFERENCE | No |

**API Endpoint:** `POST /vista/oops/rpc/oops-set-osha300a`

---

### `OOPS GET DETAIL LOCATION`

| Property | Value |
|----------|-------|
| Tag | `GETDLOC` |
| Routine | `OOPSGUIS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This broker call returns the entries in the Detail Location sub file in the ASISTS SETTING OF INJURY File (#2261.4).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |

**API Endpoint:** `GET /vista/oops/rpc/oops-get-detail-location`

---

### `OOPS SET DETAIL LOCATION`

| Property | Value |
|----------|-------|
| Tag | `SETDLOC` |
| Routine | `OOPSGUI8` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** This broker call files sub record level data in the Detail Location sub record in the ASISTS SETTING OF INJURY File (#2261.4).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARM1 | LITERAL | No |
| 2 | DATA | REFERENCE | No |

**API Endpoint:** `POST /vista/oops/rpc/oops-set-detail-location`

---


## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| OOPS SCHEDULED XMIT 2162 DATA | — |
| OOPS MANUAL 2162 DATA XMIT | — |
| OOPS DOL SCHEDULED XMIT DATA | — |
| OOPS DOL MANUAL XMIT DATA | OOPS DOL XMIT DATA |

### Broker

| Name | Security Key |
|------|-------------|
| OOPS GUI EMPLOYEE | — |
| OOPS GUI SUPERVISOR MENU | — |
| OOPS GUI SAFETY OFFICER MENU | — |
| OOPS GUI UNION MENU | — |
| OOPS GUI EMPLOYEE HEALTH MENU | — |
| OOPS GUI WORKERS' COMP MENU | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `OOPS DOL XMIT DATA`

## API Route Summary

All routes are prefixed with `/vista/oops/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/oops/rpc/oops-remote-get-user-options` | OOPS REMOTE GET USER OPTIONS | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-get-pointed-to` | OOPS GET POINTED TO | ARRAY |
| GET | `/vista/oops/rpc/oops-get-body-part` | OOPS GET BODY PART | ARRAY |
| GET | `/vista/oops/rpc/oops-get-case-numbers` | OOPS GET CASE NUMBERS | GLOBAL ARRAY |
| GET | `/vista/oops/rpc/oops-get-duplicates` | OOPS GET DUPLICATES | ARRAY |
| GET | `/vista/oops/rpc/oops-load-oops` | OOPS LOAD OOPS | ARRAY |
| GET | `/vista/oops/rpc/oops-employee-data` | OOPS EMPLOYEE DATA | ARRAY |
| GET | `/vista/oops/rpc/oops-new-person-data` | OOPS NEW PERSON DATA | ARRAY |
| GET | `/vista/oops/rpc/oops-get-2260-data` | OOPS GET 2260 DATA | ARRAY |
| GET | `/vista/oops/rpc/oops-replace-date/time` | OOPS REPLACE DATE/TIME | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-get-ckrange` | OOPS GET CKRANGE | ARRAY |
| GET | `/vista/oops/rpc/oops-get-witnesses` | OOPS GET WITNESSES | ARRAY |
| GET | `/vista/oops/rpc/oops-get-default-md` | OOPS GET DEFAULT MD | ARRAY |
| GET | `/vista/oops/rpc/oops-get-supervisor` | OOPS GET SUPERVISOR | ARRAY |
| POST | `/vista/oops/rpc/oops-create-amendment` | OOPS CREATE AMENDMENT | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-edit-2260` | OOPS EDIT 2260 | ARRAY |
| GET | `/vista/oops/rpc/oops-change-case-status` | OOPS CHANGE CASE STATUS | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-replace-wp` | OOPS REPLACE WP | ARRAY |
| GET | `/vista/oops/rpc/oops-validate-time` | OOPS VALIDATE TIME | ARRAY |
| GET | `/vista/oops/rpc/oops-get-data` | OOPS GET DATA | ARRAY |
| GET | `/vista/oops/rpc/oops-get-union` | OOPS GET UNION | ARRAY |
| POST | `/vista/oops/rpc/oops-delete-union` | OOPS DELETE UNION | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-put-union` | OOPS PUT UNION | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-get-site-parameter` | OOPS GET SITE PARAMETER | ARRAY |
| POST | `/vista/oops/rpc/oops-set-field` | OOPS SET FIELD | ARRAY |
| POST | `/vista/oops/rpc/oops-delete-sitep-station` | OOPS DELETE SITEP STATION | UNKNOWN() |
| POST | `/vista/oops/rpc/oops-delete-sitepar-station` | OOPS DELETE SITEPAR STATION | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-edit-sitepar-station` | OOPS EDIT SITEPAR STATION | SINGLE VALUE |
| POST | `/vista/oops/rpc/oops-delete-witness` | OOPS DELETE WITNESS | ARRAY |
| POST | `/vista/oops/rpc/oops-witness-create` | OOPS WITNESS CREATE | ARRAY |
| GET | `/vista/oops/rpc/oops-witness-edit` | OOPS WITNESS EDIT | ARRAY |
| POST | `/vista/oops/rpc/oops-witness-delete` | OOPS WITNESS DELETE | ARRAY |
| GET | `/vista/oops/rpc/oops-edit-site-parameter` | OOPS EDIT SITE PARAMETER | SINGLE VALUE |
| POST | `/vista/oops/rpc/oops-approve-sign-for-employee` | OOPS APPROVE SIGN FOR EMPLOYEE | ARRAY |
| POST | `/vista/oops/rpc/oops-validate-and-sign` | OOPS VALIDATE AND SIGN | ARRAY |
| GET | `/vista/oops/rpc/oops-replace-multiple` | OOPS REPLACE MULTIPLE | ARRAY |
| GET | `/vista/oops/rpc/oops-union-consent` | OOPS UNION CONSENT | ARRAY |
| GET | `/vista/oops/rpc/oops-get-station-information` | OOPS GET STATION INFORMATION | ARRAY |
| GET | `/vista/oops/rpc/oops-manual-xmit-data` | OOPS MANUAL XMIT DATA | ARRAY |
| GET | `/vista/oops/rpc/oops-incident-report` | OOPS INCIDENT REPORT | ARRAY |
| GET | `/vista/oops/rpc/oops-wcedit` | OOPS WCEDIT | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-get-osha-data` | OOPS GET OSHA DATA | GLOBAL ARRAY |
| GET | `/vista/oops/rpc/oops-get-prt-acc-status-rpt` | OOPS GET PRT ACC STATUS RPT | GLOBAL ARRAY |
| GET | `/vista/oops/rpc/oops-clear-signature` | OOPS CLEAR SIGNATURE | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-needlestick-log` | OOPS NEEDLESTICK LOG | GLOBAL ARRAY |
| GET | `/vista/oops/rpc/oops-get-noi-code` | OOPS GET NOI CODE | ARRAY |
| POST | `/vista/oops/rpc/oops-set-record-lock` | OOPS SET RECORD LOCK | SINGLE VALUE |
| POST | `/vista/oops/rpc/oops-release-record-lock` | OOPS RELEASE RECORD LOCK | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-get-asists-case` | OOPS GET ASISTS CASE | ARRAY |
| GET | `/vista/oops/rpc/oops-check-paid-emp-data` | OOPS CHECK PAID EMP DATA | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-get-single-field` | OOPS GET SINGLE FIELD | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-get-institutions` | OOPS GET INSTITUTIONS | GLOBAL ARRAY |
| GET | `/vista/oops/rpc/oops-sensitive-data` | OOPS SENSITIVE DATA | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-get-misc-report-data` | OOPS GET MISC REPORT DATA | GLOBAL ARRAY |
| GET | `/vista/oops/rpc/oops-get-fac-short-list` | OOPS GET FAC SHORT LIST | GLOBAL ARRAY |
| GET | `/vista/oops/rpc/oops-select-ca7` | OOPS SELECT CA7 | GLOBAL ARRAY |
| GET | `/vista/oops/rpc/oops-list-cas` | OOPS LIST CAS | GLOBAL ARRAY |
| GET | `/vista/oops/rpc/oops-multiple-data` | OOPS MULTIPLE DATA | ARRAY |
| POST | `/vista/oops/rpc/oops-set-dual-benefits-data` | OOPS SET DUAL BENEFITS DATA | SINGLE VALUE |
| POST | `/vista/oops/rpc/oops-sign-ca7` | OOPS SIGN CA7 | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-signature-validation` | OOPS SIGNATURE VALIDATION | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-zip-code-mismatch-check` | OOPS ZIP CODE MISMATCH CHECK | SINGLE VALUE |
| POST | `/vista/oops/rpc/oops-set-osha300a` | OOPS SET OSHA300A | SINGLE VALUE |
| GET | `/vista/oops/rpc/oops-get-detail-location` | OOPS GET DETAIL LOCATION | GLOBAL ARRAY |
| POST | `/vista/oops/rpc/oops-set-detail-location` | OOPS SET DETAIL LOCATION | ARRAY |
