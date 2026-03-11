# Imaging (MAG)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `MAG` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 166 |
| Menu Options | 53 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `MAG CONSULT MSG CREATE`

| Property | Value |
|----------|-------|
| Tag | `MSG` |
| Routine | `MAGMAPI` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Piece1=0 if failure Piece1=1 if successful    Note: you must create the mail group IMAGE TELECONSULT (RADIOLOGY) and       add members to recieve the consult notification mail message.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MAGDUZ | LITERAL | No |
| 2 | TXT | REFERENCE | No |

**API Endpoint:** `POST /vista/mag/rpc/mag-consult-msg-create`

---

### `MAG OLU CONSULT`

| Property | Value |
|----------|-------|
| Tag | `CONLU` |
| Routine | `MAGRDEL3` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns image information for a teleconsultation in file 2005.15.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MAGIN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-olu-consult`

---

### `MAG ABSJB`

| Property | Value |
|----------|-------|
| Tag | `ABSJB` |
| Routine | `MAGGTU71` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Sets queue entry to create abstract and/or copy to jukebox.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MAGIEN | LITERAL | No |
| 2 | DATA | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-absjb`

---

### `MAG GET NETLOC`

| Property | Value |
|----------|-------|
| Tag | `SHARE` |
| Routine | `MAGGTU6` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of all entries in the Network Location file (2005.2).

**API Endpoint:** `GET /vista/mag/rpc/mag-get-netloc`

---

### `MAG EKG ONLINE`

| Property | Value |
|----------|-------|
| Tag | `ONLINE` |
| Routine | `MAGGTU6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the status of the first EKG network location type. If an EKG storage type doesn't exist then an offline status is returned.   1=online 0=offline

**API Endpoint:** `GET /vista/mag/rpc/mag-ekg-online`

---

### `MAG FIELD VALIDATE`

| Property | Value |
|----------|-------|
| Tag | `DVAL` |
| Routine | `MAGQBUT4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** This provides an interface with the VA Fileman Database Server (DBS) API for the single field validator: VAL^DIE.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILE | LITERAL | No |
| 2 | IENS | LITERAL | No |
| 3 | FIELD | LITERAL | No |
| 4 | FLAGS | LITERAL | No |
| 5 | VALUE | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-field-validate`

---

### `MAG KEY VALIDATE`

| Property | Value |
|----------|-------|
| Tag | `KVAL` |
| Routine | `MAGQBUT4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This is a an interface to the Database Server (DBS) utility: Key Validator   The Key Validator extrinsic function verifies that new values contained  in the FDA do not produce an invalid key. All keys in which any field in  the FDA participates are checked. If the value for a field in a key being  c

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FLAGS | LITERAL | No |
| 2 | FDA | REFERENCE | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-key-validate`

---

### `MAG DICOM GET PATIENT VITALS`

| Property | Value |
|----------|-------|
| Tag | `GETPAT` |
| Routine | `MAGDHWR` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure returns some information about a patient. At this time, the values returned are    VIP-code    Height    Weight This list may be extended in the future.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-patient-vitals`

---

### `MAG DICOM AUDIT COUNT`

| Property | Value |
|----------|-------|
| Tag | `COUNT` |
| Routine | `MAGDRPC7` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |
| 2 | MESSAGE | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-audit-count`

---

### `MAG DICOM AUDIT PURGE`

| Property | Value |
|----------|-------|
| Tag | `PURGE` |
| Routine | `MAGDRPC7` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILENUM | LITERAL | No |
| 2 | DATE | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-audit-purge`

---

### `MAG DICOM AUDIT RANGE`

| Property | Value |
|----------|-------|
| Tag | `RANGE` |
| Routine | `MAGDRPC7` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-audit-range`

---

### `MAG DICOM ET PHONE HOME`

| Property | Value |
|----------|-------|
| Tag | `INFO` |
| Routine | `MAGDRPC1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-et-phone-home`

---

### `MAG DICOM FILEMAN GET`

| Property | Value |
|----------|-------|
| Tag | `FMGET` |
| Routine | `MAGDRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILE | LITERAL | No |
| 2 | D0 | LITERAL | No |
| 3 | FIELD | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-fileman-get`

---

### `MAG DICOM FIND LOCATION`

| Property | Value |
|----------|-------|
| Tag | `FINDLOC` |
| Routine | `MAGDRPC8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NAME | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-find-location`

---

### `MAG DICOM GET BASIC IMAGE`

| Property | Value |
|----------|-------|
| Tag | `IMAGE` |
| Routine | `MAGDRPC2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | D0 | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-basic-image`

---

### `MAG DICOM GET DOMAIN`

| Property | Value |
|----------|-------|
| Tag | `DOMAIN` |
| Routine | `MAGDRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-domain`

---

### `MAG DICOM GET HIGHEST HL7`

| Property | Value |
|----------|-------|
| Tag | `HIGHHL7` |
| Routine | `MAGDRPC8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-highest-hl7`

---

### `MAG DICOM GET IMAGE GROUP`

| Property | Value |
|----------|-------|
| Tag | `GRPIMG` |
| Routine | `MAGDRPC2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | D0 | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-image-group`

---

### `MAG DICOM GET IMAGING TYPES`

| Property | Value |
|----------|-------|
| Tag | `VALIMGT` |
| Routine | `MAGDRPC8` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-imaging-types`

---

### `MAG DICOM GET NEXT QUEUE ENTRY`

| Property | Value |
|----------|-------|
| Tag | `NEXTIMG` |
| Routine | `MAGDRPC4` |
| Return Type | ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |
| 2 | D0 | LITERAL | No |
| 3 | D1 | LITERAL | No |
| 4 | SENT | REFERENCE | No |
| 5 | CHECK | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-next-queue-entry`

---

### `MAG DICOM GET PATIENT`

| Property | Value |
|----------|-------|
| Tag | `PAT` |
| Routine | `MAGDRPC1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-patient`

---

### `MAG DICOM GET PLACE`

| Property | Value |
|----------|-------|
| Tag | `GETPLACE` |
| Routine | `MAGDRPC8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-place`

---

### `MAG DICOM GET RAD RPT INFO`

| Property | Value |
|----------|-------|
| Tag | `RARPTO` |
| Routine | `MAGDRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TYPE | LITERAL | No |
| 2 | D0 | LITERAL | No |
| 3 | F | LITERAL | No |
| 4 | D1 | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-rad-rpt-info`

---

### `MAG DICOM GET SERVICE INFO`

| Property | Value |
|----------|-------|
| Tag | `SERVICE` |
| Routine | `MAGDRPC2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-service-info`

---

### `MAG DICOM GET VERSION`

| Property | Value |
|----------|-------|
| Tag | `IMGVER` |
| Routine | `MAGDRPC2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-version`

---

### `MAG DICOM HL7 POINTER ACTION`

| Property | Value |
|----------|-------|
| Tag | `HL7PTR` |
| Routine | `MAGDRPC8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ACTION | LITERAL | No |
| 2 | VALUE | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-hl7-pointer-action`

---

### `MAG DICOM IMAGE AUDIT GET`

| Property | Value |
|----------|-------|
| Tag | `GET2` |
| Routine | `MAGDRPC7` |
| Return Type | ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |
| 2 | START | LITERAL | No |
| 3 | STOP | LITERAL | No |
| 4 | MAX | LITERAL | No |
| 5 | OFFSET | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-image-audit-get`

---

### `MAG DICOM IMAGE PROCESSING`

| Property | Value |
|----------|-------|
| Tag | `ENTRY` |
| Routine | `MAGDIR8` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REQUEST | REFERENCE | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-image-processing`

---

### `MAG DICOM INCORRECT IMAGE CT`

| Property | Value |
|----------|-------|
| Tag | `CORRECT` |
| Routine | `MAGDRPC8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |
| 2 | MACHID | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-incorrect-image-ct`

---

### `MAG DICOM LIST GLOBAL VARIABLE`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `MAGDGL` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | WILD | LITERAL | No |
| 2 | MAX | LITERAL | No |
| 3 | START | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-list-global-variable`

---

### `MAG DICOM LOOKUP RAD STUDY`

| Property | Value |
|----------|-------|
| Tag | `RADLKUP` |
| Routine | `MAGDRPC3` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CASENUMB | LITERAL | No |
| 2 | STUDYDAT | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-lookup-rad-study`

---

### `MAG DICOM LOOKUP STUDY`

| Property | Value |
|----------|-------|
| Tag | `LOOKUP` |
| Routine | `MAGDRPC4` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NUMBER | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-lookup-study`

---

### `MAG DICOM NETWORK STATUS`

| Property | Value |
|----------|-------|
| Tag | `ONOFLINE` |
| Routine | `MAGDRPC5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DEST | LITERAL | No |
| 2 | STATUS | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-network-status`

---

### `MAG DICOM PACS CUTOFF DATE`

| Property | Value |
|----------|-------|
| Tag | `CUTOFF` |
| Routine | `MAGDRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | D0 | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-pacs-cutoff-date`

---

### `MAG DICOM PACS MINIMUM SPACE`

| Property | Value |
|----------|-------|
| Tag | `MINSPACE` |
| Routine | `MAGDRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | D0 | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-pacs-minimum-space`

---

### `MAG DICOM PURGE HL7`

| Property | Value |
|----------|-------|
| Tag | `HL7PURGE` |
| Routine | `MAGDRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CUTOFF | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-purge-hl7`

---

### `MAG DICOM QUEUE IMAGE`

| Property | Value |
|----------|-------|
| Tag | `QUEUE` |
| Routine | `MAGDRPC3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 8 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IMAGE | LITERAL | No |
| 2 | DESTINAT | LITERAL | No |
| 3 | LOCATION | LITERAL | No |
| 4 | ACCESSIO | LITERAL | No |
| 5 | REASON | LITERAL | No |
| 6 | EMAIL | LITERAL | No |
| 7 | PRIORITY | LITERAL | No |
| 8 | JBTOHD | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-queue-image`

---

### `MAG DICOM QUEUE INIT`

| Property | Value |
|----------|-------|
| Tag | `INIT` |
| Routine | `MAGDRPC9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |
| 2 | COUNT ONLY | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-queue-init`

---

### `MAG DICOM ROUTE EVAL LOG`

| Property | Value |
|----------|-------|
| Tag | `EVALLOG` |
| Routine | `MAGDRPC6` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TASK | LITERAL | No |
| 2 | MSG | LITERAL | No |
| 3 | MAX | LITERAL | No |
| 4 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-route-eval-log`

---

### `MAG DICOM ROUTE EVAL START`

| Property | Value |
|----------|-------|
| Tag | `START` |
| Routine | `MAGDRPC5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |
| 2 | RULES | REFERENCE | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-route-eval-start`

---

### `MAG DICOM ROUTE EVAL STOP`

| Property | Value |
|----------|-------|
| Tag | `STOP` |
| Routine | `MAGDRPC5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-route-eval-stop`

---

### `MAG DICOM ROUTE GET PURGE`

| Property | Value |
|----------|-------|
| Tag | `PURGE` |
| Routine | `MAGDRPC5` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |
| 2 | DEST | LITERAL | No |
| 3 | MAX | LITERAL | No |
| 4 | DONE | REFERENCE | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-route-get-purge`

---

### `MAG DICOM ROUTE GET TRANS ID`

| Property | Value |
|----------|-------|
| Tag | `TRANSID` |
| Routine | `MAGDRTIM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-route-get-trans-id`

---

### `MAG DICOM ROUTE LIST DESTI`

| Property | Value |
|----------|-------|
| Tag | `LISTDEST` |
| Routine | `MAGDRPC5` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-route-list-desti`

---

### `MAG DICOM ROUTE LOCK TRANSMIT`

| Property | Value |
|----------|-------|
| Tag | `LOCK` |
| Routine | `MAGDRPC5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | D0 | LITERAL | No |
| 2 | LOCATION | LITERAL | No |
| 3 | PLUSMIN | LITERAL | No |

**API Endpoint:** `POST /vista/mag/rpc/mag-dicom-route-lock-transmit`

---

### `MAG DICOM ROUTE LOG XMIT`

| Property | Value |
|----------|-------|
| Tag | `LOGXIMG` |
| Routine | `MAGDRPC7` |
| Return Type | SINGLE VALUE |
| Parameter Count | 7 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | QUEUE | LITERAL | No |
| 2 | DEST | LITERAL | No |
| 3 | LOCATION | LITERAL | No |
| 4 | STATUS | LITERAL | No |
| 5 | FILNAM | LITERAL | No |
| 6 | XMIT | LITERAL | No |
| 7 | MECH | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-route-log-xmit`

---

### `MAG DICOM ROUTE NEXT FILE`

| Property | Value |
|----------|-------|
| Tag | `XMIT` |
| Routine | `MAGDRPC5` |
| Return Type | ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |
| 2 | DEST | LITERAL | No |
| 3 | PRIOR | LITERAL | No |
| 4 | MECH | LITERAL | No |
| 5 | DESTS | REFERENCE | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-route-next-file`

---

### `MAG DICOM ROUTE PURGE DONE`

| Property | Value |
|----------|-------|
| Tag | `PURGDONE` |
| Routine | `MAGDRPC6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DAYS | LITERAL | No |
| 2 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-route-purge-done`

---

### `MAG DICOM ROUTE REMOVE OBSO`

| Property | Value |
|----------|-------|
| Tag | `REMOBSO` |
| Routine | `MAGDRPC6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | UPTO | LITERAL | No |
| 2 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-route-remove-obso`

---

### `MAG DICOM ROUTE REQUEUE`

| Property | Value |
|----------|-------|
| Tag | `REQUEUE` |
| Routine | `MAGDRPC6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-route-requeue`

---

### `MAG DICOM ROUTE STATUS`

| Property | Value |
|----------|-------|
| Tag | `STATUS` |
| Routine | `MAGDRPC5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | D0 | LITERAL | No |
| 2 | STATUS | LITERAL | No |
| 3 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-route-status`

---

### `MAG DICOM ROUTE TRANSACT STS`

| Property | Value |
|----------|-------|
| Tag | `TRANSTS` |
| Routine | `MAGDRTIM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TRANSID | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-route-transact-sts`

---

### `MAG DICOM ROUTE VALID DEST`

| Property | Value |
|----------|-------|
| Tag | `VALDEST` |
| Routine | `MAGDRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NAME | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-route-valid-dest`

---

### `MAG DICOM SET PACS PARAMS`

| Property | Value |
|----------|-------|
| Tag | `SETPACS` |
| Routine | `MAGDRPC8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PLACE | LITERAL | No |

**API Endpoint:** `POST /vista/mag/rpc/mag-dicom-set-pacs-params`

---

### `MAG DICOM TEXT AUDIT GET`

| Property | Value |
|----------|-------|
| Tag | `GET1` |
| Routine | `MAGDRPC7` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |
| 2 | TODAY | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-text-audit-get`

---

### `MAG DICOM TEXT PROCESSING`

| Property | Value |
|----------|-------|
| Tag | `ENTRY` |
| Routine | `MAGDHRS1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REQUEST | REFERENCE | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-text-processing`

---

### `MAG DICOM UPDATE GATEWAY NAME`

| Property | Value |
|----------|-------|
| Tag | `UPDTGW` |
| Routine | `MAGDRPC8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OLDNAM | LITERAL | No |
| 2 | NEWNAM | LITERAL | No |
| 3 | OLDLOC | LITERAL | No |
| 4 | NEWLOC | LITERAL | No |

**API Endpoint:** `POST /vista/mag/rpc/mag-dicom-update-gateway-name`

---

### `MAG DICOM UPDATE SCU LIST`

| Property | Value |
|----------|-------|
| Tag | `UPDTAPP` |
| Routine | `MAGDRPC8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | APP | REFERENCE | No |

**API Endpoint:** `POST /vista/mag/rpc/mag-dicom-update-scu-list`

---

### `MAG DICOM VALID LOCATIONS`

| Property | Value |
|----------|-------|
| Tag | `LOCS` |
| Routine | `MAGDRPC8` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-valid-locations`

---

### `MAG DICOM WORKSTATION VERSION`

| Property | Value |
|----------|-------|
| Tag | `STATION` |
| Routine | `MAGDRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STATION | LITERAL | No |
| 2 | VERSION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-workstation-version`

---

### `MAG GET ENV`

| Property | Value |
|----------|-------|
| Tag | `GETENV` |
| Routine | `MAGGTU6` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns environment variables from VistA server

**API Endpoint:** `GET /vista/mag/rpc/mag-get-env`

---

### `MAG DIRHASH`

| Property | Value |
|----------|-------|
| Tag | `DHRPC` |
| Routine | `MAGQBUT4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+ | Property of the US Government.                                | | No permission to copy or redistribute this software is given. | | Use of unreleased versions of this software requires the user | | to execute a written test agreemen

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Filenamd | LITERAL | No |
| 2 | Network location file pointer. | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dirhash`

---

### `MAG FLD ATT`

| Property | Value |
|----------|-------|
| Tag | `DDLF` |
| Routine | `MAGQBUT4` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns a list of field attributes.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILE | LITERAL | No |
| 2 | FIELD | LITERAL | No |
| 3 | FLAG | LITERAL | No |
| 4 | ATTR | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-fld-att`

---

### `MAG CFIND QUERY`

| Property | Value |
|----------|-------|
| Tag | `FIND` |
| Routine | `MAGDQR01` |
| Return Type | ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TAGS | REFERENCE | No |
| 2 | RESULT | LITERAL | No |
| 3 | OFFSET | LITERAL | No |
| 4 | MAX | LITERAL | No |
| 5 | AENAME | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-cfind-query`

---

### `MAG DICOM CORRECT VALIDATE`

| Property | Value |
|----------|-------|
| Tag | `VALIDATE` |
| Routine | `MAGDLBV` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MENU | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-correct-validate`

---

### `MAG STUDY UID QUERY`

| Property | Value |
|----------|-------|
| Tag | `STUDY` |
| Routine | `MAGDQR04` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | UID | LITERAL | No |
| 2 | PRMUID | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-study-uid-query`

---

### `MAG VISTA CHECKSUMS`

| Property | Value |
|----------|-------|
| Tag | `GATEWAY` |
| Routine | `MAGVCHK` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MAGDBB | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-vista-checksums`

---

### `MAG DICOM GET ICN`

| Property | Value |
|----------|-------|
| Tag | `GETICN` |
| Routine | `MAGDRPC9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-icn`

---

### `MAG NEW SOP INSTANCE UID`

| Property | Value |
|----------|-------|
| Tag | `NEWUID` |
| Routine | `MAGDRPC9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OLD | LITERAL | No |
| 2 | NEW | LITERAL | No |
| 3 | IMAGE | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-new-sop-instance-uid`

---

### `MAG RAD GET NEXT RPT BY DATE`

| Property | Value |
|----------|-------|
| Tag | `NEXT` |
| Routine | `MAGDRPC9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SEED | LITERAL | No |
| 2 | DIR | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-rad-get-next-rpt-by-date`

---

### `MAG RAD GET NEXT RPT BY PT`

| Property | Value |
|----------|-------|
| Tag | `NXTPTRPT` |
| Routine | `MAGDRPC9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | RARPT1 | LITERAL | No |
| 3 | DIR | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-rad-get-next-rpt-by-pt`

---

### `MAG DICOM CON GET TELE READER`

| Property | Value |
|----------|-------|
| Tag | `GETREAD` |
| Routine | `MAGDTR06` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Return the sites and diagnostic specialties for the tele reader.

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-con-get-tele-reader`

---

### `MAG DICOM CON SET TELE READER`

| Property | Value |
|----------|-------|
| Tag | `SETREAD` |
| Routine | `MAGDTR06` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This allows the user to select/deselect an item from his/her site and specialty list.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SELECT | LITERAL | No |
| 2 | IENPARAM | LITERAL | No |

**API Endpoint:** `POST /vista/mag/rpc/mag-dicom-con-set-tele-reader`

---

### `MAG DICOM CON UNREAD ACQ SITES`

| Property | Value |
|----------|-------|
| Tag | `GETSITES` |
| Routine | `MAGDTR06` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the list of acquisition sites that are defined for the reading site.

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-con-unread-acq-sites`

---

### `MAG DICOM CON UNREADLIST GET`

| Property | Value |
|----------|-------|
| Tag | `LOOKUP` |
| Routine | `MAGDTR05` |
| Return Type | ARRAY |
| Parameter Count | 9 |
| Status | Inactive (may still be callable) |

**Description:** Per VHA Directive 2004-038, this RPC should not be modified. +---------------------------------------------------------------+ | Property of the US Government.                                | | No permission to copy or redistribute this software is given. | | Use of unreleased versions of this soft

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ACQSITE | LITERAL | No |
| 2 | SPECIALITY INDEX | LITERAL | No |
| 3 | PROCEDURE INDEX | LITERAL | No |
| 4 | TIMESTAMP | LITERAL | No |
| 5 | DUZ | LITERAL | No |
| 6 | READER SITE | LITERAL | No |
| 7 | LOCKTIME | LITERAL | No |
| 8 | STATLIST | LITERAL | No |
| 9 | READER STATION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-con-unreadlist-get`

---

### `MAG DICOM CON UNREADLIST LOCK`

| Property | Value |
|----------|-------|
| Tag | `LOCK` |
| Routine | `MAGDTR04` |
| Return Type | SINGLE VALUE |
| Parameter Count | 8 |
| Status | Inactive (may still be callable) |

**Description:** Per VHA Directive 2004-038, this RPC should not be modified. +---------------------------------------------------------------+ | Property of the US Government.                                | | No permission to copy or redistribute this software is given. | | Use of unreleased versions of this soft

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | UNREAD LIST POINTER | LITERAL | No |
| 2 | LOCK FLAG | LITERAL | No |
| 3 | FULL NAME | LITERAL | No |
| 4 | NAME ABBREVIATION | LITERAL | No |
| 5 | REMOTE DUZ | LITERAL | No |
| 6 | LOCAL DUZ | LITERAL | No |
| 7 | READER SITE | LITERAL | No |
| 8 | READER STATION | LITERAL | No |

**API Endpoint:** `POST /vista/mag/rpc/mag-dicom-con-unreadlist-lock`

---

### `MAG DICOM CHECK AE TITLE`

| Property | Value |
|----------|-------|
| Tag | `AETITLE` |
| Routine | `MAGVRS52` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TITLE | LITERAL | No |
| 2 | SERVICE | LITERAL | No |
| 3 | ROLE | LITERAL | No |
| 4 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-check-ae-title`

---

### `MAG DICOM GET GATEWAY INFO`

| Property | Value |
|----------|-------|
| Tag | `GETINFO` |
| Routine | `MAGDQR05` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure returns information about a DICOM Gateway.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HOSTNAME | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-gateway-info`

---

### `MAG DICOM GET MACHINE ID`

| Property | Value |
|----------|-------|
| Tag | `GETID` |
| Routine | `MAGDRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HOSTNAME | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-machine-id`

---

### `MAG DICOM GET UID ROOT`

| Property | Value |
|----------|-------|
| Tag | `UIDROOT` |
| Routine | `MAGDRPC9` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-uid-root`

---

### `MAG DICOM GET UID TABLE`

| Property | Value |
|----------|-------|
| Tag | `SERVER` |
| Routine | `MAGDUID3` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OFFSET | LITERAL | No |
| 2 | MAX | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-uid-table`

---

### `MAG DICOM STORE GATEWAY INFO`

| Property | Value |
|----------|-------|
| Tag | `GWINFO` |
| Routine | `MAGDQR05` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure stores information about a DICOM Gateway in the VistA system.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HOSTNAME | LITERAL | No |
| 2 | LOCATION | LITERAL | No |
| 3 | FILES | REFERENCE | No |
| 4 | VERSION | REFERENCE | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-store-gateway-info`

---

### `MAG DICOM VISTA AE TITLE`

| Property | Value |
|----------|-------|
| Tag | `VATITLE` |
| Routine | `MAGVRS52` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure returns a string that can be used as a DICOM Application Entity title for the purpose established by the parameters to this procedure.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SERVICE | LITERAL | No |
| 2 | ROLE | LITERAL | No |
| 3 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-vista-ae-title`

---

### `MAG GET DICOM XMIT ORIGIN`

| Property | Value |
|----------|-------|
| Tag | `LISTORIG` |
| Routine | `MAGDRPC1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**API Endpoint:** `GET /vista/mag/rpc/mag-get-dicom-xmit-origin`

---

### `MAG IMAGE CURRENT INFO`

| Property | Value |
|----------|-------|
| Tag | `INFO` |
| Routine | `MAGDQR04` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure returns current values for the various DICOM tags that are to be included in the header of an exported image.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IMAGE | LITERAL | No |
| 2 | DBTYPE | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-image-current-info`

---

### `MAG GET SOP CLASS METHOD`

| Property | Value |
|----------|-------|
| Tag | `N/A` |
| Routine | `N/A` |
| Return Type | UNKNOWN() |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/mag/rpc/mag-get-sop-class-method`

---

### `MAG BROKER SECURITY`

| Property | Value |
|----------|-------|
| Tag | `BSE` |
| Routine | `MAGS2BSE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** CALL BSE(BROKER SECURITY ENHANCEMENT) - XUS SET VISITOR, RETURN A BSE TOKEN

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RES | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-broker-security`

---

### `MAG DOD GET STUDIES IEN`

| Property | Value |
|----------|-------|
| Tag | `STUDY2` |
| Routine | `MAGDQR21` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure returns information about studies, based upon the IEN (File #2005 or #2005.1) of the image group, Patient Number, Study-Level Only Flag, and Include Deleted Images Flag that are provided as parameters.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GROUPS | REFERENCE | No |
| 2 | REQDFN | LITERAL | No |
| 3 | IMGLESS | LITERAL | No |
| 4 | FLAGS | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dod-get-studies-ien`

---

### `MAG DOD GET STUDIES UID`

| Property | Value |
|----------|-------|
| Tag | `STUDY1` |
| Routine | `MAGDQR21` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure returns information about studies, based upon the Study UID that is provided as a parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STUDIES | REFERENCE | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dod-get-studies-uid`

---

### `MAG SCAN IMAGE TEXT FILES`

| Property | Value |
|----------|-------|
| Tag | `SCANIMG` |
| Routine | `MAGDOD01` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ACTION | LITERAL | No |
| 2 | IMAGE | LITERAL | No |
| 3 | DIR | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-scan-image-text-files`

---

### `MAG STORE TEXT FILE DETAILS`

| Property | Value |
|----------|-------|
| Tag | `STOREUID` |
| Routine | `MAGDOD01` |
| Return Type | SINGLE VALUE |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IMAGE | LITERAL | No |
| 2 | SERIES | LITERAL | No |
| 3 | SNUM | LITERAL | No |
| 4 | INUM | LITERAL | No |
| 5 | IMGUID | LITERAL | No |
| 6 | STUID | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-store-text-file-details`

---

### `MAG DICOM ADD CAMERA EQUIP RM`

| Property | Value |
|----------|-------|
| Tag | `ADDROOM` |
| Routine | `MAGDRPCB` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Check the OUTSIDE STUDY Camera Equipment Room for the IMAGING LOCATION. If it is not present, add it.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RAEXAM | LITERAL | No |

**API Endpoint:** `POST /vista/mag/rpc/mag-dicom-add-camera-equip-rm`

---

### `MAG DICOM GET DFN`

| Property | Value |
|----------|-------|
| Tag | `GETDFN` |
| Routine | `MAGDRPCA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Given an ICN, it returns the DFN.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-dfn`

---

### `MAG DICOM GET HOSP LOCATION`

| Property | Value |
|----------|-------|
| Tag | `GETLOC` |
| Routine | `MAGDRPCB` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Return a list of matching hospital locations

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-hosp-location`

---

### `MAG DICOM GET RAD CAMERA`

| Property | Value |
|----------|-------|
| Tag | `CAMERA` |
| Routine | `MAGDRPCB` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Used to find an entry in file CAMERA/EQUIP/RM (#78.6)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CAMERA | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-rad-camera`

---

### `MAG DICOM GET RAD CPT MOD`

| Property | Value |
|----------|-------|
| Tag | `CPTMOD` |
| Routine | `MAGDRPCB` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to return a valid entry in the CPT MODIFIER file (#81.3).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CPTMOD | LITERAL | No |
| 2 | MAGDT | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-rad-cpt-mod`

---

### `MAG DICOM GET RAD DX CODE`

| Property | Value |
|----------|-------|
| Tag | `DXCODE` |
| Routine | `MAGDRPCB` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to lookup an entry in file DIAGNOSTIC CODES (78.3).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DXCODE | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-rad-dx-code`

---

### `MAG DICOM GET RAD FILM`

| Property | Value |
|----------|-------|
| Tag | `FILM` |
| Routine | `MAGDRPCB` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to find an entry in the FILM SIZE file (#78.4).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILM | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-rad-film`

---

### `MAG DICOM GET RAD INFO BY ACN`

| Property | Value |
|----------|-------|
| Tag | `ACNUMB` |
| Routine | `MAGDRPCA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC takes the Accession Number and returns the first radiology study that matches it.  This RPC uses $$ACCFIND^RAAPI() to get this information.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ACNUMB | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-rad-info-by-acn`

---

### `MAG DICOM GET RAD ORDERS`

| Property | Value |
|----------|-------|
| Tag | `ORDERS` |
| Routine | `MAGDRPCB` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Return a list of radiology orders for a patient

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-rad-orders`

---

### `MAG DICOM GET RAD PERSON`

| Property | Value |
|----------|-------|
| Tag | `RADLST` |
| Routine | `MAGDRPCB` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns list of names from the NEW PERSON file (#200) with a Rad/Nuc class.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLASS | LITERAL | No |
| 2 | NAME | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-rad-person`

---

### `MAG DICOM GET USERNAME`

| Property | Value |
|----------|-------|
| Tag | `USERNAME` |
| Routine | `MAGDRPCB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the name of the user.

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-username`

---

### `MAG DICOM IMPORTER CHECK UIDS`

| Property | Value |
|----------|-------|
| Tag | `CHECKUID` |
| Routine | `MAGDRPCA` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to lookup DICOM UIDs before importing images.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | UIDLIST | REFERENCE | No |
| 2 | LEVEL | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-importer-check-uids`

---

### `MAG DICOM IMPORTER DELETE`

| Property | Value |
|----------|-------|
| Tag | `DELETE` |
| Routine | `MAGDRPCA` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used by the DICOM Gateway to delete an entry in file IMPORTABLE DICOM OBJECTS (#2006.5752).  The entry to be deleted must match the Hostname, OLDPATH (Gateway), and the image UID.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MACHID | LITERAL | No |
| 2 | FILEPATH | LITERAL | No |
| 3 | IMAGEUID | LITERAL | No |

**API Endpoint:** `POST /vista/mag/rpc/mag-dicom-importer-delete`

---

### `MAG DICOM IMPORTER LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `LOOKUP` |
| Routine | `MAGDRPCA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Return information about the image.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MAGIEN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-importer-lookup`

---

### `MAG DICOM RADIOLOGY MODIFIERS`

| Property | Value |
|----------|-------|
| Tag | `MOD` |
| Routine | `MAGDRPCA` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns a listing of entries from the PROCEDURES MODIFIER file (#71.2) sorted by Radiology' Imaging Type.

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-radiology-modifiers`

---

### `MAG DICOM RADIOLOGY PROCEDURES`

| Property | Value |
|----------|-------|
| Tag | `PROC` |
| Routine | `MAGDRPCA` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns a list of Radiology Procedures for 'no-credit' Imaging locations within a given division. If the division does not have any 'no-credit' Imaging locations defined, the results will return an error message indicating the problem.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIV | LITERAL | No |
| 2 | FILTER | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-radiology-procedures`

---

### `MAG DICOM SET IMAGING LOCATION`

| Property | Value |
|----------|-------|
| Tag | `IMAGELOC` |
| Routine | `MAGDRPCB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Set imaging location in radiology order file (#75.1).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RAOIEN | LITERAL | No |
| 2 | RAMLC | LITERAL | No |

**API Endpoint:** `POST /vista/mag/rpc/mag-dicom-set-imaging-location`

---

### `MAG BROKER GET VISITOR`

| Property | Value |
|----------|-------|
| Tag | `BSEXP` |
| Routine | `MAGS2BSE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Wraps code underlying RPC: XUS GET VISITOR to check for expired authentication token.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MAGTKN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-broker-get-visitor`

---

### `MAG FIND IMAGE TEXT FILE`

| Property | Value |
|----------|-------|
| Tag | `FINDFIL` |
| Routine | `MAGDOD01` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+   | Property of the US Government.                                |   | No permission to copy or redistribute this software is given. |   | Use of unreleased versions of this software requires the user |   | to execute a written tes

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILENAME | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-find-image-text-file`

---

### `MAG STORAGE FETCH`

| Property | Value |
|----------|-------|
| Tag | `FETCH` |
| Routine | `MAGSFTCH` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Description:** This Remote Procedure allows the invoking client to copy or move image files

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MAGIEN | LITERAL | No |
| 2 | DATE | LITERAL | No |
| 3 | NETLOC | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-storage-fetch`

---

### `MAG STORAGE FETCH SET`

| Property | Value |
|----------|-------|
| Tag | `SETLOC` |
| Routine | `MAGSFTCH` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Sets the network location pieces 3 and 4 of the IMAGE file (#2005) 0 node or update the WORM network location reference piece 5 in 0 node, or update the BIG file reference in "FBIG" node.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MAGIEN | LITERAL | No |
| 2 | NTLOC | LITERAL | No |

**API Endpoint:** `POST /vista/mag/rpc/mag-storage-fetch-set`

---

### `MAG UTIL BKONLJB`

| Property | Value |
|----------|-------|
| Tag | `BKONL` |
| Routine | `MAGSDOFL` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** MAG UTIL BKONLJB - This Remote Procedure is used to track Offline Images. When insert Jukebox Platter, put images back Online stage.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MAGPLAT | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-util-bkonljb`

---

### `MAG UTIL CLNLOC`

| Property | Value |
|----------|-------|
| Tag | `NETLOC` |
| Routine | `MAGSDEL5` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** MAG UTILITY - Delete a Network Location that has no references to images.  Input Parameters    IN : Network Location IEN    PLACE : User SITE PARAMETER IEN       STEP : IEN range to run - format = <startIEN>#<endIEN>    Output Parameter:    OUT : Array of results   RPC to delete a network location.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | PLACE | LITERAL | No |
| 3 | STEP | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-util-clnloc`

---

### `MAG UTIL DT2IEN`

| Property | Value |
|----------|-------|
| Tag | `DTRANGE` |
| Routine | `MAGSHEC` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** This Remote Procedure uses a date range to find an IEN in the IMAGE File (#2005)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATE | LITERAL | No |
| 2 | LIMIT | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-util-dt2ien`

---

### `MAG UTIL GETNETLOC`

| Property | Value |
|----------|-------|
| Tag | `SHARE` |
| Routine | `MAGSDEL5` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of entries in the NETWORK LOCATION file(#2005.2). The RPC will return each NETWORK LOCATION data along with its  OPERATIONAL STATUS (offline/online), PHYSICAL REFERENCE, HASH SUBDIRECTORY, SITE, PLACE info ...etc.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TYPE | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-util-getnetloc`

---

### `MAG UTIL JBOFFLN`

| Property | Value |
|----------|-------|
| Tag | `LINE` |
| Routine | `MAGSDOFL` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Track Offline JukeBox images | Take Image files Offline   This Remote Prcedure will add the new entry in MAGQUEUE(2006.033). The platter volume name will be used to index with IMAGE file IEN.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TXTLine | LITERAL | No |
| 2 | PLATTER | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-util-jboffln`

---

### `MAG UTIL LSTOFLJB`

| Property | Value |
|----------|-------|
| Tag | `LISTOFL` |
| Routine | `MAGSDOFL` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** LIST OFFLINE JB PLATTER(S) This Remote Procedure will provide the invoking client a list of all platter names with Offline Images from OFFLINE IMAGES file (#2006.033).

**API Endpoint:** `GET /vista/mag/rpc/mag-util-lstofljb`

---

### `MAG ANNOT GET IMAGE`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `MAGSANNO` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Per VHA Directive 2004-038, this should not be modified. +---------------------------------------------------------------+ | Property of the US Government.                                | | No permission to copy or redistribute this software is given. | | Use of unreleased versions of this softwar

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-annot-get-image`

---

### `MAG ANNOT GET IMAGE DETAIL`

| Property | Value |
|----------|-------|
| Tag | `GETD` |
| Routine | `MAGSANNO` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Per VHA Directive 2004-038, this should not be modified. +---------------------------------------------------------------+ | Property of the US Government.                                | | No permission to copy or redistribute this software is given. | | Use of unreleased versions of this softwar

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MAGIEN | LITERAL | No |
| 2 | LAYIEN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-annot-get-image-detail`

---

### `MAG ANNOT IMAGE ALLOW`

| Property | Value |
|----------|-------|
| Tag | `ANOALLOW` |
| Routine | `MAGSANNO` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Per VHA Directive 2004-038, this should not be modified. +---------------------------------------------------------------+ | Property of the US Government.                                | | No permission to copy or redistribute this software is given. | | Use of unreleased versions of this softwar

**API Endpoint:** `GET /vista/mag/rpc/mag-annot-image-allow`

---

### `MAG ANNOT STORE IMAGE DETAIL`

| Property | Value |
|----------|-------|
| Tag | `STORE` |
| Routine | `MAGSANNO` |
| Return Type | ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** Per VHA Directive 2004-038, this should not be modified. +---------------------------------------------------------------+ | Property of the US Government.                                | | No permission to copy or redistribute this software is given. | | Use of unreleased versions of this softwar

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | XML | LIST | No |
| 3 | SOURCE | LITERAL | No |
| 4 | DELETION | LITERAL | No |
| 5 | VERSION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-annot-store-image-detail`

---

### `MAG DICOM GET AGENCY`

| Property | Value |
|----------|-------|
| Tag | `AGENCY` |
| Routine | `MAGDRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Per VHA Directive 2004-038, this routine should not be modified. +---------------------------------------------------------------+ | Property of the US Government.                                | | No permission to copy or redistribute this software is given. | | Use of unreleased versions of this

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-agency`

---

### `MAG EVENT AUDIT`

| Property | Value |
|----------|-------|
| Tag | `EVENT` |
| Routine | `MAGUAUD` |
| Return Type | ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EVENT | LITERAL | No |
| 2 | HOSTNAME | LITERAL | No |
| 3 | APPNAME | LITERAL | No |
| 4 | MESSAGE | LITERAL | No |
| 5 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-event-audit`

---

### `MAG FILEMAN FIELD ATTS`

| Property | Value |
|----------|-------|
| Tag | `FIELDATT` |
| Routine | `MAGUFFLA` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure returns a list of attributes and attribute values  for a field in a FileMan file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILENO | LITERAL | No |
| 2 | FIELDNO | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-fileman-field-atts`

---

### `MAG FILEMAN FIELD LIST`

| Property | Value |
|----------|-------|
| Tag | `FIELDLST` |
| Routine | `MAGUFFLL` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure returns a list of fields from a FileMan file or  subfile in either alpha or numeric order.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILENO | LITERAL | No |
| 2 | ORDER | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-fileman-field-list`

---

### `MAG DICOM GET EXPORT IMAGE STS`

| Property | Value |
|----------|-------|
| Tag | `LOOKUP` |
| Routine | `MAGDIWDV` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Return a list of the studies in the DICOM OBJECT EXPORT file (#2006.574), along with the status of the transmission.

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-export-image-sts`

---

### `MAG DICOM GET PROCESS ID`

| Property | Value |
|----------|-------|
| Tag | `GETPID` |
| Routine | `MAGDRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Return the $J process id of the RPC backend

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-process-id`

---

### `MAG DICOM GET AE ENTRY`

| Property | Value |
|----------|-------|
| Tag | `AENAME` |
| Routine | `MAGVCAE` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | APPNAME | LITERAL | No |
| 2 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-ae-entry`

---

### `MAG DICOM GET AE ENTRY LOC`

| Property | Value |
|----------|-------|
| Tag | `AENTRYLC` |
| Routine | `MAGVCAE` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SERVICE | LITERAL | No |
| 2 | ROLE | LITERAL | No |
| 3 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-ae-entry-loc`

---

### `MAG GET DICOM QUEUE LIST`

| Property | Value |
|----------|-------|
| Tag | `GETDCLST` |
| Routine | `MAGROI01` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** GET LIST OF TRANSMIT DESTINATIONS TO QUEUE DICOM IMAGES

**API Endpoint:** `GET /vista/mag/rpc/mag-get-dicom-queue-list`

---

### `MAG SEND IMAGE`

| Property | Value |
|----------|-------|
| Tag | `MAGSEND` |
| Routine | `MAGROI01` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** QUEUE IMAGE TO A DESTINATION

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MAGIEN | LITERAL | No |
| 2 | QREC | LITERAL | No |
| 3 | PRI | LITERAL | No |
| 4 | TYPE | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-send-image`

---

### `MAG DICOM Q/R CLIENT`

| Property | Value |
|----------|-------|
| Tag | `ENTRY` |
| Routine | `MAGDSTV2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** The DICOM Gateway functions as a surrogate Q/R user (SCU) for the Q/R client operation on VistA.   The Q/R client on VistA is a front-end facade.  The actual Q/R user (SCU) is on the DICOM Gateway.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REQUEST | REFERENCE | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-q/r-client`

---

### `MAG DICOM GET PT SENSITIVITY`

| Property | Value |
|----------|-------|
| Tag | `SCREEN` |
| Routine | `MAGDSTA3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Lookup patients for sensitive or employee screening.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-pt-sensitivity`

---

### `MAG DICOM PATIENT LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `PATLKUP` |
| Routine | `MAGDSTA3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Lookup patient(s) and return PII + sensitivity

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-patient-lookup`

---

### `MAG DICOM PATIENT HISTORY`

| Property | Value |
|----------|-------|
| Tag | `HISTLKUP` |
| Routine | `MAGDSTA3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Look up historical patient changes in the audit archive file (#1.1)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-patient-history`

---

### `MAG DICOM FORMAT PATIENT NAME`

| Property | Value |
|----------|-------|
| Tag | `DCMNAME` |
| Routine | `MAGDSTA3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This returns the patient name in DICOM format.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-format-patient-name`

---

### `MAG DICOM GET PT ID DASHES`

| Property | Value |
|----------|-------|
| Tag | `DASHES` |
| Routine | `MAGDSTA3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Get site-specific information on whether or not dashes are in DICOM Patient ID (0010,0020)

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-pt-id-dashes`

---

### `MAG DICOM GET ACN PREFIX`

| Property | Value |
|----------|-------|
| Tag | `ANPREFIX` |
| Routine | `MAGDSTA3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Get site-specific information on the prefix for manual Q/C client accession number (0008,0050) so that it is automatically entered.

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-acn-prefix`

---

### `MAG GET DICOM FMT PATIENT NAME`

| Property | Value |
|----------|-------|
| Tag | `DCMNAME` |
| Routine | `MAGDRPC1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+   | Property of the US Government.                                |   | No permission to copy or redistribute this software is given. |   | Use of unreleased versions of this software requires the user |   | to execute a written tes

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | DELIM | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-get-dicom-fmt-patient-name`

---

### `MAG DICOM NEW SOP DB LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `NEWSOPDB` |
| Routine | `MAGDRPCD` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** ---------------------------------------------------------------+   | Property of the US Government.                                |   | No permission to copy or redistribute this software is given. |   | Use of unreleased versions of this software requires the user |   | to execute a written test a

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PROCIX | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-new-sop-db-lookup`

---

### `MAG DICOM GET CON SERVICES`

| Property | Value |
|----------|-------|
| Tag | `SERVICES` |
| Routine | `MAGDRPCE` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** The list of consult services in the CLINICAL SPECIALTY DICOM & HL7 file (2006.5831) is returned.

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-con-services`

---

### `MAG DICOM GET CON BY GMRCIEN`

| Property | Value |
|----------|-------|
| Tag | `GMRCIEN` |
| Routine | `MAGDRPCE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+   | Property of the US Government.                                |   | No permission to copy or redistribute this software is given. |   | Use of unreleased versions of this software requires the user |   | to execute a written tes

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMRCIEN | LITERAL | No |
| 2 | SORT ORDER | LITERAL | No |
| 3 | SERVICES | REFERENCE | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-con-by-gmrcien`

---

### `MAG DICOM GET CON IMAGES`

| Property | Value |
|----------|-------|
| Tag | `GMRCMAG` |
| Routine | `MAGDRPCE` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+      | Property of the US Government.                                |      | No permission to copy or redistribute this software is given. |      | Use of unreleased versions of this software requires the user |      | to execut

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMRCIEN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-con-images`

---

### `MAG DICOM GET CON BY DATE`

| Property | Value |
|----------|-------|
| Tag | `GMRCDATE` |
| Routine | `MAGDRPCE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+    | Property of the US Government.                                |    | No permission to copy or redistribute this software is given. |    | Use of unreleased versions of this software requires the user |    | to execute a writte

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SORT ORDER | LITERAL | No |
| 2 | SERVICE | LITERAL | No |
| 3 | STATUS | LITERAL | No |
| 4 | DATE | LITERAL | No |
| 5 | GMRCIEN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-con-by-date`

---

### `MAG DICOM GET CON BY PATIENT`

| Property | Value |
|----------|-------|
| Tag | `GMRCPAT` |
| Routine | `MAGDRPCE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+    | Property of the US Government.                                |    | No permission to copy or redistribute this software is given. |    | Use of unreleased versions of this software requires the user |    | to execute a writte

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SORT ORDER | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | DATE | LITERAL | No |
| 4 | GMRCIEN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-con-by-patient`

---

### `MAG DICOM GET CON DATA`

| Property | Value |
|----------|-------|
| Tag | `GMRCDATA` |
| Routine | `MAGDRPCE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+     | Property of the US Government.                                |     | No permission to copy or redistribute this software is given. |     | Use of unreleased versions of this software requires the user |     | to execute a w

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMRCIEN | LITERAL | No |
| 2 | FIELD | LITERAL | No |
| 3 | FORMAT | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-con-data`

---

### `MAG DICOM GET NEW SOP DB IMAGE`

| Property | Value |
|----------|-------|
| Tag | `IMAGNEW` |
| Routine | `MAGDRPC2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** +---------------------------------------------------------------+   | Property of the US Government.                                |   | No permission to copy or redistribute this software is given. |   | Use of unreleased versions of this software requires the user |   | to execute a written tes

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARTIFACTIX | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-new-sop-db-image`

---

### `MAG DICOM EXPORT QUEUE STATE`

| Property | Value |
|----------|-------|
| Tag | `STATE` |
| Routine | `MAGDRPCF` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** +---------------------------------------------------------------+   | Property of the US Government.                                |   | No permission to copy or redistribute this software is given. |   | Use of unreleased versions of this software requires the user |   | to execute a written tes

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-export-queue-state`

---

### `MAG DICOM EXPORT QUEUE HOLD`

| Property | Value |
|----------|-------|
| Tag | `HOLDREL` |
| Routine | `MAGDRPCF` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** +---------------------------------------------------------------+    | Property of the US Government.                                |    | No permission to copy or redistribute this software is given. |    | Use of unreleased versions of this software requires the user |    | to execute a writte

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STUDYIEN | LITERAL | No |
| 2 | HOLDREL | LITERAL | No |

**API Endpoint:** `POST /vista/mag/rpc/mag-dicom-export-queue-hold`

---

### `MAG DICOM GET LAB PAT LRDFN`

| Property | Value |
|----------|-------|
| Tag | `GETLRDFN` |
| Routine | `MAGDRPCG` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** +---------------------------------------------------------------+     | Property of the US Government.                                |     | No permission to copy or redistribute this software is given. |     | Use of unreleased versions of this software requires the user |     | to execute a w

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | LRSS LIST | REFERENCE | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-lab-pat-lrdfn`

---

### `MAG DICOM GET LAB BY PAT`

| Property | Value |
|----------|-------|
| Tag | `PATIENT` |
| Routine | `MAGDRPCG` |
| Return Type | ARRAY |
| Parameter Count | 5 |

**Description:** +---------------------------------------------------------------+     | Property of the US Government.                                |     | No permission to copy or redistribute this software is given. |     | Use of unreleased versions of this software requires the user |     | to execute a w

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SORT ORDER | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | BEGIN DATE | LITERAL | No |
| 4 | END DATE | LITERAL | No |
| 5 | LRSS LIST | UNKNOWN() | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-lab-by-pat`

---

### `MAG DICOM GET LAB NEXT LRDFN`

| Property | Value |
|----------|-------|
| Tag | `NXTLRDFN` |
| Routine | `MAGDRPCG` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** +---------------------------------------------------------------+      | Property of the US Government.                                |      | No permission to copy or redistribute this software is given. |      | Use of unreleased versions of this software requires the user |      | to execut

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SORT ORDER | LITERAL | No |
| 2 | LRDFN | LITERAL | No |
| 3 | LRSS LIST | REFERENCE | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-lab-next-lrdfn`

---

### `MAG DICOM GET LAB BY DATE`

| Property | Value |
|----------|-------|
| Tag | `DATE` |
| Routine | `MAGDRPCG` |
| Return Type | SINGLE VALUE |
| Parameter Count | 6 |

**Description:** +---------------------------------------------------------------+      | Property of the US Government.                                |      | No permission to copy or redistribute this software is given. |      | Use of unreleased versions of this software requires the user |      | to execut

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SUBSCRIPT LEVEL | LITERAL | No |
| 2 | SORT ORDER | LITERAL | No |
| 3 | LRSS | LITERAL | No |
| 4 | DATE | LITERAL | No |
| 5 | LRDFN | LITERAL | No |
| 6 | LRI | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-lab-by-date`

---

### `MAG DICOM GET LAB IMAGES`

| Property | Value |
|----------|-------|
| Tag | `LOOKUP` |
| Routine | `MAGDRPCG` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Description:** +---------------------------------------------------------------+       | Property of the US Government.                                |       | No permission to copy or redistribute this software is given. |       | Use of unreleased versions of this software requires the user |       | to e

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LRDFN | LITERAL | No |
| 2 | LRSS | LITERAL | No |
| 3 | LRI | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-lab-images`

---

### `MAG DICOM GET LAB PAT DFN`

| Property | Value |
|----------|-------|
| Tag | `GETDFN` |
| Routine | `MAGDRPCG` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** +---------------------------------------------------------------+      | Property of the US Government.                                |      | No permission to copy or redistribute this software is given. |      | Use of unreleased versions of this software requires the user |      | to execut

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LRDFN | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-lab-pat-dfn`

---

### `MAG DICOM LOOKUP CON STUDY`

| Property | Value |
|----------|-------|
| Tag | `CONLKUP` |
| Routine | `MAGDRPCC` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** +---------------------------------------------------------------+   | Property of the US Government.                                |   | No permission to copy or redistribute this software is given. |   | Use of unreleased versions of this software requires the user |   | to execute a written tes

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ACNUMB | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-lookup-con-study`

---

### `MAG DICOM GET XMIT STATS`

| Property | Value |
|----------|-------|
| Tag | `XMITSTAT` |
| Routine | `MAGDRPCC` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** +---------------------------------------------------------------+   | Property of the US Government.                                |   | No permission to copy or redistribute this software is given. |   | Use of unreleased versions of this software requires the user |   | to execute a written tes

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | D0 | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-xmit-stats`

---

### `MAG DICOM GET EXPORT QUEUE STS`

| Property | Value |
|----------|-------|
| Tag | `STATS` |
| Routine | `MAGDRPC9` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Retrieve data from the DICOM OBJECT EXPORT file (#2006.574). This provides real-time feedback on the operation of the Export application.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SITE | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-get-export-queue-sts`

---

### `MAG TELER UPDATES`

| Property | Value |
|----------|-------|
| Tag | `CNSLTS` |
| Routine | `MAGTLRD` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** +---------------------------------------------------------------+  | Property of the US Government.                                |  | No permission to copy or redistribute this software is given. |  | Use of unreleased versions of this software requires the user |  | to execute a written test agr

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FROM | LITERAL | No |
| 2 | SRVCS | LITERAL | No |
| 3 | MAX | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-teler-updates`

---

### `MAG DICOM P350 MAKE LIST`

| Property | Value |
|----------|-------|
| Tag | `ENTRY` |
| Routine | `MAGD350I` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** A problem was caused by patch MAG*3.0*226 (October 2019) which changed the way that Clinical Capture stored DICOM images.   Instead of saving them as DICOM objects, they were stored as raw JPEG images with a *.DCM extension.  These images need to be converted to DICOM and stored as proper DICOM obje

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IMAGE IEN | LITERAL | No |
| 2 | MAX COUNT | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-p350-make-list`

---

### `MAG DICOM P350 GET NEXT TO FIX`

| Property | Value |
|----------|-------|
| Tag | `GETNEXT` |
| Routine | `MAGD350I` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This returns the next entry in ^MAG(2006.5993501) to be fixed.

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-p350-get-next-to-fix`

---

### `MAG DICOM P350 GET BASIC IMAGE`

| Property | Value |
|----------|-------|
| Tag | `IMAGE` |
| Routine | `MAGD350J` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** +---------------------------------------------------------------+   | Property of the US Government.                                |   | No permission to copy or redistribute this software is given. |   | Use of unreleased versions of this software requires the user |   | to execute a written tes

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | D0 | LITERAL | No |
| 2 | ERROR MESSAGE | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-p350-get-basic-image`

---

### `MAG DICOM P350 FIX ONE IMAGE`

| Property | Value |
|----------|-------|
| Tag | `FIXONE` |
| Routine | `MAGD350I` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |

**Description:** +---------------------------------------------------------------+     | Property of the US Government.                                |     | No permission to copy or redistribute this software is given. |     | Use of unreleased versions of this software requires the user |     | to execute a w

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MAGIEN | LITERAL | No |
| 2 | NEW STATUS | LITERAL | No |
| 3 | ERROR MESSAGE | LITERAL | No |
| 4 | SOP INSTANCE UID | LITERAL | No |

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-p350-fix-one-image`

---

### `MAG DICOM P350 FIX FAIL IMAGES`

| Property | Value |
|----------|-------|
| Tag | `FIXFAIL` |
| Routine | `MAGD350I` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** The CLEANUP OF JPEG IMAGES STORED AS DICOM IMAGES file (#2006.59935) is created by MAG*3.0*350.  Errors can occur in the processing of the images. A Storage SCP is needed for processing and if one is not present, the images go into "FAIL" state.   This RPC resets the image state to "UNKNOWN" so that

**API Endpoint:** `GET /vista/mag/rpc/mag-dicom-p350-fix-fail-images`

---

### `MAG DICOM P350 UPDATE FIELDS`

| Property | Value |
|----------|-------|
| Tag | `UPDATE` |
| Routine | `MAGD350I` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** After the DICOM image is acquired and processed, this RPC is used to update field in the IMAGE file (#2005).  The following fields are updated 6 ----- PROCEDURE - copied from original JPEG.DCM IMAGE entry 40 ---- PACKAGE INDEX - copied from original JPEG.DCM IMAGE entry 42 ---- TYPE INDEX - copied f

**API Endpoint:** `POST /vista/mag/rpc/mag-dicom-p350-update-fields`

---


## Menu Options

### Menu

| Name | Security Key |
|------|-------------|
| MAG SYS MENU | MAG SYSTEM |
| MAG DB IQ | — |
| MAG IMAGE INDEX MENU | — |
| MAG IMAGE INDEX UTIL | — |
| MAG REPORT MENU | — |
| MAG IMAGE INDEX VAL MENU | — |
| MAG IMPORTER MENU | — |
| MAG HL7 MAINT | — |
| MAG MANAGE NEW SOP CLASSES | MAG SYSTEM |

### Run routine

| Name | Security Key |
|------|-------------|
| MAG SYS-EDIT NET LOC STATUS | — |
| MAG IMAGE INDEX FILE SETUP | — |
| MAG IMAGE INDEX MAP EDIT | — |
| MAG IMAGE INDEX GEN INDICES | — |
| MAG IMAGE INDEX COMMIT INDICES | — |
| MAG IMAGE INDEX EDIT | — |
| MAG IMAGE INDEX REPORT | — |
| MAG IMAGE INDEX STATUS | — |
| MAG IMAGE INDEX EXPORT | — |
| MAG ENTERPRISE | — |
| MAG SYS-DELETE IMAGEGROUP | — |
| MAG DICOM CORRECT VALIDATE | — |
| MAG INDEX TERMS UPDATE | MAG SYSTEM |
| MAG INDEX TERMS RESTORE | MAG SYSTEM |
| MAG INDEX SPECIALTY | — |
| MAG INDEX PROCEDURE | — |
| MAG IMAGE INDEX VAL CHECK | — |
| MAG IMAGE INDEX VAL FIX | — |
| MAG IMAGE INDEX VAL REVIEW | — |
| MAG CLIENT VERSION REPORT | — |
| MAG BUILD OUT IMG LOC | — |
| MAG CHECK OUT IMG LOC | — |
| MAG DISPLAY IMPORTER | — |
| MAG REBUILD DATE-USER INDICES | — |
| MAG CONFIGURE IHE PACS HL7 I/F | — |
| MAG SYS-DELETE STUDY | MAG DELETE |
| MAG JB OFFLINE | — |
| MAG WORK ITEMS DELETE | — |
| MAG DICOM DISABLE SOP CLASSES | — |
| MAG DICOM ENABLE SOP CLASSES | — |
| MAG DICOM EXPORT RETRY TIMES | — |

### Broker

| Name | Security Key |
|------|-------------|
| MAG WINDOWS | — |
| MAG SYS-WIN WRKS | — |
| MAG DICOM GATEWAY FULL | — |
| MAG DICOM GATEWAY VIEW | — |
| MAG DICOM QUERY RETRIEVE | — |
| MAG UTILITY | — |
| MAG DICOM VISA | — |

### Print

| Name | Security Key |
|------|-------------|
| MAG REPORT 1 | — |
| MAG REPORT 2 | — |
| MAG REPORT 3 | — |
| MAG REPORT 4 | — |

### Edit

| Name | Security Key |
|------|-------------|
| MAG REASON EDIT | — |
| MAG ANATOMIC PATH HL7 SWITCH | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `MAG SYSTEM`
- `MAG DELETE`

## API Route Summary

All routes are prefixed with `/vista/mag/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| POST | `/vista/mag/rpc/mag-consult-msg-create` | MAG CONSULT MSG CREATE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-olu-consult` | MAG OLU CONSULT | ARRAY |
| GET | `/vista/mag/rpc/mag-absjb` | MAG ABSJB | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-get-netloc` | MAG GET NETLOC | ARRAY |
| GET | `/vista/mag/rpc/mag-ekg-online` | MAG EKG ONLINE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-field-validate` | MAG FIELD VALIDATE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-key-validate` | MAG KEY VALIDATE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-patient-vitals` | MAG DICOM GET PATIENT VITALS | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-audit-count` | MAG DICOM AUDIT COUNT | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-audit-purge` | MAG DICOM AUDIT PURGE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-audit-range` | MAG DICOM AUDIT RANGE | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-et-phone-home` | MAG DICOM ET PHONE HOME | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-fileman-get` | MAG DICOM FILEMAN GET | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-find-location` | MAG DICOM FIND LOCATION | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-basic-image` | MAG DICOM GET BASIC IMAGE | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-domain` | MAG DICOM GET DOMAIN | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-highest-hl7` | MAG DICOM GET HIGHEST HL7 | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-image-group` | MAG DICOM GET IMAGE GROUP | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-imaging-types` | MAG DICOM GET IMAGING TYPES | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-next-queue-entry` | MAG DICOM GET NEXT QUEUE ENTRY | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-patient` | MAG DICOM GET PATIENT | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-place` | MAG DICOM GET PLACE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-rad-rpt-info` | MAG DICOM GET RAD RPT INFO | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-service-info` | MAG DICOM GET SERVICE INFO | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-version` | MAG DICOM GET VERSION | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-hl7-pointer-action` | MAG DICOM HL7 POINTER ACTION | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-image-audit-get` | MAG DICOM IMAGE AUDIT GET | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-image-processing` | MAG DICOM IMAGE PROCESSING | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-incorrect-image-ct` | MAG DICOM INCORRECT IMAGE CT | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-list-global-variable` | MAG DICOM LIST GLOBAL VARIABLE | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-lookup-rad-study` | MAG DICOM LOOKUP RAD STUDY | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-lookup-study` | MAG DICOM LOOKUP STUDY | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-network-status` | MAG DICOM NETWORK STATUS | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-pacs-cutoff-date` | MAG DICOM PACS CUTOFF DATE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-pacs-minimum-space` | MAG DICOM PACS MINIMUM SPACE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-purge-hl7` | MAG DICOM PURGE HL7 | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-queue-image` | MAG DICOM QUEUE IMAGE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-queue-init` | MAG DICOM QUEUE INIT | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-route-eval-log` | MAG DICOM ROUTE EVAL LOG | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-route-eval-start` | MAG DICOM ROUTE EVAL START | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-route-eval-stop` | MAG DICOM ROUTE EVAL STOP | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-route-get-purge` | MAG DICOM ROUTE GET PURGE | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-route-get-trans-id` | MAG DICOM ROUTE GET TRANS ID | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-route-list-desti` | MAG DICOM ROUTE LIST DESTI | ARRAY |
| POST | `/vista/mag/rpc/mag-dicom-route-lock-transmit` | MAG DICOM ROUTE LOCK TRANSMIT | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-route-log-xmit` | MAG DICOM ROUTE LOG XMIT | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-route-next-file` | MAG DICOM ROUTE NEXT FILE | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-route-purge-done` | MAG DICOM ROUTE PURGE DONE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-route-remove-obso` | MAG DICOM ROUTE REMOVE OBSO | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-route-requeue` | MAG DICOM ROUTE REQUEUE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-route-status` | MAG DICOM ROUTE STATUS | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-route-transact-sts` | MAG DICOM ROUTE TRANSACT STS | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-route-valid-dest` | MAG DICOM ROUTE VALID DEST | SINGLE VALUE |
| POST | `/vista/mag/rpc/mag-dicom-set-pacs-params` | MAG DICOM SET PACS PARAMS | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-text-audit-get` | MAG DICOM TEXT AUDIT GET | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-text-processing` | MAG DICOM TEXT PROCESSING | ARRAY |
| POST | `/vista/mag/rpc/mag-dicom-update-gateway-name` | MAG DICOM UPDATE GATEWAY NAME | SINGLE VALUE |
| POST | `/vista/mag/rpc/mag-dicom-update-scu-list` | MAG DICOM UPDATE SCU LIST | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-valid-locations` | MAG DICOM VALID LOCATIONS | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-workstation-version` | MAG DICOM WORKSTATION VERSION | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-get-env` | MAG GET ENV | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dirhash` | MAG DIRHASH | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-fld-att` | MAG FLD ATT | ARRAY |
| GET | `/vista/mag/rpc/mag-cfind-query` | MAG CFIND QUERY | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-correct-validate` | MAG DICOM CORRECT VALIDATE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-study-uid-query` | MAG STUDY UID QUERY | ARRAY |
| GET | `/vista/mag/rpc/mag-vista-checksums` | MAG VISTA CHECKSUMS | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-icn` | MAG DICOM GET ICN | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-new-sop-instance-uid` | MAG NEW SOP INSTANCE UID | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-rad-get-next-rpt-by-date` | MAG RAD GET NEXT RPT BY DATE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-rad-get-next-rpt-by-pt` | MAG RAD GET NEXT RPT BY PT | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-con-get-tele-reader` | MAG DICOM CON GET TELE READER | ARRAY |
| POST | `/vista/mag/rpc/mag-dicom-con-set-tele-reader` | MAG DICOM CON SET TELE READER | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-con-unread-acq-sites` | MAG DICOM CON UNREAD ACQ SITES | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-con-unreadlist-get` | MAG DICOM CON UNREADLIST GET | ARRAY |
| POST | `/vista/mag/rpc/mag-dicom-con-unreadlist-lock` | MAG DICOM CON UNREADLIST LOCK | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-check-ae-title` | MAG DICOM CHECK AE TITLE | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-gateway-info` | MAG DICOM GET GATEWAY INFO | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-machine-id` | MAG DICOM GET MACHINE ID | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-uid-root` | MAG DICOM GET UID ROOT | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-uid-table` | MAG DICOM GET UID TABLE | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-store-gateway-info` | MAG DICOM STORE GATEWAY INFO | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-vista-ae-title` | MAG DICOM VISTA AE TITLE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-get-dicom-xmit-origin` | MAG GET DICOM XMIT ORIGIN | ARRAY |
| GET | `/vista/mag/rpc/mag-image-current-info` | MAG IMAGE CURRENT INFO | ARRAY |
| GET | `/vista/mag/rpc/mag-get-sop-class-method` | MAG GET SOP CLASS METHOD | UNKNOWN() |
| GET | `/vista/mag/rpc/mag-broker-security` | MAG BROKER SECURITY | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dod-get-studies-ien` | MAG DOD GET STUDIES IEN | ARRAY |
| GET | `/vista/mag/rpc/mag-dod-get-studies-uid` | MAG DOD GET STUDIES UID | ARRAY |
| GET | `/vista/mag/rpc/mag-scan-image-text-files` | MAG SCAN IMAGE TEXT FILES | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-store-text-file-details` | MAG STORE TEXT FILE DETAILS | SINGLE VALUE |
| POST | `/vista/mag/rpc/mag-dicom-add-camera-equip-rm` | MAG DICOM ADD CAMERA EQUIP RM | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-dfn` | MAG DICOM GET DFN | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-hosp-location` | MAG DICOM GET HOSP LOCATION | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-rad-camera` | MAG DICOM GET RAD CAMERA | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-rad-cpt-mod` | MAG DICOM GET RAD CPT MOD | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-rad-dx-code` | MAG DICOM GET RAD DX CODE | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-rad-film` | MAG DICOM GET RAD FILM | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-rad-info-by-acn` | MAG DICOM GET RAD INFO BY ACN | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-rad-orders` | MAG DICOM GET RAD ORDERS | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-rad-person` | MAG DICOM GET RAD PERSON | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-username` | MAG DICOM GET USERNAME | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-importer-check-uids` | MAG DICOM IMPORTER CHECK UIDS | ARRAY |
| POST | `/vista/mag/rpc/mag-dicom-importer-delete` | MAG DICOM IMPORTER DELETE | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-importer-lookup` | MAG DICOM IMPORTER LOOKUP | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-radiology-modifiers` | MAG DICOM RADIOLOGY MODIFIERS | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-radiology-procedures` | MAG DICOM RADIOLOGY PROCEDURES | ARRAY |
| POST | `/vista/mag/rpc/mag-dicom-set-imaging-location` | MAG DICOM SET IMAGING LOCATION | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-broker-get-visitor` | MAG BROKER GET VISITOR | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-find-image-text-file` | MAG FIND IMAGE TEXT FILE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-storage-fetch` | MAG STORAGE FETCH | ARRAY |
| POST | `/vista/mag/rpc/mag-storage-fetch-set` | MAG STORAGE FETCH SET | ARRAY |
| GET | `/vista/mag/rpc/mag-util-bkonljb` | MAG UTIL BKONLJB | ARRAY |
| GET | `/vista/mag/rpc/mag-util-clnloc` | MAG UTIL CLNLOC | ARRAY |
| GET | `/vista/mag/rpc/mag-util-dt2ien` | MAG UTIL DT2IEN | ARRAY |
| GET | `/vista/mag/rpc/mag-util-getnetloc` | MAG UTIL GETNETLOC | ARRAY |
| GET | `/vista/mag/rpc/mag-util-jboffln` | MAG UTIL JBOFFLN | ARRAY |
| GET | `/vista/mag/rpc/mag-util-lstofljb` | MAG UTIL LSTOFLJB | ARRAY |
| GET | `/vista/mag/rpc/mag-annot-get-image` | MAG ANNOT GET IMAGE | ARRAY |
| GET | `/vista/mag/rpc/mag-annot-get-image-detail` | MAG ANNOT GET IMAGE DETAIL | ARRAY |
| GET | `/vista/mag/rpc/mag-annot-image-allow` | MAG ANNOT IMAGE ALLOW | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-annot-store-image-detail` | MAG ANNOT STORE IMAGE DETAIL | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-agency` | MAG DICOM GET AGENCY | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-event-audit` | MAG EVENT AUDIT | ARRAY |
| GET | `/vista/mag/rpc/mag-fileman-field-atts` | MAG FILEMAN FIELD ATTS | ARRAY |
| GET | `/vista/mag/rpc/mag-fileman-field-list` | MAG FILEMAN FIELD LIST | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-export-image-sts` | MAG DICOM GET EXPORT IMAGE STS | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-process-id` | MAG DICOM GET PROCESS ID | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-ae-entry` | MAG DICOM GET AE ENTRY | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-ae-entry-loc` | MAG DICOM GET AE ENTRY LOC | ARRAY |
| GET | `/vista/mag/rpc/mag-get-dicom-queue-list` | MAG GET DICOM QUEUE LIST | ARRAY |
| GET | `/vista/mag/rpc/mag-send-image` | MAG SEND IMAGE | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-q/r-client` | MAG DICOM Q/R CLIENT | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-pt-sensitivity` | MAG DICOM GET PT SENSITIVITY | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-patient-lookup` | MAG DICOM PATIENT LOOKUP | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-patient-history` | MAG DICOM PATIENT HISTORY | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-format-patient-name` | MAG DICOM FORMAT PATIENT NAME | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-pt-id-dashes` | MAG DICOM GET PT ID DASHES | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-acn-prefix` | MAG DICOM GET ACN PREFIX | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-get-dicom-fmt-patient-name` | MAG GET DICOM FMT PATIENT NAME | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-new-sop-db-lookup` | MAG DICOM NEW SOP DB LOOKUP | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-con-services` | MAG DICOM GET CON SERVICES | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-con-by-gmrcien` | MAG DICOM GET CON BY GMRCIEN | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-con-images` | MAG DICOM GET CON IMAGES | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-con-by-date` | MAG DICOM GET CON BY DATE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-con-by-patient` | MAG DICOM GET CON BY PATIENT | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-con-data` | MAG DICOM GET CON DATA | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-new-sop-db-image` | MAG DICOM GET NEW SOP DB IMAGE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-export-queue-state` | MAG DICOM EXPORT QUEUE STATE | ARRAY |
| POST | `/vista/mag/rpc/mag-dicom-export-queue-hold` | MAG DICOM EXPORT QUEUE HOLD | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-lab-pat-lrdfn` | MAG DICOM GET LAB PAT LRDFN | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-lab-by-pat` | MAG DICOM GET LAB BY PAT | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-lab-next-lrdfn` | MAG DICOM GET LAB NEXT LRDFN | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-lab-by-date` | MAG DICOM GET LAB BY DATE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-get-lab-images` | MAG DICOM GET LAB IMAGES | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-lab-pat-dfn` | MAG DICOM GET LAB PAT DFN | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-lookup-con-study` | MAG DICOM LOOKUP CON STUDY | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-xmit-stats` | MAG DICOM GET XMIT STATS | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-get-export-queue-sts` | MAG DICOM GET EXPORT QUEUE STS | ARRAY |
| GET | `/vista/mag/rpc/mag-teler-updates` | MAG TELER UPDATES | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-p350-make-list` | MAG DICOM P350 MAKE LIST | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-p350-get-next-to-fix` | MAG DICOM P350 GET NEXT TO FIX | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-p350-get-basic-image` | MAG DICOM P350 GET BASIC IMAGE | ARRAY |
| GET | `/vista/mag/rpc/mag-dicom-p350-fix-one-image` | MAG DICOM P350 FIX ONE IMAGE | SINGLE VALUE |
| GET | `/vista/mag/rpc/mag-dicom-p350-fix-fail-images` | MAG DICOM P350 FIX FAIL IMAGES | SINGLE VALUE |
| POST | `/vista/mag/rpc/mag-dicom-p350-update-fields` | MAG DICOM P350 UPDATE FIELDS | SINGLE VALUE |
