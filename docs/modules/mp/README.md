# MP (MP)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `MP` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 26 |
| Menu Options | 0 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `MPIF REMOTE LOCAL ICN ASSIGN`

| Property | Value |
|----------|-------|
| Tag | `LOCALIA` |
| Routine | `MPIFFULL` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC is to support assignment of local ICNs to the next X number of  patients that don't have an ICN already and aren't a merged record (-9  node).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HOWM | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/mpif-remote-local-icn-assign`

---

### `MPIF REMOTE FULL ICN STATS`

| Property | Value |
|----------|-------|
| Tag | `STATS` |
| Routine | `MPIFFULL` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC will return the counts for National ICNs, Local ICNs, Merged  records (-9 nodes), no ICNs, last run for remote ICN assignment and if  full enumeration has completed.

**API Endpoint:** `GET /vista/mp/rpc/mpif-remote-full-icn-stats`

---

### `MPIF CHANGE CMOR`

| Property | Value |
|----------|-------|
| Tag | `RCCMOR` |
| Routine | `MPIFRPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call (RPC) allows the changing/updating of the  COORDINATING MASTER OF RECORD (#991.03) field in the PATIENT (#2) file  for a specific patient. An A08 Update message can also be triggered.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICN | LITERAL | No |
| 2 | CMOR | LITERAL | No |
| 3 | SSN | LITERAL | No |
| 4 | A08 | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/mpif-change-cmor`

---

### `MPIF SSN DUPS`

| Property | Value |
|----------|-------|
| Tag | `TOSITE` |
| Routine | `MPIFDUPS` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will be used by the data management teams' stat report to search for multiple SSNs with differnt ICNs from the same site.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARRAY | REFERENCE | No |

**API Endpoint:** `GET /vista/mp/rpc/mpif-ssn-dups`

---

### `MPIF ICN STATS`

| Property | Value |
|----------|-------|
| Tag | `ICNSTAT` |
| Routine | `MPIFRPC` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** RPC to return ICN, Exceptions pending, CMOR, CMOR History, ICN History  for any given ICN

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICN | LITERAL | No |
| 2 | SSN | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/mpif-icn-stats`

---

### `MPIF EXT PDAT REMOTE`

| Property | Value |
|----------|-------|
| Tag | `PATINFO` |
| Routine | `MPIFEXT2` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Extended PDAT call remote.  ICN or SSN can be passed.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICN | LITERAL | No |
| 2 | SSN | LITERAL | No |
| 3 | RPC | LITERAL | No |
| 4 | EXIST | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/mpif-ext-pdat-remote`

---

### `MPIF INACTIVATE`

| Property | Value |
|----------|-------|
| Tag | `INACT` |
| Routine | `MPIFRPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This remote procedure call (RPC) allows the remote inactivation of a  patient from the MPI at a specific site.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICN | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/mpif-inactivate`

---

### `MPIF REMOTE SPI`

| Property | Value |
|----------|-------|
| Tag | `SPI` |
| Routine | `MPIFRPC2` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** This remote procedure call (RPC) allows the remote sending of a specific  patient at a specific site to the MPI for ICN assignment.  The patient is  found based upon social security number.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SSN | LITERAL | No |
| 2 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/mpif-remote-spi`

---

### `MPIF REMOTE ICN UPDATE`

| Property | Value |
|----------|-------|
| Tag | `UPDATE` |
| Routine | `MPIFRPC2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 5 |

**Description:** This remote procedure call (RPC) allows the remote update of the  INTEGRATION CONTROL NUMBER (#991.01), ICN CHECKSUM (#991.02), and  COORDINATING MASTER OF RECORD (#991.03) fields in the PATIENT (#2) file  at a specified site. The patient is found based upon social security  number.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SSN | LITERAL | No |
| 2 | ICN | LITERAL | No |
| 3 | CHECK | LITERAL | No |
| 4 | CMOR | LITERAL | No |
| 5 | A08 | LITERAL | No |

**API Endpoint:** `POST /vista/mp/rpc/mpif-remote-icn-update`

---

### `MPIF ACK CHECK`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `MPIFACHK` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC will check to see if there are any messages on the sites before  date BEFORE that haven't received the application level ack back.  If so,  regenerate that message to the MPI.     If a message is generated 1 will be returned, otherwise 0.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BEFORE | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/mpif-ack-check`

---

### `MPIF SEEDING UPDATE`

| Property | Value |
|----------|-------|
| Tag | `SET` |
| Routine | `MPIFSEED` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Setting number of entries to be sent during seeding.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NUMBER | LITERAL | No |

**API Endpoint:** `POST /vista/mp/rpc/mpif-seeding-update`

---

### `MPIF SEEDING STATS`

| Property | Value |
|----------|-------|
| Tag | `STATS` |
| Routine | `MPIFSEED` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC will return the stats on the seeding process, including when the  next seeding job is scheduled to run

**API Endpoint:** `GET /vista/mp/rpc/mpif-seeding-stats`

---

### `MPIF CMOR PUSH REMOTE`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `MPIFRCMP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call (RPC) allows the DQ team to remotely create a  change of CMOR push.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICN | LITERAL | No |
| 2 | NCMOR | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/mpif-cmor-push-remote`

---

### `MPIF REMOTE PRIMARY DFN ICN`

| Property | Value |
|----------|-------|
| Tag | `PRIMARY` |
| Routine | `MPIFRPC3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call will return the primary DFN and ICN for a particular station and DFN.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SITE | LITERAL | No |
| 2 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/mpif-remote-primary-dfn-icn`

---

### `RG PRIMARY VIEW REJECT`

| Property | Value |
|----------|-------|
| Tag | `PVREJ` |
| Routine | `MPIRPC` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call will return the Primary View Reject report for  a particular station, ICN, and date range.  The date range will be from  the date of the exception to the current date.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SITE | LITERAL | No |
| 2 | ICN | LITERAL | No |
| 3 | EXCEPTION DATE | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/rg-primary-view-reject`

---

### `RG PRIMARY VIEW FROM MPI`

| Property | Value |
|----------|-------|
| Tag | `MPIPV` |
| Routine | `MPIRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call will return the MPI Patient Data Inquiry [MPI  DATA MGT PDAT MPI] (PDAT) report for a requested ICN.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICN | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/rg-primary-view-from-mpi`

---

### `MPIF DNL ADD UPD`

| Property | Value |
|----------|-------|
| Tag | `DNLADD` |
| Routine | `MPIRPC` |
| Return Type | ARRAY |
| Parameter Count | 10 |
| Status | Inactive (may still be callable) |

**Description:** This RPC has been established to allow the remote creation of records  into the MPI DO NOT LINK (#985.26) file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SOURCEID | LITERAL | No |
| 2 | DNLSOURCEID | LITERAL | No |
| 3 | DNLIDENTIFIEDBY | LITERAL | No |
| 4 | DNLEVENT | LITERAL | No |
| 5 | DNLSOURCEID | LITERAL | No |
| 6 | INACT | LITERAL | No |
| 7 | DNLIDENTIFIEDBY | LITERAL | No |
| 8 | DNLEVENT | LITERAL | No |
| 9 | DNLIDENTIFYINGLOCATION | LITERAL | No |
| 10 | INACT | LITERAL | No |

**API Endpoint:** `POST /vista/mp/rpc/mpif-dnl-add-upd`

---

### `MPIF EDAT REMOTE`

| Property | Value |
|----------|-------|
| Tag | `MPIEDAT` |
| Routine | `MPIRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** MPI Extended Patient data inquiry for Display Only Query. ICN needs to be  passed in.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICN | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/mpif-edat-remote`

---

### `MPI EVENT LIST`

| Property | Value |
|----------|-------|
| Tag | `LINKDATA` |
| Routine | `MPIRPC` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to return the list of all LINK and DO NOT LINK records  associated with the ICN list passed as input.  The DO NOT LINK list will  be derived from the records in the MPI DO NOT LINK file (#985.28) and  pulled using the GET^MPIDNL API. The LINK list will be built from PRIMARY ICN valu

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SOURCEID | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/mpi-event-list`

---

### `MPI TK POC USER SETUP`

| Property | Value |
|----------|-------|
| Tag | `TKPOC` |
| Routine | `MPIRPC12` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call (RPC) is invoked when a VistA user uses the  option MPIF TK POC USER SETUP to confirm their traits and establish a TK  POC record on the MPI in the New Person file (#200).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/mpi-tk-poc-user-setup`

---

### `MPIF GET VHIC/CAC CARD DATA`

| Property | Value |
|----------|-------|
| Tag | `GETCARD` |
| Routine | `MPIFRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** RPC to look up all VHIC/CAC swipe/scan activity at the site for all days prior to today.

**API Endpoint:** `GET /vista/mp/rpc/mpif-get-vhic/cac-card-data`

---

### `MPIF PURGE VHIC/CAC CARD DATA`

| Property | Value |
|----------|-------|
| Tag | `PURGCARD` |
| Routine | `MPIFRPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This RPC will purge data used to track VHIC/CAC card usage for all prior dates.

**API Endpoint:** `GET /vista/mp/rpc/mpif-purge-vhic/cac-card-data`

---

### `MPIF DOD ACTIVITY CHECK`

| Property | Value |
|----------|-------|
| Tag | `SITECK` |
| Routine | `MPIFDODC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will be called by the MPI to look for activity of the given patient.  It will search multiple packages to verify there has been no activity since a reported date of death as a conformation.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | MPIDOD | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/mpif-dod-activity-check`

---

### `MPIF UPDATE NAME COMP FLAG`

| Property | Value |
|----------|-------|
| Tag | `UPDFLAG` |
| Routine | `MPIFNAMC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure updates or retrieves the Name Components flag in VistA, which controls how names passed in HL7 ADT-A31 messages to VistA are processed.   If the flag is set to 0 or null, then the component parts of the name that are passed in the HL7 message are used to build a name, possibly

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FLAG | LITERAL | No |
| 2 | VALUE | LITERAL | No |

**API Endpoint:** `POST /vista/mp/rpc/mpif-update-name-comp-flag`

---

### `MPI RETURN PRIMARY VIEW DATA`

| Property | Value |
|----------|-------|
| Tag | `PVDATA` |
| Routine | `MPIRPC1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure Call will return Primary View data (File #985) for   a specified ICN.        Example: S ICN=1234567890V123456                 S SCORE=1 ;(optional)                 D PVDATA^MPIRPC1(.RET,ICN,SCORE)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICN | LITERAL | No |
| 2 | SCORE | LITERAL | No |

**API Endpoint:** `GET /vista/mp/rpc/mpi-return-primary-view-data`

---

### `MPI IFC VISTA ADD PATIENT`

| Property | Value |
|----------|-------|
| Tag | `ADD` |
| Routine | `MPIPRSAD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC is called by VistA utility code to support IFC to create patient  at VistA. If ICN is passed in and it it exist at MPI, it will call remote  RPC to create new patient at VistA using Primary View data. If EDIPI is  passed in and if it exist at MPI, it will use its associated ICN to  create n

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SRCID | LITERAL | No |
| 2 | SITE | LITERAL | No |

**API Endpoint:** `POST /vista/mp/rpc/mpi-ifc-vista-add-patient`

---


## Menu Options

No menu options found for this package namespace.

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/mp/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/mp/rpc/mpif-remote-local-icn-assign` | MPIF REMOTE LOCAL ICN ASSIGN | ARRAY |
| GET | `/vista/mp/rpc/mpif-remote-full-icn-stats` | MPIF REMOTE FULL ICN STATS | ARRAY |
| GET | `/vista/mp/rpc/mpif-change-cmor` | MPIF CHANGE CMOR | SINGLE VALUE |
| GET | `/vista/mp/rpc/mpif-ssn-dups` | MPIF SSN DUPS | SINGLE VALUE |
| GET | `/vista/mp/rpc/mpif-icn-stats` | MPIF ICN STATS | ARRAY |
| GET | `/vista/mp/rpc/mpif-ext-pdat-remote` | MPIF EXT PDAT REMOTE | ARRAY |
| GET | `/vista/mp/rpc/mpif-inactivate` | MPIF INACTIVATE | SINGLE VALUE |
| GET | `/vista/mp/rpc/mpif-remote-spi` | MPIF REMOTE SPI | ARRAY |
| POST | `/vista/mp/rpc/mpif-remote-icn-update` | MPIF REMOTE ICN UPDATE | SINGLE VALUE |
| GET | `/vista/mp/rpc/mpif-ack-check` | MPIF ACK CHECK | SINGLE VALUE |
| POST | `/vista/mp/rpc/mpif-seeding-update` | MPIF SEEDING UPDATE | SINGLE VALUE |
| GET | `/vista/mp/rpc/mpif-seeding-stats` | MPIF SEEDING STATS | ARRAY |
| GET | `/vista/mp/rpc/mpif-cmor-push-remote` | MPIF CMOR PUSH REMOTE | SINGLE VALUE |
| GET | `/vista/mp/rpc/mpif-remote-primary-dfn-icn` | MPIF REMOTE PRIMARY DFN ICN | SINGLE VALUE |
| GET | `/vista/mp/rpc/rg-primary-view-reject` | RG PRIMARY VIEW REJECT | ARRAY |
| GET | `/vista/mp/rpc/rg-primary-view-from-mpi` | RG PRIMARY VIEW FROM MPI | ARRAY |
| POST | `/vista/mp/rpc/mpif-dnl-add-upd` | MPIF DNL ADD UPD | ARRAY |
| GET | `/vista/mp/rpc/mpif-edat-remote` | MPIF EDAT REMOTE | ARRAY |
| GET | `/vista/mp/rpc/mpi-event-list` | MPI EVENT LIST | ARRAY |
| GET | `/vista/mp/rpc/mpi-tk-poc-user-setup` | MPI TK POC USER SETUP | SINGLE VALUE |
| GET | `/vista/mp/rpc/mpif-get-vhic/cac-card-data` | MPIF GET VHIC/CAC CARD DATA | GLOBAL ARRAY |
| GET | `/vista/mp/rpc/mpif-purge-vhic/cac-card-data` | MPIF PURGE VHIC/CAC CARD DATA | SINGLE VALUE |
| GET | `/vista/mp/rpc/mpif-dod-activity-check` | MPIF DOD ACTIVITY CHECK | SINGLE VALUE |
| POST | `/vista/mp/rpc/mpif-update-name-comp-flag` | MPIF UPDATE NAME COMP FLAG | SINGLE VALUE |
| GET | `/vista/mp/rpc/mpi-return-primary-view-data` | MPI RETURN PRIMARY VIEW DATA | GLOBAL ARRAY |
| POST | `/vista/mp/rpc/mpi-ifc-vista-add-patient` | MPI IFC VISTA ADD PATIENT | SINGLE VALUE |
