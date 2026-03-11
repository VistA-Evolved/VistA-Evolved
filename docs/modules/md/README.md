# Clinical Procedures (MD)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `MD` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 24 |
| Menu Options | 19 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `MD TMDUSER`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDRPCOU` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Manages the VistA interface to the TMDUser object.   Available options:   SIGNON     Connects session to the server and attempts signon.   ESIG       Verifies passed e-sig.   CHKVER     Verifies client version is compatible with server.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTION | LITERAL | No |
| 2 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/md/rpc/md-tmduser`

---

### `MD TMDPARAMETER`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDRPCOV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** Used to set/retrieve/modify parameters in the Kernel ToolKit PARAMETERS (XPAR) files.   RPC is called as follows:   Param[0] := OPTION Param[1] := Entity Param[2] := Parameter name Param[3] := Instance Param[4] := Value

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTION | LITERAL | No |
| 2 | ENTITY | LITERAL | No |
| 3 | PAR | LITERAL | No |
| 4 | INST | LITERAL | No |
| 5 | VAL | LITERAL | No |

**API Endpoint:** `GET /vista/md/rpc/md-tmdparameter`

---

### `MD TMDRECORDID`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDRPCOR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** General RPC for VA Fileman functions.   Param 1 is passed in as the function to perform and includes the following:   LOOKUP:   Performs very generic file lookup functionality VALIDATE: Validates input to a fileman field and saves to FDA DELREC:   Validates ability to delete and if able deletes a re

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTION | LITERAL | No |
| 2 | DDNUM | LITERAL | No |
| 3 | IENS | LITERAL | No |
| 4 | FLD | LITERAL | No |
| 5 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/md/rpc/md-tmdrecordid`

---

### `MD TMDOUTPUT`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDRPCOO` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Manages the output of VistA data to the client via the default HFS device.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTION | LITERAL | No |
| 2 | RTN | LITERAL | No |

**API Endpoint:** `GET /vista/md/rpc/md-tmdoutput`

---

### `MD TMDPROCEDURE`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDRPCOD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/md/rpc/md-tmdprocedure`

---

### `MD TMDPATIENT`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDRPCOP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/md/rpc/md-tmdpatient`

---

### `MD TMDTRANSACTION`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDRPCOT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/md/rpc/md-tmdtransaction`

---

### `MD UTILITIES`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDRPCU` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/md/rpc/md-utilities`

---

### `MD GATEWAY`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDRPCOG` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/md/rpc/md-gateway`

---

### `MDK GET VISTA DATA`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDKRPC1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTION | LITERAL | No |
| 2 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/md/rpc/mdk-get-vista-data`

---

### `MD TMDWIDGET`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDRPCOW` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/md/rpc/md-tmdwidget`

---

### `MDK UTILITY`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDKUTLR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/md/rpc/mdk-utility`

---

### `MDK GET/SET RENAL DATA`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDKRPC2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `POST /vista/md/rpc/mdk-get/set-renal-data`

---

### `MD TMDNOTE`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDRPCNT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call does the following: Accepts the following Inputs:    RESULTS - Both (Input and Output) - Passed in as the array to return              results in.      OPTION - NEWDOC = Add additional new document to the Hemodialysis                      study.               NOTELIST = Re

**API Endpoint:** `GET /vista/md/rpc/md-tmdnote`

---

### `MD TMDCIDC`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDRPCW` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will do the following:   Input Parameter: RESULTS - (Both Input/Output) Passed in as the array to                               return the results.                    OPTION  - (Input) PROC - obtain a list of Procedures                                             defined for a clinic.

**API Endpoint:** `GET /vista/md/rpc/md-tmdcidc`

---

### `MD TMDLEX`

| Property | Value |
|----------|-------|
| Tag | `LEX` |
| Routine | `MDRPCW1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return a list of CPT or ICD for a search typed in.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MDSRCH | LITERAL | No |
| 2 | MDAPP | LITERAL | No |
| 3 | STUDY | LITERAL | No |

**API Endpoint:** `GET /vista/md/rpc/md-tmdlex`

---

### `MD TMDENCOUNTER`

| Property | Value |
|----------|-------|
| Tag | `GETENC` |
| Routine | `MDRPCW1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure will return the existing data in an encounter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STUDY | LITERAL | No |

**API Endpoint:** `GET /vista/md/rpc/md-tmdencounter`

---

### `MD TMDSUBMITU`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDRPCOWU` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/md/rpc/md-tmdsubmitu`

---

### `MD CLIO`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `MDCLIO` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This is the primary RPC called by the CliO engine for normal command  processing.

**API Endpoint:** `GET /vista/md/rpc/md-clio`

---

### `MDCP RESULTS BY STATUS`

| Property | Value |
|----------|-------|
| Tag | `GTMSGIDS` |
| Routine | `MDCPHL7B` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This broker call will return a list of IENS from the CP RESULT REPORT  file based on the STATUS passed in as a parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MDCPSTAT | LITERAL | No |

**API Endpoint:** `GET /vista/md/rpc/mdcp-results-by-status`

---

### `MDCP MESSAGE BY IEN`

| Property | Value |
|----------|-------|
| Tag | `GETMSG` |
| Routine | `MDCPHL7B` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns an HL7 message based on its IEN.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MDCPMSG | LITERAL | No |

**API Endpoint:** `GET /vista/md/rpc/mdcp-message-by-ien`

---

### `MDCP CORRECTIONS BY IEN`

| Property | Value |
|----------|-------|
| Tag | `GETCORR` |
| Routine | `MDCPHL7B` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Gets a list of corrections for a given HL7 message.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MDCPMSG | LITERAL | No |

**API Endpoint:** `GET /vista/md/rpc/mdcp-corrections-by-ien`

---

### `MDCP UPDATE MESSAGE STATUS`

| Property | Value |
|----------|-------|
| Tag | `UPDATERP` |
| Routine | `MDCPHL7B` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This call will update the status of an entry in file 704.002 (the CLIO_HL7_LOG file).  Note that if the status passed through is  'PROCESSED', the CP INSTRUMENT file entry pointed to by field .03 will be  checked to see if it has a routine in its .11 field.  If it does, the HL7  message will be copi

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MDCPMSG | LITERAL | No |
| 2 | MDCPSTAT | LITERAL | No |
| 3 | MDCPDFN | LITERAL | No |
| 4 | MDCPISCR | LITERAL | No |

**API Endpoint:** `POST /vista/md/rpc/mdcp-update-message-status`

---

### `MDCP UPDATE MESSAGE REASON`

| Property | Value |
|----------|-------|
| Tag | `UPDRSN` |
| Routine | `MDCPHL7B` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC call will add word processing text to the CLIO_HL7_LOG file to  explain the reason for the current status.  It is primarily intended to  be used to store error text from CliO.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MDCPMSG | LITERAL | No |
| 2 | MDCPTEXT | LITERAL | No |

**API Endpoint:** `POST /vista/md/rpc/mdcp-update-message-reason`

---


## Menu Options

### Broker

| Name | Security Key |
|------|-------------|
| MD GUI MANAGER | — |
| MD GUI USER | — |
| MD HEMODIALYSIS USER | — |
| MD CLIO | — |

### Run routine

| Name | Security Key |
|------|-------------|
| MD SCHEDULED STUDIES | — |
| MD STUDY CHECK-IN | — |
| MD AUTO CHECK-IN SETUP | — |
| MD STUDIES LIST | — |
| MD PROCESS NOSHOW/CANCEL | — |
| MD PROC W/INCOMPLETE WORKLOAD | — |
| MD PROCESS RESULTS | — |
| MD HIGH VOLUME PROCEDURE SETUP | — |
| MD DEVICE SURVEY TRANSMISSION | — |
| MD CONCONVERT | MD ADMINISTRATOR |
| MD PROCONVERT | MD ADMINISTRATOR |

### Edit

| Name | Security Key |
|------|-------------|
| MD DICOM | — |
| MD CARTCL | — |

### Menu

| Name | Security Key |
|------|-------------|
| MD COORDINATOR | — |
| MD UTILITIES | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `MD ADMINISTRATOR`

## API Route Summary

All routes are prefixed with `/vista/md/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/md/rpc/md-tmduser` | MD TMDUSER | GLOBAL ARRAY |
| GET | `/vista/md/rpc/md-tmdparameter` | MD TMDPARAMETER | GLOBAL ARRAY |
| GET | `/vista/md/rpc/md-tmdrecordid` | MD TMDRECORDID | GLOBAL ARRAY |
| GET | `/vista/md/rpc/md-tmdoutput` | MD TMDOUTPUT | GLOBAL ARRAY |
| GET | `/vista/md/rpc/md-tmdprocedure` | MD TMDPROCEDURE | GLOBAL ARRAY |
| GET | `/vista/md/rpc/md-tmdpatient` | MD TMDPATIENT | GLOBAL ARRAY |
| GET | `/vista/md/rpc/md-tmdtransaction` | MD TMDTRANSACTION | GLOBAL ARRAY |
| GET | `/vista/md/rpc/md-utilities` | MD UTILITIES | GLOBAL ARRAY |
| GET | `/vista/md/rpc/md-gateway` | MD GATEWAY | GLOBAL ARRAY |
| GET | `/vista/md/rpc/mdk-get-vista-data` | MDK GET VISTA DATA | ARRAY |
| GET | `/vista/md/rpc/md-tmdwidget` | MD TMDWIDGET | GLOBAL ARRAY |
| GET | `/vista/md/rpc/mdk-utility` | MDK UTILITY | GLOBAL ARRAY |
| POST | `/vista/md/rpc/mdk-get/set-renal-data` | MDK GET/SET RENAL DATA | GLOBAL ARRAY |
| GET | `/vista/md/rpc/md-tmdnote` | MD TMDNOTE | GLOBAL ARRAY |
| GET | `/vista/md/rpc/md-tmdcidc` | MD TMDCIDC | GLOBAL ARRAY |
| GET | `/vista/md/rpc/md-tmdlex` | MD TMDLEX | GLOBAL ARRAY |
| GET | `/vista/md/rpc/md-tmdencounter` | MD TMDENCOUNTER | GLOBAL ARRAY |
| GET | `/vista/md/rpc/md-tmdsubmitu` | MD TMDSUBMITU | GLOBAL ARRAY |
| GET | `/vista/md/rpc/md-clio` | MD CLIO | GLOBAL ARRAY |
| GET | `/vista/md/rpc/mdcp-results-by-status` | MDCP RESULTS BY STATUS | GLOBAL ARRAY |
| GET | `/vista/md/rpc/mdcp-message-by-ien` | MDCP MESSAGE BY IEN | GLOBAL ARRAY |
| GET | `/vista/md/rpc/mdcp-corrections-by-ien` | MDCP CORRECTIONS BY IEN | ARRAY |
| POST | `/vista/md/rpc/mdcp-update-message-status` | MDCP UPDATE MESSAGE STATUS | ARRAY |
| POST | `/vista/md/rpc/mdcp-update-message-reason` | MDCP UPDATE MESSAGE REASON | GLOBAL ARRAY |
