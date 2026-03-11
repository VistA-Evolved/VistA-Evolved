# Shift Handoff Tool (CRHD)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `CRHD` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 58 |
| Menu Options | 1 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `CRHD SAVE TEMP FLD`

| Property | Value |
|----------|-------|
| Tag | `TEMPDATA` |
| Routine | `CRHD2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/crhd/rpc/crhd-save-temp-fld`

---

### `CRHD PAT DEMO`

| Property | Value |
|----------|-------|
| Tag | `PATDEMO` |
| Routine | `CRHD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Returns: NAME^SSN^DOB^AGE^SEX^ROOM/BED^TREATING_SPECIALTY^ATTENDING^ PRIMARY_CARE_PROVIDER^WARD_LOCATION ADMISSION_DATE^DAY_WITHIN_ADMISSION^ADMISSION_DIAGNOSIS

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STR | LITERAL | No |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-pat-demo`

---

### `CRHD PAT ALLERGIES`

| Property | Value |
|----------|-------|
| Tag | `ALG` |
| Routine | `CRHD` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STR | LITERAL | No |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-pat-allergies`

---

### `CRHD PAT ACTMEDS`

| Property | Value |
|----------|-------|
| Tag | `ACTMED` |
| Routine | `CRHD` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STR | LITERAL | No |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-pat-actmeds`

---

### `CRHD PAT CODESTS`

| Property | Value |
|----------|-------|
| Tag | `CODESTS` |
| Routine | `CRHD` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STR | LITERAL | No |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-pat-codests`

---

### `CRHD GET TEMP FLD`

| Property | Value |
|----------|-------|
| Tag | `GTEMPTXT` |
| Routine | `CRHD3` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FLDNAME | LITERAL | No |
| 2 | USER | LITERAL | No |
| 3 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-get-temp-fld`

---

### `CRHD GET PAT LIST`

| Property | Value |
|----------|-------|
| Tag | `GETPTLST` |
| Routine | `CRHD3` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-get-pat-list`

---

### `CRHD ALL USER PARAMETERS`

| Property | Value |
|----------|-------|
| Tag | `GETALLP` |
| Routine | `CRHD4` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-all-user-parameters`

---

### `CRHD GET ONE PARAMETER`

| Property | Value |
|----------|-------|
| Tag | `GETONEP` |
| Routine | `CRHD4` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-get-one-parameter`

---

### `CRHD GET CONSULT`

| Property | Value |
|----------|-------|
| Tag | `CONSULT` |
| Routine | `CRHDUT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-get-consult`

---

### `CRHD GET IMAGING`

| Property | Value |
|----------|-------|
| Tag | `IMAGING` |
| Routine | `CRHDUT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-get-imaging`

---

### `CRHD GET LABS`

| Property | Value |
|----------|-------|
| Tag | `LABS` |
| Routine | `CRHDUT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-get-labs`

---

### `CRHD SAVE PARAMETERS`

| Property | Value |
|----------|-------|
| Tag | `SAVEPARM` |
| Routine | `CRHD4` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/crhd/rpc/crhd-save-parameters`

---

### `CRHD LIST SERVICES`

| Property | Value |
|----------|-------|
| Tag | `SRV` |
| Routine | `CRHD5` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-list-services`

---

### `CRHD LIST DIVISIONS`

| Property | Value |
|----------|-------|
| Tag | `DIV` |
| Routine | `CRHD5` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-list-divisions`

---

### `CRHD SAVE DNR TITLES`

| Property | Value |
|----------|-------|
| Tag | `SAVEP` |
| Routine | `CRHD6` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/crhd/rpc/crhd-save-dnr-titles`

---

### `CRHD GET DNR TITLES`

| Property | Value |
|----------|-------|
| Tag | `GETDNRT` |
| Routine | `CRHD4` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-get-dnr-titles`

---

### `CRHD ADDITIONAL USER INFO`

| Property | Value |
|----------|-------|
| Tag | `AUSRINFO` |
| Routine | `CRHDUT2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-additional-user-info`

---

### `CRHD GET PREFERENCES`

| Property | Value |
|----------|-------|
| Tag | `GETP` |
| Routine | `CRHD6` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-get-preferences`

---

### `CRHD GET TEAM PHONE NUMBERS`

| Property | Value |
|----------|-------|
| Tag | `TEAMMEM` |
| Routine | `CRHD7` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-get-team-phone-numbers`

---

### `CRHD USER PHONE INFO`

| Property | Value |
|----------|-------|
| Tag | `DISPEMP` |
| Routine | `CRHDUD` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-user-phone-info`

---

### `CRHD IS RECORD LOCKED`

| Property | Value |
|----------|-------|
| Tag | `LOCK` |
| Routine | `CRHD2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-is-record-locked`

---

### `CRHD MGR`

| Property | Value |
|----------|-------|
| Tag | `MGR` |
| Routine | `CRHD7` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-mgr`

---

### `CRHD SERVICE INFO`

| Property | Value |
|----------|-------|
| Tag | `SRV` |
| Routine | `CRHDUD` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-service-info`

---

### `CRHD SPECIALTY INFO`

| Property | Value |
|----------|-------|
| Tag | `SPEC` |
| Routine | `CRHDUD` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-specialty-info`

---

### `CRHD SORT PRINT LIST`

| Property | Value |
|----------|-------|
| Tag | `SORT` |
| Routine | `CRHD8` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-sort-print-list`

---

### `CRHD GET USER DIVISIONS`

| Property | Value |
|----------|-------|
| Tag | `USERDIV` |
| Routine | `CRHD5` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-get-user-divisions`

---

### `CRHD HOT TEAM LIST`

| Property | Value |
|----------|-------|
| Tag | `HOLIST` |
| Routine | `CRHD9` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-hot-team-list`

---

### `CRHD HOT PATIENT LIST`

| Property | Value |
|----------|-------|
| Tag | `HOPLIST` |
| Routine | `CRHD9` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-hot-patient-list`

---

### `CRHD HOT PROVIDER LIST`

| Property | Value |
|----------|-------|
| Tag | `HODLIST` |
| Routine | `CRHD9` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-hot-provider-list`

---

### `CRHD HOT CAN EDIT`

| Property | Value |
|----------|-------|
| Tag | `CANEDIT` |
| Routine | `CRHD9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-hot-can-edit`

---

### `CRHD HOT MODIFY LIST`

| Property | Value |
|----------|-------|
| Tag | `MOD` |
| Routine | `CRHD9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-hot-modify-list`

---

### `CRHD HOT PRV INFO`

| Property | Value |
|----------|-------|
| Tag | `PRVINFO` |
| Routine | `CRHD9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-hot-prv-info`

---

### `CRHD HOT TEAM SAVE`

| Property | Value |
|----------|-------|
| Tag | `HOTMSAVE` |
| Routine | `CRHD9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/crhd/rpc/crhd-hot-team-save`

---

### `CRHD HOT DELETE TEAM LIST`

| Property | Value |
|----------|-------|
| Tag | `HOTMDEL` |
| Routine | `CRHD9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/crhd/rpc/crhd-hot-delete-team-list`

---

### `CRHD HOT PATPRV`

| Property | Value |
|----------|-------|
| Tag | `PATPRV` |
| Routine | `CRHD9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-hot-patprv`

---

### `CRHD HOT DELETE PAT/PRV`

| Property | Value |
|----------|-------|
| Tag | `DELENTS` |
| Routine | `CRHD1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/crhd/rpc/crhd-hot-delete-pat/prv`

---

### `CRHD HOT PROVIDER LIST2`

| Property | Value |
|----------|-------|
| Tag | `HOTMMEM` |
| Routine | `CRHD1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-hot-provider-list2`

---

### `CRHD HOT PROVIDER BY CLASS`

| Property | Value |
|----------|-------|
| Tag | `HOTMMEMS` |
| Routine | `CRHD1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-hot-provider-by-class`

---

### `CRHD HOT PROVIDER PATIENTS`

| Property | Value |
|----------|-------|
| Tag | `HOTPRVPT` |
| Routine | `CRHD1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-hot-provider-patients`

---

### `CRHD USER PHONE NUMBERS`

| Property | Value |
|----------|-------|
| Tag | `USERPHPG` |
| Routine | `CRHD9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-user-phone-numbers`

---

### `CRHD HOT TEAM PHONE INFO`

| Property | Value |
|----------|-------|
| Tag | `HOTEAM` |
| Routine | `CRHDUD` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-hot-team-phone-info`

---

### `CRHD SAVE XPAR PARAMETERS`

| Property | Value |
|----------|-------|
| Tag | `SAVEP2` |
| Routine | `CRHD6` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/crhd/rpc/crhd-save-xpar-parameters`

---

### `CRHD GET XPAR VALUES`

| Property | Value |
|----------|-------|
| Tag | `GETPAR2` |
| Routine | `CRHD6` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-get-xpar-values`

---

### `CRHD MOD TM PROVIDERS`

| Property | Value |
|----------|-------|
| Tag | `TMMOD` |
| Routine | `CRHD10` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-mod-tm-providers`

---

### `CRHD TM PRV LIST`

| Property | Value |
|----------|-------|
| Tag | `TMLIST` |
| Routine | `CRHD10` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-tm-prv-list`

---

### `CRHD TM PRV INFO`

| Property | Value |
|----------|-------|
| Tag | `TMPRVINF` |
| Routine | `CRHD10` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-tm-prv-info`

---

### `CRHD GET USER PARAMETERS`

| Property | Value |
|----------|-------|
| Tag | `GETIT` |
| Routine | `CRHD11` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-get-user-parameters`

---

### `CRHD AVAILABLE PARAMETERS`

| Property | Value |
|----------|-------|
| Tag | `GETALLPL` |
| Routine | `CRHD11` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-available-parameters`

---

### `CRHD DEFAULT PREFERENCE`

| Property | Value |
|----------|-------|
| Tag | `DEFPREF` |
| Routine | `CRHD11` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-default-preference`

---

### `CRHD GET ORDERABLE ITEMS`

| Property | Value |
|----------|-------|
| Tag | `LORDITM` |
| Routine | `CRHDDR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-get-orderable-items`

---

### `CRHD DELETE A PREFERENCE`

| Property | Value |
|----------|-------|
| Tag | `DELPREF` |
| Routine | `CRHD5` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/crhd/rpc/crhd-delete-a-preference`

---

### `CRHD COMB TM LIST`

| Property | Value |
|----------|-------|
| Tag | `TMCOMB` |
| Routine | `CRHD10` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-comb-tm-list`

---

### `CRHD INPT LIST`

| Property | Value |
|----------|-------|
| Tag | `LISTINPT` |
| Routine | `CRHD3` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-inpt-list`

---

### `CRHD HOT TEAM MGR`

| Property | Value |
|----------|-------|
| Tag | `HOTMMGR` |
| Routine | `CRHD1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-hot-team-mgr`

---

### `CRHD GET TEAM FILENAME`

| Property | Value |
|----------|-------|
| Tag | `FILENGET` |
| Routine | `CRHD9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/crhd/rpc/crhd-get-team-filename`

---

### `CRHD SAVE TEAM FILENAME`

| Property | Value |
|----------|-------|
| Tag | `FILENSAV` |
| Routine | `CRHD9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/crhd/rpc/crhd-save-team-filename`

---

### `CRHD GET XPAR PARAM`

| Property | Value |
|----------|-------|
| Tag | `PARAM` |
| Routine | `CRHD6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Simple call to return a parameter value.  The call assumes the current  user, 'defaultable' entities, and one instance.

**API Endpoint:** `GET /vista/crhd/rpc/crhd-get-xpar-param`

---


## Menu Options

### Broker

| Name | Security Key |
|------|-------------|
| CRHD SHIFT CHANGE HANDOFF | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/crhd/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| POST | `/vista/crhd/rpc/crhd-save-temp-fld` | CRHD SAVE TEMP FLD | ARRAY |
| GET | `/vista/crhd/rpc/crhd-pat-demo` | CRHD PAT DEMO | SINGLE VALUE |
| GET | `/vista/crhd/rpc/crhd-pat-allergies` | CRHD PAT ALLERGIES | ARRAY |
| GET | `/vista/crhd/rpc/crhd-pat-actmeds` | CRHD PAT ACTMEDS | ARRAY |
| GET | `/vista/crhd/rpc/crhd-pat-codests` | CRHD PAT CODESTS | ARRAY |
| GET | `/vista/crhd/rpc/crhd-get-temp-fld` | CRHD GET TEMP FLD | ARRAY |
| GET | `/vista/crhd/rpc/crhd-get-pat-list` | CRHD GET PAT LIST | ARRAY |
| GET | `/vista/crhd/rpc/crhd-all-user-parameters` | CRHD ALL USER PARAMETERS | ARRAY |
| GET | `/vista/crhd/rpc/crhd-get-one-parameter` | CRHD GET ONE PARAMETER | ARRAY |
| GET | `/vista/crhd/rpc/crhd-get-consult` | CRHD GET CONSULT | ARRAY |
| GET | `/vista/crhd/rpc/crhd-get-imaging` | CRHD GET IMAGING | ARRAY |
| GET | `/vista/crhd/rpc/crhd-get-labs` | CRHD GET LABS | ARRAY |
| POST | `/vista/crhd/rpc/crhd-save-parameters` | CRHD SAVE PARAMETERS | ARRAY |
| GET | `/vista/crhd/rpc/crhd-list-services` | CRHD LIST SERVICES | ARRAY |
| GET | `/vista/crhd/rpc/crhd-list-divisions` | CRHD LIST DIVISIONS | ARRAY |
| POST | `/vista/crhd/rpc/crhd-save-dnr-titles` | CRHD SAVE DNR TITLES | ARRAY |
| GET | `/vista/crhd/rpc/crhd-get-dnr-titles` | CRHD GET DNR TITLES | ARRAY |
| GET | `/vista/crhd/rpc/crhd-additional-user-info` | CRHD ADDITIONAL USER INFO | ARRAY |
| GET | `/vista/crhd/rpc/crhd-get-preferences` | CRHD GET PREFERENCES | ARRAY |
| GET | `/vista/crhd/rpc/crhd-get-team-phone-numbers` | CRHD GET TEAM PHONE NUMBERS | ARRAY |
| GET | `/vista/crhd/rpc/crhd-user-phone-info` | CRHD USER PHONE INFO | ARRAY |
| GET | `/vista/crhd/rpc/crhd-is-record-locked` | CRHD IS RECORD LOCKED | SINGLE VALUE |
| GET | `/vista/crhd/rpc/crhd-mgr` | CRHD MGR | SINGLE VALUE |
| GET | `/vista/crhd/rpc/crhd-service-info` | CRHD SERVICE INFO | ARRAY |
| GET | `/vista/crhd/rpc/crhd-specialty-info` | CRHD SPECIALTY INFO | ARRAY |
| GET | `/vista/crhd/rpc/crhd-sort-print-list` | CRHD SORT PRINT LIST | ARRAY |
| GET | `/vista/crhd/rpc/crhd-get-user-divisions` | CRHD GET USER DIVISIONS | ARRAY |
| GET | `/vista/crhd/rpc/crhd-hot-team-list` | CRHD HOT TEAM LIST | ARRAY |
| GET | `/vista/crhd/rpc/crhd-hot-patient-list` | CRHD HOT PATIENT LIST | ARRAY |
| GET | `/vista/crhd/rpc/crhd-hot-provider-list` | CRHD HOT PROVIDER LIST | ARRAY |
| GET | `/vista/crhd/rpc/crhd-hot-can-edit` | CRHD HOT CAN EDIT | SINGLE VALUE |
| GET | `/vista/crhd/rpc/crhd-hot-modify-list` | CRHD HOT MODIFY LIST | SINGLE VALUE |
| GET | `/vista/crhd/rpc/crhd-hot-prv-info` | CRHD HOT PRV INFO | SINGLE VALUE |
| POST | `/vista/crhd/rpc/crhd-hot-team-save` | CRHD HOT TEAM SAVE | SINGLE VALUE |
| POST | `/vista/crhd/rpc/crhd-hot-delete-team-list` | CRHD HOT DELETE TEAM LIST | SINGLE VALUE |
| GET | `/vista/crhd/rpc/crhd-hot-patprv` | CRHD HOT PATPRV | SINGLE VALUE |
| POST | `/vista/crhd/rpc/crhd-hot-delete-pat/prv` | CRHD HOT DELETE PAT/PRV | SINGLE VALUE |
| GET | `/vista/crhd/rpc/crhd-hot-provider-list2` | CRHD HOT PROVIDER LIST2 | ARRAY |
| GET | `/vista/crhd/rpc/crhd-hot-provider-by-class` | CRHD HOT PROVIDER BY CLASS | ARRAY |
| GET | `/vista/crhd/rpc/crhd-hot-provider-patients` | CRHD HOT PROVIDER PATIENTS | ARRAY |
| GET | `/vista/crhd/rpc/crhd-user-phone-numbers` | CRHD USER PHONE NUMBERS | SINGLE VALUE |
| GET | `/vista/crhd/rpc/crhd-hot-team-phone-info` | CRHD HOT TEAM PHONE INFO | ARRAY |
| POST | `/vista/crhd/rpc/crhd-save-xpar-parameters` | CRHD SAVE XPAR PARAMETERS | ARRAY |
| GET | `/vista/crhd/rpc/crhd-get-xpar-values` | CRHD GET XPAR VALUES | ARRAY |
| GET | `/vista/crhd/rpc/crhd-mod-tm-providers` | CRHD MOD TM PROVIDERS | SINGLE VALUE |
| GET | `/vista/crhd/rpc/crhd-tm-prv-list` | CRHD TM PRV LIST | ARRAY |
| GET | `/vista/crhd/rpc/crhd-tm-prv-info` | CRHD TM PRV INFO | SINGLE VALUE |
| GET | `/vista/crhd/rpc/crhd-get-user-parameters` | CRHD GET USER PARAMETERS | ARRAY |
| GET | `/vista/crhd/rpc/crhd-available-parameters` | CRHD AVAILABLE PARAMETERS | ARRAY |
| GET | `/vista/crhd/rpc/crhd-default-preference` | CRHD DEFAULT PREFERENCE | ARRAY |
| GET | `/vista/crhd/rpc/crhd-get-orderable-items` | CRHD GET ORDERABLE ITEMS | ARRAY |
| POST | `/vista/crhd/rpc/crhd-delete-a-preference` | CRHD DELETE A PREFERENCE | ARRAY |
| GET | `/vista/crhd/rpc/crhd-comb-tm-list` | CRHD COMB TM LIST | ARRAY |
| GET | `/vista/crhd/rpc/crhd-inpt-list` | CRHD INPT LIST | ARRAY |
| GET | `/vista/crhd/rpc/crhd-hot-team-mgr` | CRHD HOT TEAM MGR | SINGLE VALUE |
| GET | `/vista/crhd/rpc/crhd-get-team-filename` | CRHD GET TEAM FILENAME | SINGLE VALUE |
| POST | `/vista/crhd/rpc/crhd-save-team-filename` | CRHD SAVE TEAM FILENAME | SINGLE VALUE |
| GET | `/vista/crhd/rpc/crhd-get-xpar-param` | CRHD GET XPAR PARAM | SINGLE VALUE |
