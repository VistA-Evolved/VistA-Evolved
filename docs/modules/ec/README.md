# Event Capture (EC)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `EC` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 46 |
| Menu Options | 7 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `EC GETDSSUNITUSRS`

| Property | Value |
|----------|-------|
| Tag | `ECUSR` |
| Routine | `ECUMRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns an array of users with access to a particular DSS unit.  User access  to a DSS unit is determined from file #200.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getdssunitusrs`

---

### `EC GETECSCREEN`

| Property | Value |
|----------|-------|
| Tag | `ECSCN` |
| Routine | `ECUMRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list active, inactive or both of Event Code Screens from EC EVENT  CODE SCREENS FILE #720.3.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getecscreen`

---

### `EC GETPXREASON`

| Property | Value |
|----------|-------|
| Tag | `ECPXRS` |
| Routine | `ECUMRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Return array entries with Procedure reasons linked to an Event Code screen.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getpxreason`

---

### `EC GETECSDETAIL`

| Property | Value |
|----------|-------|
| Tag | `ECSDTLS` |
| Routine | `ECUMRPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns details on a specific Event Code Screen from the EC EVENT CODE  SCREENS FILE #720.3.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getecsdetail`

---

### `EC GETPATPROCS`

| Property | Value |
|----------|-------|
| Tag | `PATPROC` |
| Routine | `ECUERPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns an array of patient entries from EVENT CAPTURE PATIENT FILE #721 that  matches a location, DSS unit, patient DFN, start date and end date.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getpatprocs`

---

### `EC GETSCNHELP`

| Property | Value |
|----------|-------|
| Tag | `ECHELP` |
| Routine | `ECUURPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the text from the HELP FRAME file (#9.2) based on a help frame.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getscnhelp`

---

### `EC GETECLOC`

| Property | Value |
|----------|-------|
| Tag | `ECLOC` |
| Routine | `ECUMRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns an array with all active Event Capture locations from file #4.

**API Endpoint:** `GET /vista/ec/rpc/ec-getecloc`

---

### `EC GETUSRDSSUNIT`

| Property | Value |
|----------|-------|
| Tag | `USRUNT` |
| Routine | `ECUERPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns an array of DSS units for which the user has access.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getusrdssunit`

---

### `EC GETCPTLST`

| Property | Value |
|----------|-------|
| Tag | `CPTFND` |
| Routine | `ECUMRPC2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Performs a search on a CPT string and returns an array list of matches from  file #81.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getcptlst`

---

### `EC GETECSPROCS`

| Property | Value |
|----------|-------|
| Tag | `PROC` |
| Routine | `ECUERPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns an array of procedures for an Event Code screen (file #720.3). Event code screens are based on location, DSS unit and Category.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getecsprocs`

---

### `EC GETECSCATS`

| Property | Value |
|----------|-------|
| Tag | `CAT` |
| Routine | `ECUERPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns an array of categories for an Event Code screen based on a specific location and DSS unit.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getecscats`

---

### `EC GETBATPROCS`

| Property | Value |
|----------|-------|
| Tag | `PROCBAT` |
| Routine | `ECUERPC1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns an array with entries from EVENT CAPTURE PATIENT FILE #721 for  patients for a specific procedure.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getbatprocs`

---

### `EC REPORTS`

| Property | Value |
|----------|-------|
| Tag | `RPTEN` |
| Routine | `ECRRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This call is used by all Event Capture GUI reports.  Produces report based on option selected from the Delphi application.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | REFERENCE | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-reports`

---

### `EC GETIEN`

| Property | Value |
|----------|-------|
| Tag | `FNDIEN` |
| Routine | `ECUURPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the IEN from a file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ecary | UNKNOWN() | No |
| 2 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getien`

---

### `EC GETPATINFO`

| Property | Value |
|----------|-------|
| Tag | `PATINF` |
| Routine | `ECUERPC1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This is a general purpose call that provides segments of the patient data  from the Event Capture Patient File #721.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getpatinfo`

---

### `EC GETPXMODIFIER`

| Property | Value |
|----------|-------|
| Tag | `ECPXMOD` |
| Routine | `ECUERPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns CPT modifier entries for a CPT Procedure based on procedure date.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getpxmodifier`

---

### `EC GETPROVIDER`

| Property | Value |
|----------|-------|
| Tag | `PRVDER` |
| Routine | `ECUERPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns an array of valid providers based on a procedure date.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getprovider`

---

### `EC GETNATPX`

| Property | Value |
|----------|-------|
| Tag | `ECNATPX` |
| Routine | `ECUMRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns an array of active, inactive or both of Event Capture national and  local Procedures from file #725.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getnatpx`

---

### `EC VALIDATE SPREADSHEET DATA`

| Property | Value |
|----------|-------|
| Tag | `IN` |
| Routine | `ECV1RPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC validates EC spreadsheet data and returns an array containing error messages

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECDATA | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-validate-spreadsheet-data`

---

### `EC GETPATELIG`

| Property | Value |
|----------|-------|
| Tag | `ELIG` |
| Routine | `ECUERPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of patient eligibilities.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getpatelig`

---

### `EC GETPATCLASTAT`

| Property | Value |
|----------|-------|
| Tag | `PATCLAST` |
| Routine | `ECUERPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a patient's in/out status and classifications.    Classifications are: Agent Orange, Ionizing Radiation, SC Condition, Environmental Contaminants, Military Sexual Trauma, Head/Neck Cancer, Combat Veteran, and Project 112/SHAD.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getpatclastat`

---

### `EC GETENCDXS`

| Property | Value |
|----------|-------|
| Tag | `ENCDXS` |
| Routine | `ECUERPC1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a patient encounter primary and secondary diagnosis codes from  Event Capture Patient File (#721).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getencdxs`

---

### `EC GETDSSUNIT`

| Property | Value |
|----------|-------|
| Tag | `DSSUNT` |
| Routine | `ECUMRPC1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns array with active and/or inactive DSS units from file 724.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getdssunit`

---

### `EC GETCAT`

| Property | Value |
|----------|-------|
| Tag | `CAT` |
| Routine | `ECUMRPC1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of active and/or inactive categories from file #726.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ecary | LITERAL | No |
| 2 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getcat`

---

### `EC GETPXLST`

| Property | Value |
|----------|-------|
| Tag | `PXFND` |
| Routine | `ECUMRPC2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Performs a search on a procedure string and returns an array list of matches from file #81 and/or #725. User can type      1.  "A.search string" to search file 81.     2.  "B.search string" to search file 725.     3.  "search string" to search both files.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getpxlst`

---

### `EC DSSCATCHECK`

| Property | Value |
|----------|-------|
| Tag | `CATCHK` |
| Routine | `ECUMRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Checks whether category is used in an Event Code Screen.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-dsscatcheck`

---

### `EC FILER`

| Property | Value |
|----------|-------|
| Tag | `FILE` |
| Routine | `ECFLRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** A general purpose Event Capture filer used when filing data into ECS files.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | REFERENCE | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-filer`

---

### `EC GETLIST`

| Property | Value |
|----------|-------|
| Tag | `SRCLST` |
| Routine | `ECUMRPC1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This call is used to perform a search on a file based on a search string.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getlist`

---

### `EC GETDSSECS`

| Property | Value |
|----------|-------|
| Tag | `DSSECS` |
| Routine | `ECUMRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of Event Code Screen from EC EVENT CODE CREENS FILE #720.3 based on a DSS Unit and location.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getdssecs`

---

### `EC GETLOC`

| Property | Value |
|----------|-------|
| Tag | `GLOC` |
| Routine | `ECUMRPC2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This broker entry point returns all active, inactive or both locations  from file #4.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getloc`

---

### `EC GETPRODEFS`

| Property | Value |
|----------|-------|
| Tag | `PRDEFS` |
| Routine | `ECUERPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This broker entry point returns the defaults for procedure data entry.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getprodefs`

---

### `EC GETDATE`

| Property | Value |
|----------|-------|
| Tag | `ECDATE` |
| Routine | `ECUURPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Broker call returns the client date as a Fileman internal and external date  format.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getdate`

---

### `EC CLASHELP`

| Property | Value |
|----------|-------|
| Tag | `CLHLP` |
| Routine | `ECUERPC1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** RPC Broker entry point for classification help.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-clashelp`

---

### `EC SPACEBAR`

| Property | Value |
|----------|-------|
| Tag | `ECDEF` |
| Routine | `ECUERPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC would return the value equivalent to when the 'Spacebar and Return'  keys are entering in the VISTA package.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-spacebar`

---

### `EC DIEDON`

| Property | Value |
|----------|-------|
| Tag | `ECDOD` |
| Routine | `ECUERPC2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns a patient's date of death.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-diedon`

---

### `EC GETVISITINFO`

| Property | Value |
|----------|-------|
| Tag | `VISINFO` |
| Routine | `ECUERPC2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This broker call returns specific EC patient visit data (location, DSS Unit, patient IEN, etc.) based on a Visit Number.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getvisitinfo`

---

### `EC GETPATCH`

| Property | Value |
|----------|-------|
| Tag | `PATCH` |
| Routine | `ECUURPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Broker call checks to see if a patch has been installed. Returns 1 if patch is installed.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getpatch`

---

### `EC GETVERSION`

| Property | Value |
|----------|-------|
| Tag | `VERSRV` |
| Routine | `ECUURPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the server version of a particular option.  This is used by ECS GUI  to determine the current server version of the software.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getversion`

---

### `ECOB FACTORY`

| Property | Value |
|----------|-------|
| Tag | `FACTORY` |
| Routine | `ECOBUF` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** An RPC to construct(get a handle to) or destroy VistA objects.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARGUMENT | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ecob-factory`

---

### `ECOB METHOD`

| Property | Value |
|----------|-------|
| Tag | `METHOD` |
| Routine | `ECOBUF` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** An RPC to manipulate VistA objects.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARGUMENT | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ecob-method`

---

### `EC RECENT VISITS`

| Property | Value |
|----------|-------|
| Tag | `RCNTVST` |
| Routine | `ECUTL1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns the 20 most recent visits/appointments for a selected patient for the selected location.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-recent-visits`

---

### `EC ICD10IMPLEMENTATIONDATE`

| Property | Value |
|----------|-------|
| Tag | `ICD10` |
| Routine | `ECVICDDT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** The EC ICD10IMPLEMENTATIONDATE RPC returns the Implementation Date of ICD-10 Code Set in MM/DD/YYYY format OR  -1^Error Message.

**API Endpoint:** `GET /vista/ec/rpc/ec-icd10implementationdate`

---

### `EC GET DEFAULT PROVIDER`

| Property | Value |
|----------|-------|
| Tag | `ECDEFPRV` |
| Routine | `ECUERPC2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure will return the default provider based on the DSS  Unit and the user entering data into Event Capture.   If the user is an active provider then they will be the default  regardless of the DSS unit's send to PCE setting.   If the user is not an active provider then a check is ma

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-get-default-provider`

---

### `EC DELETE TEST PATIENT DATA`

| Property | Value |
|----------|-------|
| Tag | `DTPD` |
| Routine | `ECUMRPC2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to delete any test patient data from the EVENT CAPTURE  PATIENT file (#721).    If the patient is identified as a test patient and the procedure associated with the test patient record is not in the range of CH103 to CH109 then the record will be deleted.  If the procedure is in thi

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `POST /vista/ec/rpc/ec-delete-test-patient-data`

---

### `EC GETPRBLST`

| Property | Value |
|----------|-------|
| Tag | `GETPLST` |
| Routine | `ECUERPC2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a problem list for an Event Capture patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | LITERAL | No |

**API Endpoint:** `GET /vista/ec/rpc/ec-getprblst`

---

### `EC DELETE FILE ENTRY`

| Property | Value |
|----------|-------|
| Tag | `ECDEL` |
| Routine | `ECUMRPC2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** A general pupose for deletion of entry in ECS files.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ECARY | REFERENCE | No |

**API Endpoint:** `POST /vista/ec/rpc/ec-delete-file-entry`

---


## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| EC PRO SUM | — |
| EC OS SUM | — |
| EC PCE FEED | — |
| EC PCE REPORT | — |
| EC NTPCE REPORT | — |

### Broker

| Name | Security Key |
|------|-------------|
| EC GUI CONTEXT | — |

### Action

| Name | Security Key |
|------|-------------|
| EC DSS UNIT SECONDARY ASSOC | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/ec/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/ec/rpc/ec-getdssunitusrs` | EC GETDSSUNITUSRS | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getecscreen` | EC GETECSCREEN | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getpxreason` | EC GETPXREASON | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getecsdetail` | EC GETECSDETAIL | SINGLE VALUE |
| GET | `/vista/ec/rpc/ec-getpatprocs` | EC GETPATPROCS | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getscnhelp` | EC GETSCNHELP | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getecloc` | EC GETECLOC | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getusrdssunit` | EC GETUSRDSSUNIT | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getcptlst` | EC GETCPTLST | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getecsprocs` | EC GETECSPROCS | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getecscats` | EC GETECSCATS | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getbatprocs` | EC GETBATPROCS | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-reports` | EC REPORTS | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getien` | EC GETIEN | SINGLE VALUE |
| GET | `/vista/ec/rpc/ec-getpatinfo` | EC GETPATINFO | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getpxmodifier` | EC GETPXMODIFIER | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getprovider` | EC GETPROVIDER | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getnatpx` | EC GETNATPX | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-validate-spreadsheet-data` | EC VALIDATE SPREADSHEET DATA | ARRAY |
| GET | `/vista/ec/rpc/ec-getpatelig` | EC GETPATELIG | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getpatclastat` | EC GETPATCLASTAT | SINGLE VALUE |
| GET | `/vista/ec/rpc/ec-getencdxs` | EC GETENCDXS | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getdssunit` | EC GETDSSUNIT | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getcat` | EC GETCAT | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getpxlst` | EC GETPXLST | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-dsscatcheck` | EC DSSCATCHECK | SINGLE VALUE |
| GET | `/vista/ec/rpc/ec-filer` | EC FILER | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getlist` | EC GETLIST | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getdssecs` | EC GETDSSECS | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getloc` | EC GETLOC | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getprodefs` | EC GETPRODEFS | SINGLE VALUE |
| GET | `/vista/ec/rpc/ec-getdate` | EC GETDATE | SINGLE VALUE |
| GET | `/vista/ec/rpc/ec-clashelp` | EC CLASHELP | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-spacebar` | EC SPACEBAR | SINGLE VALUE |
| GET | `/vista/ec/rpc/ec-diedon` | EC DIEDON | SINGLE VALUE |
| GET | `/vista/ec/rpc/ec-getvisitinfo` | EC GETVISITINFO | SINGLE VALUE |
| GET | `/vista/ec/rpc/ec-getpatch` | EC GETPATCH | SINGLE VALUE |
| GET | `/vista/ec/rpc/ec-getversion` | EC GETVERSION | SINGLE VALUE |
| GET | `/vista/ec/rpc/ecob-factory` | ECOB FACTORY | ARRAY |
| GET | `/vista/ec/rpc/ecob-method` | ECOB METHOD | ARRAY |
| GET | `/vista/ec/rpc/ec-recent-visits` | EC RECENT VISITS | ARRAY |
| GET | `/vista/ec/rpc/ec-icd10implementationdate` | EC ICD10IMPLEMENTATIONDATE | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-get-default-provider` | EC GET DEFAULT PROVIDER | SINGLE VALUE |
| POST | `/vista/ec/rpc/ec-delete-test-patient-data` | EC DELETE TEST PATIENT DATA | GLOBAL ARRAY |
| GET | `/vista/ec/rpc/ec-getprblst` | EC GETPRBLST | GLOBAL ARRAY |
| POST | `/vista/ec/rpc/ec-delete-file-entry` | EC DELETE FILE ENTRY | GLOBAL ARRAY |
