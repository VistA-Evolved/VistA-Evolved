# Master Patient Index VistA (MPIF)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `MPIF` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 20 |
| Menu Options | 3 |

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

**API Endpoint:** `GET /vista/mpif/rpc/mpif-remote-local-icn-assign`

---

### `MPIF REMOTE FULL ICN STATS`

| Property | Value |
|----------|-------|
| Tag | `STATS` |
| Routine | `MPIFFULL` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC will return the counts for National ICNs, Local ICNs, Merged  records (-9 nodes), no ICNs, last run for remote ICN assignment and if  full enumeration has completed.

**API Endpoint:** `GET /vista/mpif/rpc/mpif-remote-full-icn-stats`

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

**API Endpoint:** `GET /vista/mpif/rpc/mpif-change-cmor`

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

**API Endpoint:** `GET /vista/mpif/rpc/mpif-ssn-dups`

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

**API Endpoint:** `GET /vista/mpif/rpc/mpif-icn-stats`

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

**API Endpoint:** `GET /vista/mpif/rpc/mpif-ext-pdat-remote`

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

**API Endpoint:** `GET /vista/mpif/rpc/mpif-inactivate`

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

**API Endpoint:** `GET /vista/mpif/rpc/mpif-remote-spi`

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

**API Endpoint:** `POST /vista/mpif/rpc/mpif-remote-icn-update`

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

**API Endpoint:** `GET /vista/mpif/rpc/mpif-ack-check`

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

**API Endpoint:** `POST /vista/mpif/rpc/mpif-seeding-update`

---

### `MPIF SEEDING STATS`

| Property | Value |
|----------|-------|
| Tag | `STATS` |
| Routine | `MPIFSEED` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC will return the stats on the seeding process, including when the  next seeding job is scheduled to run

**API Endpoint:** `GET /vista/mpif/rpc/mpif-seeding-stats`

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

**API Endpoint:** `GET /vista/mpif/rpc/mpif-cmor-push-remote`

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

**API Endpoint:** `GET /vista/mpif/rpc/mpif-remote-primary-dfn-icn`

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

**API Endpoint:** `POST /vista/mpif/rpc/mpif-dnl-add-upd`

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

**API Endpoint:** `GET /vista/mpif/rpc/mpif-edat-remote`

---

### `MPIF GET VHIC/CAC CARD DATA`

| Property | Value |
|----------|-------|
| Tag | `GETCARD` |
| Routine | `MPIFRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** RPC to look up all VHIC/CAC swipe/scan activity at the site for all days prior to today.

**API Endpoint:** `GET /vista/mpif/rpc/mpif-get-vhic/cac-card-data`

---

### `MPIF PURGE VHIC/CAC CARD DATA`

| Property | Value |
|----------|-------|
| Tag | `PURGCARD` |
| Routine | `MPIFRPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This RPC will purge data used to track VHIC/CAC card usage for all prior dates.

**API Endpoint:** `GET /vista/mpif/rpc/mpif-purge-vhic/cac-card-data`

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

**API Endpoint:** `GET /vista/mpif/rpc/mpif-dod-activity-check`

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

**API Endpoint:** `POST /vista/mpif/rpc/mpif-update-name-comp-flag`

---


## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| MPIF DISPLAY ONLY QUERY TO MPI | — |
| MPIF LOC/MIS ICN RES | — |
| MPIF SEEDING TASK | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/mpif/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/mpif/rpc/mpif-remote-local-icn-assign` | MPIF REMOTE LOCAL ICN ASSIGN | ARRAY |
| GET | `/vista/mpif/rpc/mpif-remote-full-icn-stats` | MPIF REMOTE FULL ICN STATS | ARRAY |
| GET | `/vista/mpif/rpc/mpif-change-cmor` | MPIF CHANGE CMOR | SINGLE VALUE |
| GET | `/vista/mpif/rpc/mpif-ssn-dups` | MPIF SSN DUPS | SINGLE VALUE |
| GET | `/vista/mpif/rpc/mpif-icn-stats` | MPIF ICN STATS | ARRAY |
| GET | `/vista/mpif/rpc/mpif-ext-pdat-remote` | MPIF EXT PDAT REMOTE | ARRAY |
| GET | `/vista/mpif/rpc/mpif-inactivate` | MPIF INACTIVATE | SINGLE VALUE |
| GET | `/vista/mpif/rpc/mpif-remote-spi` | MPIF REMOTE SPI | ARRAY |
| POST | `/vista/mpif/rpc/mpif-remote-icn-update` | MPIF REMOTE ICN UPDATE | SINGLE VALUE |
| GET | `/vista/mpif/rpc/mpif-ack-check` | MPIF ACK CHECK | SINGLE VALUE |
| POST | `/vista/mpif/rpc/mpif-seeding-update` | MPIF SEEDING UPDATE | SINGLE VALUE |
| GET | `/vista/mpif/rpc/mpif-seeding-stats` | MPIF SEEDING STATS | ARRAY |
| GET | `/vista/mpif/rpc/mpif-cmor-push-remote` | MPIF CMOR PUSH REMOTE | SINGLE VALUE |
| GET | `/vista/mpif/rpc/mpif-remote-primary-dfn-icn` | MPIF REMOTE PRIMARY DFN ICN | SINGLE VALUE |
| POST | `/vista/mpif/rpc/mpif-dnl-add-upd` | MPIF DNL ADD UPD | ARRAY |
| GET | `/vista/mpif/rpc/mpif-edat-remote` | MPIF EDAT REMOTE | ARRAY |
| GET | `/vista/mpif/rpc/mpif-get-vhic/cac-card-data` | MPIF GET VHIC/CAC CARD DATA | GLOBAL ARRAY |
| GET | `/vista/mpif/rpc/mpif-purge-vhic/cac-card-data` | MPIF PURGE VHIC/CAC CARD DATA | SINGLE VALUE |
| GET | `/vista/mpif/rpc/mpif-dod-activity-check` | MPIF DOD ACTIVITY CHECK | SINGLE VALUE |
| POST | `/vista/mpif/rpc/mpif-update-name-comp-flag` | MPIF UPDATE NAME COMP FLAG | SINGLE VALUE |
