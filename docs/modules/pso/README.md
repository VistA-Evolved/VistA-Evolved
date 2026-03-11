# Outpatient Pharmacy (PSO)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Outpatient prescriptions, inpatient meds, drug file, formulary

| Property | Value |
|----------|-------|
| Namespace | `PSO` |
| Tier | 5 |
| FileMan Files | 6 |
| RPCs | 35 |
| Menu Options | 255 |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 50 | File #50 | ? | ? |
| 52 | File #52 | ? | ? |
| 52.6 | File #52.6 | ? | ? |
| 52.7 | File #52.7 | ? | ? |
| 55 | File #55 | ? | ? |
| 59.7 | File #59.7 | ? | ? |

## Remote Procedure Calls (RPCs)

### `PSO VCC REFILL`

| Property | Value |
|----------|-------|
| Tag | `AP1` |
| Routine | `PSOVCCA` |
| Return Type | ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** The RPC performs a refill on an outpatient pharmacy order request.   In addition, the RPC will provide the ability in Outpatient Pharmacy  to store the source of a refill request (eg. VCC, Computerized Patient  Record System (CPRS), Outpatient Pharmacy) as well as the person  making the request - if

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | RXN | LITERAL | No |
| 3 | USER | LITERAL | No |
| 4 | REFILL SOURCE | LITERAL | No |
| 5 | RETURN FLAG | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-vcc-refill`

---

### `PSO EPCS EDIT`

| Property | Value |
|----------|-------|
| Tag | `ENTRY` |
| Routine | `PSOEPED` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure stores information on editing changes in file 200 related to the electronic prescribing of controlled substances.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-edit`

---

### `PSO EPCS ADD DEA`

| Property | Value |
|----------|-------|
| Tag | `FILEFM` |
| Routine | `PSOEPUT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** INPUT:  DATA - DEA DATA LINE "^" DELIMITED.         NPIEN - IEN OF PROVIDER TO BE LINKED TO THIS DEA NUMBER OUTPUT: RET - DEA IEN for SUCCESS, 0 for UNSUCCESSFUL

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | LITERAL | No |
| 2 | NPIEN | LITERAL | No |

**API Endpoint:** `POST /vista/pso/rpc/pso-epcs-add-dea`

---

### `PSO EPCS DEADOJ`

| Property | Value |
|----------|-------|
| Tag | `DEADOJ` |
| Routine | `PSOEPUT` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC call accepts a DEA Number as input. It calls the DOJ/DEA Web Service to get the most recent information for the provider which is  returned to the calling program in a single string with "^" delimited data. The values in the string are:     1 - PROVIDER NAME   2 - ADDRESS 1   3 - ADDRESS 2

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Provider DEA# | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-deadoj`

---

### `PSO EPCS MBM`

| Property | Value |
|----------|-------|
| Tag | `MBM` |
| Routine | `PSOEPUT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is provided to ePCS GUI to check if the site is setup for Meds by Mail service.

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-mbm`

---

### `PSO EPCS REMOVE DEA`

| Property | Value |
|----------|-------|
| Tag | `DEAREM` |
| Routine | `PSOEPUT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Functionality to remove a DEA multiple from file #200, Field 53.21   INPUT:  NPIEN - NEW PERSON FILE #200 INTERNAL ENTRY NUMBER           DEATXT - PROPERLY FORMATTED DEA NUMBER   OUTPUT: RET - 1 for SUCCESS, 0 for UNSUCCESSFUL

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NPIEN | LITERAL | No |
| 2 | DEATXT | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-remove-dea`

---

### `PSO EPCS DEA DUP CHECK`

| Property | Value |
|----------|-------|
| Tag | `DUPCHK` |
| Routine | `PSOEPUT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will accept a DEA in text format, and an institutional suffix if  available.  It will perform checking to determine if the DEA is being  used by another user.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DEATXT | LITERAL | No |
| 2 | SUFFIX | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-dea-dup-check`

---

### `PSO EPCS DEALIST`

| Property | Value |
|----------|-------|
| Tag | `DEALIST` |
| Routine | `PSOEPUT` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call will provide a list of active DEA #s for a  given provider.   INPUT:  NPIEN - NEW PERSON FILE #200 INTERNAL ENTRY NUMBER   OUTPUT: RET - A STRING OF DEA INFORMATION DELIMITED BY THE "^"           1 - DEA NUMBER           2 - INDIVIDUAL DEA SUFFIX           3 - STATE

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NPIEN | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-dealist`

---

### `PSO EPCS VERSION`

| Property | Value |
|----------|-------|
| Tag | `GUICHK` |
| Routine | `PSOEPVR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to check the version of the ePCS GUI that should be  running.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EPCSARY | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-version`

---

### `PSO EPCS DETOX CHECK`

| Property | Value |
|----------|-------|
| Tag | `DTXCHK` |
| Routine | `PSOEPU1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will accept a DEA number in text format, and a DETOX number in  text format.  It will perform checking to see if the DETOX number is a  valid format, and will checking if the DETOX number is being used by  another DEA number.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DEA NUMBER | LITERAL | No |
| 2 | DETOX NUMBER | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-detox-check`

---

### `PSO EPCS VA# DUP CHECK`

| Property | Value |
|----------|-------|
| Tag | `VANUMCHK` |
| Routine | `PSOEPU1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will accept a VA# in text format, and a provider's NEW PERSON File #200 IEN (Internal Entry number).  It will perform checking  to determine if the VA# is being used by another provider.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VANUM | LITERAL | No |
| 2 | NPIEN | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-va#-dup-check`

---

### `PSO EPCS FILER`

| Property | Value |
|----------|-------|
| Tag | `FILEFMA` |
| Routine | `PSOEPU1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will accept a Field Number in the New Person, File #200, a single data item in text format, and Provider Internal Entry Number (IEN) in  File #200.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FIELD | LITERAL | No |
| 2 | DATA | LITERAL | No |
| 3 | NPIEN | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-filer`

---

### `PSO EPCS REPORTS`

| Property | Value |
|----------|-------|
| Tag | `RPTEN` |
| Routine | `PSOEPREP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This call is used by all ePrescribing Controlled Substances (ePCS) GUI  reports. It produces a report based on the criteria selected through the  ePCS GUI application.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EPCSARY | REFERENCE | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-reports`

---

### `PSO EPCS SYSTEM DATE TIME`

| Property | Value |
|----------|-------|
| Tag | `EPCSDATE` |
| Routine | `PSOEPUT2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Broker call returns the server date as a FileMan internal and external  date format.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EPCSARY | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-system-date-time`

---

### `PSO EPCS FIELD HELP`

| Property | Value |
|----------|-------|
| Tag | `EPCSHELP` |
| Routine | `PSOEPUT2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Get the field help from the data dictionary based on the field number.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EPCSARY | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-field-help`

---

### `PSO EPCS GET LIST`

| Property | Value |
|----------|-------|
| Tag | `SRCLST` |
| Routine | `PSOEPUT2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This call is used to perform a search on a file based on a search string.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EPCSARY | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-get-list`

---

### `PSO EPCS LIST NP SCHED`

| Property | Value |
|----------|-------|
| Tag | `NPSCHDL` |
| Routine | `PSOEPU1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Functionality to list the New Person file #200 Schedules for a provider. Schedule fields are 55.1,55.2,55.3,55.4,55.5,55.6

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NPIEN | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-list-np-sched`

---

### `PSO EPCS FILE NP SCHED`

| Property | Value |
|----------|-------|
| Tag | `NPSCHDF` |
| Routine | `PSOEPU1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Functionality to file the New Person file #200 Schedules for a provider. Schedule fields are 55.1,55.2,55.3,55.4,55.5,55.6

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NPIEN | LITERAL | No |
| 2 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-file-np-sched`

---

### `PSO EPCS LIST OPTN DESC`

| Property | Value |
|----------|-------|
| Tag | `OPTNDESC` |
| Routine | `PSOEPU1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** RPC to return Option file #19 description word processing text.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTNM | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-list-optn-desc`

---

### `PSO EPCS TOPIC HELP`

| Property | Value |
|----------|-------|
| Tag | `EPCSHELP` |
| Routine | `PSOEPUT2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the text from the HELP FRAME file (#9.2) based on a help frame.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EPCSARY | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-topic-help`

---

### `PSO ACTIVITY LOG`

| Property | Value |
|----------|-------|
| Tag | `ACT` |
| Routine | `PSOVCC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows retrieval of the Activity Log for a specific prescription  number (External) in the PRESCRIPTION (#52) file.   Return list of ACTIVITY transactions for a particular PRESCRIPTION  (#52)  file entry.  Each transaction will have the following fields (if populated in VistA):      activit

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-activity-log`

---

### `PSO CMOP LOG`

| Property | Value |
|----------|-------|
| Tag | `CMOP` |
| Routine | `PSOVCC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows retrieval of the CMOP Log for a specific prescription  number   Each transaction will have the following fields:            dateShipped         #52.01    9          ndcReceived         #52.01    4          rxReference         #52.01    2          sequenceNumber      #52.01    1

**API Endpoint:** `GET /vista/pso/rpc/pso-cmop-log`

---

### `PSO COPAY LOG`

| Property | Value |
|----------|-------|
| Tag | `COPAY` |
| Routine | `PSOVCC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Return values from Copay Transaction log in PRESCRIPTION (#52) file.   Possible Return Values:   RESULTS(0) = -n^Error message   RESULTS(0) = 0^No Data   RESULTS(1) = Array of return values in JSON format:     copayActivityLog          #52.0107, .01   reason                    #52.0107, 1   initiato

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSOIEN | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-copay-log`

---

### `PSO ECME LOG`

| Property | Value |
|----------|-------|
| Tag | `ECME` |
| Routine | `PSOVCC0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Return list of ECME transactions for a particular PRESCRIPTION (#52) file entry. Each transaction will have the following fields:   ecmeLogDate          #52.3, .01   reason               #52.3, .02    initiatorOfActivity  #52.3, .03   rxReference          #52.3, .04   comment              #52.3, .05

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PIEN | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-ecme-log`

---

### `PSO ERX LOG`

| Property | Value |
|----------|-------|
| Tag | `ERX` |
| Routine | `PSOVCC0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Return list of ERX transactions for a particular PRESCRIPTION (#52) file entry. Each transaction will have the following fields:   eRxLogDate           #52.3, .01   reason               #52.3, .02    initiatorOfActivity  #52.3, .03   rxReference          #52.3, .04   comment              #52.3, .05

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PIEN | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-erx-log`

---

### `PSO LABEL LOG`

| Property | Value |
|----------|-------|
| Tag | `LABEL` |
| Routine | `PSOVCC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Allow listing of Label Log (#52.032) subfile in the PRESCRIPTION (#52) file, given an external prescription number.   RETURN VARIABLES:           0^No data - there are no LABEL entries for this prescription"           -1^ Prescription Number is Required"         -2^ Prescription Number is not recogn

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PIEN | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-label-log`

---

### `PSO LOT EXPIRATION`

| Property | Value |
|----------|-------|
| Tag | `LELF` |
| Routine | `PSOVCC0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Return list of LOT/EXP transactions for a particular PRESCRIPTION (#52)) file entry. Each Transaction will have the following fields:   expirationDate   #52.0401, 1   lotExp           #52.0401, .01   rxIndicator      #52.0401, 2

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PIEN | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-lot-expiration`

---

### `PSO PARTIALS LOG`

| Property | Value |
|----------|-------|
| Tag | `PART` |
| Routine | `PSOVCC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows retrieval of the Partials Log for a specific prescription. Each transaction will have the following fields (if populated in VistA):                                                 loginDateTime                  #52.2, .08    partialDate                    #52.2, .01     qty

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PIEN | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-partials-log`

---

### `PSO REFILL LOG`

| Property | Value |
|----------|-------|
| Tag | `RFIL` |
| Routine | `PSOVCC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows retrieval of the Refill Log for a specific prescription  number.   Return list of REFILL transactions for a particular PRESCRIPTION  (#52) file entry.   Each transaction will have the following fields (if populated in VistA):      loginDate                            #52.1, 7    refi

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PIEN | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-refill-log`

---

### `PSO EPCS CRED`

| Property | Value |
|----------|-------|
| Tag | `LASTCRED` |
| Routine | `PSOEPED` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Return the last CREDENTIAL TYPE from SIGN-ON LOG file (#3.081) for user DUZ passed in.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUZ | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-cred`

---

### `PSO EPCS PSDRPH FILER`

| Property | Value |
|----------|-------|
| Tag | `PSDKEY` |
| Routine | `PSOEPUT2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Allocates and deallocates the PSDRPH key to the specified user and logs  the event in the XUEPCS PSDRPH AUDIT (#8991.7) file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSOSUBJ | LITERAL | No |
| 2 | PSOACTOR | LITERAL | No |
| 3 | PSOACTION | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-epcs-psdrph-filer`

---

### `PSO ADDRESS UPDATE`

| Property | Value |
|----------|-------|
| Tag | `PSOVPADDR` |
| Routine | `PSOVCC0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows the address fields in the PATIENT (#2) file to be updated. It takes two parameters: the patient ICN and the temporary address fields that are to be updated.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSOVICN | LITERAL | No |
| 2 | PSOVADDR | REFERENCE | No |
| 3 | PSOVTYP | LITERAL | No |
| 4 | PSOVATYP | UNKNOWN() | No |

**API Endpoint:** `POST /vista/pso/rpc/pso-address-update`

---

### `PSO GET ADDRESS`

| Property | Value |
|----------|-------|
| Tag | `PSOVRETADDR` |
| Routine | `PSOVCC0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** get a patient address

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSOVATYP | LITERAL | No |
| 2 | PSOVICN | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-get-address`

---

### `PSO TEMP ADDRESS ACTIVE FLAG`

| Property | Value |
|----------|-------|
| Tag | `PSOVTAAF` |
| Routine | `PSOVCC0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |

**Description:** This RPC allows the setting of the TEMPORARY ADDRESS ACTIVE? field in  the patient file (field .12105 in file #2)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSOVICN | LITERAL | No |
| 2 | PSOVSTA | LITERAL | No |
| 3 | PSOVSTRT | LITERAL | No |
| 4 | PSOVEND | LITERAL | No |

**API Endpoint:** `POST /vista/pso/rpc/pso-temp-address-active-flag`

---

### `PSO DEL TEMPORARY ADDRESS`

| Property | Value |
|----------|-------|
| Tag | `PSOVDELAD` |
| Routine | `PSOVCC0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC deletes the patient's temporary address from the patient file

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSOVICN | LITERAL | No |

**API Endpoint:** `GET /vista/pso/rpc/pso-del-temporary-address`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| NDCUPN: | PSOERXA0 DRGMTCH | NDCUPN | LITERAL | rpc |
| DGDESC: | PSOERXA0 DRGMTCH | DGDESC | LITERAL | rpc |
| NPI: | PSOERXA0 PRVMTCH | NPI | LITERAL | rpc |
| DEA: | PSOERXA0 PRVMTCH | DEA | LITERAL | rpc |
| CSUB: | PSOERXA0 PRVMTCH | CSUB | LITERAL | rpc |
| XML: | PSOERXA1 INCERX | XML | LITERAL | rpc |
| PRCHK: | PSOERXA1 INCERX | PRCHK | REFERENCE | rpc |
| PACHK: | PSOERXA1 INCERX | PACHK | REFERENCE | rpc |
| DACHK: | PSOERXA1 INCERX | DACHK | REFERENCE | rpc |
| STATION: | PSOERXA1 INCERX | STATION | LITERAL | rpc |
| DIV: | PSOERXA1 INCERX | DIV | LITERAL | rpc |
| ERXHID: | PSOERXA1 INCERX | ERXHID | LITERAL | rpc |
| ERXVALS: | PSOERXA1 INCERX | ERXVALS | REFERENCE | rpc |
| XML2: | PSOERXA1 INCERX | XML2 | LITERAL | rpc |
| SOURCE: | PSOERXA1 INCERX | SOURCE | LITERAL | rpc |
| XML: | PSOERXI1 INCERX | XML | LITERAL | rpc |
| PRCHK: | PSOERXI1 INCERX | PRCHK | REFERENCE | rpc |
| PACHK: | PSOERXI1 INCERX | PACHK | REFERENCE | rpc |
| DACHK: | PSOERXI1 INCERX | DACHK | REFERENCE | rpc |
| STATION: | PSOERXI1 INCERX | STATION | LITERAL | rpc |
| DIV: | PSOERXI1 INCERX | DIV | LITERAL | rpc |
| ERXHID: | PSOERXI1 INCERX | ERXHID | LITERAL | rpc |
| ERXVALS: | PSOERXI1 INCERX | ERXVALS | REFERENCE | rpc |
| XML2: | PSOERXI1 INCERX | XML2 | LITERAL | rpc |
| XML3: | PSOERXI1 INCERX | XML3 | LITERAL | rpc |
| DFN: | PSO VCC REFILL | DFN | LITERAL | rpc |
| RXN: | PSO VCC REFILL | RXN | LITERAL | rpc |
| USER: | PSO VCC REFILL | USER | LITERAL | rpc |
| REFILL SOURCE: | PSO VCC REFILL | REFILL SOURCE | LITERAL | rpc |
| RETURN FLAG: | PSO VCC REFILL | RETURN FLAG | LITERAL | rpc |
| OPTION: | PSORPC | OPTION | LITERAL | rpc |
| DATA: | PSO EPCS EDIT | DATA | REFERENCE | rpc |
| DATA: | PSO EPCS ADD DEA | DATA | LITERAL | rpc |
| NPIEN: | PSO EPCS ADD DEA | NPIEN | LITERAL | rpc |
| Provider DEA#: | PSO EPCS DEADOJ | Provider DEA# | LITERAL | rpc |
| NPIEN: | PSO EPCS REMOVE DEA | NPIEN | LITERAL | rpc |
| DEATXT: | PSO EPCS REMOVE DEA | DEATXT | LITERAL | rpc |
| DEATXT: | PSO EPCS DEA DUP CHECK | DEATXT | LITERAL | rpc |
| SUFFIX: | PSO EPCS DEA DUP CHECK | SUFFIX | LITERAL | rpc |
| NPIEN: | PSO EPCS DEALIST | NPIEN | LITERAL | rpc |
| EPCSARY: | PSO EPCS VERSION | EPCSARY | LITERAL | rpc |
| DEA NUMBER: | PSO EPCS DETOX CHECK | DEA NUMBER | LITERAL | rpc |
| DETOX NUMBER: | PSO EPCS DETOX CHECK | DETOX NUMBER | LITERAL | rpc |
| VANUM: | PSO EPCS VA# DUP CHECK | VANUM | LITERAL | rpc |
| NPIEN: | PSO EPCS VA# DUP CHECK | NPIEN | LITERAL | rpc |
| FIELD: | PSO EPCS FILER | FIELD | LITERAL | rpc |
| DATA: | PSO EPCS FILER | DATA | LITERAL | rpc |
| NPIEN: | PSO EPCS FILER | NPIEN | LITERAL | rpc |
| EPCSARY: | PSO EPCS REPORTS | EPCSARY | REFERENCE | rpc |
| EPCSARY: | PSO EPCS SYSTEM DATE TIME | EPCSARY | LITERAL | rpc |
| EPCSARY: | PSO EPCS FIELD HELP | EPCSARY | LITERAL | rpc |
| EPCSARY: | PSO EPCS GET LIST | EPCSARY | LITERAL | rpc |
| NPIEN: | PSO EPCS LIST NP SCHED | NPIEN | LITERAL | rpc |
| NPIEN: | PSO EPCS FILE NP SCHED | NPIEN | LITERAL | rpc |
| DATA: | PSO EPCS FILE NP SCHED | DATA | LITERAL | rpc |
| OPTNM: | PSO EPCS LIST OPTN DESC | OPTNM | LITERAL | rpc |
| EPCSARY: | PSO EPCS TOPIC HELP | EPCSARY | LITERAL | rpc |
| IEN: | PSO ACTIVITY LOG | IEN | LITERAL | rpc |
| PSOIEN: | PSO COPAY LOG | PSOIEN | LITERAL | rpc |
| PIEN: | PSO ECME LOG | PIEN | LITERAL | rpc |
| PIEN: | PSO ERX LOG | PIEN | LITERAL | rpc |
| PIEN: | PSO LABEL LOG | PIEN | LITERAL | rpc |
| PIEN: | PSO LOT EXPIRATION | PIEN | LITERAL | rpc |
| PIEN: | PSO PARTIALS LOG | PIEN | LITERAL | rpc |
| PIEN: | PSO REFILL LOG | PIEN | LITERAL | rpc |
| DUZ: | PSO EPCS CRED | DUZ | LITERAL | rpc |
| PSOSUBJ: | PSO EPCS PSDRPH FILER | PSOSUBJ | LITERAL | rpc |
| PSOACTOR: | PSO EPCS PSDRPH FILER | PSOACTOR | LITERAL | rpc |
| PSOACTION: | PSO EPCS PSDRPH FILER | PSOACTION | LITERAL | rpc |
| PSOVICN: | PSO ADDRESS UPDATE | PSOVICN | LITERAL | rpc |
| PSOVADDR: | PSO ADDRESS UPDATE | PSOVADDR | REFERENCE | rpc |
| PSOVTYP: | PSO ADDRESS UPDATE | PSOVTYP | LITERAL | rpc |
| PSOVATYP: | PSO ADDRESS UPDATE | PSOVATYP | UNKNOWN() | rpc |
| PSOVATYP: | PSO GET ADDRESS | PSOVATYP | LITERAL | rpc |
| PSOVICN: | PSO GET ADDRESS | PSOVICN | LITERAL | rpc |
| PSOVICN: | PSO TEMP ADDRESS ACTIVE FLAG | PSOVICN | LITERAL | rpc |
| PSOVSTA: | PSO TEMP ADDRESS ACTIVE FLAG | PSOVSTA | LITERAL | rpc |
| PSOVSTRT: | PSO TEMP ADDRESS ACTIVE FLAG | PSOVSTRT | LITERAL | rpc |
| PSOVEND: | PSO TEMP ADDRESS ACTIVE FLAG | PSOVEND | LITERAL | rpc |
| PSOVICN: | PSO DEL TEMPORARY ADDRESS | PSOVICN | LITERAL | rpc |
| PSBDATA: | PSB SCANPT | PSBDATA | LITERAL | rpc |
| PSBACC: | PSB INSTRUCTOR | PSBACC | LITERAL | rpc |
| PSBVER: | PSB INSTRUCTOR | PSBVER | UNKNOWN() | rpc |
| PSBWIN: | PSB USERSAVE | PSBWIN | LITERAL | rpc |
| PSBVDL: | PSB USERSAVE | PSBVDL | LITERAL | rpc |
| PSBUDCW : | PSB USERSAVE | PSBUDCW  | LITERAL | rpc |
| PSBPBCW: | PSB USERSAVE | PSBPBCW | LITERAL | rpc |
| PSBIVCW: | PSB USERSAVE | PSBIVCW | LITERAL | rpc |
| PSBDEV: | PSB USERSAVE | PSBDEV | LITERAL | rpc |
| PSBCSRT: | PSB USERSAVE | PSBCSRT | LITERAL | rpc |
| PSBCV1: | PSB USERSAVE | PSBCV1 | LITERAL | rpc |
| PSBCV2: | PSB USERSAVE | PSBCV2 | LITERAL | rpc |
| PSBCV3: | PSB USERSAVE | PSBCV3 | LITERAL | rpc |
| PSBCV4: | PSB USERSAVE | PSBCV4 | LITERAL | rpc |
| PSBORMODE: | PSB USERSAVE | PSBORMODE | LITERAL | rpc |
| PSBCLSRCH: | PSB USERSAVE | PSBCLSRCH | LITERAL | rpc |
| PSBVAL: | PSB FMDATE | PSBVAL | LITERAL | rpc |
| SCANVAL: | PSB SCANMED | SCANVAL | LITERAL | rpc |
| PSBDIEN: | PSB SCANMED | PSBDIEN | LITERAL | rpc |
| PSBTAB: | PSB SCANMED | PSBTAB | LITERAL | rpc |
| PSBCMD: | PSB PARAMETER | PSBCMD | LITERAL | rpc |
| PSBENT: | PSB PARAMETER | PSBENT | LITERAL | rpc |
| PSBPAR: | PSB PARAMETER | PSBPAR | LITERAL | rpc |
| PSBINS: | PSB PARAMETER | PSBINS | LITERAL | rpc |
| PSBVAL: | PSB PARAMETER | PSBVAL | LITERAL | rpc |
| PSBHDR: | PSB TRANSACTION | PSBHDR | LITERAL | rpc |
| PSBREC: | PSB TRANSACTION | PSBREC | REFERENCE | rpc |
| DFN: | PSB VALIDATE ORDER | DFN | LITERAL | rpc |
| PSBIEN: | PSB VALIDATE ORDER | PSBIEN | LITERAL | rpc |
| PSBTYPE: | PSB VALIDATE ORDER | PSBTYPE | LITERAL | rpc |
| PSBADMIN: | PSB VALIDATE ORDER | PSBADMIN | LITERAL | rpc |
| PSBTAB: | PSB VALIDATE ORDER | PSBTAB | LITERAL | rpc |
| PSBUID: | PSB VALIDATE ORDER | PSBUID | LITERAL | rpc |
| PSBASTS: | PSB VALIDATE ORDER | PSBASTS | LITERAL | rpc |
| PSBORSTS: | PSB VALIDATE ORDER | PSBORSTS | LITERAL | rpc |
| PSBRMV: | PSB VALIDATE ORDER | PSBRMV | UNKNOWN() | rpc |
| psbdien: | PSB VALIDATE ORDER | psbdien | UNKNOWN() | rpc |
| PSBRMVTM: | PSB VALIDATE ORDER | PSBRMVTM | LITERAL | rpc |
| PSBX: | PSB SERVER CLOCK VARIANCE | PSBX | LITERAL | rpc |
| DFN: | PSB MEDICATION HISTORY | DFN | LITERAL | rpc |
| PSBOI: | PSB MEDICATION HISTORY | PSBOI | LITERAL | rpc |
| DFN: | PSB GETPRNS | DFN | LITERAL | rpc |
| PSBORD: | PSB GETPRNS | PSBORD | LITERAL | rpc |
| PSBSIOPI: | PSB GETPRNS | PSBSIOPI | LITERAL | rpc |
| PSBTYPE: | PSB REPORT | PSBTYPE | LITERAL | rpc |
| PSBDFN: | PSB REPORT | PSBDFN | LITERAL | rpc |
| PSBSTRT: | PSB REPORT | PSBSTRT | LITERAL | rpc |
| PSBSTOP: | PSB REPORT | PSBSTOP | LITERAL | rpc |
| PSBINCL: | PSB REPORT | PSBINCL | LITERAL | rpc |
| PSBDEV: | PSB REPORT | PSBDEV | LITERAL | rpc |
| PSBSORT: | PSB REPORT | PSBSORT | LITERAL | rpc |
| PSBOI: | PSB REPORT | PSBOI | LITERAL | rpc |
| PSBWLOC: | PSB REPORT | PSBWLOC | LITERAL | rpc |
| PSBWSORT: | PSB REPORT | PSBWSORT | LITERAL | rpc |
| PSBFUT: | PSB REPORT | PSBFUT | LITERAL | rpc |
| PSBORDNUM: | PSB REPORT | PSBORDNUM | LITERAL | rpc |
| PSBLIST: | PSB REPORT | PSBLIST | REFERENCE | rpc |
| PSBRCRI: | PSB REPORT | PSBRCRI | LITERAL | rpc |
| PSBORDNM: | PSB REPORT | PSBORDNM | UNKNOWN() | rpc |
| PSBPST: | PSB REPORT | PSBPST | LITERAL | rpc |
| PSBTR: | PSB REPORT | PSBTR | LITERAL | rpc |
| PSBSIFIL: | PSB REPORT | PSBSIFIL | LITERAL | rpc |
| PSBCLINORD: | PSB REPORT | PSBCLINORD | LITERAL | rpc |
| PSB20: | PSB REPORT | PSB20 | LITERAL | rpc |
| PSB21: | PSB REPORT | PSB21 | LITERAL | rpc |
| PSB22: | PSB REPORT | PSB22 | LITERAL | rpc |
| PSB23: | PSB REPORT | PSB23 | LITERAL | rpc |
| PSB24: | PSB REPORT | PSB24 | LITERAL | rpc |
| PSBCLLIST: | PSB REPORT | PSBCLLIST | REFERENCE | rpc |
| PSBDIV: | PSB REPORT | PSBDIV | LITERAL | rpc |
| PSBDFN: | PSB SUBMIT MISSING DOSE | PSBDFN | LITERAL | rpc |
| PSBDRUG: | PSB SUBMIT MISSING DOSE | PSBDRUG | LITERAL | rpc |
| PSBDOSE: | PSB SUBMIT MISSING DOSE | PSBDOSE | LITERAL | rpc |
| PSBRSN: | PSB SUBMIT MISSING DOSE | PSBRSN | LITERAL | rpc |
| PSBADMIN: | PSB SUBMIT MISSING DOSE | PSBADMIN | LITERAL | rpc |
| PSBNEED: | PSB SUBMIT MISSING DOSE | PSBNEED | LITERAL | rpc |
| PSBUID: | PSB SUBMIT MISSING DOSE | PSBUID | LITERAL | rpc |
| PSBON: | PSB SUBMIT MISSING DOSE | PSBON | LITERAL | rpc |
| PSBSCHD: | PSB SUBMIT MISSING DOSE | PSBSCHD | LITERAL | rpc |
| PSBCLIN: | PSB SUBMIT MISSING DOSE | PSBCLIN | LITERAL | rpc |
| PSBCLNIEN: | PSB SUBMIT MISSING DOSE | PSBCLNIEN | LITERAL | rpc |
| PSBESIG: | PSB VALIDATE ESIG | PSBESIG | LITERAL | rpc |
| PSBWHAT: | PSB CHECK SERVER | PSBWHAT | REFERENCE | rpc |
| PSBDATA: | PSB CHECK SERVER | PSBDATA | REFERENCE | rpc |
| PSBCMD: | PSB MAIL | PSBCMD | LITERAL | rpc |
| PSBDATA: | PSB MAIL | PSBDATA | WORD-PROCESSING | rpc |
| DFN: | PSB GETORDERTAB | DFN | LITERAL | rpc |
| VDL TAB: | PSB GETORDERTAB | VDL TAB | LITERAL | rpc |
| VDL DATE: | PSB GETORDERTAB | VDL DATE | LITERAL | rpc |
| PSBSIOPI: | PSB GETORDERTAB | PSBSIOPI | LITERAL | rpc |
| PSBCLINORD: | PSB GETORDERTAB | PSBCLINORD | LITERAL | rpc |
| PSBEDIV: | PSB WARDLIST | PSBEDIV | LITERAL | rpc |
| PSBWARD: | PSB GETIVPAR | PSBWARD | LITERAL | rpc |
| PSBIVPT: | PSB GETIVPAR | PSBIVPT | LITERAL | rpc |
| PSBDIV: | PSB GETIVPAR | PSBDIV | LITERAL | rpc |
| FROM: | PSB DEVICE | FROM | LITERAL | rpc |
| DIR: | PSB DEVICE | DIR | LITERAL | rpc |
| PSBWARD: | PSB PUTIVPAR | PSBWARD | LITERAL | rpc |
| PSBPARS: | PSB PUTIVPAR | PSBPARS | LITERAL | rpc |
| PSBDIV: | PSB PUTIVPAR | PSBDIV | LITERAL | rpc |
| DFN: | PSB IV ORDER HISTORY | DFN | LITERAL | rpc |
| PSBORD: | PSB IV ORDER HISTORY | PSBORD | LITERAL | rpc |
| PSBUID: | PSB BAG DETAIL | PSBUID | LITERAL | rpc |
| PSBORD: | PSB BAG DETAIL | PSBORD | LITERAL | rpc |
|  PATIENT ID: | PSB ALLERGY |  PATIENT ID | LITERAL | rpc |
| PSBIN: | PSB GETPROVIDER | PSBIN | LITERAL | rpc |
| PSBSCAN: | PSB MOB DRUG LIST | PSBSCAN | LITERAL | rpc |
| PSBOTYP: | PSB MOB DRUG LIST | PSBOTYP | LITERAL | rpc |
| PSBHDR: | PSB CPRS ORDER | PSBHDR | LITERAL | rpc |
| PSBREC: | PSB CPRS ORDER | PSBREC | REFERENCE | rpc |
| none: | PSB NURS WARDLIST | none | UNKNOWN() | rpc |
| DFN: | PSB CHECK IV | DFN | LITERAL | rpc |
| ORDIV: | PSB CHECK IV | ORDIV | REFERENCE | rpc |
| DFN: | PSB VITALS | DFN | LITERAL | rpc |
| PSBDFN: | PSB VITAL MEAS FILE | PSBDFN | LITERAL | rpc |
| PSBRATE: | PSB VITAL MEAS FILE | PSBRATE | LITERAL | rpc |
| PSBVTYPE: | PSB VITAL MEAS FILE | PSBVTYPE | LITERAL | rpc |
| PSBDTTKN: | PSB VITAL MEAS FILE | PSBDTTKN | LITERAL | rpc |
| PSBREC: | PSB MED LOG LOOKUP | PSBREC | REFERENCE | rpc |
| DFN: | PSB COVERSHEET1 | DFN | LITERAL | rpc |
| HRSBACK: | PSB COVERSHEET1 | HRSBACK | LITERAL | rpc |
| PSBSIOPI: | PSB COVERSHEET1 | PSBSIOPI | LITERAL | rpc |
| PSBCLINORD: | PSB COVERSHEET1 | PSBCLINORD | LITERAL | rpc |
| PARAMS: | PSB UTL XSTATUS SRCH | PARAMS | LITERAL | rpc |
| PSBPARAM: | PSB MAN SCAN FAILURE | PSBPARAM | REFERENCE | rpc |
| DFN: | PSB GETINJECTIONSITE | DFN | LITERAL | rpc |
| TIME: | PSB GETINJECTIONSITE | TIME | LITERAL | rpc |
| MAX: | PSB GETINJECTIONSITE | MAX | LITERAL | rpc |
| PSBOI: | PSB GETINJECTIONSITE | PSBOI | LITERAL | rpc |
| PSBACC: | PSB WITNESS | PSBACC | LITERAL | rpc |
| PSBVER: | PSB WITNESS | PSBVER | LITERAL | rpc |
| PREFIX: | PSB CLINICLIST | PREFIX | LITERAL | rpc |
| CONTAINS: | PSB CLINICLIST | CONTAINS | LITERAL | rpc |
| DFN: | PSB MEDS ON PATIENT | DFN | LITERAL | rpc |
| OPTION: | PSB GETSETWP | OPTION | LITERAL | rpc |
| AIP: | PSN FDA MED GUIDE PRINT QUEUE | AIP | LITERAL | rpc |
| TMP: | PSA UPLOAD | TMP | REFERENCE | rpc |

## Menu Options

### Action

| Name | Security Key |
|------|-------------|
| PSO P | — |
| PSO RXDL | — |
| PSO C | — |
| PSO RETURNED STOCK | — |
| PSO INTERVENTION DELETE | PSORPH |
| PSO INTERVENTION VIEW | PSORPH |
| PSO INTERVENTION NEW ENTRY | PSORPH |
| PSO INTERVENTION EDIT | PSORPH |
| PSO INTERVENTION PRINTOUT | PSORPH |
| PSO BATCH BARCODE | — |
| PSO LMOE FINISH | — |
| PSO LM BACKDOOR ORDERS | — |
| PSO CHANGE PRINTER | — |
| PSO RXCOST UPDATE | — |
| PSO RXEDIT | — |
| PSO SUCMOP PRINT REPORT | — |
| PSO SUCMOP RE-SUSLOCALCMOPPRI | — |
| PSO RX SEARCH | — |
| PSO RX DRUG SEARCH | — |
| PSO DOSAGE REPORT | — |
| PSO TPB PATIENT RX REPORT | — |
| PSO NON-VA MEDS USAGE REPORT | — |
| PSO LM MULTI-RX PRINT | — |
| PSO PMP | — |
| PSO PMP SITE PREFERENCES | PSORPH |
| PSO ePHARM SITE PARAMETERS | PSO EPHARMACY SITE MANAGER |
| PSO HRC PROFILE/REFILL | — |
| PSO SPMP SINGLE RX VIEW/EXPORT | — |
| PSO SPMP STATE PARAMETERS | — |
| PSO SPMP BATCH VIEW/EXPORT | — |
| PSO SPMP BATCH PROCESSING | — |
| PSO SPMP SCHEDULED EXPORT | — |
| PSO SPMP DISCLOSURE REPORT | — |
| PSO SPMP UNMARK ADMIN CLINIC | — |
| PSO SPMP ASAP DEFINITIONS | — |
| PSO SPMP SSH KEY MANAGEMENT | — |
| PSO REMOTE RX REPORT | — |
| PSO SPMP VOID RX VIEW/EXPORT | PSO SPMP ADMIN |
| PSO ERX QUEUE PROCESSING | — |
| PSO DEA/DOJ NIGHTLY DATA UPD | — |
| PSO ERX BATCH CH REQ/DRUG SWAP | — |

### Menu

| Name | Security Key |
|------|-------------|
| PSO PND | — |
| PSO CST | — |
| PSO MANAGER | — |
| PSO RX | — |
| PSO OUTPUTS | — |
| PSO USER1 | — |
| PSO USER2 | — |
| PSO SUPERVISOR | — |
| PSO VER | — |
| PSO ARCHIVE | PSOA PURGE |
| PSO INTERVENTION MENU | PSORPH |
| PSO BINGO MANAGER | — |
| PSO BINGO USER | — |
| PSO BINGO BOARD | — |
| PSO MAINTENANCE | — |
| PSO BARCODE MENU | — |
| PSO MGMT REPORT DAILY MENU | — |
| PSO MGMT REPORT MONTHLY MENU | — |
| PSO MGMT REPORT MENU | — |
| PSO COST STAT MENU | — |
| PSO EXTERNAL INTERFACE | PSOINTERFACE |
| PSO SUCMOP MENU | — |
| PSO SCRIPTALK REPORTS | — |
| PSO SCRIPTALK MAIN MENU | — |
| PSO SCRIPTALK SET-UP | — |
| PSO EPHARMACY MENU | — |
| PSO BAI REPORT | — |
| PSO SPMP MENU | — |
| PSO MBM-VPS PHARMACY MENU | — |
| PSO EPCS UTILITY FUNCTIONS | — |

### Run routine

| Name | Security Key |
|------|-------------|
| PSO PNDRX | — |
| PSO PNDRPT | — |
| PSO PNDCHG | — |
| PSO PNDLBL | — |
| PSO PNDEL | — |
| PSO PNDCNT | — |
| PSO PNDLOG | — |
| PSO ALPHA | — |
| PSO SYNONYM | — |
| PSO COMMON | — |
| PSO INACTIVE | — |
| PSO NONFORM | — |
| PSO NARC | — |
| PSO RXRPT | — |
| PSO PAT | — |
| PSO VIEW | — |
| PSO AMIS | — |
| PSO RPH | — |
| PSO COST STATISTICS | — |
| PSO DRUG COSTS | — |
| PSO COST BY PATIENT STATUS | — |
| PSO COST BY DIVISION | — |
| PSO HI COST | — |
| PSO CLINIC COSTS | — |
| PSO DIV COSTS BY DRUG | — |
| PSO REQ STATS | — |
| PSO COSTINIT | — |
| PSO COSTDAY | — |
| PSO COSTMONTH | — |
| PSO INTERDIV | — |
| PSO INVENTORY | — |
| PSO PROVIDER INQUIRE | — |
| PSO ACTION PROFILE | — |
| PSO B | — |
| PSO SITE PARAMETERS | — |
| PSO VR | PSORPH |
| PSO NVCNT | — |
| PSO VRPT | — |
| PSO AUTOCANCEL | — |
| PSO CLERK | — |
| PSO BARCODE CHECK | — |
| PSO PROVIDER EDIT | — |
| PSO COST BY PROVIDER | — |
| PSO COST PER PROVIDER | — |
| PSO COST PROVIDER BY DRUG | — |
| PSO COST DIVISION BY PROVIDER | — |
| PSO HOLDRPT | — |
| PSO AMIS COMPILE | — |
| PSO AMIS RECOMPILE | — |
| PSO DAILY AMIS | — |
| PSO MONTHLYCOST | — |
| PSO RELEASE | — |
| PSO AUTOCANCEL1 | — |
| PSO BINGO START | — |
| PSO BINGO STOP | — |
| PSO BINGO PURGE | — |
| PSO BINGO ENTER/EDIT DISPLAY | — |
| PSO BINGO REPORT PRINT | — |
| PSO BINGO NEW PATIENT | — |
| PSO BINGO DISPLAY PATIENT | — |
| PSO BINGO DELETE PATIENT | — |
| PSO RELEASE REPORT | — |
| PSO PROVIDER ADD | — |
| PSO MGMT REPORTS ALL DAILY | — |
| PSO MGMT REPORT RX COUNTS | — |
| PSO MGMT REPORT TYPE OF RX | — |
| PSO MGMT REPORT RX COSTS | — |
| PSO MGMT REPORT IV | — |
| PSO MGMT MONTHLY ALL REPORTS | — |
| PSO MGMT MONTHLY RX COUNTS | — |
| PSO MGMT MONTHLY TYPE OF RX | — |
| PSO MGMT MONTHLY RX COSTS | — |
| PSO MGMT MONTHLY IV | — |
| PSO MGMT RPT DAILY COMPILE | — |
| PSO MGMT RPT RANGE COMPILE | — |
| PSO MGMT RPT ONE DAY COMPILE | — |
| PSO MGMT DATA PURGE | — |
| PSO AUTOQUEUE JOBS | — |
| PSO PNDEL1 | — |
| PSO COSTDAY NIGHTJOB | — |
| PSO MGMT NIGHTLY COMPILE | — |
| PSO ARCHIVE PURGE | — |
| PSO ARCHIVE FIND | — |
| PSO ARCHIVE TAPE SAVE | — |
| PSO ARCHIVE TAPE RETRIEVE | — |
| PSO ARCHIVE LIST RX'S | — |
| PSO COST STATS BY DIVISION | — |
| PSO PURGE DRUG COST | — |
| PSO SETUP CLINIC GROUPS | — |
| PSO PNDPRI | — |
| PSO EXPIRE PRESCRIPTIONS | — |
| PSO EXPIRE INITIALIZE | — |
| PSO BINGO AUTOSTART | — |
| PSO BINGO INITIALIZE | — |
| PSO BINGO STATUS | — |
| PSO INTERFACE VIEW | PSOINTERFACE |
| PSO INTERFACE REPRINT | PSOINTERFACE |
| PSO INTERFACE PURGE | PSOINTERFACE |
| PSO BINGO REPORT WAIT TIME | — |
| PSO ARCHIVE FILE SAVE | — |
| PSO ARCHIVE FILE RETRIEVE | — |
| PSO BACKFILL PRESCRIPTIONS | — |
| PSO CMOP CS RX DISPENSE REPORT | — |
| PSO SUCMOP RESUSPENDNOTPRI | — |
| PSO MANUAL AUTO EXPIRE | — |
| PSO ADDRESS CHANGE REPORT | — |
| PSO INTERNET REFILLS | — |
| PSO TPB PATIENT ENTER/EDIT | — |
| PSO TPB PATIENT REPORT | — |
| PSO TPB INSTITUTION LETTERS | — |
| PSO TPB PRINT LETTERS | — |
| PSO TPB LETTERS PRINTED REPORT | — |
| PSO TPB RX ENTRY | — |
| PSO TPB HL7 EXTRACT | — |
| PSO SCRIPTALK ENROLLEES | — |
| PSO SCRIPTALK PATIENT ENROLL | — |
| PSO SCRIPTALK AUDIT HISTORY | — |
| PSO SCRIPTALK MANUAL EXTERNAL | — |
| PSO SCRIPTALK MANUAL INTERNAL | — |
| PSO SCRIPTALK DEVICE DEF'N | — |
| PSO SCRIPTALK TEST DEVICE | — |
| PSO SCRIPTALK SAMPLE LABEL | — |
| PSO SCRIPTALK REPRINT VISTA LB | — |
| PSO SCRIPTALK REINITIALIZE | — |
| PSO SIGLOG REPRINT | — |
| PSO REJECTS WORKLIST | PSORPH |
| PSO REJECTS VIEW/PROCESS | PSORPH |
| PSO BAI SUSPENDED | — |
| PSO BAI NOT MAILED | — |
| PSO IGNORED REJECTS REPORT | — |
| PSO AUTO REFILL INITIALIZE | — |
| PSO AUTO REFILL | — |
| PSO INTERNET REFILL REPORT | — |
| PSO RX QUEUE CMOP | — |
| PSO REJECTS BACKGROUND MESSAGE | — |
| PSO NDC VALIDATE | — |
| PSO RECALL LIST | — |
| PSO TRI CVA OVERRIDE REPORT | PSO TRICARE/CHAMPVA MGR |
| PSO ORDER CHECKS VERIFY | — |
| PSO AUTO DISPENSING DEVICE | — |
| PSO CHECK DRUG INTERACTION | — |
| PSO PRODUCTIVITY REVENUE RPT | — |
| PSO SCRIPTALK VOID LABEL DEF'N | — |
| PSO EPHARMACY PATIENT COMMENTS | PSO EPHARMACY SITE MANAGER |
| PSO RX NUMBERING WARNING | — |
| PSO CLINICAL ALERT ENTER/EDIT | — |
| PSO NON-VA PROVIDER IMPORT | — |
| PSO NON-VA PROVIDER INACTIVATE | XUPROG |
| PSO MEDICATION STATUS CHECK | — |
| PSO SPMP MANUAL EXPORT/RX FIX | — |
| PSO SPMP RX NOT TRANSMITTED | — |
| PSO MBM-VPS PRODUCTIVITY RPT | — |
| PSO PROCESS TELEPHONE REFILLS | — |
| PSO PURGE PROCESSED 52.444 | — |
| PSO BYPASS 3/4 DAY SUPPLY | — |
| PSO DEA MIGRATION REPORT | — |
| PSO DEA DELETE | — |
| PSO EPCS EXPIRE DATE REPORT | — |
| PSO EPCS LOGICAL ACCESS REPORT | — |
| PSO EPCS PHARMACIST ACC REPORT | — |
| PSO EPCS PSDRPH AUDIT | — |
| PSO EPCS LOGICAL ACCESS | — |
| PSO EPCS ACCESS REPORTS PARAM | — |
| PSO EPCS PSDRPH KEY | — |
| PSO RX QUEUE REPORT | — |
| PSO PARK REPORT | — |
| PSO PARK FUNCTION | — |
| PSO EPCS PRIVS | — |
| PSO EPCS DISUSER PRIVS | — |
| PSO EPCS PRINT EDIT AUDIT | — |
| PSO EPCS EXPIRED DEA FAILOVER | — |
| PSO VAMC MBM PHARMACY MODE | — |
| PSO EPCS DEA MANUAL ENTRY | PSDMGR |
| PSO EPCS MANUAL DEA REPORT | — |
| PSO EPCS DEA INTEGRITY REPORT | — |

### Print

| Name | Security Key |
|------|-------------|
| PSO RX LIST | — |
| PSO EPCS PSDRPH | — |
| PSO EPCS SET PARMS | — |

### Broker

| Name | Security Key |
|------|-------------|
| PSO WEB SERVICES OPTION | — |
| PSO VCC REFILL | — |
| PSO DEA EDIT DATA | XUEPCSEDIT |
| PSO EPCS GUI CONTEXT | — |
| PSO WEB CHART | — |

### Edit

| Name | Security Key |
|------|-------------|
| PSO EPCS EDIT DEA# AND XDATE | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `PSORPH`
- `PSOA PURGE`
- `PSOINTERFACE`
- `PSO EPHARMACY SITE MANAGER`
- `PSO TRICARE/CHAMPVA MGR`
- `XUPROG`
- `PSO SPMP ADMIN`
- `XUEPCSEDIT`
- `PSDMGR`

## API Route Summary

All routes are prefixed with `/vista/pso/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/pso/rpc/pso-vcc-refill` | PSO VCC REFILL | ARRAY |
| GET | `/vista/pso/rpc/pso-epcs-edit` | PSO EPCS EDIT | SINGLE VALUE |
| POST | `/vista/pso/rpc/pso-epcs-add-dea` | PSO EPCS ADD DEA | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-epcs-deadoj` | PSO EPCS DEADOJ | ARRAY |
| GET | `/vista/pso/rpc/pso-epcs-mbm` | PSO EPCS MBM | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-epcs-remove-dea` | PSO EPCS REMOVE DEA | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-epcs-dea-dup-check` | PSO EPCS DEA DUP CHECK | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-epcs-dealist` | PSO EPCS DEALIST | ARRAY |
| GET | `/vista/pso/rpc/pso-epcs-version` | PSO EPCS VERSION | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-epcs-detox-check` | PSO EPCS DETOX CHECK | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-epcs-va#-dup-check` | PSO EPCS VA# DUP CHECK | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-epcs-filer` | PSO EPCS FILER | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-epcs-reports` | PSO EPCS REPORTS | GLOBAL ARRAY |
| GET | `/vista/pso/rpc/pso-epcs-system-date-time` | PSO EPCS SYSTEM DATE TIME | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-epcs-field-help` | PSO EPCS FIELD HELP | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-epcs-get-list` | PSO EPCS GET LIST | GLOBAL ARRAY |
| GET | `/vista/pso/rpc/pso-epcs-list-np-sched` | PSO EPCS LIST NP SCHED | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-epcs-file-np-sched` | PSO EPCS FILE NP SCHED | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-epcs-list-optn-desc` | PSO EPCS LIST OPTN DESC | ARRAY |
| GET | `/vista/pso/rpc/pso-epcs-topic-help` | PSO EPCS TOPIC HELP | GLOBAL ARRAY |
| GET | `/vista/pso/rpc/pso-activity-log` | PSO ACTIVITY LOG | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-cmop-log` | PSO CMOP LOG | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-copay-log` | PSO COPAY LOG | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-ecme-log` | PSO ECME LOG | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-erx-log` | PSO ERX LOG | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-label-log` | PSO LABEL LOG | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-lot-expiration` | PSO LOT EXPIRATION | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-partials-log` | PSO PARTIALS LOG | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-refill-log` | PSO REFILL LOG | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-epcs-cred` | PSO EPCS CRED | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-epcs-psdrph-filer` | PSO EPCS PSDRPH FILER | SINGLE VALUE |
| POST | `/vista/pso/rpc/pso-address-update` | PSO ADDRESS UPDATE | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-get-address` | PSO GET ADDRESS | SINGLE VALUE |
| POST | `/vista/pso/rpc/pso-temp-address-active-flag` | PSO TEMP ADDRESS ACTIVE FLAG | SINGLE VALUE |
| GET | `/vista/pso/rpc/pso-del-temporary-address` | PSO DEL TEMPORARY ADDRESS | SINGLE VALUE |
