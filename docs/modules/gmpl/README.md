# Problem List (GMPL)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Patient problems, conditions, ICD coding

| Property | Value |
|----------|-------|
| Namespace | `GMPL` |
| Tier | 5 |
| FileMan Files | 2 |
| RPCs | 28 |
| Menu Options | 29 |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 9000011 | File #9000011 | ? | ? |
| 9000011.12 | File #9000011.12 | ? | ? |

## Remote Procedure Calls (RPCs)

### `ORQQPL LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORQQPL` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Function returns a list of problems for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | STATUS | LITERAL | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-list`

---

### `ORQQPL DETAIL`

| Property | Value |
|----------|-------|
| Tag | `DETAIL` |
| Routine | `ORQQPL` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Function returns a string of detailed information for a problem.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PROBLEM ID | LITERAL | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-detail`

---

### `ORQQPL PROBLEM LIST`

| Property | Value |
|----------|-------|
| Tag | `PROBL` |
| Routine | `ORQQPL3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Problem list for CPRS GUI client

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-problem-list`

---

### `ORQQPL USER PROB CATS`

| Property | Value |
|----------|-------|
| Tag | `CAT` |
| Routine | `ORQQPL3` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** rETURNS ARRAY OF CATEGORIES FOR USER TO SELECT FROM

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUZ | LITERAL | No |
| 2 | CLINIC | LITERAL | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-user-prob-cats`

---

### `ORQQPL USER PROB LIST`

| Property | Value |
|----------|-------|
| Tag | `PROB` |
| Routine | `ORQQPL3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns array of user specific problems to select from

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Category | LITERAL | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-user-prob-list`

---

### `ORQQPL PROBLEM LEX SEARCH`

| Property | Value |
|----------|-------|
| Tag | `LEXSRCH` |
| Routine | `ORQQPL1` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Get a list from clinical lexicon for display in list or combo box

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FLAG | LITERAL | No |
| 2 | NUM | LITERAL | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-problem-lex-search`

---

### `ORQQPL EDIT LOAD`

| Property | Value |
|----------|-------|
| Tag | `EDLOAD` |
| Routine | `ORQQPL1` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Description:** Return array of default fields and original fields - GMPFLD() and GMPORIG()

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IFN | LITERAL | No |
| 2 | provider | LITERAL | No |
| 3 | vamc | LITERAL | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-edit-load`

---

### `ORQQPL INIT PT`

| Property | Value |
|----------|-------|
| Tag | `INITPT` |
| Routine | `ORQQPL1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** returns death indicator, sc and exposures

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | UNKNOWN() | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-init-pt`

---

### `ORQQPL PROVIDER LIST`

| Property | Value |
|----------|-------|
| Tag | `PROVSRCH` |
| Routine | `ORQQPL1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** RETURNS ARRAY OF PROVIDERS MATCHING INPUT

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-provider-list`

---

### `ORQQPL EDIT SAVE`

| Property | Value |
|----------|-------|
| Tag | `EDSAVE` |
| Routine | `ORQQPL1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** sAVES EDITED PROBLEM RECORD

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IFN | LITERAL | No |
| 2 | PROV | LITERAL | No |
| 3 | VAMC | LITERAL | No |

**API Endpoint:** `POST /vista/gmpl/rpc/orqqpl-edit-save`

---

### `ORQQPL CLIN SRCH`

| Property | Value |
|----------|-------|
| Tag | `CLINSRCH` |
| Routine | `ORQQPL1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns list of clinics for problem list. Should be replaced by CLIN^ORQPT

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-clin-srch`

---

### `ORQQPL ADD SAVE`

| Property | Value |
|----------|-------|
| Tag | `ADDSAVE` |
| Routine | `ORQQPL1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |

**Description:** Add new problem record

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMPDFN | LITERAL | No |
| 2 | GMPROV | UNKNOWN() | No |
| 3 | GMPVAMC | LITERAL | No |
| 4 | ADDARRAY | REFERENCE | No |

**API Endpoint:** `POST /vista/gmpl/rpc/orqqpl-add-save`

---

### `ORQQPL INIT USER`

| Property | Value |
|----------|-------|
| Tag | `INITUSER` |
| Routine | `ORQQPL1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns user parameters for problem list

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUZ | UNKNOWN() | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-init-user`

---

### `ORQQPL UPDATE`

| Property | Value |
|----------|-------|
| Tag | `UPDATE` |
| Routine | `ORQQPL1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Updates problem record

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | UPDARRAY | REFERENCE | No |

**API Endpoint:** `POST /vista/gmpl/rpc/orqqpl-update`

---

### `ORQQPL DELETE`

| Property | Value |
|----------|-------|
| Tag | `DELETE` |
| Routine | `ORQQPL2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |

**Description:** DELETES A PROBLEM

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IFN | LITERAL | No |
| 2 | PROVIDERID | UNKNOWN() | No |
| 3 | VAMC | UNKNOWN() | No |
| 4 | REASON | LITERAL | No |

**API Endpoint:** `POST /vista/gmpl/rpc/orqqpl-delete`

---

### `ORQQPL AUDIT HIST`

| Property | Value |
|----------|-------|
| Tag | `HIST` |
| Routine | `ORQQPL2` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** RETURN PROBLEM AUDIT HISTORY

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMPIFN | LITERAL | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-audit-hist`

---

### `ORQQPL REPLACE`

| Property | Value |
|----------|-------|
| Tag | `REPLACE` |
| Routine | `ORQQPL2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** REPLACES A PROBLEM THAT WAS PREVIOUSLY DELETED

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IFN | LITERAL | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-replace`

---

### `ORQQPL VERIFY`

| Property | Value |
|----------|-------|
| Tag | `VERIFY` |
| Routine | `ORQQPL2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** VERIFY A TRANSCRIBED PROBLEM

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMPIFN | LITERAL | No |

**API Endpoint:** `POST /vista/gmpl/rpc/orqqpl-verify`

---

### `ORQQPL PROV FILTER LIST`

| Property | Value |
|----------|-------|
| Tag | `GETRPRV` |
| Routine | `ORQQPL3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** RETURNS A LIST OF PROVIDERS CORRESPONDING TO INPUT ARRAY OF IEN

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INP | REFERENCE | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-prov-filter-list`

---

### `ORQQPL CLIN FILTER LIST`

| Property | Value |
|----------|-------|
| Tag | `GETCLIN` |
| Routine | `ORQQPL3` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** rETURNS ARRAY OF IEN^NAME FOR AN ARRAY OF IEN PASSED IN

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-clin-filter-list`

---

### `ORQQPL SERV FILTER LIST`

| Property | Value |
|----------|-------|
| Tag | `GETSRVC` |
| Routine | `ORQQPL3` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** RETURNS ARRAY OF IEN^NAME FOR INPUT ARRAY OF IEN

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-serv-filter-list`

---

### `ORQQPL SRVC SRCH`

| Property | Value |
|----------|-------|
| Tag | `SRVCSRCH` |
| Routine | `ORQQPL1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** gET LIST OF AVAILABLE SERVICES

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-srvc-srch`

---

### `ORQQPL PROB COMMENTS`

| Property | Value |
|----------|-------|
| Tag | `GETCOMM` |
| Routine | `ORQQPL2` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns a list of comments associated with a problem IEN.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Problem IEN | LITERAL | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-prob-comments`

---

### `ORQQPL INACTIVATE`

| Property | Value |
|----------|-------|
| Tag | `INACT` |
| Routine | `ORQQPL2` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Problem IFN | LITERAL | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-inactivate`

---

### `ORQQPL SAVEVIEW`

| Property | Value |
|----------|-------|
| Tag | `SAVEVIEW` |
| Routine | `ORQQPL2` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Saves preferred view (inpatient/outpatient) and list of preferred clinics/services to NEW PERSON file, field 125.nn.  Also sets value of parameter [ORCH CONTEXT PROBLEMS], which controls the default status of the problems shown, as well as whether comments should be displayed. Preferences take effec

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMPLVIEW | LITERAL | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-saveview`

---

### `ORQQPL PROBLEM NTRT BULLETIN`

| Property | Value |
|----------|-------|
| Tag | `NTRTBULL` |
| Routine | `ORQQPL2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC generates a bulletin to the OR CAC Mail Group, indicating that  an unresolved term needs to be requested using the New Term Rapid  Turnaround website at http://hdrmul7.aac.va.gov:7151/ntrt/.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORTERM | LITERAL | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-problem-ntrt-bulletin`

---

### `ORQQPL CHECK DUP`

| Property | Value |
|----------|-------|
| Tag | `DUP` |
| Routine | `ORQQPL1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | TERM | LITERAL | No |
| 3 | TEXT | LITERAL | No |

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl-check-dup`

---

### `ORQQPL4 LEX`

| Property | Value |
|----------|-------|
| Tag | `LEX` |
| Routine | `ORQQPL4` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** This RPC supports the Clinical Lexicon Search for Problem List. It will  return an indefinite list of terms that match the user's search string.

**API Endpoint:** `GET /vista/gmpl/rpc/orqqpl4-lex`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| PATIENT ID: | ORQQPL LIST | PATIENT ID | LITERAL | rpc |
| STATUS: | ORQQPL LIST | STATUS | LITERAL | rpc |
| PROBLEM ID: | ORQQPL DETAIL | PROBLEM ID | LITERAL | rpc |
| DFN: | ORQQPL PROBLEM LIST | DFN | LITERAL | rpc |
| DUZ: | ORQQPL USER PROB CATS | DUZ | LITERAL | rpc |
| CLINIC: | ORQQPL USER PROB CATS | CLINIC | LITERAL | rpc |
| Category: | ORQQPL USER PROB LIST | Category | LITERAL | rpc |
| FLAG: | ORQQPL PROBLEM LEX SEARCH | FLAG | LITERAL | rpc |
| NUM: | ORQQPL PROBLEM LEX SEARCH | NUM | LITERAL | rpc |
| IFN: | ORQQPL EDIT LOAD | IFN | LITERAL | rpc |
| provider: | ORQQPL EDIT LOAD | provider | LITERAL | rpc |
| vamc: | ORQQPL EDIT LOAD | vamc | LITERAL | rpc |
| DFN: | ORQQPL INIT PT | DFN | UNKNOWN() | rpc |
| IFN: | ORQQPL EDIT SAVE | IFN | LITERAL | rpc |
| PROV: | ORQQPL EDIT SAVE | PROV | LITERAL | rpc |
| VAMC: | ORQQPL EDIT SAVE | VAMC | LITERAL | rpc |
| GMPDFN: | ORQQPL ADD SAVE | GMPDFN | LITERAL | rpc |
| GMPROV: | ORQQPL ADD SAVE | GMPROV | UNKNOWN() | rpc |
| GMPVAMC: | ORQQPL ADD SAVE | GMPVAMC | LITERAL | rpc |
| ADDARRAY: | ORQQPL ADD SAVE | ADDARRAY | REFERENCE | rpc |
| DUZ: | ORQQPL INIT USER | DUZ | UNKNOWN() | rpc |
| UPDARRAY: | ORQQPL UPDATE | UPDARRAY | REFERENCE | rpc |
| IFN: | ORQQPL DELETE | IFN | LITERAL | rpc |
| PROVIDERID: | ORQQPL DELETE | PROVIDERID | UNKNOWN() | rpc |
| VAMC: | ORQQPL DELETE | VAMC | UNKNOWN() | rpc |
| REASON: | ORQQPL DELETE | REASON | LITERAL | rpc |
| GMPIFN: | ORQQPL AUDIT HIST | GMPIFN | LITERAL | rpc |
| IFN: | ORQQPL REPLACE | IFN | LITERAL | rpc |
| GMPIFN: | ORQQPL VERIFY | GMPIFN | LITERAL | rpc |
| INP: | ORQQPL PROV FILTER LIST | INP | REFERENCE | rpc |
| Problem IEN: | ORQQPL PROB COMMENTS | Problem IEN | LITERAL | rpc |
| Problem IFN: | ORQQPL INACTIVATE | Problem IFN | LITERAL | rpc |
| GMPLVIEW: | ORQQPL SAVEVIEW | GMPLVIEW | LITERAL | rpc |
| ORTERM: | ORQQPL PROBLEM NTRT BULLETIN | ORTERM | LITERAL | rpc |
| DFN: | ORQQPL CHECK DUP | DFN | LITERAL | rpc |
| TERM: | ORQQPL CHECK DUP | TERM | LITERAL | rpc |
| TEXT: | ORQQPL CHECK DUP | TEXT | LITERAL | rpc |

## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| GMPL CLINICAL USER | — |
| GMPL DATA ENTRY | — |
| GMPL PARAMETER EDIT | — |
| GMPL USER VIEW | — |
| GMPL PATIENT LISTING | — |
| GMPL PROBLEM LISTING | — |
| GMPL BUILD SELECTION LIST | — |
| GMPL ASSIGN LIST | — |
| GMPL BUILD ENC FORM LIST | — |
| GMPL CODE LIST | — |
| GMPL DELETE LIST | — |
| GMPL REPLACE PROBLEMS | — |
| GMPL USER LOOK-UP FILTER | — |
| GMPL USER LOOK-UP DISPLAY | — |
| GMPL USER LOOK-UP VOCABULARY | — |
| GMPL USER LOOK-UP SHORTCUTS | — |
| GMPL USER LOOK-UP LIST | — |
| GMPL SELECTION LIST CSV CHECK | — |
| GMPL SELECTION LIST IMPORT | GMPL IMPRT UTIL |

### Menu

| Name | Security Key |
|------|-------------|
| GMPL MGT MENU | — |
| GMPL USER LOOK-UP DEFAULTS | — |
| GMPL USER PREFS MENU | — |
| GMPL BUILD LIST MENU | — |

### Action

| Name | Security Key |
|------|-------------|
| GMPL USER LIST | — |
| GMPL NTRT F/U RPT | — |
| GMPL FREETEXT F/U REPORT | — |
| GMPL DIAG ERROR REPORT | — |
| GMPL DIAG CLEANUP REPORT | — |
| GMPL GENERATE DIAG RPTS | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `GMPL IMPRT UTIL`

## API Route Summary

All routes are prefixed with `/vista/gmpl/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/gmpl/rpc/orqqpl-list` | ORQQPL LIST | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-detail` | ORQQPL DETAIL | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-problem-list` | ORQQPL PROBLEM LIST | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-user-prob-cats` | ORQQPL USER PROB CATS | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-user-prob-list` | ORQQPL USER PROB LIST | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-problem-lex-search` | ORQQPL PROBLEM LEX SEARCH | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-edit-load` | ORQQPL EDIT LOAD | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-init-pt` | ORQQPL INIT PT | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-provider-list` | ORQQPL PROVIDER LIST | ARRAY |
| POST | `/vista/gmpl/rpc/orqqpl-edit-save` | ORQQPL EDIT SAVE | SINGLE VALUE |
| GET | `/vista/gmpl/rpc/orqqpl-clin-srch` | ORQQPL CLIN SRCH | ARRAY |
| POST | `/vista/gmpl/rpc/orqqpl-add-save` | ORQQPL ADD SAVE | SINGLE VALUE |
| GET | `/vista/gmpl/rpc/orqqpl-init-user` | ORQQPL INIT USER | ARRAY |
| POST | `/vista/gmpl/rpc/orqqpl-update` | ORQQPL UPDATE | ARRAY |
| POST | `/vista/gmpl/rpc/orqqpl-delete` | ORQQPL DELETE | SINGLE VALUE |
| GET | `/vista/gmpl/rpc/orqqpl-audit-hist` | ORQQPL AUDIT HIST | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-replace` | ORQQPL REPLACE | SINGLE VALUE |
| POST | `/vista/gmpl/rpc/orqqpl-verify` | ORQQPL VERIFY | SINGLE VALUE |
| GET | `/vista/gmpl/rpc/orqqpl-prov-filter-list` | ORQQPL PROV FILTER LIST | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-clin-filter-list` | ORQQPL CLIN FILTER LIST | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-serv-filter-list` | ORQQPL SERV FILTER LIST | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-srvc-srch` | ORQQPL SRVC SRCH | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-prob-comments` | ORQQPL PROB COMMENTS | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-inactivate` | ORQQPL INACTIVATE | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-saveview` | ORQQPL SAVEVIEW | ARRAY |
| GET | `/vista/gmpl/rpc/orqqpl-problem-ntrt-bulletin` | ORQQPL PROBLEM NTRT BULLETIN | SINGLE VALUE |
| GET | `/vista/gmpl/rpc/orqqpl-check-dup` | ORQQPL CHECK DUP | SINGLE VALUE |
| GET | `/vista/gmpl/rpc/orqqpl4-lex` | ORQQPL4 LEX | GLOBAL ARRAY |
