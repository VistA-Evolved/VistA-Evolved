# GMV (GMV)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Temperature, BP, pulse, respiration, height, weight, pain

| Property | Value |
|----------|-------|
| Namespace | `GMV` |
| Tier | 5 |
| FileMan Files | 2 |
| RPCs | 32 |
| Menu Options | 1 |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 120.5 | File #120.5 | ? | ? |
| 120.51 | File #120.51 | ? | ? |

## Remote Procedure Calls (RPCs)

### `GMV CONVERT DATE`

| Property | Value |
|----------|-------|
| Tag | `GETDT` |
| Routine | `GMVGETQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call converts a user-supplied date/time into VA FileMan's internal and external date format.   This remote procedure call is documented in Integration Agreement 4353.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMRDATE | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-convert-date`

---

### `GMV ADD VM`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `GMVDCSAV` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call is used to enter a new Vital/Measurement record in the GMRV Vital Measurement file (#120.5).   This remote procedure call is documented in Integration Agreement 3996.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMRVDATA | LITERAL | No |

**API Endpoint:** `POST /vista/gmv/rpc/gmv-add-vm`

---

### `GMV EXTRACT REC`

| Property | Value |
|----------|-------|
| Tag | `GETVM` |
| Routine | `GMVGETD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call retrieves vital records from the GMRV Vital Measurement (#120.5) file for a selected patient within a given date span.   This remote procedure call is documented in Integration Agreement 4416.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMRVDATA | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-extract-rec`

---

### `GMV WARD LOCATION`

| Property | Value |
|----------|-------|
| Tag | `WARDLOC` |
| Routine | `GMVGETD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This procedure extracts MAS ward locations from the Ward Location file (#42).   Note: No other Input Parameters besides RESULT needed.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUMMY | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-ward-location`

---

### `GMV WARD PT`

| Property | Value |
|----------|-------|
| Tag | `WARDPT` |
| Routine | `GMVGETD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This procedure lists patients registered on a particular MAS ward.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMRWARD | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-ward-pt`

---

### `GMV MARK ERROR`

| Property | Value |
|----------|-------|
| Tag | `ERROR` |
| Routine | `GMVUTL1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call marks a selected vitals record in the GMRV Vital Measurement (#120.5) file as entered-in-error.   This remote procedure call is documented in Integration Agreement 4414.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVDATA | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-mark-error`

---

### `GMV PT GRAPH`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `GMVSR0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Prints Vitals/Measurements Graphic Reports.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVDATA | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-pt-graph`

---

### `GMV V/M ALLDATA`

| Property | Value |
|----------|-------|
| Tag | `VMDATA` |
| Routine | `GMVGGR1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call lists all vitals/measurements data for a given date/time span.   This remote procedure call is documented in Integration Agreement 4654.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVDATA | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-v/m-alldata`

---

### `GMV TEAM PATIENTS`

| Property | Value |
|----------|-------|
| Tag | `TEAMPT` |
| Routine | `GMVUTL3` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This procedure retrieves patients assigned to a given team.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVTEAM | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-team-patients`

---

### `GMV ALLERGY`

| Property | Value |
|----------|-------|
| Tag | `ALLERGY` |
| Routine | `GMVUTL3` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call retrieves the patient's allergy information.   This remote procedure call is documented in Integration Agreement 4350.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-allergy`

---

### `GMV CLINIC PT`

| Property | Value |
|----------|-------|
| Tag | `CLINPTS` |
| Routine | `GMVCLIN` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This procedure lists patients who have an appointment for a selected clinic and a given period of time.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLIN | LITERAL | No |
| 2 | BDATE | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-clinic-pt`

---

### `GMV VITALS/CAT/QUAL`

| Property | Value |
|----------|-------|
| Tag | `GETVITAL` |
| Routine | `GMVUTL7` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns all qualifier information for the vital types selected.   This remote procedure call is documented in Integration Agreement 4359.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVLIST | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-vitals/cat/qual`

---

### `GMV PTSELECT`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `GMVRPCP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Used as a method of processing a patient DFN and returning all warnings  and notices (i.e. sensitivity or same last 4 of SSN) to the client  application for processing.  Also includes a call to log access of  sensitive patients to the DG SECURITY LOG file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTION | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-ptselect`

---

### `GMV LATEST VM`

| Property | Value |
|----------|-------|
| Tag | `GETLAT` |
| Routine | `GMVGETD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call retrieves the latest vital records for a given patient.   This remote procedure call is documented in Integration Agreement 4358.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMRDFN | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-latest-vm`

---

### `GMV ROOM/BED`

| Property | Value |
|----------|-------|
| Tag | `ROOMBED` |
| Routine | `GMVGETD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This procedure extracts room/bed information from Room-Bed file (#405.4) for a given MAS ward.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMRWARD | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-room/bed`

---

### `GMV CUMULATIVE REPORT`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `GMVSC0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Prints the Cumulative Vitals Report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVDATA | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-cumulative-report`

---

### `GMV LATEST VITALS BY LOCATION`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `GMVDS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Prints the latest vitals/measurements for all patients on a given ward location.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVDATA | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-latest-vitals-by-location`

---

### `GMV LATEST VITALS FOR PATIENT`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `GMVDS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Prints the latest vitals/measurements for the selected patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVDATA | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-latest-vitals-for-patient`

---

### `GMV ENTERED IN ERROR-PATIENT`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `GMVER0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Prints a report of all vitals/measurements entered in error for the selected patient for a given date/time range.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVDATA | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-entered-in-error-patient`

---

### `GMV QUALIFIER TABLE`

| Property | Value |
|----------|-------|
| Tag | `EN1` |
| Routine | `GMVCAQU` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Prints a list of categories and qualifiers associated with individual vital types (e.g., blood pressure). Data comes from the GMRV Vital Qualifier (#120.52) file and the GMRV Vital Category (#120.53) file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVDATA | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-qualifier-table`

---

### `GMV MANAGER`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `GMVRPCM` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Performs many functions for the Manager module.   This remote procedure call is documented in Integration Agreement 4360.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTION | LITERAL | No |
| 2 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-manager`

---

### `GMV WARD/ROOM PATIENTS`

| Property | Value |
|----------|-------|
| Tag | `ROOMPT` |
| Routine | `GMVUTL7` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of patients in the ward and rooms specified.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVWRD | LITERAL | No |
| 2 | GMVRLST | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-ward/room-patients`

---

### `GMV GET CURRENT TIME`

| Property | Value |
|----------|-------|
| Tag | `TIME` |
| Routine | `GMVUTL7` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Gets the current date and time from the server.   This remote procedure call is documented in Integration Agreement 4355.

**API Endpoint:** `GET /vista/gmv/rpc/gmv-get-current-time`

---

### `GMV USER`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `GMVRPCU` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Retrieves data about the user (e.g., parameter settings).   This remote procedure call is documented in Integration Agreement 4366.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTION | LITERAL | No |
| 2 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-user`

---

### `GMV NUR UNIT PT`

| Property | Value |
|----------|-------|
| Tag | `APTLIST` |
| Routine | `GMVUTL8` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of active patients for a nursing location.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOC | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-nur-unit-pt`

---

### `GMV CHECK DEVICE`

| Property | Value |
|----------|-------|
| Tag | `CHKDEV` |
| Routine | `GMVUTL2` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC calls a KERNEL utility to return a list of printers the user may  select to print output. Returns a maximum of twenty entries.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVIEN | LITERAL | No |
| 2 | GMVDIR | LITERAL | No |
| 3 | GMVRMAR | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-check-device`

---

### `GMV PARAMETER`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `GMVPAR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** Sets and retrieves parameter values used by the graphical user interface.   This remote procedure call is documented in Integration Agreement 4367.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTION | LITERAL | No |
| 2 | ENT | LITERAL | No |
| 3 | PAR | LITERAL | No |
| 4 | INST | LITERAL | No |
| 5 | VAL | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-parameter`

---

### `GMV GET VITAL TYPE IEN`

| Property | Value |
|----------|-------|
| Tag | `TYPE` |
| Routine | `GMVUTL8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the IEN if the value is found in the GMRV VITAL TYPE (#120.51) file.   This remote procedure call is documented in Integration Agreement 4357.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVTYPE | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-get-vital-type-ien`

---

### `GMV GET CATEGORY IEN`

| Property | Value |
|----------|-------|
| Tag | `CATEGORY` |
| Routine | `GMVUTL8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the IEN if the value is found in the GMRV VITAL CATEGORY (#120.53) file.   This remote procedure call is documented in Integration Agreement 4354.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVCAT | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-get-category-ien`

---

### `GMV DLL VERSION`

| Property | Value |
|----------|-------|
| Tag | `DLL` |
| Routine | `GMVUTL8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a YES or NO response to indicate if the Dynamic Link Library (DLL) file should be used.   This remote procedure call is documented in Integration Agreement 4420.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVX | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-dll-version`

---

### `GMV LOCATION SELECT`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `GMVRPCHL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Select a hospital location by name, from a patient appointment or from a patient admission. Can also generate a list of active clinics.   This remote procedure is documented in Integration Agreement 4461.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTION | LITERAL | No |
| 2 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-location-select`

---

### `GMV CLOSEST READING`

| Property | Value |
|----------|-------|
| Tag | `CLOSEST` |
| Routine | `GMVGETD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns the observation date/time and reading  of the record closest to the date/time specified for the patient and vital type.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMVDFN | LITERAL | No |
| 2 | GMVDT | LITERAL | No |
| 3 | GMVT | LITERAL | No |
| 4 | GMVFLAG | LITERAL | No |

**API Endpoint:** `GET /vista/gmv/rpc/gmv-closest-reading`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| GMRDATE: | GMV CONVERT DATE | GMRDATE | LITERAL | rpc |
| GMRVDATA: | GMV ADD VM | GMRVDATA | LITERAL | rpc |
| GMRVDATA: | GMV EXTRACT REC | GMRVDATA | LITERAL | rpc |
| DUMMY: | GMV WARD LOCATION | DUMMY | LITERAL | rpc |
| GMRWARD: | GMV WARD PT | GMRWARD | LITERAL | rpc |
| GMVDATA: | GMV MARK ERROR | GMVDATA | LITERAL | rpc |
| GMVDATA: | GMV PT GRAPH | GMVDATA | LITERAL | rpc |
| GMVDATA: | GMV V/M ALLDATA | GMVDATA | LITERAL | rpc |
| GMVTEAM: | GMV TEAM PATIENTS | GMVTEAM | LITERAL | rpc |
| DFN: | GMV ALLERGY | DFN | LITERAL | rpc |
| CLIN: | GMV CLINIC PT | CLIN | LITERAL | rpc |
| BDATE: | GMV CLINIC PT | BDATE | LITERAL | rpc |
| GMVLIST: | GMV VITALS/CAT/QUAL | GMVLIST | LITERAL | rpc |
| OPTION: | GMV PTSELECT | OPTION | LITERAL | rpc |
| DFN: | GMV PTSELECT | DFN | LITERAL | rpc |
| DATA: | GMV PTSELECT | DATA | LITERAL | rpc |
| GMRDFN: | GMV LATEST VM | GMRDFN | LITERAL | rpc |
| GMRWARD: | GMV ROOM/BED | GMRWARD | LITERAL | rpc |
| GMVDATA: | GMV CUMULATIVE REPORT | GMVDATA | LITERAL | rpc |
| GMVDATA: | GMV LATEST VITALS BY LOCATION | GMVDATA | LITERAL | rpc |
| GMVDATA: | GMV LATEST VITALS FOR PATIENT | GMVDATA | LITERAL | rpc |
| GMVDATA: | GMV ENTERED IN ERROR-PATIENT | GMVDATA | LITERAL | rpc |
| GMVDATA: | GMV QUALIFIER TABLE | GMVDATA | LITERAL | rpc |
| OPTION: | GMV MANAGER | OPTION | LITERAL | rpc |
| DATA: | GMV MANAGER | DATA | LITERAL | rpc |
| GMVWRD: | GMV WARD/ROOM PATIENTS | GMVWRD | LITERAL | rpc |
| GMVRLST: | GMV WARD/ROOM PATIENTS | GMVRLST | LITERAL | rpc |
| OPTION: | GMV USER | OPTION | LITERAL | rpc |
| DATA: | GMV USER | DATA | LITERAL | rpc |
| LOC: | GMV NUR UNIT PT | LOC | LITERAL | rpc |
| GMVIEN: | GMV CHECK DEVICE | GMVIEN | LITERAL | rpc |
| GMVDIR: | GMV CHECK DEVICE | GMVDIR | LITERAL | rpc |
| GMVRMAR: | GMV CHECK DEVICE | GMVRMAR | LITERAL | rpc |
| OPTION: | GMV PARAMETER | OPTION | LITERAL | rpc |
| ENT: | GMV PARAMETER | ENT | LITERAL | rpc |
| PAR: | GMV PARAMETER | PAR | LITERAL | rpc |
| INST: | GMV PARAMETER | INST | LITERAL | rpc |
| VAL: | GMV PARAMETER | VAL | LITERAL | rpc |
| GMVTYPE: | GMV GET VITAL TYPE IEN | GMVTYPE | LITERAL | rpc |
| GMVCAT: | GMV GET CATEGORY IEN | GMVCAT | LITERAL | rpc |
| GMVX: | GMV DLL VERSION | GMVX | LITERAL | rpc |
| OPTION: | GMV LOCATION SELECT | OPTION | LITERAL | rpc |
| DATA: | GMV LOCATION SELECT | DATA | LITERAL | rpc |
| GMVDFN: | GMV CLOSEST READING | GMVDFN | LITERAL | rpc |
| GMVDT: | GMV CLOSEST READING | GMVDT | LITERAL | rpc |
| GMVT: | GMV CLOSEST READING | GMVT | LITERAL | rpc |
| GMVFLAG: | GMV CLOSEST READING | GMVFLAG | LITERAL | rpc |
| PATIENT ID: | ORQQVI VITALS | PATIENT ID | LITERAL | rpc |
| START DATE/TIME: | ORQQVI VITALS | START DATE/TIME | LITERAL | rpc |
| STOP DATE/TIME: | ORQQVI VITALS | STOP DATE/TIME | LITERAL | rpc |
| PATIENT ID: | ORQQVI VITALS FOR DATE RANGE | PATIENT ID | LITERAL | rpc |
| START DATE/TIME: | ORQQVI VITALS FOR DATE RANGE | START DATE/TIME | LITERAL | rpc |
| STOP DATE/TIME: | ORQQVI VITALS FOR DATE RANGE | STOP DATE/TIME | LITERAL | rpc |
| PATIENT ID: | ORQQVI SWPVIT | PATIENT ID | LITERAL | rpc |
| START DATE/TIME: | ORQQVI SWPVIT | START DATE/TIME | LITERAL | rpc |
| STOP DATE/TIME: | ORQQVI SWPVIT | STOP DATE/TIME | LITERAL | rpc |
| SWAP: | ORQQVI SWPVIT | SWAP | LITERAL | rpc |

## Menu Options

### Broker

| Name | Security Key |
|------|-------------|
| GMV V/M GUI | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/gmv/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/gmv/rpc/gmv-convert-date` | GMV CONVERT DATE | SINGLE VALUE |
| POST | `/vista/gmv/rpc/gmv-add-vm` | GMV ADD VM | SINGLE VALUE |
| GET | `/vista/gmv/rpc/gmv-extract-rec` | GMV EXTRACT REC | GLOBAL ARRAY |
| GET | `/vista/gmv/rpc/gmv-ward-location` | GMV WARD LOCATION | GLOBAL ARRAY |
| GET | `/vista/gmv/rpc/gmv-ward-pt` | GMV WARD PT | GLOBAL ARRAY |
| GET | `/vista/gmv/rpc/gmv-mark-error` | GMV MARK ERROR | SINGLE VALUE |
| GET | `/vista/gmv/rpc/gmv-pt-graph` | GMV PT GRAPH | SINGLE VALUE |
| GET | `/vista/gmv/rpc/gmv-v/m-alldata` | GMV V/M ALLDATA | GLOBAL ARRAY |
| GET | `/vista/gmv/rpc/gmv-team-patients` | GMV TEAM PATIENTS | ARRAY |
| GET | `/vista/gmv/rpc/gmv-allergy` | GMV ALLERGY | ARRAY |
| GET | `/vista/gmv/rpc/gmv-clinic-pt` | GMV CLINIC PT | ARRAY |
| GET | `/vista/gmv/rpc/gmv-vitals/cat/qual` | GMV VITALS/CAT/QUAL | ARRAY |
| GET | `/vista/gmv/rpc/gmv-ptselect` | GMV PTSELECT | GLOBAL ARRAY |
| GET | `/vista/gmv/rpc/gmv-latest-vm` | GMV LATEST VM | GLOBAL ARRAY |
| GET | `/vista/gmv/rpc/gmv-room/bed` | GMV ROOM/BED | GLOBAL ARRAY |
| GET | `/vista/gmv/rpc/gmv-cumulative-report` | GMV CUMULATIVE REPORT | SINGLE VALUE |
| GET | `/vista/gmv/rpc/gmv-latest-vitals-by-location` | GMV LATEST VITALS BY LOCATION | SINGLE VALUE |
| GET | `/vista/gmv/rpc/gmv-latest-vitals-for-patient` | GMV LATEST VITALS FOR PATIENT | SINGLE VALUE |
| GET | `/vista/gmv/rpc/gmv-entered-in-error-patient` | GMV ENTERED IN ERROR-PATIENT | SINGLE VALUE |
| GET | `/vista/gmv/rpc/gmv-qualifier-table` | GMV QUALIFIER TABLE | GLOBAL ARRAY |
| GET | `/vista/gmv/rpc/gmv-manager` | GMV MANAGER | GLOBAL ARRAY |
| GET | `/vista/gmv/rpc/gmv-ward/room-patients` | GMV WARD/ROOM PATIENTS | ARRAY |
| GET | `/vista/gmv/rpc/gmv-get-current-time` | GMV GET CURRENT TIME | SINGLE VALUE |
| GET | `/vista/gmv/rpc/gmv-user` | GMV USER | GLOBAL ARRAY |
| GET | `/vista/gmv/rpc/gmv-nur-unit-pt` | GMV NUR UNIT PT | ARRAY |
| GET | `/vista/gmv/rpc/gmv-check-device` | GMV CHECK DEVICE | ARRAY |
| GET | `/vista/gmv/rpc/gmv-parameter` | GMV PARAMETER | GLOBAL ARRAY |
| GET | `/vista/gmv/rpc/gmv-get-vital-type-ien` | GMV GET VITAL TYPE IEN | SINGLE VALUE |
| GET | `/vista/gmv/rpc/gmv-get-category-ien` | GMV GET CATEGORY IEN | SINGLE VALUE |
| GET | `/vista/gmv/rpc/gmv-dll-version` | GMV DLL VERSION | SINGLE VALUE |
| GET | `/vista/gmv/rpc/gmv-location-select` | GMV LOCATION SELECT | GLOBAL ARRAY |
| GET | `/vista/gmv/rpc/gmv-closest-reading` | GMV CLOSEST READING | SINGLE VALUE |
