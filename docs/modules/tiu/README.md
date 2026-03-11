# Text Integration Utility (TIU)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Progress notes, discharge summaries, document definitions

| Property | Value |
|----------|-------|
| Namespace | `TIU` |
| Tier | 5 |
| FileMan Files | 3 |
| RPCs | 128 |
| Menu Options | 135 |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 8925 | File #8925 | ? | ? |
| 8925.1 | File #8925.1 | ? | ? |
| 8926 | File #8926 | ? | ? |

## Remote Procedure Calls (RPCs)

### `TIU NOTES`

| Property | Value |
|----------|-------|
| Tag | `NOTES` |
| Routine | `TIUSRVLO` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This API gets lists of progress notes for a patient, with optional  parameters for STATUS, EARLY DATE/TIME, and LATE DATE/TIME.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-notes`

---

### `TIU GET RECORD TEXT`

| Property | Value |
|----------|-------|
| Tag | `TGET` |
| Routine | `TIUSRVR1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will get the textual portion of a TIU Document Record.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-record-text`

---

### `TIU SUMMARIES`

| Property | Value |
|----------|-------|
| Tag | `SUMMARY` |
| Routine | `TIUSRVLO` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This API gets lists of Discharge Summaries for a patient, with optional  parameters for STATUS, EARLY DATE/TIME, and LATE DATE/TIME.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-summaries`

---

### `TIU NOTES BY VISIT`

| Property | Value |
|----------|-------|
| Tag | `NOTES` |
| Routine | `TIUSRVLV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This API gets lists of Progress Notes by visit from TIU.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VISIT | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-notes-by-visit`

---

### `TIU SUMMARIES BY VISIT`

| Property | Value |
|----------|-------|
| Tag | `SUMMARY` |
| Routine | `TIUSRVLV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This API returns lists of Discharge Summaries by visit.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VISIT | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-summaries-by-visit`

---

### `TIU GET PN TITLES`

| Property | Value |
|----------|-------|
| Tag | `NOTES` |
| Routine | `TIUSRVD` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This API returns a list of Progress Notes Titles, including a SHORT LIST of preferred titles as defined by the user, and a LONG LIST of all titles defined at the site.

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-pn-titles`

---

### `TIU GET DS TITLES`

| Property | Value |
|----------|-------|
| Tag | `SUMMARY` |
| Routine | `TIUSRVD` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-ds-titles`

---

### `TIU LOAD BOILERPLATE TEXT`

| Property | Value |
|----------|-------|
| Tag | `BLRSHELL` |
| Routine | `TIUSRVD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will load the boilerplate text associated with the selected title, and execute the methods for any objects embedded in the boilerplate text.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TITLE | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | VSTRING | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-load-boilerplate-text`

---

### `TIU SIGN RECORD`

| Property | Value |
|----------|-------|
| Tag | `SIGN` |
| Routine | `TIUSRVP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This API Supports the application of the user's electronic signature to a TIU document while evaluating authorization, and validating the user's electronic signature.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | TIUX | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-sign-record`

---

### `TIU GET PERSONAL PREFERENCES`

| Property | Value |
|----------|-------|
| Tag | `GETPREF` |
| Routine | `TIUSRVR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns Users personal preferences for TIU in the following format:   TIUY = USER [1P] ^ DEFAULT LOCATION [2P] ^ REVIEW SCREEN SORT FIELD [3S] ^     ==>REVIEW SCREEN SORT ORDER [4S] ^ DISPLAY MENUS [5S] ^ PATIENT     ==>SELECTION PREFERENCE [6S] ^ ASK 'Save changes?' AFTER EDIT [7S] ^     ==>ASK SUB

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-personal-preferences`

---

### `TIU UPDATE RECORD`

| Property | Value |
|----------|-------|
| Tag | `UPDATE` |
| Routine | `TIUSRVP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This API updates the record named in the TIUDA parameter, with the information contained in the TIUX(Field #) array.  The body of the modified TIU document should be passed in the TIUX("TEXT",i,0) subscript, where i is the line number (i.e., the "TEXT" node should be ready to MERGE with a word proce

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ERR | LITERAL | No |
| 2 | TIUDA | LITERAL | No |
| 3 | TIUX | REFERENCE | No |
| 4 | SUPPRESS | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-update-record`

---

### `TIU REQUIRES COSIGNATURE`

| Property | Value |
|----------|-------|
| Tag | `REQCOS` |
| Routine | `TIUSRVA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This Boolean RPC simply evaluates whether the current user requires cosignature for TIU DOCUMENTS, and returns a 1 if true, or a 0 if false.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUTYP | LITERAL | No |
| 2 | TIUDA | LITERAL | No |
| 3 | USER | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-requires-cosignature`

---

### `TIU LOAD RECORD FOR EDIT`

| Property | Value |
|----------|-------|
| Tag | `GET4EDIT` |
| Routine | `TIUSRVR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC loads the return array with data in a format consistent with that required by the TIU UPDATE RECORD API.  It should be invoked when the user invokes the Edit action, to load the dialog for editing the document.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | DR  | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-load-record-for-edit`

---

### `TIU DETAILED DISPLAY`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `TIUSRV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Gets details for display of a given record.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-detailed-display`

---

### `TIU CREATE ADDENDUM RECORD`

| Property | Value |
|----------|-------|
| Tag | `MAKEADD` |
| Routine | `TIUSRVP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure allows the creation of addenda to TIU Documents.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | TIUX | REFERENCE | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-create-addendum-record`

---

### `TIU CREATE RECORD`

| Property | Value |
|----------|-------|
| Tag | `MAKE` |
| Routine | `TIUSRVP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 9 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure allows the creation of TIU DOCUMENT records.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | TITLE | LITERAL | No |
| 3 | VDT | LITERAL | No |
| 4 | VLOC | LITERAL | No |
| 5 | VSIT | LITERAL | No |
| 6 | TIUX | REFERENCE | No |
| 7 | VSTR | LITERAL | No |
| 8 | SUPPRESS | LITERAL | No |
| 9 | NOASF | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-create-record`

---

### `TIU DELETE RECORD`

| Property | Value |
|----------|-------|
| Tag | `DELETE` |
| Routine | `TIUSRVP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Deletes TIU Document records...Evaluates authorization.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | TIURSN | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-delete-record`

---

### `TIU PRINT RECORD`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `TIUPD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Allows Printing of TIU Documents on demand.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | TIUIO | LITERAL | No |
| 3 | TIUFLAG | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-print-record`

---

### `TIU GET DOCUMENT PARAMETERS`

| Property | Value |
|----------|-------|
| Tag | `DOCPARM` |
| Routine | `TIUSRVP1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure returns the parameters by which a given document or document type is to be processed.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | TIUTYP | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-document-parameters`

---

### `TIU GET DS URGENCIES`

| Property | Value |
|----------|-------|
| Tag | `URGENCY` |
| Routine | `TIUSRVA` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a set of discharge summary urgencies for use in a long list box.

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-ds-urgencies`

---

### `TIU AUTHORIZATION`

| Property | Value |
|----------|-------|
| Tag | `CANDO` |
| Routine | `TIUSRVA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows the calling application to evaluate privilege to perform any ASU-mediated action on a TIU document.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | TIUACT | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-authorization`

---

### `TIU DOCUMENTS BY CONTEXT`

| Property | Value |
|----------|-------|
| Tag | `CONTEXT` |
| Routine | `TIUSRVLO` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 12 |
| Status | Inactive (may still be callable) |

**Description:** Returns lists of TIU Documents that satisfy the following search criteria:   1 - signed documents (all)    2 - unsigned documents   3 - uncosigned documents 4 - signed documents/author 5 - signed documents/date range

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLASS | LITERAL | No |
| 2 | CONTEXT | LITERAL | No |
| 3 | DFN | LITERAL | No |
| 4 | EARLY | LITERAL | No |
| 5 | LATE | LITERAL | No |
| 6 | PERSON | LITERAL | No |
| 7 | OCCLIM | LITERAL | No |
| 8 | SEQUENCE | LITERAL | No |
| 9 | SHOWADD | LITERAL | No |
| 10 | INCUND | LITERAL | No |
| 11 | SHOW | LITERAL | No |
| 12 | TIUIEN | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-documents-by-context`

---

### `TIU NOTES 16 BIT`

| Property | Value |
|----------|-------|
| Tag | `NOTES` |
| Routine | `TIUSRVLC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This API gets lists of progress notes for a patient, with optional  parameters for STATUS, EARLY DATE/TIME, and LATE DATE/TIME.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-notes-16-bit`

---

### `TIU WHICH SIGNATURE ACTION`

| Property | Value |
|----------|-------|
| Tag | `WHATACT` |
| Routine | `TIUSRVA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC infers whether the user is trying to sign or cosign the docuement in question, and indicates which ASU ACTION the GUI should pass to the TIU AUTHORIZATION RPC.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-which-signature-action`

---

### `TIU IS THIS A CONSULT?`

| Property | Value |
|----------|-------|
| Tag | `ISCNSLT` |
| Routine | `TIUCNSLT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** BOOLEAN RPC which evaluates whether the title indicated is that of a consult.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TITLE | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-is-this-a-consult?`

---

### `TIU LONG LIST OF TITLES`

| Property | Value |
|----------|-------|
| Tag | `LONGLIST` |
| Routine | `TIUSRVD` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC serves data to a longlist of selectable TITLES by CLASS.  e.g., passing the class PROGRESS NOTES will return active Progress Notes titles which the current user is authorized to enter notes under.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLASS | LITERAL | No |
| 2 | FROM | LITERAL | No |
| 3 | DIR | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-long-list-of-titles`

---

### `TIU PERSONAL TITLE LIST`

| Property | Value |
|----------|-------|
| Tag | `PERSLIST` |
| Routine | `TIUSRVD` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure returns the user's list of preferred titles for a given class of documents, along with the default title, if specified.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUZ | LITERAL | No |
| 2 | CLASS | LITERAL | No |
| 3 | INDEX | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-personal-title-list`

---

### `TIU LONG LIST CONSULT TITLES`

| Property | Value |
|----------|-------|
| Tag | `LNGCNSLT` |
| Routine | `TIUSRVD` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC serves data to a longlist of selectable TITLES for CONSULTS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FROM | LITERAL | No |
| 2 | DIR | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-long-list-consult-titles`

---

### `TIU IDENTIFY CONSULTS CLASS`

| Property | Value |
|----------|-------|
| Tag | `CNSLCLAS` |
| Routine | `TIUSRVD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the record number of the class CONSULTS in the TIU DOCUMENT DEFINITION file (#8925.1).

**API Endpoint:** `GET /vista/tiu/rpc/tiu-identify-consults-class`

---

### `TIU GET ADDITIONAL SIGNERS`

| Property | Value |
|----------|-------|
| Tag | `GETSIGNR` |
| Routine | `TIULX` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the list of additional signers currently identified for a given TIU document.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-additional-signers`

---

### `TIU UPDATE ADDITIONAL SIGNERS`

| Property | Value |
|----------|-------|
| Tag | `IDSIGNRS` |
| Routine | `TIULX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC accepts a list of persons, and adds them as additional signers for the document identified by the first parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | TIULIST | REFERENCE | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-update-additional-signers`

---

### `TIU LOCK RECORD`

| Property | Value |
|----------|-------|
| Tag | `LOCK` |
| Routine | `TIUSRVP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will issue an incremental LOCK on the record identified by the TIUDA parameter, returning an integer truth value indicating success or failure in obtaining the LOCK.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-lock-record`

---

### `TIU UNLOCK RECORD`

| Property | Value |
|----------|-------|
| Tag | `UNLOCK` |
| Routine | `TIUSRVP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will decrement the lock on a given TIU Document Record, identified by the TIUDA input parameter. The return value will always be 0.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-unlock-record`

---

### `TIU CAN CHANGE COSIGNER?`

| Property | Value |
|----------|-------|
| Tag | `CANCHCOS` |
| Routine | `TIUSRVA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** BOOLEAN RPC to evaluate user's privilege to modify the expected cosigner,  given the current status of the document, and the user's role with respect  to it.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-can-change-cosigner?`

---

### `TIU JUSTIFY DELETE?`

| Property | Value |
|----------|-------|
| Tag | `NEEDJUST` |
| Routine | `TIUSRVA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** BOOLEAN RPC that evaluates wheter a justification is required for deletion  (e.g., deletion is authorized, but the document has been signed, etc.).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-justify-delete?`

---

### `TIU GET ALERT INFO`

| Property | Value |
|----------|-------|
| Tag | `GETALRT` |
| Routine | `TIUSRVR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Given a TIU XQAID, return the patient and document type for the item being alerted.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XQAID | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-alert-info`

---

### `TIU GET DOC COUNT BY VISIT`

| Property | Value |
|----------|-------|
| Tag | `DOCCNT` |
| Routine | `TIUSRVLV` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure returns the number of documents that are linked to a  particular visit.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VSIT | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-doc-count-by-visit`

---

### `TIU TEMPLATE GETROOTS`

| Property | Value |
|----------|-------|
| Tag | `GETROOTS` |
| Routine | `TIUSRVT` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-template-getroots`

---

### `TIU TEMPLATE GETITEMS`

| Property | Value |
|----------|-------|
| Tag | `GETITEMS` |
| Routine | `TIUSRVT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-template-getitems`

---

### `TIU TEMPLATE GETBOIL`

| Property | Value |
|----------|-------|
| Tag | `GETBOIL` |
| Routine | `TIUSRVT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-template-getboil`

---

### `TIU TEMPLATE GETTEXT`

| Property | Value |
|----------|-------|
| Tag | `GETTEXT` |
| Routine | `TIUSRVT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | VSTR | LITERAL | No |
| 3 | TIUX | REFERENCE | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-template-gettext`

---

### `TIU TEMPLATE ISEDITOR`

| Property | Value |
|----------|-------|
| Tag | `ISEDITOR` |
| Routine | `TIUSRVT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ROOT | LITERAL | No |
| 2 | USER | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-template-iseditor`

---

### `TIU TEMPLATE GETPROOT`

| Property | Value |
|----------|-------|
| Tag | `GETPROOT` |
| Routine | `TIUSRVT` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-template-getproot`

---

### `TIU TEMPLATE LISTOWNR`

| Property | Value |
|----------|-------|
| Tag | `LISTOWNR` |
| Routine | `TIUSRVT` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FROM | UNKNOWN() | No |
| 2 | DIR | UNKNOWN() | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-template-listownr`

---

### `TIU TEMPLATE CREATE/MODIFY`

| Property | Value |
|----------|-------|
| Tag | `SETTMPLT` |
| Routine | `TIUSRVT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure allows creation and update of Templates.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | TIUX | REFERENCE | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-template-create/modify`

---

### `TIU TEMPLATE SET ITEMS`

| Property | Value |
|----------|-------|
| Tag | `SETITEMS` |
| Routine | `TIUSRVT` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will create or update the items for a Group, Class, or Root.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | TIUX | REFERENCE | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-template-set-items`

---

### `TIU GET LIST OF OBJECTS`

| Property | Value |
|----------|-------|
| Tag | `OBJLST` |
| Routine | `TIUSRVT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the list of TIU OBJECTS that the current user may select from.

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-list-of-objects`

---

### `TIU TEMPLATE DELETE`

| Property | Value |
|----------|-------|
| Tag | `DELETE` |
| Routine | `TIUSRVT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will delete orphan entries in the Template file (i.e., only those entries that have been removed from any Groups, Classes, Personal or Shared Root entries).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | REFERENCE | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-template-delete`

---

### `TIU TEMPLATE CHECK BOILERPLATE`

| Property | Value |
|----------|-------|
| Tag | `BPCHECK` |
| Routine | `TIUSRVT` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will evaluate boilerplate passed in the input array, checking to see whether any of the embedded objects are inactive, faulty, or ambiguous.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUX | REFERENCE | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-template-check-boilerplate`

---

### `TIU LINK DOCUMENT TO IMAGE`

| Property | Value |
|----------|-------|
| Tag | `PUTIMAGE` |
| Routine | `TIUSRVPL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC links a document with an image. It will support a many-to-many association between documents and images.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | IMGDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-link-document-to-image`

---

### `TIU REMOVE LINK TO IMAGE`

| Property | Value |
|----------|-------|
| Tag | `DELIMAGE` |
| Routine | `TIUSRVPL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will remove a link between a document and an image. Only valid  links may be removed.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | IMGDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-remove-link-to-image`

---

### `TIU GET ASSOCIATED IMAGES`

| Property | Value |
|----------|-------|
| Tag | `GETILST` |
| Routine | `TIUSRVPL` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Given a Document, get the list of associated images.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-associated-images`

---

### `TIU GET DOCUMENTS FOR IMAGE`

| Property | Value |
|----------|-------|
| Tag | `GETDLST` |
| Routine | `TIUSRVPL` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Given an image, get the list of associated documents.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IMGDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-documents-for-image`

---

### `TIU TEMPLATE ACCESS LEVEL`

| Property | Value |
|----------|-------|
| Tag | `TACCESS` |
| Routine | `TIUSRVT2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-template-access-level`

---

### `TIU GET DOCUMENT TITLE`

| Property | Value |
|----------|-------|
| Tag | `GETTITLE` |
| Routine | `TIUSRVA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure returns the pointer to the TIU DOCUMENT DEFINITION FILE that corresponds to the TITLE of the document identified in the TIUDA parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-document-title`

---

### `TIU GET REQUEST`

| Property | Value |
|----------|-------|
| Tag | `GET1405` |
| Routine | `TIUSRVR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure returns the variable pointer to the REQUESTING PACKAGE REFERENCE (File #8925, Field #1405). This would be the record in the Requesting Package (e.g., Consult/Request Tracking or Surgery) for which the resulting document has been entered in TIU.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-request`

---

### `TIU GET DEFAULT PROVIDER`

| Property | Value |
|----------|-------|
| Tag | `DEFDOC` |
| Routine | `TIUSRVP1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the default provider as specified by the TIU Site Parameter DEFAULT PRIMARY PROVIDER, which has the following allowable values: 0      NONE, DON'T PROMT In which case the call will return 0^ 1      DEFAULT, BY LOCATION In this case, the call will return the default provider for a gi

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HLOC | LITERAL | No |
| 2 | USER | LITERAL | No |
| 3 | TIUIEN | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-default-provider`

---

### `TIU GET SITE PARAMETERS`

| Property | Value |
|----------|-------|
| Tag | `SITEPARM` |
| Routine | `TIUSRVP1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the TIU Parameters for the Division the user is logged in  to.

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-site-parameters`

---

### `TIU IS USER A PROVIDER?`

| Property | Value |
|----------|-------|
| Tag | `ISAPROV` |
| Routine | `TIUSRVP1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This Boolean RPC returns TRUE if the user was a known provider on the date  specified.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER | LITERAL | No |
| 2 | DATE | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-is-user-a-provider?`

---

### `TIU GET PRINT NAME`

| Property | Value |
|----------|-------|
| Tag | `GETPNAME` |
| Routine | `TIUSRVP1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure receives a pointer to the TIU DOCUMENT DEFINITION FILE (#8925.1) and returns a string containing the Print Name of the corresponding Document Definition.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUTYPE | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-print-name`

---

### `TIU WAS THIS SAVED?`

| Property | Value |
|----------|-------|
| Tag | `SAVED` |
| Routine | `TIUSRVP1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This Boolean Remote Procedure will evaluate whether a given document was committed to the database, or whether the user who last edited it was disconnected.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-was-this-saved?`

---

### `TIU LONG LIST BOILERPLATED`

| Property | Value |
|----------|-------|
| Tag | `LONGLIST` |
| Routine | `TIUSRVT1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Used by the GUI to supply a long list of boilerplated titles.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FROM | LITERAL | No |
| 2 | DIR | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-long-list-boilerplated`

---

### `TIU GET BOILERPLATE`

| Property | Value |
|----------|-------|
| Tag | `TITLEBP` |
| Routine | `TIUSRVT1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a titles boilerplate.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-boilerplate`

---

### `TIU TEMPLATE GET DEFAULTS`

| Property | Value |
|----------|-------|
| Tag | `GETDFLT` |
| Routine | `TIUSRVT2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns Default Template Settings

**API Endpoint:** `GET /vista/tiu/rpc/tiu-template-get-defaults`

---

### `TIU TEMPLATE SET DEFAULTS`

| Property | Value |
|----------|-------|
| Tag | `SETDFLT` |
| Routine | `TIUSRVT2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Saves Template Default Settings

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SETTINGS | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-template-set-defaults`

---

### `TIU TEMPLATE GET DESCRIPTION`

| Property | Value |
|----------|-------|
| Tag | `GETDESC` |
| Routine | `TIUSRVT1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a Template's Description

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-template-get-description`

---

### `TIU FIELD LOAD`

| Property | Value |
|----------|-------|
| Tag | `LOAD` |
| Routine | `TIUSRVF` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a single Template Field object

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FLD | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-field-load`

---

### `TIU FIELD LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `TIUSRVF1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns long list array of template fields

**API Endpoint:** `GET /vista/tiu/rpc/tiu-field-list`

---

### `TIU FIELD CAN EDIT`

| Property | Value |
|----------|-------|
| Tag | `CANEDIT` |
| Routine | `TIUSRVF1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns TRUE if the current user is allowed to edit template fields.

**API Endpoint:** `GET /vista/tiu/rpc/tiu-field-can-edit`

---

### `TIU FIELD LOCK`

| Property | Value |
|----------|-------|
| Tag | `LOCK` |
| Routine | `TIUSRVF1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Locks a template field record for editing

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-field-lock`

---

### `TIU FIELD UNLOCK`

| Property | Value |
|----------|-------|
| Tag | `UNLOCK` |
| Routine | `TIUSRVF1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Unlock Template Field

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-field-unlock`

---

### `TIU FIELD SAVE`

| Property | Value |
|----------|-------|
| Tag | `SAVE` |
| Routine | `TIUSRVF` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Saves a single Template Field

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | UNKNOWN() | No |
| 2 | TIUX | REFERENCE | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-field-save`

---

### `TIU FIELD IMPORT`

| Property | Value |
|----------|-------|
| Tag | `IMPORT` |
| Routine | `TIUSRVF` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Imports Template Fields from XML format

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUXML | REFERENCE | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-field-import`

---

### `TIU FIELD EXPORT`

| Property | Value |
|----------|-------|
| Tag | `EXPORT` |
| Routine | `TIUSRVF` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Exports Template Fields in XML format

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FLDS | REFERENCE | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-field-export`

---

### `TIU FIELD LOAD BY IEN`

| Property | Value |
|----------|-------|
| Tag | `LOADIEN` |
| Routine | `TIUSRVF` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a single Template Field object.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FLDIEN | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-field-load-by-ien`

---

### `TIU FIELD NAME IS UNIQUE`

| Property | Value |
|----------|-------|
| Tag | `ISUNIQUE` |
| Routine | `TIUSRVF1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns TRUE if the template field name is unique

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NAME | LITERAL | No |
| 2 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-field-name-is-unique`

---

### `TIU FIELD DELETE`

| Property | Value |
|----------|-------|
| Tag | `DELETE` |
| Routine | `TIUSRVF1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Deletes an entry in the Template Field (8927.1) file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-field-delete`

---

### `TIU REMINDER DIALOGS`

| Property | Value |
|----------|-------|
| Tag | `REMDLGS` |
| Routine | `TIUSRVT2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of reminder dialogs allowed for use as Templates.

**API Endpoint:** `GET /vista/tiu/rpc/tiu-reminder-dialogs`

---

### `TIU REM DLG OK AS TEMPLATE`

| Property | Value |
|----------|-------|
| Tag | `REMDLGOK` |
| Routine | `TIUSRVT2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns TRUE is the passed in reminder dialog is allowed to be used in a TIU Template.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUIEN | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-rem-dlg-ok-as-template`

---

### `TIU FIELD DOLMTEXT`

| Property | Value |
|----------|-------|
| Tag | `DOLMTEXT` |
| Routine | `TIUSRVF1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Reads through an array of text and converts all entries of template fields to their assocaited List Manager text values.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIULIST | REFERENCE | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-field-dolmtext`

---

### `TIU TEMPLATE PERSONAL OBJECTS`

| Property | Value |
|----------|-------|
| Tag | `PERSOBJS` |
| Routine | `TIUSRVT2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list or Patient Data Objects allowed in Personal Templates.

**API Endpoint:** `GET /vista/tiu/rpc/tiu-template-personal-objects`

---

### `TIU ID CAN ATTACH`

| Property | Value |
|----------|-------|
| Tag | `CANATTCH` |
| Routine | `TIUSRVA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This BOOLEAN RPC evaluates the question of whether a particular document may be attached as an entry to an Interdisciplinary Note (i.e., can this document be an ID Child?).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-id-can-attach`

---

### `TIU ID CAN RECEIVE`

| Property | Value |
|----------|-------|
| Tag | `CANRCV` |
| Routine | `TIUSRVA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This BOOLEAN RPC evaluates the question of whether a particular document may receive an entry as an Interdisciplinary Parent Note (i.e., can this document be an ID Parent?).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-id-can-receive`

---

### `TIU ID ATTACH ENTRY`

| Property | Value |
|----------|-------|
| Tag | `IDATTCH` |
| Routine | `TIUSRVP1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will attach a a document as an Interdisciplinary (ID) entry to an ID Parent document.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | TIUDAD | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-id-attach-entry`

---

### `TIU ID DETACH ENTRY`

| Property | Value |
|----------|-------|
| Tag | `IDDTCH` |
| Routine | `TIUSRVP1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This call will remove an ID Entry from an Interdisciplinary Note.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-id-detach-entry`

---

### `TIU TEMPLATE LOCK`

| Property | Value |
|----------|-------|
| Tag | `LOCK` |
| Routine | `TIUSRVT2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Locks Template

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-template-lock`

---

### `TIU TEMPLATE UNLOCK`

| Property | Value |
|----------|-------|
| Tag | `UNLOCK` |
| Routine | `TIUSRVT2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Unlocks a template.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-template-unlock`

---

### `TIU USER CLASS LONG LIST`

| Property | Value |
|----------|-------|
| Tag | `CLSLIST` |
| Routine | `TIUSRVT1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Long List of User Classes

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FROM | UNKNOWN() | No |
| 2 | DIR | UNKNOWN() | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-user-class-long-list`

---

### `TIU DIV AND CLASS INFO`

| Property | Value |
|----------|-------|
| Tag | `USERINFO` |
| Routine | `TIUSRVT1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of Divisions and User Classes for a specific User.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER | UNKNOWN() | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-div-and-class-info`

---

### `TIU TEMPLATE GETLINK`

| Property | Value |
|----------|-------|
| Tag | `GETLINK` |
| Routine | `TIUSRVT1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns template linked to a specific title or reason for request.

**API Endpoint:** `GET /vista/tiu/rpc/tiu-template-getlink`

---

### `TIU TEMPLATE ALL TITLES`

| Property | Value |
|----------|-------|
| Tag | `TITLELST` |
| Routine | `TIUSRVT1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a long list of all active titles.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FROM | LITERAL | No |
| 2 | DIR | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-template-all-titles`

---

### `TIU FIELD CHECK`

| Property | Value |
|----------|-------|
| Tag | `CHKFLD` |
| Routine | `TIUSRVF1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Very similar to IMPORT^TIUSRVF, except does not save template fields. Resolves self referencing loops, and takes into account fields with the same name already saved.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RECSET | REFERENCE | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-field-check`

---

### `TIU FIELD LIST ADD`

| Property | Value |
|----------|-------|
| Tag | `XFLDLD` |
| Routine | `TIUSRVF1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Takes in the XML string, in the format XMLSET(1)=" <TEMPLATE_FIELDS>" and  merges them with the global ^TMP("TIUFLDXML",$J).  If the subscript is 1, then it KILLs the global before it merges.  This routine is used so very large lists of fields can be processed without many calls to the database.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XMLSET | REFERENCE | No |
| 2 | XMLIN | REFERENCE | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-field-list-add`

---

### `TIU FIELD LIST IMPORT`

| Property | Value |
|----------|-------|
| Tag | `LIMPORT` |
| Routine | `TIUSRVF1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Calls the import process for a pre-loaded (into ^TMP) list of template fields.

**API Endpoint:** `GET /vista/tiu/rpc/tiu-field-list-import`

---

### `TIU SET DOCUMENT TEXT`

| Property | Value |
|----------|-------|
| Tag | `SETTEXT` |
| Routine | `TIUSRVPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC buffers the transmittal of text (i.e., the body of TIU Documents) from the Client to the Server. It allows documents of indefinite size to be filed, without risk of an allocate error on the M Server.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | TIUX | REFERENCE | No |
| 3 | SUPPRESS | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-set-document-text`

---

### `TIU SET ADMINISTRATIVE CLOSURE`

| Property | Value |
|----------|-------|
| Tag | `ADMNCLOS` |
| Routine | `TIUSRVPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure sets the file attributes necessary to close a document by administrative action (either manually or by scanning a paper document that doesn't require the signature of an author as a typical TIU Document would).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | MODE | LITERAL | No |
| 3 | PERSON | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-set-administrative-closure`

---

### `TIU IS THIS A CLINPROC?`

| Property | Value |
|----------|-------|
| Tag | `ISCP` |
| Routine | `TIUCP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC evaluates whether or not a Title is under the CLINICAL PROCEDURES Class.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TITLE | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-is-this-a-clinproc?`

---

### `TIU IDENTIFY CLINPROC CLASS`

| Property | Value |
|----------|-------|
| Tag | `CPCLASS` |
| Routine | `TIUCP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC gets the CLINICAL PROCEDURES TIU Document Definition file (#8925.1) IEN.

**API Endpoint:** `GET /vista/tiu/rpc/tiu-identify-clinproc-class`

---

### `TIU LONG LIST CLINPROC TITLES`

| Property | Value |
|----------|-------|
| Tag | `LNGCP` |
| Routine | `TIUCP` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC serves data to a longlist of selectable Titles for CLINICAL PROCEDURES.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FROM | LITERAL | No |
| 2 | DIR | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-long-list-clinproc-titles`

---

### `TIU USER INACTIVE?`

| Property | Value |
|----------|-------|
| Tag | `USRINACT` |
| Routine | `TIUSRVA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** RPC evaluates user's DIUSER status and termination status when selected. Returns 0 if active         1 if inactive

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUUSR | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-user-inactive?`

---

### `TIU ONE VISIT NOTE?`

| Property | Value |
|----------|-------|
| Tag | `TIUVISIT` |
| Routine | `TIUSRVA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Boolean RPC to evaulate if note has a corresponding visit.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDOC | LITERAL | No |
| 2 | TIUDFN | LITERAL | No |
| 3 | TIUVISIT | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-one-visit-note?`

---

### `TIU HAS AUTHOR SIGNED?`

| Property | Value |
|----------|-------|
| Tag | `AUTHSIGN` |
| Routine | `TIUSRVA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Boolean RPC returns a value of 0 if the author has not signed and the user  attempting to sign is the expected co-signer.  Returns a 1 if the  author has signed or the user attempting to sign is NOT the expected  co-signer.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | TIUUSR | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-has-author-signed?`

---

### `TIU GET DOCUMENTS FOR REQUEST`

| Property | Value |
|----------|-------|
| Tag | `GETDOCS` |
| Routine | `TIUSRVLR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This Remote Procedure returns the list of documents associated with a given Request (e.g., Consult Request, or Surgical Case).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OVP | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-documents-for-request`

---

### `TIU IS THIS A SURGERY?`

| Property | Value |
|----------|-------|
| Tag | `ISSURG` |
| Routine | `TIUSROI` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** BOOLEAN RPC which evaluates whether the title indicated is that of a SURGICAL REPORT or PROCEDURE REPORT (NON-O.R.).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TITLE | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-is-this-a-surgery?`

---

### `TIU IDENTIFY SURGERY CLASS`

| Property | Value |
|----------|-------|
| Tag | `SURGCLAS` |
| Routine | `TIUSRVD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the record number of the class identified by the CLNAME parameter in the TIU DOCUMENT DEFINITION file (#8925.1).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLNAME | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-identify-surgery-class`

---

### `TIU LONG LIST SURGERY TITLES`

| Property | Value |
|----------|-------|
| Tag | `LNGSURG` |
| Routine | `TIUSRVD` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This RPC serves data to a longlist of selectable TITLES for the class named in the CLNAME parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FROM | LITERAL | No |
| 2 | DIR | LITERAL | No |
| 3 | CLNAME | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-long-list-surgery-titles`

---

### `TIU ISPRF`

| Property | Value |
|----------|-------|
| Tag | `ISPRFTTL` |
| Routine | `TIUPRF2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is to check to see if the passed in TIU DOCUMENT TITLE IEN is a  Patient Record Flag TITLE.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUTTL | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-isprf`

---

### `TIU GET PRF ACTIONS`

| Property | Value |
|----------|-------|
| Tag | `GETACTS` |
| Routine | `TIUPRF2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC gets the Patient Record Flag History Assignments/Actions for a  Patient/Title Combination.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUTTL | LITERAL | No |
| 2 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-prf-actions`

---

### `TIU LINK TO FLAG`

| Property | Value |
|----------|-------|
| Tag | `LINK` |
| Routine | `TIUPRF2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |

**Description:** This RPC is used to link a Progress Note to a Patient Record Flag

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUIEN | LITERAL | No |
| 2 | PRFIEN | LITERAL | No |
| 3 | ACTIENT | LITERAL | No |
| 4 | DFN | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-link-to-flag`

---

### `TIU GET DOCUMENT STATUS`

| Property | Value |
|----------|-------|
| Tag | `GETSTAT` |
| Routine | `TIUPRF2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC is used to retrieve the Status (8925.6 IEN) of a TIU DOCUMENT.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUIEN | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-document-status`

---

### `TIU GET LINKED PRF NOTES`

| Property | Value |
|----------|-------|
| Tag | `GETNOTES` |
| Routine | `TIUPRF2` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Description:** Returns list of SIGNED, LINKED PRF notes for given patient, for given PRF Title

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PTDFN | LITERAL | No |
| 2 | TIUTTL | LITERAL | No |
| 3 | REVORDER | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-linked-prf-notes`

---

### `TIU GET PRF TITLE`

| Property | Value |
|----------|-------|
| Tag | `GETTITLE` |
| Routine | `TIUPRF2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Returns IEN of the TIU Note Title in file 8925.1 which is associated with given flag for given patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PTDFN | LITERAL | No |
| 2 | FLAGID | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-get-prf-title`

---

### `TIU IS USER A USR PROVIDER`

| Property | Value |
|----------|-------|
| Tag | `USRPROV` |
| Routine | `TIUSRVP1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This Boolean RPC returns TRUE if the user was a member of USR CLASS  PROVIDER on the date specified.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER | LITERAL | No |
| 2 | DATE | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-is-user-a-usr-provider`

---

### `TIU MED GET PATIENT DATA`

| Property | Value |
|----------|-------|
| Tag | `GETPATDT` |
| Routine | `TIUMED1` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns patient data.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDFN | LITERAL | No |
| 2 | TIUSEC | LITERAL | No |
| 3 | TIUGHS | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-med-get-patient-data`

---

### `TIU MED GET HEALTH SUMMARY`

| Property | Value |
|----------|-------|
| Tag | `GETHS` |
| Routine | `TIUMED1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the HEALTH SUMMARY information.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDFN | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-med-get-health-summary`

---

### `TIU MED LAST5`

| Property | Value |
|----------|-------|
| Tag | `LAST5` |
| Routine | `TIUMED1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of patients that match an A9999 identifier.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUID | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-med-last5`

---

### `TIU MED LIST ALL`

| Property | Value |
|----------|-------|
| Tag | `LISTALL` |
| Routine | `TIUMED1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of patients for selection.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUFROM | LITERAL | No |
| 2 | TIUDIR | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-med-list-all`

---

### `TIU MED PATIENT MANAGEMENT`

| Property | Value |
|----------|-------|
| Tag | `PATMAN` |
| Routine | `TIUMED1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the user's level of patient importing via manual entry.

**API Endpoint:** `GET /vista/tiu/rpc/tiu-med-patient-management`

---

### `TIU MED GET PATIENT LISTS`

| Property | Value |
|----------|-------|
| Tag | `PLISTS` |
| Routine | `TIUMED1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of personal patient lists for the current user.

**API Endpoint:** `GET /vista/tiu/rpc/tiu-med-get-patient-lists`

---

### `TIU MED GET LIST DATA`

| Property | Value |
|----------|-------|
| Tag | `PLISTMEM` |
| Routine | `TIUMED1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of patients from a personal list.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIULIST | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-med-get-list-data`

---

### `TIU MED GET OBJECT`

| Property | Value |
|----------|-------|
| Tag | `GETOBJ` |
| Routine | `TIUMED1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the data from a TIU Object.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDFN | LITERAL | No |
| 2 | TIUOBJ | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-med-get-object`

---

### `TIU TEMPLATE GET TEMPLATE`

| Property | Value |
|----------|-------|
| Tag | `GETTMPLT` |
| Routine | `TIUSRVT2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC gets basic attributes of a given TIU Template (file 8927).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-template-get-template`

---

### `TIU CAN PRINT WORK/CHART COPY`

| Property | Value |
|----------|-------|
| Tag | `WORKCHRT` |
| Routine | `TIUSRVA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC evaluates whether a user can print a Document, and if so,  whether the user can print only a Work Copy or may print EITHER a Work  Copy or a Chart Copy. Authorization to print is determined by ASU Business Rules, and what type  of copy by TIU Document Parameter ALLOW CHART PRINT OUTSIDE MAS

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-can-print-work/chart-copy`

---

### `TIU MED GET VERSION`

| Property | Value |
|----------|-------|
| Tag | `GUIVER` |
| Routine | `TIUMED1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This call returns what MED GUI version is stored in the PARAMETERS file    as the current version.

**API Endpoint:** `GET /vista/tiu/rpc/tiu-med-get-version`

---

### `TIU LOAD RECORD TEXT`

| Property | Value |
|----------|-------|
| Tag | `CPGT4EDT` |
| Routine | `TIUSRVR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the text (body) of a TIU Note. It is based on the TIU LOAD RECORD FOR EDIT RPC.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-load-record-text`

---

### `TIU ANCILLARY PACKAGE MESSAGE`

| Property | Value |
|----------|-------|
| Tag | `ANPKGMSG` |
| Routine | `TIUSRVP` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure returns messages generated from other packages that  contain data associated with a document.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |
| 2 | TIUACT | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-ancillary-package-message`

---

### `TIU LINK SECONDARY VISIT`

| Property | Value |
|----------|-------|
| Tag | `LNKSVST` |
| Routine | `TIUPXAP3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure will link a given visit with a service category of  DAILY HOSPITALIZATION to a document's SECONDARY VISIT field. If the  document has a parent, this remote procedure will link it to the same  visit via its SECONDARY VISIT field.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDFN | LITERAL | No |
| 2 | TIUDA | LITERAL | No |
| 3 | TIUVSTR | LITERAL | No |

**API Endpoint:** `GET /vista/tiu/rpc/tiu-link-secondary-visit`

---

### `TIU NEED TO SIGN?`

| Property | Value |
|----------|-------|
| Tag | `NDTOSIGN` |
| Routine | `TIUSRVA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** DOES THE CURRENT USER NEED TO SIGN THIS DOCUMENT?

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `POST /vista/tiu/rpc/tiu-need-to-sign?`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| DFN: | TIU NOTES | DFN | LITERAL | rpc |
| TIUDA: | TIU GET RECORD TEXT | TIUDA | LITERAL | rpc |
| DFN: | TIU SUMMARIES | DFN | LITERAL | rpc |
| VISIT: | TIU NOTES BY VISIT | VISIT | LITERAL | rpc |
| VISIT: | TIU SUMMARIES BY VISIT | VISIT | LITERAL | rpc |
| TITLE: | TIU LOAD BOILERPLATE TEXT | TITLE | LITERAL | rpc |
| DFN: | TIU LOAD BOILERPLATE TEXT | DFN | LITERAL | rpc |
| VSTRING: | TIU LOAD BOILERPLATE TEXT | VSTRING | LITERAL | rpc |
| TIUDA: | TIU SIGN RECORD | TIUDA | LITERAL | rpc |
| TIUX: | TIU SIGN RECORD | TIUX | LITERAL | rpc |
| USER: | TIU GET PERSONAL PREFERENCES | USER | LITERAL | rpc |
| ERR: | TIU UPDATE RECORD | ERR | LITERAL | rpc |
| TIUDA: | TIU UPDATE RECORD | TIUDA | LITERAL | rpc |
| TIUX: | TIU UPDATE RECORD | TIUX | REFERENCE | rpc |
| SUPPRESS: | TIU UPDATE RECORD | SUPPRESS | LITERAL | rpc |
| TIUTYP: | TIU REQUIRES COSIGNATURE | TIUTYP | LITERAL | rpc |
| TIUDA: | TIU REQUIRES COSIGNATURE | TIUDA | LITERAL | rpc |
| USER: | TIU REQUIRES COSIGNATURE | USER | LITERAL | rpc |
| TIUDA: | TIU LOAD RECORD FOR EDIT | TIUDA | LITERAL | rpc |
| DR : | TIU LOAD RECORD FOR EDIT | DR  | LITERAL | rpc |
| TIUDA: | TIU DETAILED DISPLAY | TIUDA | LITERAL | rpc |
| TIUDA: | TIU CREATE ADDENDUM RECORD | TIUDA | LITERAL | rpc |
| TIUX: | TIU CREATE ADDENDUM RECORD | TIUX | REFERENCE | rpc |
| DFN: | TIU CREATE RECORD | DFN | LITERAL | rpc |
| TITLE: | TIU CREATE RECORD | TITLE | LITERAL | rpc |
| VDT: | TIU CREATE RECORD | VDT | LITERAL | rpc |
| VLOC: | TIU CREATE RECORD | VLOC | LITERAL | rpc |
| VSIT: | TIU CREATE RECORD | VSIT | LITERAL | rpc |
| TIUX: | TIU CREATE RECORD | TIUX | REFERENCE | rpc |
| VSTR: | TIU CREATE RECORD | VSTR | LITERAL | rpc |
| SUPPRESS: | TIU CREATE RECORD | SUPPRESS | LITERAL | rpc |
| NOASF: | TIU CREATE RECORD | NOASF | LITERAL | rpc |
| TIUDA: | TIU DELETE RECORD | TIUDA | LITERAL | rpc |
| TIURSN: | TIU DELETE RECORD | TIURSN | LITERAL | rpc |
| TIUDA: | TIU PRINT RECORD | TIUDA | LITERAL | rpc |
| TIUIO: | TIU PRINT RECORD | TIUIO | LITERAL | rpc |
| TIUFLAG: | TIU PRINT RECORD | TIUFLAG | LITERAL | rpc |
| TIUDA: | TIU GET DOCUMENT PARAMETERS | TIUDA | LITERAL | rpc |
| TIUTYP: | TIU GET DOCUMENT PARAMETERS | TIUTYP | LITERAL | rpc |
| TIUDA: | TIU AUTHORIZATION | TIUDA | LITERAL | rpc |
| TIUACT: | TIU AUTHORIZATION | TIUACT | LITERAL | rpc |
| CLASS: | TIU DOCUMENTS BY CONTEXT | CLASS | LITERAL | rpc |
| CONTEXT: | TIU DOCUMENTS BY CONTEXT | CONTEXT | LITERAL | rpc |
| DFN: | TIU DOCUMENTS BY CONTEXT | DFN | LITERAL | rpc |
| EARLY: | TIU DOCUMENTS BY CONTEXT | EARLY | LITERAL | rpc |
| LATE: | TIU DOCUMENTS BY CONTEXT | LATE | LITERAL | rpc |
| PERSON: | TIU DOCUMENTS BY CONTEXT | PERSON | LITERAL | rpc |
| OCCLIM: | TIU DOCUMENTS BY CONTEXT | OCCLIM | LITERAL | rpc |
| SEQUENCE: | TIU DOCUMENTS BY CONTEXT | SEQUENCE | LITERAL | rpc |
| SHOWADD: | TIU DOCUMENTS BY CONTEXT | SHOWADD | LITERAL | rpc |
| INCUND: | TIU DOCUMENTS BY CONTEXT | INCUND | LITERAL | rpc |
| SHOW: | TIU DOCUMENTS BY CONTEXT | SHOW | LITERAL | rpc |
| TIUIEN: | TIU DOCUMENTS BY CONTEXT | TIUIEN | LITERAL | rpc |
| DFN: | TIU NOTES 16 BIT | DFN | LITERAL | rpc |
| TIUDA: | TIU WHICH SIGNATURE ACTION | TIUDA | LITERAL | rpc |
| TITLE: | TIU IS THIS A CONSULT? | TITLE | LITERAL | rpc |
| CLASS: | TIU LONG LIST OF TITLES | CLASS | LITERAL | rpc |
| FROM: | TIU LONG LIST OF TITLES | FROM | LITERAL | rpc |
| DIR: | TIU LONG LIST OF TITLES | DIR | LITERAL | rpc |
| DUZ: | TIU PERSONAL TITLE LIST | DUZ | LITERAL | rpc |
| CLASS: | TIU PERSONAL TITLE LIST | CLASS | LITERAL | rpc |
| INDEX: | TIU PERSONAL TITLE LIST | INDEX | LITERAL | rpc |
| FROM: | TIU LONG LIST CONSULT TITLES | FROM | LITERAL | rpc |
| DIR: | TIU LONG LIST CONSULT TITLES | DIR | LITERAL | rpc |
| TIUDA: | TIU GET ADDITIONAL SIGNERS | TIUDA | LITERAL | rpc |
| TIUDA: | TIU UPDATE ADDITIONAL SIGNERS | TIUDA | LITERAL | rpc |
| TIULIST: | TIU UPDATE ADDITIONAL SIGNERS | TIULIST | REFERENCE | rpc |
| TIUDA: | TIU LOCK RECORD | TIUDA | LITERAL | rpc |
| TIUDA: | TIU UNLOCK RECORD | TIUDA | LITERAL | rpc |
| TIUDA: | TIU CAN CHANGE COSIGNER? | TIUDA | LITERAL | rpc |
| TIUDA: | TIU JUSTIFY DELETE? | TIUDA | LITERAL | rpc |
| XQAID: | TIU GET ALERT INFO | XQAID | LITERAL | rpc |
| VSIT: | TIU GET DOC COUNT BY VISIT | VSIT | LITERAL | rpc |
| USER: | TIU TEMPLATE GETROOTS | USER | LITERAL | rpc |
| TIUDA: | TIU TEMPLATE GETITEMS | TIUDA | LITERAL | rpc |
| TIUDA: | TIU TEMPLATE GETBOIL | TIUDA | LITERAL | rpc |
| DFN: | TIU TEMPLATE GETTEXT | DFN | LITERAL | rpc |
| VSTR: | TIU TEMPLATE GETTEXT | VSTR | LITERAL | rpc |
| TIUX: | TIU TEMPLATE GETTEXT | TIUX | REFERENCE | rpc |
| ROOT: | TIU TEMPLATE ISEDITOR | ROOT | LITERAL | rpc |
| USER: | TIU TEMPLATE ISEDITOR | USER | LITERAL | rpc |
| USER: | TIU TEMPLATE GETPROOT | USER | LITERAL | rpc |
| FROM: | TIU TEMPLATE LISTOWNR | FROM | UNKNOWN() | rpc |
| DIR: | TIU TEMPLATE LISTOWNR | DIR | UNKNOWN() | rpc |
| TIUDA: | TIU TEMPLATE CREATE/MODIFY | TIUDA | LITERAL | rpc |
| TIUX: | TIU TEMPLATE CREATE/MODIFY | TIUX | REFERENCE | rpc |
| TIUDA: | TIU TEMPLATE SET ITEMS | TIUDA | LITERAL | rpc |
| TIUX: | TIU TEMPLATE SET ITEMS | TIUX | REFERENCE | rpc |
| TIUDA: | TIU TEMPLATE DELETE | TIUDA | REFERENCE | rpc |
| TIUX: | TIU TEMPLATE CHECK BOILERPLATE | TIUX | REFERENCE | rpc |
| TIUDA: | TIU LINK DOCUMENT TO IMAGE | TIUDA | LITERAL | rpc |
| IMGDA: | TIU LINK DOCUMENT TO IMAGE | IMGDA | LITERAL | rpc |

## Menu Options

### Action

| Name | Security Key |
|------|-------------|
| TIU REVIEW SCREEN CLINICIAN | — |
| TIU BROWSE DOCUMENT CLINICIAN | — |
| TIU ENTER/EDIT | — |
| TIU REVIEW UNSIGNED | — |
| TIU REVIEW SCREEN MIS MANAGER | — |
| TIU REVIEW SCREEN MRT | — |
| TIU REVIEW SCREEN READ ONLY | — |
| TIU BROWSE DOCUMENT MGR | — |
| TIU BROWSE DOCUMENT MRT | — |
| TIU BROWSE DOCUMENT READ ONLY | — |
| TIU UPLOAD DOCUMENTS | — |
| TIU UPLOAD HELP | — |
| TIU ENTER/EDIT PN | — |
| TIU REVIEW PN CLINICIAN | — |
| TIU BROWSE PN CLINICIAN | — |
| TIU REVIEW PN UNSIGNED | — |
| TIU BROWSE DS CLINICIAN | — |
| TIU REVIEW DS CLINICIAN | — |
| TIU REVIEW DS UNSIGNED | — |
| TIU ENTER/EDIT DS | — |
| TIU UPLOAD PARAMETER EDIT | — |
| TIU BASIC PARAMETER EDIT | — |
| TIU REVIEW FILING EVENTS | — |
| TIU PREFERRED DOCUMENT LIST | — |
| TIU PERSONAL PREFERENCES | — |
| TIU DISCHARGE SUMMARY CONVERT | — |
| TIU ENTER/EDIT TRANSCRIBER | — |
| TIU GMRPN SINGLE | — |
| TIU LIST NOTES BY TITLE | — |
| TIU BROWSE DS MRT | — |
| TIU BROWSE PN MRT | — |
| TIU BROWSE DS MGR | — |
| TIU BROWSE PN MGR | — |
| TIU DOCUMENT PARAMETER EDIT | — |
| TIU SEARCH LIST MGR | — |
| TIU SEARCH LIST MRT | — |
| TIU NIGHTLY TASK | — |
| TIU SEARCH BY PATIENT/TITLE | — |
| TIU OE/RR REVIEW PROG NOTES | — |
| TIU DEFINE CONSULTS | — |
| TIU GMRD CONVERT SINGLE | — |
| TIU GMRPN FINAL | — |
| TIU RE-INDEX DOCUMENT FILE | — |
| TIU TEMPLATE USER DELETE | — |
| TIU TEMPLATE CAC USER DELETE | — |
| TIU TEMPLATE USER DELETE PARAM | — |
| TIU TEMPLATE DELETE TERM ALL | — |
| TIU REVIEW UNDICTATED DOCS | — |
| TIU REVIEW UNTRANSCRIBED DOCS | — |
| TIU BROWSE DOC TRANSCRIPTION | — |
| TIU REVIEW MRT ADD SGNR | — |
| TIU REVIEW UNSIGNED ADDSIG | — |
| TIU MAP ACTIVE LOCAL TITLES | — |
| TIU MAP SELECTED LOCAL TITLES | — |
| TIU MAPPING WORKBENCH | — |
| TIU VBC LINE COUNT REPORT | — |

### Menu

| Name | Security Key |
|------|-------------|
| TIU MAIN MENU MIXED CLINICIAN | — |
| TIU MAIN MENU MRT | — |
| TIU MAIN MENU MGR | — |
| TIU MAIN MENU TRANSCRIPTION | — |
| TIU MAIN MENU REMOTE USER | — |
| TIU GMRPN CONVERSION | — |
| TIU PRINT PN | — |
| TIU UPLOAD MENU | — |
| TIU MAIN MENU PN CLINICIAN | — |
| TIU MAIN MENU DS CLINICIAN | — |
| TIU MAIN MENU CLINICIAN | — |
| TIU SET-UP MENU | — |
| TIU PERSONAL PREFERENCE MENU | — |
| TIU PRINT PN USER MENU | — |
| TIU PRINT PN MAS MENU | — |
| TIU BRIEF DS MENU | — |
| TIU STATISTICAL REPORTS | — |
| TIU IRM MAINTENANCE MENU | — |
| TIU CONVERSIONS MENU | — |
| TIU GMRD CONVERSION MENU | — |
| TIU IRM TEMPLATE MGMT | — |
| TIU MAP TITLES MENU | — |
| TIU MAPPING SYNONYMS | — |
| TIU HT MENU | — |

### Run routine

| Name | Security Key |
|------|-------------|
| TIU GMRPN CONVERT | — |
| TIU GMRPN RESTART | — |
| TIU PRINT PN PT | — |
| TIU PRINT PN AUTHOR | — |
| TIU PRINT PN LOC | — |
| TIU PRINT PN WARD | — |
| TIU PRINT PN OUTPT LOC | — |
| TIU PRINT PN BATCH SCHEDULED | — |
| TIU PRINT PN BATCH INTERACTIVE | — |
| TIU PRINT PN ADMISSION | — |
| TIU GMRPN MONITOR | — |
| TIU PRINT PN LOC PARAMS | — |
| TIU PRINT PN DIV PARAMS | — |
| TIU GMRPN HALT | — |
| TIU GMRPN TITLES | — |
| TIU ALERT TOOLS | — |
| TIU UNSIGNED/UNCOSIGNED REPORT | — |
| TIU MISSING TEXT NODE | — |
| TIU REASSIGNMENT REPORT | — |
| TIU MISSING TEXT CLEAN | TIU MISSING TEXT CLEAN |
| TIU SIGNED PN UNSIGNED STATUS | — |
| TIU SIGNED/UNSIGNED PN | — |
| TIU UNK ADDENDA MENU | — |
| TIU MISSING EXPECTED COSIGNER | — |
| TIU MISSING COSIGNER NITE JOB | — |
| TIU ACTIVE TITLE CLEANUP | — |
| TIU MARK SIGNED BY SURROGATE | — |
| TIU MISMATCHED ID NOTES | — |
| TIU MAPPING SMD SYNONYMS | — |
| TIU MAPPING ROLE SYNONYMS | — |
| TIU MAPPING SETTING SYNONYMS | — |
| TIU MAPPING SERVICE SYNONYMS | — |
| TIU MAPPING DOC TYPE SYNONYMS | — |
| TIU MED MANAGEMENT | TIU MED MGT |
| TIU MED DEL PARM | — |
| TIU CWAD AUTO-DEMOTION | — |
| TIU ABBV LIST | — |
| TIU ABBV ENTER EDIT | — |
| TIU DOWNTIME BOOKMARK PN | — |
| TIU TEMPLATE CONSULT LOCK | — |
| TIU COPY/PASTE TRACKING REPORT | — |
| TIU ANALYZE/UPDATE FILE 8927 | — |
| TIU ADD SIGN UTIL | — |
| TIU FM AUDIT VIEWER | — |

### Edit

| Name | Security Key |
|------|-------------|
| TIU DOCUMENT DEFINITION EDIT | — |
| TIU TEXT EVENT EDIT | — |

### Print

| Name | Security Key |
|------|-------------|
| TIU RELEASED/UNVERIFIED REPORT | — |
| TIU LINE COUNT BY AUTHOR | — |
| TIU DS LINE COUNT BY AUTHOR | — |
| TIU DS LINE COUNT BY TRANSCR | — |
| TIU DS LINE COUNT BY SERVICE | — |
| TIU HT VERIFY TITLES | — |
| TIU HT TITLE MAPPINGS | — |

### Other()

| Name | Security Key |
|------|-------------|
| TIU MAIN MENU MIS | — |

### Broker

| Name | Security Key |
|------|-------------|
| TIU MED GUI RPC V2 | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `TIU MISSING TEXT CLEAN`
- `TIU MED MGT`

## API Route Summary

All routes are prefixed with `/vista/tiu/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/tiu/rpc/tiu-notes` | TIU NOTES | GLOBAL ARRAY |
| GET | `/vista/tiu/rpc/tiu-get-record-text` | TIU GET RECORD TEXT | GLOBAL ARRAY |
| GET | `/vista/tiu/rpc/tiu-summaries` | TIU SUMMARIES | GLOBAL ARRAY |
| GET | `/vista/tiu/rpc/tiu-notes-by-visit` | TIU NOTES BY VISIT | GLOBAL ARRAY |
| GET | `/vista/tiu/rpc/tiu-summaries-by-visit` | TIU SUMMARIES BY VISIT | GLOBAL ARRAY |
| GET | `/vista/tiu/rpc/tiu-get-pn-titles` | TIU GET PN TITLES | ARRAY |
| GET | `/vista/tiu/rpc/tiu-get-ds-titles` | TIU GET DS TITLES | ARRAY |
| GET | `/vista/tiu/rpc/tiu-load-boilerplate-text` | TIU LOAD BOILERPLATE TEXT | GLOBAL ARRAY |
| POST | `/vista/tiu/rpc/tiu-sign-record` | TIU SIGN RECORD | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-get-personal-preferences` | TIU GET PERSONAL PREFERENCES | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-update-record` | TIU UPDATE RECORD | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-requires-cosignature` | TIU REQUIRES COSIGNATURE | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-load-record-for-edit` | TIU LOAD RECORD FOR EDIT | GLOBAL ARRAY |
| GET | `/vista/tiu/rpc/tiu-detailed-display` | TIU DETAILED DISPLAY | GLOBAL ARRAY |
| POST | `/vista/tiu/rpc/tiu-create-addendum-record` | TIU CREATE ADDENDUM RECORD | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-create-record` | TIU CREATE RECORD | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-delete-record` | TIU DELETE RECORD | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-print-record` | TIU PRINT RECORD | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-get-document-parameters` | TIU GET DOCUMENT PARAMETERS | ARRAY |
| GET | `/vista/tiu/rpc/tiu-get-ds-urgencies` | TIU GET DS URGENCIES | ARRAY |
| GET | `/vista/tiu/rpc/tiu-authorization` | TIU AUTHORIZATION | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-documents-by-context` | TIU DOCUMENTS BY CONTEXT | GLOBAL ARRAY |
| GET | `/vista/tiu/rpc/tiu-notes-16-bit` | TIU NOTES 16 BIT | GLOBAL ARRAY |
| GET | `/vista/tiu/rpc/tiu-which-signature-action` | TIU WHICH SIGNATURE ACTION | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-is-this-a-consult?` | TIU IS THIS A CONSULT? | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-long-list-of-titles` | TIU LONG LIST OF TITLES | ARRAY |
| GET | `/vista/tiu/rpc/tiu-personal-title-list` | TIU PERSONAL TITLE LIST | ARRAY |
| GET | `/vista/tiu/rpc/tiu-long-list-consult-titles` | TIU LONG LIST CONSULT TITLES | ARRAY |
| GET | `/vista/tiu/rpc/tiu-identify-consults-class` | TIU IDENTIFY CONSULTS CLASS | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-get-additional-signers` | TIU GET ADDITIONAL SIGNERS | ARRAY |
| POST | `/vista/tiu/rpc/tiu-update-additional-signers` | TIU UPDATE ADDITIONAL SIGNERS | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-lock-record` | TIU LOCK RECORD | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-unlock-record` | TIU UNLOCK RECORD | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-can-change-cosigner?` | TIU CAN CHANGE COSIGNER? | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-justify-delete?` | TIU JUSTIFY DELETE? | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-get-alert-info` | TIU GET ALERT INFO | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-get-doc-count-by-visit` | TIU GET DOC COUNT BY VISIT | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-template-getroots` | TIU TEMPLATE GETROOTS | ARRAY |
| GET | `/vista/tiu/rpc/tiu-template-getitems` | TIU TEMPLATE GETITEMS | GLOBAL ARRAY |
| GET | `/vista/tiu/rpc/tiu-template-getboil` | TIU TEMPLATE GETBOIL | GLOBAL ARRAY |
| GET | `/vista/tiu/rpc/tiu-template-gettext` | TIU TEMPLATE GETTEXT | GLOBAL ARRAY |
| GET | `/vista/tiu/rpc/tiu-template-iseditor` | TIU TEMPLATE ISEDITOR | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-template-getproot` | TIU TEMPLATE GETPROOT | ARRAY |
| GET | `/vista/tiu/rpc/tiu-template-listownr` | TIU TEMPLATE LISTOWNR | ARRAY |
| POST | `/vista/tiu/rpc/tiu-template-create/modify` | TIU TEMPLATE CREATE/MODIFY | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-template-set-items` | TIU TEMPLATE SET ITEMS | ARRAY |
| GET | `/vista/tiu/rpc/tiu-get-list-of-objects` | TIU GET LIST OF OBJECTS | GLOBAL ARRAY |
| POST | `/vista/tiu/rpc/tiu-template-delete` | TIU TEMPLATE DELETE | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-template-check-boilerplate` | TIU TEMPLATE CHECK BOILERPLATE | ARRAY |
| GET | `/vista/tiu/rpc/tiu-link-document-to-image` | TIU LINK DOCUMENT TO IMAGE | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-remove-link-to-image` | TIU REMOVE LINK TO IMAGE | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-get-associated-images` | TIU GET ASSOCIATED IMAGES | ARRAY |
| GET | `/vista/tiu/rpc/tiu-get-documents-for-image` | TIU GET DOCUMENTS FOR IMAGE | ARRAY |
| GET | `/vista/tiu/rpc/tiu-template-access-level` | TIU TEMPLATE ACCESS LEVEL | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-get-document-title` | TIU GET DOCUMENT TITLE | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-get-request` | TIU GET REQUEST | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-get-default-provider` | TIU GET DEFAULT PROVIDER | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-get-site-parameters` | TIU GET SITE PARAMETERS | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-is-user-a-provider?` | TIU IS USER A PROVIDER? | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-get-print-name` | TIU GET PRINT NAME | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-was-this-saved?` | TIU WAS THIS SAVED? | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-long-list-boilerplated` | TIU LONG LIST BOILERPLATED | ARRAY |
| GET | `/vista/tiu/rpc/tiu-get-boilerplate` | TIU GET BOILERPLATE | ARRAY |
| GET | `/vista/tiu/rpc/tiu-template-get-defaults` | TIU TEMPLATE GET DEFAULTS | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-template-set-defaults` | TIU TEMPLATE SET DEFAULTS | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-template-get-description` | TIU TEMPLATE GET DESCRIPTION | ARRAY |
| GET | `/vista/tiu/rpc/tiu-field-load` | TIU FIELD LOAD | ARRAY |
| GET | `/vista/tiu/rpc/tiu-field-list` | TIU FIELD LIST | ARRAY |
| GET | `/vista/tiu/rpc/tiu-field-can-edit` | TIU FIELD CAN EDIT | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-field-lock` | TIU FIELD LOCK | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-field-unlock` | TIU FIELD UNLOCK | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-field-save` | TIU FIELD SAVE | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-field-import` | TIU FIELD IMPORT | ARRAY |
| GET | `/vista/tiu/rpc/tiu-field-export` | TIU FIELD EXPORT | ARRAY |
| GET | `/vista/tiu/rpc/tiu-field-load-by-ien` | TIU FIELD LOAD BY IEN | ARRAY |
| GET | `/vista/tiu/rpc/tiu-field-name-is-unique` | TIU FIELD NAME IS UNIQUE | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-field-delete` | TIU FIELD DELETE | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-reminder-dialogs` | TIU REMINDER DIALOGS | ARRAY |
| GET | `/vista/tiu/rpc/tiu-rem-dlg-ok-as-template` | TIU REM DLG OK AS TEMPLATE | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-field-dolmtext` | TIU FIELD DOLMTEXT | ARRAY |
| GET | `/vista/tiu/rpc/tiu-template-personal-objects` | TIU TEMPLATE PERSONAL OBJECTS | ARRAY |
| GET | `/vista/tiu/rpc/tiu-id-can-attach` | TIU ID CAN ATTACH | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-id-can-receive` | TIU ID CAN RECEIVE | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-id-attach-entry` | TIU ID ATTACH ENTRY | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-id-detach-entry` | TIU ID DETACH ENTRY | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-template-lock` | TIU TEMPLATE LOCK | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-template-unlock` | TIU TEMPLATE UNLOCK | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-user-class-long-list` | TIU USER CLASS LONG LIST | ARRAY |
| GET | `/vista/tiu/rpc/tiu-div-and-class-info` | TIU DIV AND CLASS INFO | ARRAY |
| GET | `/vista/tiu/rpc/tiu-template-getlink` | TIU TEMPLATE GETLINK | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-template-all-titles` | TIU TEMPLATE ALL TITLES | ARRAY |
| GET | `/vista/tiu/rpc/tiu-field-check` | TIU FIELD CHECK | ARRAY |
| POST | `/vista/tiu/rpc/tiu-field-list-add` | TIU FIELD LIST ADD | ARRAY |
| GET | `/vista/tiu/rpc/tiu-field-list-import` | TIU FIELD LIST IMPORT | ARRAY |
| POST | `/vista/tiu/rpc/tiu-set-document-text` | TIU SET DOCUMENT TEXT | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-set-administrative-closure` | TIU SET ADMINISTRATIVE CLOSURE | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-is-this-a-clinproc?` | TIU IS THIS A CLINPROC? | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-identify-clinproc-class` | TIU IDENTIFY CLINPROC CLASS | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-long-list-clinproc-titles` | TIU LONG LIST CLINPROC TITLES | ARRAY |
| GET | `/vista/tiu/rpc/tiu-user-inactive?` | TIU USER INACTIVE? | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-one-visit-note?` | TIU ONE VISIT NOTE? | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-has-author-signed?` | TIU HAS AUTHOR SIGNED? | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-get-documents-for-request` | TIU GET DOCUMENTS FOR REQUEST | GLOBAL ARRAY |
| GET | `/vista/tiu/rpc/tiu-is-this-a-surgery?` | TIU IS THIS A SURGERY? | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-identify-surgery-class` | TIU IDENTIFY SURGERY CLASS | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-long-list-surgery-titles` | TIU LONG LIST SURGERY TITLES | ARRAY |
| GET | `/vista/tiu/rpc/tiu-isprf` | TIU ISPRF | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-get-prf-actions` | TIU GET PRF ACTIONS | ARRAY |
| POST | `/vista/tiu/rpc/tiu-link-to-flag` | TIU LINK TO FLAG | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-get-document-status` | TIU GET DOCUMENT STATUS | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-get-linked-prf-notes` | TIU GET LINKED PRF NOTES | ARRAY |
| GET | `/vista/tiu/rpc/tiu-get-prf-title` | TIU GET PRF TITLE | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-is-user-a-usr-provider` | TIU IS USER A USR PROVIDER | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-med-get-patient-data` | TIU MED GET PATIENT DATA | ARRAY |
| GET | `/vista/tiu/rpc/tiu-med-get-health-summary` | TIU MED GET HEALTH SUMMARY | ARRAY |
| GET | `/vista/tiu/rpc/tiu-med-last5` | TIU MED LAST5 | ARRAY |
| GET | `/vista/tiu/rpc/tiu-med-list-all` | TIU MED LIST ALL | ARRAY |
| GET | `/vista/tiu/rpc/tiu-med-patient-management` | TIU MED PATIENT MANAGEMENT | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-med-get-patient-lists` | TIU MED GET PATIENT LISTS | ARRAY |
| GET | `/vista/tiu/rpc/tiu-med-get-list-data` | TIU MED GET LIST DATA | ARRAY |
| GET | `/vista/tiu/rpc/tiu-med-get-object` | TIU MED GET OBJECT | GLOBAL ARRAY |
| GET | `/vista/tiu/rpc/tiu-template-get-template` | TIU TEMPLATE GET TEMPLATE | ARRAY |
| GET | `/vista/tiu/rpc/tiu-can-print-work/chart-copy` | TIU CAN PRINT WORK/CHART COPY | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-med-get-version` | TIU MED GET VERSION | SINGLE VALUE |
| GET | `/vista/tiu/rpc/tiu-load-record-text` | TIU LOAD RECORD TEXT | GLOBAL ARRAY |
| GET | `/vista/tiu/rpc/tiu-ancillary-package-message` | TIU ANCILLARY PACKAGE MESSAGE | ARRAY |
| GET | `/vista/tiu/rpc/tiu-link-secondary-visit` | TIU LINK SECONDARY VISIT | SINGLE VALUE |
| POST | `/vista/tiu/rpc/tiu-need-to-sign?` | TIU NEED TO SIGN? | SINGLE VALUE |
