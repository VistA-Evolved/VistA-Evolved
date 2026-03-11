# DEN (DEN)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `DEN` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 81 |
| Menu Options | 0 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `DENTV ADA CODES QUICK`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `DENTVRP2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Retrieve the user's quick list of CPT codes. stored file 220.5, field 19600.

**API Endpoint:** `GET /vista/den/rpc/dentv-ada-codes-quick`

---

### `DENTV ADD QL ENTRY`

| Property | Value |
|----------|-------|
| Tag | `ADD` |
| Routine | `DENTVRP2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This will add a new CPT to the user's quick list. the Dental Provider file (#220.5).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CPT | LITERAL | No |

**API Endpoint:** `POST /vista/den/rpc/dentv-add-ql-entry`

---

### `DENTV DD FIELD UPDATE`

| Property | Value |
|----------|-------|
| Tag | `FILE` |
| Routine | `DENTVRP3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This call will allow the updating of certain fields in file 228. You can delete a locally added medical CPT code. You can edit the diagnosis codes mapped to any CPT code.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |
| 2 | KEY | LITERAL | No |

**API Endpoint:** `POST /vista/den/rpc/dentv-dd-field-update`

---

### `DENTV DD GET DATA`

| Property | Value |
|----------|-------|
| Tag | `GTD` |
| Routine | `DENTVRP3` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Pass this RPC a cpt code and it will return the data stored in file 228

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CODE | LITERAL | No |
| 2 | KEY | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-dd-get-data`

---

### `DENTV DD GET/ADD RECORD`

| Property | Value |
|----------|-------|
| Tag | `ADD` |
| Routine | `DENTVRP3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This rpc returns the internal entry number to file 228 for a cpt code.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | LITERAL | No |
| 2 | KEY | LITERAL | No |

**API Endpoint:** `POST /vista/den/rpc/dentv-dd-get/add-record`

---

### `DENTV DD SECURITY KEY`

| Property | Value |
|----------|-------|
| Tag | `KEY` |
| Routine | `DENTVRP3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This rpc will check to see if user holds the DENTV EDIT FILE security keys.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | KEY | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-dd-security-key`

---

### `DENTV DELETE HISTORY ENTRY`

| Property | Value |
|----------|-------|
| Tag | `DELH` |
| Routine | `DENTVRHD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This will mark records in file 228.1 as deleted.   Through indexes on the DATE DELETED field in file 228.1, the associated transactions in file 228.2 will be marked as deleted.  Since these two files are considered  part of the official medical record, then, according to HIPAA, once a  permenant rec

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | REASON | LITERAL | No |

**API Endpoint:** `POST /vista/den/rpc/dentv-delete-history-entry`

---

### `DENTV DELETE QL ENTRY`

| Property | Value |
|----------|-------|
| Tag | `DEL` |
| Routine | `DENTVRP2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This will delete a CPT code from a user's quick list. list.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CPT | LITERAL | No |

**API Endpoint:** `POST /vista/den/rpc/dentv-delete-ql-entry`

---

### `DENTV DENT HISTORY ENC`

| Property | Value |
|----------|-------|
| Tag | `ENC` |
| Routine | `DENTVRH` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This will return the dental encounter data for a given record in file 228.1

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-dent-history-enc`

---

### `DENTV DENTAL CLASSIFICATIONS`

| Property | Value |
|----------|-------|
| Tag | `DC` |
| Routine | `DENTVRP1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RPC to return dental classifications from file 220.2

**API Endpoint:** `GET /vista/den/rpc/dentv-dental-classifications`

---

### `DENTV EXCEL EXTRACT`

| Property | Value |
|----------|-------|
| Tag | `EXCEL` |
| Routine | `DENTVRP9` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Description:** This rpc will extract data from the history file (228.1) and format it so that the data can be imported into a spreadsheet.  The data will be in delimited format, with the '^' as the delimiter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDT | LITERAL | No |
| 2 | EDT | LITERAL | No |
| 3 | PROV | LITERAL | No |
| 4 | DFN | LITERAL | No |
| 5 | FLG | LITERAL | No |
| 6 | STN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-excel-extract`

---

### `DENTV FILE ADMIN TIME`

| Property | Value |
|----------|-------|
| Tag | `NON` |
| Routine | `DENTVRP4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This will file non-clinical admin time into file 226

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-file-admin-time`

---

### `DENTV FILE DATA`

| Property | Value |
|----------|-------|
| Tag | `UPD` |
| Routine | `DENTVRF` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** The will process the data from the DRM GUI and file it to the  corresponding files.  It will create a record in file 221, 228.1, one or  more files in 228.2, and will file data to PCE.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-file-data`

---

### `DENTV GET CATEG/CODES`

| Property | Value |
|----------|-------|
| Tag | `CATC` |
| Routine | `DENTVRP1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This works in conjunction with the DENTV GET CATEGORIES rpc.  You pass the subcategory name and this call will return the array of cpt codes associated with that subcategory name.   end description update 6-23-2003

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TYP | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-get-categ/codes`

---

### `DENTV GET CATEGORIES`

| Property | Value |
|----------|-------|
| Tag | `CAT` |
| Routine | `DENTVRP1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This rpc will return the different categories (fields 5 & 6) in file 228

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TYP | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-get-categories`

---

### `DENTV GET CODE LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `DENTVRP1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This call will return all ADA CPT codes which match the inputted string. You can pass the cpt code name or a string, like 'surf'.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VAL | LITERAL | No |
| 2 | DATE | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-get-code-list`

---

### `DENTV TOOTH HISTORY`

| Property | Value |
|----------|-------|
| Tag | `TH` |
| Routine | `DENTVRH` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This returns the dental history for a single tooth for a patient or for  all records.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tooth-history`

---

### `DENTV DENTAL PROVIDER`

| Property | Value |
|----------|-------|
| Tag | `PROV` |
| Routine | `DENTVRP1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** From user's duz, verify that the user is a valid dental provider

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-dental-provider`

---

### `DENTV MULT PARAM`

| Property | Value |
|----------|-------|
| Tag | `MULT` |
| Routine | `DENTVRX1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This will return all instances for a parameter.  The Parameter should be  multi-instance.  The difference between this call and the national XPAR  call is that this call will return a value for every parameter-instance  combination regardless of entity.  It will return the value for the  entity of h

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM | LITERAL | No |
| 2 | FLAG | LITERAL | No |
| 3 | OTHER | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-mult-param`

---

### `DENTV INPATIENT BEDSECTION`

| Property | Value |
|----------|-------|
| Tag | `INP` |
| Routine | `DENTVRP1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This will return a string indicating whether or not the patient is a  current inpatient.  If an inpatient, then also return, if possible, the  PTF Specialty and Dental Bedsection associated with the current ward that  the patient is lodged.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-inpatient-bedsection`

---

### `DENTV FEE BASIS ADD`

| Property | Value |
|----------|-------|
| Tag | `ADD` |
| Routine | `DENTVFB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC adds, or edits a record in the Dental Fee Basis file (#228.5).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | REFERENCE | No |

**API Endpoint:** `POST /vista/den/rpc/dentv-fee-basis-add`

---

### `DENTV FEE BASIS LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `DENTVFB` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC gets a list of DENTAL FEE BASIS EXTRACT (#228.5) records for a specified patient.  The input is a single value, patient id (DFN).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-fee-basis-list`

---

### `DENTV TP FILE PSR`

| Property | Value |
|----------|-------|
| Tag | `PSR` |
| Routine | `DENTVTP4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC adds (or updates) a record to the Treatment Plan Transaction/Exam file (#228.2).  The only record type supported by this RPC is the PSR  type, where the TYPE field (.29) = 3.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-file-psr`

---

### `DENTV TP FILE PERIO`

| Property | Value |
|----------|-------|
| Tag | `PER` |
| Routine | `DENTVTP4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC adds (or updates) a reocrd to the Treatment Plan  Transaction/Exam file (#228.2).  The only record type supported by this  RPC is the Perio type, where the TYPE field (.29) = 2.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-file-perio`

---

### `DENTV TP FILE HNC`

| Property | Value |
|----------|-------|
| Tag | `HNC` |
| Routine | `DENTVTP4` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC adds, updates or marks as deleted, records to the Treatment Plan  Transaction/Exam file (#228.2).  The only record type supported by this  RPC is the Head and Neck type, where the TYPE field (.29)=4.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-file-hnc`

---

### `DENTV TP ADD ENCOUNTER`

| Property | Value |
|----------|-------|
| Tag | `ADD` |
| Routine | `DENTVTP2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This will add a new record to the dental encounter file, 228.1

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `POST /vista/den/rpc/dentv-tp-add-encounter`

---

### `DENTV TP GET ADA TABLE`

| Property | Value |
|----------|-------|
| Tag | `ADA` |
| Routine | `DENTVTP1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This returns the ADA table (file 228) for the Discus Treatment Planning  system.

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-get-ada-table`

---

### `DENTV TP GET PROVIDERS`

| Property | Value |
|----------|-------|
| Tag | `PROV` |
| Routine | `DENTVTP1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This will return a list of all providers who have provided service to  this patient.  Each provider will have a flag indicating whether or not  the provider is current.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DENTL | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-get-providers`

---

### `DENTV TP FILE TOOTH NOTE`

| Property | Value |
|----------|-------|
| Tag | `NOTE` |
| Routine | `DENTVTP6` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This will allow you to add, update, or delete a record in file 228.6

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-file-tooth-note`

---

### `DENTV TP GET TOOTH NOTES`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `DENTVTP6` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This returns all the tooth notes for all dates for a patient.  The data  will be sorted by tooth number and then by reverse date.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-get-tooth-notes`

---

### `DENTV TP GET HNC`

| Property | Value |
|----------|-------|
| Tag | `HNC` |
| Routine | `DENTVTP3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns all of the Head&Neck records from the Treatment Plan  Transaction/Exam file (#228.2) for a particular patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-get-hnc`

---

### `DENTV TP GET PSR`

| Property | Value |
|----------|-------|
| Tag | `PSR` |
| Routine | `DENTVTP3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns all of the PSR type records from the Treatment Plan  Transaction/Exam file (#228.2) for a particular patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-get-psr`

---

### `DENTV TP GET PERIO`

| Property | Value |
|----------|-------|
| Tag | `PERIO` |
| Routine | `DENTVTP3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns all of the Perio type records from the Treatment Plan  Transaction/Exam file (#228.2) for a particular patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-get-perio`

---

### `DENTV TP FILE TRANSACTIONS`

| Property | Value |
|----------|-------|
| Tag | `FILE` |
| Routine | `DENTVTPA` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This will file transaction data types to file 228.2.  It will also create  the DAS record (#221) if appropriate.  It will also file data to PCE if  appropriate.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-file-transactions`

---

### `DENTV DELETE TRANSACTIONS`

| Property | Value |
|----------|-------|
| Tag | `DELT` |
| Routine | `DENTVRHD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC deletes the dental encounter from the DENTAL HISTORY file  (#228.1) and dental transactions from the DENTAL TREATMENT PLAN/EXAM file (#228.2) for types=PSR, PerioExam and Head&Neck if the Transaction(s) for type=Transaction fails to file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `POST /vista/den/rpc/dentv-delete-transactions`

---

### `DENTV TP GET TRANSACTIONS`

| Property | Value |
|----------|-------|
| Tag | `TXN` |
| Routine | `DENTVTP5` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** Returns all of the Transaction type records from the Treatment Plan  Transaction/Exam file (228.2) for a particular patient..

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | TYPE | LITERAL | No |
| 3 | SDT | LITERAL | No |
| 4 | EDT | LITERAL | No |
| 5 | PROV | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-get-transactions`

---

### `DENTV REPORT PROVIDERS`

| Property | Value |
|----------|-------|
| Tag | `PROV` |
| Routine | `DENTVAU` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns an array containing all dental providers with 8 character  Provider Ids that belong to the selected division.  If the provider has  no divisions listed in file 200, then they show up under any division  selection.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIV | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-report-providers`

---

### `DENTV REPORT DATA`

| Property | Value |
|----------|-------|
| Tag | `RPT` |
| Routine | `DENTVAU` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Retrieves Dental Report data for a specified time period and station.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-report-data`

---

### `DENTV GET ALL PROVIDERS`

| Property | Value |
|----------|-------|
| Tag | `PROV` |
| Routine | `DENTVRP5` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Gets all providers (including inactive) for edit purposes.

**API Endpoint:** `GET /vista/den/rpc/dentv-get-all-providers`

---

### `DENTV GET PROVIDER TYPES`

| Property | Value |
|----------|-------|
| Tag | `TYPE` |
| Routine | `DENTVRP5` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Gets a list of Provider Types from the DENTAL PROVIDER TYPE (220.51) file.

**API Endpoint:** `GET /vista/den/rpc/dentv-get-provider-types`

---

### `DENTV GET PROVIDER SPECIALTIES`

| Property | Value |
|----------|-------|
| Tag | `SPEC` |
| Routine | `DENTVRP5` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Gets a list of all active Provider Specialties from file 220.52.

**API Endpoint:** `GET /vista/den/rpc/dentv-get-provider-specialties`

---

### `DENTV PROVIDER ADD UPDATE`

| Property | Value |
|----------|-------|
| Tag | `EDIT` |
| Routine | `DENTVRP5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows Dental Record Manager to add/edit their Dental Providers.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `POST /vista/den/rpc/dentv-provider-add-update`

---

### `DENTV NEW EXTRACT`

| Property | Value |
|----------|-------|
| Tag | `Q` |
| Routine | `DENTVRP8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC queues off the Dental Extract at a user designated time.  Upon  completion of the extract, a TCP/IP client will be called from the tasked  job to send the data to a text file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-new-extract`

---

### `DENTV TP GET OLD ENCOUNTERS`

| Property | Value |
|----------|-------|
| Tag | `ENC` |
| Routine | `DENTVTP5` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of all complete and/or terminated encounters for a  selected patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-get-old-encounters`

---

### `DENTV FILE PARAMETERS`

| Property | Value |
|----------|-------|
| Tag | `PAR` |
| Routine | `DENTVTP0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows the Dental software to file word processing type  parameters.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ENT | LITERAL | No |
| 2 | PAR | LITERAL | No |
| 3 | INST | LITERAL | No |
| 4 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-file-parameters`

---

### `DENTV TP FILE RESERVED TXNS`

| Property | Value |
|----------|-------|
| Tag | `SAVE` |
| Routine | `DENTVTP7` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Saves transaction information for a particular Dental provider and  patient.  Reserved transactions are not filed to Dental History, DAS or  PCE.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-file-reserved-txns`

---

### `DENTV TP GET RESERVED TXNS`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `DENTVTP7` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns all reserved transactions for a particular Dental provider and patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PROV | LITERAL | No |
| 2 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-get-reserved-txns`

---

### `DENTV GET VA-DSS PRODUCTS`

| Property | Value |
|----------|-------|
| Tag | `VADSS` |
| Routine | `DENTVTP1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns all of the VA-DSS product lines from the DENTAL GROUPING FOR  VA-DSS file.

**API Endpoint:** `GET /vista/den/rpc/dentv-get-va-dss-products`

---

### `DENTV REPORT KLF`

| Property | Value |
|----------|-------|
| Tag | `KLF` |
| Routine | `DENTVAU` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Retrieves Dental KLF Report data for specified time period.Rep

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-report-klf`

---

### `DENTV PRIMARY PROVIDER`

| Property | Value |
|----------|-------|
| Tag | `GS` |
| Routine | `DENTVUTL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This rpc gets or sets the primary and secondary providers for a dental patient. It also sends back the User duz if the user is a dental  provider for the Encounter Provider.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | PSPROV | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-primary-provider`

---

### `DENTV ADA GET COSTS`

| Property | Value |
|----------|-------|
| Tag | `GC` |
| Routine | `DENTVRP3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns all entries in file 228 and their cost fields.

**API Endpoint:** `GET /vista/den/rpc/dentv-ada-get-costs`

---

### `DENTV GET CODING GUIDELINES`

| Property | Value |
|----------|-------|
| Tag | `GUIDE` |
| Routine | `DENTVRP2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Gets the admin and coding guidelines for an ADA/CPT code.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ADA | LITERAL | No |
| 2 | ADMG | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-get-coding-guidelines`

---

### `DENTV ALERTS`

| Property | Value |
|----------|-------|
| Tag | `GAL` |
| Routine | `DENTVUTL` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC gets Dental Alerts from file 220.  It also sets them into 220.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | ALERTS | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-alerts`

---

### `DENTV PATIENT PROVIDER`

| Property | Value |
|----------|-------|
| Tag | `PP` |
| Routine | `DENTVUTL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Sets and kills the ^XTMP("DENTVPT",DFN,DUZ) global to keep track of which provider(s) are accessing which patients.  Users are warned if another provider is accessing the same patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | FLAG | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-patient-provider`

---

### `DENTV ACTIVE USER PROVIDER`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `DENTVUTL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of active users matching the lookup value.  If a matching  user is not active, but has the XUORES security key, then they are valid  providers and will also be returned by this call.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VAL | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-active-user-provider`

---

### `DENTV GET COVER PAGE INFO`

| Property | Value |
|----------|-------|
| Tag | `CP` |
| Routine | `DENTVTP0` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns demographic, case management and recent dental activity data for  the Cover Page in DRM Plus.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-get-cover-page-info`

---

### `DENTV TP GET LAST STATUS`

| Property | Value |
|----------|-------|
| Tag | `LST` |
| Routine | `DENTVTP5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Sends back the status of the last, non-deleted, encounter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-get-last-status`

---

### `DENTV TP CODE CHECKS`

| Property | Value |
|----------|-------|
| Tag | `CK` |
| Routine | `DENTVCK` |
| Return Type | SINGLE VALUE |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** Processes coding compliance checks for ADA codes entered by the user.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | ECODE | LITERAL | No |
| 3 | VISDT | LITERAL | No |
| 4 | PROV | LITERAL | No |
| 5 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-code-checks`

---

### `DENTV UPDATE PCE`

| Property | Value |
|----------|-------|
| Tag | `UPD` |
| Routine | `DENTVTPE` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Deletes procedures, diagnosis and providers from PCE when users delete  transactions from DRM Plus.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `POST /vista/den/rpc/dentv-update-pce`

---

### `DENTV UPDATE PCE DX`

| Property | Value |
|----------|-------|
| Tag | `UDX` |
| Routine | `DENTVTPF` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Updates the PCE Visit to set the Primary Diagnosis and/or Primary  Provider if they are no longer defined because of deleting procedures.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `POST /vista/den/rpc/dentv-update-pce-dx`

---

### `DENTV MONITOR QUEUE`

| Property | Value |
|----------|-------|
| Tag | `QUE` |
| Routine | `DENTVM1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Queues a TaskMan job to run patient dental (e.g.) Fluoride, Monitor(s).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-monitor-queue`

---

### `DENTV MONITOR POLL`

| Property | Value |
|----------|-------|
| Tag | `POLL` |
| Routine | `DENTVM1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** See if the monitor background job has finished and if so, get the results from the DENTAL PATIENT (#220) file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-monitor-poll`

---

### `DENTV DELETE UNFILED DATA`

| Property | Value |
|----------|-------|
| Tag | `DELU` |
| Routine | `DENTVRHD` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Input takes in an array of IENS for deletion. Upon completion, the RPC  will return an array of IENS with a message. 0^File record deleted if  successful, or -1^Error deleting record if unsuccessful.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `POST /vista/den/rpc/dentv-delete-unfiled-data`

---

### `DENTV GET UNFILED DETAIL`

| Property | Value |
|----------|-------|
| Tag | `GETUN` |
| Routine | `DENTVTP7` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This procedure will take in a single IEN to return all data for the IEN  in ^TMP("DENT",$J,N)=value.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-get-unfiled-detail`

---

### `DENTV TP CLEAN SLATE`

| Property | Value |
|----------|-------|
| Tag | `CLNSLT` |
| Routine | `DENTVTP7` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This will process a clean slate on DPAT passed in. The RPC processes both  clean slate, and undo clean slate. You must pass a flag to determine  which process you want completed. ACT=1 means you want to process a clean  slate, ACT=-1 means you want to undo a clean slate.   The clean slate can only b

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DPAT | LITERAL | No |
| 2 | ACT | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-clean-slate`

---

### `DENTV TP FILE EXAM TRANSACTION`

| Property | Value |
|----------|-------|
| Tag | `FILEX` |
| Routine | `DENTVTPA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Files the new exam template modal data (OHA,PAR,OCC,TMJ) into a record in  228.2 of type 5:EXAM   Input variables:    SAVE DATA IN (FILED/UNFILED)  **************************************  DATA("FLAG")= ACTION FLAG, A OR BLANK FOR ADD, M FOR MODIFY  DATA("DPAT")= Patient IEN  DATA("PROV")= Provider I

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-file-exam-transaction`

---

### `DENTV TP GET EXAM TRANSACTIONS`

| Property | Value |
|----------|-------|
| Tag | `GETFEX` |
| Routine | `DENTVTP7` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This will return a complete list of exam transactions for a specified  patient. The array is organized by node, not by date. For example all of  the "OHA" Oral Health Assessment data is returned together. See  GETFEX^DENTVTP7 comments for details.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DPAT | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-get-exam-transactions`

---

### `DENTV GET CLEAN SLATE LIST`

| Property | Value |
|----------|-------|
| Tag | `GETCSL` |
| Routine | `DENTVTP7` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of all clean slates applied to a patient.    Return example: RETURN(1)="1^Dates found"                    RETURN(2)=3100101.120345    OR              RETURN(1)="-1^No clean slate present"

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DPAT | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-get-clean-slate-list`

---

### `DENTV UPDATE COMMENT SORT`

| Property | Value |
|----------|-------|
| Tag | `UPDATE` |
| Routine | `DENTVCC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This will re-sort a providers canned comments within a category. It will  return a 1^Successful or -1^Unsuccessful.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DENTV | REFERENCE | No |

**API Endpoint:** `POST /vista/den/rpc/dentv-update-comment-sort`

---

### `DENTV GET CANNED COMMENTS`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `DENTVCC` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns the canned comments by provider, system, or both. The maximum  number returned is 12. This limit is set by the GUI.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PROV | LITERAL | No |
| 2 | TYP | LITERAL | No |
| 3 | CAT | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-get-canned-comments`

---

### `DENTV FILE CANNED COMMENTS`

| Property | Value |
|----------|-------|
| Tag | `FILE` |
| Routine | `DENTVCC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This rpc will file/update canned statements. The array must contain the following:       DENTV("PROV") - Provider IEN       DENTV("TYP") - 1: system, 2: user/provider       DENTV("CAT") - 1: radio, 2: summary, 3: treatment, 4: educ, 5: disp       DENTV(n) - n number of records for the WP field (the

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DENTV | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-file-canned-comments`

---

### `DENTV DEL CANNED COMMENT`

| Property | Value |
|----------|-------|
| Tag | `DEL` |
| Routine | `DENTVCC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Will delete a canned comment from the system. This will automatically  resort the remaining records by filling in the gap (if any) left by  removing the record.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CIEN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-del-canned-comment`

---

### `DENTV PERSON CLASS INQUIRY`

| Property | Value |
|----------|-------|
| Tag | `PROVINQ` |
| Routine | `DENTVUTL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This is an RPC wrapper for the Kernal call $$GET^XUA4A72 to determine the  active providers class information.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PROV | LITERAL | No |
| 2 | DENTDAT | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-person-class-inquiry`

---

### `DENTV TP RESERVED INACT CHECK`

| Property | Value |
|----------|-------|
| Tag | `CHKINA` |
| Routine | `DENTVTP7` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will perform a check on the IEN inputted and return whether or  not the transaction found has been inactivated (for view only) or left  alone. The check will inactivate a reserved transaction if it is more  than 8 days old.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DENTIEN | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentv-tp-reserved-inact-check`

---

### `DENTVX2 GETWP`

| Property | Value |
|----------|-------|
| Tag | `GETWP` |
| Routine | `DENTVX2` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC takes in an entity, parameter name, and instance number and  returns the word processing information for the given instance of the  parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ENT | LITERAL | No |
| 2 | PAR | LITERAL | No |
| 3 | INST | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentvx2-getwp`

---

### `DENTVX2 FILEWP`

| Property | Value |
|----------|-------|
| Tag | `FILEWP` |
| Routine | `DENTVX2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This RPC takes in an entity, parameter name, instance number, and the  data to be filed.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ENT | LITERAL | No |
| 2 | PAR | LITERAL | No |
| 3 | INST | LITERAL | No |
| 4 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentvx2-filewp`

---

### `DENTVGUI VERSION GET`

| Property | Value |
|----------|-------|
| Tag | `VERSION` |
| Routine | `DENTVGUI` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This is an RPC which returns the current valid DRM Plus GUI version and  the current valid KID patch number.

**API Endpoint:** `GET /vista/den/rpc/dentvgui-version-get`

---

### `DENTVICD ACTICD`

| Property | Value |
|----------|-------|
| Tag | `ACTICD` |
| Routine | `DENTVICD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Verify that an ICD code is active as of a certain date

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VICD | LITERAL | No |
| 2 | CDT | LITERAL | No |
| 3 | FUN | LITERAL | No |
| 4 | SYS | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentvicd-acticd`

---

### `DENTVICD ICD GET DIAG`

| Property | Value |
|----------|-------|
| Tag | `ICD` |
| Routine | `DENTVICD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This will return specific information for a diagnosis code

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VICD | LITERAL | No |
| 2 | CDT | LITERAL | No |

**API Endpoint:** `GET /vista/den/rpc/dentvicd-icd-get-diag`

---

### `DENTVICD LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `DENTVICD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This will return a list of active ICD codes for a lookup value.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DENTVA | REFERENCE | No |

**API Endpoint:** `GET /vista/den/rpc/dentvicd-list`

---

### `DENTVICD ICD10 ACTIVATION DATE`

| Property | Value |
|----------|-------|
| Tag | `ICD10` |
| Routine | `DENTVICD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the activation date of ICD-10.

**API Endpoint:** `GET /vista/den/rpc/dentvicd-icd10-activation-date`

---


## Menu Options

No menu options found for this package namespace.

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/den/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/den/rpc/dentv-ada-codes-quick` | DENTV ADA CODES QUICK | GLOBAL ARRAY |
| POST | `/vista/den/rpc/dentv-add-ql-entry` | DENTV ADD QL ENTRY | SINGLE VALUE |
| POST | `/vista/den/rpc/dentv-dd-field-update` | DENTV DD FIELD UPDATE | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-dd-get-data` | DENTV DD GET DATA | ARRAY |
| POST | `/vista/den/rpc/dentv-dd-get/add-record` | DENTV DD GET/ADD RECORD | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-dd-security-key` | DENTV DD SECURITY KEY | SINGLE VALUE |
| POST | `/vista/den/rpc/dentv-delete-history-entry` | DENTV DELETE HISTORY ENTRY | SINGLE VALUE |
| POST | `/vista/den/rpc/dentv-delete-ql-entry` | DENTV DELETE QL ENTRY | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-dent-history-enc` | DENTV DENT HISTORY ENC | ARRAY |
| GET | `/vista/den/rpc/dentv-dental-classifications` | DENTV DENTAL CLASSIFICATIONS | ARRAY |
| GET | `/vista/den/rpc/dentv-excel-extract` | DENTV EXCEL EXTRACT | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-file-admin-time` | DENTV FILE ADMIN TIME | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-file-data` | DENTV FILE DATA | ARRAY |
| GET | `/vista/den/rpc/dentv-get-categ/codes` | DENTV GET CATEG/CODES | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-get-categories` | DENTV GET CATEGORIES | ARRAY |
| GET | `/vista/den/rpc/dentv-get-code-list` | DENTV GET CODE LIST | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-tooth-history` | DENTV TOOTH HISTORY | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-dental-provider` | DENTV DENTAL PROVIDER | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-mult-param` | DENTV MULT PARAM | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-inpatient-bedsection` | DENTV INPATIENT BEDSECTION | SINGLE VALUE |
| POST | `/vista/den/rpc/dentv-fee-basis-add` | DENTV FEE BASIS ADD | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-fee-basis-list` | DENTV FEE BASIS LIST | ARRAY |
| GET | `/vista/den/rpc/dentv-tp-file-psr` | DENTV TP FILE PSR | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-tp-file-perio` | DENTV TP FILE PERIO | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-tp-file-hnc` | DENTV TP FILE HNC | ARRAY |
| POST | `/vista/den/rpc/dentv-tp-add-encounter` | DENTV TP ADD ENCOUNTER | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-tp-get-ada-table` | DENTV TP GET ADA TABLE | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-tp-get-providers` | DENTV TP GET PROVIDERS | ARRAY |
| GET | `/vista/den/rpc/dentv-tp-file-tooth-note` | DENTV TP FILE TOOTH NOTE | ARRAY |
| GET | `/vista/den/rpc/dentv-tp-get-tooth-notes` | DENTV TP GET TOOTH NOTES | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-tp-get-hnc` | DENTV TP GET HNC | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-tp-get-psr` | DENTV TP GET PSR | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-tp-get-perio` | DENTV TP GET PERIO | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-tp-file-transactions` | DENTV TP FILE TRANSACTIONS | ARRAY |
| POST | `/vista/den/rpc/dentv-delete-transactions` | DENTV DELETE TRANSACTIONS | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-tp-get-transactions` | DENTV TP GET TRANSACTIONS | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-report-providers` | DENTV REPORT PROVIDERS | ARRAY |
| GET | `/vista/den/rpc/dentv-report-data` | DENTV REPORT DATA | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-get-all-providers` | DENTV GET ALL PROVIDERS | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-get-provider-types` | DENTV GET PROVIDER TYPES | ARRAY |
| GET | `/vista/den/rpc/dentv-get-provider-specialties` | DENTV GET PROVIDER SPECIALTIES | ARRAY |
| POST | `/vista/den/rpc/dentv-provider-add-update` | DENTV PROVIDER ADD UPDATE | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-new-extract` | DENTV NEW EXTRACT | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-tp-get-old-encounters` | DENTV TP GET OLD ENCOUNTERS | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-file-parameters` | DENTV FILE PARAMETERS | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-tp-file-reserved-txns` | DENTV TP FILE RESERVED TXNS | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-tp-get-reserved-txns` | DENTV TP GET RESERVED TXNS | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-get-va-dss-products` | DENTV GET VA-DSS PRODUCTS | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-report-klf` | DENTV REPORT KLF | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-primary-provider` | DENTV PRIMARY PROVIDER | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-ada-get-costs` | DENTV ADA GET COSTS | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-get-coding-guidelines` | DENTV GET CODING GUIDELINES | ARRAY |
| GET | `/vista/den/rpc/dentv-alerts` | DENTV ALERTS | ARRAY |
| GET | `/vista/den/rpc/dentv-patient-provider` | DENTV PATIENT PROVIDER | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-active-user-provider` | DENTV ACTIVE USER PROVIDER | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-get-cover-page-info` | DENTV GET COVER PAGE INFO | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-tp-get-last-status` | DENTV TP GET LAST STATUS | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-tp-code-checks` | DENTV TP CODE CHECKS | SINGLE VALUE |
| POST | `/vista/den/rpc/dentv-update-pce` | DENTV UPDATE PCE | GLOBAL ARRAY |
| POST | `/vista/den/rpc/dentv-update-pce-dx` | DENTV UPDATE PCE DX | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-monitor-queue` | DENTV MONITOR QUEUE | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-monitor-poll` | DENTV MONITOR POLL | ARRAY |
| POST | `/vista/den/rpc/dentv-delete-unfiled-data` | DENTV DELETE UNFILED DATA | ARRAY |
| GET | `/vista/den/rpc/dentv-get-unfiled-detail` | DENTV GET UNFILED DETAIL | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentv-tp-clean-slate` | DENTV TP CLEAN SLATE | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-tp-file-exam-transaction` | DENTV TP FILE EXAM TRANSACTION | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-tp-get-exam-transactions` | DENTV TP GET EXAM TRANSACTIONS | ARRAY |
| GET | `/vista/den/rpc/dentv-get-clean-slate-list` | DENTV GET CLEAN SLATE LIST | ARRAY |
| POST | `/vista/den/rpc/dentv-update-comment-sort` | DENTV UPDATE COMMENT SORT | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-get-canned-comments` | DENTV GET CANNED COMMENTS | ARRAY |
| GET | `/vista/den/rpc/dentv-file-canned-comments` | DENTV FILE CANNED COMMENTS | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-del-canned-comment` | DENTV DEL CANNED COMMENT | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-person-class-inquiry` | DENTV PERSON CLASS INQUIRY | SINGLE VALUE |
| GET | `/vista/den/rpc/dentv-tp-reserved-inact-check` | DENTV TP RESERVED INACT CHECK | SINGLE VALUE |
| GET | `/vista/den/rpc/dentvx2-getwp` | DENTVX2 GETWP | ARRAY |
| GET | `/vista/den/rpc/dentvx2-filewp` | DENTVX2 FILEWP | SINGLE VALUE |
| GET | `/vista/den/rpc/dentvgui-version-get` | DENTVGUI VERSION GET | SINGLE VALUE |
| GET | `/vista/den/rpc/dentvicd-acticd` | DENTVICD ACTICD | SINGLE VALUE |
| GET | `/vista/den/rpc/dentvicd-icd-get-diag` | DENTVICD ICD GET DIAG | SINGLE VALUE |
| GET | `/vista/den/rpc/dentvicd-list` | DENTVICD LIST | GLOBAL ARRAY |
| GET | `/vista/den/rpc/dentvicd-icd10-activation-date` | DENTVICD ICD10 ACTIVATION DATE | SINGLE VALUE |
