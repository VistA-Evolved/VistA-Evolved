# Scheduling (SD)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Clinic setup, appointment types, scheduling, check-in/out

| Property | Value |
|----------|-------|
| Namespace | `SD` |
| Tier | 5 |
| FileMan Files | 5 |
| RPCs | 225 |
| Menu Options | 60 |
| VDL Manual | `pims-registration-scheduling-tm.pdf` |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 44 | File #44 | ? | ? |
| 409.84 | File #409.84 | ? | ? |
| 409.85 | File #409.85 | ? | ? |
| 44.003 | File #44.003 | ? | ? |
| 409.68 | File #409.68 | ? | ? |

## Remote Procedure Calls (RPCs)

### `SD W/L RETRIVE FULL DATA`

| Property | Value |
|----------|-------|
| Tag | `OUTPUT` |
| Routine | `SDWLRP1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns a Wait List data in SDWL(409.3,DA,0). This will only  return the zero (0) node of the file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Patient IEN (DFN) | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-retrive-full-data`

---

### `SD W/L CREATE FILE`

| Property | Value |
|----------|-------|
| Tag | `INPUT` |
| Routine | `SDWLRP1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC creates a Patient Wait List file for PCMM (GUI).

**API Endpoint:** `POST /vista/sd/rpc/sd-w/l-create-file`

---

### `SD W/L RETRIVE BRIEF`

| Property | Value |
|----------|-------|
| Tag | `OUTPUT1` |
| Routine | `SDWLRP1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC retrieves a brief output for Wait List data for a specific  Patient.

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-retrive-brief`

---

### `SD W/L RETRIVE MEDICAL REVIEW`

| Property | Value |
|----------|-------|
| Tag | `OUTPUT2` |
| Routine | `SDWLRP1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-retrive-medical-review`

---

### `SD W/L RETRIVE DISPOSITION`

| Property | Value |
|----------|-------|
| Tag | `OUTPUT3` |
| Routine | `SDWLRP1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-retrive-disposition`

---

### `SD W/L RETRIVE INSTITUTION(#4)`

| Property | Value |
|----------|-------|
| Tag | `OUTIN` |
| Routine | `SDWLRP2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-retrive-institution(#4)`

---

### `SD W/L RETRIVE CLINIC(#409.32)`

| Property | Value |
|----------|-------|
| Tag | `OUTSC0` |
| Routine | `SDWLRP2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-retrive-clinic(#409.32)`

---

### `SD W/L RETRIVE HOSP LOC(#44)`

| Property | Value |
|----------|-------|
| Tag | `OUTSC2` |
| Routine | `SDWLRP2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-retrive-hosp-loc(#44)`

---

### `SD W/L RETRIVE TEAM(#404.51)`

| Property | Value |
|----------|-------|
| Tag | `OUTST` |
| Routine | `SDWLRP2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-retrive-team(#404.51)`

---

### `SD W/L RETRIVE TM POS(404.57)`

| Property | Value |
|----------|-------|
| Tag | `OUTSP` |
| Routine | `SDWLRP2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-retrive-tm-pos(404.57)`

---

### `SD W/L RETRIVE SER/SP(409.31)`

| Property | Value |
|----------|-------|
| Tag | `OUTSS` |
| Routine | `SDWLRP2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-retrive-ser/sp(409.31)`

---

### `SD W/L RETRIVE PERSON(200)`

| Property | Value |
|----------|-------|
| Tag | `OUTPROV` |
| Routine | `SDWLRP2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-retrive-person(200)`

---

### `SD W/L PRIORITY(#409.3)`

| Property | Value |
|----------|-------|
| Tag | `SDPRIOUT` |
| Routine | `SDWLRP3` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-priority(#409.3)`

---

### `SD W/L REQ BY(409.3)`

| Property | Value |
|----------|-------|
| Tag | `SDREQOUT` |
| Routine | `SDWLRP3` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-req-by(409.3)`

---

### `SD W/L TYPE(409.3)`

| Property | Value |
|----------|-------|
| Tag | `SDTYOUT` |
| Routine | `SDWLRP3` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-type(409.3)`

---

### `SD W/L DISPOSITION(409.3)`

| Property | Value |
|----------|-------|
| Tag | `SDDISOUT` |
| Routine | `SDWLRP3` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-disposition(409.3)`

---

### `SD W/L CURRENT STATUS(409.3)`

| Property | Value |
|----------|-------|
| Tag | `SDSTOUT` |
| Routine | `SDWLRP3` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-current-status(409.3)`

---

### `SD W/L PACKAGE(409.3)`

| Property | Value |
|----------|-------|
| Tag | `SDPACOUT` |
| Routine | `SDWLRP3` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-package(409.3)`

---

### `SD W/L NEW ENROLLEE(409.3)`

| Property | Value |
|----------|-------|
| Tag | `SDNEOUT` |
| Routine | `SDWLRP3` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-new-enrollee(409.3)`

---

### `SD W/L CREATE DISPOSITION`

| Property | Value |
|----------|-------|
| Tag | `INPUTD` |
| Routine | `SDWLRP1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `POST /vista/sd/rpc/sd-w/l-create-disposition`

---

### `SD W/L CREATE M/R`

| Property | Value |
|----------|-------|
| Tag | `INPUTMR` |
| Routine | `SDWLRP1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `POST /vista/sd/rpc/sd-w/l-create-m/r`

---

### `SD W/L IMPORT API`

| Property | Value |
|----------|-------|
| Tag | `INPUT` |
| Routine | `SDWLRP4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-w/l-import-api`

---

### `SD GET PATIENT APPOINTMENTS`

| Property | Value |
|----------|-------|
| Tag | `GETAPTS` |
| Routine | `SDMRPC1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | DATE | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-get-patient-appointments`

---

### `SD GET CLINIC DETAILS`

| Property | Value |
|----------|-------|
| Tag | `GETCLN` |
| Routine | `SDMRPC1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINIC | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-get-clinic-details`

---

### `SD GET CLINICS BY NAME`

| Property | Value |
|----------|-------|
| Tag | `LSTCLNS` |
| Routine | `SDMRPC1` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SEARCH | LITERAL | No |
| 2 | START | REFERENCE | No |
| 3 | NUMBER | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-get-clinics-by-name`

---

### `SD APPOINTMENT MAKE`

| Property | Value |
|----------|-------|
| Tag | `MAKE` |
| Routine | `SDMRPC2` |
| Return Type | ARRAY |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | CLINIC | LITERAL | No |
| 3 | APPDATE | LITERAL | No |
| 4 | TYPE | LITERAL | No |
| 5 | LEN | LITERAL | No |
| 6 | LVL | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-appointment-make`

---

### `SD APPOINTMENT CHECK`

| Property | Value |
|----------|-------|
| Tag | `CHKAPP` |
| Routine | `SDMRPC2` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINIC | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | DATE | LITERAL | No |
| 4 | LEN | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-appointment-check`

---

### `SD APPOINTMENT CHECK-IN`

| Property | Value |
|----------|-------|
| Tag | `CHECKIN` |
| Routine | `SDMRPC2` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | DATE | LITERAL | No |
| 3 | CLINIC | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-appointment-check-in`

---

### `SD APPOINTMENT CANCEL`

| Property | Value |
|----------|-------|
| Tag | `CANCEL` |
| Routine | `SDMRPC2` |
| Return Type | ARRAY |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | CLINIC | LITERAL | No |
| 3 | DATE | LITERAL | No |
| 4 | TYPE | LITERAL | No |
| 5 | REASON | LITERAL | No |
| 6 | REMARKS | LITERAL | No |

**API Endpoint:** `POST /vista/sd/rpc/sd-appointment-cancel`

---

### `SD APPOINTMENT LIST BY NAME`

| Property | Value |
|----------|-------|
| Tag | `LSTAPPT` |
| Routine | `SDMRPC2` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SEARCH | LITERAL | No |
| 2 | START | LITERAL | No |
| 3 | NUMBER | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-appointment-list-by-name`

---

### `SD GET APPOINTMENT TYPE`

| Property | Value |
|----------|-------|
| Tag | `GETAPPT` |
| Routine | `SDMRPC2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TYPE | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-get-appointment-type`

---

### `SD GET ELIGIBILITY DETAILS`

| Property | Value |
|----------|-------|
| Tag | `GETELIG` |
| Routine | `SDMRPC2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ELIGIBILITY | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-get-eligibility-details`

---

### `SD GET CLINIC AVAILABILITY`

| Property | Value |
|----------|-------|
| Tag | `SLOTS` |
| Routine | `SDMRPC1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINIC | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-get-clinic-availability`

---

### `SD HAS PATIENT PENDING APPTS`

| Property | Value |
|----------|-------|
| Tag | `HASPEND` |
| Routine | `SDMRPC1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | DATE | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-has-patient-pending-appts`

---

### `SD GET PATIENT PENDING APPTS`

| Property | Value |
|----------|-------|
| Tag | `GETPEND` |
| Routine | `SDMRPC1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | DATE | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-get-patient-pending-appts`

---

### `SD VALID CLINIC STOP CODE`

| Property | Value |
|----------|-------|
| Tag | `CLNCK` |
| Routine | `SDMRPC1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLN | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-valid-clinic-stop-code`

---

### `SD VERIFY CLINIC ACCESS`

| Property | Value |
|----------|-------|
| Tag | `CLNRGHT` |
| Routine | `SDMRPC1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLN | LITERAL | No |

**API Endpoint:** `POST /vista/sd/rpc/sd-verify-clinic-access`

---

### `SD VALID STOP CODE`

| Property | Value |
|----------|-------|
| Tag | `CLNVSC` |
| Routine | `SDMRPC1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STOPCODE | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-valid-stop-code`

---

### `SD GET FIRST AVAILABLE APPT`

| Property | Value |
|----------|-------|
| Tag | `FRSTAVBL` |
| Routine | `SDMRPC1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINIC | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-get-first-available-appt`

---

### `SD APPOINTMENT MAKE UNSCH`

| Property | Value |
|----------|-------|
| Tag | `MAKEUS` |
| Routine | `SDMRPC2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-appointment-make-unsch`

---

### `SD APPOINTMENT NOSHOW`

| Property | Value |
|----------|-------|
| Tag | `NOSHOW` |
| Routine | `SDMRPC2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-appointment-noshow`

---

### `SD APPOINTMENT CHECK-OUT`

| Property | Value |
|----------|-------|
| Tag | `CHECKO` |
| Routine | `SDMRPC4` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-appointment-check-out`

---

### `SD APPOINTMENT CHECK-OUT DEL`

| Property | Value |
|----------|-------|
| Tag | `DELCO` |
| Routine | `SDMRPC4` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-appointment-check-out-del`

---

### `SD LIST CANCELLATION REASONS`

| Property | Value |
|----------|-------|
| Tag | `LSTCRSNS` |
| Routine | `SDMRPC1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-list-cancellation-reasons`

---

### `SD EWL LIST`

| Property | Value |
|----------|-------|
| Tag | `LISTEWL` |
| Routine | `SDMRPC1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-ewl-list`

---

### `SD EWL DETAIL`

| Property | Value |
|----------|-------|
| Tag | `DETALEWL` |
| Routine | `SDMRPC1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-ewl-detail`

---

### `SD EWL NEW`

| Property | Value |
|----------|-------|
| Tag | `NEWEWL` |
| Routine | `SDMRPC1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-ewl-new`

---

### `SD EWL DISPOSITION`

| Property | Value |
|----------|-------|
| Tag | `DISPEWL` |
| Routine | `SDMRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-ewl-disposition`

---

### `SD EWL DELETE`

| Property | Value |
|----------|-------|
| Tag | `DELEWL` |
| Routine | `SDMRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `POST /vista/sd/rpc/sd-ewl-delete`

---

### `SD EWL IS PATIENT ON LIST`

| Property | Value |
|----------|-------|
| Tag | `ISEWL` |
| Routine | `SDMRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-ewl-is-patient-on-list`

---

### `SD EWL UPDATE`

| Property | Value |
|----------|-------|
| Tag | `UPDTEWL` |
| Routine | `SDMRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `POST /vista/sd/rpc/sd-ewl-update`

---

### `SD GET SCHDULING REQUEST TYPES`

| Property | Value |
|----------|-------|
| Tag | `LSTSRT` |
| Routine | `SDMRPC1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/sd/rpc/sd-get-schduling-request-types`

---

### `SD RECALL FACILITY LIST`

| Property | Value |
|----------|-------|
| Tag | `RECALL` |
| Routine | `SDRPCLV` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC returns the EWL for the facility.

**API Endpoint:** `GET /vista/sd/rpc/sd-recall-facility-list`

---

### `SD RECALL LIST BY PATIENT`

| Property | Value |
|----------|-------|
| Tag | `RCLDFN` |
| Routine | `SDRPCLV` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC returns entries from the Facility EWL for a specific patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-recall-list-by-patient`

---

### `SD WAIT LIST BY DFN`

| Property | Value |
|----------|-------|
| Tag | `EWL` |
| Routine | `SDRPCLV` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns the EWL for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-wait-list-by-dfn`

---

### `SD FACILITY NEAR LIST`

| Property | Value |
|----------|-------|
| Tag | `NEARLST` |
| Routine | `SDRPCLV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** This RPC returns the facility New Enrollee Appointment Request list.

**API Endpoint:** `GET /vista/sd/rpc/sd-facility-near-list`

---

### `SD PATIENT NEAR LIST`

| Property | Value |
|----------|-------|
| Tag | `NEARDFN` |
| Routine | `SDRPCLV` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC will return data if the patient is on the Facility NEAR List.      INPUT: Patient DFN  ;  Output:  ;  If the patient is on the NEAR List, returns the array:  ;    DFN^PATIENTNAME^SSN^ELIGIBILITY CODE INTERNAL^ELIGIBILITY CODE EXTERNAL^HOME PHONE^CELL PHONE^DATE^SITE  ;    DFN = PATIENT ID

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-patient-near-list`

---

### `SD FACILITY WAIT LIST`

| Property | Value |
|----------|-------|
| Tag | `FACEWL` |
| Routine | `SDRPCLV` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC will return the full Facility Electronic Wait List.   No input parameters are needed.

**API Endpoint:** `GET /vista/sd/rpc/sd-facility-wait-list`

---

### `SD UPDATE NEAR LIST`

| Property | Value |
|----------|-------|
| Tag | `EDITNEAR` |
| Routine | `SDRPCLV` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Description:** This RPC will update the NEAR list.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | STATUS | LITERAL | No |
| 3 | COMM | LITERAL | No |

**API Endpoint:** `POST /vista/sd/rpc/sd-update-near-list`

---

### `SD PATIENT PENDING APPT`

| Property | Value |
|----------|-------|
| Tag | `GETPEND` |
| Routine | `SDRPCL1` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** this RPC will return data about pending appointments for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | DATE | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-patient-pending-appt`

---

### `SD PROVIDER TO CLINICS`

| Property | Value |
|----------|-------|
| Tag | `PROVCLIN` |
| Routine | `SDRPCL1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC returns a list of clinics a provider is associated with at a  medical center.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PROVIDER | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-provider-to-clinics`

---

### `SD REMOVE FROM RECALL LIST`

| Property | Value |
|----------|-------|
| Tag | `REMREC` |
| Routine | `SDRPCL1` |
| Return Type | ARRAY |
| Parameter Count | 5 |

**Description:** This RPC will remove a patient from a Recall List.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | CLINIC ID | LITERAL | No |
| 3 | PROVIDER | LITERAL | No |
| 4 | RECALLDT | LITERAL | No |
| 5 | PTRECDT | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-remove-from-recall-list`

---

### `SD CANCEL APPOINTMENT`

| Property | Value |
|----------|-------|
| Tag | `CANCEL` |
| Routine | `SDRPCL2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 6 |

**Description:** Allows cancel of an appointment

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | CLINC | LITERAL | No |
| 3 | DATE | LITERAL | No |
| 4 | TYPE | LITERAL | No |
| 5 | REASON | LITERAL | No |
| 6 | REMARKS | LITERAL | No |

**API Endpoint:** `POST /vista/sd/rpc/sd-cancel-appointment`

---

### `SD REMOVE FROM EWL`

| Property | Value |
|----------|-------|
| Tag | `UPDTEWL` |
| Routine | `SDRPCL1` |
| Return Type | ARRAY |
| Parameter Count | 4 |

**Description:** This RPC removes a patient from the EWL.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | SDWLIEN | LITERAL | No |
| 3 | SDWLDATA | REFERENCE | No |
| 4 | SDWLDISP | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-remove-from-ewl`

---

### `SD ADDITIONAL CLINIC DETAILS`

| Property | Value |
|----------|-------|
| Tag | `CLNDATA` |
| Routine | `SDRPCL2` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC will return additional clinic details that are not returned by a  DDR Lister RPC call. The RPC uses the pointers to pull the free text  names from the pointed to files.   Data returned are:   Treating Specialty Stop Code  Credit Stop Code Specialty

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINICID | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-additional-clinic-details`

---

### `SD ADD TO RECALL LIST`

| Property | Value |
|----------|-------|
| Tag | `RECALL` |
| Routine | `SDRPCL2` |
| Return Type | ARRAY |
| Parameter Count | 10 |

**Description:** This RPC adds a patient to the facility Recall List.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | CLINIC | LITERAL | No |
| 3 | RECALLDT | LITERAL | No |
| 4 | PTRECDT | LITERAL | No |
| 5 | PROVIDER | LITERAL | No |
| 6 | LEN | LITERAL | No |
| 7 | FAST | LITERAL | No |
| 8 | TEST | LITERAL | No |
| 9 | USER | LITERAL | No |
| 10 | COMMENTS | LITERAL | No |

**API Endpoint:** `POST /vista/sd/rpc/sd-add-to-recall-list`

---

### `SD VERIFY ACCESS TO CLINIC`

| Property | Value |
|----------|-------|
| Tag | `CLNRGHT` |
| Routine | `SDRPCL2` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC returns a flag indicating the user has access to schedule  appointments in a restricted clinic.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINICID | LITERAL | No |

**API Endpoint:** `POST /vista/sd/rpc/sd-verify-access-to-clinic`

---

### `SD NEW EWL ENTRY`

| Property | Value |
|----------|-------|
| Tag | `NEWEWL` |
| Routine | `SDRPCL2` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC will add a patient to the electronic wait list.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDWLD | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-new-ewl-entry`

---

### `SD PATIENT ADMISSIONS`

| Property | Value |
|----------|-------|
| Tag | `ADMITS` |
| Routine | `SDRPCL3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC retrieves all admissions for the last year for a specific  patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-patient-admissions`

---

### `SD NO PATIENT CSLT LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `CSLTNP` |
| Routine | `SDRPCL4` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** This RPC provides the means to look up a list of consults without the  patient being in context.   Filtering is provided by:     Start Date   End Date   Consulting Service   Consult Status   Ordering (sending) Provider   Start and End dates are optional.  The search will be limited to 90 days  by de

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORSDT | LITERAL | No |
| 2 | OREDT | LITERAL | No |
| 3 | ORSERV | LITERAL | No |
| 4 | ORSTATUS | LITERAL | No |
| 5 | ORPROV | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-no-patient-cslt-lookup`

---

### `SDECLOC PRIVLOC`

| Property | Value |
|----------|-------|
| Tag | `PRIVLOC` |
| Routine | `SDECLOC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns Privileged User data for Hospital Locations.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecloc-privloc`

---

### `SDECRMG RMG`

| Property | Value |
|----------|-------|
| Tag | `RMG` |
| Routine | `SDECRMG` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns data from the ^XTMP("SDECIDX",$J,"XREF" global. This call uses the filter and sort arrays passed in to return data in the  desired format. This call returns a list of items by a key.   Per SD*5.3*784, MAX RECS ACCUMULATED (#5) field has been added and Input Parameters were defined t

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MAXREC | LITERAL | No |
| 2 | LASTSUB | LITERAL | No |
| 3 | FILTER | REFERENCE | No |
| 4 | SORT | REFERENCE | No |
| 5 | MGIENS | LITERAL | No |
| 6 | SDMAX | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecrmg-rmg`

---

### `SDECRMG RECCNT`

| Property | Value |
|----------|-------|
| Tag | `RECCNT` |
| Routine | `SDECRMG1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the number of entries in the filter call in  ^TMP("SDECIDX",$J,"COUNT") node.

**API Endpoint:** `GET /vista/sd/rpc/sdecrmg-reccnt`

---

### `SDECIDX RECCNT`

| Property | Value |
|----------|-------|
| Tag | `RECCNT` |
| Routine | `SDECIDX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the number of entries in the ^XTMP("SDEC","IDX","COUNT") node.

**API Endpoint:** `GET /vista/sd/rpc/sdecidx-reccnt`

---

### `SDECIDX GETREC`

| Property | Value |
|----------|-------|
| Tag | `GETREC` |
| Routine | `SDECIDX` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns content from the ^XTMP("SDEC","IDX" global and serves as  the default start up list.  The records are sorted by: Priority Group   SVC %     Desired Date       Origination Date

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LASTREC | LITERAL | No |
| 2 | MAXREC | LITERAL | No |
| 3 | STYLE | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecidx-getrec`

---

### `SDECLOC UPDPRIV`

| Property | Value |
|----------|-------|
| Tag | `UPDPRIV` |
| Routine | `SDECLOC` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Supports updating the list of privileged users for a hospital location. This RPC will purge existing entries and populate with the passed array.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOC | LITERAL | No |
| 2 | LST | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecloc-updpriv`

---

### `SDECAR ARMRTC`

| Property | Value |
|----------|-------|
| Tag | `ARMRTC` |
| Routine | `SDECAR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** GET the number of MRTC appointments made for this request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARIEN | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecar-armrtc`

---

### `SDECRMG2 URGENCY`

| Property | Value |
|----------|-------|
| Tag | `URGENCY` |
| Routine | `SDECRMG2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GET valid urgency protocol values that are used in the URGENCY field 5 of  the REQUEST CONSULTATION file 123.

**API Endpoint:** `GET /vista/sd/rpc/sdecrmg2-urgency`

---

### `SDECAR ARAPPT`

| Property | Value |
|----------|-------|
| Tag | `ARAPPT` |
| Routine | `SDECAR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** GET appointment request for given SDEC APPOINTMENT id.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDAPPT | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecar-arappt`

---

### `SDECLK LOCK`

| Property | Value |
|----------|-------|
| Tag | `LOCK` |
| Routine | `SDECLK` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC attempts to lock a request record. Request records are in one of these files: SDEC APPT REQUEST REQUEST/CONSULTATION SD WAIT LIST RECALL REMINDERS

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REQ | LITERAL | No |

**API Endpoint:** `POST /vista/sd/rpc/sdeclk-lock`

---

### `SDECLK UNLOCK`

| Property | Value |
|----------|-------|
| Tag | `UNLOCK` |
| Routine | `SDECLK` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC unlocks the request record that was locked using SDECLK LOCK.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REQ | LITERAL | No |
| 2 | FLG | LITERAL | No |

**API Endpoint:** `POST /vista/sd/rpc/sdeclk-unlock`

---

### `SDECDIS DISABIL`

| Property | Value |
|----------|-------|
| Tag | `DISABIL` |
| Routine | `SDECDIS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** GET rated disabilities for the given patient

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecdis-disabil`

---

### `SDECDEV DEVICE`

| Property | Value |
|----------|-------|
| Tag | `DEVICE` |
| Routine | `SDECDEV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** List of devices in the device file that are active printers.

**API Endpoint:** `GET /vista/sd/rpc/sdecdev-device`

---

### `SD VSE REPORT RPC`

| Property | Value |
|----------|-------|
| Tag | `REPORT` |
| Routine | `SDECXML` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns Scheduling appointment and encounter report data in XML format.  The report data will be exclusive to one of three report types:     Mental Health     Primary Care     Specialty Care The returned data will be aggregated for the requested date range.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDRPTLST | LITERAL | No |
| 2 | SDBEGRNG | LITERAL | No |
| 3 | SDENDRNG | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sd-vse-report-rpc`

---

### `SD VSE FILTER RPC`

| Property | Value |
|----------|-------|
| Tag | `GETFLT` |
| Routine | `SDECXML` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the available Report Types, Date Increments, and specific Dates for which Scheduling Report data is available.  Data is returned is XML format. Example:

**API Endpoint:** `GET /vista/sd/rpc/sd-vse-filter-rpc`

---

### `SDECAR AUDITGET`

| Property | Value |
|----------|-------|
| Tag | `AUDITGET` |
| Routine | `SDECAR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** GET entries from VS AUDIT field of SDEC APPT REQUEST file 409.85.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARIEN | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecar-auditget`

---

### `SDECWL AUDITGET`

| Property | Value |
|----------|-------|
| Tag | `AUDITGET` |
| Routine | `SDECWL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** GET entries from VS AUDIT field of SD WAIT LIST file 409.3.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | WLIEN | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecwl-auditget`

---

### `SDECCAP GET`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `SDECCAP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** GET entries from 2507 REQUEST file 396.3

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | SDCL | LITERAL | No |
| 3 | SDT | LITERAL | No |
| 4 | TYPE | LITERAL | No |
| 5 | APTYPE | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdeccap-get`

---

### `SDECCAP SET`

| Property | Value |
|----------|-------|
| Tag | `SET` |
| Routine | `SDECCAP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** SET entries to AMIE C&P EXAM TRACKING file 396.95 and update file 396.3

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REQIEN | LITERAL | No |
| 2 | APPTLNK | LITERAL | No |
| 3 | VETREQ | LITERAL | No |
| 4 | SDCL | LITERAL | No |
| 5 | SDT | LITERAL | No |

**API Endpoint:** `POST /vista/sd/rpc/sdeccap-set`

---

### `SDECCAP CAN`

| Property | Value |
|----------|-------|
| Tag | `CAN` |
| Routine | `SDECCAP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** SET AMIE C&P EXAM TRACKING entry as cancel

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | SDCL | LITERAL | No |
| 3 | SDT | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdeccap-can`

---

### `SDECAPP GETYPE`

| Property | Value |
|----------|-------|
| Tag | `GETYPE` |
| Routine | `SDECAPP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** GET Appointment Type for the given SDEC APPOINTMENT.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDIEN | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecapp-getype`

---

### `SDECAR ARMULT`

| Property | Value |
|----------|-------|
| Tag | `ARMULT` |
| Routine | `SDECAR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** SET MULT APPTS MADE multiple in SDEC APPT REQUEST file. All entries are removed and replaced by the values in MULT.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARIEN | LITERAL | No |
| 2 | MULT | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecar-armult`

---

### `SDECDEM MARITAL`

| Property | Value |
|----------|-------|
| Tag | `MARITAL` |
| Routine | `SDECDEM` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GET Marital status entries from the MARITAL STATUS file (#11).

**API Endpoint:** `GET /vista/sd/rpc/sdecdem-marital`

---

### `SDECDEM RELIGION`

| Property | Value |
|----------|-------|
| Tag | `RELIGION` |
| Routine | `SDECDEM` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GET Religious preference entries from the RELITION file (#13).

**API Endpoint:** `GET /vista/sd/rpc/sdecdem-religion`

---

### `SDECDEM ZIPLINK`

| Property | Value |
|----------|-------|
| Tag | `ZIPLINK` |
| Routine | `SDECDEM` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** GET linked cities/state/etc for given zip code.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ZIP | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecdem-ziplink`

---

### `SDECAR3 AREDIT`

| Property | Value |
|----------|-------|
| Tag | `AREDIT` |
| Routine | `SDECAR3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 10 |
| Status | Inactive (may still be callable) |

**Description:** SET the values for Appointment Type, Requested By, Provider, Comment,  Fast/Non-Fasting, Length of Appt., Clinic, and Service Specialty to the  appropriate file based on the request type.  Request types are  Appointment Request, Electronic Wait List, and Recall Reminders.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ATYPE | LITERAL | No |
| 2 | COMMENT | LITERAL | No |
| 3 | FAST | LITERAL | No |
| 4 | IEN | LITERAL | No |
| 5 | LOA | LITERAL | No |
| 6 | PROV | LITERAL | No |
| 7 | REQBY | LITERAL | No |
| 8 | SDCL | LITERAL | No |
| 9 | SDSTOP | LITERAL | No |
| 10 | TYP | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecar3-aredit`

---

### `SDECRMGP GETRMGUP`

| Property | Value |
|----------|-------|
| Tag | `GETRMGUP` |
| Routine | `SDECRMGP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the values set for the user preference of the Request Manager  Grid Filter, Column Order, and Sort Order.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDECUSER | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecrmgp-getrmgup`

---

### `SDECRMGP PUTRMGUP`

| Property | Value |
|----------|-------|
| Tag | `PUTRMGUP` |
| Routine | `SDECRMGP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Store the user's preferences for the Request Manager Grid Filter, Column  Order, and Sort Order.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDECUSER | LITERAL | No |
| 2 | FILTERIN | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecrmgp-putrmgup`

---

### `SDEC57 OBM`

| Property | Value |
|----------|-------|
| Tag | `OBM` |
| Routine | `SDEC57` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** GET overbook status and return message.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCL | LITERAL | No |
| 2 | SDT | LITERAL | No |
| 3 | MRTC | LITERAL | No |
| 4 | USR | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdec57-obm`

---

### `SDECDEV PRINT`

| Property | Value |
|----------|-------|
| Tag | `PRINT` |
| Routine | `SDECDEV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Print patient letters.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | APID | LITERAL | No |
| 2 | TYPE | LITERAL | No |
| 3 | DID | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecdev-print`

---

### `SDECDEV DEV`

| Property | Value |
|----------|-------|
| Tag | `DEV` |
| Routine | `SDECDEV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** GET devices of the given type.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TYPE | LITERAL | No |
| 2 | MAX | LITERAL | No |
| 3 | LSUB | LITERAL | No |
| 4 | PARTIAL | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecdev-dev`

---

### `SDECU4 GETFONT`

| Property | Value |
|----------|-------|
| Tag | `GETFONT` |
| Routine | `SDECU4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** GET the VistA Scheduling letters default font size for the SYS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ENT | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecu4-getfont`

---

### `SDECU4 PUTFONT`

| Property | Value |
|----------|-------|
| Tag | `PUTFONT` |
| Routine | `SDECU4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Save the VistA Scheduling letters default font size based on Entity  provided.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ENT | LITERAL | No |
| 2 | VAL | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecu4-putfont`

---

### `SDEC01 CLINICS`

| Property | Value |
|----------|-------|
| Tag | `CLINICS` |
| Routine | `SDEC01` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** GET clinics for given stop code or matching stop code for given clinic.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STOP | LITERAL | No |
| 2 | SDCL | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdec01-clinics`

---

### `SDECAR1 ARGUID`

| Property | Value |
|----------|-------|
| Tag | `ARGUID` |
| Routine | `SDECAR1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns Appointment Request data (same as SDEC ARGET) for a VAOS  request.  Lookup is done on the GUID value.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GUID | LITERAL | No |

**API Endpoint:** `GET /vista/sd/rpc/sdecar1-arguid`

---

### `SDECSTNG HELPLINK`

| Property | Value |
|----------|-------|
| Tag | `HELPLINK` |
| Routine | `SDECSTNG` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns list of Help Link display names and associated URLs from the SDEC  Settings file (#409.98).  Entry 1 in the file contains national settings  for VS GUI.  Entry 2 contains local settings.

**API Endpoint:** `GET /vista/sd/rpc/sdecstng-helplink`

---

### `SDES2 CREATE CLINIC`

| Property | Value |
|----------|-------|
| Tag | `CREATECLINIC` |
| Routine | `SDES2CREATECLIN` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will add and define a new clinic in the HOSPITAL LOCATION file (#44).   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDCLINIC | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-create-clinic`

---

### `SDES2 EDIT CLINIC`

| Property | Value |
|----------|-------|
| Tag | `EDITCLINIC` |
| Routine | `SDES2EDITCLIN` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows clinic definition to be edited.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDCLINIC | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-edit-clinic`

---

### `SDES2 GET HOLIDAYS`

| Property | Value |
|----------|-------|
| Tag | `GETHOLIDAYS` |
| Routine | `SDES2GETHOLIDAYS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the Holidays from the holiday file. Start date and end  date may be passed, and are optional.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | PARAMS | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-holidays`

---

### `SDES2 GET REQUESTS BY INST`

| Property | Value |
|----------|-------|
| Tag | `GETREQUESTS` |
| Routine | `SDES2GREQSINST` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns all open appointment requests (up to 200 per request  type). If the station number is passed in, only records for that  station/institution will be returned.   If the station number parameter is passed in, it will only return records for the institution  associated with that station

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDAPPTREQS | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-requests-by-inst`

---

### `SDES2 GET PATIENT MED LIST`

| Property | Value |
|----------|-------|
| Tag | `GETMEDLIST` |
| Routine | `SDES2GETMEDLIST` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** An SDES2 Wrapper of the ORQQPS LIST RPC   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | PARAMS | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-patient-med-list`

---

### `SDES2 GET CONTACT ATTEMPTS`

| Property | Value |
|----------|-------|
| Tag | `GETCONTACTS` |
| Routine | `SDES2CONTACTS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the patient contact information stored in the SDEC  CONTACT (#409.86) file for the given appointment request.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | REQARRAY | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-contact-attempts`

---

### `SDES2 ADD CONTACT ATTEMPT`

| Property | Value |
|----------|-------|
| Tag | `ADDCONTACT` |
| Routine | `SDES2CONTACTS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC serves two functions.  1.) If no record exists for the given appointment request, it will create      a NEW record in the SDEC CONTACT file (#409.86), and add the first       contact attempt to the Date/Time of Contact subfile (#409.863)  2.) If there is already a contact in the SDEC CONTA

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | CONTACT | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-add-contact-attempt`

---

### `SDES2 SEARCH CLINIC ATTRIBUTES`

| Property | Value |
|----------|-------|
| Tag | `SEARCHCLIN` |
| Routine | `SDES2CLNSEARCH` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Given a whole or partial Clinic Name, Station Number (Opt), Date (Opt)  and Return Active Flag (Opt) return the matching clinics and their key attributes.   The RPC will search both the B x-ref based on the NAME (#.01 ) field and  then the C x-ref based on the ABBREVIATION (#1) field for matches.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDCLINIC | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-search-clinic-attributes`

---

### `SDES2 EDIT PAT PRE-REG`

| Property | Value |
|----------|-------|
| Tag | `EDITPREREG` |
| Routine | `SDES2EDITPREREG` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Updates patient pre-registration and associated files when a Vetlink  Kiosk pre-register event occurs.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | PARAMS | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-edit-pat-pre-reg`

---

### `SDES2 GET HELP LINKS`

| Property | Value |
|----------|-------|
| Tag | `GETLINKS` |
| Routine | `SDES2GETLINKS` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns data from the SDEC SETTINGS File (#409.98), HELP LINK TEXT  field (#1) multiple.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-help-links`

---

### `SDES2 GET PATIENT EP`

| Property | Value |
|----------|-------|
| Tag | `GETPTIN` |
| Routine | `SDES2EPT` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Provide Patient information when Patient DFN is given as input   The following fields are returned by the RPC:         POS (Period of Service) information         Status         Combat veteran         Prisoner of War         Last Admit / Lodger Date         SW Asia Conditions         Pager Number

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-patient-ep`

---

### `SDES2 RESTORE CLIN AVAIL`

| Property | Value |
|----------|-------|
| Tag | `RESTORE` |
| Routine | `SDES2RSTCAVAIL` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will allow the restore of clinic availability.  If the day was a  full day cancel, will restore full day.  If time periods (partial) day  cancellation were cancelled, then the RPC will restore a partial day for  the time period start time sent in.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SRESTORE | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-restore-clin-avail`

---

### `SDES2 REACTIVATE CLINIC`

| Property | Value |
|----------|-------|
| Tag | `REACTIVATECLIN` |
| Routine | `SDES2REACTTCLIN` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC reactivates a clinic from HOSPITAL LOCATION File (#44) IEN. It will remove the leading 'ZZ' from the clinic name if it doesn't create a name  conflict.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-reactivate-clinic`

---

### `SDES2 GET LAST SELECTED PAT`

| Property | Value |
|----------|-------|
| Tag | `GETSTOREDPATIENT` |
| Routine | `SDES2GETSTORDPAT` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the last selected patient by the user as well as  associated data.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | PARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-last-selected-pat`

---

### `SDES2 GET EXPANDED ENTRY`

| Property | Value |
|----------|-------|
| Tag | `GETEXPANDEDENTRY` |
| Routine | `SDES2GETEXPENTRY` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the expanded entry fields associated with the  appointment/patient.   DIAGNOSIS STOP CODES PROVIDERS PROCEDURES CLASSIFICATIONS   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | LITERAL | No |
| 2 | PATIENTDATA | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-expanded-entry`

---

### `SDES2 INACTIVATE CLINIC`

| Property | Value |
|----------|-------|
| Tag | `SDINACTCLN` |
| Routine | `SDES2INACTCLIN` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC inactivates a clinic from HOSPITAL LOCATION File #44 IEN. It will mark an associated SDEC RESOURCE File 409.831 entry as inactive if there is a link to the resource.   Please note that the clinic must not have any future appointments.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-inactivate-clinic`

---

### `SDES2 GET VVC STOP CODES`

| Property | Value |
|----------|-------|
| Tag | `GETVVCCODES` |
| Routine | `SDES2GETVVCCODES` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns VVC Stop Code information from the SDEC SETTINGS (#409.98) File.   Can only be invoked by Acheron

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-vvc-stop-codes`

---

### `SDES2 GET APPT TYPES BY DFN`

| Property | Value |
|----------|-------|
| Tag | `GETAPTYDFN` |
| Routine | `SDES2APPTYPES` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the active appointment types for a patient specified by the DFN.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-appt-types-by-dfn`

---

### `SDES2 PATIENT SEARCH`

| Property | Value |
|----------|-------|
| Tag | `SEARCH` |
| Routine | `SDES2PATSEARCH` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return patients and their associated data based on search   criteria passed in by the user (PARTIAL NAME, DOB, SSN, FIRST INITIAL OF   LAST NAME+LAST4 OF SSN).   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | PARAMS | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-patient-search`

---

### `SDES2 CREATE LAST SELECTED PAT`

| Property | Value |
|----------|-------|
| Tag | `STORE` |
| Routine | `SDES2STOREPAT` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will store the patient in ^DISV against the user. This will  allow the last selected patient by the user to be accessed at a later  time.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-create-last-selected-pat`

---

### `SDES2 GET RECALL DELETE REASON`

| Property | Value |
|----------|-------|
| Tag | `GETDELREASON` |
| Routine | `SDES2RECLDIPREAS` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This returns the set of codes from the DELETE REASON (field 203) from  RECALL REMINDERS REMOVED (file 403.56)   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-get-recall-delete-reason`

---

### `SDES2 GET SPEC NEEDS PREFS`

| Property | Value |
|----------|-------|
| Tag | `GETNEEDSPREFS` |
| Routine | `SDES2GETSNAPS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the special needs and preferences that are  associated with a patient.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | NEEDSPREFS | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-spec-needs-prefs`

---

### `SDES2 CREATE SPEC NEEDS PREFS`

| Property | Value |
|----------|-------|
| Tag | `CREATENEEDSPREFS` |
| Routine | `SDES2CREATESNAPS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will create special needs and preferences for a given patient.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | NEEDSPREFS | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-create-spec-needs-prefs`

---

### `SDES2 EDIT SPEC NEEDS PREFS`

| Property | Value |
|----------|-------|
| Tag | `EDITNEEDSPREFS` |
| Routine | `SDES2EDITSNAPS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows editing of the special needs and preference associated  with a patient.    Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | NEEDSPREFS | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-edit-spec-needs-prefs`

---

### `SDES2 CHECK CLIN AVAIL DEFINED`

| Property | Value |
|----------|-------|
| Tag | `CHECKAVAIL` |
| Routine | `SDES2CHKCAVAIL` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a flag of 1 if availability has been defined in the past for a  given clinic and a 0 if availability has never been defined.  Note:  if a clinic currently doesn't have availability, but availability  has been defined in the past, the result is 1.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-check-clin-avail-defined`

---

### `SDES2 GET PATIENT INFO`

| Property | Value |
|----------|-------|
| Tag | `GETINFO` |
| Routine | `SDES2GETPATINFO` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return assorted patient information based on the DFN.    Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | PATIENT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-patient-info`

---

### `SDES2 GET RESOURCE GROUP`

| Property | Value |
|----------|-------|
| Tag | `GETRESOURCEGROUP` |
| Routine | `SDES2GETRESGROUP` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the details associated with a resource group.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | RESOURCEGROUP | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-resource-group`

---

### `SDES2 CREATE RECALL REQUEST`

| Property | Value |
|----------|-------|
| Tag | `CREATERECREQ` |
| Routine | `SDES2RECLLREQ` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** CREATE A NEW ENTRY INTO THE RECALL REMINDERS (#403.5) FILE FOR PATIENT  DFN.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-create-recall-request`

---

### `SDES2 EDIT RECALL REQUEST`

| Property | Value |
|----------|-------|
| Tag | `UPDRECALLREQ` |
| Routine | `SDES2RECLLREQ` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** UPDATE AN EXISTING ENTRY IN RECALL REMINDERS (#403.5) BASED ON THE IEN  PASSED IN.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-edit-recall-request`

---

### `SDES2 DISPOSITION APPT REQ`

| Property | Value |
|----------|-------|
| Tag | `DISPOSITION` |
| Routine | `SDES2ARCLOSE` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Dispositioning/closing an appointment request   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | APPTREQ | LITERAL | No |
| 2 | SDCONTEXT | REFERENCE | No |
| 3 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-disposition-appt-req`

---

### `SDES2 DISPOSITION RECALL REQ`

| Property | Value |
|----------|-------|
| Tag | `DISPRECALL` |
| Routine | `SDES2DISPRECALL` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** DISPOSITION and DELETE an entry from the RECALL REMINDERS file (403.5).  During the deletion of the entry, the new-style xref in 403.5 will  trigger the move of the data from 403.5 to the RECALL REMINDERS REMOVED  file (403.56).   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-disposition-recall-req`

---

### `SDES2 CHECKIN`

| Property | Value |
|----------|-------|
| Tag | `CHECKIN` |
| Routine | `SDES2CHECKIN` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to check in a single appointment.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-checkin`

---

### `SDES2 CREATE APPOINTMENT`

| Property | Value |
|----------|-------|
| Tag | `CREATE` |
| Routine | `SDES2CREATEAPPT` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will create appointments within files 409.84, 44, and 2.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | LITERAL | No |
| 2 | APPOINTMENT | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-create-appointment`

---

### `SDES2 GET CANCELLED SLOTS`

| Property | Value |
|----------|-------|
| Tag | `GETCANCSLOTS` |
| Routine | `SDES2GETCANSLOTS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns cancelled slots within a given timeframe for a given clinic in JSON format.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDCANCDATA | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-cancelled-slots`

---

### `SDES2 CREATE VET REQ AND APPT`

| Property | Value |
|----------|-------|
| Tag | `CREATEREQANDAPPT` |
| Routine | `SDES2CRTVETAPPT` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will generate both an appointment request and an appointment,  disposition the appointment request, then return the new request IEN and  appointment IEN.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | request | UNKNOWN() | No |
| 3 | REQUEST | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-create-vet-req-and-appt`

---

### `SDES2 GET APPTS CLINIEN LIST`

| Property | Value |
|----------|-------|
| Tag | `APPTBYCLNLIST` |
| Routine | `SDES2APPTCLNLST` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Accepts input array of clinic IENs and returns appointments for today. Today is defined by the clinic's time zone.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-appts-clinien-list`

---

### `SDES2 SET APPT CHECKOUT`

| Property | Value |
|----------|-------|
| Tag | `SETCHECKOUT` |
| Routine | `SDES2SETCHECKOUT` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Set the checkout date/time for the specified appointment.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | PARAMS | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-set-appt-checkout`

---

### `SDES2 GET RESOURCE IEN`

| Property | Value |
|----------|-------|
| Tag | `GETRESIEN` |
| Routine | `SDES2GETRESIEN` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Given a Resource Type and IEN, will return the SDEC RESOURCE (#409.831) IEN.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SEARCHCRITERIA | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-resource-ien`

---

### `SDES2 GET EXPANDED ENTRY 2`

| Property | Value |
|----------|-------|
| Tag | `GETEXPANDEDENTRY` |
| Routine | `SDES2GETXPENTRY2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the expanded entry fields associated with the   appointment/patient.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | PATIENTDATA | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-expanded-entry-2`

---

### `SDES2 CREATE APPT REQ`

| Property | Value |
|----------|-------|
| Tag | `CREATEREQUEST` |
| Routine | `SDES2CRTAPREQ` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Creates new appointment request in the SDEC APPT REQUEST file (#409.85).   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | REQUEST | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-create-appt-req`

---

### `SDES2 EDIT APPT REQ`

| Property | Value |
|----------|-------|
| Tag | `EDITREQUEST` |
| Routine | `SDES2EDITAPREQ` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows the editing of an appointment request.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | REQUEST | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-edit-appt-req`

---

### `SDES2 GET APPTS BY CLIN LIST`

| Property | Value |
|----------|-------|
| Tag | `APPTBYCLINICLIST` |
| Routine | `SDES2CLINICLIST` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Accepts array of clinic IENs and returns appointments for today. Today  is defined by clinic's time zone.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-appts-by-clin-list`

---

### `SDES2 CANCEL APPOINTMENT`

| Property | Value |
|----------|-------|
| Tag | `CANCELAPPT` |
| Routine | `SDES2CANCELAPPT` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will cancel an appointment from the SDEC APPOINTMENT (409.84)  file, the PATIENT (#2) file, and the HOSPITAL LOCATION (#44) file.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | PARAMS | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-cancel-appointment`

---

### `SDES2 SET APPT CHECKIN`

| Property | Value |
|----------|-------|
| Tag | `SETAPPTCKNSTEP` |
| Routine | `SDES2APPTCKNSTEP` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Set Check-in status for a given Appointment IEN   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-set-appt-checkin`

---

### `SDES2 SET CHECK-IN STEP`

| Property | Value |
|----------|-------|
| Tag | `SETCKNSTEP` |
| Routine | `SDES2CKNSTEP` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Create new status in #409.842   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-set-check-in-step`

---

### `SDES2 QUERY APPT REQUESTS`

| Property | Value |
|----------|-------|
| Tag | `QUERY` |
| Routine | `SDES2QRYAPREQS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows the user to query appointment requests, consults and  recall requests. The query supports multiple filter criteria such as  patient(s), clinic(s)/service(s), request types, origination date,  priority group, PID date, wait time, and urgency (consults only).   Can only be invoked by A

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-query-appt-requests`

---

### `SDES2 CREATE PROVIDER RESOURCE`

| Property | Value |
|----------|-------|
| Tag | `CREATEPRVRES` |
| Routine | `SDES2CRTPRVRES` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows the creation of a Provider Resource.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-create-provider-resource`

---

### `SDES2 EDIT PROVIDER RESOURCE`

| Property | Value |
|----------|-------|
| Tag | `EDITPRVRES` |
| Routine | `SDES2EDITPRVRES` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows the Provider Resource Hospital location to be modified.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-edit-provider-resource`

---

### `SDES2 CREATE WALKIN APPT`

| Property | Value |
|----------|-------|
| Tag | `CREATEWALKIN` |
| Routine | `SDES2CRTWALKIN` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Creates the SDEC APPT REQUEST (#409.85) file record, the SDEC APPOINTMENT  (#409.84) file record, and completes the check-in process for a walk-in  appointment.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | PARAMS | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-create-walkin-appt`

---

### `SDES2 GET ELIGIBILITY CODES`

| Property | Value |
|----------|-------|
| Tag | `GETELIGCODES` |
| Routine | `SDES2GETELIGCD` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the Eligibility Code information if an Eligibility Code  Name is sent in - or - all Eligibility Code information if no Name is  sent in.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-eligibility-codes`

---

### `SDES2 GET PATIENT CLIN STATUS`

| Property | Value |
|----------|-------|
| Tag | `GETPATIENTSTATUS` |
| Routine | `SDES2GETPATSTAT` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns whether a patient is "NEW" or "ESTABLISHED" within a  clinic.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | PATIENT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-patient-clin-status`

---

### `SDES2 CANCEL CLINIC AVAIL`

| Property | Value |
|----------|-------|
| Tag | `CANCEL` |
| Routine | `SDES2CANCLNAVAIL` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will cancel clinic availability.   If the day being cancelled has scheduled appointments, those appointments  will be cancelled and their IENs will be included in the returned JSON object.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | CANCEL | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-cancel-clinic-avail`

---

### `SDES2 NO-SHOW`

| Property | Value |
|----------|-------|
| Tag | `NOSHOW` |
| Routine | `SDES2NOSHOW` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will set an appointment into a no-show status.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | NOSHOW | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-no-show`

---

### `SDES2 GET SCHEDULING USERS`

| Property | Value |
|----------|-------|
| Tag | `GETUSERS` |
| Routine | `SDES2GETSCDUSRS` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns back a list of users with the SDECZMENU and SDECZMGR  keys.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-scheduling-users`

---

### `SDES2 UNDO NO-SHOW`

| Property | Value |
|----------|-------|
| Tag | `UNDONOSHOW` |
| Routine | `SDES2UNDONOSHOW` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will undo a no-show that has been applied to an appointment.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | NOSHOW | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-undo-no-show`

---

### `SDES2 GET APPT BY APPT IEN`

| Property | Value |
|----------|-------|
| Tag | `BYAPPTIEN` |
| Routine | `SDES2GETAPPTRPCS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the Appointment Object for the given Appointment IEN.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-appt-by-appt-ien`

---

### `SDES2 GET APPTS BY CLINIC IEN`

| Property | Value |
|----------|-------|
| Tag | `BYCLINIEN` |
| Routine | `SDES2GETAPPTRPCS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns back the appointments for a give clinic during a given  time range.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-appts-by-clinic-ien`

---

### `SDES2 GET APPTS BY PATIENT DFN`

| Property | Value |
|----------|-------|
| Tag | `BYPATDFN` |
| Routine | `SDES2GETAPPTRPCS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns appointments for a give Patient within a given date  range.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-appts-by-patient-dfn`

---

### `SDES2 GET RECALL BY IEN`

| Property | Value |
|----------|-------|
| Tag | `GETBYIEN` |
| Routine | `SDES2GETRECALL` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a single recall based on the IEN passed in from the RECALL  REMINDERS file (#403.5)   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-recall-by-ien`

---

### `SDES2 GET RECALLS BY DFN`

| Property | Value |
|----------|-------|
| Tag | `GETBYDFN` |
| Routine | `SDES2GETRECALL` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of RECALL REMINDER file (#403.5) requests based on PATIENT file (#2) DFN passed to the RPC.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-recalls-by-dfn`

---

### `SDES2 GET VIDEO VISIT PROV`

| Property | Value |
|----------|-------|
| Tag | `GETSPACEBARPRO` |
| Routine | `SDES2SPACEBAR` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Gets the video visit provider from the ^TMP(DUZ,"SDECPROIEN") that is  stored from the GETPROINFO^SDESVVS TAG.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-video-visit-prov`

---

### `SDES2 GET APPTS BY APPT IENS`

| Property | Value |
|----------|-------|
| Tag | `APPTSBYIENLIST` |
| Routine | `SDES2GETAPPTRPCS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will take in a list of up to 50 appointment IENS values and  returns an appointment object for each given appointment IEN.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-appts-by-appt-iens`

---

### `SDES2 GET INFO FOR VIDEO VISIT`

| Property | Value |
|----------|-------|
| Tag | `GETVVSMAKEINFO` |
| Routine | `SDES2VVSJSON` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Get patient info, default provider info, and system info needed to make a   Video Visit Service (VVS) appointment in JSON format.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-info-for-video-visit`

---

### `SDES2 BLOCK AND MOVE`

| Property | Value |
|----------|-------|
| Tag | `BLOCKANDMOVE` |
| Routine | `SDES2BLOCKANDMOV` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows the user to block and move an appointment. This will  block the availability in the slot the appointment was originally in and  move it to a new clinic.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | BLOCKANDMOVE | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-block-and-move`

---

### `SDES2 GET APPT REQ BY DFN`

| Property | Value |
|----------|-------|
| Tag | `GETREQSBYDFN` |
| Routine | `SDES2GETAPPTREQ` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns a list of appointment requests for a given patient.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-appt-req-by-dfn`

---

### `SDES2 GET APPT REQ BY IEN`

| Property | Value |
|----------|-------|
| Tag | `GETREQBYREQIEN` |
| Routine | `SDES2GETAPPTREQ` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the details of an appointment request, based on the  IEN provided.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-appt-req-by-ien`

---

### `SDES2 GET CONSULTS BY DFN`

| Property | Value |
|----------|-------|
| Tag | `GETCONSULTSBYDFN` |
| Routine | `SDES2GETCONSULTS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns consults for the provided patient.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-consults-by-dfn`

---

### `SDES2 GET CONSULT BY IEN`

| Property | Value |
|----------|-------|
| Tag | `GETCONSULTBYIEN` |
| Routine | `SDES2GETCONSULTS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return consult details when supplied the consult IEN.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-consult-by-ien`

---

### `SDES2 GET APPT REQ LIST BY DFN`

| Property | Value |
|----------|-------|
| Tag | `GETREQLISTBYDFN` |
| Routine | `SDES2GETREQS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns a list of appointment requests (appointment request,  recall, and consults), given the patient DFN.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-appt-req-list-by-dfn`

---

### `SDES2 GET APPTS BY CLN RES IEN`

| Property | Value |
|----------|-------|
| Tag | `BYCLINRESOURCE` |
| Routine | `SDES2GETAPPTRPCS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return back the appointment for a given clinic resource for  a given time range.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-appts-by-cln-res-ien`

---

### `SDES2 GET PATIENT REGISTRATION`

| Property | Value |
|----------|-------|
| Tag | `GETPATINFO` |
| Routine | `SDES2GETREGS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Given a Patient IEN (DFN) returns patient registration information in  JSON format.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-patient-registration`

---

### `SDES2 BLOCK PBSP SLOTS`

| Property | Value |
|----------|-------|
| Tag | `BLOCK` |
| Routine | `SDES2BLOCKPBSP` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will accept a date/time representing an appointment in one  clinic for a provider profile, then block slots in that particular time  range in the other clinics associated with that profile.    Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | BLOCK | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-block-pbsp-slots`

---

### `SDES2 GET URGENCY LIST`

| Property | Value |
|----------|-------|
| Tag | `GETURGENCY` |
| Routine | `SDES2GETURGENCY` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return a list of GMRC URGENCY values from the Protocol file  (#101).   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-urgency-list`

---

### `SDES2 UNDO CHECKOUT`

| Property | Value |
|----------|-------|
| Tag | `UNDOCHECKOUT` |
| Routine | `SDES2UNDOCHKOUT` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will undo a checkout that has occurred against an appointment.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-undo-checkout`

---

### `SDES2 UNBLOCK PBSP SLOTS`

| Property | Value |
|----------|-------|
| Tag | `UNBLOCK` |
| Routine | `SDES2UNBLOCKPBSP` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will unblock slots that are associated with a provider based  scheduling profile.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | UNBLOCK | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-unblock-pbsp-slots`

---

### `SDES2 GET PAT DEMOGRAPHICS`

| Property | Value |
|----------|-------|
| Tag | `GETDEMOGRAPHICS` |
| Routine | `SDES2GETPATDEMO` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return demographic information associated with a patient.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | PATIENT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-pat-demographics`

---

### `SDES2 EDIT PAT DEMOGRAPHICS`

| Property | Value |
|----------|-------|
| Tag | `EDITDEMOGRAPHICS` |
| Routine | `SDES2EDITPATDEMO` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows the user to edit demographics associated with a patient.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | PATIENT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-edit-pat-demographics`

---

### `SDES2 GET DEMOGRAPHICS`

| Property | Value |
|----------|-------|
| Tag | `GETDEMOGRAPHICS` |
| Routine | `SDES2GETDEMOS` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns all of the valid external values associated with RACE,  ETHNICITY, RELIGION, and MARITAL STATUS.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-demographics`

---

### `SDES2 GET RECALL APPT TYPES`

| Property | Value |
|----------|-------|
| Tag | `GETRECREMTYPES` |
| Routine | `SDES2GRECAPTYPE` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns a list of the Recall reminder appointment types from the  RECALL REMINDERS APPT TYPE file (#403.51).   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-recall-appt-types`

---

### `SDES2 GET APPT REQ BY TYP VET`

| Property | Value |
|----------|-------|
| Tag | `GETREQBYTYPEVET` |
| Routine | `SDES2GETAPPTREQ` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns up to 200 veteran appointment requests.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-appt-req-by-typ-vet`

---

### `SDES2 GET CLINICS BY PROVIDER`

| Property | Value |
|----------|-------|
| Tag | `GETPROVCLINICS` |
| Routine | `SDES2PRVCLINSRC` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the clinics that a provider is associated with.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-clinics-by-provider`

---

### `SDES2 SEARCH RECALL PROVIDERS`

| Property | Value |
|----------|-------|
| Tag | `RECPROVSEARCH` |
| Routine | `SDES2RECPRVSRCH` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows users to search a recall provider's name either partially or fully. The RPC will perform a search that matches the search criteria (3-35 characters), and then, retrieves and returns a list of ACTIVE  Recall Providers.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-search-recall-providers`

---

### `SDES2 GET APPTS BY CLINIC LIST`

| Property | Value |
|----------|-------|
| Tag | `BYCLINICLIST` |
| Routine | `SDES2GETAPPTRPCS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns back all the appointments for the clinics passed in for  today.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-appts-by-clinic-list`

---

### `SDES2 GET CLINIC AVAIL BY SVC`

| Property | Value |
|----------|-------|
| Tag | `CLINICAVAIL` |
| Routine | `SDES2GETCLINAVL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns clinic availability given station number, start/end  dates, and primary/secondary AMIS code(s).   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-clinic-avail-by-svc`

---

### `SDES2 GET DISP CONT ATTEMPTS`

| Property | Value |
|----------|-------|
| Tag | `GETCONTACTS` |
| Routine | `SDES2GETDISPCONS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns all Patient Contacts attempts made during the past year  for all dispositioned requests.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-disp-cont-attempts`

---

### `SDES2 GET CLINICS BY STATION`

| Property | Value |
|----------|-------|
| Tag | `GETCLINICS` |
| Routine | `SDES2GETCLNSTA` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns a list of clinics for a given station number.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-clinics-by-station`

---

### `SDES2 SEARCH CLIN BY STOP CODE`

| Property | Value |
|----------|-------|
| Tag | `SEARCHCLIN` |
| Routine | `SDES2SRCHCLNBYSC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns detailed clinic information based on a search on Medical Center  Division (Station Number) and/or Stop Code and/or Stop Code range.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDSEARCH | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-search-clin-by-stop-code`

---

### `SDES2 GET APPTS BY PAT DFN2`

| Property | Value |
|----------|-------|
| Tag | `BYPATDFN2` |
| Routine | `SDES2GETAPPTRPCS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns appointments for a given Patient within a given date  range.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-appts-by-pat-dfn2`

---

### `SDES2 SEARCH RECALL CLINICS`

| Property | Value |
|----------|-------|
| Tag | `CLINICSEARCH` |
| Routine | `SDES2SEARCHRCLN` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows users to search for clinics that are active recall  clinics.  Given a search string (3 - 35 characters in length), the RPC  will return a list of clinics who have associated recall letters assigned    Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SEARCHARRAY | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-search-recall-clinics`

---

### `SDES2 GET USER PROFILE BY DUZ`

| Property | Value |
|----------|-------|
| Tag | `GETUSRPROBYDUZ` |
| Routine | `SDES2GETUSRPROF` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** An SDES2 Version of the RPC to get User Profile details by DUZ.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-user-profile-by-duz`

---

### `SDES2 GET USER PROF BY SECID`

| Property | Value |
|----------|-------|
| Tag | `GETUSRPROBYSECID` |
| Routine | `SDES2GETUSRPROF` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** An SDES2 Version of the RPC to get User Profile details by SECID.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-user-prof-by-secid`

---

### `SDES2 GET SERVICES FOR CLINICS`

| Property | Value |
|----------|-------|
| Tag | `GETSERVICETYPES` |
| Routine | `SDES2GETCLINSVC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will retrieve the list of services from the SERVICE (#9) field  of the HOSPITAL LOCATION (#44) file.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-services-for-clinics`

---

### `SDES2 CREATE CLINIC AVAIL`

| Property | Value |
|----------|-------|
| Tag | `CREATE` |
| Routine | `SDES2CRTCLNAVAIL` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC creates availability within a clinic.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | AVAILABILITY | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-create-clinic-avail`

---

### `SDES2 SEARCH PROVIDERS`

| Property | Value |
|----------|-------|
| Tag | `PROVIDERSEARCH` |
| Routine | `SDES2PROVSEARCH` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Retrieve list of active providers with a given string.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-search-providers`

---

### `SDES2 EDIT APPOINTMENT`

| Property | Value |
|----------|-------|
| Tag | `EDIT` |
| Routine | `SDES2EDITAPPT` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows the editing of the note tied to the appointment.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-edit-appointment`

---

### `SDES2 GET CLINIC INFO`

| Property | Value |
|----------|-------|
| Tag | `ENTRY` |
| Routine | `SDES2CLININFO` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** New RPC to get the clinic details by Clinic IEN and allow the user to update the clinic hash if specified    Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-clinic-info`

---

### `SDES2 GET CLINICS BY CLIN LIST`

| Property | Value |
|----------|-------|
| Tag | `CLINICLIST` |
| Routine | `SDES2CLININFO` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** New RPC to allow batch of up to 50 Clinic IENs, returning Clinic details.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-clinics-by-clin-list`

---

### `SDES2 PRINT APPT LETTER`

| Property | Value |
|----------|-------|
| Tag | `PRINTLETTER` |
| Routine | `SDES2APTLETTER` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Print single appointment letter.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-print-appt-letter`

---

### `SDES2 PRINT APPT LETTERS`

| Property | Value |
|----------|-------|
| Tag | `PRINTLETTERS` |
| Routine | `SDES2APTLETTER` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** A list of appointment IENs for which letters are to be printed. This RPC  is intended to be used to print a list of letters for actions such as  cancelling clinic availability, where multiple letters need to be printed  at one time.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-print-appt-letters`

---

### `SDES2 SEARCH CLINIC SLOTS`

| Property | Value |
|----------|-------|
| Tag | `SEARCH` |
| Routine | `SDES2SEARCHSLOTS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will identify consecutive, recurring slots in a clinic based on  search criteria.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SEARCH | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-search-clinic-slots`

---

### `SDES2 CREATE LETTER`

| Property | Value |
|----------|-------|
| Tag | `CREATELETTER` |
| Routine | `SDES2ENTERLETTER` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will allow for the addition of a new letter in the LETTER  (#407.5) file.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | LETTER | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-create-letter`

---

### `SDES2 EDIT LETTER`

| Property | Value |
|----------|-------|
| Tag | `EDITLETTER` |
| Routine | `SDES2ENTERLETTER` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will allow for the edit of an existing letter in the LETTER  (#407.5) file.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | LETTER | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-edit-letter`

---

### `SDES2 DELETE LETTER`

| Property | Value |
|----------|-------|
| Tag | `DELETELETTER` |
| Routine | `SDES2ENTERLETTR2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will allow for the deletion of an existing letter in the LETTER  (#407.5) file.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | LETTER | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-delete-letter`

---

### `SDES2 SEARCH LETTER`

| Property | Value |
|----------|-------|
| Tag | `SEARCHLETTER` |
| Routine | `SDES2ENTERLETTER` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will search for and return Letter Names and IENs from the LETTER   (#407.5) file for records that match the search criteria.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SEARCH | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-search-letter`

---

### `SDES2 GET DIVISION LIST`

| Property | Value |
|----------|-------|
| Tag | `GETDIVISIONLIST` |
| Routine | `SDES2GETDIVLIST` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns a list of divisions, given the search text provided. The division list comes from the MEDICAL CENTER DIVISION (#40.8) file.   This RPC can only be invoked by Acheron.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-division-list`

---

### `SDES2 EDIT TEMP ADDRESS`

| Property | Value |
|----------|-------|
| Tag | `EDITTEMP` |
| Routine | `SDES2EDITTEMPADD` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows the activation and addition of a patient's temporary  address, and it also allows the deletion and/or deactivation of a  patient's temporary address.   Can only be invoked by Acheron.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | TEMPADDRESS | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-edit-temp-address`

---

### `SDES2 GET LETTER TYPES`

| Property | Value |
|----------|-------|
| Tag | `GETLETTERTYPES` |
| Routine | `SDES2GETLETRTYPE` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns all active letter types associated with letters in the  LETTER (#407.5) File.   Can only be invoked by Acheron.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-letter-types`

---

### `SDES2 REACTIVATE CLINIC 2`

| Property | Value |
|----------|-------|
| Tag | `REACTIVATECLIN` |
| Routine | `SDES2REACTTCLIN2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC reactivates a clinic from the HOSPITAL LOCATION (#44) file for  the IEN passed in. It will remove the leading 'ZZ' from the clinic name if it doesn't create a name conflict.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-reactivate-clinic-2`

---

### `SDES2 CLONE CLINIC SLOTS`

| Property | Value |
|----------|-------|
| Tag | `CLONECLINICSLOTS` |
| Routine | `SDES2CLONESLOTS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the cloned slots associated with the clinic.    Can only be invoked by Acheron.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | CLINIC | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-clone-clinic-slots`

---

### `SDES2 CREATE CLINIC AVAIL 2`

| Property | Value |
|----------|-------|
| Tag | `CREATE` |
| Routine | `SDES2CRTCLNAVAL2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC creates availability within a clinic.   Can only be invoked by Acheron.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | AVAILABILITY | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-create-clinic-avail-2`

---

### `SDES2 GET CLINIC CANCEL SLOTS`

| Property | Value |
|----------|-------|
| Tag | `CANAVAIL` |
| Routine | `SDES2GETCLNSLOT` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the cancelled slots, if any, for a given clinic for the  date supplied.   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-get-clinic-cancel-slots`

---

### `SDES2 GET VISTA DEVICES`

| Property | Value |
|----------|-------|
| Tag | `DEVICES` |
| Routine | `SDES2GETDEVICES` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of VistA devices. Returns a maximum of 80 devices.   Can only be invoked by Acheron.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-vista-devices`

---

### `SDES2 REMAP CLINIC/DIVISION`

| Property | Value |
|----------|-------|
| Tag | `REMAP` |
| Routine | `SDES2REMAP` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows remapping of clinics/divisions.   Can only be invoked by Acheron.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-remap-clinic/division`

---

### `SDES2 GET CLINIC BY STOP CODE`

| Property | Value |
|----------|-------|
| Tag | `GETCLIN` |
| Routine | `SDES2GETCLINST` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** RPC to return clinic details by Primary Stop Code and Credit Stop Code. Also, a Boolean flag is included and if set to 1 then active and inactive clinics are returned.    Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-get-clinic-by-stop-code`

---

### `SDES2 CREATE APPT REQ2`

| Property | Value |
|----------|-------|
| Tag | `CREATEREQUEST` |
| Routine | `SDES2CRTAPREQ2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Creates new appointment request in the SDEC APPT REQUEST file (#409.85). This will return all the details of the appointment request. Can only be invoked by Acheron.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | REQUEST | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-create-appt-req2`

---

### `SDES2 CREATE LETTER 2`

| Property | Value |
|----------|-------|
| Tag | `CREATELETTER` |
| Routine | `SDES2ENTERLETTR2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will allow for the addition of a new letter in the LETTER   (#407.5) file.    Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | LETTER | REFERENCE | No |

**API Endpoint:** `POST /vista/sd/rpc/sdes2-create-letter-2`

---

### `SDES2 EDIT LETTER 2`

| Property | Value |
|----------|-------|
| Tag | `EDITLETTER` |
| Routine | `SDES2ENTERLETTR2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will allow for the edit of an existing letter in the LETTER   (#407.5) file.    Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | LETTER | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-edit-letter-2`

---

### `SDES2 PRINT APT LETTER VISTA`

| Property | Value |
|----------|-------|
| Tag | `PRINTAPPT` |
| Routine | `SDES2APTLETTERSV` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Print single appointment letter.  Pre-appointment  Cancellation  No-show   Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-print-apt-letter-vista`

---

### `SDES2 PRINT APT LETTERS VISTA`

| Property | Value |
|----------|-------|
| Tag | `PRINTAPPTS` |
| Routine | `SDES2APTLETTERSV` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Print list of appointment letters to a VistA device.     Can only be invoked by Acheron

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDCONTEXT | REFERENCE | No |
| 2 | SDPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/sd/rpc/sdes2-print-apt-letters-vista`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| ENCOUNTER IEN: | SDOE GET DIAGNOSES | ENCOUNTER IEN | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE GET PROVIDERS | ENCOUNTER IEN | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE GET PROCEDURES | ENCOUNTER IEN | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE ASSIGNED A PROVIDER | ENCOUNTER IEN | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE ASSIGNED A DIAGNOSIS | ENCOUNTER IEN | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE ASSIGNED A PROCEDURE | ENCOUNTER IEN | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE FIND PROVIDER | ENCOUNTER IEN | LITERAL | rpc |
| PRACTITIONER ID: | SDOE FIND PROVIDER | PRACTITIONER ID | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE FIND DIAGNOSIS | ENCOUNTER IEN | LITERAL | rpc |
| DIAGNOSIS IEN: | SDOE FIND DIAGNOSIS | DIAGNOSIS IEN | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE FIND PROCEDURE | ENCOUNTER IEN | LITERAL | rpc |
| CPT IEN: | SDOE FIND PROCEDURE | CPT IEN | LITERAL | rpc |
| PATIENT ID: | SDOE FIND FIRST STANDALONE | PATIENT ID | LITERAL | rpc |
| BEGIN DATE/TIME: | SDOE FIND FIRST STANDALONE | BEGIN DATE/TIME | LITERAL | rpc |
| END DATE/TIME: | SDOE FIND FIRST STANDALONE | END DATE/TIME | LITERAL | rpc |
| SEARCH FLAGS: | SDOE FIND FIRST STANDALONE | SEARCH FLAGS | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE GET PRIMARY DIAGNOSIS | ENCOUNTER IEN | LITERAL | rpc |
| PATIENT ID: | SDOE FIND FIRST ENCOUNTER | PATIENT ID | LITERAL | rpc |
| BEGIN DATE/TIME: | SDOE FIND FIRST ENCOUNTER | BEGIN DATE/TIME | LITERAL | rpc |
| END DATE/TIME: | SDOE FIND FIRST ENCOUNTER | END DATE/TIME | LITERAL | rpc |
| SEARCH FLAGS: | SDOE FIND FIRST ENCOUNTER | SEARCH FLAGS | LITERAL | rpc |
| PATIENT ID: | SDOE FIND LAST STANDALONE | PATIENT ID | LITERAL | rpc |
| BEGIN DATE/TIME: | SDOE FIND LAST STANDALONE | BEGIN DATE/TIME | LITERAL | rpc |
| SEARCH FLAGS: | SDOE FIND LAST STANDALONE | SEARCH FLAGS | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE GET GENERAL DATA | ENCOUNTER IEN | LITERAL | rpc |
| ENCOUNTER DATA: | SDOE PARSE GENERAL DATA | ENCOUNTER DATA | REFERENCE | rpc |
| ENCOUNTER PARSE FORMAT: | SDOE PARSE GENERAL DATA | ENCOUNTER PARSE FORMAT | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE GET ZERO NODE | ENCOUNTER IEN | LITERAL | rpc |
| BEGIN DATE/TIME: | SDOE LIST ENCOUNTERS FOR DATES | BEGIN DATE/TIME | LITERAL | rpc |
| END DATE/TIME: | SDOE LIST ENCOUNTERS FOR DATES | END DATE/TIME | LITERAL | rpc |
| BEGIN DATE/TIME: | SDOE LIST ENCOUNTERS FOR PAT | BEGIN DATE/TIME | LITERAL | rpc |
| END DATE/TIME: | SDOE LIST ENCOUNTERS FOR PAT | END DATE/TIME | LITERAL | rpc |
| PATIENT ID: | SDOE LIST ENCOUNTERS FOR PAT | PATIENT ID | LITERAL | rpc |
| VISIT IEN: | SDOE LIST ENCOUNTERS FOR VISIT | VISIT IEN | LITERAL | rpc |
| Patient IEN (DFN): | SD W/L RETRIVE FULL DATA | Patient IEN (DFN) | LITERAL | rpc |
| DFN: | SD GET PATIENT APPOINTMENTS | DFN | LITERAL | rpc |
| DATE: | SD GET PATIENT APPOINTMENTS | DATE | REFERENCE | rpc |
| CLINIC: | SD GET CLINIC DETAILS | CLINIC | LITERAL | rpc |
| SEARCH: | SD GET CLINICS BY NAME | SEARCH | LITERAL | rpc |
| START: | SD GET CLINICS BY NAME | START | REFERENCE | rpc |
| NUMBER: | SD GET CLINICS BY NAME | NUMBER | LITERAL | rpc |
| DFN: | SD APPOINTMENT MAKE | DFN | LITERAL | rpc |
| CLINIC: | SD APPOINTMENT MAKE | CLINIC | LITERAL | rpc |
| APPDATE: | SD APPOINTMENT MAKE | APPDATE | LITERAL | rpc |
| TYPE: | SD APPOINTMENT MAKE | TYPE | LITERAL | rpc |
| LEN: | SD APPOINTMENT MAKE | LEN | LITERAL | rpc |
| LVL: | SD APPOINTMENT MAKE | LVL | LITERAL | rpc |
| CLINIC: | SD APPOINTMENT CHECK | CLINIC | LITERAL | rpc |
| DFN: | SD APPOINTMENT CHECK | DFN | LITERAL | rpc |
| DATE: | SD APPOINTMENT CHECK | DATE | LITERAL | rpc |
| LEN: | SD APPOINTMENT CHECK | LEN | LITERAL | rpc |
| DFN: | SD APPOINTMENT CHECK-IN | DFN | LITERAL | rpc |
| DATE: | SD APPOINTMENT CHECK-IN | DATE | LITERAL | rpc |
| CLINIC: | SD APPOINTMENT CHECK-IN | CLINIC | LITERAL | rpc |
| DFN: | SD APPOINTMENT CANCEL | DFN | LITERAL | rpc |
| CLINIC: | SD APPOINTMENT CANCEL | CLINIC | LITERAL | rpc |
| DATE: | SD APPOINTMENT CANCEL | DATE | LITERAL | rpc |
| TYPE: | SD APPOINTMENT CANCEL | TYPE | LITERAL | rpc |
| REASON: | SD APPOINTMENT CANCEL | REASON | LITERAL | rpc |
| REMARKS: | SD APPOINTMENT CANCEL | REMARKS | LITERAL | rpc |
| SEARCH: | SD APPOINTMENT LIST BY NAME | SEARCH | LITERAL | rpc |
| START: | SD APPOINTMENT LIST BY NAME | START | LITERAL | rpc |
| NUMBER: | SD APPOINTMENT LIST BY NAME | NUMBER | LITERAL | rpc |
| TYPE: | SD GET APPOINTMENT TYPE | TYPE | LITERAL | rpc |
| SDECP: | SDEC PTLOOKRS | SDECP | LITERAL | rpc |
| SDECC: | SDEC PTLOOKRS | SDECC | LITERAL | rpc |
| LASTSUB: | SDEC PTLOOKRS | LASTSUB | LITERAL | rpc |
| SDECRES: | SDEC WAITLIST | SDECRES | LITERAL | rpc |
| SDECEVENT: | SDEC UNREGEV | SDECEVENT | LITERAL | rpc |
| SDECIP: | SDEC UNREGEV | SDECIP | LITERAL | rpc |
| SDECPORT: | SDEC UNREGEV | SDECPORT | LITERAL | rpc |
| SDECSTART: | SDEC TPBLKOV | SDECSTART | LITERAL | rpc |
| SDECEND: | SDEC TPBLKOV | SDECEND | LITERAL | rpc |
| SDECRES: | SDEC TPBLKOV | SDECRES | LITERAL | rpc |
| SDECDIC: | SDEC SPACEBAR | SDECDIC | LITERAL | rpc |
| SDECVAL: | SDEC SPACEBAR | SDECVAL | LITERAL | rpc |
| SDECDUZ: | SDEC SETFAC | SDECDUZ | LITERAL | rpc |
| SDECFAC: | SDEC SETFAC | SDECFAC | LITERAL | rpc |
| SDECRES: | SDEC SEARCHAV | SDECRES | LITERAL | rpc |
| SDECSTRT: | SDEC SEARCHAV | SDECSTRT | LITERAL | rpc |
| SDECEND: | SDEC SEARCHAV | SDECEND | LITERAL | rpc |
| SDECTYPES: | SDEC SEARCHAV | SDECTYPES | LITERAL | rpc |
| SDECAMPM: | SDEC SEARCHAV | SDECAMPM | LITERAL | rpc |
| SDECWKDY: | SDEC SEARCHAV | SDECWKDY | LITERAL | rpc |
| SDECDUZ: | SDEC SUSRINFO | SDECDUZ | LITERAL | rpc |
| SDECDUZ: | SDEC RESOURCE | SDECDUZ | LITERAL | rpc |
| SDACT: | SDEC RESOURCE | SDACT | LITERAL | rpc |
| SDTYPE: | SDEC RESOURCE | SDTYPE | LITERAL | rpc |
| MAXREC: | SDEC RESOURCE | MAXREC | LITERAL | rpc |
| LASTSUBI: | SDEC RESOURCE | LASTSUBI | LITERAL | rpc |
| SDIEN: | SDEC RESOURCE | SDIEN | LITERAL | rpc |
| SDECP: | SDEC RESOURCE | SDECP | LITERAL | rpc |
| SDECLIST: | SDEC RESLETRS | SDECLIST | LITERAL | rpc |
| SDLTR: | SDEC RESLETRS | SDLTR | LITERAL | rpc |
| SDNOS: | SDEC RESLETRS | SDNOS | LITERAL | rpc |
| SDCAN: | SDEC RESLETRS | SDCAN | LITERAL | rpc |
| SDECRES: | SDEC RESLETRF | SDECRES | LITERAL | rpc |
| SDECLT: | SDEC RESLETRF | SDECLT | LITERAL | rpc |
| SDECDUZ: | SDEC RESGRPUS | SDECDUZ | LITERAL | rpc |
| SDECEVENT: | SDEC REGEVENT | SDECEVENT | LITERAL | rpc |
| SDECIP: | SDEC REGEVENT | SDECIP | LITERAL | rpc |
| SDECPORT: | SDEC REGEVENT | SDECPORT | LITERAL | rpc |
| SDECAPPT: | SDEC SETRBOOK | SDECAPPT | LITERAL | rpc |
| SDECDATE: | SDEC SETRBOOK | SDECDATE | LITERAL | rpc |
| SDECDATE: | SDEC REBKNEXT | SDECDATE | LITERAL | rpc |
| SDECRES: | SDEC REBKNEXT | SDECRES | LITERAL | rpc |
| SDECTPID: | SDEC REBKNEXT | SDECTPID | LITERAL | rpc |
| SDECLIST: | SDEC REBKLIST | SDECLIST | LITERAL | rpc |
| SDECEVENT: | SDEC RAISEVNT | SDECEVENT | LITERAL | rpc |
| SDECPARAM: | SDEC RAISEVNT | SDECPARAM | LITERAL | rpc |
| SDECSIP: | SDEC RAISEVNT | SDECSIP | LITERAL | rpc |
| SDECSPT: | SDEC RAISEVNT | SDECSPT | LITERAL | rpc |
| SDECPRV: | SDEC PROVCLIN | SDECPRV | LITERAL | rpc |
| SDECAPID: | SDEC APPTLETR | SDECAPID | LITERAL | rpc |
|  LT: | SDEC APPTLETR |  LT | LITERAL | rpc |
| DFN: | SDEC PATAPPTH | DFN | LITERAL | rpc |
| DFN: | SDEC PATAPPTD | DFN | LITERAL | rpc |
| SDCL: | SDEC OVBOOK | SDCL | LITERAL | rpc |
| NSDT: | SDEC OVBOOK | NSDT | LITERAL | rpc |
| SDECRES: | SDEC OVBOOK | SDECRES | LITERAL | rpc |
| DFN: | SDEC NOSHOPAT | DFN | LITERAL | rpc |
| SDCL: | SDEC NOSHOPAT | SDCL | LITERAL | rpc |
| SDECAPTID: | SDEC NOSHOW | SDECAPTID | LITERAL | rpc |
| SDECNS: | SDEC NOSHOW | SDECNS | LITERAL | rpc |
| USERIEN: | SDEC NOSHOW | USERIEN | LITERAL | rpc |
| SDECDATE: | SDEC NOSHOW | SDECDATE | LITERAL | rpc |
| SDCLASS: | SDEC NEWPERS | SDCLASS | LITERAL | rpc |
| SDPART: | SDEC NEWPERS | SDPART | LITERAL | rpc |
| MAXREC: | SDEC NEWPERS | MAXREC | LITERAL | rpc |
| LSUB: | SDEC NEWPERS | LSUB | LITERAL | rpc |
| INP: | SDEC WLSET | INP | LITERAL | rpc |
| WLIEN1: | SDEC WLGET | WLIEN1 | LITERAL | rpc |
| MAXREC: | SDEC WLGET | MAXREC | LITERAL | rpc |
| SDBEG: | SDEC WLGET | SDBEG | LITERAL | rpc |
| SDEND: | SDEC WLGET | SDEND | LITERAL | rpc |
| DFN: | SDEC WLGET | DFN | LITERAL | rpc |
| LASTSUB: | SDEC WLGET | LASTSUB | LITERAL | rpc |
| SDTOP: | SDEC WLGET | SDTOP | LITERAL | rpc |
| INP: | SDEC WLCLOSE | INP | LITERAL | rpc |
| SDECCL: | SDEC PROVALL | SDECCL | LITERAL | rpc |
| SDECBD: | SDEC HOLIDAY | SDECBD | LITERAL | rpc |
| DFN: | SDEC HLTHSUMM | DFN | LITERAL | rpc |
| SDECDUZ: | SDEC RESGPUSR | SDECDUZ | LITERAL | rpc |
| SDECDUZ: | SDEC GETFAC | SDECDUZ | LITERAL | rpc |
| DFN: | SDEC GETREGA | DFN | LITERAL | rpc |
| SDECWID: | SDEC EHRPT | SDECWID | LITERAL | rpc |
| SDECDFN: | SDEC EHRPT | SDECDFN | LITERAL | rpc |
| SDECAPTID: | SDEC EDITAPPT | SDECAPTID | LITERAL | rpc |
| SDECNOTE: | SDEC EDITAPPT | SDECNOTE | LITERAL | rpc |
| SDECLEN: | SDEC EDITAPPT | SDECLEN | LITERAL | rpc |
| SDECIEN: | SDEC DELRU | SDECIEN | LITERAL | rpc |
| SDECGRP: | SDEC DELRESGP | SDECGRP | LITERAL | rpc |
| SDECIEN: | SDEC DELRGI | SDECIEN | LITERAL | rpc |
| SDECIEN1: | SDEC DELRGI | SDECIEN1 | LITERAL | rpc |
| SDECIEN: | SDEC DELAGI | SDECIEN | LITERAL | rpc |
| SDECIEN1: | SDEC DELAGI | SDECIEN1 | LITERAL | rpc |
| SDECGRP: | SDEC DELAG | SDECGRP | LITERAL | rpc |
| IEN: | SDES SET APPT CHECK-IN STEP | IEN | LITERAL | rpc |
| STATUS: | SDES SET APPT CHECK-IN STEP | STATUS | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES SET APPT CHECK-IN STEP | EASTRCKNGNMBR | LITERAL | rpc |
| STATUS: | SDES SET CHECK-IN STEP | STATUS | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES SET CHECK-IN STEP | EASTRCKNGNMBR | LITERAL | rpc |
| IEN: | SDES EDIT CHECK-IN STEP | IEN | LITERAL | rpc |
| STATUS: | SDES EDIT CHECK-IN STEP | STATUS | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES EDIT CHECK-IN STEP | EASTRCKNGNMBR | LITERAL | rpc |
| IEN: | SDES GET CHECK-IN STEP | IEN | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET CHECK-IN STEP | EASTRCKNGNMBR | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET CHECK-IN STEPS | EASTRCKNGNMBR | LITERAL | rpc |
| RESIEN: | SDES GET APPTS BY RESOURCE | RESIEN | LITERAL | rpc |
| SDBEG: | SDES GET APPTS BY RESOURCE | SDBEG | LITERAL | rpc |
| SDEND: | SDES GET APPTS BY RESOURCE | SDEND | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET APPTS BY RESOURCE | EASTRCKNGNMBR | LITERAL | rpc |
| DFN: | SDES GET INSURANCE VERIFY REQ | DFN | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET INSURANCE VERIFY REQ | EASTRCKNGNMBR | LITERAL | rpc |
| ARIEN: | SDES GET APPT REQ BY IEN | ARIEN | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET APPT REQ BY IEN | EASTRCKNGNMBR | LITERAL | rpc |
| DFN: | SDES GET APPT REQ BY PATIENT | DFN | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET APPT REQ BY PATIENT | EASTRCKNGNMBR | LITERAL | rpc |
| ARIEN: | SDES DISPOSITION APPT REQ | ARIEN | LITERAL | rpc |
| DISP: | SDES DISPOSITION APPT REQ | DISP | LITERAL | rpc |
| DISPBY: | SDES DISPOSITION APPT REQ | DISPBY | LITERAL | rpc |
| DISPDT: | SDES DISPOSITION APPT REQ | DISPDT | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES DISPOSITION APPT REQ | EASTRCKNGNMBR | LITERAL | rpc |
| PATIENT-ENTERED COMMENTS: | SDES DISPOSITION APPT REQ | PATIENT-ENTERED COMMENTS | LIST | rpc |
| REQUEST: | SDES CREATE APPT REQ | REQUEST | REFERENCE | rpc |
| REQUEST: | SDES EDIT APPT REQ | REQUEST | REFERENCE | rpc |
| SEARCHSTRING: | SDES SEARCH CLINIC | SEARCHSTRING | LITERAL | rpc |
| APPTIEN: | SDES CREATE APPT BLK AND MOVE | APPTIEN | LITERAL | rpc |
| SDRES: | SDES CREATE APPT BLK AND MOVE | SDRES | LITERAL | rpc |
| APPTDT: | SDES CREATE APPT BLK AND MOVE | APPTDT | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES CREATE APPT BLK AND MOVE | EASTRCKNGNMBR | LITERAL | rpc |
| CLINICIEN: | SDES INACTIVATE/ZZ CLINIC | CLINICIEN | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES INACTIVATE/ZZ CLINIC | EASTRCKNGNMBR | LITERAL | rpc |
| CLINICIEN: | SDES GET CLIN AVAILABILITY | CLINICIEN | LITERAL | rpc |
| STARTDATETIME: | SDES GET CLIN AVAILABILITY | STARTDATETIME | LITERAL | rpc |
| ENDDATETIME: | SDES GET CLIN AVAILABILITY | ENDDATETIME | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET CLIN AVAILABILITY | EASTRCKNGNMBR | LITERAL | rpc |
| SDCLINIC: | SDES CREATE CLIN AVAILABILITY | SDCLINIC | LITERAL | rpc |
| DATES: | SDES CREATE CLIN AVAILABILITY | DATES | LITERAL | rpc |
| TIMES: | SDES CREATE CLIN AVAILABILITY | TIMES | LITERAL | rpc |
| SLOTS: | SDES CREATE CLIN AVAILABILITY | SLOTS | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES CREATE CLIN AVAILABILITY | EASTRCKNGNMBR | LITERAL | rpc |
| CLINICIEN: | SDES CANCEL CLIN AVAILABILITY | CLINICIEN | LITERAL | rpc |
| FULLPARTIAL: | SDES CANCEL CLIN AVAILABILITY | FULLPARTIAL | LITERAL | rpc |
| STARTDATETIME: | SDES CANCEL CLIN AVAILABILITY | STARTDATETIME | LITERAL | rpc |
| ENDDATETIME: | SDES CANCEL CLIN AVAILABILITY | ENDDATETIME | LITERAL | rpc |
| CANCELRSN: | SDES CANCEL CLIN AVAILABILITY | CANCELRSN | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES CANCEL CLIN AVAILABILITY | EASTRCKNGNMBR | LITERAL | rpc |
| SECID: | SDES GET USRPROFILE | SECID | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET USRPROFILE | EASTRCKNGNMBR | LITERAL | rpc |
| SDCLINIC: | SDES EDIT CLINIC AVAILABILITY | SDCLINIC | LITERAL | rpc |
| DATES: | SDES EDIT CLINIC AVAILABILITY | DATES | LITERAL | rpc |
| TIMES: | SDES EDIT CLINIC AVAILABILITY | TIMES | LITERAL | rpc |
| SLOTS: | SDES EDIT CLINIC AVAILABILITY | SLOTS | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES EDIT CLINIC AVAILABILITY | EASTRCKNGNMBR | LITERAL | rpc |
| IEN: | SDES GET RECALL BY IEN | IEN | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET RECALL BY IEN | EASTRCKNGNMBR | LITERAL | rpc |
| DFN: | SDES GET RECALLS BY DFN | DFN | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET RECALLS BY DFN | EASTRCKNGNMBR | LITERAL | rpc |
| RECALLIEN: | SDES DISPOSITION RECALL REQ | RECALLIEN | LITERAL | rpc |
| REASON: | SDES DISPOSITION RECALL REQ | REASON | LITERAL | rpc |
| COMMENTS: | SDES DISPOSITION RECALL REQ | COMMENTS | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES DISPOSITION RECALL REQ | EASTRCKNGNMBR | LITERAL | rpc |
| CLIN STOPCODE: | SDES GET STOPCD DETAIL | CLIN STOPCODE | LITERAL | rpc |
| USER IEN: | SDES GET USER PROFILE BY DUZ | USER IEN | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET USER PROFILE BY DUZ | EASTRCKNGNMBR | LITERAL | rpc |
| DFN: | SDES PRINT PATIENT APPTS | DFN | LITERAL | rpc |
| BEGIN DATE: | SDES PRINT PATIENT APPTS | BEGIN DATE | LITERAL | rpc |
| END DATE: | SDES PRINT PATIENT APPTS | END DATE | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES PRINT PATIENT APPTS | EASTRCKNGNMBR | LITERAL | rpc |
| APPTREQIEN: | SDES GET MISSION ACT ELIG | APPTREQIEN | LITERAL | rpc |
| PID: | SDES GET MISSION ACT ELIG | PID | LITERAL | rpc |
| APPTREQTYP: | SDES GET MISSION ACT ELIG | APPTREQTYP | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET MISSION ACT ELIG | EASTRCKNGNMBR | LITERAL | rpc |
| APPTDATE: | SDES GET MISSION ACT ELIG | APPTDATE | LITERAL | rpc |
| CLINICIEN: | SDES GET MISSION ACT ELIG | CLINICIEN | LITERAL | rpc |
| FILEENTRYDATE: | SDES GET MISSION ACT ELIG | FILEENTRYDATE | LITERAL | rpc |
| DFNS: | SDES GET INSURANCE VERIFY LIST | DFNS | REFERENCE | rpc |
| APPTARRAY: | SDES CREATE APPOINTMENTS | APPTARRAY | REFERENCE | rpc |
| CONSULTIEN: | SDES GET CONSULTS BY IEN | CONSULTIEN | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET CONSULTS BY IEN | EASTRCKNGNMBR | LITERAL | rpc |
| DFN: | SDES GET CONSULTS BY DFN | DFN | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET CONSULTS BY DFN | EASTRCKNGNMBR | LITERAL | rpc |
| DFN: | SDES GET APPT REQ LIST BY DFN | DFN | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET APPT REQ LIST BY DFN | EASTRCKNGNMBR | LITERAL | rpc |
| IEN: | SDES GET APPT CHECK-IN STEPS 2 | IEN | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET APPT CHECK-IN STEPS 2 | EASTRCKNGNMBR | LITERAL | rpc |
| IEN: | SDES GET APPT CHECK-IN STEP 2 | IEN | LITERAL | rpc |
| STATUS: | SDES GET APPT CHECK-IN STEP 2 | STATUS | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET APPT CHECK-IN STEP 2 | EASTRCKNGNMBR | LITERAL | rpc |
| DFN: | SDES GET PATIENT FLAGS | DFN | LITERAL | rpc |
| EASTRACKINGNMBR: | SDES GET PATIENT FLAGS | EASTRACKINGNMBR | LITERAL | rpc |
| DFN: | SDES GET APPT REQ BY PAT ALL | DFN | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET APPT REQ BY PAT ALL | EASTRCKNGNMBR | LITERAL | rpc |
| STARTDATE: | SDES GET APPT REQ BY PAT ALL | STARTDATE | LITERAL | rpc |
| ENDDATE: | SDES GET APPT REQ BY PAT ALL | ENDDATE | LITERAL | rpc |
| DFN: | SDES GET APPT REQ BY PAT OPEN | DFN | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET APPT REQ BY PAT OPEN | EASTRCKNGNMBR | LITERAL | rpc |
| CLINICIEN: | SDES ADD PRIV USER | CLINICIEN | LITERAL | rpc |
| USERIEN: | SDES ADD PRIV USER | USERIEN | LITERAL | rpc |
| CLINICIEN: | SDES DELETE PRIV USER | CLINICIEN | LITERAL | rpc |
| USERIEN: | SDES DELETE PRIV USER | USERIEN | LITERAL | rpc |
| INP: | SDES GET DIVISION LIST | INP | LITERAL | rpc |
| EASTRACKINGNMBR: | SDES GET DIVISION LIST | EASTRACKINGNMBR | LITERAL | rpc |
| CLINICIEN: | SDES READ PRIV USERS | CLINICIEN | LITERAL | rpc |
| CLINICIEN: | SDES DELETE PRIV USERS | CLINICIEN | LITERAL | rpc |
| USERNAMETOSEARCH: | SDES SEARCH PRIVILEGED USER | USERNAMETOSEARCH | LITERAL | rpc |
| PROVIDERTOSEARCH: | SDES SEARCH PROVIDERS | PROVIDERTOSEARCH | LITERAL | rpc |
| RETURN : | SDES SEARCH PROVIDERS | RETURN  | UNKNOWN() | rpc |
| EASTRCKNGNMBR: | SDES GET LETTER TYPES | EASTRCKNGNMBR | LITERAL | rpc |
| TYPE: | SDES GET LETTERS BY TYPE | TYPE | LITERAL | rpc |
| TEXT: | SDES GET LETTERS BY TYPE | TEXT | LITERAL | rpc |
| BRIEF: | SDES GET LETTERS BY TYPE | BRIEF | LITERAL | rpc |
| EASTRCKNGNMBR: | SDES GET LETTERS BY TYPE | EASTRCKNGNMBR | LITERAL | rpc |
| IEN: | SDES GET LETTER BY IEN | IEN | LITERAL | rpc |
| EAS: | SDES GET LETTER BY IEN | EAS | LITERAL | rpc |
| WALKINARRAY: | SDES CREATE WALKIN APPT | WALKINARRAY | REFERENCE | rpc |
| REQUESTARRAY: | SDES CREATE VET REQ SCHED APPT | REQUESTARRAY | REFERENCE | rpc |
| ENCOUNTER IEN: | SDOE GET DIAGNOSES | ENCOUNTER IEN | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE GET PROVIDERS | ENCOUNTER IEN | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE GET PROCEDURES | ENCOUNTER IEN | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE ASSIGNED A PROVIDER | ENCOUNTER IEN | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE ASSIGNED A DIAGNOSIS | ENCOUNTER IEN | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE ASSIGNED A PROCEDURE | ENCOUNTER IEN | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE FIND PROVIDER | ENCOUNTER IEN | LITERAL | rpc |
| PRACTITIONER ID: | SDOE FIND PROVIDER | PRACTITIONER ID | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE FIND DIAGNOSIS | ENCOUNTER IEN | LITERAL | rpc |
| DIAGNOSIS IEN: | SDOE FIND DIAGNOSIS | DIAGNOSIS IEN | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE FIND PROCEDURE | ENCOUNTER IEN | LITERAL | rpc |
| CPT IEN: | SDOE FIND PROCEDURE | CPT IEN | LITERAL | rpc |
| PATIENT ID: | SDOE FIND FIRST STANDALONE | PATIENT ID | LITERAL | rpc |
| BEGIN DATE/TIME: | SDOE FIND FIRST STANDALONE | BEGIN DATE/TIME | LITERAL | rpc |
| END DATE/TIME: | SDOE FIND FIRST STANDALONE | END DATE/TIME | LITERAL | rpc |
| SEARCH FLAGS: | SDOE FIND FIRST STANDALONE | SEARCH FLAGS | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE GET PRIMARY DIAGNOSIS | ENCOUNTER IEN | LITERAL | rpc |
| PATIENT ID: | SDOE FIND FIRST ENCOUNTER | PATIENT ID | LITERAL | rpc |
| BEGIN DATE/TIME: | SDOE FIND FIRST ENCOUNTER | BEGIN DATE/TIME | LITERAL | rpc |
| END DATE/TIME: | SDOE FIND FIRST ENCOUNTER | END DATE/TIME | LITERAL | rpc |
| SEARCH FLAGS: | SDOE FIND FIRST ENCOUNTER | SEARCH FLAGS | LITERAL | rpc |
| PATIENT ID: | SDOE FIND LAST STANDALONE | PATIENT ID | LITERAL | rpc |
| BEGIN DATE/TIME: | SDOE FIND LAST STANDALONE | BEGIN DATE/TIME | LITERAL | rpc |
| SEARCH FLAGS: | SDOE FIND LAST STANDALONE | SEARCH FLAGS | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE GET GENERAL DATA | ENCOUNTER IEN | LITERAL | rpc |
| ENCOUNTER DATA: | SDOE PARSE GENERAL DATA | ENCOUNTER DATA | REFERENCE | rpc |
| ENCOUNTER PARSE FORMAT: | SDOE PARSE GENERAL DATA | ENCOUNTER PARSE FORMAT | LITERAL | rpc |
| ENCOUNTER IEN: | SDOE GET ZERO NODE | ENCOUNTER IEN | LITERAL | rpc |
| BEGIN DATE/TIME: | SDOE LIST ENCOUNTERS FOR DATES | BEGIN DATE/TIME | LITERAL | rpc |
| END DATE/TIME: | SDOE LIST ENCOUNTERS FOR DATES | END DATE/TIME | LITERAL | rpc |
| BEGIN DATE/TIME: | SDOE LIST ENCOUNTERS FOR PAT | BEGIN DATE/TIME | LITERAL | rpc |
| END DATE/TIME: | SDOE LIST ENCOUNTERS FOR PAT | END DATE/TIME | LITERAL | rpc |
| PATIENT ID: | SDOE LIST ENCOUNTERS FOR PAT | PATIENT ID | LITERAL | rpc |
| VISIT IEN: | SDOE LIST ENCOUNTERS FOR VISIT | VISIT IEN | LITERAL | rpc |

## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| SD INACTIVATE | — |
| SD REACT | — |
| SD SDCLK | — |
| SD CANCEL APPOINTMENT | — |
| SD AMB PROC CPT GROUP EDIT | — |
| SD DISPLAY AVAIL REPORT | — |
| SD NOSHOW REPORT | — |
| SD AMB PROC MANAGEMENT REPORT | — |
| SD VISIT REPORT | — |
| SD SHARING AGREEMENT UPDATE | — |
| SD WAIT LIST ENTER/EDIT | — |
| SD WAIT LIST DISPOSITION ENTRY | — |
| SD WAIT LIST INQUIRY | — |
| SD WAIT LIST OVERDUE REPORT | — |
| SD WAIT LIST PRM CARE/TEAM | — |
| SD WAIT LIST PAR ENTER/EDIT | SDWL PARAMETER |
| SD WAIT LIST APPT REPORT | — |
| SD WAIT LIST STAT REPORT | — |
| SD WAIT LIST ENROLL REPORT | — |
| SD WAIT LIST TRANS TO AAC | — |
| SD WAIT LIST CLEANUP | — |
| SD CLN STOP CODE REP | — |
| SD EWL BACKGROUND JOB | — |
| SD WAIT LIST SC PRIORITY EDIT | — |
| SD WAIT LIST ADHOC REPORT V1 | — |
| SD WAIT LIST ADHOC REPORT V2 | — |
| SD WAIT LIST UPLOAD VSSC | — |
| SD WAIT ENROLLEE TEMP FILE | — |
| SD WAIT ENROLL CLEANUP RPT | — |
| SD WAIT ENROLLEE APPLY TF | — |
| SD WAIT ENROLLEE B/R UTILITY | — |
| SD WAIT CLEAN-UP MENU REMOVE | — |
| SD WAIT LIST OPEN CLOSED ENTRY | — |
| SD WAIT LIST 30>30>120 REPORT | — |
| SD CLINIC EDIT LOG | — |
| SD MH NO SHOW AD HOC REPORT | — |
| SD MH NO SHOW NIGHTLY BGJ | — |
| SD MH PROACTIVE BGJ REPORT | — |
| SD MH PROACTIVE AD HOC REPORT | — |
| SD CLN INST CHKLST | — |
| SD VSE REPORT DATA | — |
| SD TELE INQ | — |
| SD TELE STOP CODE | SDTOOL |
| SD TELE CLN UPDATE | SDTOOL |
| SD PROVIDER ADD/EDIT | SDTOOL |
| SD MISSING STATION NUMBER | — |
| SD DEFAULT PROVIDER UPDATE | SDTOOL |
| SD INSTITUTION DISCREPANCY | — |
| SD ADV CLINIC SEARCH | — |

### Action

| Name | Security Key |
|------|-------------|
| SD PARM PARAMETERS | — |

### Menu

| Name | Security Key |
|------|-------------|
| SD WAIT LIST MENU | SDWL MENU |
| SD WAIT LIST REPORTS MENU | — |
| SD WAIT LIST UTILITIES | SDWL MENU |
| SD WAIT CLEAN-UP ENROLLEE MENU | SDWL PARAMETER |
| SD TELE TOOLS | — |

### Broker

| Name | Security Key |
|------|-------------|
| SD WAIT LIST GUI | — |
| SD API | — |

### Print

| Name | Security Key |
|------|-------------|
| SD WAIT LIST REOPEN ENTRIES | — |

### Edit

| Name | Security Key |
|------|-------------|
| SD IMO EDIT | — |
| SD ASSOCIATED STOP CODE | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `SDWL MENU`
- `SDWL PARAMETER`
- `SDTOOL`

## API Route Summary

All routes are prefixed with `/vista/sd/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/sd/rpc/sd-w/l-retrive-full-data` | SD W/L RETRIVE FULL DATA | GLOBAL ARRAY |
| POST | `/vista/sd/rpc/sd-w/l-create-file` | SD W/L CREATE FILE | ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-retrive-brief` | SD W/L RETRIVE BRIEF | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-retrive-medical-review` | SD W/L RETRIVE MEDICAL REVIEW | ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-retrive-disposition` | SD W/L RETRIVE DISPOSITION | ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-retrive-institution(#4)` | SD W/L RETRIVE INSTITUTION(#4) | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-retrive-clinic(#409.32)` | SD W/L RETRIVE CLINIC(#409.32) | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-retrive-hosp-loc(#44)` | SD W/L RETRIVE HOSP LOC(#44) | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-retrive-team(#404.51)` | SD W/L RETRIVE TEAM(#404.51) | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-retrive-tm-pos(404.57)` | SD W/L RETRIVE TM POS(404.57) | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-retrive-ser/sp(409.31)` | SD W/L RETRIVE SER/SP(409.31) | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-retrive-person(200)` | SD W/L RETRIVE PERSON(200) | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-priority(#409.3)` | SD W/L PRIORITY(#409.3) | ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-req-by(409.3)` | SD W/L REQ BY(409.3) | ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-type(409.3)` | SD W/L TYPE(409.3) | ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-disposition(409.3)` | SD W/L DISPOSITION(409.3) | ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-current-status(409.3)` | SD W/L CURRENT STATUS(409.3) | ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-package(409.3)` | SD W/L PACKAGE(409.3) | ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-new-enrollee(409.3)` | SD W/L NEW ENROLLEE(409.3) | ARRAY |
| POST | `/vista/sd/rpc/sd-w/l-create-disposition` | SD W/L CREATE DISPOSITION | ARRAY |
| POST | `/vista/sd/rpc/sd-w/l-create-m/r` | SD W/L CREATE M/R | ARRAY |
| GET | `/vista/sd/rpc/sd-w/l-import-api` | SD W/L IMPORT API | SINGLE VALUE |
| GET | `/vista/sd/rpc/sd-get-patient-appointments` | SD GET PATIENT APPOINTMENTS | ARRAY |
| GET | `/vista/sd/rpc/sd-get-clinic-details` | SD GET CLINIC DETAILS | ARRAY |
| GET | `/vista/sd/rpc/sd-get-clinics-by-name` | SD GET CLINICS BY NAME | ARRAY |
| GET | `/vista/sd/rpc/sd-appointment-make` | SD APPOINTMENT MAKE | ARRAY |
| GET | `/vista/sd/rpc/sd-appointment-check` | SD APPOINTMENT CHECK | ARRAY |
| GET | `/vista/sd/rpc/sd-appointment-check-in` | SD APPOINTMENT CHECK-IN | ARRAY |
| POST | `/vista/sd/rpc/sd-appointment-cancel` | SD APPOINTMENT CANCEL | ARRAY |
| GET | `/vista/sd/rpc/sd-appointment-list-by-name` | SD APPOINTMENT LIST BY NAME | ARRAY |
| GET | `/vista/sd/rpc/sd-get-appointment-type` | SD GET APPOINTMENT TYPE | ARRAY |
| GET | `/vista/sd/rpc/sd-get-eligibility-details` | SD GET ELIGIBILITY DETAILS | ARRAY |
| GET | `/vista/sd/rpc/sd-get-clinic-availability` | SD GET CLINIC AVAILABILITY | ARRAY |
| GET | `/vista/sd/rpc/sd-has-patient-pending-appts` | SD HAS PATIENT PENDING APPTS | ARRAY |
| GET | `/vista/sd/rpc/sd-get-patient-pending-appts` | SD GET PATIENT PENDING APPTS | ARRAY |
| GET | `/vista/sd/rpc/sd-valid-clinic-stop-code` | SD VALID CLINIC STOP CODE | ARRAY |
| POST | `/vista/sd/rpc/sd-verify-clinic-access` | SD VERIFY CLINIC ACCESS | ARRAY |
| GET | `/vista/sd/rpc/sd-valid-stop-code` | SD VALID STOP CODE | ARRAY |
| GET | `/vista/sd/rpc/sd-get-first-available-appt` | SD GET FIRST AVAILABLE APPT | ARRAY |
| GET | `/vista/sd/rpc/sd-appointment-make-unsch` | SD APPOINTMENT MAKE UNSCH | ARRAY |
| GET | `/vista/sd/rpc/sd-appointment-noshow` | SD APPOINTMENT NOSHOW | SINGLE VALUE |
| GET | `/vista/sd/rpc/sd-appointment-check-out` | SD APPOINTMENT CHECK-OUT | ARRAY |
| GET | `/vista/sd/rpc/sd-appointment-check-out-del` | SD APPOINTMENT CHECK-OUT DEL | ARRAY |
| GET | `/vista/sd/rpc/sd-list-cancellation-reasons` | SD LIST CANCELLATION REASONS | ARRAY |
| GET | `/vista/sd/rpc/sd-ewl-list` | SD EWL LIST | ARRAY |
| GET | `/vista/sd/rpc/sd-ewl-detail` | SD EWL DETAIL | ARRAY |
| GET | `/vista/sd/rpc/sd-ewl-new` | SD EWL NEW | ARRAY |
| GET | `/vista/sd/rpc/sd-ewl-disposition` | SD EWL DISPOSITION | SINGLE VALUE |
| POST | `/vista/sd/rpc/sd-ewl-delete` | SD EWL DELETE | SINGLE VALUE |
| GET | `/vista/sd/rpc/sd-ewl-is-patient-on-list` | SD EWL IS PATIENT ON LIST | SINGLE VALUE |
| POST | `/vista/sd/rpc/sd-ewl-update` | SD EWL UPDATE | SINGLE VALUE |
| GET | `/vista/sd/rpc/sd-get-schduling-request-types` | SD GET SCHDULING REQUEST TYPES | ARRAY |
| GET | `/vista/sd/rpc/sd-recall-facility-list` | SD RECALL FACILITY LIST | ARRAY |
| GET | `/vista/sd/rpc/sd-recall-list-by-patient` | SD RECALL LIST BY PATIENT | ARRAY |
| GET | `/vista/sd/rpc/sd-wait-list-by-dfn` | SD WAIT LIST BY DFN | ARRAY |
| GET | `/vista/sd/rpc/sd-facility-near-list` | SD FACILITY NEAR LIST | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sd-patient-near-list` | SD PATIENT NEAR LIST | ARRAY |
| GET | `/vista/sd/rpc/sd-facility-wait-list` | SD FACILITY WAIT LIST | ARRAY |
| POST | `/vista/sd/rpc/sd-update-near-list` | SD UPDATE NEAR LIST | ARRAY |
| GET | `/vista/sd/rpc/sd-patient-pending-appt` | SD PATIENT PENDING APPT | ARRAY |
| GET | `/vista/sd/rpc/sd-provider-to-clinics` | SD PROVIDER TO CLINICS | ARRAY |
| GET | `/vista/sd/rpc/sd-remove-from-recall-list` | SD REMOVE FROM RECALL LIST | ARRAY |
| POST | `/vista/sd/rpc/sd-cancel-appointment` | SD CANCEL APPOINTMENT | SINGLE VALUE |
| GET | `/vista/sd/rpc/sd-remove-from-ewl` | SD REMOVE FROM EWL | ARRAY |
| GET | `/vista/sd/rpc/sd-additional-clinic-details` | SD ADDITIONAL CLINIC DETAILS | ARRAY |
| POST | `/vista/sd/rpc/sd-add-to-recall-list` | SD ADD TO RECALL LIST | ARRAY |
| POST | `/vista/sd/rpc/sd-verify-access-to-clinic` | SD VERIFY ACCESS TO CLINIC | ARRAY |
| GET | `/vista/sd/rpc/sd-new-ewl-entry` | SD NEW EWL ENTRY | ARRAY |
| GET | `/vista/sd/rpc/sd-patient-admissions` | SD PATIENT ADMISSIONS | ARRAY |
| GET | `/vista/sd/rpc/sd-no-patient-cslt-lookup` | SD NO PATIENT CSLT LOOKUP | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecloc-privloc` | SDECLOC PRIVLOC | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecrmg-rmg` | SDECRMG RMG | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecrmg-reccnt` | SDECRMG RECCNT | SINGLE VALUE |
| GET | `/vista/sd/rpc/sdecidx-reccnt` | SDECIDX RECCNT | SINGLE VALUE |
| GET | `/vista/sd/rpc/sdecidx-getrec` | SDECIDX GETREC | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecloc-updpriv` | SDECLOC UPDPRIV | ARRAY |
| GET | `/vista/sd/rpc/sdecar-armrtc` | SDECAR ARMRTC | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecrmg2-urgency` | SDECRMG2 URGENCY | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecar-arappt` | SDECAR ARAPPT | GLOBAL ARRAY |
| POST | `/vista/sd/rpc/sdeclk-lock` | SDECLK LOCK | GLOBAL ARRAY |
| POST | `/vista/sd/rpc/sdeclk-unlock` | SDECLK UNLOCK | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecdis-disabil` | SDECDIS DISABIL | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecdev-device` | SDECDEV DEVICE | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sd-vse-report-rpc` | SD VSE REPORT RPC | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sd-vse-filter-rpc` | SD VSE FILTER RPC | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecar-auditget` | SDECAR AUDITGET | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecwl-auditget` | SDECWL AUDITGET | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdeccap-get` | SDECCAP GET | GLOBAL ARRAY |
| POST | `/vista/sd/rpc/sdeccap-set` | SDECCAP SET | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdeccap-can` | SDECCAP CAN | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecapp-getype` | SDECAPP GETYPE | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecar-armult` | SDECAR ARMULT | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecdem-marital` | SDECDEM MARITAL | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecdem-religion` | SDECDEM RELIGION | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecdem-ziplink` | SDECDEM ZIPLINK | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecar3-aredit` | SDECAR3 AREDIT | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecrmgp-getrmgup` | SDECRMGP GETRMGUP | SINGLE VALUE |
| GET | `/vista/sd/rpc/sdecrmgp-putrmgup` | SDECRMGP PUTRMGUP | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdec57-obm` | SDEC57 OBM | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecdev-print` | SDECDEV PRINT | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecdev-dev` | SDECDEV DEV | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecu4-getfont` | SDECU4 GETFONT | SINGLE VALUE |
| GET | `/vista/sd/rpc/sdecu4-putfont` | SDECU4 PUTFONT | SINGLE VALUE |
| GET | `/vista/sd/rpc/sdec01-clinics` | SDEC01 CLINICS | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecar1-arguid` | SDECAR1 ARGUID | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdecstng-helplink` | SDECSTNG HELPLINK | GLOBAL ARRAY |
| POST | `/vista/sd/rpc/sdes2-create-clinic` | SDES2 CREATE CLINIC | ARRAY |
| GET | `/vista/sd/rpc/sdes2-edit-clinic` | SDES2 EDIT CLINIC | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-holidays` | SDES2 GET HOLIDAYS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-requests-by-inst` | SDES2 GET REQUESTS BY INST | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-patient-med-list` | SDES2 GET PATIENT MED LIST | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-contact-attempts` | SDES2 GET CONTACT ATTEMPTS | ARRAY |
| POST | `/vista/sd/rpc/sdes2-add-contact-attempt` | SDES2 ADD CONTACT ATTEMPT | ARRAY |
| GET | `/vista/sd/rpc/sdes2-search-clinic-attributes` | SDES2 SEARCH CLINIC ATTRIBUTES | ARRAY |
| GET | `/vista/sd/rpc/sdes2-edit-pat-pre-reg` | SDES2 EDIT PAT PRE-REG | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-help-links` | SDES2 GET HELP LINKS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-patient-ep` | SDES2 GET PATIENT EP | ARRAY |
| GET | `/vista/sd/rpc/sdes2-restore-clin-avail` | SDES2 RESTORE CLIN AVAIL | ARRAY |
| GET | `/vista/sd/rpc/sdes2-reactivate-clinic` | SDES2 REACTIVATE CLINIC | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-last-selected-pat` | SDES2 GET LAST SELECTED PAT | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-expanded-entry` | SDES2 GET EXPANDED ENTRY | ARRAY |
| GET | `/vista/sd/rpc/sdes2-inactivate-clinic` | SDES2 INACTIVATE CLINIC | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-vvc-stop-codes` | SDES2 GET VVC STOP CODES | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-appt-types-by-dfn` | SDES2 GET APPT TYPES BY DFN | ARRAY |
| GET | `/vista/sd/rpc/sdes2-patient-search` | SDES2 PATIENT SEARCH | ARRAY |
| POST | `/vista/sd/rpc/sdes2-create-last-selected-pat` | SDES2 CREATE LAST SELECTED PAT | ARRAY |
| POST | `/vista/sd/rpc/sdes2-get-recall-delete-reason` | SDES2 GET RECALL DELETE REASON | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-spec-needs-prefs` | SDES2 GET SPEC NEEDS PREFS | ARRAY |
| POST | `/vista/sd/rpc/sdes2-create-spec-needs-prefs` | SDES2 CREATE SPEC NEEDS PREFS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-edit-spec-needs-prefs` | SDES2 EDIT SPEC NEEDS PREFS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-check-clin-avail-defined` | SDES2 CHECK CLIN AVAIL DEFINED | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-patient-info` | SDES2 GET PATIENT INFO | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-resource-group` | SDES2 GET RESOURCE GROUP | ARRAY |
| POST | `/vista/sd/rpc/sdes2-create-recall-request` | SDES2 CREATE RECALL REQUEST | ARRAY |
| GET | `/vista/sd/rpc/sdes2-edit-recall-request` | SDES2 EDIT RECALL REQUEST | ARRAY |
| GET | `/vista/sd/rpc/sdes2-disposition-appt-req` | SDES2 DISPOSITION APPT REQ | ARRAY |
| GET | `/vista/sd/rpc/sdes2-disposition-recall-req` | SDES2 DISPOSITION RECALL REQ | ARRAY |
| GET | `/vista/sd/rpc/sdes2-checkin` | SDES2 CHECKIN | ARRAY |
| POST | `/vista/sd/rpc/sdes2-create-appointment` | SDES2 CREATE APPOINTMENT | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-cancelled-slots` | SDES2 GET CANCELLED SLOTS | ARRAY |
| POST | `/vista/sd/rpc/sdes2-create-vet-req-and-appt` | SDES2 CREATE VET REQ AND APPT | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-appts-clinien-list` | SDES2 GET APPTS CLINIEN LIST | ARRAY |
| POST | `/vista/sd/rpc/sdes2-set-appt-checkout` | SDES2 SET APPT CHECKOUT | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-resource-ien` | SDES2 GET RESOURCE IEN | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-expanded-entry-2` | SDES2 GET EXPANDED ENTRY 2 | ARRAY |
| POST | `/vista/sd/rpc/sdes2-create-appt-req` | SDES2 CREATE APPT REQ | ARRAY |
| GET | `/vista/sd/rpc/sdes2-edit-appt-req` | SDES2 EDIT APPT REQ | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-appts-by-clin-list` | SDES2 GET APPTS BY CLIN LIST | ARRAY |
| POST | `/vista/sd/rpc/sdes2-cancel-appointment` | SDES2 CANCEL APPOINTMENT | ARRAY |
| POST | `/vista/sd/rpc/sdes2-set-appt-checkin` | SDES2 SET APPT CHECKIN | ARRAY |
| POST | `/vista/sd/rpc/sdes2-set-check-in-step` | SDES2 SET CHECK-IN STEP | ARRAY |
| GET | `/vista/sd/rpc/sdes2-query-appt-requests` | SDES2 QUERY APPT REQUESTS | GLOBAL ARRAY |
| POST | `/vista/sd/rpc/sdes2-create-provider-resource` | SDES2 CREATE PROVIDER RESOURCE | ARRAY |
| GET | `/vista/sd/rpc/sdes2-edit-provider-resource` | SDES2 EDIT PROVIDER RESOURCE | ARRAY |
| POST | `/vista/sd/rpc/sdes2-create-walkin-appt` | SDES2 CREATE WALKIN APPT | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-eligibility-codes` | SDES2 GET ELIGIBILITY CODES | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-patient-clin-status` | SDES2 GET PATIENT CLIN STATUS | ARRAY |
| POST | `/vista/sd/rpc/sdes2-cancel-clinic-avail` | SDES2 CANCEL CLINIC AVAIL | ARRAY |
| GET | `/vista/sd/rpc/sdes2-no-show` | SDES2 NO-SHOW | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-scheduling-users` | SDES2 GET SCHEDULING USERS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-undo-no-show` | SDES2 UNDO NO-SHOW | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-appt-by-appt-ien` | SDES2 GET APPT BY APPT IEN | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-appts-by-clinic-ien` | SDES2 GET APPTS BY CLINIC IEN | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-appts-by-patient-dfn` | SDES2 GET APPTS BY PATIENT DFN | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-recall-by-ien` | SDES2 GET RECALL BY IEN | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-recalls-by-dfn` | SDES2 GET RECALLS BY DFN | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-video-visit-prov` | SDES2 GET VIDEO VISIT PROV | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-appts-by-appt-iens` | SDES2 GET APPTS BY APPT IENS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-info-for-video-visit` | SDES2 GET INFO FOR VIDEO VISIT | ARRAY |
| GET | `/vista/sd/rpc/sdes2-block-and-move` | SDES2 BLOCK AND MOVE | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-appt-req-by-dfn` | SDES2 GET APPT REQ BY DFN | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-appt-req-by-ien` | SDES2 GET APPT REQ BY IEN | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-consults-by-dfn` | SDES2 GET CONSULTS BY DFN | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-consult-by-ien` | SDES2 GET CONSULT BY IEN | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-appt-req-list-by-dfn` | SDES2 GET APPT REQ LIST BY DFN | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-appts-by-cln-res-ien` | SDES2 GET APPTS BY CLN RES IEN | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-patient-registration` | SDES2 GET PATIENT REGISTRATION | ARRAY |
| GET | `/vista/sd/rpc/sdes2-block-pbsp-slots` | SDES2 BLOCK PBSP SLOTS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-urgency-list` | SDES2 GET URGENCY LIST | ARRAY |
| GET | `/vista/sd/rpc/sdes2-undo-checkout` | SDES2 UNDO CHECKOUT | ARRAY |
| GET | `/vista/sd/rpc/sdes2-unblock-pbsp-slots` | SDES2 UNBLOCK PBSP SLOTS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-pat-demographics` | SDES2 GET PAT DEMOGRAPHICS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-edit-pat-demographics` | SDES2 EDIT PAT DEMOGRAPHICS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-demographics` | SDES2 GET DEMOGRAPHICS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-recall-appt-types` | SDES2 GET RECALL APPT TYPES | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-appt-req-by-typ-vet` | SDES2 GET APPT REQ BY TYP VET | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-clinics-by-provider` | SDES2 GET CLINICS BY PROVIDER | ARRAY |
| GET | `/vista/sd/rpc/sdes2-search-recall-providers` | SDES2 SEARCH RECALL PROVIDERS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-appts-by-clinic-list` | SDES2 GET APPTS BY CLINIC LIST | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-clinic-avail-by-svc` | SDES2 GET CLINIC AVAIL BY SVC | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-disp-cont-attempts` | SDES2 GET DISP CONT ATTEMPTS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-clinics-by-station` | SDES2 GET CLINICS BY STATION | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdes2-search-clin-by-stop-code` | SDES2 SEARCH CLIN BY STOP CODE | GLOBAL ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-appts-by-pat-dfn2` | SDES2 GET APPTS BY PAT DFN2 | ARRAY |
| GET | `/vista/sd/rpc/sdes2-search-recall-clinics` | SDES2 SEARCH RECALL CLINICS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-user-profile-by-duz` | SDES2 GET USER PROFILE BY DUZ | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-user-prof-by-secid` | SDES2 GET USER PROF BY SECID | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-services-for-clinics` | SDES2 GET SERVICES FOR CLINICS | ARRAY |
| POST | `/vista/sd/rpc/sdes2-create-clinic-avail` | SDES2 CREATE CLINIC AVAIL | ARRAY |
| GET | `/vista/sd/rpc/sdes2-search-providers` | SDES2 SEARCH PROVIDERS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-edit-appointment` | SDES2 EDIT APPOINTMENT | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-clinic-info` | SDES2 GET CLINIC INFO | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-clinics-by-clin-list` | SDES2 GET CLINICS BY CLIN LIST | ARRAY |
| GET | `/vista/sd/rpc/sdes2-print-appt-letter` | SDES2 PRINT APPT LETTER | ARRAY |
| GET | `/vista/sd/rpc/sdes2-print-appt-letters` | SDES2 PRINT APPT LETTERS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-search-clinic-slots` | SDES2 SEARCH CLINIC SLOTS | ARRAY |
| POST | `/vista/sd/rpc/sdes2-create-letter` | SDES2 CREATE LETTER | ARRAY |
| GET | `/vista/sd/rpc/sdes2-edit-letter` | SDES2 EDIT LETTER | ARRAY |
| POST | `/vista/sd/rpc/sdes2-delete-letter` | SDES2 DELETE LETTER | ARRAY |
| GET | `/vista/sd/rpc/sdes2-search-letter` | SDES2 SEARCH LETTER | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-division-list` | SDES2 GET DIVISION LIST | ARRAY |
| GET | `/vista/sd/rpc/sdes2-edit-temp-address` | SDES2 EDIT TEMP ADDRESS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-letter-types` | SDES2 GET LETTER TYPES | ARRAY |
| GET | `/vista/sd/rpc/sdes2-reactivate-clinic-2` | SDES2 REACTIVATE CLINIC 2 | ARRAY |
| GET | `/vista/sd/rpc/sdes2-clone-clinic-slots` | SDES2 CLONE CLINIC SLOTS | ARRAY |
| POST | `/vista/sd/rpc/sdes2-create-clinic-avail-2` | SDES2 CREATE CLINIC AVAIL 2 | ARRAY |
| POST | `/vista/sd/rpc/sdes2-get-clinic-cancel-slots` | SDES2 GET CLINIC CANCEL SLOTS | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-vista-devices` | SDES2 GET VISTA DEVICES | ARRAY |
| GET | `/vista/sd/rpc/sdes2-remap-clinic/division` | SDES2 REMAP CLINIC/DIVISION | ARRAY |
| GET | `/vista/sd/rpc/sdes2-get-clinic-by-stop-code` | SDES2 GET CLINIC BY STOP CODE | ARRAY |
| POST | `/vista/sd/rpc/sdes2-create-appt-req2` | SDES2 CREATE APPT REQ2 | ARRAY |
| POST | `/vista/sd/rpc/sdes2-create-letter-2` | SDES2 CREATE LETTER 2 | ARRAY |
| GET | `/vista/sd/rpc/sdes2-edit-letter-2` | SDES2 EDIT LETTER 2 | ARRAY |
| GET | `/vista/sd/rpc/sdes2-print-apt-letter-vista` | SDES2 PRINT APT LETTER VISTA | ARRAY |
| GET | `/vista/sd/rpc/sdes2-print-apt-letters-vista` | SDES2 PRINT APT LETTERS VISTA | ARRAY |

## VDL Documentation Reference

Source manual: `data/vista/vdl-manuals/pims-registration-scheduling-tm.pdf`

Refer to the official VA VistA Documentation Library (VDL) manual for:

- Roll & Scroll terminal operation procedures
- Security key assignments and menu management
- FileMan file relationships and data entry rules
- MUMPS routine reference and entry points
