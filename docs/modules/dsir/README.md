# Release Of Information - DSSI (DSIR)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `DSIR` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 134 |
| Menu Options | 2 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `DSIR GET STATUS CODES`

| Property | Value |
|----------|-------|
| Tag | `STCODES` |
| Routine | `DSIROI6` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ACTVONLY | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-status-codes`

---

### `DSIR GET PATIENT DISC HIST`

| Property | Value |
|----------|-------|
| Tag | `DISHISTR` |
| Routine | `DSIROIR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This routine returns the data nescessary for the patient disclosure  history report.     Required fields for this report:     From 19620      FIELD   From 19620.1    FIELD   ---------------------   ---------------------   RequestIEN        .01   DocumentCaption   .05   DateReceived    10.06   Docume

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PAT | LITERAL | No |
| 2 | FRDT | LITERAL | No |
| 3 | TODT | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-patient-disc-hist`

---

### `DSIR GET AOD`

| Property | Value |
|----------|-------|
| Tag | `ACCOFDIS` |
| Routine | `DSIROIR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This routine returns the data nescessary for the patient disclosure history report.     Required fields for this report:     From 19620      FIELD   From 19620.1    FIELD   ---------------------   ---------------------   Requestor Address .81   DocumentCaption   .05   Patient Address   .82   Documen

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | AODIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-aod`

---

### `DSIR GET CLERK REQUESTS`

| Property | Value |
|----------|-------|
| Tag | `GETTODAY` |
| Routine | `DSIROI` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** This RPC returns all open/pending requests for a given clerk.  This is  used to populate the today screen.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLERK | LITERAL | No |
| 2 | BILLING | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-clerk-requests`

---

### `DSIR DELIVERY TYPE SUMMARY RPT`

| Property | Value |
|----------|-------|
| Tag | `DELIVRY` |
| Routine | `DSIROIR2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This RPC returns an array for the Delivery Type Summary Report. The  optional date parameters work off of the date closed only.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDATE | LITERAL | No |
| 2 | EDATE | LITERAL | No |
| 3 | DIVL | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-delivery-type-summary-rpt`

---

### `DSIROI GETCMTS GET COMMENTS`

| Property | Value |
|----------|-------|
| Tag | `GETCMTS` |
| Routine | `DSIROI` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** This routine can return a set of comments including patient comments  from the 5345, internal comments, and alerts.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | SEL | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroi-getcmts-get-comments`

---

### `DSIROI1 QUEUELBL QUEUE A LABEL`

| Property | Value |
|----------|-------|
| Tag | `QUEUELBL` |
| Routine | `DSIROI1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** This routine adds a label to an individual clerk's queue for batch  printing.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CIEN | LITERAL | No |
| 2 | RIEN | LITERAL | No |
| 3 | AIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroi1-queuelbl-queue-a-label`

---

### `DSIROI1 PRINTLBL PRINT LABELS`

| Property | Value |
|----------|-------|
| Tag | `PRINTLBL` |
| Routine | `DSIROI1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This procedure returns a clerk's batch labels for printing.vels

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroi1-printlbl-print-labels`

---

### `DSIROI1 PURGELBL PURGE LABELS`

| Property | Value |
|----------|-------|
| Tag | `PURGELBL` |
| Routine | `DSIROI1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Purges all labels queued for a specific clerk.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroi1-purgelbl-purge-labels`

---

### `DSIROI1 DEL1LBL DELETE 1 LABEL`

| Property | Value |
|----------|-------|
| Tag | `DEL1LBL` |
| Routine | `DSIROI1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** This routine deletes one label from the label file (19620.14.)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CIEN | LITERAL | No |
| 2 | RIEN | LITERAL | No |
| 3 | AIEN | LITERAL | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsiroi1-del1lbl-delete-1-label`

---

### `DSIROIU LSTIN GET LAST INSTALL`

| Property | Value |
|----------|-------|
| Tag | `LSTIN` |
| Routine | `DSIROIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This RPC call returns the latest BUILD name installed in the DSIR  package.

**API Endpoint:** `GET /vista/dsir/rpc/dsiroiu-lstin-get-last-install`

---

### `DSIR REQUESTS BY DATE`

| Property | Value |
|----------|-------|
| Tag | `BYDATE` |
| Routine | `DSIROI3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This broker call returns a list of IEN's that fall between the two dates sent as parameters.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FROMDATE | LITERAL | No |
| 2 | TODATE | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-requests-by-date`

---

### `DSIR ADD DOCUMENT`

| Property | Value |
|----------|-------|
| Tag | `NEWITEM` |
| Routine | `DSIROI0` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to create an entry in file 19620.1 DSIR RELEASED DOCUMENT

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA ARRAY | REFERENCE | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-add-document`

---

### `DSIR GET DOCUMENTS`

| Property | Value |
|----------|-------|
| Tag | `GETITEMS` |
| Routine | `DSIROI2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Get a list of all documents for a request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REQUEST IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-documents`

---

### `DSIR CLEANUP`

| Property | Value |
|----------|-------|
| Tag | `CLEANUP` |
| Routine | `DSIROI2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC kills global nodes TMP("DSIROI",$J) and TMP("DSIRVAL",$J).

**API Endpoint:** `GET /vista/dsir/rpc/dsir-cleanup`

---

### `DSIR SET FOLLOWUP DATE`

| Property | Value |
|----------|-------|
| Tag | `FOLLOWUP` |
| Routine | `DSIROI2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-set-followup-date`

---

### `DSIR FOLLOWUP REQUIRED LIST`

| Property | Value |
|----------|-------|
| Tag | `GETFOLLW` |
| Routine | `DSIROI2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC finds any entries in file 19620 ROI INSTANCE that require a  follow up letter.

**API Endpoint:** `GET /vista/dsir/rpc/dsir-followup-required-list`

---

### `DSIR CHECK PREV REQ`

| Property | Value |
|----------|-------|
| Tag | `CHECKCUR` |
| Routine | `DSIROI3` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC checks for previous request for the current patient and  requestor. It then returns an array of entries in file 19620 ROI INSTANCE.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT | LITERAL | No |
| 2 | REQUESTOR | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-check-prev-req`

---

### `DSIR GET DOC DATES`

| Property | Value |
|----------|-------|
| Tag | `GETDATES` |
| Routine | `DSIROI3` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** RETURNS AN ARRAY OF DATES FOR USE IN SCREENING CLINICAL DOCUMENTS

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REQUEST IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-doc-dates`

---

### `DSIR SET DOC DATES`

| Property | Value |
|----------|-------|
| Tag | `SAVEDATE` |
| Routine | `DSIROI3` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** SAVES DATES FOR USE IN SCREENING CLINICAL DOCUMENTS FOR AN ROI REQUEST

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VEJDIFN | LITERAL | No |
| 2 | VEJDDATS | REFERENCE | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-set-doc-dates`

---

### `DSIR REQUESTS SINCE DATE`

| Property | Value |
|----------|-------|
| Tag | `GETPREVY` |
| Routine | `DSIROI2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VEJDDFN | LITERAL | No |
| 2 | VEJDDATE | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-requests-since-date`

---

### `DSIR GET ROUTINE VERSION`

| Property | Value |
|----------|-------|
| Tag | `GETVER` |
| Routine | `DSIROI2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This routine will return a major version level and patch level given a routine name where the routine header is in accepted SAC format.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VEJDRTN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-routine-version`

---

### `DSIR RPT BY REQUESTOR`

| Property | Value |
|----------|-------|
| Tag | `BYREQ` |
| Routine | `DSIROIR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** Retrieves ROI requests for a given date range for use in GUI reports.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FROM DATE | LITERAL | No |
| 2 | TO DATE | LITERAL | No |
| 3 | STATUS | LITERAL | No |
| 4 | CLERK(S) | REFERENCE | No |
| 5 | DIVISION(S) | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-rpt-by-requestor`

---

### `DSIR RPT REQUESTORS IN SYS`

| Property | Value |
|----------|-------|
| Tag | `REQINSYS` |
| Routine | `DSIROIR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-rpt-requestors-in-sys`

---

### `DSIR RPT REQUESTS BY TYPE`

| Property | Value |
|----------|-------|
| Tag | `REQTYP` |
| Routine | `DSIROIR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FROM DATE | LITERAL | No |
| 2 | TO DATE | LITERAL | No |
| 3 | STATUS | LITERAL | No |
| 4 | DIVISIONS | LITERAL | No |
| 5 | TYPES | REFERENCE | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-rpt-requests-by-type`

---

### `DSIR CLERKS LIST`

| Property | Value |
|----------|-------|
| Tag | `GETCLRKS` |
| Routine | `DSIROIR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** This RPC compiles a list of ROI clerks in file 19620 ROI INSTANCE.

**API Endpoint:** `GET /vista/dsir/rpc/dsir-clerks-list`

---

### `DSIR UPDATE ADDRESS`

| Property | Value |
|----------|-------|
| Tag | `UPDADDR` |
| Routine | `DSIROI6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** VEJD ROI UPDATE ADDRESS         Input Record Pieces '^' delimited: 1.      Address File Internal Number - Null to add new record 2.      Patient - Internal Number only (required) 3.      Street Address Line One - Text 35 character max (optional) 4.      Street Address Line Two - Text 35 character ma

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ADDRESS RECORD | LITERAL | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-update-address`

---

### `DSIR GET ADDRESSES`

| Property | Value |
|----------|-------|
| Tag | `GTADDLST` |
| Routine | `DSIROI6` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This RPC gets all address know by the RELEASE OF INFORMATION - DSSI for a  given patient or requestor.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT REQUESTOR | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-addresses`

---

### `DSIR UPDATE STATUS`

| Property | Value |
|----------|-------|
| Tag | `STATRPC` |
| Routine | `DSIROI6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** VEJD ROI UPDATE STATUS         Input parameter: 1.      Request Internal Number 2.      Status Internal Code   Return Value: 1.      -1 ^ Error Message 2.      Internal Number to Status History table

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ROI INSTANCE NUMBER | LITERAL | No |
| 2 | STATUS CODE | LITERAL | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-update-status`

---

### `DSIR CURRENT STATUS`

| Property | Value |
|----------|-------|
| Tag | `CSTRPC` |
| Routine | `DSIROI6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC gets the current status of a request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ROI INSTANCE NUMBER | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-current-status`

---

### `DSIR STATUS HISTORY`

| Property | Value |
|----------|-------|
| Tag | `STATHIST` |
| Routine | `DSIROI6` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REQUEST | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-status-history`

---

### `DSIR GET REASONS FOR REQUEST`

| Property | Value |
|----------|-------|
| Tag | `GETREAS` |
| Routine | `DSIROI6` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Retrieve entries from file 19620.31 DSIR REQUEST REASON.

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-reasons-for-request`

---

### `DSIR GET REQUEST TYPES`

| Property | Value |
|----------|-------|
| Tag | `GETTYPES` |
| Routine | `DSIROI6` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Retrieve entries from file 19620.61 DSIR TYPE OF REQUEST.

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-request-types`

---

### `DSIR GET REQUESTOR TYPES`

| Property | Value |
|----------|-------|
| Tag | `GETRQTYP` |
| Routine | `DSIROI6` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Retrieve entries from file 19620.71 DSIR REQUESTOR TYPE.

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-requestor-types`

---

### `DSIR GET AUTHORITY`

| Property | Value |
|----------|-------|
| Tag | `GETAUTH` |
| Routine | `DSIROI6` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This gets the entries from file 19620.51 DSIR AUTHORITY FOR REQUEST.

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-authority`

---

### `DSIR GET ROIS`

| Property | Value |
|----------|-------|
| Tag | `GETLIST` |
| Routine | `DSIROI` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This RPC is used to return an array of ROI INSTANCE (File 19620) entries.   GETLIST(AXY,TYPE,STAT,IEN)      ;RPC - DSIR GET ROIS Input: TYPE: Set of Codes:      "P"  : Get list by patient      "C"  : Get list by clerk      "O"  : Get all open or pending requests.             Defaults to all requests

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TYPE OF LIST | LITERAL | No |
| 2 | STATUS | LITERAL | No |
| 3 | PATIENT/CLERK ID | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-rois`

---

### `DSIR ADD/EDIT ROI`

| Property | Value |
|----------|-------|
| Tag | `UPDATE` |
| Routine | `DSIROI` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Create new or update existing ROI Instance File 19620.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA ARRAY | REFERENCE | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-add/edit-roi`

---

### `DSIR REFORMAT REPORTS`

| Property | Value |
|----------|-------|
| Tag | `FRMTRPT` |
| Routine | `DSIROIR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will take a given report array and resize the length to fit into  a smaller print area.  It takes into account header and footer lines and  resizes the main body of the report.  It may return more pages than the  input array.  Example: Report A is 60 lines with 3 lines of header and 2  line

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NEW REPORT LENGTH | LITERAL | No |
| 2 | HEADER COUNT | LITERAL | No |
| 3 | FOOTER COUNT | LITERAL | No |
| 4 | OLD LINE COUNT | LITERAL | No |
| 5 | INCOMING (OLD) REPORT | REFERENCE | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-reformat-reports`

---

### `DSIR STATUS ON DATE`

| Property | Value |
|----------|-------|
| Tag | `STATONDT` |
| Routine | `DSIROI6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the last status a request had on a given date.  That is  if a request is opened and then placed into a pending status on the same  day, the pending status will be returned for any date starting on that  date and ending on the next day the status was changed.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REQUEST | LITERAL | No |
| 2 | DATE | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-status-on-date`

---

### `DSIR GET DOCUMENT TYPES`

| Property | Value |
|----------|-------|
| Tag | `GETTYPE` |
| Routine | `DSIROI6` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Retrieve entries from file 19620.4 DSIR DOCUMENT TYPES

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-document-types`

---

### `DSIR DELETE REQUESTOR`

| Property | Value |
|----------|-------|
| Tag | `DUPRQTR` |
| Routine | `DSIROI1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC is used to delete orphan requestors or repoint and delete  duplicate requestors.   If the first parameter only is passed the routine will check to see that  the requestor is in fact not used then it will delete the requestor from  file 19620.12.   If both the first and second parameters are

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUPLICATE/ORPHAN | LITERAL | No |
| 2 | REPOINT TO | LITERAL | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-delete-requestor`

---

### `DSIR YEAR END FOIA REPORT`

| Property | Value |
|----------|-------|
| Tag | `FOIA` |
| Routine | `DSIROIR0` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |

**Description:** This RPC will collect the data for the year end FOIA report for VA Form 0712.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | START DATE | LITERAL | No |
| 2 | END DATE | LITERAL | No |
| 3 | DIV | LITERAL | No |
| 4 | QUICK | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-year-end-foia-report`

---

### `DSIR GET EXEMPTION 3 INFO`

| Property | Value |
|----------|-------|
| Tag | `GETEXMT` |
| Routine | `DSIROI1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This returns the values from fields 13.01 thru 13.1.   13.01 - 13.04 are Y/N values indicated by 1 or 0. 13.05 - 13.1 are free text upto 20 characters each.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ROI | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-exemption-3-info`

---

### `DSIR COMP ACCOUNTING SUMMARY`

| Property | Value |
|----------|-------|
| Tag | `CAS` |
| Routine | `DSIROIR1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This RPC returns a list of all internal entry numbers from file 19620 for  a specified patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT | LITERAL | No |
| 2 | START DATE | LITERAL | No |
| 3 | END DATE | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-comp-accounting-summary`

---

### `DSIR GET DIVISIONS`

| Property | Value |
|----------|-------|
| Tag | `GETDIVS` |
| Routine | `DSIROI1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return available Divisions for reporting.  Must be in the ADIV cross  reference on file 19620.

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-divisions`

---

### `DSIR TURNAROUND TIME REPORT`

| Property | Value |
|----------|-------|
| Tag | `TURN` |
| Routine | `DSIROIR1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This RPC will return a list of ROI Instance file IEN's and the Processing  time to either complete or to the end of the selected date range.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLERK | LITERAL | No |
| 2 | START DATE | LITERAL | No |
| 3 | END DATE | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-turnaround-time-report`

---

### `DSIR UPDATE BILL`

| Property | Value |
|----------|-------|
| Tag | `UPDBILL` |
| Routine | `DSIRBIL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** This RPC is used to create and edit the ROI Bill entries.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REQN | LITERAL | No |
| 2 | BILN | LITERAL | No |
| 3 | DATA | REFERENCE | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-update-bill`

---

### `DSIR PAYMENT`

| Property | Value |
|----------|-------|
| Tag | `PAYMENT` |
| Routine | `DSIRBIL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC is used to record payments on ROI bills

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BILN | LITERAL | No |
| 2 | AMNT | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-payment`

---

### `DSIR GET BILL INFO`

| Property | Value |
|----------|-------|
| Tag | `GETDATA` |
| Routine | `DSIRBIL` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC is used to get the bill info for an ROI request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DSIR | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-bill-info`

---

### `DSIR GET PAYMENT HISTORY`

| Property | Value |
|----------|-------|
| Tag | `GETHIST` |
| Routine | `DSIRBIL` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC is used to return the payment history records for an ROI bill.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BILN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-payment-history`

---

### `DSIR TOTAL CHARGES`

| Property | Value |
|----------|-------|
| Tag | `TOTCHGS` |
| Routine | `DSIRBILR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** This RPC is used to get the total charges entered for a time period.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STDT | LITERAL | No |
| 2 | ENDT | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-total-charges`

---

### `DSIR FEES RECEIVED`

| Property | Value |
|----------|-------|
| Tag | `FEEREC` |
| Routine | `DSIRBILR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** This RPC is used to return the fees paid during a period.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STDT | LITERAL | No |
| 2 | ENDT | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-fees-received`

---

### `DSIR FEES OUTSTANDING`

| Property | Value |
|----------|-------|
| Tag | `FEEOUTS` |
| Routine | `DSIRBILR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** This RPC is used to return the fees uncollected during a period.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STDT | LITERAL | No |
| 2 | ENDT | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-fees-outstanding`

---

### `DSIR GET BILL DOCS`

| Property | Value |
|----------|-------|
| Tag | `GETDOCS` |
| Routine | `DSIRBIL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This RPC is used to get a list of document types and internal number of  documents that were previously release under the type of patient/veteran.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-bill-docs`

---

### `DSIR FOIA VALIDATION`

| Property | Value |
|----------|-------|
| Tag | `FOIA` |
| Routine | `DSIROIRV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This RPC will return a global array of all records thkat were looked at  for the year end FOIA report.  It will contain the internal request  number and patient name/FOIA indicator, and a one for any block on the  report that the given request was included on.  It also contains all  record that, dur

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | START DATE | LITERAL | No |
| 2 | END DATE | LITERAL | No |
| 3 | DIVISION(S) | REFERENCE | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-foia-validation`

---

### `DSIR CLEANUP EXEMPTIONS`

| Property | Value |
|----------|-------|
| Tag | `FIXMPT` |
| Routine | `DSIROI1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** This RPC returna an array containing the internal numbers of any entry in  file 19620 that may have bogus data stored in the exemption fields. This  problem was corrected in the 5.2 version of the ROI package, this will  allow the ROI manager to review and correct the individual ROI requests.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | START DATE | LITERAL | No |
| 2 | END DATE | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-cleanup-exemptions`

---

### `DSIR CLEAR FOLLOWUP DATES`

| Property | Value |
|----------|-------|
| Tag | `CLEARFU` |
| Routine | `DSIROI1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This RPC will go through the ROI Instance file (19620) and set the  current date as the Followup Letter Date for any entry that doesn't have  one.

**API Endpoint:** `GET /vista/dsir/rpc/dsir-clear-followup-dates`

---

### `DSIR BILL HISTORY`

| Property | Value |
|----------|-------|
| Tag | `BILLHIST` |
| Routine | `DSIRBIL0` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This RPC returns all bill edit history for a given bill number.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BILL IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-bill-history`

---

### `DSIR BILL AUDIT HISTORY`

| Property | Value |
|----------|-------|
| Tag | `BILLHIST` |
| Routine | `DSIRBILR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Retrieve the audit history for a given bill.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BILL | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-bill-audit-history`

---

### `DSIR UPDATE INCLUDE ON BILL`

| Property | Value |
|----------|-------|
| Tag | `INCONBIL` |
| Routine | `DSIRBIL0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC will update the the field that indicates if a released document  is to be included on the bill.  The default is to include on bill.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | IND | LITERAL | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-update-include-on-bill`

---

### `DSIR COMB PAY AND AUD HIST`

| Property | Value |
|----------|-------|
| Tag | `PAYNAUD` |
| Routine | `DSIRBIL0` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This RPC returns the combined data from the following RPC's:   DSIR BILL HISTORY DSIR GET PAYMENT HISTORY

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BILL IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-comb-pay-and-aud-hist`

---

### `DSIR FEES REC RPT`

| Property | Value |
|----------|-------|
| Tag | `FEESREC` |
| Routine | `DSIRBIR0` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This RPC produces the data for the Fees Recieved report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | START DATE | LITERAL | No |
| 2 | END DATE | LITERAL | No |
| 3 | DIVISIONS | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-fees-rec-rpt`

---

### `DSIR FEES OUT RPT`

| Property | Value |
|----------|-------|
| Tag | `FEESOUT` |
| Routine | `DSIRBIR0` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This RPC produces the data for the Fees Outstanding Report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIVISIONS | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-fees-out-rpt`

---

### `DSIR AMOUNT BILLED RPT`

| Property | Value |
|----------|-------|
| Tag | `AMTBILD` |
| Routine | `DSIRBIR0` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This RPC returns the data for the Amount Billed report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Start Date | LITERAL | No |
| 2 | End Date | LITERAL | No |
| 3 | Divisions | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-amount-billed-rpt`

---

### `DSIR STILL OPEN`

| Property | Value |
|----------|-------|
| Tag | `STILOPEN` |
| Routine | `DSIROIR1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** This RPC produces a turnaround time report for all request that are not  in a closed status.

**API Endpoint:** `GET /vista/dsir/rpc/dsir-still-open`

---

### `DSIR PRIORTY REPORT`

| Property | Value |
|----------|-------|
| Tag | `PRIRTY` |
| Routine | `DSIROIR2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This RPC returns the data for the High Priority Request Report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | START DATE | LITERAL | No |
| 2 | END DATE | LITERAL | No |
| 3 | DIVISION(S) | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-priorty-report`

---

### `DSIR KILL BILL`

| Property | Value |
|----------|-------|
| Tag | `KILLBILL` |
| Routine | `DSIRBIL0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC will delete a bill and all related entries in the DSIR BILL  HISTORY and DSIR BILL TRACKING files.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BILL IEN | LITERAL | No |
| 2 | ADMIN OVERRIDE | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-kill-bill`

---

### `DSIR ADD NONCOMP PAT`

| Property | Value |
|----------|-------|
| Tag | `ADDNCPR` |
| Routine | `DSIROI0` |
| Return Type | ARRAY |
| Parameter Count | 5 |

**Description:** Routine for adding or updating an non-computerized patient for ROI.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NAME | LITERAL | No |
| 2 | SSN | LITERAL | No |
| 3 | DOB | LITERAL | No |
| 4 | OVRD | LITERAL | No |
| 5 | NCPIEN | LITERAL | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-add-noncomp-pat`

---

### `DSIR ADD ANNOTATION`

| Property | Value |
|----------|-------|
| Tag | `ADDANNO` |
| Routine | `DSIROI` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC adds entries into file 19620.98 which is for internal  annotations on patients pertinent to the ROI department.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT | LITERAL | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-add-annotation`

---

### `DSIR STATUS DISCREPANCY RPT`

| Property | Value |
|----------|-------|
| Tag | `STATDISC` |
| Routine | `DSIROIR2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This RPC returns data from the DSIR STATUS HISTORY file to review which  request are being entered as closed on one day yet the status date is a  previous date.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | START DATE | LITERAL | No |
| 2 | END DATE | LITERAL | No |
| 3 | CLERK(S) | REFERENCE | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-status-discrepancy-rpt`

---

### `DSIR REQUEST INQUIRY`

| Property | Value |
|----------|-------|
| Tag | `ROIINQ` |
| Routine | `DSIROI7` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This RPC returns the external data for a request from the DSIR ROI  INSTANCE File #19620 and all DSIR STATUS HISTORY File entries for the  specified request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ROI | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-request-inquiry`

---

### `DSIR FIRST CLOSED DATE`

| Property | Value |
|----------|-------|
| Tag | `CLDT1` |
| Routine | `DSIROI6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Returns the date the request was placed into a closed status.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ROI | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-first-closed-date`

---

### `DSIR LAST CLOSED DATE`

| Property | Value |
|----------|-------|
| Tag | `CLDTL` |
| Routine | `DSIROI6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC returns the latest effective date a request was closed.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ROI | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-last-closed-date`

---

### `DSIR ADD/DEL SENSITIVE PROV`

| Property | Value |
|----------|-------|
| Tag | `ADDPROV` |
| Routine | `DSIROI8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC will add or delete entries in file 19620.94 (DSIR SENSITIVE  PROVIDERS)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PROV | LITERAL | No |
| 2 | DEL | LITERAL | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-add/del-sensitive-prov`

---

### `DSIR GET SENSITIVE PROVIDERS`

| Property | Value |
|----------|-------|
| Tag | `PROVLIST` |
| Routine | `DSIROI8` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** This RPC returns a list of all persons flagged as sensitive in the ROI  package.

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-sensitive-providers`

---

### `DSIR LIST FOIA OFFSETS`

| Property | Value |
|----------|-------|
| Tag | `IENSFOIA` |
| Routine | `DSIROI8` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC gets IENS for 19620.3 and returns them through areferenced local  array along with the fiscal year end date and the division:  IEN^ENDDATE^DIVISION

**API Endpoint:** `GET /vista/dsir/rpc/dsir-list-foia-offsets`

---

### `DSIR GET FOIA OFFSETS`

| Property | Value |
|----------|-------|
| Tag | `GETFOIA` |
| Routine | `DSIROI8` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** GIVEN IEN (FISCAL YEAR END) THIS SUBROUTINE LOOKS UP THE RECORD AND  RETURNS THE REPORT HISTORY DETAILS AND REPORT COUNT VALUES.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-foia-offsets`

---

### `DSIR UPDATE FOIA OFFSETS`

| Property | Value |
|----------|-------|
| Tag | `MANUFOIA` |
| Routine | `DSIROI8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC updates the manually entered offsets for the annual FOIA report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FOIA | LITERAL | No |
| 2 | DATA | REFERENCE | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-update-foia-offsets`

---

### `DSIR SET LOCKED STATUS`

| Property | Value |
|----------|-------|
| Tag | `LOCKFOIA` |
| Routine | `DSIROI8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** This RPC sets/resets the lock on the annual FOIA report add in numbers.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EDDT | LITERAL | No |
| 2 | LSTAT | LITERAL | No |
| 3 | IEN | LITERAL | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-set-locked-status`

---

### `DSIR GET SELECTION ITEMS`

| Property | Value |
|----------|-------|
| Tag | `GETSELS` |
| Routine | `DSIROIAH` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** THIS ROUTINE PROVIDES THE DATA FOR POPULATING ALL THE DROP DOWN COMBO AND LIST BOXES WITH FIELD NAMES FOR THE AD HOC REPORTING SCREEN

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-selection-items`

---

### `DSIR GET AD HOC REPORT`

| Property | Value |
|----------|-------|
| Tag | `GETRPT` |
| Routine | `DSIROIAH` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns all of the definition parameters for a selected report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RPT | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-ad-hoc-report`

---

### `DSIR GET REPORT LIST`

| Property | Value |
|----------|-------|
| Tag | `RPTLIST` |
| Routine | `DSIROIAH` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** RETURNS A LIST OR REPORT NAMES AND THEIR IENS OR A SINGLE REPORT AND IT'S  IEN IF A REPORT NAME IS PASSED IN THE OPTIONAL PARAMETER.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RNAME | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-report-list`

---

### `DSIR GET AD HOC DATA`

| Property | Value |
|----------|-------|
| Tag | `RPTDATA` |
| Routine | `DSIROIA2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** GET DATA FOR AN AD HOC REPORT

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INARRAY | REFERENCE | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-ad-hoc-data`

---

### `DSIR GET REQUESTORS`

| Property | Value |
|----------|-------|
| Tag | `GTREQSTR` |
| Routine | `DSIROI3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** THIS RPC WILL RETURN ALL REQUESTORS THAT MEET ONE OF THE FOLLOWING  CRITERIA:   THE REQUESTORS LAST NAME STARTS WITH THE CHARACTERS IN THE FIRST INPUT  PARAMETER AND THE SECOND PARAMETER IS AN "L"   OR    THE REQUESTORS CORPORATE NAME STARTS WITH THE CHARACTERS IN THE FIRST INPUT PARAMETER AND THE S

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PREF | LITERAL | No |
| 2 | STYP | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-requestors`

---

### `DSIR GET FULL STATUS TYPES`

| Property | Value |
|----------|-------|
| Tag | `GETSTDSP` |
| Routine | `DSIROI6` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** THIS RPC RETURNS THE CONTENTS OF THE STATUS CODE FILE (^DSIR(19620.41))

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ACT | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-full-status-types`

---

### `DSIR RPT EXPEDITED PROCESSING`

| Property | Value |
|----------|-------|
| Tag | `EXPRPT` |
| Routine | `DSIROIR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** THIS CALL PROVIDES DATA FOR THE EXPEDITED PROCESSING REPORT IN ROI

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FRDT | LITERAL | No |
| 2 | TODT | LITERAL | No |
| 3 | DIV | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-rpt-expedited-processing`

---

### `DSIR UPDATE FEE WAIVER`

| Property | Value |
|----------|-------|
| Tag | `UPDATEFW` |
| Routine | `DSIRBIL0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 7 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | FWCLERK | LITERAL | No |
| 3 | FWRQST | LITERAL | No |
| 4 | FWRQSTDT | LITERAL | No |
| 5 | FWADJ | LITERAL | No |
| 6 | FWGRANT | LITERAL | No |
| 7 | FWADJDT | LITERAL | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-update-fee-waiver`

---

### `DSIR TEST PEND CLARIFICATION`

| Property | Value |
|----------|-------|
| Tag | `PENDCLR` |
| Routine | `DSIROI8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-test-pend-clarification`

---

### `DSIR ADD/EDIT REQUESTOR`

| Property | Value |
|----------|-------|
| Tag | `UPDRQSTR` |
| Routine | `DSIROI3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC will add or update an entry in the REQUESTOR FILE in ROI  (#19620.12)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA ARRAY | REFERENCE | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-add/edit-requestor`

---

### `DSIR CHANGE PRIMARY ADDRESS`

| Property | Value |
|----------|-------|
| Tag | `CHPRIADD` |
| Routine | `DSIROI6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC updates the pointer to the primary address for a given requestor.  The addresS is stored in the 5 node of 19620.12.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RQSTR | LITERAL | No |
| 2 | ADDRPTR | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-change-primary-address`

---

### `DSIR ADD/EDIT ADDRESS`

| Property | Value |
|----------|-------|
| Tag | `UPDTADDR` |
| Routine | `DSIROI6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC is ussed to add or update an address in the ROI ADDRESS file  (#19620.92).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-add/edit-address`

---

### `DSIR SET ADDRESS INACTIVE`

| Property | Value |
|----------|-------|
| Tag | `TOGLINAC` |
| Routine | `DSIROI6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC sets or resets the Address Inactive flag in the ROI Address file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ADRPTR | LITERAL | No |
| 2 | FLAGVAL | LITERAL | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-set-address-inactive`

---

### `DSIR IS PATIENT REQUESTOR`

| Property | Value |
|----------|-------|
| Tag | `ISREQSTR` |
| Routine | `DSIROI3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** TEST FOR AN ENTRY IN THE "DPATIENT" INDEX IN THE REQUESTOR FILE  (^DSIR(19620.12))

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-is-patient-requestor`

---

### `DSIR SET LAB TYPE`

| Property | Value |
|----------|-------|
| Tag | `STLABTYP` |
| Routine | `DSIROI1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Routine for setting the requested lab type for a given request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ROI | LITERAL | No |
| 2 | TYP | LITERAL | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-set-lab-type`

---

### `DSIR GET LAB TYPE`

| Property | Value |
|----------|-------|
| Tag | `GTLABTYP` |
| Routine | `DSIROI1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This routine returns the type of lab requested for a given request.  Note  that if no lab has been requested, this will contain a null or a zero.   In either case, this will be treated as a Cumulative Labs type.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ROI | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-lab-type`

---

### `DSIR GET LAB LIST`

| Property | Value |
|----------|-------|
| Tag | `GTLABLST` |
| Routine | `DSIROI1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This routine returns a list of labs that have been selected for a given  request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ROI | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-get-lab-list`

---

### `DSIR SET LAB LIST`

| Property | Value |
|----------|-------|
| Tag | `STLABLST` |
| Routine | `DSIROI1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This routine sets the requested labs for a given request.    NOTE: the labs are deleted every time and then added   based on the contents of DTLS.  If at any time   an entry in DTLS contains an "@" the processing    stops.  This will allow an "@" in the first    entry in DTLS to cause all entries to

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ROI | LITERAL | No |
| 2 | DTLS | REFERENCE | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsir-set-lab-list`

---

### `DSIR LAB INTERIM`

| Property | Value |
|----------|-------|
| Tag | `INTERIM` |
| Routine | `DSIROI1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | DATE1 | LITERAL | No |
| 3 | DATE2 | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-lab-interim`

---

### `DSIR LAB INTERIMS`

| Property | Value |
|----------|-------|
| Tag | `INTERIMS` |
| Routine | `DSIROI1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | DATE1 | LITERAL | No |
| 3 | DATE2 | LITERAL | No |
| 4 | ORTESTS | REFERENCE | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsir-lab-interims`

---

### `DSIR DEFAULT EXAM SETTINGS`

| Property | Value |
|----------|-------|
| Tag | `GETDEF` |
| Routine | `DSIROI1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the default settings for the display of imaging exams on the reports tab.

**API Endpoint:** `GET /vista/dsir/rpc/dsir-default-exam-settings`

---

### `DSIROIR PRL PAT REQUEST LIST`

| Property | Value |
|----------|-------|
| Tag | `PRL` |
| Routine | `DSIROIR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This RPC returns a list of all internal entry numbers from file 19620 for  a specified patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STDT | LITERAL | No |
| 2 | ENDT | LITERAL | No |
| 3 | PAT | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroir-prl-pat-request-list`

---

### `DSIROIC WPFILER WP FILER`

| Property | Value |
|----------|-------|
| Tag | `WPFILER` |
| Routine | `DSIROIC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** This RPC is used to update comments is several places withing the Release  of Information Record Manager (ROI/DSIR)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | TYPE | LITERAL | No |
| 3 | STRLIST | REFERENCE | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroic-wpfiler-wp-filer`

---

### `DSIROI GETREQST GET REQUEST`

| Property | Value |
|----------|-------|
| Tag | `GETREQST` |
| Routine | `DSIROI` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC invokes the GETS^DIQ api to retrieve all the data for a given  IEN in file 19620 (DSIR ROI INSTANCE).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroi-getreqst-get-request`

---

### `DSIROIR2 RTYP RECEIVED METHOD`

| Property | Value |
|----------|-------|
| Tag | `RTYP` |
| Routine | `DSIROIR2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This is produces the data for the Received Status report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDATE | LITERAL | No |
| 2 | EDATE | LITERAL | No |
| 3 | DIVL | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroir2-rtyp-received-method`

---

### `DSIRRPT1 BYCLRK RPT BY CLERK`

| Property | Value |
|----------|-------|
| Tag | `BYCLRK` |
| Routine | `DSIRRPT1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 7 |

**Description:** Schedules areport to retrieve ROI requests for a given date range for use in GUI reports.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FRDT | LITERAL | No |
| 2 | TODT | LITERAL | No |
| 3 | STATUS | LITERAL | No |
| 4 | DIVL | LITERAL | No |
| 5 | REQS | REFERENCE | No |
| 6 | SCHED | LITERAL | No |
| 7 | ESTART | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrpt1-byclrk-rpt-by-clerk`

---

### `DSIRRPT1 RTYP REQUESTS BY TYPE`

| Property | Value |
|----------|-------|
| Tag | `RTYP` |
| Routine | `DSIRRPT1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 7 |

**Description:** Schedules areport to retrieve ROI requests for a given date range for use in GUI reports.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FRDATE | LITERAL | No |
| 2 | TODATE | LITERAL | No |
| 3 | STATUS | LITERAL | No |
| 4 | DIVL | LITERAL | No |
| 5 | TYPS | REFERENCE | No |
| 6 | SCHED | LITERAL | No |
| 7 | ESTART | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrpt1-rtyp-requests-by-type`

---

### `DSIRRPTR CRPT CHECK REPORTS`

| Property | Value |
|----------|-------|
| Tag | `CRPT` |
| Routine | `DSIRRPTR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Retrieve all report information from the DSIR SCHEDULED REPORTS file for  a given DUZ.

**API Endpoint:** `GET /vista/dsir/rpc/dsirrptr-crpt-check-reports`

---

### `DSIRRPTR STOP CANCEL REPORT`

| Property | Value |
|----------|-------|
| Tag | `STOP` |
| Routine | `DSIRRPTR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Requests a specified task to stop running. No guarantee that this will  always work, however, if a report is asked to stop while running and the  report sees the request, the report will clean up the ^XTMP data, stop  running and update the DSIR SCHEDULED REPORTS file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | WEP | LITERAL | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsirrptr-stop-cancel-report`

---

### `DSIRRPTR GETRPT GET RPT DATA`

| Property | Value |
|----------|-------|
| Tag | `GETRPT` |
| Routine | `DSIRRPTR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** Retrieves stored results from a specified report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | STFM | LITERAL | No |
| 3 | RECS | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrptr-getrpt-get-rpt-data`

---

### `DSIRRPTR PRMS GET PARAMETERS`

| Property | Value |
|----------|-------|
| Tag | `PRMS` |
| Routine | `DSIRRPTR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Retrieves stored results from a specified report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrptr-prms-get-parameters`

---

### `DSIRRPT2 TTIM TURNAROUND TIME`

| Property | Value |
|----------|-------|
| Tag | `TAT` |
| Routine | `DSIRRPT2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** RPC for scheduling the Turnaround Time Report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FRDT | LITERAL | No |
| 2 | TODT | LITERAL | No |
| 3 | DIVL | LITERAL | No |
| 4 | SCHED | LITERAL | No |
| 5 | ESTART | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrpt2-ttim-turnaround-time`

---

### `DSIRRPT3 DTR DELIVERY TYPE RPT`

| Property | Value |
|----------|-------|
| Tag | `DTR` |
| Routine | `DSIRRPT3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** This proceedure schedules or runs the Delivery Type Summary Report,

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FRDT | LITERAL | No |
| 2 | TODT | LITERAL | No |
| 3 | DIVL | LITERAL | No |
| 4 | SCHED | LITERAL | No |
| 5 | ESTART | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrpt3-dtr-delivery-type-rpt`

---

### `DSIRRPT3 RTR HOW RECEIVED RPT`

| Property | Value |
|----------|-------|
| Tag | `RTR` |
| Routine | `DSIRRPT3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** This proceedure schedules or runs the Received Method Summary Report

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FRDT | LITERAL | No |
| 2 | TODT | LITERAL | No |
| 3 | DIVL | LITERAL | No |
| 4 | SCHED | LITERAL | No |
| 5 | ESTART | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrpt3-rtr-how-received-rpt`

---

### `DSIRRPTA AHR GET AD HOC DATA`

| Property | Value |
|----------|-------|
| Tag | `AHR` |
| Routine | `DSIRRPTA` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This calls schedules or runs an ad hoc report and returns the task information or the report data.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INARRAY | REFERENCE | No |
| 2 | SCHED | LITERAL | No |
| 3 | ESTART | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrpta-ahr-get-ad-hoc-data`

---

### `DSIRRPTB AMTB AMOUNT BILLED`

| Property | Value |
|----------|-------|
| Tag | `AMTB` |
| Routine | `DSIRRPTB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** This schedules or runs the Amount Billed Report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FRDT | LITERAL | No |
| 2 | TODT | LITERAL | No |
| 3 | DIVL | LITERAL | No |
| 4 | SCHED | LITERAL | No |
| 5 | ESTART | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrptb-amtb-amount-billed`

---

### `DSIRRPTB FEEO FEES OUT RPT`

| Property | Value |
|----------|-------|
| Tag | `FEEO` |
| Routine | `DSIRRPTB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** This schedules or runs the Fees Outstanding Report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIVL | LITERAL | No |
| 2 | SCHED | LITERAL | No |
| 3 | ESTART | LITERAL | No |
| 4 | FRDT | LITERAL | No |
| 5 | TODT | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrptb-feeo-fees-out-rpt`

---

### `DSIRRPTB FEER FEES REC RPT`

| Property | Value |
|----------|-------|
| Tag | `FEER` |
| Routine | `DSIRRPTB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** This schedules or runs the Fees Received Report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FRDT | LITERAL | No |
| 2 | TODT | LITERAL | No |
| 3 | DIVL | LITERAL | No |
| 4 | SCHED | LITERAL | No |
| 5 | ESTART | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrptb-feer-fees-rec-rpt`

---

### `DSIRRPT4 EXP EXPEDITED REPORT`

| Property | Value |
|----------|-------|
| Tag | `EXP` |
| Routine | `DSIRRPT4` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** This procedure schedules or runs the Expedited Processing Report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FRDT | LITERAL | No |
| 2 | TODT | LITERAL | No |
| 3 | DIV | LITERAL | No |
| 4 | SCHED | LITERAL | No |
| 5 | ESTART | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrpt4-exp-expedited-report`

---

### `DSIRRPTF FOIA YEAR END REPORT`

| Property | Value |
|----------|-------|
| Tag | `FOIA` |
| Routine | `DSIRRPTF` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 6 |

**Description:** This RPC will collect the data for the year end FOIA report for VA Form 0712

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FRDT | LITERAL | No |
| 2 | TODT | LITERAL | No |
| 3 | DIV | LITERAL | No |
| 4 | QUICK | LITERAL | No |
| 5 | SCHED | LITERAL | No |
| 6 | ESTART | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrptf-foia-year-end-report`

---

### `DSIRRPT2 PDH PATIENT DISC HIST`

| Property | Value |
|----------|-------|
| Tag | `PDH` |
| Routine | `DSIRRPT2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 6 |

**Description:** This routine returns the data nescessary for the patient disclosure history report.     Required fields for this report:     From 19620      FIELD   From 19620.1    FIELD   ---------------------   ---------------------   RequestIEN        .01   DocumentCaption   .05   DateReceived    10.06   Documen

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PAT | LITERAL | No |
| 2 | FRDT | LITERAL | No |
| 3 | TODT | LITERAL | No |
| 4 | SCHED | LITERAL | No |
| 5 | ESTART | LITERAL | No |
| 6 | PNAME | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrpt2-pdh-patient-disc-hist`

---

### `DSIRRPT4 CDD DISCREPANCY RPT`

| Property | Value |
|----------|-------|
| Tag | `CDD` |
| Routine | `DSIRRPT4` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** This RPC returns data from the DSIR STATUS HISTORY file to review which request are being entered as closed on one day yet the status date is a previous date.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FRDT | LITERAL | No |
| 2 | TODT | LITERAL | No |
| 3 | CLRK | REFERENCE | No |
| 4 | SCHED | LITERAL | No |
| 5 | ESTART | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrpt4-cdd-discrepancy-rpt`

---

### `DSIRRPTV FOIAV FOIA VALIDATION`

| Property | Value |
|----------|-------|
| Tag | `FOIAV` |
| Routine | `DSIRRPTV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** This RPC will return a global array of all records thkat were looked at for the year end FOIA report.  It will contain the internal request number and patient name/FOIA indicator, and a one for any block on the report that the given request was included on.  It also contains all record that, during

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FRDT | LITERAL | No |
| 2 | TODT | LITERAL | No |
| 3 | DIV | LITERAL | No |
| 4 | SCHED | LITERAL | No |
| 5 | ESTART | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirrptv-foiav-foia-validation`

---

### `DSIRRPTR KCHK REPORT KILL CHK`

| Property | Value |
|----------|-------|
| Tag | `KCHK` |
| Routine | `DSIRRPTR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This procedure is used to check to see if the report cleanup task needs to be run. If yes, the DSIR REPORT KILL CHECK DATE parameter is updated and  the cleanup task is queued.

**API Endpoint:** `GET /vista/dsir/rpc/dsirrptr-kchk-report-kill-chk`

---

### `DSIRBIL0 BLSOUT BILLS DUE`

| Property | Value |
|----------|-------|
| Tag | `BLSOUT` |
| Routine | `DSIRBIL0` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This routine retrieves a requestor from the provided request and creates an outstanding bill report for that requestor.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsirbil0-blsout-bills-due`

---

### `DSIROI4 BTCH BATCH PROCESSING`

| Property | Value |
|----------|-------|
| Tag | `BTCH` |
| Routine | `DSIROI4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** This RPC clones requests in a batch manner.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TYPE | LITERAL | No |
| 2 | IEN | LITERAL | No |
| 3 | SELLIST | REFERENCE | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroi4-btch-batch-processing`

---

### `DSIROI4 EDOCS ELECT DOC CHECK`

| Property | Value |
|----------|-------|
| Tag | `EDOCS` |
| Routine | `DSIROI4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Test a request to see if it has any electronic documents attached.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroi4-edocs-elect-doc-check`

---

### `DSIROI4 GETDEM GET DEMOGRAPHIC`

| Property | Value |
|----------|-------|
| Tag | `GETDEM` |
| Routine | `DSIROI4` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns limited demographic data required for processing a request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IFN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroi4-getdem-get-demographic`

---

### `DSIROIC ZIP CODE LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `ZIP` |
| Routine | `DSIROIC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Looks up location information, city, state, and county based on inputted  zip code.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PCODE | LITERAL | No |
| 2 | ACTDATE | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroic-zip-code-lookup`

---

### `DSIROIC GETSTLST STATE LIST`

| Property | Value |
|----------|-------|
| Tag | `GETSTLST` |
| Routine | `DSIROIC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Gets state information from file 5.

**API Endpoint:** `GET /vista/dsir/rpc/dsiroic-getstlst-state-list`

---

### `DSIROIC CLKDAT GET CLERK INFO`

| Property | Value |
|----------|-------|
| Tag | `CLKDAT` |
| Routine | `DSIROIC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Look up for clerk info.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroic-clkdat-get-clerk-info`

---

### `DSIROIC DOD GET DATE OF DEATH`

| Property | Value |
|----------|-------|
| Tag | `DOD` |
| Routine | `DSIROIC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Get a patient's date of death.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroic-dod-get-date-of-death`

---

### `DSIROIC PATID GET DFN AND NAME`

| Property | Value |
|----------|-------|
| Tag | `PATINFO` |
| Routine | `DSIROIC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Get patient information form a request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroic-patid-get-dfn-and-name`

---

### `DSIROI3 CKRQ CHK PAT REQUESTOR`

| Property | Value |
|----------|-------|
| Tag | `CKRQ` |
| Routine | `DSIROI3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Checks requestor file for entries for a selected patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/dsir/rpc/dsiroi3-ckrq-chk-pat-requestor`

---

### `DSIROI STBLFLG SET BILL FLAG`

| Property | Value |
|----------|-------|
| Tag | `STBLFLG` |
| Routine | `DSIROI` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This routine checks the requestor attached to a request to see if there  are any outstanding bills other than the current request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `POST /vista/dsir/rpc/dsiroi-stblflg-set-bill-flag`

---


## Menu Options

### Broker

| Name | Security Key |
|------|-------------|
| DSIR MENU OPTIONS | — |

### Run routine

| Name | Security Key |
|------|-------------|
| DSIR LIST REQUESTS | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/dsir/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/dsir/rpc/dsir-get-status-codes` | DSIR GET STATUS CODES | ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-patient-disc-hist` | DSIR GET PATIENT DISC HIST | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-aod` | DSIR GET AOD | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-clerk-requests` | DSIR GET CLERK REQUESTS | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-delivery-type-summary-rpt` | DSIR DELIVERY TYPE SUMMARY RPT | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsiroi-getcmts-get-comments` | DSIROI GETCMTS GET COMMENTS | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsiroi1-queuelbl-queue-a-label` | DSIROI1 QUEUELBL QUEUE A LABEL | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsiroi1-printlbl-print-labels` | DSIROI1 PRINTLBL PRINT LABELS | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsiroi1-purgelbl-purge-labels` | DSIROI1 PURGELBL PURGE LABELS | SINGLE VALUE |
| POST | `/vista/dsir/rpc/dsiroi1-del1lbl-delete-1-label` | DSIROI1 DEL1LBL DELETE 1 LABEL | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsiroiu-lstin-get-last-install` | DSIROIU LSTIN GET LAST INSTALL | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-requests-by-date` | DSIR REQUESTS BY DATE | GLOBAL ARRAY |
| POST | `/vista/dsir/rpc/dsir-add-document` | DSIR ADD DOCUMENT | ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-documents` | DSIR GET DOCUMENTS | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-cleanup` | DSIR CLEANUP | SINGLE VALUE |
| POST | `/vista/dsir/rpc/dsir-set-followup-date` | DSIR SET FOLLOWUP DATE | ARRAY |
| GET | `/vista/dsir/rpc/dsir-followup-required-list` | DSIR FOLLOWUP REQUIRED LIST | ARRAY |
| GET | `/vista/dsir/rpc/dsir-check-prev-req` | DSIR CHECK PREV REQ | ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-doc-dates` | DSIR GET DOC DATES | ARRAY |
| POST | `/vista/dsir/rpc/dsir-set-doc-dates` | DSIR SET DOC DATES | ARRAY |
| GET | `/vista/dsir/rpc/dsir-requests-since-date` | DSIR REQUESTS SINCE DATE | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-get-routine-version` | DSIR GET ROUTINE VERSION | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-rpt-by-requestor` | DSIR RPT BY REQUESTOR | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-rpt-requestors-in-sys` | DSIR RPT REQUESTORS IN SYS | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-rpt-requests-by-type` | DSIR RPT REQUESTS BY TYPE | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-clerks-list` | DSIR CLERKS LIST | GLOBAL ARRAY |
| POST | `/vista/dsir/rpc/dsir-update-address` | DSIR UPDATE ADDRESS | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-get-addresses` | DSIR GET ADDRESSES | GLOBAL ARRAY |
| POST | `/vista/dsir/rpc/dsir-update-status` | DSIR UPDATE STATUS | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-current-status` | DSIR CURRENT STATUS | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-status-history` | DSIR STATUS HISTORY | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-reasons-for-request` | DSIR GET REASONS FOR REQUEST | ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-request-types` | DSIR GET REQUEST TYPES | ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-requestor-types` | DSIR GET REQUESTOR TYPES | ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-authority` | DSIR GET AUTHORITY | ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-rois` | DSIR GET ROIS | GLOBAL ARRAY |
| POST | `/vista/dsir/rpc/dsir-add/edit-roi` | DSIR ADD/EDIT ROI | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-reformat-reports` | DSIR REFORMAT REPORTS | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-status-on-date` | DSIR STATUS ON DATE | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-get-document-types` | DSIR GET DOCUMENT TYPES | ARRAY |
| POST | `/vista/dsir/rpc/dsir-delete-requestor` | DSIR DELETE REQUESTOR | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-year-end-foia-report` | DSIR YEAR END FOIA REPORT | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-exemption-3-info` | DSIR GET EXEMPTION 3 INFO | ARRAY |
| GET | `/vista/dsir/rpc/dsir-comp-accounting-summary` | DSIR COMP ACCOUNTING SUMMARY | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-divisions` | DSIR GET DIVISIONS | ARRAY |
| GET | `/vista/dsir/rpc/dsir-turnaround-time-report` | DSIR TURNAROUND TIME REPORT | GLOBAL ARRAY |
| POST | `/vista/dsir/rpc/dsir-update-bill` | DSIR UPDATE BILL | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-payment` | DSIR PAYMENT | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-get-bill-info` | DSIR GET BILL INFO | ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-payment-history` | DSIR GET PAYMENT HISTORY | ARRAY |
| GET | `/vista/dsir/rpc/dsir-total-charges` | DSIR TOTAL CHARGES | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-fees-received` | DSIR FEES RECEIVED | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-fees-outstanding` | DSIR FEES OUTSTANDING | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-bill-docs` | DSIR GET BILL DOCS | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-foia-validation` | DSIR FOIA VALIDATION | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-cleanup-exemptions` | DSIR CLEANUP EXEMPTIONS | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-clear-followup-dates` | DSIR CLEAR FOLLOWUP DATES | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-bill-history` | DSIR BILL HISTORY | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-bill-audit-history` | DSIR BILL AUDIT HISTORY | GLOBAL ARRAY |
| POST | `/vista/dsir/rpc/dsir-update-include-on-bill` | DSIR UPDATE INCLUDE ON BILL | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-comb-pay-and-aud-hist` | DSIR COMB PAY AND AUD HIST | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-fees-rec-rpt` | DSIR FEES REC RPT | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-fees-out-rpt` | DSIR FEES OUT RPT | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-amount-billed-rpt` | DSIR AMOUNT BILLED RPT | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-still-open` | DSIR STILL OPEN | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-priorty-report` | DSIR PRIORTY REPORT | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-kill-bill` | DSIR KILL BILL | SINGLE VALUE |
| POST | `/vista/dsir/rpc/dsir-add-noncomp-pat` | DSIR ADD NONCOMP PAT | ARRAY |
| POST | `/vista/dsir/rpc/dsir-add-annotation` | DSIR ADD ANNOTATION | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-status-discrepancy-rpt` | DSIR STATUS DISCREPANCY RPT | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-request-inquiry` | DSIR REQUEST INQUIRY | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-first-closed-date` | DSIR FIRST CLOSED DATE | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-last-closed-date` | DSIR LAST CLOSED DATE | SINGLE VALUE |
| POST | `/vista/dsir/rpc/dsir-add/del-sensitive-prov` | DSIR ADD/DEL SENSITIVE PROV | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-get-sensitive-providers` | DSIR GET SENSITIVE PROVIDERS | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-list-foia-offsets` | DSIR LIST FOIA OFFSETS | ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-foia-offsets` | DSIR GET FOIA OFFSETS | ARRAY |
| POST | `/vista/dsir/rpc/dsir-update-foia-offsets` | DSIR UPDATE FOIA OFFSETS | SINGLE VALUE |
| POST | `/vista/dsir/rpc/dsir-set-locked-status` | DSIR SET LOCKED STATUS | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-get-selection-items` | DSIR GET SELECTION ITEMS | ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-ad-hoc-report` | DSIR GET AD HOC REPORT | ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-report-list` | DSIR GET REPORT LIST | ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-ad-hoc-data` | DSIR GET AD HOC DATA | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-requestors` | DSIR GET REQUESTORS | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-get-full-status-types` | DSIR GET FULL STATUS TYPES | ARRAY |
| GET | `/vista/dsir/rpc/dsir-rpt-expedited-processing` | DSIR RPT EXPEDITED PROCESSING | GLOBAL ARRAY |
| POST | `/vista/dsir/rpc/dsir-update-fee-waiver` | DSIR UPDATE FEE WAIVER | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-test-pend-clarification` | DSIR TEST PEND CLARIFICATION | SINGLE VALUE |
| POST | `/vista/dsir/rpc/dsir-add/edit-requestor` | DSIR ADD/EDIT REQUESTOR | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-change-primary-address` | DSIR CHANGE PRIMARY ADDRESS | SINGLE VALUE |
| POST | `/vista/dsir/rpc/dsir-add/edit-address` | DSIR ADD/EDIT ADDRESS | SINGLE VALUE |
| POST | `/vista/dsir/rpc/dsir-set-address-inactive` | DSIR SET ADDRESS INACTIVE | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-is-patient-requestor` | DSIR IS PATIENT REQUESTOR | SINGLE VALUE |
| POST | `/vista/dsir/rpc/dsir-set-lab-type` | DSIR SET LAB TYPE | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-get-lab-type` | DSIR GET LAB TYPE | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-get-lab-list` | DSIR GET LAB LIST | ARRAY |
| POST | `/vista/dsir/rpc/dsir-set-lab-list` | DSIR SET LAB LIST | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsir-lab-interim` | DSIR LAB INTERIM | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-lab-interims` | DSIR LAB INTERIMS | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsir-default-exam-settings` | DSIR DEFAULT EXAM SETTINGS | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsiroir-prl-pat-request-list` | DSIROIR PRL PAT REQUEST LIST | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsiroic-wpfiler-wp-filer` | DSIROIC WPFILER WP FILER | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsiroi-getreqst-get-request` | DSIROI GETREQST GET REQUEST | ARRAY |
| GET | `/vista/dsir/rpc/dsiroir2-rtyp-received-method` | DSIROIR2 RTYP RECEIVED METHOD | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrpt1-byclrk-rpt-by-clerk` | DSIRRPT1 BYCLRK RPT BY CLERK | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrpt1-rtyp-requests-by-type` | DSIRRPT1 RTYP REQUESTS BY TYPE | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrptr-crpt-check-reports` | DSIRRPTR CRPT CHECK REPORTS | GLOBAL ARRAY |
| POST | `/vista/dsir/rpc/dsirrptr-stop-cancel-report` | DSIRRPTR STOP CANCEL REPORT | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsirrptr-getrpt-get-rpt-data` | DSIRRPTR GETRPT GET RPT DATA | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrptr-prms-get-parameters` | DSIRRPTR PRMS GET PARAMETERS | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrpt2-ttim-turnaround-time` | DSIRRPT2 TTIM TURNAROUND TIME | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrpt3-dtr-delivery-type-rpt` | DSIRRPT3 DTR DELIVERY TYPE RPT | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrpt3-rtr-how-received-rpt` | DSIRRPT3 RTR HOW RECEIVED RPT | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrpta-ahr-get-ad-hoc-data` | DSIRRPTA AHR GET AD HOC DATA | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrptb-amtb-amount-billed` | DSIRRPTB AMTB AMOUNT BILLED | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrptb-feeo-fees-out-rpt` | DSIRRPTB FEEO FEES OUT RPT | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrptb-feer-fees-rec-rpt` | DSIRRPTB FEER FEES REC RPT | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrpt4-exp-expedited-report` | DSIRRPT4 EXP EXPEDITED REPORT | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrptf-foia-year-end-report` | DSIRRPTF FOIA YEAR END REPORT | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrpt2-pdh-patient-disc-hist` | DSIRRPT2 PDH PATIENT DISC HIST | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrpt4-cdd-discrepancy-rpt` | DSIRRPT4 CDD DISCREPANCY RPT | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrptv-foiav-foia-validation` | DSIRRPTV FOIAV FOIA VALIDATION | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsirrptr-kchk-report-kill-chk` | DSIRRPTR KCHK REPORT KILL CHK | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsirbil0-blsout-bills-due` | DSIRBIL0 BLSOUT BILLS DUE | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsiroi4-btch-batch-processing` | DSIROI4 BTCH BATCH PROCESSING | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsiroi4-edocs-elect-doc-check` | DSIROI4 EDOCS ELECT DOC CHECK | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsiroi4-getdem-get-demographic` | DSIROI4 GETDEM GET DEMOGRAPHIC | ARRAY |
| GET | `/vista/dsir/rpc/dsiroic-zip-code-lookup` | DSIROIC ZIP CODE LOOKUP | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsiroic-getstlst-state-list` | DSIROIC GETSTLST STATE LIST | GLOBAL ARRAY |
| GET | `/vista/dsir/rpc/dsiroic-clkdat-get-clerk-info` | DSIROIC CLKDAT GET CLERK INFO | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsiroic-dod-get-date-of-death` | DSIROIC DOD GET DATE OF DEATH | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsiroic-patid-get-dfn-and-name` | DSIROIC PATID GET DFN AND NAME | SINGLE VALUE |
| GET | `/vista/dsir/rpc/dsiroi3-ckrq-chk-pat-requestor` | DSIROI3 CKRQ CHK PAT REQUESTOR | ARRAY |
| POST | `/vista/dsir/rpc/dsiroi-stblflg-set-bill-flag` | DSIROI STBLFLG SET BILL FLAG | SINGLE VALUE |
