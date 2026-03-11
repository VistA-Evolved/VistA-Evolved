# Controlled Substances (PSD)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Outpatient prescriptions, inpatient meds, drug file, formulary

| Property | Value |
|----------|-------|
| Namespace | `PSD` |
| Tier | 5 |
| FileMan Files | 6 |
| RPCs | 86 |
| Menu Options | 165 |

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

### `PSOERXA0 DRGMTCH`

| Property | Value |
|----------|-------|
| Tag | `DRGMTCH` |
| Routine | `PSOERXA0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC is used to match incoming eRx drugs/supply items to the VistA  equivalent drug/supply items.   Input:     Both parameters are 'optional', but to receive any legitimate    results, at least one of the two must be passed in.     NDCUPN - NDC or UPN value to be match to the NDC/UPN file (#50.6

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NDCUPN | LITERAL | No |
| 2 | DGDESC | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psoerxa0-drgmtch`

---

### `PSOERXA0 PRVMTCH`

| Property | Value |
|----------|-------|
| Tag | `PRVMTCH` |
| Routine | `PSOERXA0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** Provides logic for matching a provider identified for an incoming eRx  prescription.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NPI | LITERAL | No |
| 2 | DEA | LITERAL | No |
| 3 | CSUB | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psoerxa0-prvmtch`

---

### `PSOERXA1 INCERX`

| Property | Value |
|----------|-------|
| Tag | `INCERX` |
| Routine | `PSOERXA1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 10 |

**Description:** This RPC receives and processes an incoming ERX XML message, provider  check information, and patient check information.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XML | LITERAL | No |
| 2 | PRCHK | REFERENCE | No |
| 3 | PACHK | REFERENCE | No |
| 4 | DACHK | REFERENCE | No |
| 5 | STATION | LITERAL | No |
| 6 | DIV | LITERAL | No |
| 7 | ERXHID | LITERAL | No |
| 8 | ERXVALS | REFERENCE | No |
| 9 | XML2 | LITERAL | No |
| 10 | SOURCE | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psoerxa1-incerx`

---

### `PSOERXI1 INCERX`

| Property | Value |
|----------|-------|
| Tag | `INCERX` |
| Routine | `PSOERXI1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 10 |

**Description:** This RPC receives incoming eRx messages that are in the 2017 script  format. This RPC replaces PSOERXA1 INCERX, which was the RPC used for the  10.6 script format.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XML | LITERAL | No |
| 2 | PRCHK | REFERENCE | No |
| 3 | PACHK | REFERENCE | No |
| 4 | DACHK | REFERENCE | No |
| 5 | STATION | LITERAL | No |
| 6 | DIV | LITERAL | No |
| 7 | ERXHID | LITERAL | No |
| 8 | ERXVALS | REFERENCE | No |
| 9 | XML2 | LITERAL | No |
| 10 | XML3 | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psoerxi1-incerx`

---

### `PSO VCC REFILL`

| Property | Value |
|----------|-------|
| Tag | `AP1` |
| Routine | `PSOVCCA` |
| Return Type | ARRAY |
| Parameter Count | 5 |

**Description:** The RPC performs a refill on an outpatient pharmacy order request.   In addition, the RPC will provide the ability in Outpatient Pharmacy  to store the source of a refill request (eg. VCC, Computerized Patient  Record System (CPRS), Outpatient Pharmacy) as well as the person  making the request - if

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | RXN | LITERAL | No |
| 3 | USER | LITERAL | No |
| 4 | REFILL SOURCE | LITERAL | No |
| 5 | RETURN FLAG | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-vcc-refill`

---

### `PSORPC`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSORPC01` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTION | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psorpc`

---

### `PSO EPCS EDIT`

| Property | Value |
|----------|-------|
| Tag | `ENTRY` |
| Routine | `PSOEPED` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This remote procedure stores information on editing changes in file 200 related to the electronic prescribing of controlled substances.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-edit`

---

### `PSO EPCS ADD DEA`

| Property | Value |
|----------|-------|
| Tag | `FILEFM` |
| Routine | `PSOEPUT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** INPUT:  DATA - DEA DATA LINE "^" DELIMITED.         NPIEN - IEN OF PROVIDER TO BE LINKED TO THIS DEA NUMBER OUTPUT: RET - DEA IEN for SUCCESS, 0 for UNSUCCESSFUL

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | LITERAL | No |
| 2 | NPIEN | LITERAL | No |

**API Endpoint:** `POST /vista/psd/rpc/pso-epcs-add-dea`

---

### `PSO EPCS DEADOJ`

| Property | Value |
|----------|-------|
| Tag | `DEADOJ` |
| Routine | `PSOEPUT` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC call accepts a DEA Number as input. It calls the DOJ/DEA Web Service to get the most recent information for the provider which is  returned to the calling program in a single string with "^" delimited data. The values in the string are:     1 - PROVIDER NAME   2 - ADDRESS 1   3 - ADDRESS 2

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Provider DEA# | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-deadoj`

---

### `PSO EPCS MBM`

| Property | Value |
|----------|-------|
| Tag | `MBM` |
| Routine | `PSOEPUT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This RPC is provided to ePCS GUI to check if the site is setup for Meds by Mail service.

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-mbm`

---

### `PSO EPCS REMOVE DEA`

| Property | Value |
|----------|-------|
| Tag | `DEAREM` |
| Routine | `PSOEPUT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Functionality to remove a DEA multiple from file #200, Field 53.21   INPUT:  NPIEN - NEW PERSON FILE #200 INTERNAL ENTRY NUMBER           DEATXT - PROPERLY FORMATTED DEA NUMBER   OUTPUT: RET - 1 for SUCCESS, 0 for UNSUCCESSFUL

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NPIEN | LITERAL | No |
| 2 | DEATXT | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-remove-dea`

---

### `PSO EPCS DEA DUP CHECK`

| Property | Value |
|----------|-------|
| Tag | `DUPCHK` |
| Routine | `PSOEPUT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC will accept a DEA in text format, and an institutional suffix if  available.  It will perform checking to determine if the DEA is being  used by another user.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DEATXT | LITERAL | No |
| 2 | SUFFIX | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-dea-dup-check`

---

### `PSO EPCS DEALIST`

| Property | Value |
|----------|-------|
| Tag | `DEALIST` |
| Routine | `PSOEPUT` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This remote procedure call will provide a list of active DEA #s for a  given provider.   INPUT:  NPIEN - NEW PERSON FILE #200 INTERNAL ENTRY NUMBER   OUTPUT: RET - A STRING OF DEA INFORMATION DELIMITED BY THE "^"           1 - DEA NUMBER           2 - INDIVIDUAL DEA SUFFIX           3 - STATE

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NPIEN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-dealist`

---

### `PSO EPCS VERSION`

| Property | Value |
|----------|-------|
| Tag | `GUICHK` |
| Routine | `PSOEPVR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC is used to check the version of the ePCS GUI that should be  running.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EPCSARY | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-version`

---

### `PSO EPCS DETOX CHECK`

| Property | Value |
|----------|-------|
| Tag | `DTXCHK` |
| Routine | `PSOEPU1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC will accept a DEA number in text format, and a DETOX number in  text format.  It will perform checking to see if the DETOX number is a  valid format, and will checking if the DETOX number is being used by  another DEA number.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DEA NUMBER | LITERAL | No |
| 2 | DETOX NUMBER | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-detox-check`

---

### `PSO EPCS VA# DUP CHECK`

| Property | Value |
|----------|-------|
| Tag | `VANUMCHK` |
| Routine | `PSOEPU1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC will accept a VA# in text format, and a provider's NEW PERSON File #200 IEN (Internal Entry number).  It will perform checking  to determine if the VA# is being used by another provider.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VANUM | LITERAL | No |
| 2 | NPIEN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-va#-dup-check`

---

### `PSO EPCS FILER`

| Property | Value |
|----------|-------|
| Tag | `FILEFMA` |
| Routine | `PSOEPU1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** This RPC will accept a Field Number in the New Person, File #200, a single data item in text format, and Provider Internal Entry Number (IEN) in  File #200.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FIELD | LITERAL | No |
| 2 | DATA | LITERAL | No |
| 3 | NPIEN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-filer`

---

### `PSO EPCS REPORTS`

| Property | Value |
|----------|-------|
| Tag | `RPTEN` |
| Routine | `PSOEPREP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This call is used by all ePrescribing Controlled Substances (ePCS) GUI  reports. It produces a report based on the criteria selected through the  ePCS GUI application.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EPCSARY | REFERENCE | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-reports`

---

### `PSO EPCS SYSTEM DATE TIME`

| Property | Value |
|----------|-------|
| Tag | `EPCSDATE` |
| Routine | `PSOEPUT2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Broker call returns the server date as a FileMan internal and external  date format.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EPCSARY | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-system-date-time`

---

### `PSO EPCS FIELD HELP`

| Property | Value |
|----------|-------|
| Tag | `EPCSHELP` |
| Routine | `PSOEPUT2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Get the field help from the data dictionary based on the field number.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EPCSARY | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-field-help`

---

### `PSO EPCS GET LIST`

| Property | Value |
|----------|-------|
| Tag | `SRCLST` |
| Routine | `PSOEPUT2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This call is used to perform a search on a file based on a search string.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EPCSARY | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-get-list`

---

### `PSO EPCS LIST NP SCHED`

| Property | Value |
|----------|-------|
| Tag | `NPSCHDL` |
| Routine | `PSOEPU1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Functionality to list the New Person file #200 Schedules for a provider. Schedule fields are 55.1,55.2,55.3,55.4,55.5,55.6

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NPIEN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-list-np-sched`

---

### `PSO EPCS FILE NP SCHED`

| Property | Value |
|----------|-------|
| Tag | `NPSCHDF` |
| Routine | `PSOEPU1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Functionality to file the New Person file #200 Schedules for a provider. Schedule fields are 55.1,55.2,55.3,55.4,55.5,55.6

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NPIEN | LITERAL | No |
| 2 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-file-np-sched`

---

### `PSO EPCS LIST OPTN DESC`

| Property | Value |
|----------|-------|
| Tag | `OPTNDESC` |
| Routine | `PSOEPU1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** RPC to return Option file #19 description word processing text.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTNM | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-list-optn-desc`

---

### `PSO EPCS TOPIC HELP`

| Property | Value |
|----------|-------|
| Tag | `EPCSHELP` |
| Routine | `PSOEPUT2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Returns the text from the HELP FRAME file (#9.2) based on a help frame.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EPCSARY | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-topic-help`

---

### `PSO ACTIVITY LOG`

| Property | Value |
|----------|-------|
| Tag | `ACT` |
| Routine | `PSOVCC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC allows retrieval of the Activity Log for a specific prescription  number (External) in the PRESCRIPTION (#52) file.   Return list of ACTIVITY transactions for a particular PRESCRIPTION  (#52)  file entry.  Each transaction will have the following fields (if populated in VistA):      activit

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-activity-log`

---

### `PSO CMOP LOG`

| Property | Value |
|----------|-------|
| Tag | `CMOP` |
| Routine | `PSOVCC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This RPC allows retrieval of the CMOP Log for a specific prescription  number   Each transaction will have the following fields:            dateShipped         #52.01    9          ndcReceived         #52.01    4          rxReference         #52.01    2          sequenceNumber      #52.01    1

**API Endpoint:** `GET /vista/psd/rpc/pso-cmop-log`

---

### `PSO COPAY LOG`

| Property | Value |
|----------|-------|
| Tag | `COPAY` |
| Routine | `PSOVCC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Return values from Copay Transaction log in PRESCRIPTION (#52) file.   Possible Return Values:   RESULTS(0) = -n^Error message   RESULTS(0) = 0^No Data   RESULTS(1) = Array of return values in JSON format:     copayActivityLog          #52.0107, .01   reason                    #52.0107, 1   initiato

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSOIEN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-copay-log`

---

### `PSO ECME LOG`

| Property | Value |
|----------|-------|
| Tag | `ECME` |
| Routine | `PSOVCC0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Return list of ECME transactions for a particular PRESCRIPTION (#52) file entry. Each transaction will have the following fields:   ecmeLogDate          #52.3, .01   reason               #52.3, .02    initiatorOfActivity  #52.3, .03   rxReference          #52.3, .04   comment              #52.3, .05

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PIEN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-ecme-log`

---

### `PSO ERX LOG`

| Property | Value |
|----------|-------|
| Tag | `ERX` |
| Routine | `PSOVCC0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Return list of ERX transactions for a particular PRESCRIPTION (#52) file entry. Each transaction will have the following fields:   eRxLogDate           #52.3, .01   reason               #52.3, .02    initiatorOfActivity  #52.3, .03   rxReference          #52.3, .04   comment              #52.3, .05

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PIEN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-erx-log`

---

### `PSO LABEL LOG`

| Property | Value |
|----------|-------|
| Tag | `LABEL` |
| Routine | `PSOVCC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Allow listing of Label Log (#52.032) subfile in the PRESCRIPTION (#52) file, given an external prescription number.   RETURN VARIABLES:           0^No data - there are no LABEL entries for this prescription"           -1^ Prescription Number is Required"         -2^ Prescription Number is not recogn

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PIEN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-label-log`

---

### `PSO LOT EXPIRATION`

| Property | Value |
|----------|-------|
| Tag | `LELF` |
| Routine | `PSOVCC0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Return list of LOT/EXP transactions for a particular PRESCRIPTION (#52)) file entry. Each Transaction will have the following fields:   expirationDate   #52.0401, 1   lotExp           #52.0401, .01   rxIndicator      #52.0401, 2

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PIEN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-lot-expiration`

---

### `PSO PARTIALS LOG`

| Property | Value |
|----------|-------|
| Tag | `PART` |
| Routine | `PSOVCC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC allows retrieval of the Partials Log for a specific prescription. Each transaction will have the following fields (if populated in VistA):                                                 loginDateTime                  #52.2, .08    partialDate                    #52.2, .01     qty

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PIEN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-partials-log`

---

### `PSO REFILL LOG`

| Property | Value |
|----------|-------|
| Tag | `RFIL` |
| Routine | `PSOVCC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC allows retrieval of the Refill Log for a specific prescription  number.   Return list of REFILL transactions for a particular PRESCRIPTION  (#52) file entry.   Each transaction will have the following fields (if populated in VistA):      loginDate                            #52.1, 7    refi

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PIEN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-refill-log`

---

### `PSO EPCS CRED`

| Property | Value |
|----------|-------|
| Tag | `LASTCRED` |
| Routine | `PSOEPED` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Return the last CREDENTIAL TYPE from SIGN-ON LOG file (#3.081) for user DUZ passed in.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUZ | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-cred`

---

### `PSO EPCS PSDRPH FILER`

| Property | Value |
|----------|-------|
| Tag | `PSDKEY` |
| Routine | `PSOEPUT2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** Allocates and deallocates the PSDRPH key to the specified user and logs  the event in the XUEPCS PSDRPH AUDIT (#8991.7) file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSOSUBJ | LITERAL | No |
| 2 | PSOACTOR | LITERAL | No |
| 3 | PSOACTION | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-epcs-psdrph-filer`

---

### `PSO ADDRESS UPDATE`

| Property | Value |
|----------|-------|
| Tag | `PSOVPADDR` |
| Routine | `PSOVCC0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |

**Description:** This RPC allows the address fields in the PATIENT (#2) file to be updated. It takes two parameters: the patient ICN and the temporary address fields that are to be updated.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSOVICN | LITERAL | No |
| 2 | PSOVADDR | REFERENCE | No |
| 3 | PSOVTYP | LITERAL | No |
| 4 | PSOVATYP | UNKNOWN() | No |

**API Endpoint:** `POST /vista/psd/rpc/pso-address-update`

---

### `PSO GET ADDRESS`

| Property | Value |
|----------|-------|
| Tag | `PSOVRETADDR` |
| Routine | `PSOVCC0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** get a patient address

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSOVATYP | LITERAL | No |
| 2 | PSOVICN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-get-address`

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

**API Endpoint:** `POST /vista/psd/rpc/pso-temp-address-active-flag`

---

### `PSO DEL TEMPORARY ADDRESS`

| Property | Value |
|----------|-------|
| Tag | `PSOVDELAD` |
| Routine | `PSOVCC0` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC deletes the patient's temporary address from the patient file

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSOVICN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/pso-del-temporary-address`

---

### `PSB SCANPT`

| Property | Value |
|----------|-------|
| Tag | `SCANPT` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC is used to validate the data scanned in at the scan patient  wristband prompt of the mnOpenPatient component.  The value passed in  is either the full SSN scanned in from the patient wristband -or- the  1U4N syntax of the patient lookup.  In either case the call must  return only one patien

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBDATA | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-scanpt`

---

### `PSB INSTRUCTOR`

| Property | Value |
|----------|-------|
| Tag | `INST` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Used by frmInstructor to validate that an instructor is at the client  with a student.  Validation is acheived via the instructor entering  their SSN and electronic signature code.  This is then validated  against the NEW PERSON file (#200).  If a valid user is obtained,  that user must posses the P

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBACC | LITERAL | No |
| 2 | PSBVER | UNKNOWN() | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-instructor`

---

### `PSB USERLOAD`

| Property | Value |
|----------|-------|
| Tag | `USRLOAD` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC is called at application startup to populate the BCMA_User  object with the users defaults.  No parameters are passed, the current  DUZ is assumed.

**API Endpoint:** `GET /vista/psd/rpc/psb-userload`

---

### `PSB USERSAVE`

| Property | Value |
|----------|-------|
| Tag | `USRSAVE` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 13 |

**Description:** Save the users current window settings for the next session.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBWIN | LITERAL | No |
| 2 | PSBVDL | LITERAL | No |
| 3 | PSBUDCW  | LITERAL | No |
| 4 | PSBPBCW | LITERAL | No |
| 5 | PSBIVCW | LITERAL | No |
| 6 | PSBDEV | LITERAL | No |
| 7 | PSBCSRT | LITERAL | No |
| 8 | PSBCV1 | LITERAL | No |
| 9 | PSBCV2 | LITERAL | No |
| 10 | PSBCV3 | LITERAL | No |
| 11 | PSBCV4 | LITERAL | No |
| 12 | PSBORMODE | LITERAL | No |
| 13 | PSBCLSRCH | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-usersave`

---

### `PSB FMDATE`

| Property | Value |
|----------|-------|
| Tag | `FMDATE` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Used to validate Fileman dates.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBVAL | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-fmdate`

---

### `PSB SCANMED`

| Property | Value |
|----------|-------|
| Tag | `SCANMED` |
| Routine | `PSBRPC2` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Description:** Takes the scanned valued from the medication and does a lookup on file  50 for an exact match.  If more than one or less than one entry are  found for the lookup an error is returned to the client.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SCANVAL | LITERAL | No |
| 2 | PSBDIEN | LITERAL | No |
| 3 | PSBTAB | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-scanmed`

---

### `PSB PARAMETER`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBPAR` |
| Return Type | ARRAY |
| Parameter Count | 5 |

**Description:** Called by client to return or set parameters

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBCMD | LITERAL | No |
| 2 | PSBENT | LITERAL | No |
| 3 | PSBPAR | LITERAL | No |
| 4 | PSBINS | LITERAL | No |
| 5 | PSBVAL | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-parameter`

---

### `PSB TRANSACTION`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBML` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** This is the filing RPC for all data returning from the client regarding the medication log.  Filing is handled by business rules on the server and this RPC will return either '1^Data Filed' or '-1^reason for not filing data' to the client.  Results of the  processed transaction is communicated via t

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBHDR | LITERAL | No |
| 2 | PSBREC | REFERENCE | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-transaction`

---

### `PSB VALIDATE ORDER`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `PSBVDLVL` |
| Return Type | ARRAY |
| Parameter Count | 11 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | PSBIEN | LITERAL | No |
| 3 | PSBTYPE | LITERAL | No |
| 4 | PSBADMIN | LITERAL | No |
| 5 | PSBTAB | LITERAL | No |
| 6 | PSBUID | LITERAL | No |
| 7 | PSBASTS | LITERAL | No |
| 8 | PSBORSTS | LITERAL | No |
| 9 | PSBRMV | UNKNOWN() | No |
| 10 | psbdien | UNKNOWN() | No |
| 11 | PSBRMVTM | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-validate-order`

---

### `PSB SERVER CLOCK VARIANCE`

| Property | Value |
|----------|-------|
| Tag | `CLOCK` |
| Routine | `PSBUTL` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Client date/time in external FileMan format. Returns the variance from the server to the client in minutes.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBX | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-server-clock-variance`

---

### `PSB MEDICATION HISTORY`

| Property | Value |
|----------|-------|
| Tag | `HISTORY` |
| Routine | `PSBMLHS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** Returns the history of a medication for a patient from the orderable item.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | PSBOI | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-medication-history`

---

### `PSB GETPRNS`

| Property | Value |
|----------|-------|
| Tag | `GETPRNS` |
| Routine | `PSBPRN` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** Returns all administrations of a PRN order that have NOT had the PRN Effectiveness documented in the current admission or within the hours  defined in PRN documentation site parameter whichever is greater of the  two.  When the PRN medication is administered a flag is set based on the  given PRN Rea

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | PSBORD | LITERAL | No |
| 3 | PSBSIOPI | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-getprns`

---

### `PSB REPORT`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBO` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 26 |

**Description:** Return the text for the specified report and the user has the option to  print the reports.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBTYPE | LITERAL | No |
| 2 | PSBDFN | LITERAL | No |
| 3 | PSBSTRT | LITERAL | No |
| 4 | PSBSTOP | LITERAL | No |
| 5 | PSBINCL | LITERAL | No |
| 6 | PSBDEV | LITERAL | No |
| 7 | PSBSORT | LITERAL | No |
| 8 | PSBOI | LITERAL | No |
| 9 | PSBWLOC | LITERAL | No |
| 10 | PSBWSORT | LITERAL | No |
| 11 | PSBFUT | LITERAL | No |
| 12 | PSBORDNUM | LITERAL | No |
| 13 | PSBLIST | REFERENCE | No |
| 14 | PSBRCRI | LITERAL | No |
| 15 | PSBORDNM | UNKNOWN() | No |
| 16 | PSBPST | LITERAL | No |
| 17 | PSBTR | LITERAL | No |
| 18 | PSBSIFIL | LITERAL | No |
| 19 | PSBCLINORD | LITERAL | No |
| 20 | PSB20 | LITERAL | No |
| 21 | PSB21 | LITERAL | No |
| 22 | PSB22 | LITERAL | No |
| 23 | PSB23 | LITERAL | No |
| 24 | PSB24 | LITERAL | No |
| 25 | PSBCLLIST | REFERENCE | No |
| 26 | PSBDIV | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-report`

---

### `PSB SUBMIT MISSING DOSE`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBMD` |
| Return Type | ARRAY |
| Parameter Count | 11 |

**Description:** Allows the client to submit a missing dose interactively.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBDFN | LITERAL | No |
| 2 | PSBDRUG | LITERAL | No |
| 3 | PSBDOSE | LITERAL | No |
| 4 | PSBRSN | LITERAL | No |
| 5 | PSBADMIN | LITERAL | No |
| 6 | PSBNEED | LITERAL | No |
| 7 | PSBUID | LITERAL | No |
| 8 | PSBON | LITERAL | No |
| 9 | PSBSCHD | LITERAL | No |
| 10 | PSBCLIN | LITERAL | No |
| 11 | PSBCLNIEN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-submit-missing-dose`

---

### `PSB VALIDATE ESIG`

| Property | Value |
|----------|-------|
| Tag | `ESIG` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Validate the data in PSBESIG against the user currently signed on (DUZ)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBESIG | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-validate-esig`

---

### `PSB LOCK`

| Property | Value |
|----------|-------|
| Tag | `LOCK` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** LOCKING NO LONGER USED AS OF PATCH 7.  INCLUDED FOR BACKWARD COMPATABILITY WITH GUI.  CALL WILL BE REMOVED IN PATCH 8.

**API Endpoint:** `POST /vista/psd/rpc/psb-lock`

---

### `PSB CHECK SERVER`

| Property | Value |
|----------|-------|
| Tag | `CHECK` |
| Routine | `PSBUTL` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Returns -1 or 1 when checking for patches and build on the server.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBWHAT | REFERENCE | No |
| 2 | PSBDATA | REFERENCE | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-check-server`

---

### `PSB MAIL`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBRPCXM` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** A call is made that allows the GUI to send its' own formatted mail message.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBCMD | LITERAL | No |
| 2 | PSBDATA | WORD-PROCESSING | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-mail`

---

### `PSB GETORDERTAB`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBVDLTB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** Gives the client VDL information for the specified patient and time frame.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | VDL TAB | LITERAL | No |
| 3 | VDL DATE | LITERAL | No |
| 4 | PSBSIOPI | LITERAL | No |
| 5 | PSBCLINORD | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-getordertab`

---

### `PSB WARDLIST`

| Property | Value |
|----------|-------|
| Tag | `WLIST` |
| Routine | `PSBPARIV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Returns a list of active wards that are available for the definition of IV parameters in the BCMA IV PARAMETERS file 53.66. Wards already in file 53.66 are returned with the type of IV PARAMETERS defined.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBEDIV | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-wardlist`

---

### `PSB GETIVPAR`

| Property | Value |
|----------|-------|
| Tag | `GETPAR` |
| Routine | `PSBPARIV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** Returns the IV parameters by IV type, as defined for a ward in file 53.66.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBWARD | LITERAL | No |
| 2 | PSBIVPT | LITERAL | No |
| 3 | PSBDIV | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-getivpar`

---

### `PSB DEVICE`

| Property | Value |
|----------|-------|
| Tag | `DEVICE` |
| Routine | `PSBRPC1` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Allows user to select a Printer from the GUI.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FROM | LITERAL | No |
| 2 | DIR | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-device`

---

### `PSB PUTIVPAR`

| Property | Value |
|----------|-------|
| Tag | `PUTPAR` |
| Routine | `PSBPARIV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** Sets 53.66 or parameters file w/input from 53.66 if ward is not "ALL"

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBWARD | LITERAL | No |
| 2 | PSBPARS | LITERAL | No |
| 3 | PSBDIV | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-putivpar`

---

### `PSB IV ORDER HISTORY`

| Property | Value |
|----------|-------|
| Tag | `GETOHIST` |
| Routine | `PSBRPC2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** Returns individual detailed bag history.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | PSBORD | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-iv-order-history`

---

### `PSB BAG DETAIL`

| Property | Value |
|----------|-------|
| Tag | `BAGDTL` |
| Routine | `PSBRPC2` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Returns a chronological detailed history on each specific IV bag that is selected.     [0] = -1^No History On File                [0] = Number of Nodes [1] = Action Date/Time^User ID^Action Status^Comments

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBUID | LITERAL | No |
| 2 | PSBORD | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-bag-detail`

---

### `PSB ALLERGY`

| Property | Value |
|----------|-------|
| Tag | `ALLR` |
| Routine | `PSBALL` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns a list of allergies for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 |  PATIENT ID | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-allergy`

---

### `PSB GETPROVIDER`

| Property | Value |
|----------|-------|
| Tag | `PROVLST` |
| Routine | `PSBRPCMO` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Used to get a list of active providers.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBIN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-getprovider`

---

### `PSB MOB DRUG LIST`

| Property | Value |
|----------|-------|
| Tag | `OILST` |
| Routine | `PSBRPCMO` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Used by the BCMA/CPRS Med Order Button to return an array of drug.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBSCAN | LITERAL | No |
| 2 | PSBOTYP | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-mob-drug-list`

---

### `PSB CPRS ORDER`

| Property | Value |
|----------|-------|
| Tag | `ORDER` |
| Routine | `PSBRPCMO` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** This RPC sets results of a Med Order Button transaction in a global for  Inpatient Pharmacy to pick up.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBHDR | LITERAL | No |
| 2 | PSBREC | REFERENCE | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-cprs-order`

---

### `PSB NURS WARDLIST`

| Property | Value |
|----------|-------|
| Tag | `NWLIST` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This will return a list of active ward from the NURS LOCATION, file 211.4.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | none | UNKNOWN() | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-nurs-wardlist`

---

### `PSB MAXDAYS`

| Property | Value |
|----------|-------|
| Tag | `MAX` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC returns the maximum number of days a user can view or print the  MAH report. This parameter is set using CPRS and is call ORRP BCMA MAH.

**API Endpoint:** `GET /vista/psd/rpc/psb-maxdays`

---

### `PSB VERSION CHECK`

| Property | Value |
|----------|-------|
| Tag | `GUICHK` |
| Routine | `PSBRPC3` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC is called at startup. No parameters are passed.

**API Endpoint:** `GET /vista/psd/rpc/psb-version-check`

---

### `PSB CHECK IV`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBCHKIV` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** RPC PSB CHECK IV - When given a patient's data file number(DFN), this  process will return infusing IV information pertaining to the given  DFN.  The information will be returned at the location presented by the "RESULTS" parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | ORDIV | REFERENCE | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-check-iv`

---

### `PSB VITALS`

| Property | Value |
|----------|-------|
| Tag | `VITALS` |
| Routine | `PSBRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Passes array of Vital entries - Temp,Pulse,Resp,BP,Pain in the last 7 days

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-vitals`

---

### `PSB VITAL MEAS FILE`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBVITFL` |
| Return Type | ARRAY |
| Parameter Count | 4 |

**Description:** This RPC has been built specifically to process the filing of BCMA  Pain Score data. The processing of other VITAL type may be incorporated  with some adjustments.       This routine is to service BCMA 3.0 functionality and store VITALs'   data into the VITAL MEASUREMENT FILE - ^GMR(120.5  using the

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBDFN | LITERAL | No |
| 2 | PSBRATE | LITERAL | No |
| 3 | PSBVTYPE | LITERAL | No |
| 4 | PSBDTTKN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-vital-meas-file`

---

### `PSB MED LOG LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBMLLKU` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** BCMA Medication Log Look Up Remote Procedures.   This routine is a conglomerate of  Medication Log lookup functionality per the BCMA Graphical User Interface software.   Input:  PSBREC (array)         PSBREC (0)     determine  "lookup" function                        "PTLKUP" (patient file (#2) look

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBREC | REFERENCE | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-med-log-lookup`

---

### `PSB COVERSHEET1`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBCSUTL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |

**Description:** (modified 05/08/2007)   PSB COVERSHEET1 is to return order data per patient and construction of  BCMA Coversheet view as presented by the BCMA-HSC Coversheet Phase II SRS and SDD documentation.   INPUT:  communications area -  ""          patient's DFN       -  DFN     (patient ptr.)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | HRSBACK | LITERAL | No |
| 3 | PSBSIOPI | LITERAL | No |
| 4 | PSBCLINORD | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-coversheet1`

---

### `PSB UTL XSTATUS SRCH`

| Property | Value |
|----------|-------|
| Tag | `FNDACTV` |
| Routine | `PSBVDLU3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** RESULTS(0)=returned line count RESULTS(1)=patients location during activity RESULTS(2)=medication^ordernumber RESULTS(3)= action fileman date&time RESULTS(4)= scheduled administration fileman date&time

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMS | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-utl-xstatus-srch`

---

### `PSB MAN SCAN FAILURE`

| Property | Value |
|----------|-------|
| Tag | `SCANFAIL` |
| Routine | `PSBVDLU3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** SCANFAIL(RESULTS,PSBPARAM)      ;  TEJ 05/12/2006  BCMA-Managing Scanning Failures (MSF)         ;       Process Scanning Failures         ;               Parameters:         ;               Input (via GUI):         ;        Per Wristband  (0)      -       Pat IEN ^ ^ Failure Reason ^ User's Comment

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBPARAM | REFERENCE | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-man-scan-failure`

---

### `PSB GETINJECTIONSITE`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `PSBINJEC` |
| Return Type | ARRAY |
| Parameter Count | 4 |

**Description:** Get the last nn injections site info from the BCMA MEDICATION LOG file  #53.9.   Get only of specific Orderable Items per patient in reverse chronology date/time order or All Orderable Items per patient in  reverse chronology date/time order.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | TIME | LITERAL | No |
| 3 | MAX | LITERAL | No |
| 4 | PSBOI | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-getinjectionsite`

---

### `PSB WITNESS`

| Property | Value |
|----------|-------|
| Tag | `WITNESS` |
| Routine | `PSBRPC1` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Used by frmWintess to validate if a Witness at the client is authorized  to be a witness for a BCMA action, i.e. High Risk Drug administration.   Validation is achieved via not allowing the logged in person to witness  for themselves, also persons that hold certain keys can't be a valid  witness.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSBACC | LITERAL | No |
| 2 | PSBVER | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-witness`

---

### `PSB CLINICLIST`

| Property | Value |
|----------|-------|
| Tag | `GETLIST` |
| Routine | `PSBRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** Returns Active Clinic names based on Search criteria.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PREFIX | LITERAL | No |
| 2 | CONTAINS | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-cliniclist`

---

### `PSB MEDS ON PATIENT`

| Property | Value |
|----------|-------|
| Tag | `MEDSONPT` |
| Routine | `PSBRPC1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC returns indicators if medications are still on a patient.  The  patient's DFN will be passed in and a RESULTS array returned with three  flags set.  Flags set to 1 for meds are on patient or 0 none per this category.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-meds-on-patient`

---

### `PSB GETSETWP`

| Property | Value |
|----------|-------|
| Tag | `MDRPC` |
| Routine | `PSBPAR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This RPC allows the GUI to add and update body site locations graphically  by sending the coordinates of the loction on the body and storing these using word processing free form text type field.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTION | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psb-getsetwp`

---

### `PSN FDA MED GUIDE PRINT QUEUE`

| Property | Value |
|----------|-------|
| Tag | `RETRIEVE` |
| Routine | `PSNFDAMG` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This Remote Proceedure Call is used by a Java Client to print FDA Medication Guides for the National Drug File (NDF) application.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | AIP | LITERAL | No |

**API Endpoint:** `GET /vista/psd/rpc/psn-fda-med-guide-print-queue`

---

### `PSA UPLOAD`

| Property | Value |
|----------|-------|
| Tag | `PSAUPLD` |
| Routine | `PSABRKU1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This is the primary entry point for the Drug Accountability Upload GUI.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TMP | REFERENCE | No |

**API Endpoint:** `GET /vista/psd/rpc/psa-upload`

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

### Menu

| Name | Security Key |
|------|-------------|
| PSD MGR | PSDMGR |
| PSD SETUP | — |
| PSD PRINT SETUP LISTS | — |
| PSD MENU | — |
| PSD TRANSFER MENU | PSD TRAN |
| PSD MGR REPORTS | — |
| PSD TRANSACTION MENU | — |
| PSD PRODUCTION REPORTS | — |
| PSD NURSE MENU | — |
| PSD PHARM TECH | — |
| PSD DISPENSING MENU | — |
| PSD REPRINT MENU | — |
| PSD RECEIPTS MENU | — |
| PSD CORRECTION LOG | — |
| PSD ENTER/EDIT MENU | — |
| PSD INFUSION MENU | — |
| PSD DESTROY MENU | — |
| PSD NURSE TRANS GS MENU | — |
| PSD INSPECTOR MENU | — |
| PSD IRL INV MENU | — |
| PSD IRL INSP MENU | — |
| PSD NURSE DISP MENU | — |
| PSD NURSE SUPR MENU | — |
| PSD NURSE ORDER MENU | — |
| PSD NURSE GS MENU | — |
| PSD NM MENU | — |

### Run routine

| Name | Security Key |
|------|-------------|
| PSD DRUG LOC EDIT | — |
| PSD NAOU EDIT | PSD PARAM |
| PSD STOCK DRUG EDIT | — |
| PSD DRUG LOC PRINT | — |
| PSD SITE | PSD PARAM |
| PSD MFG/LOT/EXP DATE EDIT | — |
| PSD INVEN TYPE EDIT | — |
| PSD INVEN TYPE PRINT | — |
| PSD INACTIVATE NAOU | — |
| PSD MARK | — |
| PSD INACTIVATE NAOU STOCK DRUG | — |
| PSD WARD CONVERSION | — |
| PSD NAOU PRINT | — |
| PSD WARD ADD/DEL | — |
| PSD NAOU INV GROUP EDIT | — |
| PSD DEA LIST | — |
| PSD DRUG FILE DATA | — |
| PSD STOCK PRINT | — |
| PSD STOCK LIST | — |
| PSD NAOU INV GROUP SORT | — |
| PSD NAOU INV GROUP PRINT | — |
| PSD NARC EDIT | — |
| PSD TRANSFER NAOU | — |
| PSD TRANSFER AOU | — |
| PSD MFG REPORT PRINT | — |
| PSD DRUG CHECK | — |
| PSD INVEN SHEET PRT | — |
| PSD ON-HAND | — |
| PSD ORDER ENTRY | — |
| PSD REC GS | — |
| PSD WORKSHEET PRINT | — |
| PSD WORKSHEET DISPENSING | — |
| PSD PRINT 2321 | — |
| PSD PRINT PHARM DISP | — |
| PSD PRINT INSPECTOR LOG | — |
| PSD REPRINT 2321 | — |
| PSD READY GS FOR PICKUP | — |
| PSD PRINT GS PICKUP | — |
| PSD PEND NAOU ORDERS | — |
| PSD PEND VAULT ORDERS | — |
| PSD PRINT 2638 | — |
| PSD REPRINT 2638 | — |
| PSD DISPENSE W/O GS | — |
| PSD PICKUP GS | — |
| PSD NOT DELIVERED | — |
| PSD COMPLETE GS | — |
| PSD NURSE SHIFT LOG | — |
| PSD PURGE | — |
| PSD BALANCE INITIALIZE | — |
| PSD OUTPATIENT | — |
| PSD EDIT/CANC VER ORD | — |
| PSD EXISTING GS | — |
| PSD DESTRUCTION HOLDING | — |
| PSD DESTROY DRUGS | PSDMGR |
| PSD EDIT/CANC VER ORD RPT | — |
| PSD DAILY LOG | — |
| PSD GS HISTORY | — |
| PSD RECEIVING | — |
| PSD PURCHASE ORDER REVIEW | — |
| PSD CP TRANSACTION REVIEW | — |
| PSD DRUG RECEIPT HISTORY | — |
| PSD BALANCE ADJUSTMENTS | PSDMGR |
| PSD NURSE TRANSFER GS | — |
| PSD NURSE REC TRANSFER GS | — |
| PSD EXP REPORT | — |
| PSD GS TRANSFER (NAOU) REPORT | — |
| PSD GS TRANS NOT RECD (NAOU) | — |
| PSD PV INVOICE REVIEW | — |
| PSD GS DISCREPANCY REPORT | — |
| PSD CORRECTION LOG REPORT | — |
| PSD NURSE REPRINT 2321 | — |
| PSD NAOU USAGE | — |
| PSD REPRINT WORKSHEET | — |
| PSD STOCK UNIT LIST | — |
| PSD TRANSFER VAULT DRUGS | — |
| PSD PRINT VAULT TRANSFERS | — |
| PSD CORRECT STATUS | — |
| PSD CORRECT EXISTING GS | — |
| PSD DESTROY DEA41 | — |
| PSD DEST DRUGS REPORT | — |
| PSD CORRECT GS STATUS | — |
| PSD INFUSION O/E | — |
| PSD AMIS | — |
| PSD GS LISTING | — |
| PSD LABEL VAULT | — |
| PSD LABEL DRUG/NUMBER | — |
| PSD IRL INSPECTOR INV | — |
| PSD IRL VAULT INV | — |
| PSD LABEL PHARM | PSDMGR |
| PSD PRT GS PICKED UP | — |
| PSD DEST NON-CS DRUG | — |
| PSD DEST TEXT DRUG | — |
| PSD ERR/ADJ PENDING REPORT | PSD ERROR |
| PSD ERR/ADJ RESOLVED REPORT | PSD ERROR |
| PSD COST REPORTS | — |
| PSD INSP PLACE HOLD | — |
| PSD INSP REMOVE HOLD | — |
| PSD PRT GS INSP HOLD | — |
| PSD LABEL INSP | — |
| PSD ERR/ADJ EDIT | PSD ERROR |
| PSD BALANCE ADJUSTMENT REVIEW | — |
| PSD REPRINT LABEL | — |
| PSD INSP LOG BY RECD DATE | — |
| PSD IRL INV DATA | — |
| PSD IRL INSP DATA | — |
| PSD RX DISPENSING REPORT | — |
| PSD EMERGENCY ORDER REPORT | — |
| PSD NURSE PRIORITY ORDER CHECK | — |
| PSD NURSE HELP | — |
| PSD ON-HAND TECH | PSD TECH |
| PSD DAILY LOG TECH | PSD TECH |
| PSD PRINT VAULT TRANSFERS TECH | PSD TECH |
| PSD NOT DELIVERED NURSE | PSJ RNURSE |
| PSD NURSE DISPENSING | — |
| PSD PAT ID LIST | — |
| PSD NAOU BAL INITIAL | — |
| PSD NURSE DISP REPORT | — |
| PSD NAOU ADJ | — |
| PSD PAT INQUIRY | — |
| PSD DISPENSE TO NDES | — |
| PSD NAOU BALANCE REPORT | — |
| PSD NURSE WASTE | — |
| PSD NURSE NOT GIVEN | — |
| PSD NURSE INFUSION | — |
| PSD NURSE DEFECTIVE DOSE | — |
| PSD NURSE ONLINE COUNT | — |
| PSD NURSE DELAYED DISPENSE | — |
| PSD DIGITALLY SIGNED ORDERS | — |
| PSD DIG. SIGNED RELEASED RX | — |
| PSD GS TRANS PCA/INF PATIENT | — |
| PSD GS REC PCA/INF FOR PATIENT | — |
| PSD CS PRESCRIPTIONS REPORT | — |
| PSD DEA SUBOXONE | — |

### Action

| Name | Security Key |
|------|-------------|
| PSD NM RX REPRINT | — |
| PSD NM RX PARTIAL | — |
| PSD NM CS ADJ | — |
| PSD NM RX SAME PERSON | — |
| PSD NM RX WITHOUT VA | — |
| PSD NM SECURITY KEY | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `PSDMGR`
- `PSD PARAM`
- `PSD TRAN`
- `PSD ERROR`
- `PSD TECH`
- `PSJ RNURSE`

## API Route Summary

All routes are prefixed with `/vista/psd/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/psd/rpc/psoerxa0-drgmtch` | PSOERXA0 DRGMTCH | SINGLE VALUE |
| GET | `/vista/psd/rpc/psoerxa0-prvmtch` | PSOERXA0 PRVMTCH | SINGLE VALUE |
| GET | `/vista/psd/rpc/psoerxa1-incerx` | PSOERXA1 INCERX | SINGLE VALUE |
| GET | `/vista/psd/rpc/psoerxi1-incerx` | PSOERXI1 INCERX | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-vcc-refill` | PSO VCC REFILL | ARRAY |
| GET | `/vista/psd/rpc/psorpc` | PSORPC | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/pso-epcs-edit` | PSO EPCS EDIT | SINGLE VALUE |
| POST | `/vista/psd/rpc/pso-epcs-add-dea` | PSO EPCS ADD DEA | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-epcs-deadoj` | PSO EPCS DEADOJ | ARRAY |
| GET | `/vista/psd/rpc/pso-epcs-mbm` | PSO EPCS MBM | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-epcs-remove-dea` | PSO EPCS REMOVE DEA | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-epcs-dea-dup-check` | PSO EPCS DEA DUP CHECK | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-epcs-dealist` | PSO EPCS DEALIST | ARRAY |
| GET | `/vista/psd/rpc/pso-epcs-version` | PSO EPCS VERSION | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-epcs-detox-check` | PSO EPCS DETOX CHECK | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-epcs-va#-dup-check` | PSO EPCS VA# DUP CHECK | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-epcs-filer` | PSO EPCS FILER | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-epcs-reports` | PSO EPCS REPORTS | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/pso-epcs-system-date-time` | PSO EPCS SYSTEM DATE TIME | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-epcs-field-help` | PSO EPCS FIELD HELP | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-epcs-get-list` | PSO EPCS GET LIST | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/pso-epcs-list-np-sched` | PSO EPCS LIST NP SCHED | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-epcs-file-np-sched` | PSO EPCS FILE NP SCHED | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-epcs-list-optn-desc` | PSO EPCS LIST OPTN DESC | ARRAY |
| GET | `/vista/psd/rpc/pso-epcs-topic-help` | PSO EPCS TOPIC HELP | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/pso-activity-log` | PSO ACTIVITY LOG | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-cmop-log` | PSO CMOP LOG | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-copay-log` | PSO COPAY LOG | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-ecme-log` | PSO ECME LOG | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-erx-log` | PSO ERX LOG | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-label-log` | PSO LABEL LOG | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-lot-expiration` | PSO LOT EXPIRATION | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-partials-log` | PSO PARTIALS LOG | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-refill-log` | PSO REFILL LOG | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-epcs-cred` | PSO EPCS CRED | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-epcs-psdrph-filer` | PSO EPCS PSDRPH FILER | SINGLE VALUE |
| POST | `/vista/psd/rpc/pso-address-update` | PSO ADDRESS UPDATE | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-get-address` | PSO GET ADDRESS | SINGLE VALUE |
| POST | `/vista/psd/rpc/pso-temp-address-active-flag` | PSO TEMP ADDRESS ACTIVE FLAG | SINGLE VALUE |
| GET | `/vista/psd/rpc/pso-del-temporary-address` | PSO DEL TEMPORARY ADDRESS | SINGLE VALUE |
| GET | `/vista/psd/rpc/psb-scanpt` | PSB SCANPT | ARRAY |
| GET | `/vista/psd/rpc/psb-instructor` | PSB INSTRUCTOR | ARRAY |
| GET | `/vista/psd/rpc/psb-userload` | PSB USERLOAD | ARRAY |
| GET | `/vista/psd/rpc/psb-usersave` | PSB USERSAVE | ARRAY |
| GET | `/vista/psd/rpc/psb-fmdate` | PSB FMDATE | ARRAY |
| GET | `/vista/psd/rpc/psb-scanmed` | PSB SCANMED | ARRAY |
| GET | `/vista/psd/rpc/psb-parameter` | PSB PARAMETER | ARRAY |
| GET | `/vista/psd/rpc/psb-transaction` | PSB TRANSACTION | ARRAY |
| GET | `/vista/psd/rpc/psb-validate-order` | PSB VALIDATE ORDER | ARRAY |
| GET | `/vista/psd/rpc/psb-server-clock-variance` | PSB SERVER CLOCK VARIANCE | ARRAY |
| GET | `/vista/psd/rpc/psb-medication-history` | PSB MEDICATION HISTORY | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/psb-getprns` | PSB GETPRNS | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/psb-report` | PSB REPORT | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/psb-submit-missing-dose` | PSB SUBMIT MISSING DOSE | ARRAY |
| GET | `/vista/psd/rpc/psb-validate-esig` | PSB VALIDATE ESIG | ARRAY |
| POST | `/vista/psd/rpc/psb-lock` | PSB LOCK | ARRAY |
| GET | `/vista/psd/rpc/psb-check-server` | PSB CHECK SERVER | ARRAY |
| GET | `/vista/psd/rpc/psb-mail` | PSB MAIL | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/psb-getordertab` | PSB GETORDERTAB | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/psb-wardlist` | PSB WARDLIST | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/psb-getivpar` | PSB GETIVPAR | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/psb-device` | PSB DEVICE | ARRAY |
| GET | `/vista/psd/rpc/psb-putivpar` | PSB PUTIVPAR | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/psb-iv-order-history` | PSB IV ORDER HISTORY | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/psb-bag-detail` | PSB BAG DETAIL | ARRAY |
| GET | `/vista/psd/rpc/psb-allergy` | PSB ALLERGY | ARRAY |
| GET | `/vista/psd/rpc/psb-getprovider` | PSB GETPROVIDER | ARRAY |
| GET | `/vista/psd/rpc/psb-mob-drug-list` | PSB MOB DRUG LIST | ARRAY |
| GET | `/vista/psd/rpc/psb-cprs-order` | PSB CPRS ORDER | ARRAY |
| GET | `/vista/psd/rpc/psb-nurs-wardlist` | PSB NURS WARDLIST | ARRAY |
| GET | `/vista/psd/rpc/psb-maxdays` | PSB MAXDAYS | ARRAY |
| GET | `/vista/psd/rpc/psb-version-check` | PSB VERSION CHECK | ARRAY |
| GET | `/vista/psd/rpc/psb-check-iv` | PSB CHECK IV | ARRAY |
| GET | `/vista/psd/rpc/psb-vitals` | PSB VITALS | ARRAY |
| GET | `/vista/psd/rpc/psb-vital-meas-file` | PSB VITAL MEAS FILE | ARRAY |
| GET | `/vista/psd/rpc/psb-med-log-lookup` | PSB MED LOG LOOKUP | ARRAY |
| GET | `/vista/psd/rpc/psb-coversheet1` | PSB COVERSHEET1 | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/psb-utl-xstatus-srch` | PSB UTL XSTATUS SRCH | ARRAY |
| GET | `/vista/psd/rpc/psb-man-scan-failure` | PSB MAN SCAN FAILURE | ARRAY |
| GET | `/vista/psd/rpc/psb-getinjectionsite` | PSB GETINJECTIONSITE | ARRAY |
| GET | `/vista/psd/rpc/psb-witness` | PSB WITNESS | ARRAY |
| GET | `/vista/psd/rpc/psb-cliniclist` | PSB CLINICLIST | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/psb-meds-on-patient` | PSB MEDS ON PATIENT | ARRAY |
| GET | `/vista/psd/rpc/psb-getsetwp` | PSB GETSETWP | GLOBAL ARRAY |
| GET | `/vista/psd/rpc/psn-fda-med-guide-print-queue` | PSN FDA MED GUIDE PRINT QUEUE | ARRAY |
| GET | `/vista/psd/rpc/psa-upload` | PSA UPLOAD | ARRAY |
