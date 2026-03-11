# Integrated Billing (IB)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Charges, claims, insurance, means test, copay

| Property | Value |
|----------|-------|
| Namespace | `IB` |
| Tier | 5 |
| FileMan Files | 5 |
| RPCs | 38 |
| Menu Options | 140 |
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

**API Endpoint:** `GET /vista/ib/rpc/ibd-expand-formid`

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

**API Endpoint:** `GET /vista/ib/rpc/ibd-get-formspec`

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

**API Endpoint:** `GET /vista/ib/rpc/ibd-get-input-object-by-clinic`

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

**API Endpoint:** `GET /vista/ib/rpc/ibd-get-input-object-by-form`

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

**API Endpoint:** `GET /vista/ib/rpc/ibd-get-one-input-object`

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

**API Endpoint:** `GET /vista/ib/rpc/ibd-receive-form-data`

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

**API Endpoint:** `GET /vista/ib/rpc/ibd-validate-user`

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

**API Endpoint:** `GET /vista/ib/rpc/ibd-receive-data`

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

**API Endpoint:** `GET /vista/ib/rpc/ibd-return-image-id`

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

**API Endpoint:** `GET /vista/ib/rpc/ibd-elapsed-time`

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

**API Endpoint:** `GET /vista/ib/rpc/ibd-store-workstation-error`

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

**API Endpoint:** `GET /vista/ib/rpc/ibd-store-image-name`

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

**API Endpoint:** `GET /vista/ib/rpc/ibd-get-all-pce-data`

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

**API Endpoint:** `GET /vista/ib/rpc/ibd-get-past-appt-list`

---

### `IBARXM QUERY ONLY`

| Property | Value |
|----------|-------|
| Tag | `RQUERY` |
| Routine | `IBARXMR` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to query only the information for pharmacy co-payment billing that has happened for the given month/year.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBICN | LITERAL | No |
| 2 | IBM | LITERAL | No |

**API Endpoint:** `GET /vista/ib/rpc/ibarxm-query-only`

---

### `IBARXM TRANS DATA`

| Property | Value |
|----------|-------|
| Tag | `TRANS` |
| Routine | `IBARXMR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure is used to receive transaction information from a remote facility and reply with an acknowledgement. This RPC call does not send user data to remote side.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBD | LITERAL | No |
| 2 | IBICN | LITERAL | No |

**API Endpoint:** `GET /vista/ib/rpc/ibarxm-trans-data`

---

### `IBARXM TRANS BILL`

| Property | Value |
|----------|-------|
| Tag | `BILL` |
| Routine | `IBARXMR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This rpc will receive data that a charge should be created for a pharmacy  copayment that had previously not been charged due to the patient  reaching their copayment cap amount. This RPC call does not send user data to remote side.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBICN | LITERAL | No |
| 2 | IBT | LITERAL | No |
| 3 | IBB | LITERAL | No |

**API Endpoint:** `GET /vista/ib/rpc/ibarxm-trans-bill`

---

### `IBARXM QUERY SUPPRESS USER`

| Property | Value |
|----------|-------|
| Tag | `RQUERY` |
| Routine | `IBARXMR` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to query only the information for pharmacy co-payment billing that has happened for the given month/year. The RPC should be used only for queries, which will not allow the user to  see information, because the user data will not be transmitted to remote  system.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBM | LITERAL | No |
| 2 | IBICN | LITERAL | No |

**API Endpoint:** `GET /vista/ib/rpc/ibarxm-query-suppress-user`

---

### `IBO MT LTC COPAY QUERY`

| Property | Value |
|----------|-------|
| Tag | `RETURN` |
| Routine | `IBOMTLTC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure will produce a report showing both MT and LTC copay  information at a remote facility.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBICN | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | IBBDT | LITERAL | No |
| 4 | IBEDT | LITERAL | No |

**API Endpoint:** `GET /vista/ib/rpc/ibo-mt-ltc-copay-query`

---

### `IBCN INSURANCE QUERY`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `IBCNRDV` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This does a remote query on the insurance information.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBICN | LITERAL | No |

**API Endpoint:** `GET /vista/ib/rpc/ibcn-insurance-query`

---

### `IBCN INSURANCE QUERY TASK`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `IBCNRDV` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This does a remote query on the insurance information. This is the one  that used during tasked jobs to avoid user data exchange.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBICN | LITERAL | No |

**API Endpoint:** `GET /vista/ib/rpc/ibcn-insurance-query-task`

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

**API Endpoint:** `GET /vista/ib/rpc/ibd-get-formspec-global`

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

**API Endpoint:** `GET /vista/ib/rpc/ibd-get-scan-page-info`

---

### `IBTAS 837 CLAIM DATA`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `IBCE837H` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARG | REFERENCE | No |

**API Endpoint:** `GET /vista/ib/rpc/ibtas-837-claim-data`

---

### `IBTAS 837 EDICLAIMS`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `IBCE837I` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARG | REFERENCE | No |

**API Endpoint:** `GET /vista/ib/rpc/ibtas-837-ediclaims`

---

### `IBTAS 837 ACK`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `IBCE837K` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARG | REFERENCE | No |

**API Endpoint:** `GET /vista/ib/rpc/ibtas-837-ack`

---

### `IBTAS HEALTH`

| Property | Value |
|----------|-------|
| Tag | `HEALTH` |
| Routine | `IBTASHLT` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Developer tool only No paramters required. Return example: {"STATION": "CHEYENNE VAMC",                 "HEALTH": "OK", "STATION NUMBER": "442"             }

**API Endpoint:** `GET /vista/ib/rpc/ibtas-health`

---

### `IBECEA COPAY SYNCH`

| Property | Value |
|----------|-------|
| Tag | `RETURN` |
| Routine | `IBECEA38` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 8 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure will perform actions Create, Read, Update, Delete  (CRUD) to track urgent care copays for a Veteran across all VA facilities the individual has been treated at.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBICN | LITERAL | No |
| 2 | IBSITE | LITERAL | No |
| 3 | IBBILL | LITERAL | No |
| 4 | IBVISDT | LITERAL | No |
| 5 | IBSTAT | LITERAL | No |
| 6 | IBCOMM | LITERAL | No |
| 7 | IBUNIQ | LITERAL | No |
| 8 | IBELGRP | LITERAL | No |

**API Endpoint:** `GET /vista/ib/rpc/ibecea-copay-synch`

---

### `IBTAS FACILITY BY VISN`

| Property | Value |
|----------|-------|
| Tag | `FACILITY` |
| Routine | `IBTASFAC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARG | LITERAL | No |

**API Endpoint:** `GET /vista/ib/rpc/ibtas-facility-by-visn`

---

### `IBTAS 277STAT`

| Property | Value |
|----------|-------|
| Tag | `POST` |
| Routine | `IBCE277S` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARG | REFERENCE | No |

**API Endpoint:** `GET /vista/ib/rpc/ibtas-277stat`

---

### `IBTAS 837 FHIR ENABLE`

| Property | Value |
|----------|-------|
| Tag | `PUT` |
| Routine | `IBCE837S` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARG | REFERENCE | No |

**API Endpoint:** `GET /vista/ib/rpc/ibtas-837-fhir-enable`

---

### `IBTAS 837 TEST CLAIMS`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `IBCE837T` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARG | REFERENCE | No |

**API Endpoint:** `GET /vista/ib/rpc/ibtas-837-test-claims`

---

### `IBTAS 837 CLAIM NUMBER`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `IBCE837N` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARG | REFERENCE | No |

**API Endpoint:** `GET /vista/ib/rpc/ibtas-837-claim-number`

---

### `IBTAS PCR IENS`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `IBCEMSRI` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARG | REFERENCE | No |

**API Endpoint:** `GET /vista/ib/rpc/ibtas-pcr-iens`

---

### `IBTAS PCR CLAIM DATA`

| Property | Value |
|----------|-------|
| Tag | `GET1` |
| Routine | `IBCEMSRI` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARG | REFERENCE | No |

**API Endpoint:** `GET /vista/ib/rpc/ibtas-pcr-claim-data`

---

### `IBTAS PCR WRITEBACK`

| Property | Value |
|----------|-------|
| Tag | `PUT` |
| Routine | `IBCEMSRI` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARG | REFERENCE | No |

**API Endpoint:** `GET /vista/ib/rpc/ibtas-pcr-writeback`

---

### `IBTASDB POST`

| Property | Value |
|----------|-------|
| Tag | `POST` |
| Routine | `IBTASDB` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARG | REFERENCE | No |

**API Endpoint:** `GET /vista/ib/rpc/ibtasdb-post`

---

### `IBMH COPAY SYNCH`

| Property | Value |
|----------|-------|
| Tag | `RETURN` |
| Routine | `IBMHPMPY2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 7 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBICN | LITERAL | No |
| 2 | IBSITE | LITERAL | No |
| 3 | IBBILL | LITERAL | No |
| 4 | IBVISDT  | LITERAL | No |
| 5 | IBSTAT | LITERAL | No |
| 6 | IBCOMM | LITERAL | No |
| 7 | IBUNIQ | LITERAL | No |

**API Endpoint:** `GET /vista/ib/rpc/ibmh-copay-synch`

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
| IB EDIT BILLING INFO | IB EDIT |
| IB AUTHORIZE BILL GENERATION | IB AUTHORIZE |
| IB PRINT BILL | — |
| IB BILL STATUS REPORT | — |
| IB CANCEL BILL | IB AUTHORIZE |
| IB OUTPATIENT VET REPORT | — |
| IB BILLING TOTALS REPORT | — |
| IB INPATIENT VET REPORT | — |
| IB PATIENT BILLING INQUIRY | — |
| IB COPY AND CANCEL | — |
| IB LIST ALL BILLS FOR PAT. | — |
| IB BILLING RATES FILE | IB SUPERVISOR |
| IB RETURN BILL LIST | — |
| IB LIST BILLS FOR EPISODE | — |
| IB LIST OF BILLING RATES | — |
| IB EDIT RETURNED BILL | IB EDIT |
| IB RETURN BILL | IB AUTHORIZE |
| IB BACKGRND VETS INPT W/INS | — |
| IB BACKGRND VETS OPT W/INS | — |
| IB EDIT SITE PARAMETERS | IB PARAMETER EDIT |
| IB SITE STATUS DISPLAY | — |
| IB FILER STOP | — |
| IB FILER START | — |
| IB FILER CLEAR PARAMETERS | — |
| IB OUTPUT STATISTICAL REPORT | — |
| IB OUTPUT LIST ACTIONS | — |
| IB OUTPUT FULL INQ BY BILL NO | — |
| IB REPOST | — |
| IB OUTPUT INQ BY PATIENT | — |
| IB OUTPUT IB INQ | — |
| IB OUTPUT VERIFY RX LINKS | — |
| IB REV CODE TOTALS | — |
| IB OUTPUT CLK PROD | — |
| IB PURGE/BASC TRANSFER CLEANUP | XUMGR |
| IB MT PROFILE | — |
| IB MT ESTIMATOR | — |
| IB MT NIGHT COMP | — |
| IB OUTPUT TREND REPORT | — |
| IB OUTPT VISIT DATE INQUIRY | — |
| IB MT BILLING REPORT | — |
| IB MT CLOCK MAINTENANCE | IB AUTHORIZE |
| IB FLAG CONTINUOUS PATIENTS | IB AUTHORIZE |
| IB MT CLOCK INQUIRY | — |
| IB CANCEL/EDIT/ADD CHARGES | IB AUTHORIZE |
| IB OUTPUT VETS BY DISCH | — |
| IB BACKGRND VET DISCHS W/INS | — |
| IB OUTPUT CONTINUOUS PATIENTS | — |
| IB OUTPUT MOST COMMON OPT CPT | — |
| IB OUTPUT INPTS WITHOUT INS | — |
| IB OUTPUT OPTS WITHOUT INS | — |
| IB PURGE/FIND BILLING DATA | XUMGR |
| IB PURGE/ARCHIVE BILLING DATA | XUMGR |
| IB PURGE BILLING DATA | XUMGR |
| IB MT RELEASE CHARGES | IB AUTHORIZE |
| IB OUTPUT HELD CHARGES | — |
| IB OUTPUT EVENTS REPORT | — |
| IB PURGE LIST LOG ENTRIES | XUMGR |
| IB PURGE LOG INQUIRY | XUMGR |
| IB PURGE LIST TEMPLATE ENTRIES | — |
| IB PURGE DELETE TEMPLATE ENTRY | — |
| IB MT PASS CONV CHARGES | IB AUTHORIZE |
| IB RX HARDSHIP | — |
| IB RX INQUIRE | — |
| IB RX ADD THRESHOLDS | — |
| IB RX PRINT THRESHOLDS | — |
| IB RX PRINT PAT. EXEMP. | — |
| IB RX PRINT RETRO CHARGES | — |
| IB RX PRINT VERIFY EXEMP | — |
| IB RX EDIT LETTER | — |
| IB RX PRINT EX LETERS | — |
| IB OUTPUT RANK CARRIERS | — |
| IB OUTPUT EMPLOYER REPORT | — |
| IB MT LIST HELD (RATE) CHARGES | — |
| IB MT REL HELD (RATE) CHARGES | — |
| IB MT DISP SPECIAL CASES | — |
| IB MT LIST SPECIAL CASES | — |
| IB MT FLAG OPT PARAMS | — |
| IB MT LIST FLAGGED PARAMS | — |
| IB OUTPUT AUTO BILLER | — |
| IB AUTO BILLER PARAMS | IB PARAMETER EDIT |
| IB CLEAN AUTO BILLER LIST | — |
| IB PRINT BILL ADDENDUM | — |
| IB BATCH PRINT BILLS | — |
| IB OUTPUT IVM BILLING ACTIVITY | — |
| IB MT REV PEND CHARGES | — |
| IB RX REPRINT REMINDER | — |
| IB TP FLAG OPT PARAMS | — |
| IB TP LIST FLAGGED PARAMS | — |
| IB OUTPUT PRE-REG SOURCE REPT | — |
| IB OUTPUT DAYS ON HOLD | — |
| IB OUTPUT CNT/AMT RPT | — |
| IB OUTPUT HISTORY OF HELD CHGS | — |
| IB OUTPUT RELEASED CHARGES RPT | — |
| IB OUTPUT HELD CHARGES/PT | — |
| IB MRA EDIT INS CO LIST | — |
| IB MRA BACKBILLING REPORT | IB SUPERVISOR |
| IB MT ON HOLD FIX | IB SUPERVISOR |
| IB MRA EXTRACT | — |
| IB MT BILLABLE STOPS | — |
| IB MT LTC REMOTE QUERY | — |
| IB GMT SINGLE PATIENT REPORT | — |
| IB GMT MONTHLY TOTALS | — |
| IB ECME BILLING EVENTS | — |
| IB GENERATE ECME RX BILLS | — |
| IB SC DETERMINATION CHANGE RPT | — |
| IB CORRECT REJECTED/DENIED | IB AUTHORIZE |
| IB CD CHARGE REPORT | — |
| IB PROVIDER FROM FB SUMMARY | — |
| IB OUTPUT ROI EXPIRED | — |
| IB VIEW CANCEL BILL | — |
| IB MT FIX/DISCH SPECIAL CASES | — |
| IB PRINTED CLAIMS REPORT | — |
| IB OUTPUT HELD CHARGES LM | — |
| IB HCCH PAYER ID REPORT | — |
| IB OTH FSM ELIG. CHANGE REPORT | — |
| IB COMPACT REPORT | — |
| IB INDIAN EXEMPTION REPORT | — |
| IB MH COPAY RPT | — |
| IB TP VETERAN CHRG RPT | — |

### Menu

| Name | Security Key |
|------|-------------|
| IB BILLING SUPERVISOR MENU | IB SUPERVISOR |
| IB BILLING CLERK MENU | — |
| IB SYSTEM DEFINITION MENU | IB SUPERVISOR |
| IB THIRD PARTY OUTPUT MENU | — |
| IB RETURN BILL MENU | — |
| IB SITE MGR MENU | — |
| IB OUTPUT MENU | — |
| IB MANAGER MENU | — |
| IB OUTPUT PATIENT REPORT MENU | — |
| IB THIRD PARTY BILLING MENU | — |
| IB MEANS TEST MENU | — |
| IB OUTPUT MANAGEMENT REPORTS | — |
| IB PURGE MENU | XUMGR |
| IB RX EXEMPTION MENU | — |
| IB MT ON HOLD MENU | — |
| IB PROVIDER FROM FB RPTS MENU | — |

### Edit

| Name | Security Key |
|------|-------------|
| IB ACTIVATE REVENUE CODES | IB SUPERVISOR |
| IB SITE DEVICE SETUP | — |
| IB EDIT E&M CODE QUANTITY FLAG | IB SUPERVISOR |

### Action

| Name | Security Key |
|------|-------------|
| IB CIDC INSURANCE SWITCH | IB SUPERVISOR |

### Print

| Name | Security Key |
|------|-------------|
| IB PROVIDER FROM FB DETAIL | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `IB EDIT`
- `IB SUPERVISOR`
- `IB AUTHORIZE`
- `IB PARAMETER EDIT`
- `XUMGR`

## API Route Summary

All routes are prefixed with `/vista/ib/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/ib/rpc/ibd-expand-formid` | IBD EXPAND FORMID | SINGLE VALUE |
| GET | `/vista/ib/rpc/ibd-get-formspec` | IBD GET FORMSPEC | ARRAY |
| GET | `/vista/ib/rpc/ibd-get-input-object-by-clinic` | IBD GET INPUT OBJECT BY CLINIC | ARRAY |
| GET | `/vista/ib/rpc/ibd-get-input-object-by-form` | IBD GET INPUT OBJECT BY FORM | ARRAY |
| GET | `/vista/ib/rpc/ibd-get-one-input-object` | IBD GET ONE INPUT OBJECT | ARRAY |
| GET | `/vista/ib/rpc/ibd-receive-form-data` | IBD RECEIVE FORM DATA | ARRAY |
| GET | `/vista/ib/rpc/ibd-validate-user` | IBD VALIDATE USER | SINGLE VALUE |
| GET | `/vista/ib/rpc/ibd-receive-data` | IBD RECEIVE DATA | ARRAY |
| GET | `/vista/ib/rpc/ibd-return-image-id` | IBD RETURN IMAGE ID | SINGLE VALUE |
| GET | `/vista/ib/rpc/ibd-elapsed-time` | IBD ELAPSED TIME | SINGLE VALUE |
| GET | `/vista/ib/rpc/ibd-store-workstation-error` | IBD STORE WORKSTATION ERROR | SINGLE VALUE |
| GET | `/vista/ib/rpc/ibd-store-image-name` | IBD STORE IMAGE NAME | SINGLE VALUE |
| GET | `/vista/ib/rpc/ibd-get-all-pce-data` | IBD GET ALL PCE DATA | ARRAY |
| GET | `/vista/ib/rpc/ibd-get-past-appt-list` | IBD GET PAST APPT LIST | ARRAY |
| GET | `/vista/ib/rpc/ibarxm-query-only` | IBARXM QUERY ONLY | ARRAY |
| GET | `/vista/ib/rpc/ibarxm-trans-data` | IBARXM TRANS DATA | SINGLE VALUE |
| GET | `/vista/ib/rpc/ibarxm-trans-bill` | IBARXM TRANS BILL | SINGLE VALUE |
| GET | `/vista/ib/rpc/ibarxm-query-suppress-user` | IBARXM QUERY SUPPRESS USER | ARRAY |
| GET | `/vista/ib/rpc/ibo-mt-ltc-copay-query` | IBO MT LTC COPAY QUERY | GLOBAL ARRAY |
| GET | `/vista/ib/rpc/ibcn-insurance-query` | IBCN INSURANCE QUERY | ARRAY |
| GET | `/vista/ib/rpc/ibcn-insurance-query-task` | IBCN INSURANCE QUERY TASK | ARRAY |
| GET | `/vista/ib/rpc/ibd-get-formspec-global` | IBD GET FORMSPEC GLOBAL | GLOBAL ARRAY |
| GET | `/vista/ib/rpc/ibd-get-scan-page-info` | IBD GET SCAN PAGE INFO | ARRAY |
| GET | `/vista/ib/rpc/ibtas-837-claim-data` | IBTAS 837 CLAIM DATA | ARRAY |
| GET | `/vista/ib/rpc/ibtas-837-ediclaims` | IBTAS 837 EDICLAIMS | ARRAY |
| GET | `/vista/ib/rpc/ibtas-837-ack` | IBTAS 837 ACK | ARRAY |
| GET | `/vista/ib/rpc/ibtas-health` | IBTAS HEALTH | ARRAY |
| GET | `/vista/ib/rpc/ibecea-copay-synch` | IBECEA COPAY SYNCH | GLOBAL ARRAY |
| GET | `/vista/ib/rpc/ibtas-facility-by-visn` | IBTAS FACILITY BY VISN | GLOBAL ARRAY |
| GET | `/vista/ib/rpc/ibtas-277stat` | IBTAS 277STAT | ARRAY |
| GET | `/vista/ib/rpc/ibtas-837-fhir-enable` | IBTAS 837 FHIR ENABLE | ARRAY |
| GET | `/vista/ib/rpc/ibtas-837-test-claims` | IBTAS 837 TEST CLAIMS | ARRAY |
| GET | `/vista/ib/rpc/ibtas-837-claim-number` | IBTAS 837 CLAIM NUMBER | ARRAY |
| GET | `/vista/ib/rpc/ibtas-pcr-iens` | IBTAS PCR IENS | ARRAY |
| GET | `/vista/ib/rpc/ibtas-pcr-claim-data` | IBTAS PCR CLAIM DATA | ARRAY |
| GET | `/vista/ib/rpc/ibtas-pcr-writeback` | IBTAS PCR WRITEBACK | ARRAY |
| GET | `/vista/ib/rpc/ibtasdb-post` | IBTASDB POST | ARRAY |
| GET | `/vista/ib/rpc/ibmh-copay-synch` | IBMH COPAY SYNCH | GLOBAL ARRAY |

## VDL Documentation Reference

Source manual: `data/vista/vdl-manuals/integrated-billing-user-guide.pdf`

Refer to the official VA VistA Documentation Library (VDL) manual for:

- Roll & Scroll terminal operation procedures
- Security key assignments and menu management
- FileMan file relationships and data entry rules
- MUMPS routine reference and entry points
