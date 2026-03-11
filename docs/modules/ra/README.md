# Radiology Nuclear Medicine (RA)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Imaging orders, exam tracking, results, reports

| Property | Value |
|----------|-------|
| Namespace | `RA` |
| Tier | 5 |
| FileMan Files | 7 |
| RPCs | 7 |
| Menu Options | 261 |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 70 | File #70 | ? | ? |
| 71 | File #71 | ? | ? |
| 72 | File #72 | ? | ? |
| 73 | File #73 | ? | ? |
| 74 | File #74 | ? | ? |
| 75 | File #75 | ? | ? |
| 75.1 | File #75.1 | ? | ? |

## Remote Procedure Calls (RPCs)

### `RAMAG EXAM ORDER`

| Property | Value |
|----------|-------|
| Tag | `ORDER` |
| Routine | `RAMAGRP1` |
| Return Type | ARRAY |
| Parameter Count | 9 |
| Status | Inactive (may still be callable) |

**Description:** The RAMAG EXAM ORDER remote procedure requests a Radiology exam for the patient and returns the IEN of the new order in the RAD/NUC MED ORDERS file (#75.1). It also sends all required notifications..

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RADFN | LITERAL | No |
| 2 | RAMLC | LITERAL | No |
| 3 | RAPROC | LITERAL | No |
| 4 | REQDTE | LITERAL | No |
| 5 | RACAT | LITERAL | No |
| 6 | REQLOC | LITERAL | No |
| 7 | REQPHYS | LITERAL | No |
| 8 | REASON | LITERAL | No |
| 9 | RAMSC | REFERENCE | No |

**API Endpoint:** `GET /vista/ra/rpc/ramag-exam-order`

---

### `RAMAG EXAM REGISTER`

| Property | Value |
|----------|-------|
| Tag | `REGISTER` |
| Routine | `RAMAGRP1` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** The RAMAG EXAM REGISTER remote procedure registers the exam and returns identifiers of the new case(s) in the RAD/NUC MED PATIENT file (#70). It also sends all required notifications.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RAOIFN | LITERAL | No |
| 2 | EXMDTE | LITERAL | No |
| 3 | RAMSC | REFERENCE | No |

**API Endpoint:** `GET /vista/ra/rpc/ramag-exam-register`

---

### `RAMAG ORDER CANCEL`

| Property | Value |
|----------|-------|
| Tag | `ORDCANC` |
| Routine | `RAMAGRP1` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** The RAMAG ORDER CANCEL remote procedure cancels/holds the Radiology order and sends all required notifications.   NOTE: If there are active cases in the RAD/NUC MED PATIENT file (#70)       associated with an order, this remote procedure neither cancels       nor holds the order and returns the erro

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RAOIFN | LITERAL | No |
| 2 | RAREASON | LITERAL | No |
| 3 | RAMSC | REFERENCE | No |

**API Endpoint:** `POST /vista/ra/rpc/ramag-order-cancel`

---

### `RAMAG EXAM CANCEL`

| Property | Value |
|----------|-------|
| Tag | `EXAMCANC` |
| Routine | `RAMAGRP1` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** The RAMAG EXAM CANCEL remote procedure cancels the Radiology exam(s) and sends all required notifications.   If all exams that reference the same order/request are canceled, this   function can also cancel/hold the order (if the appropriate parameters are provided).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RAEXAM | LITERAL | No |
| 2 | RAREASON | LITERAL | No |
| 3 | RAMSC | REFERENCE | No |
| 4 | RAFLAGS | LITERAL | No |

**API Endpoint:** `POST /vista/ra/rpc/ramag-exam-cancel`

---

### `RAMAG EXAM COMPLETE`

| Property | Value |
|----------|-------|
| Tag | `COMPLETE` |
| Routine | `RAMAGRP1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** The RAMAG EXAM COMPLETE remote procedure completes the exam. It also sends required HL7 messages, sends changed order control "XX" to CPRS, but does not send VistA alerts regarding the exam status change.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RAEXAM | LITERAL | No |
| 2 | RAMSC | REFERENCE | No |

**API Endpoint:** `POST /vista/ra/rpc/ramag-exam-complete`

---

### `RAMAG EXAMINED`

| Property | Value |
|----------|-------|
| Tag | `EXAMINED` |
| Routine | `RAMAGRP2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** The RAMAG EXAMINED remote procedure updates the status of the case (the procedure has been performed) and creates the stub report. It also sends required HL7 messages, sends changed order control "XX" to CPRS, but does not send VistA alerts regarding the exam status change.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RAEXAM | LITERAL | No |
| 2 | RAMSC | REFERENCE | No |

**API Endpoint:** `GET /vista/ra/rpc/ramag-examined`

---

### `RAMAG EXAM STATUS REQUIREMENTS`

| Property | Value |
|----------|-------|
| Tag | `EXMSTREQ` |
| Routine | `RAMAGRP2` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** The RAMAG EXAM STATUS REQUIREMENTS remote procedure returns a descriptor that indicates conditions that should be met in order to successfully  perform an action on an exam/case record.   These conditions are defined by the sites and stored in the EXAMINATION STATUS file (#72). See the .1 and .5 nod

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RACTION | LITERAL | No |
| 2 | RAIMGTYI | LITERAL | No |
| 3 | RAPROC | LITERAL | No |

**API Endpoint:** `GET /vista/ra/rpc/ramag-exam-status-requirements`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| RADFN: | RAMAG EXAM ORDER | RADFN | LITERAL | rpc |
| RAMLC: | RAMAG EXAM ORDER | RAMLC | LITERAL | rpc |
| RAPROC: | RAMAG EXAM ORDER | RAPROC | LITERAL | rpc |
| REQDTE: | RAMAG EXAM ORDER | REQDTE | LITERAL | rpc |
| RACAT: | RAMAG EXAM ORDER | RACAT | LITERAL | rpc |
| REQLOC: | RAMAG EXAM ORDER | REQLOC | LITERAL | rpc |
| REQPHYS: | RAMAG EXAM ORDER | REQPHYS | LITERAL | rpc |
| REASON: | RAMAG EXAM ORDER | REASON | LITERAL | rpc |
| RAMSC: | RAMAG EXAM ORDER | RAMSC | REFERENCE | rpc |
| RAOIFN: | RAMAG EXAM REGISTER | RAOIFN | LITERAL | rpc |
| EXMDTE: | RAMAG EXAM REGISTER | EXMDTE | LITERAL | rpc |
| RAMSC: | RAMAG EXAM REGISTER | RAMSC | REFERENCE | rpc |
| RAOIFN: | RAMAG ORDER CANCEL | RAOIFN | LITERAL | rpc |
| RAREASON: | RAMAG ORDER CANCEL | RAREASON | LITERAL | rpc |
| RAMSC: | RAMAG ORDER CANCEL | RAMSC | REFERENCE | rpc |
| RAEXAM: | RAMAG EXAM CANCEL | RAEXAM | LITERAL | rpc |
| RAREASON: | RAMAG EXAM CANCEL | RAREASON | LITERAL | rpc |
| RAMSC: | RAMAG EXAM CANCEL | RAMSC | REFERENCE | rpc |
| RAFLAGS: | RAMAG EXAM CANCEL | RAFLAGS | LITERAL | rpc |
| RAEXAM: | RAMAG EXAM COMPLETE | RAEXAM | LITERAL | rpc |
| RAMSC: | RAMAG EXAM COMPLETE | RAMSC | REFERENCE | rpc |
| RAEXAM: | RAMAG EXAMINED | RAEXAM | LITERAL | rpc |
| RAMSC: | RAMAG EXAMINED | RAMSC | REFERENCE | rpc |
| RACTION: | RAMAG EXAM STATUS REQUIREMENTS | RACTION | LITERAL | rpc |
| RAIMGTYI: | RAMAG EXAM STATUS REQUIREMENTS | RAIMGTYI | LITERAL | rpc |
| RAPROC: | RAMAG EXAM STATUS REQUIREMENTS | RAPROC | LITERAL | rpc |
| RADFN: | RAMAG EXAM ORDER | RADFN | LITERAL | rpc |
| RAMLC: | RAMAG EXAM ORDER | RAMLC | LITERAL | rpc |
| RAPROC: | RAMAG EXAM ORDER | RAPROC | LITERAL | rpc |
| REQDTE: | RAMAG EXAM ORDER | REQDTE | LITERAL | rpc |
| RACAT: | RAMAG EXAM ORDER | RACAT | LITERAL | rpc |
| REQLOC: | RAMAG EXAM ORDER | REQLOC | LITERAL | rpc |
| REQPHYS: | RAMAG EXAM ORDER | REQPHYS | LITERAL | rpc |
| REASON: | RAMAG EXAM ORDER | REASON | LITERAL | rpc |
| RAMSC: | RAMAG EXAM ORDER | RAMSC | REFERENCE | rpc |
| RAOIFN: | RAMAG EXAM REGISTER | RAOIFN | LITERAL | rpc |
| EXMDTE: | RAMAG EXAM REGISTER | EXMDTE | LITERAL | rpc |
| RAMSC: | RAMAG EXAM REGISTER | RAMSC | REFERENCE | rpc |
| RAOIFN: | RAMAG ORDER CANCEL | RAOIFN | LITERAL | rpc |
| RAREASON: | RAMAG ORDER CANCEL | RAREASON | LITERAL | rpc |
| RAMSC: | RAMAG ORDER CANCEL | RAMSC | REFERENCE | rpc |
| RAEXAM: | RAMAG EXAM CANCEL | RAEXAM | LITERAL | rpc |
| RAREASON: | RAMAG EXAM CANCEL | RAREASON | LITERAL | rpc |
| RAMSC: | RAMAG EXAM CANCEL | RAMSC | REFERENCE | rpc |
| RAFLAGS: | RAMAG EXAM CANCEL | RAFLAGS | LITERAL | rpc |
| RAEXAM: | RAMAG EXAM COMPLETE | RAEXAM | LITERAL | rpc |
| RAMSC: | RAMAG EXAM COMPLETE | RAMSC | REFERENCE | rpc |
| RAEXAM: | RAMAG EXAMINED | RAEXAM | LITERAL | rpc |
| RAMSC: | RAMAG EXAMINED | RAMSC | REFERENCE | rpc |
| RACTION: | RAMAG EXAM STATUS REQUIREMENTS | RACTION | LITERAL | rpc |
| RAIMGTYI: | RAMAG EXAM STATUS REQUIREMENTS | RAIMGTYI | LITERAL | rpc |
| RAPROC: | RAMAG EXAM STATUS REQUIREMENTS | RAPROC | LITERAL | rpc |

## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| RA REG | — |
| RA EDITPT | — |
| RA PTEDIT | — |
| RA AMIS | — |
| RA FLASH | — |
| RA LABELS | — |
| RA LOG | — |
| RA FILMUSE | — |
| RA OUTSIDERPT | — |
| RA COMPLICATION | — |
| RA SYSDIV | — |
| RA PNLCLASS | — |
| RA FILMEDIT | — |
| RA PROCEDURE | — |
| RA PROFQUICK | — |
| RA WORKSHEETS | — |
| RA MAJORAMIS | — |
| RA DIAGEDIT | — |
| RA COMPEDIT | — |
| RA FLASHFORM | — |
| RA PNLTECH | — |
| RA PNLRES | — |
| RA PNLSTAFF | — |
| RA SYSLOC | — |
| RA FAILSOFT | — |
| RA SYSDIVLIST | — |
| RA SYSLOCLIST | — |
| RA SHARING | — |
| RA ADDEXAM | — |
| RA EDITCN | — |
| RA DIAGCN | — |
| RA OUTADD | — |
| RA OUTEDIT | — |
| RA OUTFLAG | — |
| RA PROFSORT | — |
| RA VIEWCN | — |
| RA OUTPROF | — |
| RA RPTENTRY | — |
| RA EXAMSTATUS | — |
| RA DELETEXAM | RA DELETEXAM |
| RA DELINQUENT | — |
| RA LABELTEST | — |
| RA SYSEXROOM | — |
| RA DELETERPT | RA RPTMGR |
| RA WKLTECH | — |
| RA WKLRES | — |
| RA WKLSTAFF | — |
| RA WKLPHY | — |
| RA WKLROOM | — |
| RA WKLPROCEDURE | — |
| RA STATRACK | — |
| RA DEVICE | — |
| RA PURGE | — |
| RA SYSEXLIST | — |
| RA ABNORMAL | — |
| RA STATRPT | — |
| RA MAJORAMISP | — |
| RA FILMP | — |
| RA DIAGP | — |
| RA COMPRINT | — |
| RA FLASHFORMP | — |
| RA SHARINGP | — |
| RA EXAMSTATUSP | — |
| RA PROCLONG | — |
| RA PROCSHORT | — |
| RA INACPRCLONG | — |
| RA INACPRCSHORT | — |
| RA PROCSERIES | — |
| RA LWKLWARD | — |
| RA LWKLSERVICE | — |
| RA LWKLBEDSEC | — |
| RA LWKLCLINIC | — |
| RA LWKLSHARING | — |
| RA STANDRPTS | — |
| RA STANDPRINT | — |
| RA RPTVERIFY | RA VERIFY |
| RA STATLOOK | — |
| RA CANCEL | — |
| RA RPTPAT | — |
| RA MODIFIER | — |
| RA MODIFIERP | — |
| RA REPRINT | — |
| RA ALPHALIST | — |
| RA AMISDUMP | — |
| RA BTCHLIST | — |
| RA BTCHPRINT | — |
| RA BTCHDEL | — |
| RA BTCHREMOVE | — |
| RA BTCHVERIFY | RA VERIFY |
| RA RPTDISP | — |
| RA UNVERIFY | RA RPTMGR |
| RA UPDATEXAM | — |
| RA IMGLOG | — |
| RA OVERRIDE | RA MGR |
| RA PAST | — |
| RA INCOMPLETE | — |
| RA DAISTATS | — |
| RA DAIUVR | — |
| RA RPTDISTQUE | — |
| RA RPTDISTSINGLEWARD | — |
| RA RPTDISTSINGLECLINIC | — |
| RA DISTEDIT | — |
| RA DISTP | — |
| RA RPTDISTPURGE | — |
| RA RPTDISTREBUILD | — |
| RA RPTDISTAUTOPURGE | — |
| RA RPTDISTACTIVITY | — |
| RA RPTONLINEVERIFY | RA VERIFY |
| RA NOPURGE | — |
| RA RPTDISTLISTUNPRINTED | — |
| RA RPTDISTLISTCLINIC | — |
| RA RPTDISTLISTWARD | — |
| RA RPTDISTPRINTSTATUS | — |
| RA ORDEREXAM | — |
| RA ORDERSCHEDULE | — |
| RA ORDERCANCEL | — |
| RA ORDERHOLD | — |
| RA ORDERLOG | — |
| RA ORDERDISPLAY | — |
| RA ORDERPRINTS | — |
| RA ORDERLOGLOC | — |
| RA ORDERPRINTPAT | — |
| RA CPTSTATS | — |
| RA TRANSCRIP REPORT | — |
| RA PROCMSGEDIT | — |
| RA PROCMSGPRINT | — |
| RA ORDERPENDING | — |
| RA COMMON PROCEDURE | — |
| RA DISPLAY COMMON PROCEDURES | — |
| RA CREATE OE/RR PROTOCOL | — |
| RA PNLCLERK | — |
| RA CDR REPORT | — |
| RA WASTED FILM RPT | — |
| RA RESIDENT PRE-VERIFY | — |
| RA BTCHDEL DATE | RA MGR |
| RA LOC SWITCH | — |
| RA INVALID EXAM STATUSES | — |
| RA INVALID CPT/STOP | — |
| RA COMPILE TEMPLATES | — |
| RA EXAM/STATUS ITYPE MISMATCH | — |
| RA BARPROCPRINT | — |
| RA DISPLAY IMAGPROCINFO | — |
| RA UNCORRECTED REPORTS | — |
| RA NM EDIT ROUTE | — |
| RA NM EDIT SITE | — |
| RA NM EDIT SOURCE | — |
| RA NM EDIT LOT | — |
| RA NM PRINT ROUTE | — |
| RA NM PRINT SITE | — |
| RA NM PRINT SOURCE | — |
| RA NM PRINT LOT | — |
| RA DOSAGE TICKET | — |
| RA PROCPARENT | — |
| RA PROCOSTEDIT | — |
| RA NM RADIOPHARM USAGE | — |
| RA NM RADIOPHARM ADMIN | — |
| RA HL7 VOICE REPORTING ERRORS | — |
| RA XREF CLEANUP | RA MGR |
| RA HL7 MESSAGE RESEND | RA MGR |
| RA CREDIT IMAGING LOCATION | — |
| RA SET PREFERENCE LONG DISPLAY | — |
| RA PERFORMIN RPTS | — |
| RA PERFORMIN MAIL GROUP ENTRY | — |
| RA PERFORMIN TASKLM | — |
| RA PERFORMIN SCHEDULE | — |
| RA PROCMEDIA | — |
| RA CMAUDIT HISTORY | — |
| RA TIMELINESS REPORT | — |
| RA PROC CPTWRVU | — |
| RA WKLIPHY CPT ITYPE | — |
| RA WKLIPHY WRVU ITYPE | — |
| RA WKLIPHY WRVU CPT | — |
| RA HL7 RESEND BY DATE RANGE | RA MGR |
| RA OUTSIDE RPTENTRY | — |
| RA RESTORE REPORT | RA RPTMGR |
| RA SITEACCNUM | — |
| RA PROFRAD DOSE | — |
| RA RAD DOSE SUMMARY | — |
| RA MAP TO MRPF | — |
| RA NEW PROCEDURE TIME BULLETIN | — |
| RA MRPF PIN | — |
| RA ORDERREASON UPDATE | — |
| RA ADT | RA MGR |
| RA ORDERREF | — |
| RA OVERRIDE REPORT | RA MGR |
| RA SYSUPLOC | — |
| RA ORDER DISCONTINUED | — |
| RA SYSINACT | — |
| RA EXAM ORDER SYNCH | RA MGR |
| RA REPROC | — |

### Menu

| Name | Security Key |
|------|-------------|
| RA RPT | — |
| RA OUTSIDE | — |
| RA REPORTS | — |
| RA SUPERVISOR | — |
| RA PROFILES | — |
| RA MAINTENANCE | — |
| RA PNL | — |
| RA SYSDEF | — |
| RA WKL | — |
| RA TECHMENU | — |
| RA SITEMANAGER | — |
| RA EXAMEDIT | — |
| RA OVERALL | — |
| RA MAINTENANCEP | — |
| RA LWKL | — |
| RA PROCLISTS | — |
| RA BTCH | — |
| RA MGTRPTS | — |
| RA DAILYRPTS | — |
| RA SPECRPTS | — |
| RA USERUTL | — |
| RA CLERKMENU | — |
| RA SECRETARY | — |
| RA TRANSCRIPTIONIST | — |
| RA FILERM | — |
| RA WARD | — |
| RA RADIOLOGIST | — |
| RA RPTDIST | — |
| RA ORDER | — |
| RA GECS MAINTENANCE USER MENU | — |
| RA GECS REPORTS MENU | — |
| RA GECS USER MENU | — |
| RA GECS TRANSMIT USER | — |
| RA GECS MAIN MENU | — |
| RA ORDER DISPLAY MENU | — |
| RA NM EDIT MENU | — |
| RA NM PRINT MENU | — |
| RA PROCEDURE EDIT MENU | — |
| RA HL7 MENU | — |
| RA TIMELINESS OUTPATIENT MENU | — |
| RA TIMELINESS MENU | — |
| RA TIMELINESS VER MENU | — |
| RA TIMELINESS PERFORMANCE MENU | — |
| RA ORDERLOG MENU | — |
| RA REPORT MANAGEMENT | — |

### Action

| Name | Security Key |
|------|-------------|
| RA PROFDEMOS | — |
| RA BTCHNEW | — |
| RA GECS BATCH | — |
| RA GECS BATCH EDIT | — |
| RA GECS BATCHES STATUS | — |
| RA GECS BATCHES WAITING TRANS | — |
| RA GECS CODE EDIT | — |
| RA GECS CREATE | — |
| RA GECS DELETE | — |
| RA GECS KEYPUNCH | — |
| RA GECS PURGE | — |
| RA GECS READY FOR BATCHING LIS | — |
| RA GECS REBATCH | — |
| RA GECS RETRANSMIT | — |
| RA GECS REVIEW CODE SHEET | — |
| RA GECS TRANSMIT | — |
| RA SIGN-ON MSG | — |
| RA RESOURCE DEVICE | — |
| RA VISTARAD CATEGORY P | — |
| RA VISTARAD CATEGORY E | — |
| RA SEEDING DONE | — |
| RA MAP ONE | — |

### Protocol

| Name | Security Key |
|------|-------------|
| RA OERR EXAM | — |

### Edit

| Name | Security Key |
|------|-------------|
| RA VALID STOP CODES | RA MGR |
| RA COMCARE | — |

### Print

| Name | Security Key |
|------|-------------|
| RA ORDERLOG REJECTED | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `RA DELETEXAM`
- `RA RPTMGR`
- `RA VERIFY`
- `RA MGR`

## API Route Summary

All routes are prefixed with `/vista/ra/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/ra/rpc/ramag-exam-order` | RAMAG EXAM ORDER | ARRAY |
| GET | `/vista/ra/rpc/ramag-exam-register` | RAMAG EXAM REGISTER | ARRAY |
| POST | `/vista/ra/rpc/ramag-order-cancel` | RAMAG ORDER CANCEL | ARRAY |
| POST | `/vista/ra/rpc/ramag-exam-cancel` | RAMAG EXAM CANCEL | ARRAY |
| POST | `/vista/ra/rpc/ramag-exam-complete` | RAMAG EXAM COMPLETE | ARRAY |
| GET | `/vista/ra/rpc/ramag-examined` | RAMAG EXAMINED | ARRAY |
| GET | `/vista/ra/rpc/ramag-exam-status-requirements` | RAMAG EXAM STATUS REQUIREMENTS | ARRAY |
