# Quasar (ACKQ)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `ACKQ` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 5 |
| Menu Options | 0 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `ACKQAUD1`

| Property | Value |
|----------|-------|
| Tag | `START` |
| Routine | `ACKQAG01` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC gets the audiogram data for the selected entry in the Audiometric Exam Data file 509850.9 and returns it to the calling program in the array ACKQARR() This is for the Audiometric Display only.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/ackq/rpc/ackqaud1`

---

### `ACKQAUD2`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `ACKQAG02` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Input the IEN of the 509850.9 file entry as the second parameter. Input the DFN as the third parameter, array by reference as first returns a subscripted array of data values for this audiogram data for the patient. Currently only uses 0 node for information. Used in the Enter/Edit Audiogram Delphi

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/ackq/rpc/ackqaud2`

---

### `ACKQROES`

| Property | Value |
|----------|-------|
| Tag | `START` |
| Routine | `ACKQAG03` |
| Return Type | SINGLE VALUE |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** This is the RPC used to setup and send to the DDC, the signed audiometric data file entry to the DDC from the application  Audiogram Enter/Edit (AKCQROES3E.EXE). It is triggered by the saving of a signed entry in 509850.9.  The RPC calls routine  START^ACKQAG03 which in turn calls EN^ACKQAG04. The V

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | IEN | LITERAL | No |
| 3 | STANUM | LITERAL | No |
| 4 | USRNAM | LITERAL | No |
| 5 | USRSER | LITERAL | No |

**API Endpoint:** `GET /vista/ackq/rpc/ackqroes`

---

### `ACKQAUD4`

| Property | Value |
|----------|-------|
| Tag | `DFNCT` |
| Routine | `ACKQAG05` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns an array with ARR(0)=# of audiograms for DFN ^ DFN name Each numbered line after 0 has the IEN of the entry: arr(ct)=IEN

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/ackq/rpc/ackqaud4`

---

### `ACKQROESD`

| Property | Value |
|----------|-------|
| Tag | `STARTD` |
| Routine | `ACKQAG05` |
| Return Type | SINGLE VALUE |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** This is the RPC used to setup and send a deletion of an audiogram to the  DDc when a deletion is processed on the home system for an audiogram that  has been sent to the DDC.  It is triggered by the mDelete.OnClick action  from the Enter/Edit program ACKQROES3E.EXE.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | IEN | LITERAL | No |
| 3 | STANUM | LITERAL | No |
| 4 | USRNAM | LITERAL | No |
| 5 | USRSER | LITERAL | No |

**API Endpoint:** `GET /vista/ackq/rpc/ackqroesd`

---


## Menu Options

No menu options found for this package namespace.

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/ackq/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/ackq/rpc/ackqaud1` | ACKQAUD1 | ARRAY |
| GET | `/vista/ackq/rpc/ackqaud2` | ACKQAUD2 | ARRAY |
| GET | `/vista/ackq/rpc/ackqroes` | ACKQROES | SINGLE VALUE |
| GET | `/vista/ackq/rpc/ackqaud4` | ACKQAUD4 | ARRAY |
| GET | `/vista/ackq/rpc/ackqroesd` | ACKQROESD | SINGLE VALUE |
