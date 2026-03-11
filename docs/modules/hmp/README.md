# HMP (HMP)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `HMP` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 43 |
| Menu Options | 11 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `HMP PATIENT ACTIVITY`

| Property | Value |
|----------|-------|
| Tag | `ACT` |
| Routine | `HMPACT` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure returns all JSON messages for entries that exist in  the cross reference ^HMP(800001.5,"PTAPPT,"HMP"

**API Endpoint:** `GET /vista/hmp/rpc/hmp-patient-activity`

---

### `HMP APPOINTMENTS`

| Property | Value |
|----------|-------|
| Tag | `OUT` |
| Routine | `HMPPATS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC finds a list of patients that have scheduled appointments during the requested timeframe, as XML in ^TMP($J,"HMP",n).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | START | LITERAL | No |
| 2 | STOP | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-appointments`

---

### `HMP DATA VERSION`

| Property | Value |
|----------|-------|
| Tag | `VERSION` |
| Routine | `HMPD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the current version of the XML returned by the RPC 'HMP GET PATIENT DATA.'

**API Endpoint:** `GET /vista/hmp/rpc/hmp-data-version`

---

### `HMP DELETE OBJECT`

| Property | Value |
|----------|-------|
| Tag | `DEL` |
| Routine | `HMPDJ2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC receives a Uid from the client and deletes the object from the HMP Object file #800000.11.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | UID | LITERAL | No |

**API Endpoint:** `POST /vista/hmp/rpc/hmp-delete-object`

---

### `HMP GET CHECKSUM`

| Property | Value |
|----------|-------|
| Tag | `CHECK` |
| Routine | `HMPDCRC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC retrieves the requested data from VistA and returns its checksum.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | REFERENCE | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-get-checksum`

---

### `HMP GET OBJECT`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `HMPDJ2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC retrieves the requested data from VistA, and returns it in ^TMP("HMP",$J,n) as JSON.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | REFERENCE | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-get-object`

---

### `HMP GET OPERATIONAL DATA`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `HMPEF` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC retrieves the requested data from VistA, and returns it in ^TMP("HMP",$J,n) as JSON.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | REFERENCE | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-get-operational-data`

---

### `HMP GET PATIENT DATA`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `HMPD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 7 |
| Status | Inactive (may still be callable) |

**Description:** This RPC retrieves the requested data from VistA, and returns it in ^TMP("HMP",$J,n) as XML.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | TYPE | LITERAL | No |
| 3 | START | LITERAL | No |
| 4 | STOP | LITERAL | No |
| 5 | MAX | LITERAL | No |
| 6 | ITEM | LITERAL | No |
| 7 | FILTER | REFERENCE | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-get-patient-data`

---

### `HMP GET PATIENT DATA JSON`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `HMPDJ` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC retrieves the requested data from VistA, and returns it in ^TMP("HMP",$J,n) as JSON.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | REFERENCE | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-get-patient-data-json`

---

### `HMP GET REFERENCE DATA`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `HMPEF` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC retrieves the requested data from VistA, and returns it in ^TMP("HMP",$J,n) as JSON.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILTER | REFERENCE | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-get-reference-data`

---

### `HMP INPATIENTS`

| Property | Value |
|----------|-------|
| Tag | `IN` |
| Routine | `HMPPATS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC finds a list of patients that are currently admitted, as XML in ^TMP($J,"HMP",n).

**API Endpoint:** `GET /vista/hmp/rpc/hmp-inpatients`

---

### `HMP PUT DEMOGRAPHICS`

| Property | Value |
|----------|-------|
| Tag | `PUT` |
| Routine | `HMPUPD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC receives updated phone numbers from the client and calls VAFCPTED to save them in the Patient file #2.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OBJECT | LIST | No |
| 2 | COMMAND | LITERAL | No |
| 3 | PATIENT | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-put-demographics`

---

### `HMP PUT OBJECT`

| Property | Value |
|----------|-------|
| Tag | `PUT` |
| Routine | `HMPDJ2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC receives data from the client and saves it in the HMP Object file #800000.11 as JSON.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TYPE | LITERAL | No |
| 2 | OBJECT | LIST | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-put-object`

---

### `HMP PUT PATIENT DATA`

| Property | Value |
|----------|-------|
| Tag | `PUT` |
| Routine | `HMPDJ1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC receives data from the client and saves it in the HMP Patient Object file #800000.1 as JSON.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | TYPE | LITERAL | No |
| 3 | OBJECT | LIST | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-put-patient-data`

---

### `HMP SUBSCRIBE`

| Property | Value |
|----------|-------|
| Tag | `SUBS` |
| Routine | `HMPPATS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will maintain a list of patients & events to monitor for new data. The LIST of patients passed into this RPC is returned in ^TMP($J,"HMP",n) as XML, with a subscription status of 'on', 'off', or 'error'.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SYS | LITERAL | No |
| 2 | LIST | REFERENCE | No |
| 3 | STS | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-subscribe`

---

### `HMP WRITEBACK PT DEM`

| Property | Value |
|----------|-------|
| Tag | `FILE` |
| Routine | `HMPPTDEM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC takes demographic data from an outside system and files it in to the Patient File (#2)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FIL | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-writeback-pt-dem`

---

### `HMPCPRS RPC`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `HMPCPRS` |
| Return Type | WORD PROCESSING |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** USED TO RETURN HEADER INFORMATION TO MIMIC CPRS HEADERS IN EHMP GUI

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMS | REFERENCE | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmpcprs-rpc`

---

### `HMPCRPC RPC`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `HMPCRPC` |
| Return Type | WORD PROCESSING |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to save and get data from all the HMP PARAMETERS in all the  all the HMP parameter files.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMS | REFERENCE | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmpcrpc-rpc`

---

### `HMPCRPC RPCCHAIN`

| Property | Value |
|----------|-------|
| Tag | `CHAINRPC` |
| Routine | `HMPCRPC` |
| Return Type | WORD PROCESSING |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Used to chain multiple HMP RPC's together. Flexible framework for invoking a RPC chain

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMS | REFERENCE | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmpcrpc-rpcchain`

---

### `HMPDJFS API`

| Property | Value |
|----------|-------|
| Tag | `API` |
| Routine | `HMPDJFS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This is the primary entry point RPC for all the VX-Sync API. All sync related calls come through this entry point

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RESPONSE | LITERAL | No |
| 2 | ARGS | REFERENCE | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmpdjfs-api`

---

### `HMPDJFS DELSUB`

| Property | Value |
|----------|-------|
| Tag | `DELSUB` |
| Routine | `HMPDJFS` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RPC used to delete eHMP subscriptions from file 800000

**API Endpoint:** `GET /vista/hmp/rpc/hmpdjfs-delsub`

---

### `HMPFPTC CHKS`

| Property | Value |
|----------|-------|
| Tag | `CHKS` |
| Routine | `HMPFPTC` |
| Return Type | WORD PROCESSING |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the patient selection checks for a sensitive patient,  deceased, and PRF.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICN | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmpfptc-chks`

---

### `HMPFPTC LOG`

| Property | Value |
|----------|-------|
| Tag | `LOG` |
| Routine | `HMPFPTC` |
| Return Type | WORD PROCESSING |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to log a patient when a provider is accessing a  sensitive record.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICN | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmpfptc-log`

---

### `HMP LOCAL CORRESPONDINGIDS`

| Property | Value |
|----------|-------|
| Tag | `TFL` |
| Routine | `HMPTFU2` |
| Return Type | WORD PROCESSING |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Give a patient DFN, ICN, or EDIPI, this Remote Procedure Call returns a list of Treating Facilities, including SOURCE ID, SITE HASH, and IDENTIFIER STATUS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Patient Identifier | LIST | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-local-correspondingids`

---

### `HMP PUT OPERATIONAL DATA`

| Property | Value |
|----------|-------|
| Tag | `API` |
| Routine | `HMPWB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC accepts writeback data from JDS and returns a JSON formatted acknowledgement message.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-put-operational-data`

---

### `HMP PATIENT SCHED SYNC`

| Property | Value |
|----------|-------|
| Tag | `APPT` |
| Routine | `HMPACT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC looks up patient appointments by date and location and returns  the following in a global array for patients that are not found in the  HMP SUBSCRIPTION file (#800000):       DFN^Appointment Date^Location Name^Location IEN

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STARTDT | LITERAL | No |
| 2 | ENDDATE | LITERAL | No |
| 3 | LOCIEN | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-patient-sched-sync`

---

### `HMP PATIENT ADMIT SYNC`

| Property | Value |
|----------|-------|
| Tag | `ADMIT` |
| Routine | `HMPACT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC looks up patient admissions by location and returns the  following in a global array for patients that are not found in the HMP  SUBSCRIPTION file (#800000):       DFN^Admission Date^Location Name^Room-Bed^Location IEN       The Room-Bed may not be populated for all locations.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCIEN | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-patient-admit-sync`

---

### `HMP CHKXTMP`

| Property | Value |
|----------|-------|
| Tag | `CHKXTMP` |
| Routine | `HMPMONX` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure returns information about the eHMP storage size  in ^XTMP and the number of patients in the queue.  The site hash plus  the local date and time are also returned.    No input parameters are required.

**API Endpoint:** `GET /vista/hmp/rpc/hmp-chkxtmp`

---

### `HMP GLOBAL SIZE`

| Property | Value |
|----------|-------|
| Tag | `SIZE` |
| Routine | `HMPMONX` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Remote procedure HMP GLOBAL SIZE takes no input parameters; it returns  the size of eHMP's current usage of the ^XTMP global.

**API Endpoint:** `GET /vista/hmp/rpc/hmp-global-size`

---

### `HMP DEFAULT PATIENT LIST`

| Property | Value |
|----------|-------|
| Tag | `DEFLIST` |
| Routine | `HMPPDL` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC will return the default patient list for a specific provider.  Input parameter is the provider's DUZ. Out put is an array with the  patient's DFN^Patient Name^Patient Location.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUZ | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-default-patient-list`

---

### `HMP PATIENT SELECT`

| Property | Value |
|----------|-------|
| Tag | `SELECT` |
| Routine | `HMPPTRPC` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Selects patients by search criteria and returns basic patient and demographic information for patients found in search.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CRITERIA | LITERAL | No |
| 2 | SEARCH TERM | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-patient-select`

---

### `HMP SUBSCRIPTION STATUS`

| Property | Value |
|----------|-------|
| Tag | `SUBSTA` |
| Routine | `HMPTOOLS` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC checks the subscription status for a single patient and returns. the result as a JSON containing code and text values.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARGS | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-subscription-status`

---

### `HMP MED ORDER CHECKS`

| Property | Value |
|----------|-------|
| Tag | `ORCHECK` |
| Routine | `HMPWBM1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 7 |

**Description:** This RPC wraps the broker calls for both ORWDXC ACCEPT and ORCHECK  GETXTRA into a single call.  It will use the same inputs as the ORWDXC  ACCEPT RPC; but will combine the outputs from both broker calls into a  single return.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | FID | LITERAL | No |
| 3 | STRT | LITERAL | No |
| 4 | ORL | LITERAL | No |
| 5 | OIL | WORD-PROCESSING | No |
| 6 | ORIFN | LITERAL | No |
| 7 | ORREN | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-med-order-checks`

---

### `HMP GET RELATED ORDERS`

| Property | Value |
|----------|-------|
| Tag | `RELATED` |
| Routine | `HMPORRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns the parent, children, and/or siblings (orders that share the same parent) of an order from the ORDER (#100) FILE in JSON format.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORDER IEN | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-get-related-orders`

---

### `HMP WRITEBACK VITAL`

| Property | Value |
|----------|-------|
| Tag | `VMADD` |
| Routine | `HMPWB2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC accepts writeback data from JDS and returns a JSON formatted acknowledgement message.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-writeback-vital`

---

### `HMP WRITEBACK VITAL EIE`

| Property | Value |
|----------|-------|
| Tag | `VMERR` |
| Routine | `HMPWB2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-writeback-vital-eie`

---

### `HMP WRITEBACK ENCOUNTERS`

| Property | Value |
|----------|-------|
| Tag | `ENC` |
| Routine | `HMPWB5` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-writeback-encounters`

---

### `HMP WRITEBACK ALLERGY`

| Property | Value |
|----------|-------|
| Tag | `ALLERGY` |
| Routine | `HMPWB1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-writeback-allergy`

---

### `HMP WRITEBACK ALLERGY EIE`

| Property | Value |
|----------|-------|
| Tag | `ALLEIE` |
| Routine | `HMPWB1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-writeback-allergy-eie`

---

### `HMP WRITEBACK SIGN ORDERS`

| Property | Value |
|----------|-------|
| Tag | `SIGN` |
| Routine | `HMPWBSO` |
| Return Type | ARRAY |
| Parameter Count | 5 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | ORNP | LITERAL | No |
| 3 | ORL | LITERAL | No |
| 4 | ES  | LITERAL | No |
| 5 | DATA | REFERENCE | No |

**API Endpoint:** `POST /vista/hmp/rpc/hmp-writeback-sign-orders`

---

### `HMP TIU LONG LIST OF TITLES`

| Property | Value |
|----------|-------|
| Tag | `LONGLIST` |
| Routine | `HMPTIUL` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** HMP TIU LONG LIST OF NOTE TITLES

**API Endpoint:** `GET /vista/hmp/rpc/hmp-tiu-long-list-of-titles`

---

### `HMP RESOURCE VALUES`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `HMPRPCRC` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of the resource slots with a status of each slot.

**API Endpoint:** `GET /vista/hmp/rpc/hmp-resource-values`

---

### `HMP RESOURCE SLOT CLEAR`

| Property | Value |
|----------|-------|
| Tag | `CLEAR` |
| Routine | `HMPRPCRC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC will clear the specified slot for the HMP EXTRACT RESOURCE  resource device.   ***WARNING - IT IS UP TO THE USER TO BE SURE THEY ARE CLEARING THE  CORRECT SLOT FOR THE RESOURCE. ***

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SLOT | LITERAL | No |

**API Endpoint:** `GET /vista/hmp/rpc/hmp-resource-slot-clear`

---


## Menu Options

### Broker

| Name | Security Key |
|------|-------------|
| HMP UI CONTEXT | — |
| HMP SYNCHRONIZATION CONTEXT | — |
| HMP PATIENT ACTIVITY | — |
| HMP APPLICATION PROXY | — |
| HMP WB PTDEM | — |
| HMP WB DOMAINS | — |

### Action

| Name | Security Key |
|------|-------------|
| HMP APPOINTMENTS | — |
| HMP PATIENT DATA MONITOR | — |
| HMP XU EVENTS | — |
| HMP MONITOR FOR XTMP GLOBAL | — |

### Run routine

| Name | Security Key |
|------|-------------|
| HMP EVENT PURGE | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/hmp/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/hmp/rpc/hmp-patient-activity` | HMP PATIENT ACTIVITY | ARRAY |
| GET | `/vista/hmp/rpc/hmp-appointments` | HMP APPOINTMENTS | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-data-version` | HMP DATA VERSION | SINGLE VALUE |
| POST | `/vista/hmp/rpc/hmp-delete-object` | HMP DELETE OBJECT | SINGLE VALUE |
| GET | `/vista/hmp/rpc/hmp-get-checksum` | HMP GET CHECKSUM | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-get-object` | HMP GET OBJECT | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-get-operational-data` | HMP GET OPERATIONAL DATA | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-get-patient-data` | HMP GET PATIENT DATA | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-get-patient-data-json` | HMP GET PATIENT DATA JSON | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-get-reference-data` | HMP GET REFERENCE DATA | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-inpatients` | HMP INPATIENTS | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-put-demographics` | HMP PUT DEMOGRAPHICS | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-put-object` | HMP PUT OBJECT | SINGLE VALUE |
| GET | `/vista/hmp/rpc/hmp-put-patient-data` | HMP PUT PATIENT DATA | SINGLE VALUE |
| GET | `/vista/hmp/rpc/hmp-subscribe` | HMP SUBSCRIBE | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-writeback-pt-dem` | HMP WRITEBACK PT DEM | ARRAY |
| GET | `/vista/hmp/rpc/hmpcprs-rpc` | HMPCPRS RPC | WORD PROCESSING |
| GET | `/vista/hmp/rpc/hmpcrpc-rpc` | HMPCRPC RPC | WORD PROCESSING |
| GET | `/vista/hmp/rpc/hmpcrpc-rpcchain` | HMPCRPC RPCCHAIN | WORD PROCESSING |
| GET | `/vista/hmp/rpc/hmpdjfs-api` | HMPDJFS API | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmpdjfs-delsub` | HMPDJFS DELSUB | SINGLE VALUE |
| GET | `/vista/hmp/rpc/hmpfptc-chks` | HMPFPTC CHKS | WORD PROCESSING |
| GET | `/vista/hmp/rpc/hmpfptc-log` | HMPFPTC LOG | WORD PROCESSING |
| GET | `/vista/hmp/rpc/hmp-local-correspondingids` | HMP LOCAL CORRESPONDINGIDS | WORD PROCESSING |
| GET | `/vista/hmp/rpc/hmp-put-operational-data` | HMP PUT OPERATIONAL DATA | SINGLE VALUE |
| GET | `/vista/hmp/rpc/hmp-patient-sched-sync` | HMP PATIENT SCHED SYNC | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-patient-admit-sync` | HMP PATIENT ADMIT SYNC | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-chkxtmp` | HMP CHKXTMP | ARRAY |
| GET | `/vista/hmp/rpc/hmp-global-size` | HMP GLOBAL SIZE | ARRAY |
| GET | `/vista/hmp/rpc/hmp-default-patient-list` | HMP DEFAULT PATIENT LIST | ARRAY |
| GET | `/vista/hmp/rpc/hmp-patient-select` | HMP PATIENT SELECT | ARRAY |
| GET | `/vista/hmp/rpc/hmp-subscription-status` | HMP SUBSCRIPTION STATUS | ARRAY |
| GET | `/vista/hmp/rpc/hmp-med-order-checks` | HMP MED ORDER CHECKS | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-get-related-orders` | HMP GET RELATED ORDERS | ARRAY |
| GET | `/vista/hmp/rpc/hmp-writeback-vital` | HMP WRITEBACK VITAL | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-writeback-vital-eie` | HMP WRITEBACK VITAL EIE | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-writeback-encounters` | HMP WRITEBACK ENCOUNTERS | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-writeback-allergy` | HMP WRITEBACK ALLERGY | GLOBAL ARRAY |
| GET | `/vista/hmp/rpc/hmp-writeback-allergy-eie` | HMP WRITEBACK ALLERGY EIE | GLOBAL ARRAY |
| POST | `/vista/hmp/rpc/hmp-writeback-sign-orders` | HMP WRITEBACK SIGN ORDERS | ARRAY |
| GET | `/vista/hmp/rpc/hmp-tiu-long-list-of-titles` | HMP TIU LONG LIST OF TITLES | ARRAY |
| GET | `/vista/hmp/rpc/hmp-resource-values` | HMP RESOURCE VALUES | ARRAY |
| GET | `/vista/hmp/rpc/hmp-resource-slot-clear` | HMP RESOURCE SLOT CLEAR | SINGLE VALUE |
