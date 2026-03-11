# Automated Information Collection System (IBD)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Charges, claims, insurance, means test, copay

| Property | Value |
|----------|-------|
| Namespace | `IBD` |
| Tier | 5 |
| FileMan Files | 5 |
| RPCs | 16 |
| Menu Options | 7 |
| VDL Manual | `integrated-billing-user-guide.pdf` |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 350 | File #350 | ? | ? |
| 399 | File #399 | ? | ? |
| 361 | File #361 | ? | ? |
| 361.1 | File #361.1 | ? | ? |
| 355.3 | File #355.3 | ? | ? |

## Remote Procedure Calls (RPCs)

### `IBD EXPAND FORMID`

| Property | Value |
|----------|-------|
| Tag | `IDPAT` |
| Routine | `IBDFRPC3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This call will convert a form id (printed at the top of an encounter form) and return information about the patient, the appointment, and the form. See routine IBDRPC3 for output descritpion.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FORMID | LITERAL | No |

**API Endpoint:** `GET /vista/ibd/rpc/ibd-expand-formid`

---

### `IBD GET FORMSPEC`

| Property | Value |
|----------|-------|
| Tag | `GETFS` |
| Routine | `IBDFBK1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This call will return the Form Specification file (as an array) that is used by the scanning software to recognize a form.  Lines longer than 255 characters are truncated on the server and flagged with "~~~" indicating the need to concatenate on the client.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FORMTYPE | LITERAL | No |

**API Endpoint:** `GET /vista/ibd/rpc/ibd-get-formspec`

---

### `IBD GET INPUT OBJECT BY CLINIC`

| Property | Value |
|----------|-------|
| Tag | `CLNLSTI` |
| Routine | `IBDFRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of input objects on all encounter forms defined for a clinic in the clinic setup.  There are 3 types of input objects, lists, hand print fields, and multiple choice fields.  Each has its own set of unique characterists for input.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINIC | LITERAL | No |

**API Endpoint:** `GET /vista/ibd/rpc/ibd-get-input-object-by-clinic`

---

### `IBD GET INPUT OBJECT BY FORM`

| Property | Value |
|----------|-------|
| Tag | `FRMLSTI` |
| Routine | `IBDFRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of input objects on one encounter forms . There are 3 types of input objects, lists, hand print fields, and multiple choice fields.  Each has its own set of unique characterists for input.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FRM | LITERAL | No |

**API Endpoint:** `GET /vista/ibd/rpc/ibd-get-input-object-by-form`

---

### `IBD GET ONE INPUT OBJECT`

| Property | Value |
|----------|-------|
| Tag | `OBJLST` |
| Routine | `IBDFRPC1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This call will return specific information about any one input object regardless of type.  Developers should first use the RPC to return the available input objects (either by form or by clinic).     There are 3 types of input objects, lists (both static and dynamic), hand print fields, and multiple

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBDF | REFERENCE | No |

**API Endpoint:** `GET /vista/ibd/rpc/ibd-get-one-input-object`

---

### `IBD RECEIVE FORM DATA`

| Property | Value |
|----------|-------|
| Tag | `RECV` |
| Routine | `IBDFBK2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is to be used by the AICS workstation software only.  It accepts data in the format returned by the scanning software and converts the data in the format expected by PCE and passes the data to PCE.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FORMDATA | REFERENCE | No |

**API Endpoint:** `GET /vista/ibd/rpc/ibd-receive-form-data`

---

### `IBD VALIDATE USER`

| Property | Value |
|----------|-------|
| Tag | `VALIDAV` |
| Routine | `IBDFBK1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This call is used to validate user information and for display on the Show User screen.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBDAV | REFERENCE | No |

**API Endpoint:** `GET /vista/ibd/rpc/ibd-validate-user`

---

### `IBD RECEIVE DATA`

| Property | Value |
|----------|-------|
| Tag | `SEND` |
| Routine | `IBDFRPC4` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This call is the public RPC for developers to input data from an encounter form to AICS for processing to PCE.  See routine IBDFRPC4 for detailed description of variables.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBDF | REFERENCE | No |

**API Endpoint:** `GET /vista/ibd/rpc/ibd-receive-data`

---

### `IBD RETURN IMAGE ID`

| Property | Value |
|----------|-------|
| Tag | `IMAGEID` |
| Routine | `IBDFBK1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a numeric between 1 and 9999999 that is used as part of the file name to store the next unknown image as.

**API Endpoint:** `GET /vista/ibd/rpc/ibd-return-image-id`

---

### `IBD ELAPSED TIME`

| Property | Value |
|----------|-------|
| Tag | `ETIME` |
| Routine | `IBDFBK1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Store elapsed time for data entry

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBDF | REFERENCE | No |

**API Endpoint:** `GET /vista/ibd/rpc/ibd-elapsed-time`

---

### `IBD STORE WORKSTATION ERROR`

| Property | Value |
|----------|-------|
| Tag | `WSERR` |
| Routine | `IBDFBK1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This call back is used by AICS to log entries in the AICS ERROR AND WARNING FILE when the recognition of a form is canceled or otherwise interrupted.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FORMID | REFERENCE | No |

**API Endpoint:** `GET /vista/ibd/rpc/ibd-store-workstation-error`

---

### `IBD STORE IMAGE NAME`

| Property | Value |
|----------|-------|
| Tag | `IMAGENM` |
| Routine | `IBDFBK1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will cause the information on images saved to be stored in the AICS IMAGE LOG file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FORMID | REFERENCE | No |

**API Endpoint:** `GET /vista/ibd/rpc/ibd-store-image-name`

---

### `IBD GET ALL PCE DATA`

| Property | Value |
|----------|-------|
| Tag | `GETALL` |
| Routine | `IBDFRPC5` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to retrieve all data in PCE for a particlar encounter formatted for display in a memo component.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBDATA | REFERENCE | No |

**API Endpoint:** `GET /vista/ibd/rpc/ibd-get-all-pce-data`

---

### `IBD GET PAST APPT LIST`

| Property | Value |
|----------|-------|
| Tag | `APPTLST` |
| Routine | `IBDFRPC5` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC can be used to return a list of appointments for a patient.  It defaults to returning the past 1 year's kept appointments.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBDF | REFERENCE | No |

**API Endpoint:** `GET /vista/ibd/rpc/ibd-get-past-appt-list`

---

### `IBD GET FORMSPEC GLOBAL`

| Property | Value |
|----------|-------|
| Tag | `GETFS1` |
| Routine | `IBDFBK1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBDF | REFERENCE | No |

**API Endpoint:** `GET /vista/ibd/rpc/ibd-get-formspec-global`

---

### `IBD GET SCAN PAGE INFO`

| Property | Value |
|----------|-------|
| Tag | `SCANPG` |
| Routine | `IBDFBK1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return an array where the data reflects the page number of scannable pages, Piece 2 will display the date/time received.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FORMID | LITERAL | No |

**API Endpoint:** `GET /vista/ibd/rpc/ibd-get-scan-page-info`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| FORMID: | IBD EXPAND FORMID | FORMID | LITERAL | rpc |
| FORMTYPE: | IBD GET FORMSPEC | FORMTYPE | LITERAL | rpc |
| CLINIC: | IBD GET INPUT OBJECT BY CLINIC | CLINIC | LITERAL | rpc |
| FRM: | IBD GET INPUT OBJECT BY FORM | FRM | LITERAL | rpc |
| IBDF: | IBD GET ONE INPUT OBJECT | IBDF | REFERENCE | rpc |
| FORMDATA: | IBD RECEIVE FORM DATA | FORMDATA | REFERENCE | rpc |
| IBDAV: | IBD VALIDATE USER | IBDAV | REFERENCE | rpc |
| IBDF: | IBD RECEIVE DATA | IBDF | REFERENCE | rpc |
| IBDF: | IBD ELAPSED TIME | IBDF | REFERENCE | rpc |
| FORMID: | IBD STORE WORKSTATION ERROR | FORMID | REFERENCE | rpc |
| FORMID: | IBD STORE IMAGE NAME | FORMID | REFERENCE | rpc |
| IBDATA: | IBD GET ALL PCE DATA | IBDATA | REFERENCE | rpc |
| IBDF: | IBD GET PAST APPT LIST | IBDF | REFERENCE | rpc |
| IBICN: | IBARXM QUERY ONLY | IBICN | LITERAL | rpc |
| IBM: | IBARXM QUERY ONLY | IBM | LITERAL | rpc |
| IBD: | IBARXM TRANS DATA | IBD | LITERAL | rpc |
| IBICN: | IBARXM TRANS DATA | IBICN | LITERAL | rpc |
| IBICN: | IBARXM TRANS BILL | IBICN | LITERAL | rpc |
| IBT: | IBARXM TRANS BILL | IBT | LITERAL | rpc |
| IBB: | IBARXM TRANS BILL | IBB | LITERAL | rpc |
| IBM: | IBARXM QUERY SUPPRESS USER | IBM | LITERAL | rpc |
| IBICN: | IBARXM QUERY SUPPRESS USER | IBICN | LITERAL | rpc |
| IBICN: | IBO MT LTC COPAY QUERY | IBICN | LITERAL | rpc |
| DFN: | IBO MT LTC COPAY QUERY | DFN | LITERAL | rpc |
| IBBDT: | IBO MT LTC COPAY QUERY | IBBDT | LITERAL | rpc |
| IBEDT: | IBO MT LTC COPAY QUERY | IBEDT | LITERAL | rpc |
| IBICN: | IBCN INSURANCE QUERY | IBICN | LITERAL | rpc |
| IBICN: | IBCN INSURANCE QUERY TASK | IBICN | LITERAL | rpc |
| IBDF: | IBD GET FORMSPEC GLOBAL | IBDF | REFERENCE | rpc |
| FORMID: | IBD GET SCAN PAGE INFO | FORMID | LITERAL | rpc |
| ARG: | IBTAS 837 CLAIM DATA | ARG | REFERENCE | rpc |
| ARG: | IBTAS 837 EDICLAIMS | ARG | REFERENCE | rpc |
| ARG: | IBTAS 837 ACK | ARG | REFERENCE | rpc |
| IBICN: | IBECEA COPAY SYNCH | IBICN | LITERAL | rpc |
| IBSITE: | IBECEA COPAY SYNCH | IBSITE | LITERAL | rpc |
| IBBILL: | IBECEA COPAY SYNCH | IBBILL | LITERAL | rpc |
| IBVISDT: | IBECEA COPAY SYNCH | IBVISDT | LITERAL | rpc |
| IBSTAT: | IBECEA COPAY SYNCH | IBSTAT | LITERAL | rpc |
| IBCOMM: | IBECEA COPAY SYNCH | IBCOMM | LITERAL | rpc |
| IBUNIQ: | IBECEA COPAY SYNCH | IBUNIQ | LITERAL | rpc |
| IBELGRP: | IBECEA COPAY SYNCH | IBELGRP | LITERAL | rpc |
| ARG: | IBTAS FACILITY BY VISN | ARG | LITERAL | rpc |
| ARG: | IBTAS 277STAT | ARG | REFERENCE | rpc |
| ARG: | IBTAS 837 FHIR ENABLE | ARG | REFERENCE | rpc |
| ARG: | IBTAS 837 TEST CLAIMS | ARG | REFERENCE | rpc |
| ARG: | IBTAS 837 CLAIM NUMBER | ARG | REFERENCE | rpc |
| ARG: | IBTAS PCR IENS | ARG | REFERENCE | rpc |
| ARG: | IBTAS PCR CLAIM DATA | ARG | REFERENCE | rpc |
| ARG: | IBTAS PCR WRITEBACK | ARG | REFERENCE | rpc |
| ARG: | IBTASDB POST | ARG | REFERENCE | rpc |
| IBICN: | IBMH COPAY SYNCH | IBICN | LITERAL | rpc |
| IBSITE: | IBMH COPAY SYNCH | IBSITE | LITERAL | rpc |
| IBBILL: | IBMH COPAY SYNCH | IBBILL | LITERAL | rpc |
| IBVISDT : | IBMH COPAY SYNCH | IBVISDT  | LITERAL | rpc |
| IBSTAT: | IBMH COPAY SYNCH | IBSTAT | LITERAL | rpc |
| IBCOMM: | IBMH COPAY SYNCH | IBCOMM | LITERAL | rpc |
| IBUNIQ: | IBMH COPAY SYNCH | IBUNIQ | LITERAL | rpc |
| FORMID: | IBD EXPAND FORMID | FORMID | LITERAL | rpc |
| FORMTYPE: | IBD GET FORMSPEC | FORMTYPE | LITERAL | rpc |
| CLINIC: | IBD GET INPUT OBJECT BY CLINIC | CLINIC | LITERAL | rpc |
| FRM: | IBD GET INPUT OBJECT BY FORM | FRM | LITERAL | rpc |
| IBDF: | IBD GET ONE INPUT OBJECT | IBDF | REFERENCE | rpc |
| FORMDATA: | IBD RECEIVE FORM DATA | FORMDATA | REFERENCE | rpc |
| IBDAV: | IBD VALIDATE USER | IBDAV | REFERENCE | rpc |
| IBDF: | IBD RECEIVE DATA | IBDF | REFERENCE | rpc |
| IBDF: | IBD ELAPSED TIME | IBDF | REFERENCE | rpc |
| FORMID: | IBD STORE WORKSTATION ERROR | FORMID | REFERENCE | rpc |
| FORMID: | IBD STORE IMAGE NAME | FORMID | REFERENCE | rpc |
| IBDATA: | IBD GET ALL PCE DATA | IBDATA | REFERENCE | rpc |
| IBDF: | IBD GET PAST APPT LIST | IBDF | REFERENCE | rpc |
| IBDF: | IBD GET FORMSPEC GLOBAL | IBDF | REFERENCE | rpc |
| FORMID: | IBD GET SCAN PAGE INFO | FORMID | LITERAL | rpc |
| IBICN: | IBCN INSURANCE QUERY | IBICN | LITERAL | rpc |
| IBICN: | IBCN INSURANCE QUERY TASK | IBICN | LITERAL | rpc |

## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| IBD MANUAL DATA ENTRY BY CLIN | — |
| IBD MANUAL DATA ENTRY BY FORM | — |
| IBD MANUAL DATA ENTRY GROUP | — |
| IBD MANUAL DATA ENTRY PRE | — |
| IBD MANUAL DATA DISPLAY | — |

### Menu

| Name | Security Key |
|------|-------------|
| IBD MANUAL DATA ENTRY MENU | — |

### Broker

| Name | Security Key |
|------|-------------|
| IBD SCANNING WORKSTATION | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/ibd/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/ibd/rpc/ibd-expand-formid` | IBD EXPAND FORMID | SINGLE VALUE |
| GET | `/vista/ibd/rpc/ibd-get-formspec` | IBD GET FORMSPEC | ARRAY |
| GET | `/vista/ibd/rpc/ibd-get-input-object-by-clinic` | IBD GET INPUT OBJECT BY CLINIC | ARRAY |
| GET | `/vista/ibd/rpc/ibd-get-input-object-by-form` | IBD GET INPUT OBJECT BY FORM | ARRAY |
| GET | `/vista/ibd/rpc/ibd-get-one-input-object` | IBD GET ONE INPUT OBJECT | ARRAY |
| GET | `/vista/ibd/rpc/ibd-receive-form-data` | IBD RECEIVE FORM DATA | ARRAY |
| GET | `/vista/ibd/rpc/ibd-validate-user` | IBD VALIDATE USER | SINGLE VALUE |
| GET | `/vista/ibd/rpc/ibd-receive-data` | IBD RECEIVE DATA | ARRAY |
| GET | `/vista/ibd/rpc/ibd-return-image-id` | IBD RETURN IMAGE ID | SINGLE VALUE |
| GET | `/vista/ibd/rpc/ibd-elapsed-time` | IBD ELAPSED TIME | SINGLE VALUE |
| GET | `/vista/ibd/rpc/ibd-store-workstation-error` | IBD STORE WORKSTATION ERROR | SINGLE VALUE |
| GET | `/vista/ibd/rpc/ibd-store-image-name` | IBD STORE IMAGE NAME | SINGLE VALUE |
| GET | `/vista/ibd/rpc/ibd-get-all-pce-data` | IBD GET ALL PCE DATA | ARRAY |
| GET | `/vista/ibd/rpc/ibd-get-past-appt-list` | IBD GET PAST APPT LIST | ARRAY |
| GET | `/vista/ibd/rpc/ibd-get-formspec-global` | IBD GET FORMSPEC GLOBAL | GLOBAL ARRAY |
| GET | `/vista/ibd/rpc/ibd-get-scan-page-info` | IBD GET SCAN PAGE INFO | ARRAY |

## VDL Documentation Reference

Source manual: `data/vista/vdl-manuals/integrated-billing-user-guide.pdf`

Refer to the official VA VistA Documentation Library (VDL) manual for:

- Roll & Scroll terminal operation procedures
- Security key assignments and menu management
- FileMan file relationships and data entry rules
- MUMPS routine reference and entry points
