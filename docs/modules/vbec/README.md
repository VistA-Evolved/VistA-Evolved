# VBECS (VBEC)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `VBEC` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 14 |
| Menu Options | 29 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `VBECS PATIENT LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `SEARCH` |
| Routine | `VBECLU` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns XML containing a list of patient demographic data for  the purpose of inserting a new patient in the VBECS database for  when receiving an autologous or directed unit on a patient that is not  already defined in the VBECS Patient table.   XML Mapping: count attribute =       Number

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM | LITERAL | No |

**API Endpoint:** `GET /vista/vbec/rpc/vbecs-patient-lookup`

---

### `VBECS HOSPITAL LOCATION LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `LOC` |
| Routine | `VBECRPCD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns XML containing a list of Hospital Locations from the  HOSPITAL LOCATION file (#44) of either Ward or Clinic Type for use in  VBECS when issuing units to a location other than the Blood Bank.   XML Mapping: LocationName element = HOSPITAL LOCATION file (#44) / NAME field (#.01) Locat

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIV | LITERAL | No |

**API Endpoint:** `GET /vista/vbec/rpc/vbecs-hospital-location-lookup`

---

### `VBECS PROVIDER LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `PROVIDER` |
| Routine | `VBECRPCE` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns XML containing a list of physicians in the NEW PERSON  file (#200) that hold the PROVIDER Security Key and do not have a  TERMINATION DATE value prior to the current date, and has a matching  division from the DIV input parameter whose last name starts with the  DATA input parameter

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIV | LITERAL | No |
| 2 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/vbec/rpc/vbecs-provider-lookup`

---

### `VBECS LABORATORY TEST LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `LABTEST` |
| Routine | `VBECRPCA` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns XML containing a list of Laboratory tests from the  LABORATORY TEST file (#60).   XML Mapping: Name element =          LABORATORY TEST file (#60) / NAME field (#.01) IEN element =           LABORATORY TEST file (#60) / NUMBER field (#.001) Specimen element =      LABORATORY TEST fil

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/vbec/rpc/vbecs-laboratory-test-lookup`

---

### `VBECS DIVISION LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `DIV` |
| Routine | `VBECRPCM` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns XML containing a list of active VAMC divisions associated with a Medical Center.   XML Mapping: DivisionId element =   INSTITUTION file (#4) / STATION NUMBER field (#99) DivisionName element = INSTITUTION file (#4) / NAME field (#.01)   XML Example: <Divisions>     <Division>

**API Endpoint:** `GET /vista/vbec/rpc/vbecs-division-lookup`

---

### `VBECS BLOOD BANK USER LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `BBUSER` |
| Routine | `VBECRPCM` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns XML containing a list of users from the New Person file #200 that hold the Security Keys associated with Blood Bank.   XML Mapping: count attribute =        Number of records found userName attribute =     NEW PERSON file (#200) / NAME field (#.01) userDuz attribute =      NEW PERSO

**API Endpoint:** `GET /vista/vbec/rpc/vbecs-blood-bank-user-lookup`

---

### `VBECS WORKLOAD CODES LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `WKLD` |
| Routine | `VBECRPCW` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns XML containing a list of Workload Codes from the WKLD CODE file (#64) with a WORKLOAD CODE LAB SECTION of "Blood Bank" to VBECS.   XML Mapping: LMIP element =             WKLD CODE file (#64) / WKLD CODE field (#1) Procedure element =        WKLD CODE file (#64) / PROCEDURE field (#

**API Endpoint:** `GET /vista/vbec/rpc/vbecs-workload-codes-lookup`

---

### `VBECS HCPCS CODES LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `HCPCS` |
| Routine | `VBECRPCH` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns XML containing a list of active HCPCS codes from the CPT file with a CPT Category of Pathology and Laboratory Services for use in VBECS.   XML Mapping: Code element = CPT file (#81) / CODE field (#.01) Name element = CPT file (#81) / SHORT NAME field (#2)   XML Example: <Root>     <

**API Endpoint:** `GET /vista/vbec/rpc/vbecs-hcpcs-codes-lookup`

---

### `VBECS MED PROFILE LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `RX` |
| Routine | `VBECRPCP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns XML containing a list of medications for a patient from  the Pharmacy package within a given date range.   The patient demographic data is provided by the VistA API DEM^VADPT in  the VADM array.   The medication related data is provided by the Pharmacy API OCL^PSOORRL in the ^TMP("P

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDATE | LITERAL | No |
| 2 | EDATE | LITERAL | No |
| 3 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/vbec/rpc/vbecs-med-profile-lookup`

---

### `VBECS LAB ACCESSION UID LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `ORDNUM` |
| Routine | `VBECRPCB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns XML containing a list of Laboratory tests and  associated data based on a Lab Order number. The data is used in VBECS to  validate an order and associated a specimen UID with the Blood Bank  request.   XML Mapping: PatientName element =     PATIENT file (#2) / NAME field (#.01) Vist

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VBLRO | LITERAL | No |

**API Endpoint:** `GET /vista/vbec/rpc/vbecs-lab-accession-uid-lookup`

---

### `VBECS LAB TEST RESULTS LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `TSTRSLT` |
| Routine | `VBECRPCA` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns XML containing a list of Laboratory test results for a  patient within a given date range.   The data returned is provided by the Lab API RR^LR7OR1 in the  ^TMP("LRRR" global array in the following format.   ^TMP("LRRR",$J,DFN,SUB,inverse d/t,sequence #)  = Test^result^L/N flag^ uni

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDATE | LITERAL | No |
| 2 | EDATE | LITERAL | No |
| 3 | DIV | LITERAL | No |
| 4 | TESTS | LITERAL | No |
| 5 | PATS | LITERAL | No |

**API Endpoint:** `GET /vista/vbec/rpc/vbecs-lab-test-results-lookup`

---

### `VBECS ACCESSION AREA LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `ACNAREA` |
| Routine | `VBECRPCM` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns XML containing a list of Lab Blood Bank Accession Areas from the ACCESSION file (#68) where the LR SUBSCRIPT field .02 is set to BLOOD BANK for use in the gov.va.med.vbecs rehosted Blood Bank application.   XML Mapping: AccessionAreaName element = ACCESSION file (#68) / ACCESSION AR

**API Endpoint:** `GET /vista/vbec/rpc/vbecs-accession-area-lookup`

---

### `VBECS LAB ORDER LOOKUP BY UID`

| Property | Value |
|----------|-------|
| Tag | `ORDER` |
| Routine | `VBECRPCB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns XML containing a list of laboratory tests and associated  data based on a Specimen UID. The data is used in VBECS to identify an  existing VBECS order based on the Lab Order number provided by CPRS.    XML Mapping:  PatientName element =     PATIENT file (#2) / NAME field (#.01)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VBUID | LITERAL | No |

**API Endpoint:** `GET /vista/vbec/rpc/vbecs-lab-order-lookup-by-uid`

---

### `VBECS DSS EXTRACT`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `VBECDSS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC inserts or updates post transfusion related data in the VBECS DSS EXTRACT file (#6002.03). The data is passed into the VBECDSS routine  through the input parameters and a success indicator is returned to the  Blood Bank medical device.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMS | LITERAL | No |

**API Endpoint:** `GET /vista/vbec/rpc/vbecs-dss-extract`

---


## Menu Options

### Menu

| Name | Security Key |
|------|-------------|
| VBEC MAIN MENU | LRLIASON |
| VBEC PRE-CONVERSION UTILITIES | — |
| VBEC CONVERSION UTILITIES | — |
| VBEC POST-CONVERSION UTILITIES | — |
| VBEC TRANS. REACTION UTILITIES | — |
| VBEC ANTIBODY/ANTIGEN UTIL. | — |

### Run routine

| Name | Security Key |
|------|-------------|
| VBEC DELETE EXTRACTED DATA | — |
| VBEC DELETE SYSTEM LEVEL FILES | — |
| VBEC DATA CONV. TO HOST FILES | — |
| VBEC DATA VALIDATION | — |
| VBEC SITE PARAMETER ENTER/EDIT | — |
| VBEC INVALID DATA REPORT | — |
| VBEC STANDARD ANTIBODIES | — |
| VBEC STANDARD TRANS. REACTIONS | — |
| VBEC PRINT SQL/VISTA MATCHES | — |
| VBEC UNMATCHED VISTA DATA RPT | — |
| VBEC UNDO ANTIBODY/ANTIGEN | — |
| VBEC UNDO TRANS. REACTIONS | — |
| VBEC UNDO SINGLE MATCHING | — |
| VBEC DELETE ANTIBODY/ANTIGEN | — |
| VBEC DELETE TRANS. REACTION | — |
| VBEC UPDATE ANTIBODY/ANTIGEN | — |
| VBEC UPDATE TRANS. REACT. REC | — |
| VBEC MATCH ANTIBODY/ANTIGEN | — |
| VBEC MATCH TRANSFUS REACTION | — |
| VBEC BB COMPONENTS DISABLE | — |
| VBEC BB COMPONENTS ENABLE | — |
| VBEC DELETE CONV. STATS | — |
| VBEC DATA CONVERSION STATS | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `LRLIASON`

## API Route Summary

All routes are prefixed with `/vista/vbec/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/vbec/rpc/vbecs-patient-lookup` | VBECS PATIENT LOOKUP | GLOBAL ARRAY |
| GET | `/vista/vbec/rpc/vbecs-hospital-location-lookup` | VBECS HOSPITAL LOCATION LOOKUP | GLOBAL ARRAY |
| GET | `/vista/vbec/rpc/vbecs-provider-lookup` | VBECS PROVIDER LOOKUP | GLOBAL ARRAY |
| GET | `/vista/vbec/rpc/vbecs-laboratory-test-lookup` | VBECS LABORATORY TEST LOOKUP | GLOBAL ARRAY |
| GET | `/vista/vbec/rpc/vbecs-division-lookup` | VBECS DIVISION LOOKUP | GLOBAL ARRAY |
| GET | `/vista/vbec/rpc/vbecs-blood-bank-user-lookup` | VBECS BLOOD BANK USER LOOKUP | GLOBAL ARRAY |
| GET | `/vista/vbec/rpc/vbecs-workload-codes-lookup` | VBECS WORKLOAD CODES LOOKUP | GLOBAL ARRAY |
| GET | `/vista/vbec/rpc/vbecs-hcpcs-codes-lookup` | VBECS HCPCS CODES LOOKUP | GLOBAL ARRAY |
| GET | `/vista/vbec/rpc/vbecs-med-profile-lookup` | VBECS MED PROFILE LOOKUP | GLOBAL ARRAY |
| GET | `/vista/vbec/rpc/vbecs-lab-accession-uid-lookup` | VBECS LAB ACCESSION UID LOOKUP | GLOBAL ARRAY |
| GET | `/vista/vbec/rpc/vbecs-lab-test-results-lookup` | VBECS LAB TEST RESULTS LOOKUP | GLOBAL ARRAY |
| GET | `/vista/vbec/rpc/vbecs-accession-area-lookup` | VBECS ACCESSION AREA LOOKUP | GLOBAL ARRAY |
| GET | `/vista/vbec/rpc/vbecs-lab-order-lookup-by-uid` | VBECS LAB ORDER LOOKUP BY UID | GLOBAL ARRAY |
| GET | `/vista/vbec/rpc/vbecs-dss-extract` | VBECS DSS EXTRACT | GLOBAL ARRAY |
