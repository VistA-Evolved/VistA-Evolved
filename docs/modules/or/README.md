# Order Entry Results Reporting (OR)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Clinical orders, quick orders, order checks, order sets

| Property | Value |
|----------|-------|
| Namespace | `OR` |
| Tier | 5 |
| FileMan Files | 6 |
| RPCs | 1127 |
| Menu Options | 97 |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 100 | File #100 | ? | ? |
| 100.01 | File #100.01 | ? | ? |
| 100.02 | File #100.02 | ? | ? |
| 100.98 | File #100.98 | ? | ? |
| 101 | File #101 | ? | ? |
| 101.41 | File #101.41 | ? | ? |

## Remote Procedure Calls (RPCs)

### `ORQQAL LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORQQAL` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of allergies for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqal-list`

---

### `ORQQAL DETAIL`

| Property | Value |
|----------|-------|
| Tag | `DETAIL` |
| Routine | `ORQQAL` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This function returns a string of information for a specific allergy/ adverse reaction.  Returned data is delimited by "^" and includes: allergen/reactant, originator, originator title, verified/not verified,  observed/historical,<blank>,type, observation date, severity, drug class,  symptoms/reacti

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ALLERGY ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqal-detail`

---

### `ORQQPL LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORQQPL` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Function returns a list of problems for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | STATUS | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpl-list`

---

### `ORQQPL DETAIL`

| Property | Value |
|----------|-------|
| Tag | `DETAIL` |
| Routine | `ORQQPL` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Function returns a string of detailed information for a problem.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PROBLEM ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpl-detail`

---

### `ORQQXQA PATIENT`

| Property | Value |
|----------|-------|
| Tag | `PATIENT` |
| Routine | `ORQQXQA` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Function returns a list of notifications for a patient for the current user.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | START DATE | LITERAL | No |
| 3 | STOP DATE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqxqa-patient`

---

### `ORQQXQA USER`

| Property | Value |
|----------|-------|
| Tag | `USER` |
| Routine | `ORQQXQA` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Function returns notifications for current user.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER ID | LITERAL | No |
| 2 | START DATE | LITERAL | No |
| 3 | STOP DATE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqxqa-user`

---

### `ORQQVI VITALS`

| Property | Value |
|----------|-------|
| Tag | `FASTVIT` |
| Routine | `ORQQVI` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Array of patient most recent vitals within start and stop date/times.  If no start and stop dates are indicated, the most recent are returned.   If no start date is passed then the start date is 1 (i.e. before any dates).   If no stop date is passed then the start date is also the stop date and if t

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | START DATE/TIME | LITERAL | No |
| 3 | STOP DATE/TIME | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqvi-vitals`

---

### `ORQPT DEFAULT PATIENT LIST`

| Property | Value |
|----------|-------|
| Tag | `DEFLIST` |
| Routine | `ORQPTQ11` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Function returns the current user's default patient list.

**API Endpoint:** `GET /vista/or/rpc/orqpt-default-patient-list`

---

### `ORQPT PROVIDERS`

| Property | Value |
|----------|-------|
| Tag | `PROV` |
| Routine | `ORQPTQ2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Function returns an array of providers.

**API Endpoint:** `GET /vista/or/rpc/orqpt-providers`

---

### `ORQPT PROVIDER PATIENTS`

| Property | Value |
|----------|-------|
| Tag | `PROVPTS` |
| Routine | `ORQPTQ2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Function returns an array of patients linked to a provider/user.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqpt-provider-patients`

---

### `ORQPT CLINIC PATIENTS`

| Property | Value |
|----------|-------|
| Tag | `CLINPTS` |
| Routine | `ORQPTQ2` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns patients with appointments at a clinic between start and stop dates

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINIC ID | LITERAL | No |
| 2 | START DATE | LITERAL | No |
| 3 | STOP DATE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqpt-clinic-patients`

---

### `ORQPT SPECIALTIES`

| Property | Value |
|----------|-------|
| Tag | `SPEC` |
| Routine | `ORQPTQ2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Function returns an array of treating specialties.

**API Endpoint:** `GET /vista/or/rpc/orqpt-specialties`

---

### `ORQPT SPECIALTY PATIENTS`

| Property | Value |
|----------|-------|
| Tag | `SPECPTS` |
| Routine | `ORQPTQ2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Function returns an array of patients linked to a treating specialty.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SPECIALTY ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqpt-specialty-patients`

---

### `ORQPT TEAMS`

| Property | Value |
|----------|-------|
| Tag | `TEAMS` |
| Routine | `ORQPTQ1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Function returns a list of teams.

**API Endpoint:** `GET /vista/or/rpc/orqpt-teams`

---

### `ORQPT TEAM PATIENTS`

| Property | Value |
|----------|-------|
| Tag | `TEAMPTS` |
| Routine | `ORQPTQ1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Function returns an array of patients on a team.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TEAM ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqpt-team-patients`

---

### `ORQPT WARD PATIENTS`

| Property | Value |
|----------|-------|
| Tag | `WARDPTS` |
| Routine | `ORQPTQ2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Function returns a list of patients on a ward.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | WARD ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqpt-ward-patients`

---

### `ORQPT CLINICS`

| Property | Value |
|----------|-------|
| Tag | `CLIN` |
| Routine | `ORQPTQ2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Function returns a list of clinics.

**API Endpoint:** `GET /vista/or/rpc/orqpt-clinics`

---

### `ORQQPS LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORQQPS` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Function returns a list of a patient's medications.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | START DATE/TIME | LITERAL | No |
| 3 | STOP DATE/TIME | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqps-list`

---

### `ORB FOLLOW-UP STRING`

| Property | Value |
|----------|-------|
| Tag | `GUI` |
| Routine | `ORB3FUP1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This function returns a string of follow-up data.  Content of the data  varies by notification.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XQAID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orb-follow-up-string`

---

### `ORB DELETE ALERT`

| Property | Value |
|----------|-------|
| Tag | `DEL` |
| Routine | `ORB3FUP1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This function deletes an alert.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XQAID | LITERAL | No |

**API Endpoint:** `POST /vista/or/rpc/orb-delete-alert`

---

### `ORQPT WARDS`

| Property | Value |
|----------|-------|
| Tag | `WARD` |
| Routine | `ORQPTQ2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Function returns a list of wards.

**API Endpoint:** `GET /vista/or/rpc/orqpt-wards`

---

### `ORB FOLLOW-UP TYPE`

| Property | Value |
|----------|-------|
| Tag | `TYPE` |
| Routine | `ORB3FUP1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the follow-up action type for a notification as identified via the alert xqaid.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XQAID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orb-follow-up-type`

---

### `ORB FOLLOW-UP ARRAY`

| Property | Value |
|----------|-------|
| Tag | `GUI` |
| Routine | `ORB3FUP1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This function returns an array of follow-up data.  Content of the data varies by notification.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XQAID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orb-follow-up-array`

---

### `ORQOR DETAIL`

| Property | Value |
|----------|-------|
| Tag | `DETAIL` |
| Routine | `ORWOR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns detailed information regarding an order.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORDER | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqor-detail`

---

### `ORQPT DEFAULT LIST SOURCE`

| Property | Value |
|----------|-------|
| Tag | `DEFSRC` |
| Routine | `ORQPTQ11` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Function returns the source of the current user's default patient list.

**API Endpoint:** `GET /vista/or/rpc/orqpt-default-list-source`

---

### `ORWPT ID INFO`

| Property | Value |
|----------|-------|
| Tag | `IDINFO` |
| Routine | `ORWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns identifying information for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpt-id-info`

---

### `ORWPT LIST ALL`

| Property | Value |
|----------|-------|
| Tag | `LISTALL` |
| Routine | `ORWPT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a set of patient names for use with a long list box.

**API Endpoint:** `GET /vista/or/rpc/orwpt-list-all`

---

### `ORWUH POPUP`

| Property | Value |
|----------|-------|
| Tag | `POPUP` |
| Routine | `ORWUH` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Retrieves the "What's This" text for a given control.

**API Endpoint:** `GET /vista/or/rpc/orwuh-popup`

---

### `ORWLR CUMULATIVE REPORT`

| Property | Value |
|----------|-------|
| Tag | `CUM` |
| Routine | `ORWLR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This call returns an up to date laboratory cumulative report for a given  patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwlr-cumulative-report`

---

### `ORQQVS VISITS/APPTS`

| Property | Value |
|----------|-------|
| Tag | `VSITAPPT` |
| Routine | `ORQQVS` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of patient appointments and visits for a date/time range. location.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | START DATE/TIME | LITERAL | No |
| 3 | STOP DATE/TIME | LITERAL | No |
| 4 | DUMMY | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqvs-visits/appts`

---

### `ORQQPP LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORQQPP` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of active Patient Postings for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpp-list`

---

### `ORQPT WARDRMBED`

| Property | Value |
|----------|-------|
| Tag | `WRB` |
| Routine | `ORQPTQ3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the ward, room-bed for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqpt-wardrmbed`

---

### `ORQQPX IMMUN LIST`

| Property | Value |
|----------|-------|
| Tag | `IMMLIST` |
| Routine | `ORQQPX` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of patient immunizations.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpx-immun-list`

---

### `ORQOR LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORQOR1` |
| Return Type | ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of patient orders.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT | LITERAL | No |
| 2 | GROUP | LITERAL | No |
| 3 | FLAG | LITERAL | No |
| 4 | STARTDATE | LITERAL | No |
| 5 | STOPDATE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqor-list`

---

### `ORQQLR DETAIL`

| Property | Value |
|----------|-------|
| Tag | `DETAIL` |
| Routine | `ORQQLR` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the details of a lab order.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT | LITERAL | No |
| 2 | ORDER NUMBER | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqlr-detail`

---

### `ORQQVS DETAIL NOTES`

| Property | Value |
|----------|-------|
| Tag | `DETNOTE` |
| Routine | `ORQQVS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the progress notes based on patient and visit identifier.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Patient DFN | LITERAL | No |
| 2 | Visit | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqvs-detail-notes`

---

### `ORQQVS DETAIL SUMMARY`

| Property | Value |
|----------|-------|
| Tag | `DETSUM` |
| Routine | `ORQQVS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns discharge summary for a visit.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Patient | LITERAL | No |
| 2 | Visit | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqvs-detail-summary`

---

### `ORQQPS DETAIL`

| Property | Value |
|----------|-------|
| Tag | `DETAIL` |
| Routine | `ORQQPS` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the details of a medication order.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | MEDICATION ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqps-detail`

---

### `ORB SORT METHOD`

| Property | Value |
|----------|-------|
| Tag | `SORT` |
| Routine | `ORQORB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the default sort method for notification display based on the  precedence USER, DIVISION, SYSTEM, PACKAGE.

**API Endpoint:** `GET /vista/or/rpc/orb-sort-method`

---

### `ORQQXMB MAIL GROUPS`

| Property | Value |
|----------|-------|
| Tag | `MAILG` |
| Routine | `ORQQXQA` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns mail groups in a system.

**API Endpoint:** `GET /vista/or/rpc/orqqxmb-mail-groups`

---

### `ORQPT ATTENDING/PRIMARY`

| Property | Value |
|----------|-------|
| Tag | `ATTPRIM` |
| Routine | `ORQPTQ3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a patient's attending physician and primary provider.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqpt-attending/primary`

---

### `ORWD DEF`

| Property | Value |
|----------|-------|
| Tag | `DEF` |
| Routine | `ORWD` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns the formatting definition for an ordering dialog from the ORDER DIALOG file (101.41).

**API Endpoint:** `GET /vista/or/rpc/orwd-def`

---

### `ORQ NULL LIST`

| Property | Value |
|----------|-------|
| Tag | `NLIST` |
| Routine | `ORQPTQ2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a null list.

**API Endpoint:** `GET /vista/or/rpc/orq-null-list`

---

### `ORQQLR SEARCH RANGE OUTPT`

| Property | Value |
|----------|-------|
| Tag | `SROUT` |
| Routine | `ORQQLR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the date search range in number of days (e.g. 90) to begin the  search before today.  For example, a value of 90 would indicate to limit the search between ninety day. Limited to Outpatients.

**API Endpoint:** `GET /vista/or/rpc/orqqlr-search-range-outpt`

---

### `ORQQAL LIST REPORT`

| Property | Value |
|----------|-------|
| Tag | `LRPT` |
| Routine | `ORQQAL` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of allergens, severity and signs/symptoms in a report format which can be used in a "detailed" display.  This RPC was set up to support the listing of allergies when selected from the Patient Postings list.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqal-list-report`

---

### `ORWORR GET`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `ORWORR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of orders & and associated fields and text.

**API Endpoint:** `GET /vista/or/rpc/orworr-get`

---

### `ORWU USERINFO`

| Property | Value |
|----------|-------|
| Tag | `USERINFO` |
| Routine | `ORWU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns preferences for the current user.

**API Endpoint:** `GET /vista/or/rpc/orwu-userinfo`

---

### `ORWD SAVE`

| Property | Value |
|----------|-------|
| Tag | `SAVE` |
| Routine | `ORWD` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Saves an order.  The order is passed in ORDIALOG format.

**API Endpoint:** `POST /vista/or/rpc/orwd-save`

---

### `ORWD SIGN`

| Property | Value |
|----------|-------|
| Tag | `SIGN` |
| Routine | `ORWD` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Changes signature status on a list of orders and optionally releases the orders to their respective services.

**API Endpoint:** `POST /vista/or/rpc/orwd-sign`

---

### `ORWD OI`

| Property | Value |
|----------|-------|
| Tag | `OI` |
| Routine | `ORWD` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a group of orderable items to be used in the OnNeedData event for a long list box.

**API Endpoint:** `GET /vista/or/rpc/orwd-oi`

---

### `ORWDLR DEF`

| Property | Value |
|----------|-------|
| Tag | `DEF` |
| Routine | `ORWDLR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Loads dialog data (lists & defaults) for a lab order.

**API Endpoint:** `GET /vista/or/rpc/orwdlr-def`

---

### `ORWDLR LOAD`

| Property | Value |
|----------|-------|
| Tag | `LOAD` |
| Routine | `ORWDLR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Loads sample, specimen, and urgency information for a given lab test.

**API Endpoint:** `GET /vista/or/rpc/orwdlr-load`

---

### `ORQPT PATIENT TEAM PROVIDERS`

| Property | Value |
|----------|-------|
| Tag | `TPTPR` |
| Routine | `ORQPTQ1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Function returns a list of providers linked to a patient via teams.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqpt-patient-team-providers`

---

### `ORWDLR ABBSPEC`

| Property | Value |
|----------|-------|
| Tag | `ABBSPEC` |
| Routine | `ORWDLR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns lab specimens that have an abbreviation (used as default list).

**API Endpoint:** `GET /vista/or/rpc/orwdlr-abbspec`

---

### `ORWDLR ALLSAMP`

| Property | Value |
|----------|-------|
| Tag | `ALLSAMP` |
| Routine | `ORWDLR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of collection samples for a lab order.

**API Endpoint:** `GET /vista/or/rpc/orwdlr-allsamp`

---

### `ORWDLR OIPARAM`

| Property | Value |
|----------|-------|
| Tag | `LOAD` |
| Routine | `ORWDLR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** No longer used.

**API Endpoint:** `GET /vista/or/rpc/orwdlr-oiparam`

---

### `ORWU VALIDSIG`

| Property | Value |
|----------|-------|
| Tag | `VALIDSIG` |
| Routine | `ORWU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Validates a broker encrypted electronic signature.

**API Endpoint:** `GET /vista/or/rpc/orwu-validsig`

---

### `ORWPT APPTLST`

| Property | Value |
|----------|-------|
| Tag | `APPTLST` |
| Routine | `ORWPT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of appointments for a patient (for visit selection).

**API Endpoint:** `GET /vista/or/rpc/orwpt-apptlst`

---

### `ORWU HOSPLOC`

| Property | Value |
|----------|-------|
| Tag | `HOSPLOC` |
| Routine | `ORWU` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a set of hospital locations for use in a long list box.

**API Endpoint:** `GET /vista/or/rpc/orwu-hosploc`

---

### `ORWPT ADMITLST`

| Property | Value |
|----------|-------|
| Tag | `ADMITLST` |
| Routine | `ORWPT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of admissions for a patient (for visit selection).

**API Endpoint:** `GET /vista/or/rpc/orwpt-admitlst`

---

### `ORWD FORMID`

| Property | Value |
|----------|-------|
| Tag | `FORMID` |
| Routine | `ORWD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the Form ID (mapping to a windows form) for an ordering dialog.

**API Endpoint:** `GET /vista/or/rpc/orwd-formid`

---

### `ORWD GET4EDIT`

| Property | Value |
|----------|-------|
| Tag | `GET4EDIT` |
| Routine | `ORWD` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns the responses for an already existing order.

**API Endpoint:** `GET /vista/or/rpc/orwd-get4edit`

---

### `ORWD VALIDACT`

| Property | Value |
|----------|-------|
| Tag | `VALIDACT` |
| Routine | `ORWD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns 1 if action is valid for an order, otherwise 0^error.

**API Endpoint:** `GET /vista/or/rpc/orwd-validact`

---

### `ORWD SAVEACT`

| Property | Value |
|----------|-------|
| Tag | `SAVEACT` |
| Routine | `ORWD` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Saves the action on a order in an unsigned/unreleased state.

**API Endpoint:** `GET /vista/or/rpc/orwd-saveact`

---

### `ORWD DT`

| Property | Value |
|----------|-------|
| Tag | `DT` |
| Routine | `ORWD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns a date in internal Fileman format.

**API Endpoint:** `GET /vista/or/rpc/orwd-dt`

---

### `ORWDCSLT LOOK200`

| Property | Value |
|----------|-------|
| Tag | `LOOK200` |
| Routine | `ORWDCSLT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Validates Attn: field of a consult order.

**API Endpoint:** `GET /vista/or/rpc/orwdcslt-look200`

---

### `ORWDCSLT DEF`

| Property | Value |
|----------|-------|
| Tag | `DEF` |
| Routine | `ORWDCSLT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Load dialog data (lists & defaults) for a consult order. (16-BIT)

**API Endpoint:** `GET /vista/or/rpc/orwdcslt-def`

---

### `ORWD PROVKEY`

| Property | Value |
|----------|-------|
| Tag | `PROVKEY` |
| Routine | `ORWD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns 1 if the users possesses the PROVIDER key.

**API Endpoint:** `GET /vista/or/rpc/orwd-provkey`

---

### `ORWDGX LOAD`

| Property | Value |
|----------|-------|
| Tag | `LOAD` |
| Routine | `ORWDGX` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Loads a list of activities for an activity order.

**API Endpoint:** `GET /vista/or/rpc/orwdgx-load`

---

### `ORWDPS LOAD`

| Property | Value |
|----------|-------|
| Tag | `LOAD` |
| Routine | `ORWDPS` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Loads dialog data (lists & defaults) for a pharmacy order once an orderable item (Drug & Form) is selected.

**API Endpoint:** `GET /vista/or/rpc/orwdps-load`

---

### `ORWDRA DEF`

| Property | Value |
|----------|-------|
| Tag | `DEF` |
| Routine | `ORWDRA` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Loads dialog data (lists & defaults) for a radiology order.

**API Endpoint:** `GET /vista/or/rpc/orwdra-def`

---

### `ORWDGX VMDEF`

| Property | Value |
|----------|-------|
| Tag | `VMDEF` |
| Routine | `ORWDGX` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Loads dialog data (lists & defaults) for a vitals order.

**API Endpoint:** `GET /vista/or/rpc/orwdgx-vmdef`

---

### `ORWDPS DEF`

| Property | Value |
|----------|-------|
| Tag | `DEF` |
| Routine | `ORWDPS` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Loads dialog data (lists & defaults) for a pharmacy order (inpatient and outpatient).

**API Endpoint:** `GET /vista/or/rpc/orwdps-def`

---

### `ORWDLR STOP`

| Property | Value |
|----------|-------|
| Tag | `STOP` |
| Routine | `ORWDLR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Calculates a stop date (for lab orders with schedules).

**API Endpoint:** `GET /vista/or/rpc/orwdlr-stop`

---

### `ORWU NEWPERS`

| Property | Value |
|----------|-------|
| Tag | `NEWPERS` |
| Routine | `ORWU` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a set of New Person file entries for use in a long list box.

**API Endpoint:** `GET /vista/or/rpc/orwu-newpers`

---

### `ORWU DEVICE`

| Property | Value |
|----------|-------|
| Tag | `DEVICE` |
| Routine | `ORWU` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of print devices.

**API Endpoint:** `GET /vista/or/rpc/orwu-device`

---

### `ORWRA IMAGING EXAMS`

| Property | Value |
|----------|-------|
| Tag | `EXAMS` |
| Routine | `ORWRA` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns a list on imaging exams for a specific patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwra-imaging-exams`

---

### `ORWRA REPORT TEXT`

| Property | Value |
|----------|-------|
| Tag | `RPT` |
| Routine | `ORWRA` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns an array containing a formattied imaging report. This array matches exactly the report format on the roll 'n scroll version of CPRS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | EXAMID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwra-report-text`

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

**API Endpoint:** `GET /vista/or/rpc/orqqpl-problem-list`

---

### `ORWRP REPORT LISTS`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORWRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns a list of reports, Health Summary types and date ranges that can be displayed at the workstation. There are no input parameters fo this rpc.

**API Endpoint:** `GET /vista/or/rpc/orwrp-report-lists`

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

**API Endpoint:** `GET /vista/or/rpc/orqqpl-user-prob-cats`

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

**API Endpoint:** `GET /vista/or/rpc/orqqpl-user-prob-list`

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

**API Endpoint:** `GET /vista/or/rpc/orqqpl-problem-lex-search`

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

**API Endpoint:** `GET /vista/or/rpc/orqqpl-edit-load`

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

**API Endpoint:** `GET /vista/or/rpc/orqqpl-init-pt`

---

### `ORWRP REPORT TEXT`

| Property | Value |
|----------|-------|
| Tag | `RPT` |
| Routine | `ORWRP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** This rpc retrieves the report text for a report selected on the Report tab. the report format on the roll 'n scroll version of CPRS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | REPORT ID | LITERAL | No |
| 3 | HEALTH SUMMARY TYPE | LITERAL | No |
| 4 | DATE RANGE | LITERAL | No |
| 5 | REPORT SECTION | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwrp-report-text`

---

### `ORQQPL PROVIDER LIST`

| Property | Value |
|----------|-------|
| Tag | `PROVSRCH` |
| Routine | `ORQQPL1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** RETURNS ARRAY OF PROVIDERS MATCHING INPUT

**API Endpoint:** `GET /vista/or/rpc/orqqpl-provider-list`

---

### `ORWRP PRINT REPORT`

| Property | Value |
|----------|-------|
| Tag | `PRINT` |
| Routine | `ORWRPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Description:** This rpc is used to print a report on the Report tab in CPRS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DEVICE | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | REPORT ID | LITERAL | No |
| 4 | HEALTH SUMMARY TYPE | LITERAL | No |
| 5 | DATE RANGE | LITERAL | No |
| 6 | EXAM ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwrp-print-report`

---

### `ORWLR REPORT LISTS`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORWLR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns a list of lab cumulative sections, and date ranges that can be displayed at the workstation. There are no input parameters fo this rpc.

**API Endpoint:** `GET /vista/or/rpc/orwlr-report-lists`

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

**API Endpoint:** `POST /vista/or/rpc/orqqpl-edit-save`

---

### `ORWLR CUMULATIVE SECTION`

| Property | Value |
|----------|-------|
| Tag | `RPT` |
| Routine | `ORWLR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This rpc retrieves the part of the lab cumulative report  selected by the user on the Labs tab.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | PART OF CUMULATIVE | LITERAL | No |
| 3 | DATE RANGE | LITERAL | No |
| 4 | REPORT SECTION | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwlr-cumulative-section`

---

### `ORQQPL CLIN SRCH`

| Property | Value |
|----------|-------|
| Tag | `CLINSRCH` |
| Routine | `ORQQPL1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns list of clinics for problem list. Should be replaced by CLIN^ORQPT

**API Endpoint:** `GET /vista/or/rpc/orqqpl-clin-srch`

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

**API Endpoint:** `POST /vista/or/rpc/orqqpl-add-save`

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

**API Endpoint:** `GET /vista/or/rpc/orqqpl-init-user`

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

**API Endpoint:** `POST /vista/or/rpc/orqqpl-update`

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

**API Endpoint:** `POST /vista/or/rpc/orqqpl-delete`

---

### `ORWRA PRINT REPORT`

| Property | Value |
|----------|-------|
| Tag | `PRINT` |
| Routine | `ORWRAP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This rpc is used to print an imaging report on the Imaging tab in CPRS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DEVICE | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | EXAM ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwra-print-report`

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

**API Endpoint:** `GET /vista/or/rpc/orqqpl-audit-hist`

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

**API Endpoint:** `GET /vista/or/rpc/orqqpl-replace`

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

**API Endpoint:** `POST /vista/or/rpc/orqqpl-verify`

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

**API Endpoint:** `GET /vista/or/rpc/orqqpl-prov-filter-list`

---

### `ORQQPL CLIN FILTER LIST`

| Property | Value |
|----------|-------|
| Tag | `GETCLIN` |
| Routine | `ORQQPL3` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** rETURNS ARRAY OF IEN^NAME FOR AN ARRAY OF IEN PASSED IN

**API Endpoint:** `GET /vista/or/rpc/orqqpl-clin-filter-list`

---

### `ORWDPS INPT`

| Property | Value |
|----------|-------|
| Tag | `INPT` |
| Routine | `ORWDPS` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Checks restrictions for entering inpatient meds.  If no restrictions, a 0 is returned.  If there is a restriction, it is returned in the format:      1^restriction text

**API Endpoint:** `GET /vista/or/rpc/orwdps-inpt`

---

### `ORQQPL SERV FILTER LIST`

| Property | Value |
|----------|-------|
| Tag | `GETSRVC` |
| Routine | `ORQQPL3` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** RETURNS ARRAY OF IEN^NAME FOR INPUT ARRAY OF IEN

**API Endpoint:** `GET /vista/or/rpc/orqqpl-serv-filter-list`

---

### `ORWDPS OUTPT`

| Property | Value |
|----------|-------|
| Tag | `OUTPT` |
| Routine | `ORWDPS` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Checks restrictions for entering outpatient meds.  If no restrictions, a 0 is returned.  If there is a restriction, it is returned in the format:      1^restriction text

**API Endpoint:** `GET /vista/or/rpc/orwdps-outpt`

---

### `ORWCS LIST OF CONSULT REPORTS`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORWCS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns a list on consult reports for a specific patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwcs-list-of-consult-reports`

---

### `ORWCS REPORT TEXT`

| Property | Value |
|----------|-------|
| Tag | `RPT` |
| Routine | `ORWCS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns an array containing a formattied consult report. This array matches exactly the report format on the roll 'n scroll version of CPRS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | CONSULT ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwcs-report-text`

---

### `ORWCS PRINT REPORT`

| Property | Value |
|----------|-------|
| Tag | `PRINT` |
| Routine | `ORWCSP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This rpc is used to print a consult report on the Consult tab in CPRS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DEVICE | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | CONSULT ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwcs-print-report`

---

### `ORWD KEY`

| Property | Value |
|----------|-------|
| Tag | `KEY` |
| Routine | `ORWD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** RPC which receives a key name and returns a 1 if the user holds the key, otherwise a 0 is returned.

**API Endpoint:** `GET /vista/or/rpc/orwd-key`

---

### `ORQQPL SRVC SRCH`

| Property | Value |
|----------|-------|
| Tag | `SRVCSRCH` |
| Routine | `ORQQPL1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** gET LIST OF AVAILABLE SERVICES

**API Endpoint:** `GET /vista/or/rpc/orqqpl-srvc-srch`

---

### `ORQQLR SEARCH RANGE INPT`

| Property | Value |
|----------|-------|
| Tag | `SRIN` |
| Routine | `ORQQLR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the date search range in number of days (e.g. 2) to begin the  search before today. For example, a value of 2 would indicate to limit the search between two days and today. Limited to inpatients.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqlr-search-range-inpt`

---

### `ORQQPX REMINDERS LIST`

| Property | Value |
|----------|-------|
| Tag | `REMIND` |
| Routine | `ORQQPX` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of clinical reminders.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpx-reminders-list`

---

### `ORWPT LAST5`

| Property | Value |
|----------|-------|
| Tag | `LAST5` |
| Routine | `ORWPT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of patients matching the string of Last Name Initial_Last 4 SSN (Initial/Last 4 look-up to PATIENT file).

**API Endpoint:** `GET /vista/or/rpc/orwpt-last5`

---

### `ORWU DT`

| Property | Value |
|----------|-------|
| Tag | `DT` |
| Routine | `ORWU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns date in internal VA FileMan format.

**API Endpoint:** `GET /vista/or/rpc/orwu-dt`

---

### `ORWPT CLINRNG`

| Property | Value |
|----------|-------|
| Tag | `CLINRNG` |
| Routine | `ORWPT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of selectable options from which a user can choose a date range for appointments.

**API Endpoint:** `GET /vista/or/rpc/orwpt-clinrng`

---

### `ORWU CLINLOC`

| Property | Value |
|----------|-------|
| Tag | `CLINLOC` |
| Routine | `ORWU` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of clinics from the HOSPITAL LOCATION file (#44).

**API Endpoint:** `GET /vista/or/rpc/orwu-clinloc`

---

### `ORWPT TOP`

| Property | Value |
|----------|-------|
| Tag | `TOP` |
| Routine | `ORWPT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns the last selected patient by the defined user.

**API Endpoint:** `GET /vista/or/rpc/orwpt-top`

---

### `ORWPT SELCHK`

| Property | Value |
|----------|-------|
| Tag | `SELCHK` |
| Routine | `ORWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns a 1 if the patient record is flagged as senstive, otherwise returns 0.

**API Endpoint:** `GET /vista/or/rpc/orwpt-selchk`

---

### `ORWPT SELECT`

| Property | Value |
|----------|-------|
| Tag | `SELECT` |
| Routine | `ORWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** RPC to return key information on a patient as follows:   1    2   3   4    5      6    7    8       9       10      11   12 13 NAME^SEX^DOB^SSN^LOCIEN^LOCNM^RMBD^CWAD^SENSITIVE^ADMITTED^CONV^SC^SC%^   14  15  16  17    18    19 ICN^AGE^TS^TSSVC^SIGI^PRONOUN

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpt-select`

---

### `ORWPT ENCTITL`

| Property | Value |
|----------|-------|
| Tag | `ENCTITL` |
| Routine | `ORWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns external values to display for encounter in format:      LOCNAME^LOCABBR^ROOMBED^PROVNAME

**API Endpoint:** `GET /vista/or/rpc/orwpt-enctitl`

---

### `ORWLRR ATOMICS`

| Property | Value |
|----------|-------|
| Tag | `ATOMICS` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-atomics`

---

### `ORWLRR SPEC`

| Property | Value |
|----------|-------|
| Tag | `SPEC` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-spec`

---

### `ORWLRR ALLTESTS`

| Property | Value |
|----------|-------|
| Tag | `ALLTESTS` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-alltests`

---

### `ORWLRR USERS`

| Property | Value |
|----------|-------|
| Tag | `USERS` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-users`

---

### `ORWLRR TG`

| Property | Value |
|----------|-------|
| Tag | `TG` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-tg`

---

### `ORWLRR ATESTS`

| Property | Value |
|----------|-------|
| Tag | `ATESTS` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-atests`

---

### `ORWLRR ATG`

| Property | Value |
|----------|-------|
| Tag | `ATG` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-atg`

---

### `ORWLRR UTGA`

| Property | Value |
|----------|-------|
| Tag | `UTGA` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-utga`

---

### `ORWLRR UTGR`

| Property | Value |
|----------|-------|
| Tag | `UTGR` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-utgr`

---

### `ORWLRR UTGD`

| Property | Value |
|----------|-------|
| Tag | `UTGD` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-utgd`

---

### `ORWLRR INTERIM`

| Property | Value |
|----------|-------|
| Tag | `INTERIM` |
| Routine | `ORWLRR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-interim`

---

### `ORWLRR INTERIMS`

| Property | Value |
|----------|-------|
| Tag | `INTERIMS` |
| Routine | `ORWLRR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-interims`

---

### `ORWLRR GRID`

| Property | Value |
|----------|-------|
| Tag | `GRID` |
| Routine | `ORWLRR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-grid`

---

### `ORWPT16 ID INFO`

| Property | Value |
|----------|-------|
| Tag | `IDINFO` |
| Routine | `ORWPT16` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpt16-id-info`

---

### `ORWPT16 LIST ALL`

| Property | Value |
|----------|-------|
| Tag | `LISTALL` |
| Routine | `ORWPT16` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpt16-list-all`

---

### `ORWPT16 LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `LOOKUP` |
| Routine | `ORWPT16` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpt16-lookup`

---

### `ORWPT16 DEMOG`

| Property | Value |
|----------|-------|
| Tag | `DEMOG` |
| Routine | `ORWPT16` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpt16-demog`

---

### `ORWPT16 GETVSIT`

| Property | Value |
|----------|-------|
| Tag | `GETVSIT` |
| Routine | `ORWPT16` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpt16-getvsit`

---

### `ORWPT16 APPTLST`

| Property | Value |
|----------|-------|
| Tag | `APPTLST` |
| Routine | `ORWPT16` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpt16-apptlst`

---

### `ORWPT16 ADMITLST`

| Property | Value |
|----------|-------|
| Tag | `ADMITLST` |
| Routine | `ORWPT16` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpt16-admitlst`

---

### `ORWPT16 PSCNVT`

| Property | Value |
|----------|-------|
| Tag | `PSCNVT` |
| Routine | `ORWPT16` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpt16-pscnvt`

---

### `ORWU16 USERINFO`

| Property | Value |
|----------|-------|
| Tag | `USERINFO` |
| Routine | `ORWU16` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns information about the current user in the format:      DUZ^NAME^USRCLS^CANSIGN^ISPROVIDER^ORDERROLE^NOORDER^DTIME^CD

**API Endpoint:** `GET /vista/or/rpc/orwu16-userinfo`

---

### `ORWU16 VALIDSIG`

| Property | Value |
|----------|-------|
| Tag | `VALIDSIG` |
| Routine | `ORWU16` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwu16-validsig`

---

### `ORWU16 HOSPLOC`

| Property | Value |
|----------|-------|
| Tag | `HOSPLOC` |
| Routine | `ORWU16` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwu16-hosploc`

---

### `ORWU16 VALDT`

| Property | Value |
|----------|-------|
| Tag | `VALDT` |
| Routine | `ORWU16` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwu16-valdt`

---

### `ORWU16 NEWPERS`

| Property | Value |
|----------|-------|
| Tag | `NEWPERS` |
| Routine | `ORWU16` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwu16-newpers`

---

### `ORWU16 DEVICE`

| Property | Value |
|----------|-------|
| Tag | `DEVICE` |
| Routine | `ORWU16` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwu16-device`

---

### `ORWLRR INTERIMG`

| Property | Value |
|----------|-------|
| Tag | `INTERIMG` |
| Routine | `ORWLRR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-interimg`

---

### `ORWU EXTNAME`

| Property | Value |
|----------|-------|
| Tag | `EXTNAME` |
| Routine | `ORWU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the external form of a pointer value given the IEN and file number.

**API Endpoint:** `GET /vista/or/rpc/orwu-extname`

---

### `ORWLRR NEWOLD`

| Property | Value |
|----------|-------|
| Tag | `NEWOLD` |
| Routine | `ORWLRR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-newold`

---

### `ORWLRR MICRO`

| Property | Value |
|----------|-------|
| Tag | `MICRO` |
| Routine | `ORWLRR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-micro`

---

### `ORWLRR CHART`

| Property | Value |
|----------|-------|
| Tag | `CHART` |
| Routine | `ORWLRR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-chart`

---

### `ORWLRR CHEMTEST`

| Property | Value |
|----------|-------|
| Tag | `CHEMTEST` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-chemtest`

---

### `ORWLRR PARAM`

| Property | Value |
|----------|-------|
| Tag | `PARAM` |
| Routine | `ORWLRR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwlrr-param`

---

### `ORWPT PTINQ`

| Property | Value |
|----------|-------|
| Tag | `PTINQ` |
| Routine | `ORWPT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Returns formatted patient inquiry text for display in GUI environment.

**API Endpoint:** `GET /vista/or/rpc/orwpt-ptinq`

---

### `ORWPCE DIAG`

| Property | Value |
|----------|-------|
| Tag | `DIAG` |
| Routine | `ORWPCE` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of diagnosis codes for a clinic location.

**API Endpoint:** `GET /vista/or/rpc/orwpce-diag`

---

### `ORWPCE PROC`

| Property | Value |
|----------|-------|
| Tag | `PROC` |
| Routine | `ORWPCE` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of procedures for a clinic location.

**API Endpoint:** `GET /vista/or/rpc/orwpce-proc`

---

### `ORWPCE VISIT`

| Property | Value |
|----------|-------|
| Tag | `VISIT` |
| Routine | `ORWPCE` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of visit types for a clinic.

**API Endpoint:** `GET /vista/or/rpc/orwpce-visit`

---

### `ORWRP16 REPORT TEXT`

| Property | Value |
|----------|-------|
| Tag | `RPT` |
| Routine | `ORWRP16` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** This rpc retrieves the report text for a report selected on the Report tab. the report format on the roll 'n scroll version of CPRS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | REPORT ID | LITERAL | No |
| 3 | HEALTH SUMMARY TYPE | LITERAL | No |
| 4 | DATE RANGE | LITERAL | No |
| 5 | REPORT SECTION | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwrp16-report-text`

---

### `ORWRP16 REPORT LISTS`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORWRP16` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns a list of reports, Health Summary types and date ranges that can be displayed at the workstation. There are no input parameters fo this rpc.

**API Endpoint:** `GET /vista/or/rpc/orwrp16-report-lists`

---

### `ORQQPX REMINDER DETAIL`

| Property | Value |
|----------|-------|
| Tag | `REMDET` |
| Routine | `ORQQPX` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the details of a clinical reminder.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | CLINICAL REMINDER ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpx-reminder-detail`

---

### `ORWPCE SCDIS`

| Property | Value |
|----------|-------|
| Tag | `SCDIS` |
| Routine | `ORWPCE` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns service connected percentage and rated disabilities for a patient.

**API Endpoint:** `GET /vista/or/rpc/orwpce-scdis`

---

### `ORWPCE SCSEL`

| Property | Value |
|----------|-------|
| Tag | `SCSEL` |
| Routine | `ORWPCE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns a list of service connected conditions that may be selected.

**API Endpoint:** `GET /vista/or/rpc/orwpce-scsel`

---

### `ORWUX SYMTAB`

| Property | Value |
|----------|-------|
| Tag | `SYMTAB` |
| Routine | `ORWUX` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Returns the contents of the current session's symbol table.

**API Endpoint:** `GET /vista/or/rpc/orwux-symtab`

---

### `ORWPCE PCE4NOTE`

| Property | Value |
|----------|-------|
| Tag | `PCE4NOTE` |
| Routine | `ORWPCE3` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns the encounter information for an associated note in the format:   LST(1)=HDR^AllowEdit^CPTRequired^VStr^Author^hasCPT LST(n)=TYP+^CODE^CAT^NARR^QUAL1^QUAL2 (QUAL1=Primary!Qty, QUAL2=Prv)

**API Endpoint:** `GET /vista/or/rpc/orwpce-pce4note`

---

### `ORWORDG MAPSEQ`

| Property | Value |
|----------|-------|
| Tag | `MAPSEQ` |
| Routine | `ORWORDG` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwordg-mapseq`

---

### `ORWU TOOLMENU`

| Property | Value |
|----------|-------|
| Tag | `TOOLMENU` |
| Routine | `ORWU` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of items for the CPRS GUI Tools menu.

**API Endpoint:** `GET /vista/or/rpc/orwu-toolmenu`

---

### `ORWU HASKEY`

| Property | Value |
|----------|-------|
| Tag | `HASKEY` |
| Routine | `ORWU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns 1 if a user holds a security key, otherwise 0.

**API Endpoint:** `GET /vista/or/rpc/orwu-haskey`

---

### `ORWORDG ALLTREE`

| Property | Value |
|----------|-------|
| Tag | `ALLTREE` |
| Routine | `ORWORDG` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the tree for all display groups.

**API Endpoint:** `GET /vista/or/rpc/orwordg-alltree`

---

### `ORWORDG REVSTS`

| Property | Value |
|----------|-------|
| Tag | `REVSTS` |
| Routine | `ORWORDG` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the status flags available for review orders action.

**API Endpoint:** `GET /vista/or/rpc/orwordg-revsts`

---

### `ORWORDG IEN`

| Property | Value |
|----------|-------|
| Tag | `IEN` |
| Routine | `ORWORDG` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns IEN of a display group.

**API Endpoint:** `GET /vista/or/rpc/orwordg-ien`

---

### `ORWPCE SAVE`

| Property | Value |
|----------|-------|
| Tag | `SAVE` |
| Routine | `ORWPCE` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Saves PCE information entered into CPRS GUI.

**API Endpoint:** `POST /vista/or/rpc/orwpce-save`

---

### `ORWPCE CPTREQD`

| Property | Value |
|----------|-------|
| Tag | `CPTREQD` |
| Routine | `ORWPCE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns 1 if TIU DOCUMENT file entry needs a CPT code.

**API Endpoint:** `GET /vista/or/rpc/orwpce-cptreqd`

---

### `ORWPCE NOTEVSTR`

| Property | Value |
|----------|-------|
| Tag | `NOTEVSTR` |
| Routine | `ORWPCE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns VISIT LOCATION;EPISODE BEGIN DATE;VISIT TYPE from the TIU DOCUMENT file.

**API Endpoint:** `GET /vista/or/rpc/orwpce-notevstr`

---

### `ORWPCE DELETE`

| Property | Value |
|----------|-------|
| Tag | `DELETE` |
| Routine | `ORWPCE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** Delete PCE information related to a note being deleted.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VSTR | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | VISIT | LITERAL | No |

**API Endpoint:** `POST /vista/or/rpc/orwpce-delete`

---

### `ORWPCE LEX`

| Property | Value |
|----------|-------|
| Tag | `LEX` |
| Routine | `ORWPCE` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns list based on lexicon look-up.

**API Endpoint:** `GET /vista/or/rpc/orwpce-lex`

---

### `ORWPCE LEXCODE`

| Property | Value |
|----------|-------|
| Tag | `LEXCODE` |
| Routine | `ORWPCE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns a code associated with a lexicon entry.

**API Endpoint:** `GET /vista/or/rpc/orwpce-lexcode`

---

### `ORWCH LOADALL`

| Property | Value |
|----------|-------|
| Tag | `LOADALL` |
| Routine | `ORWCH` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC returns the sizing related CPRS GUI chart parameters for the user.

**API Endpoint:** `GET /vista/or/rpc/orwch-loadall`

---

### `ORWCH SAVESIZ`

| Property | Value |
|----------|-------|
| Tag | `SAVESIZ` |
| Routine | `ORWCH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This RPC saves the size (bounds) for a particular CPRS GUI control.

**API Endpoint:** `GET /vista/or/rpc/orwch-savesiz`

---

### `ORWCH SAVEALL`

| Property | Value |
|----------|-------|
| Tag | `SAVEALL` |
| Routine | `ORWCH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This RPC saves the sizing related CPRS GUI chart parameters for the user.

**API Endpoint:** `GET /vista/or/rpc/orwch-saveall`

---

### `ORWRP1 LISTNUTR`

| Property | Value |
|----------|-------|
| Tag | `LISTNUTR` |
| Routine | `ORWRP1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwrp1-listnutr`

---

### `ORQQVI1 GRID`

| Property | Value |
|----------|-------|
| Tag | `GRID` |
| Routine | `ORQQVI1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orqqvi1-grid`

---

### `ORWPS ACTIVE`

| Property | Value |
|----------|-------|
| Tag | `ACTIVE` |
| Routine | `ORWPS` |
| Return Type | ARRAY |
| Parameter Count | 4 |

**Description:** Returns listing of a patient's active inpatient and outpatient medications.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | USER | LITERAL | No |
| 3 | VIEW | LITERAL | No |
| 4 | UPDATE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwps-active`

---

### `ORWPT DFLTSRC`

| Property | Value |
|----------|-------|
| Tag | `DFLTSRC` |
| Routine | `ORWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return user's default patient list source.

**API Endpoint:** `GET /vista/or/rpc/orwpt-dfltsrc`

---

### `ORWPS DETAIL`

| Property | Value |
|----------|-------|
| Tag | `DETAIL` |
| Routine | `ORWPS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Returns text of details for a specific mediction order.

**API Endpoint:** `GET /vista/or/rpc/orwps-detail`

---

### `ORWU PATCH`

| Property | Value |
|----------|-------|
| Tag | `PATCH` |
| Routine | `ORWU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns a 1 if the specified patch is installed on the system, otherwise returns a 0.

**API Endpoint:** `GET /vista/or/rpc/orwu-patch`

---

### `ORWPT SHARE`

| Property | Value |
|----------|-------|
| Tag | `SHARE` |
| Routine | `ORWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpt-share`

---

### `ORQQCN LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORQQCN` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of consult requests for a patient within optional date range and optional service.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT | LITERAL | No |
| 2 | START DATE | LITERAL | No |
| 3 | STOP DATE | LITERAL | No |
| 4 | SERVICE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-list`

---

### `ORQQCN DETAIL`

| Property | Value |
|----------|-------|
| Tag | `DETAIL` |
| Routine | `ORQQCN` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns formatted detailed information regarding the consult request, including result report if available.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CONSULT ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-detail`

---

### `ORK TRIGGER`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `ORKCHK` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This function returns a list of order check messages.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | ORDER INFO | REFERENCE | No |
| 3 | ORDER MODE/EVENT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/ork-trigger`

---

### `ORWU GENERIC`

| Property | Value |
|----------|-------|
| Tag | `GENERIC` |
| Routine | `ORWU` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of entries from a cross-reference passed in.

**API Endpoint:** `GET /vista/or/rpc/orwu-generic`

---

### `ORQQCN RECEIVE`

| Property | Value |
|----------|-------|
| Tag | `RC` |
| Routine | `ORQQCN1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Test version of RECEIVE CONSULT for use with GUI.  (REV - 8/22/97)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CONSULT ID | LITERAL | No |
| 2 | CONSULT RECEIVER | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-receive`

---

### `ORQQCN DISCONTINUE`

| Property | Value |
|----------|-------|
| Tag | `DC` |
| Routine | `ORQQCN1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** Discontinue a consult or deny a consult request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CONSULT ID | LITERAL | No |
| 2 | PROVIDER ID | LITERAL | No |
| 3 | DATE OF ACTION | LITERAL | No |
| 4 | ACTION TYPE | LITERAL | No |
| 5 | COMMENTS | LIST | No |

**API Endpoint:** `POST /vista/or/rpc/orqqcn-discontinue`

---

### `ORQQCN FORWARD`

| Property | Value |
|----------|-------|
| Tag | `FR` |
| Routine | `ORQQCN1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Description:** Forwards a consult to a subservice of the forwarding service, as defined in file 123.5

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CONSULT ID | LITERAL | No |
| 2 | TO SERVICE | LITERAL | No |
| 3 | FORWARDER | LITERAL | No |
| 4 | ATTENTION OF | LITERAL | No |
| 5 | URGENCY | LITERAL | No |
| 6 | COMMENTS | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-forward`

---

### `ORQQCN SET ACT MENUS`

| Property | Value |
|----------|-------|
| Tag | `SETACTM` |
| Routine | `ORQQCN1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Based on the IEN of the consult passed in, returns a string representing various facets of the user's access level for that consult and service. This allows dynamic enabling/disabling of GUI menus based on the user's ability to act on that particular consult.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CONSULT ID | LITERAL | No |

**API Endpoint:** `POST /vista/or/rpc/orqqcn-set-act-menus`

---

### `ORQQCN URGENCIES`

| Property | Value |
|----------|-------|
| Tag | `URG` |
| Routine | `ORQQCN1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of applicable urgencies from PROTOCOL file 101, given a ConsultIEN and type.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Consult ID | LITERAL | No |
| 2 | Request type | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-urgencies`

---

### `ORQQCN ADDCMT`

| Property | Value |
|----------|-------|
| Tag | `CMT` |
| Routine | `ORQQCN2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Allows addition of a comment to a consult request/consult without changing its status. Optionally, allows sending of an alert to the requesting provider and others.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Consult ID | LITERAL | No |
| 2 | Comments | REFERENCE | No |
| 3 | Alert | LITERAL | No |
| 4 | Alert to | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-addcmt`

---

### `ORQQCN GET CONSULT`

| Property | Value |
|----------|-------|
| Tag | `GETCSLT` |
| Routine | `ORQQCN1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Given a Consult ID from file 123, return the zero node to the client for loading into a consult record in RESULTS[0].  If the consult has any associated TIU records (completion, addenda) these will be returned in RESULTS[i..j].

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Consult ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-get-consult`

---

### `ORWDX ORDITM`

| Property | Value |
|----------|-------|
| Tag | `ORDITM` |
| Routine | `ORWDX` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns an array of orderable items in the format:    Y(n)=IEN^.01 Name^.01 Name  -or-  IEN^Synonym <.01 Name>^.01 Name

**API Endpoint:** `GET /vista/or/rpc/orwdx-orditm`

---

### `ORWDX DLGDEF`

| Property | Value |
|----------|-------|
| Tag | `DLGDEF` |
| Routine | `ORWDX` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return format information for an order dialog in the format:    LST(n): PrmtID^PrmtIEN^FmtSeq^Fmt^Omit^Lead^Trail^NwLn^Wrap^Chld^IsChld

**API Endpoint:** `GET /vista/or/rpc/orwdx-dlgdef`

---

### `ORWDX DLGQUIK`

| Property | Value |
|----------|-------|
| Tag | `DLGQUIK` |
| Routine | `ORWDX` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return responses for a quick order (no longer used).

**API Endpoint:** `GET /vista/or/rpc/orwdx-dlgquik`

---

### `ORWPCE IMM`

| Property | Value |
|----------|-------|
| Tag | `IMM` |
| Routine | `ORWPCE` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of immunizations for a clinic.

**API Endpoint:** `GET /vista/or/rpc/orwpce-imm`

---

### `ORWPCE SK`

| Property | Value |
|----------|-------|
| Tag | `SK` |
| Routine | `ORWPCE` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of skin tests for a clinic.

**API Endpoint:** `GET /vista/or/rpc/orwpce-sk`

---

### `ORWPCE PED`

| Property | Value |
|----------|-------|
| Tag | `PED` |
| Routine | `ORWPCE` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns list of education topics for a clinic.

**API Endpoint:** `GET /vista/or/rpc/orwpce-ped`

---

### `ORWPCE HF`

| Property | Value |
|----------|-------|
| Tag | `HF` |
| Routine | `ORWPCE` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of health factors for a clinic.

**API Endpoint:** `GET /vista/or/rpc/orwpce-hf`

---

### `ORWPCE TRT`

| Property | Value |
|----------|-------|
| Tag | `TRT` |
| Routine | `ORWPCE` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of treatments for a clinic.

**API Endpoint:** `GET /vista/or/rpc/orwpce-trt`

---

### `ORWPCE XAM`

| Property | Value |
|----------|-------|
| Tag | `XAM` |
| Routine | `ORWPCE` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of exams for a clinic.

**API Endpoint:** `GET /vista/or/rpc/orwpce-xam`

---

### `ORWPCE GET SET OF CODES`

| Property | Value |
|----------|-------|
| Tag | `GETSET` |
| Routine | `ORWPCE2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns values for a set of codes given a file and field number.

**API Endpoint:** `POST /vista/or/rpc/orwpce-get-set-of-codes`

---

### `ORWPCE GET IMMUNIZATION TYPE`

| Property | Value |
|----------|-------|
| Tag | `IMMTYPE` |
| Routine | `ORWPCE2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of active immunizations.

**API Endpoint:** `GET /vista/or/rpc/orwpce-get-immunization-type`

---

### `ORWPCE GET SKIN TEST TYPE`

| Property | Value |
|----------|-------|
| Tag | `SKTYPE` |
| Routine | `ORWPCE2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of the active skin test codes.

**API Endpoint:** `GET /vista/or/rpc/orwpce-get-skin-test-type`

---

### `ORWPCE GET EDUCATION TOPICS`

| Property | Value |
|----------|-------|
| Tag | `EDTTYPE` |
| Routine | `ORWPCE2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of active education topics.

**API Endpoint:** `GET /vista/or/rpc/orwpce-get-education-topics`

---

### `ORWPCE GET HEALTH FACTORS TY`

| Property | Value |
|----------|-------|
| Tag | `HFTYPE` |
| Routine | `ORWPCE2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of active health factor types.

**API Endpoint:** `GET /vista/or/rpc/orwpce-get-health-factors-ty`

---

### `ORWPCE GET EXAM TYPE`

| Property | Value |
|----------|-------|
| Tag | `EXAMTYPE` |
| Routine | `ORWPCE2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns the list of active exam types.

**API Endpoint:** `GET /vista/or/rpc/orwpce-get-exam-type`

---

### `ORWPCE GET TREATMENT TYPE`

| Property | Value |
|----------|-------|
| Tag | `TRTTYPE` |
| Routine | `ORWPCE2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns the list of active treatments.

**API Endpoint:** `GET /vista/or/rpc/orwpce-get-treatment-type`

---

### `ORQQCN SVCTREE`

| Property | Value |
|----------|-------|
| Tag | `SVCTREE` |
| Routine | `ORQQCN2` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns a specially formatted list of consult services for use in populating a GUI TreeView control.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PURPOSE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-svctree`

---

### `ORWDCN32 DEF`

| Property | Value |
|----------|-------|
| Tag | `DEF` |
| Routine | `ORWDCN32` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Load dialog data (lists & defaults) for a consult order. (32-BIT)

**API Endpoint:** `GET /vista/or/rpc/orwdcn32-def`

---

### `ORQQCN STATUS`

| Property | Value |
|----------|-------|
| Tag | `STATUS` |
| Routine | `ORQQCN2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of consult statuses currently in use, as reflected in the "AC" XREF of ^GMR(123.1.

**API Endpoint:** `GET /vista/or/rpc/orqqcn-status`

---

### `ORQQCN MED RESULTS`

| Property | Value |
|----------|-------|
| Tag | `MEDRSLT` |
| Routine | `ORQQCN2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Returns a display of Medicine Package results, followed by any TIU results.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Consult ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-med-results`

---

### `ORWDRA32 DEF`

| Property | Value |
|----------|-------|
| Tag | `DEF` |
| Routine | `ORWDRA32` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Loads dialog data (lists & defaults) for a radiology order.

**API Endpoint:** `GET /vista/or/rpc/orwdra32-def`

---

### `ORWDX SAVE`

| Property | Value |
|----------|-------|
| Tag | `SAVE` |
| Routine | `ORWDX` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Save the order by passing in the following information:         ORVP=DFN         ORNP=Provider         ORL=Location         DLG=Order Dialog,         ORDG=Display Group         ORIT=Quick Order Dialog,         ORIFN=null if new order         ORDIALOG=Response List

**API Endpoint:** `POST /vista/or/rpc/orwdx-save`

---

### `ORWDPS32 DLGSLCT`

| Property | Value |
|----------|-------|
| Tag | `DLGSLCT` |
| Routine | `ORWDPS32` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Description:** Returns default lists for order dialogs in CPRS GUI.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PSTYPE | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | LOCIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdps32-dlgslct`

---

### `ORWDPS32 OISLCT`

| Property | Value |
|----------|-------|
| Tag | `OISLCT` |
| Routine | `ORWDPS32` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns defaults for pharmacy orderable items.

**API Endpoint:** `GET /vista/or/rpc/orwdps32-oislct`

---

### `ORWDPS32 ALLROUTE`

| Property | Value |
|----------|-------|
| Tag | `ALLROUTE` |
| Routine | `ORWDPS32` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of all available medication routes.

**API Endpoint:** `GET /vista/or/rpc/orwdps32-allroute`

---

### `ORQQVI VITALS FOR DATE RANGE`

| Property | Value |
|----------|-------|
| Tag | `VITALS` |
| Routine | `ORQQVI` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Function returns a patient's vital measurements between start date and  stop date.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | START DATE/TIME | LITERAL | No |
| 3 | STOP DATE/TIME | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqvi-vitals-for-date-range`

---

### `ORQQVI2 VITALS HELP`

| Property | Value |
|----------|-------|
| Tag | `HELP` |
| Routine | `ORQQVI2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orqqvi2-vitals-help`

---

### `ORQQVI2 VITALS RATE CHECK`

| Property | Value |
|----------|-------|
| Tag | `RATECHK` |
| Routine | `ORQQVI2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orqqvi2-vitals-rate-check`

---

### `ORQQVI2 VITALS VALIDATE`

| Property | Value |
|----------|-------|
| Tag | `VALIDATE` |
| Routine | `ORQQVI2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orqqvi2-vitals-validate`

---

### `ORQQVI2 VITALS VALIDATE TYPE`

| Property | Value |
|----------|-------|
| Tag | `VMTYPES` |
| Routine | `ORQQVI2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orqqvi2-vitals-validate-type`

---

### `ORWDLR32 DEF`

| Property | Value |
|----------|-------|
| Tag | `DEF` |
| Routine | `ORWDLR32` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Get lab order dialog definition.

**API Endpoint:** `GET /vista/or/rpc/orwdlr32-def`

---

### `ORWDLR32 LOAD`

| Property | Value |
|----------|-------|
| Tag | `LOAD` |
| Routine | `ORWDLR32` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Return sample, specimen, & urgency info about a lab test.

**API Endpoint:** `GET /vista/or/rpc/orwdlr32-load`

---

### `ORWDLR32 ALLSAMP`

| Property | Value |
|----------|-------|
| Tag | `ALLSAMP` |
| Routine | `ORWDLR32` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns all collection samples in the format:    n^SampIEN^SampName^SpecPtr^TubeTop^^^LabCollect^^SpecName

**API Endpoint:** `GET /vista/or/rpc/orwdlr32-allsamp`

---

### `ORWDLR32 ABBSPEC`

| Property | Value |
|----------|-------|
| Tag | `ABBSPEC` |
| Routine | `ORWDLR32` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of lab specimens with abbreviations.

**API Endpoint:** `GET /vista/or/rpc/orwdlr32-abbspec`

---

### `ORWDLR32 STOP`

| Property | Value |
|----------|-------|
| Tag | `STOP` |
| Routine | `ORWDLR33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns a calculated stop date for a lab order.

**API Endpoint:** `GET /vista/or/rpc/orwdlr32-stop`

---

### `ORQQVI2 VITALS VAL & STORE`

| Property | Value |
|----------|-------|
| Tag | `VALSTORE` |
| Routine | `ORQQVI2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orqqvi2-vitals-val-&-store`

---

### `ORWDX SEND`

| Property | Value |
|----------|-------|
| Tag | `SEND` |
| Routine | `ORWDX` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** RPC to sign a list of orders with input as follows:         DFN=Patient         ORNP=Provider         ORL=Location         ES=Encrypted ES code          ORWREC(n)=ORIFN;Action^Signature Sts^Release Sts^Nature of Order

**API Endpoint:** `GET /vista/or/rpc/orwdx-send`

---

### `ORWDPS32 AUTH`

| Property | Value |
|----------|-------|
| Tag | `AUTH` |
| Routine | `ORWDPS32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Checks restrictions for entering inpatient meds.  If no restrictions, a 0 is returned.  If there is a restriction, it is returned in the format:      1^restriction text

**API Endpoint:** `GET /vista/or/rpc/orwdps32-auth`

---

### `ORWDPS32 DRUGMSG`

| Property | Value |
|----------|-------|
| Tag | `DRUGMSG` |
| Routine | `ORWDPS33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return message text that is associated with a dispense drug.

**API Endpoint:** `GET /vista/or/rpc/orwdps32-drugmsg`

---

### `ORWDPS32 MEDISIV`

| Property | Value |
|----------|-------|
| Tag | `MEDISIV` |
| Routine | `ORWDPS33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return 1 if orderable item is an IV medication, otherwise return 0.

**API Endpoint:** `GET /vista/or/rpc/orwdps32-medisiv`

---

### `ORWDPS32 FORMALT`

| Property | Value |
|----------|-------|
| Tag | `FORMALT` |
| Routine | `ORWDPS33` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return a list of formulary alternatives.

**API Endpoint:** `GET /vista/or/rpc/orwdps32-formalt`

---

### `ORWDX WRLST`

| Property | Value |
|----------|-------|
| Tag | `WRLST` |
| Routine | `ORWDX` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return list of dialogs for writing orders in format:         Y(n)=DlgName^ListBox Text

**API Endpoint:** `GET /vista/or/rpc/orwdx-wrlst`

---

### `ORQQCN SHOW SF513`

| Property | Value |
|----------|-------|
| Tag | `SHOW513` |
| Routine | `ORQQCN2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Returns text of consults standard form 513 for display in GUI application.

**API Endpoint:** `GET /vista/or/rpc/orqqcn-show-sf513`

---

### `ORQQCN PRINT SF513`

| Property | Value |
|----------|-------|
| Tag | `PRT513` |
| Routine | `ORQQCN2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-print-sf513`

---

### `ORWDRA32 PROCMSG`

| Property | Value |
|----------|-------|
| Tag | `PROCMSG` |
| Routine | `ORWDRA32` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdra32-procmsg`

---

### `ORWDCN32 ORDRMSG`

| Property | Value |
|----------|-------|
| Tag | `ORDRMSG` |
| Routine | `ORWDCN32` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdcn32-ordrmsg`

---

### `ORWDRA32 RAORDITM`

| Property | Value |
|----------|-------|
| Tag | `RAORDITM` |
| Routine | `ORWDRA32` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/or/rpc/orwdra32-raorditm`

---

### `ORWDRA32 ISOLATN`

| Property | Value |
|----------|-------|
| Tag | `ISOLATN` |
| Routine | `ORWDRA32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdra32-isolatn`

---

### `ORWDRA32 APPROVAL`

| Property | Value |
|----------|-------|
| Tag | `APPROVAL` |
| Routine | `ORWDRA32` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdra32-approval`

---

### `ORWDXA VALID`

| Property | Value |
|----------|-------|
| Tag | `VALID` |
| Routine | `ORWDXA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns an error message if the selected action is not valid for a particular CPRS GUI order.

**API Endpoint:** `GET /vista/or/rpc/orwdxa-valid`

---

### `ORWDXA HOLD`

| Property | Value |
|----------|-------|
| Tag | `HOLD` |
| Routine | `ORWDXA` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** RPC to place an existing order on hold.

**API Endpoint:** `POST /vista/or/rpc/orwdxa-hold`

---

### `ORWDXA UNHOLD`

| Property | Value |
|----------|-------|
| Tag | `UNHOLD` |
| Routine | `ORWDXA` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** RPC to remove a particular order from hold status.

**API Endpoint:** `GET /vista/or/rpc/orwdxa-unhold`

---

### `ORWDXA DC`

| Property | Value |
|----------|-------|
| Tag | `DC` |
| Routine | `ORWDXA` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RPC to discontinue, cancel, or delete an existing order.

**API Endpoint:** `POST /vista/or/rpc/orwdxa-dc`

---

### `ORWDXA DCREASON`

| Property | Value |
|----------|-------|
| Tag | `DCREASON` |
| Routine | `ORWDXA` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** RPC to return a list of valid discontinuation reasons.

**API Endpoint:** `GET /vista/or/rpc/orwdxa-dcreason`

---

### `ORWDXA ALERT`

| Property | Value |
|----------|-------|
| Tag | `ALERT` |
| Routine | `ORWDXA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Set order to send an alert when the order is resulted.

**API Endpoint:** `GET /vista/or/rpc/orwdxa-alert`

---

### `ORWDXA FLAG`

| Property | Value |
|----------|-------|
| Tag | `FLAG` |
| Routine | `ORWDXA` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Flag an existing order.

**API Endpoint:** `POST /vista/or/rpc/orwdxa-flag`

---

### `ORWDXA UNFLAG`

| Property | Value |
|----------|-------|
| Tag | `UNFLAG` |
| Routine | `ORWDXA` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Unflag an existing order.

**API Endpoint:** `GET /vista/or/rpc/orwdxa-unflag`

---

### `ORWDXA FLAGTXT`

| Property | Value |
|----------|-------|
| Tag | `FLAGTXT` |
| Routine | `ORWDXA` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return text associated with a particular flagged order (reason for flag).

**API Endpoint:** `GET /vista/or/rpc/orwdxa-flagtxt`

---

### `ORWDXA COMPLETE`

| Property | Value |
|----------|-------|
| Tag | `COMPLETE` |
| Routine | `ORWDXA` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Complete an order.

**API Endpoint:** `POST /vista/or/rpc/orwdxa-complete`

---

### `ORWDXA VERIFY`

| Property | Value |
|----------|-------|
| Tag | `VERIFY` |
| Routine | `ORWDXA` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Verify an order via CPRS GUI.

**API Endpoint:** `POST /vista/or/rpc/orwdxa-verify`

---

### `ORWDPS32 SCSTS`

| Property | Value |
|----------|-------|
| Tag | `SCSTS` |
| Routine | `ORWDPS33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return pharmacy-related service connected eligibility for a patient.

**API Endpoint:** `GET /vista/or/rpc/orwdps32-scsts`

---

### `ORWOR RESULT`

| Property | Value |
|----------|-------|
| Tag | `RESULT` |
| Routine | `ORWOR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Returns results of a CPRS order.

**API Endpoint:** `GET /vista/or/rpc/orwor-result`

---

### `ORWDXA WCGET`

| Property | Value |
|----------|-------|
| Tag | `WCGET` |
| Routine | `ORWDXA` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return ward comments for an order.

**API Endpoint:** `GET /vista/or/rpc/orwdxa-wcget`

---

### `ORWDXA WCPUT`

| Property | Value |
|----------|-------|
| Tag | `WCPUT` |
| Routine | `ORWDXA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Set ward comments for an order.

**API Endpoint:** `GET /vista/or/rpc/orwdxa-wcput`

---

### `ORWDRA32 IMTYPSEL`

| Property | Value |
|----------|-------|
| Tag | `IMTYPSEL` |
| Routine | `ORWDRA32` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdra32-imtypsel`

---

### `ORWDXQ DLGNAME`

| Property | Value |
|----------|-------|
| Tag | `DLGNAME` |
| Routine | `ORWDXQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return display name for a dialog.

**API Endpoint:** `GET /vista/or/rpc/orwdxq-dlgname`

---

### `ORWDXQ GETQLST`

| Property | Value |
|----------|-------|
| Tag | `GETQLST` |
| Routine | `ORWDXQ` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return quick list for a display group.

**API Endpoint:** `GET /vista/or/rpc/orwdxq-getqlst`

---

### `ORWPCE ACTIVE PROV`

| Property | Value |
|----------|-------|
| Tag | `ACTIVPRV` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This calls the PCE API $$ACTIVPRV^PXAPI(provider ien, encounter d/t) to see if the provider can be stored by PCE.   Returns a 1 if provider is  good and 0 if the provider is not active or does not have an active  person class.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PROVIDER IEN | LITERAL | No |
| 2 | ENCOUNTER DATE/TIME | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-active-prov`

---

### `ORWDLR32 MAXDAYS`

| Property | Value |
|----------|-------|
| Tag | `MAXDAYS` |
| Routine | `ORWDLR33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the maximum number of days for a continuous lab order.

**API Endpoint:** `GET /vista/or/rpc/orwdlr32-maxdays`

---

### `ORWDXQ PUTQLST`

| Property | Value |
|----------|-------|
| Tag | `PUTQLST` |
| Routine | `ORWDXQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Save quick order list.

**API Endpoint:** `GET /vista/or/rpc/orwdxq-putqlst`

---

### `ORWDXQ PUTQNAM`

| Property | Value |
|----------|-------|
| Tag | `PUTQNAM` |
| Routine | `ORWDXQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Save display name for quick order dialog.

**API Endpoint:** `GET /vista/or/rpc/orwdxq-putqnam`

---

### `ORWDXQ DLGSAVE`

| Property | Value |
|----------|-------|
| Tag | `DLGSAVE` |
| Routine | `ORWDXQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return IEN of new or existing quick order.

**API Endpoint:** `GET /vista/or/rpc/orwdxq-dlgsave`

---

### `ORWDXQ GETQNAM`

| Property | Value |
|----------|-------|
| Tag | `GETQNAM` |
| Routine | `ORWDXQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return current quick order name.

**API Endpoint:** `GET /vista/or/rpc/orwdxq-getqnam`

---

### `ORWDX LOADRSP`

| Property | Value |
|----------|-------|
| Tag | `LOADRSP` |
| Routine | `ORWDX` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RSPID | LITERAL | No |
| 2 | TRANS | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdx-loadrsp`

---

### `ORWDX FORMID`

| Property | Value |
|----------|-------|
| Tag | `FORMID` |
| Routine | `ORWDX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the base dialog FormID for an order.

**API Endpoint:** `GET /vista/or/rpc/orwdx-formid`

---

### `ORWDXR ISREL`

| Property | Value |
|----------|-------|
| Tag | `ISREL` |
| Routine | `ORWDXR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return 1 if an order has been released, otherwise return 0.

**API Endpoint:** `GET /vista/or/rpc/orwdxr-isrel`

---

### `ORWORDG GRPSEQB`

| Property | Value |
|----------|-------|
| Tag | `GRPSEQB` |
| Routine | `ORWORDG` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns expanded list of display groups. for the current site/user.

**API Endpoint:** `GET /vista/or/rpc/orwordg-grpseqb`

---

### `ORWDXR RNWFLDS`

| Property | Value |
|----------|-------|
| Tag | `RNWFLDS` |
| Routine | `ORWDXR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return fields for renew action in format:     LST(0)=RenewType^Start^Stop^Refills^Pickup  LST(n)=Comments

**API Endpoint:** `GET /vista/or/rpc/orwdxr-rnwflds`

---

### `ORWU VALDT`

| Property | Value |
|----------|-------|
| Tag | `VALDT` |
| Routine | `ORWU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Validates date/time entry and returns value of Y from %DT call.

**API Endpoint:** `GET /vista/or/rpc/orwu-valdt`

---

### `ORWDXR RENEW`

| Property | Value |
|----------|-------|
| Tag | `RENEW` |
| Routine | `ORWDXR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Renew an existing order.

**API Endpoint:** `POST /vista/or/rpc/orwdxr-renew`

---

### `ORWDRA32 RADSRC`

| Property | Value |
|----------|-------|
| Tag | `RADSRC` |
| Routine | `ORWDRA32` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdra32-radsrc`

---

### `ORWMC PATIENT PROCEDURES`

| Property | Value |
|----------|-------|
| Tag | `PROD` |
| Routine | `ORWMC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns a list of patient procedures for a  specific patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwmc-patient-procedures`

---

### `ORWDLR32 ALLSPEC`

| Property | Value |
|----------|-------|
| Tag | `ALLSPEC` |
| Routine | `ORWDLR33` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of specimens from the TOPOGRAPHY FIELD file (#61).

**API Endpoint:** `GET /vista/or/rpc/orwdlr32-allspec`

---

### `ORWPT DISCHARGE`

| Property | Value |
|----------|-------|
| Tag | `DISCHRG` |
| Routine | `ORWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Given a patient and an admission date, return the discharge date/time.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | ADMITDT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpt-discharge`

---

### `ORWPS COVER`

| Property | Value |
|----------|-------|
| Tag | `COVER` |
| Routine | `ORWPS` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Returns a list of medications to display on the CPRS GUI cover sheet for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | FILTER | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwps-cover`

---

### `ORWCV VST`

| Property | Value |
|----------|-------|
| Tag | `VST1` |
| Routine | `ORWCV` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC returns a list of appointments and admissions for a patient based on parameters that define the beginning and ending range for CPRS GUI.

**API Endpoint:** `GET /vista/or/rpc/orwcv-vst`

---

### `ORWCV LAB`

| Property | Value |
|----------|-------|
| Tag | `LAB` |
| Routine | `ORWCV` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of labs to display on the CPRS GUI cover sheet for a patient.

**API Endpoint:** `GET /vista/or/rpc/orwcv-lab`

---

### `ORWCV START`

| Property | Value |
|----------|-------|
| Tag | `START` |
| Routine | `ORWCV` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Checks the value of the ORWOR COVER RETRIEVAL parameter and queues processes to build CPRS GUI cover sheet lists as specified in the parameter.

**API Endpoint:** `GET /vista/or/rpc/orwcv-start`

---

### `ORWCV DTLVST`

| Property | Value |
|----------|-------|
| Tag | `DTLVST` |
| Routine | `ORWCV` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This API returns the text of a progress note or discharge summary related to a visit/appointment.

**API Endpoint:** `GET /vista/or/rpc/orwcv-dtlvst`

---

### `ORWCV POLL`

| Property | Value |
|----------|-------|
| Tag | `POLL` |
| Routine | `ORWCV` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC is a process to poll the cover sheet tasks for completion and display the information in the appropriate CPRS GUI cover sheet location.

**API Endpoint:** `GET /vista/or/rpc/orwcv-poll`

---

### `ORWCV STOP`

| Property | Value |
|----------|-------|
| Tag | `STOP` |
| Routine | `ORWCV` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** RPC to stop retrieval of cover sheet information for CPRS GUI.

**API Endpoint:** `GET /vista/or/rpc/orwcv-stop`

---

### `ORWPT SAVDFLT`

| Property | Value |
|----------|-------|
| Tag | `SAVDFLT` |
| Routine | `ORWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Saves user's preference for default list source.

**API Endpoint:** `GET /vista/or/rpc/orwpt-savdflt`

---

### `ORWORR GET4LST`

| Property | Value |
|----------|-------|
| Tag | `GET4V11` |
| Routine | `ORWORR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns the order fields for a list of orders.

**API Endpoint:** `GET /vista/or/rpc/orworr-get4lst`

---

### `ORWORR AGET`

| Property | Value |
|----------|-------|
| Tag | `AGET` |
| Routine | `ORWORR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Get an abbreviated order list for a patient in the format:      ^TMP("ORR",$J,ORLIST,n)=IFN^DGrp^ActTm

**API Endpoint:** `GET /vista/or/rpc/orworr-aget`

---

### `ORQQVI NOTEVIT`

| Property | Value |
|----------|-------|
| Tag | `NOTEVIT` |
| Routine | `ORQQVI` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orqqvi-notevit`

---

### `ORQQCN SIGFIND`

| Property | Value |
|----------|-------|
| Tag | `SIGFIND` |
| Routine | `ORQQCN2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-sigfind`

---

### `ORQQCN ADMIN COMPLETE`

| Property | Value |
|----------|-------|
| Tag | `ADMCOMPL` |
| Routine | `ORQQCN2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/or/rpc/orqqcn-admin-complete`

---

### `ORWORB FASTUSER`

| Property | Value |
|----------|-------|
| Tag | `FASTUSER` |
| Routine | `ORWORB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Function returns notifications for current user.

**API Endpoint:** `GET /vista/or/rpc/orworb-fastuser`

---

### `ORQORB SORT`

| Property | Value |
|----------|-------|
| Tag | `SORT` |
| Routine | `ORQORB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the notification sort method for user/division/system/pkg.

**API Endpoint:** `GET /vista/or/rpc/orqorb-sort`

---

### `ORWU VERSRV`

| Property | Value |
|----------|-------|
| Tag | `VERSRV` |
| Routine | `ORWU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the server version of a particular option.  This is specifically used by CPRS GUI to determine the current server version of the associated software.

**API Endpoint:** `GET /vista/or/rpc/orwu-versrv`

---

### `ORWDX LOCK`

| Property | Value |
|----------|-------|
| Tag | `LOCK` |
| Routine | `ORWDX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** RPC to attempt to lock patient for ordering (returns 1 if successful or 0 if unsuccessful).

**API Endpoint:** `POST /vista/or/rpc/orwdx-lock`

---

### `ORWDX UNLOCK`

| Property | Value |
|----------|-------|
| Tag | `UNLOCK` |
| Routine | `ORWDX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Unlocks the patient for ordering purposes.

**API Endpoint:** `POST /vista/or/rpc/orwdx-unlock`

---

### `ORWDPS32 IVAMT`

| Property | Value |
|----------|-------|
| Tag | `IVAMT` |
| Routine | `ORWDPS33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns return UNITS^AMOUNT |^AMOUNT^AMOUNT...| for IV solutions.

**API Endpoint:** `GET /vista/or/rpc/orwdps32-ivamt`

---

### `ORWDPS32 VALRATE`

| Property | Value |
|----------|-------|
| Tag | `VALRATE` |
| Routine | `ORWDPS33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return a 1 if IV rate text is valid, otherwise return 0.

**API Endpoint:** `GET /vista/or/rpc/orwdps32-valrate`

---

### `ORWDOR VMSLCT`

| Property | Value |
|----------|-------|
| Tag | `VMSLCT` |
| Routine | `ORWDOR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns the default list for the vitals order dialog in CPRS GUI.

**API Endpoint:** `GET /vista/or/rpc/orwdor-vmslct`

---

### `ORWPCE ACTPROB`

| Property | Value |
|----------|-------|
| Tag | `ACTPROB` |
| Routine | `ORWPCE` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Build list of active problems for patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-actprob`

---

### `ORWORB GETDATA`

| Property | Value |
|----------|-------|
| Tag | `GETDATA` |
| Routine | `ORWORB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Given an XQAID, return XQADATA for an alert.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XQAID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orworb-getdata`

---

### `ORQQCN FIND CONSULT`

| Property | Value |
|----------|-------|
| Tag | `FINDCSLT` |
| Routine | `ORQQCN1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Given a Consult IEN in file 123, return a formatted list item for that single consult only, in the same format as returned by ORQQCN LIST.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMRCO | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-find-consult`

---

### `ORQQCN GET PROC SVCS`

| Property | Value |
|----------|-------|
| Tag | `PROCSVCS` |
| Routine | `ORQQCN1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Given an orderable item from the S.PROC XREF in 101.43, return the Consults service from 123.5 that can perform the procedure.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORDERABLE ITEM ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-get-proc-svcs`

---

### `ORWDFH TXT`

| Property | Value |
|----------|-------|
| Tag | `TXT` |
| Routine | `ORWDFH` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** RPC to return the text of the current and any future diets for a patient.

**API Endpoint:** `GET /vista/or/rpc/orwdfh-txt`

---

### `ORWDFH PARAM`

| Property | Value |
|----------|-------|
| Tag | `PARAM` |
| Routine | `ORWDFH` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns dietetics parameters for a patient at a location.

**API Endpoint:** `GET /vista/or/rpc/orwdfh-param`

---

### `ORWDFH TFPROD`

| Property | Value |
|----------|-------|
| Tag | `TFPROD` |
| Routine | `ORWDFH` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of active tubefeeding products.

**API Endpoint:** `GET /vista/or/rpc/orwdfh-tfprod`

---

### `ORWDFH ATTR`

| Property | Value |
|----------|-------|
| Tag | `ATTR` |
| Routine | `ORWDFH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** For a diet order, this RPC returns:   Orderable Item^Text^Type^Precedence^AskExpire

**API Endpoint:** `GET /vista/or/rpc/orwdfh-attr`

---

### `ORWDFH DIETS`

| Property | Value |
|----------|-------|
| Tag | `DIETS` |
| Routine | `ORWDFH` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns active diets (including NPO) in the format:       IEN^NAME    or IEN^SYNONYM <NAME>^NAME

**API Endpoint:** `GET /vista/or/rpc/orwdfh-diets`

---

### `ORWDFH QTY2CC`

| Property | Value |
|----------|-------|
| Tag | `QTY2CC` |
| Routine | `ORWDFH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns cc's given a product, strength, and quantity.

**API Endpoint:** `GET /vista/or/rpc/orwdfh-qty2cc`

---

### `ORWDX MSG`

| Property | Value |
|----------|-------|
| Tag | `MSG` |
| Routine | `ORWDX` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return message text for an orderable item.

**API Endpoint:** `GET /vista/or/rpc/orwdx-msg`

---

### `ORWDX DGRP`

| Property | Value |
|----------|-------|
| Tag | `DGRP` |
| Routine | `ORWDX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the display group pointer for an order dialog.

**API Endpoint:** `GET /vista/or/rpc/orwdx-dgrp`

---

### `ORWDXA DCREQIEN`

| Property | Value |
|----------|-------|
| Tag | `DCREQIEN` |
| Routine | `ORWDXA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return the IEN for Requesting Physician Cancelled reason.

**API Endpoint:** `GET /vista/or/rpc/orwdxa-dcreqien`

---

### `ORWORR GETTXT`

| Property | Value |
|----------|-------|
| Tag | `GETTXT` |
| Routine | `ORWORR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns the text of an existing order.

**API Endpoint:** `GET /vista/or/rpc/orworr-gettxt`

---

### `ORWDFH ADDLATE`

| Property | Value |
|----------|-------|
| Tag | `ADDLATE` |
| Routine | `ORWDFH` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** RPC to add a late tray diet order.

**API Endpoint:** `GET /vista/or/rpc/orwdfh-addlate`

---

### `ORWDFH ISOIEN`

| Property | Value |
|----------|-------|
| Tag | `ISOIEN` |
| Routine | `ORWDFH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the IEN for the Isolation/Precaution orderable item.

**API Endpoint:** `GET /vista/or/rpc/orwdfh-isoien`

---

### `ORWDFH CURISO`

| Property | Value |
|----------|-------|
| Tag | `CURISO` |
| Routine | `ORWDFH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return a patient's current isolation.

**API Endpoint:** `GET /vista/or/rpc/orwdfh-curiso`

---

### `ORWDFH ISOLIST`

| Property | Value |
|----------|-------|
| Tag | `ISOLIST` |
| Routine | `ORWDFH` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of active Isolation/Precaution Type (file #119.4) entries.

**API Endpoint:** `GET /vista/or/rpc/orwdfh-isolist`

---

### `ORWDFH FINDTYP`

| Property | Value |
|----------|-------|
| Tag | `FINDTYP` |
| Routine | `ORWDFH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return type of dietetics order based on display group.

**API Endpoint:** `GET /vista/or/rpc/orwdfh-findtyp`

---

### `ORWDPS32 ISSPLY`

| Property | Value |
|----------|-------|
| Tag | `ISSPLY` |
| Routine | `ORWDPS33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return 1 if orderable item is a supply, otherwise return 0.

**API Endpoint:** `GET /vista/or/rpc/orwdps32-issply`

---

### `ORQQCN GET ORDER NUMBER`

| Property | Value |
|----------|-------|
| Tag | `GETORDER` |
| Routine | `ORQQCN1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Consult ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-get-order-number`

---

### `ORWDLR32 LAB COLL TIME`

| Property | Value |
|----------|-------|
| Tag | `LABCOLTM` |
| Routine | `ORWDLR33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Is the given time a routine lab collection time for the given location?

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Collection Time | LITERAL | No |
| 2 | Location | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdlr32-lab-coll-time`

---

### `ORWDXM MENU`

| Property | Value |
|----------|-------|
| Tag | `MENU` |
| Routine | `ORWDXM` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns menu contents for an order dialog in the following format:     LST(0)=name^# cols^path switch^^^ Key Variables (pieces 6-20)     LST(n)=col^row^type^ien^formid^autoaccept^display text^mnemonic            ^displayonly

**API Endpoint:** `GET /vista/or/rpc/orwdxm-menu`

---

### `ORWDXM FORMID`

| Property | Value |
|----------|-------|
| Tag | `FORMID` |
| Routine | `ORWDXM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return the FormID for a dialog entry.

**API Endpoint:** `GET /vista/or/rpc/orwdxm-formid`

---

### `ORWDXM PROMPTS`

| Property | Value |
|----------|-------|
| Tag | `PROMPTS` |
| Routine | `ORWDXM` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return prompting information for a generic dialog in the format:     LST(n)=ID^REQ^HID^PROMPT^TYPE^DOMAIN^DEFAULT^IDFLT^HELP

**API Endpoint:** `GET /vista/or/rpc/orwdxm-prompts`

---

### `ORWDXM DLGNAME`

| Property | Value |
|----------|-------|
| Tag | `DLGNAME` |
| Routine | `ORWDXM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return name(s) of dialog & base dialog given IEN in format:         VAL=InternalName^DisplayName^BaseDialogIEN^BaseDialogName

**API Endpoint:** `GET /vista/or/rpc/orwdxm-dlgname`

---

### `ORWPT1 PRCARE`

| Property | Value |
|----------|-------|
| Tag | `PRCARE` |
| Routine | `ORWPT1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Return primary care, inpatient, and mental health summary information.   VAL=Primary Care Team^Primary Care Provider^Attending^MH Treatment       Coordinator

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | dfn | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpt1-prcare`

---

### `ORWPT1 PCDETAIL`

| Property | Value |
|----------|-------|
| Tag | `PCDETAIL` |
| Routine | `ORWPT1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns primary care and other team assignment detailed information for a patient. If called by CPRS, the source of the data is a web service call to PCMM Web. If called by other than CPRS, the original format is returned.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpt1-pcdetail`

---

### `ORWU NPHASKEY`

| Property | Value |
|----------|-------|
| Tag | `NPHASKEY` |
| Routine | `ORWU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns a 1 if a specified user holds a specified key, otherwise returns 0.

**API Endpoint:** `GET /vista/or/rpc/orwu-nphaskey`

---

### `ORWDX DLGID`

| Property | Value |
|----------|-------|
| Tag | `DLGID` |
| Routine | `ORWDX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the dialog IEN for an order.

**API Endpoint:** `GET /vista/or/rpc/orwdx-dlgid`

---

### `ORWDPS32 VALSCH`

| Property | Value |
|----------|-------|
| Tag | `VALSCH` |
| Routine | `ORWDPS33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Validate a schedule and return a 1 if it is valid, otherwise return 0.

**API Endpoint:** `GET /vista/or/rpc/orwdps32-valsch`

---

### `ORWDPS32 VALQTY`

| Property | Value |
|----------|-------|
| Tag | `VALQTY` |
| Routine | `ORWDPS33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Validate a medication quantity and return a 1 if it is valid, otherwise return 0.

**API Endpoint:** `GET /vista/or/rpc/orwdps32-valqty`

---

### `ORWDXM AUTOACK`

| Property | Value |
|----------|-------|
| Tag | `AUTOACK` |
| Routine | `ORWDXM` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Place a quick order in CPRS GUI without the verify step.

**API Endpoint:** `GET /vista/or/rpc/orwdxm-autoack`

---

### `ORWU GBLREF`

| Property | Value |
|----------|-------|
| Tag | `GBLREF` |
| Routine | `ORWU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the global reference for a particular file number.

**API Endpoint:** `GET /vista/or/rpc/orwu-gblref`

---

### `ORWDX AGAIN`

| Property | Value |
|----------|-------|
| Tag | `AGAIN` |
| Routine | `ORWDX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns a 1 if the dialog should be kept for another order, otherwise 0.

**API Endpoint:** `GET /vista/or/rpc/orwdx-again`

---

### `ORWUXT LST`

| Property | Value |
|----------|-------|
| Tag | `LST` |
| Routine | `ORWUXT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwuxt-lst`

---

### `ORWUXT VAL`

| Property | Value |
|----------|-------|
| Tag | `VAL` |
| Routine | `ORWUXT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwuxt-val`

---

### `ORWUXT REF`

| Property | Value |
|----------|-------|
| Tag | `REF` |
| Routine | `ORWUXT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwuxt-ref`

---

### `ORWDLR32 IMMED COLLECT`

| Property | Value |
|----------|-------|
| Tag | `IMMCOLL` |
| Routine | `ORWDLR33` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns help text showing lab immediate collect times for the user's division.

**API Endpoint:** `GET /vista/or/rpc/orwdlr32-immed-collect`

---

### `ORWDLR32 IC DEFAULT`

| Property | Value |
|----------|-------|
| Tag | `ICDEFLT` |
| Routine | `ORWDLR33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns default immediate collect time for the user's division.

**API Endpoint:** `GET /vista/or/rpc/orwdlr32-ic-default`

---

### `ORWDLR32 IC VALID`

| Property | Value |
|----------|-------|
| Tag | `ICVALID` |
| Routine | `ORWDLR33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Determines whether the suplied time is a valid lab immediate collect time.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIME | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdlr32-ic-valid`

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

**API Endpoint:** `GET /vista/or/rpc/orqqpl-prob-comments`

---

### `ORWDXC ON`

| Property | Value |
|----------|-------|
| Tag | `ON` |
| Routine | `ORWDXC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns E if order checking enabled, otherwise D.

**API Endpoint:** `GET /vista/or/rpc/orwdxc-on`

---

### `ORWDXC DISPLAY`

| Property | Value |
|----------|-------|
| Tag | `DISPLAY` |
| Routine | `ORWDXC` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return list of Order Checks for a FillerID (namespace).

**API Endpoint:** `GET /vista/or/rpc/orwdxc-display`

---

### `ORWDXC FILLID`

| Property | Value |
|----------|-------|
| Tag | `FILLID` |
| Routine | `ORWDXC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return the FillerID (namespace) for a dialog.

**API Endpoint:** `GET /vista/or/rpc/orwdxc-fillid`

---

### `ORWDXC ACCEPT`

| Property | Value |
|----------|-------|
| Tag | `ACCEPT` |
| Routine | `ORWDXC` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Return list of Order Checks on Accept Order.

**API Endpoint:** `GET /vista/or/rpc/orwdxc-accept`

---

### `ORWDXC SAVECHK`

| Property | Value |
|----------|-------|
| Tag | `SAVECHK` |
| Routine | `ORWDXC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Save order checks for session.

**API Endpoint:** `GET /vista/or/rpc/orwdxc-savechk`

---

### `ORWDXC SESSION`

| Property | Value |
|----------|-------|
| Tag | `SESSION` |
| Routine | `ORWDXC` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return list of order checks on release of order.

**API Endpoint:** `GET /vista/or/rpc/orwdxc-session`

---

### `ORWDXC DELORD`

| Property | Value |
|----------|-------|
| Tag | `DELORD` |
| Routine | `ORWDXC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Delete order.

**API Endpoint:** `GET /vista/or/rpc/orwdxc-delord`

---

### `ORQQCN RESUBMIT`

| Property | Value |
|----------|-------|
| Tag | `RESUBMIT` |
| Routine | `ORQQCN1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Allows resubmission of a cancelled consult or procedure request after editing.  This is a backdoor resubmission, and CPRS will be notified via the HL7 proocess.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ConsultID | LITERAL | No |
| 2 | ChangeArray | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-resubmit`

---

### `ORWORB KILL UNSIG ORDERS ALERT`

| Property | Value |
|----------|-------|
| Tag | `KILUNSNO` |
| Routine | `ORWORB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Check patient's unsigned orders, and kill unsigned orders alert for this user if no unsigned orders remain for his/her signature.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Patient DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orworb-kill-unsig-orders-alert`

---

### `ORWDCN32 PROCEDURES`

| Property | Value |
|----------|-------|
| Tag | `PROC` |
| Routine | `ORWDCN32` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Returns a list of orderable procedures.  Same as ORDITM^ORWDX except:   1.  Checks inactive date in file 101.43 against NOW instead of DT. 2.  Checks for at least one service that can perform the procedure. 3.  Returns variable pointer to procedure in 4th piece of each item.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | start | LITERAL | No |
| 2 | direction | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdcn32-procedures`

---

### `ORQQCN LOAD FOR EDIT`

| Property | Value |
|----------|-------|
| Tag | `EDITLOAD` |
| Routine | `ORQQCN1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Given a consult IEN, returns the current values of that record's fields.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Consult IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-load-for-edit`

---

### `ORWORR GETBYIFN`

| Property | Value |
|----------|-------|
| Tag | `GETBYIFN` |
| Routine | `ORWORR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns the fields for a single order in the format:        1   2    3     4      5     6   7   8   9   10     11    12  .LST=~IFN^Grp^ActTm^StrtTm^StopTm^Sts^Sig^Nrs^Clk^PrvID^PrvNam^ActDA

**API Endpoint:** `GET /vista/or/rpc/orworr-getbyifn`

---

### `ORWDAL32 ALLERGY MATCH`

| Property | Value |
|----------|-------|
| Tag | `ALLSRCH` |
| Routine | `ORWDAL32` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Given a text string, return a list of possible matches from several different sources.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | user input string | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdal32-allergy-match`

---

### `ORWDAL32 DEF`

| Property | Value |
|----------|-------|
| Tag | `DEF` |
| Routine | `ORWDAL32` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns default values and list sets for Allergy ordering dialog.

**API Endpoint:** `GET /vista/or/rpc/orwdal32-def`

---

### `ORWDAL32 SYMPTOMS`

| Property | Value |
|----------|-------|
| Tag | `SYMPTOMS` |
| Routine | `ORWDAL32` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdal32-symptoms`

---

### `ORQQCN SVCLIST`

| Property | Value |
|----------|-------|
| Tag | `SVCLIST` |
| Routine | `ORQQCN2` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Because the combo box on the Consults order dialog needs to include a shortlist at the top, a call was needed that returned the list of consults services alphabetically as a long list.  This is it.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | StartFrom | LITERAL | No |
| 2 | Direction | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-svclist`

---

### `ORWPS1 NEWDLG`

| Property | Value |
|----------|-------|
| Tag | `NEWDLG` |
| Routine | `ORWPS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns order dialog information for a new medication.

**API Endpoint:** `GET /vista/or/rpc/orwps1-newdlg`

---

### `ORWPS1 PICKUP`

| Property | Value |
|----------|-------|
| Tag | `PICKUP` |
| Routine | `ORWPS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns default for refill location (mail or window).

**API Endpoint:** `GET /vista/or/rpc/orwps1-pickup`

---

### `ORWPS1 REFILL`

| Property | Value |
|----------|-------|
| Tag | `REFILL` |
| Routine | `ORWPS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** RPC to submit a request for a refill.

**API Endpoint:** `GET /vista/or/rpc/orwps1-refill`

---

### `ORWRP PRINT LAB REPORTS`

| Property | Value |
|----------|-------|
| Tag | `PRINT` |
| Routine | `ORWRPL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This rpc is used to print a report on the Labs tab in CPRS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DEVICE | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | REPORT ID | LITERAL | No |
| 4 | DATE RANGE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwrp-print-lab-reports`

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

**API Endpoint:** `GET /vista/or/rpc/orqqpl-inactivate`

---

### `ORWDXM1 BLDQRSP`

| Property | Value |
|----------|-------|
| Tag | `BLDQRSP` |
| Routine | `ORWDXM1` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Build responses for an order   Input:       1   2    3    4   5   6    7    8        11-20 FLDS=DFN^LOC^ORNP^INPT^SEX^AGE^EVENT^SC%^^^Key Variables... ORIT=+ORIT: ptr to 101.41, $E(ORIT)=C: copy $E(ORIT)=X: change   Output: LST=QuickLevel^ResponseID(ORIT;$H)^Dialog^Type^FormID^DGrp LST(n)=verify tex

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ISIMO | LITERAL | No |
| 2 | ENCLOC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdxm1-bldqrsp`

---

### `ORWDXM2 CLRRCL`

| Property | Value |
|----------|-------|
| Tag | `CLRRCL` |
| Routine | `ORWDXM2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Clear ORECALL.  Used by CPRS GUI to clean up ^TMP("ORECALL",$J) and ^TMP("ORWDXMQ",$J).

**API Endpoint:** `GET /vista/or/rpc/orwdxm2-clrrcl`

---

### `ORWDX DISMSG`

| Property | Value |
|----------|-------|
| Tag | `DISMSG` |
| Routine | `ORWDX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns disabled message for an ordering dialog.

**API Endpoint:** `GET /vista/or/rpc/orwdx-dismsg`

---

### `ORWPT DIEDON`

| Property | Value |
|----------|-------|
| Tag | `DIEDON` |
| Routine | `ORWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns date of death if patient has expired.  Otherwise returns 0.

**API Endpoint:** `GET /vista/or/rpc/orwpt-diedon`

---

### `ORWD1 PARAM`

| Property | Value |
|----------|-------|
| Tag | `PARAM` |
| Routine | `ORWD1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Returns the prompt and device parameters for Automated order prints

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwd1-param`

---

### `ORWPT CWAD`

| Property | Value |
|----------|-------|
| Tag | `CWAD` |
| Routine | `ORWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Returns the CWAD flag(s) for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpt-cwad`

---

### `ORWDX SENDP`

| Property | Value |
|----------|-------|
| Tag | `SENDP` |
| Routine | `ORWDX` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Same as ORWDX SEND, but allows print devices as parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | orwdev | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdx-sendp`

---

### `ORWD1 PRINTGUI`

| Property | Value |
|----------|-------|
| Tag | `PRINTGUI` |
| Routine | `ORWD1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** RPC used by CPRS GUI to print orders to a designated print device.

**API Endpoint:** `GET /vista/or/rpc/orwd1-printgui`

---

### `ORQQVI1 DETAIL`

| Property | Value |
|----------|-------|
| Tag | `DETAIL` |
| Routine | `ORQQVI1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orqqvi1-detail`

---

### `ORWOR SHEETS`

| Property | Value |
|----------|-------|
| Tag | `SHEETS` |
| Routine | `ORWOR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns order sheets for a patient.

**API Endpoint:** `GET /vista/or/rpc/orwor-sheets`

---

### `ORWOR TSALL`

| Property | Value |
|----------|-------|
| Tag | `TSALL` |
| Routine | `ORWOR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of valid treating specialities.

**API Endpoint:** `GET /vista/or/rpc/orwor-tsall`

---

### `ORWD1 RVPRINT`

| Property | Value |
|----------|-------|
| Tag | `RVPRINT` |
| Routine | `ORWD1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** RPC used by CPRS GUI to print orders to a designated print device after the review or sign actions were used.

**API Endpoint:** `GET /vista/or/rpc/orwd1-rvprint`

---

### `ORWD2 DEVINFO`

| Property | Value |
|----------|-------|
| Tag | `DEVINFO` |
| Routine | `ORWD2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns device information related to a location/nature of order when an order is signed or released via CPRS GUI.

**API Endpoint:** `GET /vista/or/rpc/orwd2-devinfo`

---

### `ORWD2 MANUAL`

| Property | Value |
|----------|-------|
| Tag | `MANUAL` |
| Routine | `ORWD2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns device information for manual prints done via CPRS GUI.

**API Endpoint:** `GET /vista/or/rpc/orwd2-manual`

---

### `ORWDXM MSTYLE`

| Property | Value |
|----------|-------|
| Tag | `MSTYLE` |
| Routine | `ORWDXM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return the menu style for the system.

**API Endpoint:** `GET /vista/or/rpc/orwdxm-mstyle`

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

**API Endpoint:** `GET /vista/or/rpc/orqqpl-saveview`

---

### `ORWGEPT CLINRNG`

| Property | Value |
|----------|-------|
| Tag | `CLINRNG` |
| Routine | `ORWGEPT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgept-clinrng`

---

### `ORWDLR32 ONE SAMPLE`

| Property | Value |
|----------|-------|
| Tag | `ONESAMP` |
| Routine | `ORWDLR32` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns data for one collection sample in the format:      n^SampIEN^SampName^SpecPtr^TubeTop^^^LabCollect^^SpecName

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | COLL SAMP IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdlr32-one-sample`

---

### `ORWDLR32 ONE SPECIMEN`

| Property | Value |
|----------|-------|
| Tag | `ONESPEC` |
| Routine | `ORWDLR32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Returns IEN^NAME of requested a TOPOGRAPHY FIELD (file #61) entry.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SPECIMEN IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdlr32-one-specimen`

---

### `ORWU INPLOC`

| Property | Value |
|----------|-------|
| Tag | `INPLOC` |
| Routine | `ORWU` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of wards from the HOSPITAL LOCATION file.

**API Endpoint:** `GET /vista/or/rpc/orwu-inploc`

---

### `ORWDRA32 LOCTYPE`

| Property | Value |
|----------|-------|
| Tag | `LOCTYPE` |
| Routine | `ORWDRA32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/or/rpc/orwdra32-loctype`

---

### `ORWDPS32 DOSES`

| Property | Value |
|----------|-------|
| Tag | `DOSES` |
| Routine | `ORWDPS33` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return doses for an orderable item.

**API Endpoint:** `GET /vista/or/rpc/orwdps32-doses`

---

### `ORWPT FULLSSN`

| Property | Value |
|----------|-------|
| Tag | `FULLSSN` |
| Routine | `ORWPT` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Given an SSN in the format 999999999(P), return a list of matching patients.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpt-fullssn`

---

### `ORQQCN2 GET CONTEXT`

| Property | Value |
|----------|-------|
| Tag | `GETCTXT` |
| Routine | `ORQQCN2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orqqcn2-get-context`

---

### `ORQQCN2 SAVE CONTEXT`

| Property | Value |
|----------|-------|
| Tag | `SAVECTXT` |
| Routine | `ORQQCN2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/or/rpc/orqqcn2-save-context`

---

### `ORWTIU GET TIU CONTEXT`

| Property | Value |
|----------|-------|
| Tag | `GTTIUCTX` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-get-tiu-context`

---

### `ORWTIU SAVE TIU CONTEXT`

| Property | Value |
|----------|-------|
| Tag | `SVTIUCTX` |
| Routine | `ORWTIU` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/or/rpc/orwtiu-save-tiu-context`

---

### `ORWTIU GET DCSUMM CONTEXT`

| Property | Value |
|----------|-------|
| Tag | `GTDCCTX` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-get-dcsumm-context`

---

### `ORWTIU SAVE DCSUMM CONTEXT`

| Property | Value |
|----------|-------|
| Tag | `SVDCCTX` |
| Routine | `ORWTIU` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/or/rpc/orwtiu-save-dcsumm-context`

---

### `ORWORB AUTOUNFLAG ORDERS`

| Property | Value |
|----------|-------|
| Tag | `UNFLORD` |
| Routine | `ORWORB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Auto unflag orders/delete alert.

**API Endpoint:** `GET /vista/or/rpc/orworb-autounflag-orders`

---

### `ORWRA DEFAULT EXAM SETTINGS`

| Property | Value |
|----------|-------|
| Tag | `GETDEF` |
| Routine | `ORWRA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the default settings for the display of imaging exams on the reports tab.

**API Endpoint:** `GET /vista/or/rpc/orwra-default-exam-settings`

---

### `ORWDXM LOADSET`

| Property | Value |
|----------|-------|
| Tag | `LOADSET` |
| Routine | `ORWDXM` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return the contents of an order set in the following format:    LST(0): SetDisplayText^Key Variables    LST(n): DlgIEN^DlgType^DisplayText

**API Endpoint:** `GET /vista/or/rpc/orwdxm-loadset`

---

### `ORWDXC DELAY`

| Property | Value |
|----------|-------|
| Tag | `DELAY` |
| Routine | `ORWDXC` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return list or order checks on accept delayed orders.

**API Endpoint:** `GET /vista/or/rpc/orwdxc-delay`

---

### `ORWCH LOADSIZ`

| Property | Value |
|----------|-------|
| Tag | `LOADSIZ` |
| Routine | `ORWCH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This RPC loads the size (bounds) for a particular CPRS GUI control.

**API Endpoint:** `GET /vista/or/rpc/orwch-loadsiz`

---

### `ORQQPL PROBLEM NTRT BULLETIN`

| Property | Value |
|----------|-------|
| Tag | `NTRTBULL` |
| Routine | `ORQQPL2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC generates a bulletin to the OR CAC Mail Group, indicating that  an unresolved term needs to be requested using the New Term Rapid  Turnaround website at http://hdrmul7.aac.va.gov:7151/ntrt/.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORTERM | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpl-problem-ntrt-bulletin`

---

### `ORWPCE GET DX TEXT`

| Property | Value |
|----------|-------|
| Tag | `GETDXTXT` |
| Routine | `ORWPCE3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Resolves the preferred expanded form of the Diagnosis text for the  encounter pane on the notes tab.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NARR | LITERAL | No |
| 2 | CODE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-get-dx-text`

---

### `ORQQCN ISPROSVC`

| Property | Value |
|----------|-------|
| Tag | `ISPROSVC` |
| Routine | `ORQQCN2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RPC will return 1 or 0 if the supplied file entry from REQUEST  SERVICES (#123.5) is marked as part of the Consults-Prosthetics interface.  This RPC is used by CPRS GUI to disable the Clinically Indicated Date and the Decision Support Tool fields when ordering new or editing cancelled Prosthetics co

**API Endpoint:** `GET /vista/or/rpc/orqqcn-isprosvc`

---

### `ORWDPS33 GETADDFR`

| Property | Value |
|----------|-------|
| Tag | `GETADDFR` |
| Routine | `ORWDPS33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC takes an Additive Orderable ITEM IEN and it returns the default additive frequency defined to the additive file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OIIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdps33-getaddfr`

---

### `ORQQPX OTHERS REMINDERS`

| Property | Value |
|----------|-------|
| Tag | `ALL` |
| Routine | `ORQQPXA` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns list of all active reminders in name order

**API Endpoint:** `GET /vista/or/rpc/orqqpx-others-reminders`

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

**API Endpoint:** `GET /vista/or/rpc/orqqpl-check-dup`

---

### `ORCHECK ISMONO`

| Property | Value |
|----------|-------|
| Tag | `ISMONO` |
| Routine | `ORCHECK` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orcheck-ismono`

---

### `ORCHECK GETMONO`

| Property | Value |
|----------|-------|
| Tag | `GETMONO` |
| Routine | `ORCHECK` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orcheck-getmono`

---

### `ORCHECK GETMONOL`

| Property | Value |
|----------|-------|
| Tag | `GETMONOL` |
| Routine | `ORCHECK` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orcheck-getmonol`

---

### `ORCHECK DELMONO`

| Property | Value |
|----------|-------|
| Tag | `DELMONO` |
| Routine | `ORCHECK` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orcheck-delmono`

---

### `ORQQCN DEFAULT REQUEST REASON`

| Property | Value |
|----------|-------|
| Tag | `DEFRFREQ` |
| Routine | `ORQQCN2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SERVICE | LITERAL | No |
| 2 | PATIENT DFN | LITERAL | No |
| 3 | RESOLVE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-default-request-reason`

---

### `ORWDX LOCK ORDER`

| Property | Value |
|----------|-------|
| Tag | `LOCKORD` |
| Routine | `ORWDX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** RPC to attempt to lock a specific order.

**API Endpoint:** `POST /vista/or/rpc/orwdx-lock-order`

---

### `ORWDX UNLOCK ORDER`

| Property | Value |
|----------|-------|
| Tag | `UNLKORD` |
| Routine | `ORWDX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** RPC to unlock a specific order.

**API Endpoint:** `POST /vista/or/rpc/orwdx-unlock-order`

---

### `ORWDCN32 NEWDLG`

| Property | Value |
|----------|-------|
| Tag | `NEWDLG` |
| Routine | `ORWDCN32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Returns dialog information when NEW CONSULT/PROCEDURE is selected from the consults tab.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | dialog type | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdcn32-newdlg`

---

### `ORQTL USER TEAMS`

| Property | Value |
|----------|-------|
| Tag | `TEAMS` |
| Routine | `ORQTL1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns Team Lists subscribed to by user with type of list.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORQUSER | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqtl-user-teams`

---

### `ORQTL TEAM LIST PATIENTS`

| Property | Value |
|----------|-------|
| Tag | `TLPTS` |
| Routine | `ORQTL1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns list of patients on a Team List.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORQTEAM | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqtl-team-list-patients`

---

### `ORQTL TEAM LIST INFO`

| Property | Value |
|----------|-------|
| Tag | `TLINFO` |
| Routine | `ORQTL1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns Team List attributes:   - Device associated with Team List   - Type of Team List   - Creator of Team List   - Date of creation of Team List

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORQTEAM | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqtl-team-list-info`

---

### `ORQTL TEAM LIST USERS`

| Property | Value |
|----------|-------|
| Tag | `TLUSERS` |
| Routine | `ORQTL1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns users on a Team List.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORQTEAM | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqtl-team-list-users`

---

### `ORQTL EXISTING TEAM AUTOLINKS`

| Property | Value |
|----------|-------|
| Tag | `TLAL` |
| Routine | `ORQTL1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of autolinks from an existing autolink team list.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORQTEAM | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqtl-existing-team-autolinks`

---

### `ORQTL ALL USER TEAMS PATIENTS`

| Property | Value |
|----------|-------|
| Tag | `TLALLPTS` |
| Routine | `ORQTL2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns all patients associated with all teams for a user, sorted by team and then alphabetically by patient name.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORQUSER | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqtl-all-user-teams-patients`

---

### `ORQQCN GET SERVICE IEN`

| Property | Value |
|----------|-------|
| Tag | `SVCIEN` |
| Routine | `ORQQCN2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-get-service-ien`

---

### `ORCHECK GETXTRA`

| Property | Value |
|----------|-------|
| Tag | `GETXTRA` |
| Routine | `ORCHECK` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orcheck-getxtra`

---

### `ORCNOTE GET TOTAL`

| Property | Value |
|----------|-------|
| Tag | `GETTOT` |
| Routine | `ORCNOTE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/or/rpc/orcnote-get-total`

---

### `ORQQCN PROVDX`

| Property | Value |
|----------|-------|
| Tag | `PROVDX` |
| Routine | `ORQQCN2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SVCIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-provdx`

---

### `ORWDXVB3 DIAGORD`

| Property | Value |
|----------|-------|
| Tag | `DIAGORD` |
| Routine | `ORWDXVB3` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Get sequence order of Diagnostic Tests for selection.

**API Endpoint:** `GET /vista/or/rpc/orwdxvb3-diagord`

---

### `ORWPT BYWARD`

| Property | Value |
|----------|-------|
| Tag | `BYWARD` |
| Routine | `ORWPT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of patients currently residing on a specified ward location.

**API Endpoint:** `GET /vista/or/rpc/orwpt-byward`

---

### `ORWPT LEGACY`

| Property | Value |
|----------|-------|
| Tag | `LEGACY` |
| Routine | `ORWPT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns message if patient has data on a legacy system.

**API Endpoint:** `GET /vista/or/rpc/orwpt-legacy`

---

### `ORWDXVB3 COLLTIM`

| Property | Value |
|----------|-------|
| Tag | `COLLTIM` |
| Routine | `ORWDXVB3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This RPC checks the value of the parameter OR VBECS REMOVE COLL TIME to determine if a default collection time should be presented on the VBECS order dialog.

**API Endpoint:** `GET /vista/or/rpc/orwdxvb3-colltim`

---

### `ORWDXVB3 SWPANEL`

| Property | Value |
|----------|-------|
| Tag | `SWPANEL` |
| Routine | `ORWDXVB3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This RPC checks the value of the parameter OR VBECS DIAGNOSTIC PANEL 1ST to determine the location of the Diagnostic and Component panels on the VBECS order dialog.

**API Endpoint:** `GET /vista/or/rpc/orwdxvb3-swpanel`

---

### `ORWRP PRINT WINDOWS REPORT`

| Property | Value |
|----------|-------|
| Tag | `PRINTW` |
| Routine | `ORWRPP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Prints CPRS GUI information to windows printer.

**API Endpoint:** `GET /vista/or/rpc/orwrp-print-windows-report`

---

### `ORQQCN SF513 WINDOWS PRINT`

| Property | Value |
|----------|-------|
| Tag | `WPRT513` |
| Routine | `ORQQCN2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Print consults Standard Form 513 to Windows device from GUI application.

**API Endpoint:** `GET /vista/or/rpc/orqqcn-sf513-windows-print`

---

### `ORWRP WINPRINT LAB REPORTS`

| Property | Value |
|----------|-------|
| Tag | `PRINTW` |
| Routine | `ORWRPL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Prints text from CPRS GUI to a windows printer.

**API Endpoint:** `GET /vista/or/rpc/orwrp-winprint-lab-reports`

---

### `ORWCIRN FACLIST`

| Property | Value |
|----------|-------|
| Tag | `FACLIST` |
| Routine | `ORWCIRN` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of the remote VA facilities at which the selected patient has been seen.

**API Endpoint:** `GET /vista/or/rpc/orwcirn-faclist`

---

### `ORWDLR32 GET LAB TIMES`

| Property | Value |
|----------|-------|
| Tag | `GETLABTM` |
| Routine | `ORWDLR33` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of lab collect times for a date and location.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATE | LITERAL | No |
| 2 | LOCATION | LITERAL | No |
| 3 | ORWDLR32 IC VALID | UNKNOWN() | No |

**API Endpoint:** `GET /vista/or/rpc/orwdlr32-get-lab-times`

---

### `ORWRP WINPRINT DEFAULT`

| Property | Value |
|----------|-------|
| Tag | `WINDFLT` |
| Routine | `ORWRP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns whether the Windows printer is set as the default for the user.

**API Endpoint:** `GET /vista/or/rpc/orwrp-winprint-default`

---

### `ORWRP GET DEFAULT PRINTER`

| Property | Value |
|----------|-------|
| Tag | `GETDFPRT` |
| Routine | `ORWRP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns default printer.

**API Endpoint:** `GET /vista/or/rpc/orwrp-get-default-printer`

---

### `ORWRP SAVE DEFAULT PRINTER`

| Property | Value |
|----------|-------|
| Tag | `SAVDFPRT` |
| Routine | `ORWRP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Saves printer as user's default printer.

**API Endpoint:** `POST /vista/or/rpc/orwrp-save-default-printer`

---

### `ORQQCN EDIT DEFAULT REASON`

| Property | Value |
|----------|-------|
| Tag | `EDITDRFR` |
| Routine | `ORQQCN2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Return value (see details there) determines if and when the consults 'reason for request' can be edited.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SERVICE ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-edit-default-reason`

---

### `ORWTIU WINPRINT NOTE`

| Property | Value |
|----------|-------|
| Tag | `PRINTW` |
| Routine | `ORWTIU` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** Returns a formatted global of a TIU document for output to a Windows print device.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Note IEN | LITERAL | No |
| 2 | Chart Copy? | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-winprint-note`

---

### `ORWRP2 HS COMPONENTS`

| Property | Value |
|----------|-------|
| Tag | `COMP` |
| Routine | `ORWRP2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns an array of the ADHOC Health Summary components.

**API Endpoint:** `GET /vista/or/rpc/orwrp2-hs-components`

---

### `ORWRP2 HS COMP FILES`

| Property | Value |
|----------|-------|
| Tag | `FILES` |
| Routine | `ORWRP2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC gets a list of files to select from for the ADHOC Health Summary.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | COMP | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwrp2-hs-comp-files`

---

### `ORWRP2 HS REPORT TEXT`

| Property | Value |
|----------|-------|
| Tag | `REPORT` |
| Routine | `ORWRP2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used to build the ADHOC Health Summary from an array of pre-selected health summary components.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | COMPS | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwrp2-hs-report-text`

---

### `ORWRP2 HS FILE LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `FILESEL` |
| Routine | `ORWRP2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC gets the list of file entries for the file defined for a specific Health Summary component on the ADHOC Health Summary.  Current choices include files 60, 9999999.64, 811.9, 8925.1, 81, and possibly others (handled generically).  The file entries are used to populate a combo box on the form

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FILE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwrp2-hs-file-lookup`

---

### `ORWRP2 HS SUBITEMS`

| Property | Value |
|----------|-------|
| Tag | `SUBITEM` |
| Routine | `ORWRP2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC expands a Laboratory Test panel to all it's sub-components for selection in the ADHOC Health Summary.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TEST | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwrp2-hs-subitems`

---

### `ORQQPX GET HIST LOCATIONS`

| Property | Value |
|----------|-------|
| Tag | `HISTLOC` |
| Routine | `ORQQPX` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of historical locations from the LOCATION file (#9999999.06).

**API Endpoint:** `GET /vista/or/rpc/orqqpx-get-hist-locations`

---

### `ORQQPX NEW REMINDERS ACTIVE`

| Property | Value |
|----------|-------|
| Tag | `NEWACTIV` |
| Routine | `ORQQPX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Return 1 if Interactive Reminders are active, otherwise return 0.

**API Endpoint:** `GET /vista/or/rpc/orqqpx-new-reminders-active`

---

### `ORWPCE GET VISIT`

| Property | Value |
|----------|-------|
| Tag | `GETVISIT` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the visit IEN.

**API Endpoint:** `GET /vista/or/rpc/orwpce-get-visit`

---

### `ORQQCN CANEDIT`

| Property | Value |
|----------|-------|
| Tag | `CANEDIT` |
| Routine | `ORQQCN1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Returns indication of whether a consult/procedure request can be resubmitted.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Consult IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-canedit`

---

### `ORWORB KILL EXPIR MED ALERT`

| Property | Value |
|----------|-------|
| Tag | `KILEXMED` |
| Routine | `ORWORB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Evaluate expiring med orders.  If none remain, kill current alert for current user.  Kill for other users if alert so defined.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Patient DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orworb-kill-expir-med-alert`

---

### `ORWPCE MHCLINIC`

| Property | Value |
|----------|-------|
| Tag | `MHCLINIC` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns TRUE of the indicated clinic is a mental health clinic.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-mhclinic`

---

### `ORWPCE GAFOK`

| Property | Value |
|----------|-------|
| Tag | `GAFOK` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns TRUE if supporting mental health code exists to read and write GAF scores.

**API Endpoint:** `GET /vista/or/rpc/orwpce-gafok`

---

### `ORWPCE LOADGAF`

| Property | Value |
|----------|-------|
| Tag | `LOADGAF` |
| Routine | `ORWPCE2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of GAF Scores

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-loadgaf`

---

### `ORWPCE SAVEGAF`

| Property | Value |
|----------|-------|
| Tag | `SAVEGAF` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Saves a GAF Score.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORINPUT | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-savegaf`

---

### `ORWPCE FORCE`

| Property | Value |
|----------|-------|
| Tag | `FORCE` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the value of the ORWPCE FORCE GUI PCE ENTRY parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER | LITERAL | No |
| 2 | LOC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-force`

---

### `ORWDPS32 VALROUTE`

| Property | Value |
|----------|-------|
| Tag | `VALROUTE` |
| Routine | `ORWDPS32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the IEN for a route if the name is valid.

**API Endpoint:** `GET /vista/or/rpc/orwdps32-valroute`

---

### `ORWOR VWGET`

| Property | Value |
|----------|-------|
| Tag | `VWGET` |
| Routine | `ORWOR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Retrieves the user's default view for the orders tab.

**API Endpoint:** `GET /vista/or/rpc/orwor-vwget`

---

### `ORWOR VWSET`

| Property | Value |
|----------|-------|
| Tag | `VWSET` |
| Routine | `ORWOR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Sets the default view on the orders tab for the user.

**API Endpoint:** `GET /vista/or/rpc/orwor-vwset`

---

### `ORWU PARAM`

| Property | Value |
|----------|-------|
| Tag | `PARAM` |
| Routine | `ORWU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Simple call to return a parameter value.  The call assumes the current user, 'defaultable' entities, and one instance.

**API Endpoint:** `GET /vista/or/rpc/orwu-param`

---

### `ORWDOR LKSCRN`

| Property | Value |
|----------|-------|
| Tag | `LKSCRN` |
| Routine | `ORWDOR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Does a lookup similar to GENERIC^ORWU.  Also allows passing of a reference to a screen in the Order Dialog file to screen to lookup.

**API Endpoint:** `GET /vista/or/rpc/orwdor-lkscrn`

---

### `ORWDOR VALNUM`

| Property | Value |
|----------|-------|
| Tag | `VALNUM` |
| Routine | `ORWDOR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Validates a numeric entry.

**API Endpoint:** `GET /vista/or/rpc/orwdor-valnum`

---

### `ORWORB UNSIG ORDERS FOLLOWUP`

| Property | Value |
|----------|-------|
| Tag | `ESORD` |
| Routine | `ORWORB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** After viewing unsigned orders for a patient via an alert, evaluates whether the alert should be deleted for the current user.   The following two exception conditions exist when determining how alert deletion will occur.  In all other cases, alert deletion will occur when the patient has no unsigned

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XQAID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orworb-unsig-orders-followup`

---

### `ORWTIU GET LISTBOX ITEM`

| Property | Value |
|----------|-------|
| Tag | `GTLSTITM` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Given a TIU document IEN, return the information required to construct a listbox item for that single document.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Documemnt IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-get-listbox-item`

---

### `ORWPCE HASCPT`

| Property | Value |
|----------|-------|
| Tag | `HASCPT` |
| Routine | `ORWPCE2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the passed array with the second piece set to 0 or 1.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORLIST | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-hascpt`

---

### `ORWPCE ASKPCE`

| Property | Value |
|----------|-------|
| Tag | `ASKPCE` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the value of the ORWPCE ASK ENCOUNTER UPDATE parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER | LITERAL | No |
| 2 | LOC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-askpce`

---

### `ORWPCE GAFURL`

| Property | Value |
|----------|-------|
| Tag | `GAFURL` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the GAF Scale Rating Form URL

**API Endpoint:** `GET /vista/or/rpc/orwpce-gafurl`

---

### `ORQQPXRM EDUCATION SUBTOPICS`

| Property | Value |
|----------|-------|
| Tag | `EDS` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns array of subtopics for any given education topic

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EDUCATION TOPIC ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-education-subtopics`

---

### `ORQQPXRM EDUCATION SUMMARY`

| Property | Value |
|----------|-------|
| Tag | `EDL` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns list of education topics for a reminder

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINICAL REMINDER ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-education-summary`

---

### `ORQQPXRM EDUCATION TOPIC`

| Property | Value |
|----------|-------|
| Tag | `EDU` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Detailed description of education topic

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EDUCATION TOPIC ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-education-topic`

---

### `ORQQPXRM MENTAL HEALTH`

| Property | Value |
|----------|-------|
| Tag | `MH` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns array for given mental health instrument

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MENTAL HEALTH INSTRUMENT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-mental-health`

---

### `ORQQPXRM MENTAL HEALTH RESULTS`

| Property | Value |
|----------|-------|
| Tag | `MHR` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns progress note text based on the results of the test.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RESULT GROUP/ELEMENT | LITERAL | No |
| 2 | TEST RESULTS | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-mental-health-results`

---

### `ORQQPXRM MENTAL HEALTH SAVE`

| Property | Value |
|----------|-------|
| Tag | `MHS` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Stores test result responses from a reminder dialog.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TEST RESULTS | LITERAL | No |

**API Endpoint:** `POST /vista/or/rpc/orqqpxrm-mental-health-save`

---

### `ORQQPXRM PROGRESS NOTE HEADER`

| Property | Value |
|----------|-------|
| Tag | `HDR` |
| Routine | `ORQQPXRM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns header text to be inserted in each progress note.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HOSPITAL LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-progress-note-header`

---

### `ORQQPXRM REMINDER CATEGORIES`

| Property | Value |
|----------|-------|
| Tag | `CATEGORY` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns list of all CPRS lookup categories and associated reminders

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | HOSPITAL LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-reminder-categories`

---

### `ORQQPXRM REMINDER DETAIL`

| Property | Value |
|----------|-------|
| Tag | `REMDET` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the details of a clinical reminder

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | CLINICAL REMINDER ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-reminder-detail`

---

### `ORQQPXRM REMINDER DIALOG`

| Property | Value |
|----------|-------|
| Tag | `DIALOG` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Dialog for a given reminder

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINICAL REMINDER ID | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | VISITID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-reminder-dialog`

---

### `ORQQPXRM DIALOG PROMPTS`

| Property | Value |
|----------|-------|
| Tag | `PROMPT` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** Additional prompts for a given dialog element

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIALOG ELEMENT IEN | LITERAL | No |
| 2 | CURRENT/HISTORICAL | LITERAL | No |
| 3 | DIALOG LINE CPT/POV | LITERAL | No |
| 4 | IEN | LITERAL | No |
| 5 | NEWDATA | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-dialog-prompts`

---

### `ORQQPXRM REMINDER EVALUATION`

| Property | Value |
|----------|-------|
| Tag | `ALIST` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Allows evaluation of a list of reminders. Returns a list of clinical reminders due/applicable or not applicable to the patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | REMINDER ARRAY | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-reminder-evaluation`

---

### `ORQQPXRM REMINDER INQUIRY`

| Property | Value |
|----------|-------|
| Tag | `RES` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Detailed description of reminder

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINICAL REMINDER ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-reminder-inquiry`

---

### `ORQQPXRM REMINDER WEB`

| Property | Value |
|----------|-------|
| Tag | `WEB` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Web addresses for selected reminder

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINICAL REMINDER ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-reminder-web`

---

### `ORQQPXRM REMINDERS UNEVALUATED`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns list of CPRS reminders for patient/location (no evaluation is done)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | HOSPITAL LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-reminders-unevaluated`

---

### `ORQQPXRM REMINDERS APPLICABLE`

| Property | Value |
|----------|-------|
| Tag | `APPL` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of clinical reminders due/applicable or not applicable to the patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | HOSPITAL LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-reminders-applicable`

---

### `ORWPCE MHTESTOK`

| Property | Value |
|----------|-------|
| Tag | `MHTESTOK` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns TRUE if all supporing code is in place for Mental Health Tests.

**API Endpoint:** `GET /vista/or/rpc/orwpce-mhtestok`

---

### `ORWLRR INFO`

| Property | Value |
|----------|-------|
| Tag | `INFO` |
| Routine | `ORWLRR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return lab test description information.

**API Endpoint:** `GET /vista/or/rpc/orwlrr-info`

---

### `ORWOR UNSIGN`

| Property | Value |
|----------|-------|
| Tag | `UNSIGN` |
| Routine | `ORWOR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns outstanding unsigned orders.

**API Endpoint:** `GET /vista/or/rpc/orwor-unsign`

---

### `ORWPT INPLOC`

| Property | Value |
|----------|-------|
| Tag | `INPLOC` |
| Routine | `ORWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the patient's current location if an inpatient.

**API Endpoint:** `GET /vista/or/rpc/orwpt-inploc`

---

### `ORWD1 COMLOC`

| Property | Value |
|----------|-------|
| Tag | `COMLOC` |
| Routine | `ORWD1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns true if all orders in a list have a common ordering location.

**API Endpoint:** `GET /vista/or/rpc/orwd1-comloc`

---

### `ORWD1 SIG4ANY`

| Property | Value |
|----------|-------|
| Tag | `SIG4ANY` |
| Routine | `ORWD1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns true if any orders in the list require a signature.

**API Endpoint:** `GET /vista/or/rpc/orwd1-sig4any`

---

### `ORWD1 SIG4ONE`

| Property | Value |
|----------|-------|
| Tag | `SIG4ONE` |
| Routine | `ORWD1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns true if an order requires a signature.

**API Endpoint:** `GET /vista/or/rpc/orwd1-sig4one`

---

### `ORWDLR33 FUTURE LAB COLLECTS`

| Property | Value |
|----------|-------|
| Tag | `LCFUTR` |
| Routine | `ORWDLR33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the number of days in the future to allow Lab Collects.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORLOC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdlr33-future-lab-collects`

---

### `ORQQCN2 GET PREREQUISITE`

| Property | Value |
|----------|-------|
| Tag | `PREREQ` |
| Routine | `ORQQCN2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** Returns resolved boilerplate form CONSULT SERIVCES file (123.5) reflecting the service's prerequisites for ordering a consult.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Service IEN | LITERAL | No |
| 2 | Patient ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn2-get-prerequisite`

---

### `ORQQCN2 SCHEDULE CONSULT`

| Property | Value |
|----------|-------|
| Tag | `SCH` |
| Routine | `ORQQCN2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 6 |

**Description:** Changes status of consult to "Scheduled", optionally adding a comment and sending alerts.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Consult IEN | LITERAL | No |
| 2 | Responsible provider | LITERAL | No |
| 3 | Date of action | LITERAL | No |
| 4 | Send alerts? | LITERAL | No |
| 5 | Send alerts to | LITERAL | No |
| 6 | Comments | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn2-schedule-consult`

---

### `ORQQPXRM DIALOG ACTIVE`

| Property | Value |
|----------|-------|
| Tag | `ACTIVE` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** For a list of reminders [#811.9] returns same list with status to indicate if an active dialog exists for the reminder.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINICAL REMINDER IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-dialog-active`

---

### `ORWPCE MH TEST AUTHORIZED`

| Property | Value |
|----------|-------|
| Tag | `MHATHRZD` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Indicates if a given mental health test can be given by the given user.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TEST | LITERAL | No |
| 2 | USER | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-mh-test-authorized`

---

### `ORWRP PRINT REMOTE REPORT`

| Property | Value |
|----------|-------|
| Tag | `REMOTE` |
| Routine | `ORWRPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This rpc is used to print a remote report on the Report tab  in CPRS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DEVICE | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | REPORT ID | LITERAL | No |
| 4 | HANDLE | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwrp-print-remote-report`

---

### `ORWRP PRINT WINDOWS REMOTE`

| Property | Value |
|----------|-------|
| Tag | `PRINTWR` |
| Routine | `ORWRPP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Prints CPRS GUI information to windows printer.

**API Endpoint:** `GET /vista/or/rpc/orwrp-print-windows-remote`

---

### `ORWRP PRINT LAB REMOTE`

| Property | Value |
|----------|-------|
| Tag | `REMOTE` |
| Routine | `ORWRPL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This rpc is used to print a remote report on the Labs tab  in CPRS.  RETURN PARAMETER DESCRIPTION:  If the print request was successfully queued then the  Task manager task number is return. Otherwise, and error  code and error description are returned.  Error Code Table:         Code            Te

**API Endpoint:** `GET /vista/or/rpc/orwrp-print-lab-remote`

---

### `ORWRP PRINT WINDOWS LAB REMOTE`

| Property | Value |
|----------|-------|
| Tag | `PRINTWR` |
| Routine | `ORWRPL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Prints remote CPRS GUI information to windows printer.

**API Endpoint:** `GET /vista/or/rpc/orwrp-print-windows-lab-remote`

---

### `ORWRP2 HS COMPONENT SUBS`

| Property | Value |
|----------|-------|
| Tag | `COMPSUB` |
| Routine | `ORWRP2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns an array of ADHOC Health Summary subcomponents.

**API Endpoint:** `GET /vista/or/rpc/orwrp2-hs-component-subs`

---

### `ORWCH SAVFONT`

| Property | Value |
|----------|-------|
| Tag | `SAVFONT` |
| Routine | `ORWCH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Saves the user's preferred font.

**API Endpoint:** `GET /vista/or/rpc/orwch-savfont`

---

### `ORWDLR33 LASTTIME`

| Property | Value |
|----------|-------|
| Tag | `LASTTIME` |
| Routine | `ORWDLR33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** When entering quick orders from an order menu, the ^TMP("ORECALL",$J) array contains the last responses entered.  This RPC allows retrieval of the previous order's collection time from that array.

**API Endpoint:** `GET /vista/or/rpc/orwdlr33-lasttime`

---

### `ORWD1 SVONLY`

| Property | Value |
|----------|-------|
| Tag | `SVONLY` |
| Routine | `ORWD1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Prints service copies only (used when user says "Don't Print" for the other copies).

**API Endpoint:** `GET /vista/or/rpc/orwd1-svonly`

---

### `ORWPCE HASVISIT`

| Property | Value |
|----------|-------|
| Tag | `HASVISIT` |
| Routine | `ORWPCE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Returns the visit status of the visit associated with a note: 1 if the visit is being pointed to by an appointment 0 if the visit is NOT being pointed to by an appointment -1 if the visit is invalid or could not be determined

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | ORLOC | LITERAL | No |
| 4 | ORDTE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-hasvisit`

---

### `ORWPCE CPTMODS`

| Property | Value |
|----------|-------|
| Tag | `CPTMODS` |
| Routine | `ORWPCE` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of CPT Modifiers for a given CPT Code.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORCPTCOD | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-cptmods`

---

### `ORWPCE GETMOD`

| Property | Value |
|----------|-------|
| Tag | `GETMOD` |
| Routine | `ORWPCE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns information for a specific CPT Code.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MODIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-getmod`

---

### `PXRM REMINDER DIALOG (TIU)`

| Property | Value |
|----------|-------|
| Tag | `TDIALOG` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Dialog for a given dialog ien.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIALOG IEN | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | VISITID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/pxrm-reminder-dialog-(tiu)`

---

### `ORQQCN ASSIGNABLE MED RESULTS`

| Property | Value |
|----------|-------|
| Tag | `GETMED` |
| Routine | `ORQQCN3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns a list of medicine results that can be attached to a procedure.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CONSULT IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-assignable-med-results`

---

### `ORQQCN REMOVABLE MED RESULTS`

| Property | Value |
|----------|-------|
| Tag | `GETRES` |
| Routine | `ORQQCN3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns list of medicine results that are currently attached to a procedure.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Consult IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-removable-med-results`

---

### `ORQQCN GET MED RESULT DETAILS`

| Property | Value |
|----------|-------|
| Tag | `DISPMED` |
| Routine | `ORQQCN3` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Detailed display of medicine results.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Medicine result pointer | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-get-med-result-details`

---

### `ORQQCN ATTACH MED RESULTS`

| Property | Value |
|----------|-------|
| Tag | `MEDCOMP` |
| Routine | `ORQQCN3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 6 |

**Description:** Allows a med result to be attached to a procedure request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Consult IEN | LITERAL | No |
| 2 | Result pointer | LITERAL | No |
| 3 | Date | LITERAL | No |
| 4 | date | UNKNOWN() | No |
| 5 | Resp Person | LITERAL | No |
| 6 | Alerts to | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-attach-med-results`

---

### `ORQQCN REMOVE MED RESULTS`

| Property | Value |
|----------|-------|
| Tag | `REMOVE` |
| Routine | `ORQQCN3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |

**Description:** Allows removal of medicine results from a  procedure.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Consult IEN | LITERAL | No |
| 2 | Med Result | LITERAL | No |
| 3 | Date | LITERAL | No |
| 4 | Resp Person | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-remove-med-results`

---

### `ORWTPP GETTU`

| Property | Value |
|----------|-------|
| Tag | `GETTU` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-gettu`

---

### `ORWTPP LSDEF`

| Property | Value |
|----------|-------|
| Tag | `LSDEF` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-lsdef`

---

### `ORWTPP NEWLIST`

| Property | Value |
|----------|-------|
| Tag | `NEWLIST` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-newlist`

---

### `ORWTPP PLISTS`

| Property | Value |
|----------|-------|
| Tag | `PLISTS` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-plists`

---

### `ORWTPP REMLIST`

| Property | Value |
|----------|-------|
| Tag | `REMLIST` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-remlist`

---

### `ORWTPP SAVECD`

| Property | Value |
|----------|-------|
| Tag | `SAVECD` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-savecd`

---

### `ORWTPP SAVECS`

| Property | Value |
|----------|-------|
| Tag | `SAVECS` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-savecs`

---

### `ORWTPP SAVELIST`

| Property | Value |
|----------|-------|
| Tag | `SAVELIST` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-savelist`

---

### `ORWTPP SAVENOT`

| Property | Value |
|----------|-------|
| Tag | `SAVENOT` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-savenot`

---

### `ORWTPP SAVENOTO`

| Property | Value |
|----------|-------|
| Tag | `SAVENOTO` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-savenoto`

---

### `ORWTPP SAVEOC`

| Property | Value |
|----------|-------|
| Tag | `SAVEOC` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-saveoc`

---

### `ORWTPP SAVEPLD`

| Property | Value |
|----------|-------|
| Tag | `SAVEPLD` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-savepld`

---

### `ORWTPP SETCOMBO`

| Property | Value |
|----------|-------|
| Tag | `SETCOMBO` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-setcombo`

---

### `ORWTPP SETOTHER`

| Property | Value |
|----------|-------|
| Tag | `SETOTHER` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-setother`

---

### `ORWTPP SETREM`

| Property | Value |
|----------|-------|
| Tag | `SETREM` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-setrem`

---

### `ORWTPP SETSUB`

| Property | Value |
|----------|-------|
| Tag | `SETSUB` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-setsub`

---

### `ORWTPP SORTDEF`

| Property | Value |
|----------|-------|
| Tag | `SORTDEF` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-sortdef`

---

### `ORWTPP PLTEAMS`

| Property | Value |
|----------|-------|
| Tag | `PLTEAMS` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-plteams`

---

### `ORWTPP TEAMS`

| Property | Value |
|----------|-------|
| Tag | `TEAMS` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-teams`

---

### `ORWTPT ATEAMS`

| Property | Value |
|----------|-------|
| Tag | `ATEAMS` |
| Routine | `ORWTPT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpt-ateams`

---

### `ORWTPT GETTEAM`

| Property | Value |
|----------|-------|
| Tag | `GETTEAM` |
| Routine | `ORWTPT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpt-getteam`

---

### `ORWTPN GETCLASS`

| Property | Value |
|----------|-------|
| Tag | `GETCLASS` |
| Routine | `ORWTPN` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpn-getclass`

---

### `ORWTPN GETTC`

| Property | Value |
|----------|-------|
| Tag | `GETTC` |
| Routine | `ORWTPN` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpn-gettc`

---

### `ORWTPO CSARNGD`

| Property | Value |
|----------|-------|
| Tag | `CSARNGD` |
| Routine | `ORWTPO` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpo-csarngd`

---

### `ORWTPO CSLABD`

| Property | Value |
|----------|-------|
| Tag | `CSLABD` |
| Routine | `ORWTPO` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpo-cslabd`

---

### `ORWTPO GETTABS`

| Property | Value |
|----------|-------|
| Tag | `GETTABS` |
| Routine | `ORWTPO` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpo-gettabs`

---

### `ORWTPP ADDLIST`

| Property | Value |
|----------|-------|
| Tag | `ADDLIST` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-addlist`

---

### `ORWTPP CHKSURR`

| Property | Value |
|----------|-------|
| Tag | `CHKSURR` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-chksurr`

---

### `ORWTPP CLDAYS`

| Property | Value |
|----------|-------|
| Tag | `CLDAYS` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-cldays`

---

### `ORWTPP CLEARNOT`

| Property | Value |
|----------|-------|
| Tag | `CLEARNOT` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-clearnot`

---

### `ORWTPP CLRANGE`

| Property | Value |
|----------|-------|
| Tag | `CLRANGE` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-clrange`

---

### `ORWTPP CSARNG`

| Property | Value |
|----------|-------|
| Tag | `CSARNG` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-csarng`

---

### `ORWTPP CSLAB`

| Property | Value |
|----------|-------|
| Tag | `CSLAB` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-cslab`

---

### `ORWTPP DELLIST`

| Property | Value |
|----------|-------|
| Tag | `DELLIST` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-dellist`

---

### `ORWTPP GETCOMBO`

| Property | Value |
|----------|-------|
| Tag | `GETCOMBO` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-getcombo`

---

### `ORWTPP GETNOT`

| Property | Value |
|----------|-------|
| Tag | `GETNOT` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-getnot`

---

### `ORWTPP GETNOTO`

| Property | Value |
|----------|-------|
| Tag | `GETNOTO` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-getnoto`

---

### `ORWTPP GETOC`

| Property | Value |
|----------|-------|
| Tag | `GETOC` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-getoc`

---

### `ORWTPP GETOTHER`

| Property | Value |
|----------|-------|
| Tag | `GETOTHER` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-getother`

---

### `ORWTPP GETREM`

| Property | Value |
|----------|-------|
| Tag | `GETREM` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-getrem`

---

### `ORWTPP GETSUB`

| Property | Value |
|----------|-------|
| Tag | `GETSUB` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-getsub`

---

### `ORWTPP GETSURR`

| Property | Value |
|----------|-------|
| Tag | `GETSURR` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-getsurr`

---

### `ORWTPP GETTD`

| Property | Value |
|----------|-------|
| Tag | `GETTD` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-gettd`

---

### `ORWTPP GETCOS`

| Property | Value |
|----------|-------|
| Tag | `GETCOS` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-getcos`

---

### `ORWTPP GETDCOS`

| Property | Value |
|----------|-------|
| Tag | `GETDCOS` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-getdcos`

---

### `ORWTPP SETDCOS`

| Property | Value |
|----------|-------|
| Tag | `SETDCOS` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-setdcos`

---

### `ORWORB KILL EXPIR OI ALERT`

| Property | Value |
|----------|-------|
| Tag | `KILEXOI` |
| Routine | `ORWORB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Evaluate expiring flagged orderable item orders. If none remain, kill current alert for current user.  Kill for other users if alert so defined.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Patient DFN | LITERAL | No |
| 2 | Alert type | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orworb-kill-expir-oi-alert`

---

### `ORWRP LAB REPORT LISTS`

| Property | Value |
|----------|-------|
| Tag | `LABLIST` |
| Routine | `ORWRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns a list of lab reports, There are no input parameters fo this rpc.

**API Endpoint:** `GET /vista/or/rpc/orwrp-lab-report-lists`

---

### `ORWPCE GETSVC`

| Property | Value |
|----------|-------|
| Tag | `GETSVC` |
| Routine | `ORWPCE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Calculates the correct service category.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SVC | LITERAL | No |
| 2 | LOC | LITERAL | No |
| 3 | INP | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-getsvc`

---

### `ORQQCN SVC W/SYNONYMS`

| Property | Value |
|----------|-------|
| Tag | `SVCSYN` |
| Routine | `ORQQCN2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |

**Description:** This is a modified version of ORQQCN GET SERVICE TREE that also includes synonyms for the services returned. It also allows passing of an optional Consult IEN, for screening allowable services to forward the consult to, especially in the case of interfacility consults.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Start With | LITERAL | No |
| 2 | Purpose | LITERAL | No |
| 3 | Include Synonyms | LITERAL | No |
| 4 | Consult IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-svc-w/synonyms`

---

### `ORWCV1 COVERSHEET LIST`

| Property | Value |
|----------|-------|
| Tag | `COVERLST` |
| Routine | `ORWCV1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns a list of Cover Sheet reports, There are no input parameters fo this rpc.

**API Endpoint:** `GET /vista/or/rpc/orwcv1-coversheet-list`

---

### `ORWTIU IDNOTES INSTALLED`

| Property | Value |
|----------|-------|
| Tag | `IDNOTES` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns "1" if TIU*1.0*100 is installed, "0" otherwise.  This lets the CPRS GUI enable or disable the Interdisciplinary Notes functionality until the server is ready.

**API Endpoint:** `GET /vista/or/rpc/orwtiu-idnotes-installed`

---

### `ORQQPX GET FOLDERS`

| Property | Value |
|----------|-------|
| Tag | `GETFLDRS` |
| Routine | `ORQQPX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the value of the ORQQPX REMINDER FOLDERS parameter for the current user.

**API Endpoint:** `GET /vista/or/rpc/orqqpx-get-folders`

---

### `ORQQPX SET FOLDERS`

| Property | Value |
|----------|-------|
| Tag | `SETFLDRS` |
| Routine | `ORQQPX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Sets the value of the ORQQPX REMINDER FOLDERS parameter for the current user.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORFLDRS | LITERAL | No |

**API Endpoint:** `POST /vista/or/rpc/orqqpx-set-folders`

---

### `ORQQPX GET DEF LOCATIONS`

| Property | Value |
|----------|-------|
| Tag | `GETDEFOL` |
| Routine | `ORQQPX` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the contents of the ORQQPX DEFAULT LOCATIONS parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpx-get-def-locations`

---

### `ORWDPS2 OISLCT`

| Property | Value |
|----------|-------|
| Tag | `OISLCT` |
| Routine | `ORWDPS2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/or/rpc/orwdps2-oislct`

---

### `ORWDPS2 ADMIN`

| Property | Value |
|----------|-------|
| Tag | `ADMIN` |
| Routine | `ORWDPS2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/or/rpc/orwdps2-admin`

---

### `ORWDPS1 ODSLCT`

| Property | Value |
|----------|-------|
| Tag | `ODSLCT` |
| Routine | `ORWDPS1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps1-odslct`

---

### `ORWDPS1 SCHALL`

| Property | Value |
|----------|-------|
| Tag | `SCHALL` |
| Routine | `ORWDPS1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | LOCIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdps1-schall`

---

### `ORWDPS2 REQST`

| Property | Value |
|----------|-------|
| Tag | `REQST` |
| Routine | `ORWDPS2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps2-reqst`

---

### `ORWDPS2 DAY2QTY`

| Property | Value |
|----------|-------|
| Tag | `DAY2QTY` |
| Routine | `ORWDPS2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps2-day2qty`

---

### `ORWDX DGNM`

| Property | Value |
|----------|-------|
| Tag | `DGNM` |
| Routine | `ORWDX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdx-dgnm`

---

### `ORWUL QV4DG`

| Property | Value |
|----------|-------|
| Tag | `QV4DG` |
| Routine | `ORWUL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwul-qv4dg`

---

### `ORWUL FV4DG`

| Property | Value |
|----------|-------|
| Tag | `FV4DG` |
| Routine | `ORWUL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwul-fv4dg`

---

### `ORWUL FVSUB`

| Property | Value |
|----------|-------|
| Tag | `FVSUB` |
| Routine | `ORWUL` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwul-fvsub`

---

### `ORWUL FVIDX`

| Property | Value |
|----------|-------|
| Tag | `FVIDX` |
| Routine | `ORWUL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwul-fvidx`

---

### `ORWUL QVSUB`

| Property | Value |
|----------|-------|
| Tag | `QVSUB` |
| Routine | `ORWUL` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwul-qvsub`

---

### `ORWUL QVIDX`

| Property | Value |
|----------|-------|
| Tag | `QVIDX` |
| Routine | `ORWUL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwul-qvidx`

---

### `ORWDPS1 CHK94`

| Property | Value |
|----------|-------|
| Tag | `CHK94` |
| Routine | `ORWDPS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps1-chk94`

---

### `ORWDPS1 DFLTSPLY`

| Property | Value |
|----------|-------|
| Tag | `DFLTSPLY` |
| Routine | `ORWDPS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/or/rpc/orwdps1-dfltsply`

---

### `ORWPCE ANYTIME`

| Property | Value |
|----------|-------|
| Tag | `ANYTIME` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns TRUE if encounters can be entered at any time

**API Endpoint:** `GET /vista/or/rpc/orwpce-anytime`

---

### `ORWTPP GETIMG`

| Property | Value |
|----------|-------|
| Tag | `GETIMG` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-getimg`

---

### `ORWTPO GETIMGD`

| Property | Value |
|----------|-------|
| Tag | `GETIMGD` |
| Routine | `ORWTPO` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpo-getimgd`

---

### `ORWTPP SETIMG`

| Property | Value |
|----------|-------|
| Tag | `SETIMG` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-setimg`

---

### `ORQQPX REM INSERT AT CURSOR`

| Property | Value |
|----------|-------|
| Tag | `INSCURS` |
| Routine | `ORQQPX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns TRUE if text generated from a reminder dialog, when processing a reminder, is to be inserted at the current cursor location, rather than at the bottom of the note.

**API Endpoint:** `GET /vista/or/rpc/orqqpx-rem-insert-at-cursor`

---

### `ORWDPS2 MAXREF`

| Property | Value |
|----------|-------|
| Tag | `MAXREF` |
| Routine | `ORWDPS2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps2-maxref`

---

### `ORWDPS2 SCHREQ`

| Property | Value |
|----------|-------|
| Tag | `SCHREQ` |
| Routine | `ORWDPS2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps2-schreq`

---

### `ORWTPP SAVESURR`

| Property | Value |
|----------|-------|
| Tag | `SAVESURR` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-savesurr`

---

### `ORWTPP SAVET`

| Property | Value |
|----------|-------|
| Tag | `SAVET` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-savet`

---

### `ORWPCE AUTO VISIT TYPE SELECT`

| Property | Value |
|----------|-------|
| Tag | `AUTOVSIT` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns TRUE if visit type should be automatically selected.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-auto-visit-type-select`

---

### `ORWDPS2 QTY2DAY`

| Property | Value |
|----------|-------|
| Tag | `QTY2DAY` |
| Routine | `ORWDPS2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps2-qty2day`

---

### `ORWRP COLUMN HEADERS`

| Property | Value |
|----------|-------|
| Tag | `GETCOL` |
| Routine | `ORWRP` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Get list of Column headers for a ListView type report from file 101.24.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwrp-column-headers`

---

### `ORQQPX NEW COVER SHEET REMS`

| Property | Value |
|----------|-------|
| Tag | `REMLIST` |
| Routine | `ORQQPX` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of reminders for cover sheet evaluation.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpx-new-cover-sheet-rems`

---

### `ORQQPX NEW COVER SHEET ACTIVE`

| Property | Value |
|----------|-------|
| Tag | `NEWCVOK` |
| Routine | `ORQQPX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns TRUE if the new cover sheet parameters are to be used.

**API Endpoint:** `GET /vista/or/rpc/orqqpx-new-cover-sheet-active`

---

### `ORQQPX LVREMLST`

| Property | Value |
|----------|-------|
| Tag | `LVREMLST` |
| Routine | `ORQQPX` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns Cover Sheet reminder settings

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LVL | LITERAL | No |
| 2 | CLASS | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpx-lvremlst`

---

### `ORQQPX SAVELVL`

| Property | Value |
|----------|-------|
| Tag | `SAVELVL` |
| Routine | `ORQQPX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Saves Parameter Level settings.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LVL | LITERAL | No |
| 2 | CLASS | LITERAL | No |
| 3 | DATA | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpx-savelvl`

---

### `ORWU HAS OPTION ACCESS`

| Property | Value |
|----------|-------|
| Tag | `HASOPTN` |
| Routine | `ORWU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns true if the user has access to the specified menu option.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OPTION | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwu-has-option-access`

---

### `ORWPCE ALWAYS CHECKOUT`

| Property | Value |
|----------|-------|
| Tag | `DOCHKOUT` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns TRUE if encounters should be automatically checked out.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-always-checkout`

---

### `ORWPCE GET EXCLUDED`

| Property | Value |
|----------|-------|
| Tag | `EXCLUDED` |
| Routine | `ORWPCE2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of excluded PCE entries

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOC | LITERAL | No |
| 2 | TYPE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-get-excluded`

---

### `ORWDPS1 FORMALT`

| Property | Value |
|----------|-------|
| Tag | `FORMALT` |
| Routine | `ORWDPS1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps1-formalt`

---

### `ORQPT DEFAULT LIST SORT`

| Property | Value |
|----------|-------|
| Tag | `DEFSORT` |
| Routine | `ORQPTQ11` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the current user's default patient selection list SORT ORDER setting.

**API Endpoint:** `GET /vista/or/rpc/orqpt-default-list-sort`

---

### `ORWDPS1 DOSEALT`

| Property | Value |
|----------|-------|
| Tag | `DOSEALT` |
| Routine | `ORWDPS1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps1-dosealt`

---

### `ORQPT DEFAULT CLINIC DATE RANG`

| Property | Value |
|----------|-------|
| Tag | `CDATRANG` |
| Routine | `ORQPTQ2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns default start and stop dates for clinics in the form: start^stop. Start and stop are free text and are not in FM format.

**API Endpoint:** `GET /vista/or/rpc/orqpt-default-clinic-date-rang`

---

### `ORWTPR OCDESC`

| Property | Value |
|----------|-------|
| Tag | `OCDESC` |
| Routine | `ORWTPR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpr-ocdesc`

---

### `ORWTPR NOTDESC`

| Property | Value |
|----------|-------|
| Tag | `NOTDESC` |
| Routine | `ORWTPR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpr-notdesc`

---

### `ORWDPS1 FAILDEA`

| Property | Value |
|----------|-------|
| Tag | `FAILDEA` |
| Routine | `ORWDPS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps1-faildea`

---

### `ORWTIU CANLINK`

| Property | Value |
|----------|-------|
| Tag | `CANLINK` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Given a title, call CANLINK^TIULP to determine whether this title can use  linked as an Interdisciplinary child note.   dbia #2322

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TITLE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-canlink`

---

### `ORWCOM PTOBJ`

| Property | Value |
|----------|-------|
| Tag | `PTOBJ` |
| Routine | `ORWCOM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns COM Object entries from  different parameters.

**API Endpoint:** `GET /vista/or/rpc/orwcom-ptobj`

---

### `ORWCOM ORDEROBJ`

| Property | Value |
|----------|-------|
| Tag | `ORDEROBJ` |
| Routine | `ORWCOM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Returns COM Objects for order accept

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORGRP | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwcom-orderobj`

---

### `ORWCOM GETOBJS`

| Property | Value |
|----------|-------|
| Tag | `GETOBJS` |
| Routine | `ORWCOM` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of all active COM objects

**API Endpoint:** `GET /vista/or/rpc/orwcom-getobjs`

---

### `ORWCOM DETAILS`

| Property | Value |
|----------|-------|
| Tag | `DETAILS` |
| Routine | `ORWCOM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns details of COM object when passed in COM IEN.

**API Endpoint:** `GET /vista/or/rpc/orwcom-details`

---

### `ORWSR SHOW SURG TAB`

| Property | Value |
|----------|-------|
| Tag | `SHOWSURG` |
| Routine | `ORWSR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Check for presence of SR*3.0*100 (Surgery Electronic Signature) patch, and also for parameter value.  If both TRUE, surgery tab will be displayed in CPRS.

**API Endpoint:** `GET /vista/or/rpc/orwsr-show-surg-tab`

---

### `ORWSR LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORWSR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** Return list of surgery cases for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | patient id | LITERAL | No |
| 2 | BEGIN DATE | LITERAL | No |
| 3 | END DATE | LITERAL | No |
| 4 | CONTEXT | LITERAL | No |
| 5 | MAX | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwsr-list`

---

### `ORWSR GET SURG CONTEXT`

| Property | Value |
|----------|-------|
| Tag | `GTSURCTX` |
| Routine | `ORWSR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwsr-get-surg-context`

---

### `ORWSR SAVE SURG CONTEXT`

| Property | Value |
|----------|-------|
| Tag | `SVSURCTX` |
| Routine | `ORWSR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/or/rpc/orwsr-save-surg-context`

---

### `ORWSR ONECASE`

| Property | Value |
|----------|-------|
| Tag | `ONECASE` |
| Routine | `ORWSR` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Given a TIU document IEN, return the surgical case record and all other documents related to the case, for display in the GUI treeview.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwsr-onecase`

---

### `ORWSR CASELIST`

| Property | Value |
|----------|-------|
| Tag | `CASELIST` |
| Routine | `ORWSR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Returns a list of all surgery cases for a patient, without documents as returned by ORWSR LIST.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | dfn | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwsr-caselist`

---

### `ORWSR SHOW OPTOP WHEN SIGNING`

| Property | Value |
|----------|-------|
| Tag | `SHOWOPTP` |
| Routine | `ORWSR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CASE IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwsr-show-optop-when-signing`

---

### `ORWSR IS NON-OR PROCEDURE`

| Property | Value |
|----------|-------|
| Tag | `ISNONOR` |
| Routine | `ORWSR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CASE IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwsr-is-non-or-procedure`

---

### `ORQQCN GET PROC IEN`

| Property | Value |
|----------|-------|
| Tag | `PROCIEN` |
| Routine | `ORQQCN1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Given orderable item IEN, return pointer to file 123.3

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | orderable item | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-get-proc-ien`

---

### `ORWRP3 EXPAND COLUMNS`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORWRP3` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC loads and expands nested reports defined in the OE/RR Reports file (#101.24) for use on the Reports Tab in CPRS.

**API Endpoint:** `GET /vista/or/rpc/orwrp3-expand-columns`

---

### `ORWTPD DELDFLT`

| Property | Value |
|----------|-------|
| Tag | `DELDFLT` |
| Routine | `ORWTPD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Delete user level's specific health summary component setting( date range and max occurences)

**API Endpoint:** `GET /vista/or/rpc/orwtpd-deldflt`

---

### `ORWTPD GETDFLT`

| Property | Value |
|----------|-------|
| Tag | `GETDFLT` |
| Routine | `ORWTPD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** get default setting for all reports(time/occ limits)

**API Endpoint:** `GET /vista/or/rpc/orwtpd-getdflt`

---

### `ORWTPD SUINDV`

| Property | Value |
|----------|-------|
| Tag | `SUINDV` |
| Routine | `ORWTPD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** set user level individual report's time/occ setting

**API Endpoint:** `GET /vista/or/rpc/orwtpd-suindv`

---

### `ORWTPD RSDFLT`

| Property | Value |
|----------|-------|
| Tag | `RSDFLT` |
| Routine | `ORWTPD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** get system or package level default setting for all repors.

**API Endpoint:** `GET /vista/or/rpc/orwtpd-rsdflt`

---

### `ORWTPD SUDF`

| Property | Value |
|----------|-------|
| Tag | `SUDF` |
| Routine | `ORWTPD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Set user level default time/occ limits for all reports

**API Endpoint:** `GET /vista/or/rpc/orwtpd-sudf`

---

### `ORWTPD ACTDF`

| Property | Value |
|----------|-------|
| Tag | `ACTDF` |
| Routine | `ORWTPD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Make default time/occ setting take action on each report

**API Endpoint:** `GET /vista/or/rpc/orwtpd-actdf`

---

### `ORWTPD GETSETS`

| Property | Value |
|----------|-------|
| Tag | `GETSETS` |
| Routine | `ORWTPD` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpd-getsets`

---

### `ORWRP PRINT V REPORT`

| Property | Value |
|----------|-------|
| Tag | `PRINTV` |
| Routine | `ORWRPP1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This rpc is used to print a V type report on the Reports tab in CPRS

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORIO | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | HEADER | LITERAL | No |
| 4 | REPORT | LIST | No |

**API Endpoint:** `GET /vista/or/rpc/orwrp-print-v-report`

---

### `ORWCH SAVECOL`

| Property | Value |
|----------|-------|
| Tag | `SAVECOL` |
| Routine | `ORWCH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC saves the column width sizes for reports in CPRS for the user.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | COL | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwch-savecol`

---

### `ORWRP2 COMPABV`

| Property | Value |
|----------|-------|
| Tag | `COMPABV` |
| Routine | `ORWRP2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns an array of the ADHOC Health Summary components by abbreviation.

**API Endpoint:** `GET /vista/or/rpc/orwrp2-compabv`

---

### `ORWRP2 SAVLKUP`

| Property | Value |
|----------|-------|
| Tag | `SAVLKUP` |
| Routine | `ORWRP2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This saves the last Adhoc Health Summary lookup used by a user in CPRS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VAL | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwrp2-savlkup`

---

### `ORWRP2 GETLKUP`

| Property | Value |
|----------|-------|
| Tag | `GETLKUP` |
| Routine | `ORWRP2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This gets the last Adhoc Health Summary lookup used by a user in CPRS.

**API Endpoint:** `GET /vista/or/rpc/orwrp2-getlkup`

---

### `ORWRP2 COMPDISP`

| Property | Value |
|----------|-------|
| Tag | `COMPDISP` |
| Routine | `ORWRP2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns an array of the ADHOC Health Summary components by  display name.

**API Endpoint:** `GET /vista/or/rpc/orwrp2-compdisp`

---

### `ORWPCE ISCLINIC`

| Property | Value |
|----------|-------|
| Tag | `ISCLINIC` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns TRUE if location is a Clinic.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORLOC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-isclinic`

---

### `ORWSR RPTLIST`

| Property | Value |
|----------|-------|
| Tag | `RPTLIST` |
| Routine | `ORWSR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwsr-rptlist`

---

### `ORQQPXRM MST UPDATE`

| Property | Value |
|----------|-------|
| Tag | `MST` |
| Routine | `ORQQPXRM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Saves MST data

**API Endpoint:** `POST /vista/or/rpc/orqqpxrm-mst-update`

---

### `ORWMC PATIENT PROCEDURES1`

| Property | Value |
|----------|-------|
| Tag | `PROD1` |
| Routine | `ORWMC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns a list of patient procedures for a  specific patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwmc-patient-procedures1`

---

### `ORWRA IMAGING EXAMS1`

| Property | Value |
|----------|-------|
| Tag | `EXAMS1` |
| Routine | `ORWRA` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns a list on imaging exams for a specific patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwra-imaging-exams1`

---

### `ORWRA REPORT TEXT1`

| Property | Value |
|----------|-------|
| Tag | `RPT1` |
| Routine | `ORWRA` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns an array containing a formattied imaging report. This array matches exactly the report format on the roll 'n scroll version of CPRS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | EXAMID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwra-report-text1`

---

### `ORWPCE HNCOK`

| Property | Value |
|----------|-------|
| Tag | `HNCOK` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns TRUE if the Head and/or Neck Cancer patches have been installed

**API Endpoint:** `GET /vista/or/rpc/orwpce-hncok`

---

### `ORWORB KILL UNVER ORDERS ALERT`

| Property | Value |
|----------|-------|
| Tag | `KILUNVOR` |
| Routine | `ORWORB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orworb-kill-unver-orders-alert`

---

### `ORWORB KILL UNVER MEDS ALERT`

| Property | Value |
|----------|-------|
| Tag | `KILUNVMD` |
| Routine | `ORWORB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orworb-kill-unver-meds-alert`

---

### `ORWPS MEDHIST`

| Property | Value |
|----------|-------|
| Tag | `MEDHIST` |
| Routine | `ORWPS` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwps-medhist`

---

### `ORWDPS4 CPLST`

| Property | Value |
|----------|-------|
| Tag | `CPLST` |
| Routine | `ORWDPS4` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Get co-pay ralated questions

**API Endpoint:** `GET /vista/or/rpc/orwdps4-cplst`

---

### `ORWDPS4 CPINFO`

| Property | Value |
|----------|-------|
| Tag | `CPINFO` |
| Routine | `ORWDPS4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Save outpatient med order co-pay information.

**API Endpoint:** `GET /vista/or/rpc/orwdps4-cpinfo`

---

### `ORWDPS2 CHKPI`

| Property | Value |
|----------|-------|
| Tag | `CHKPI` |
| Routine | `ORWDPS2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps2-chkpi`

---

### `ORWDXR GTORITM`

| Property | Value |
|----------|-------|
| Tag | `GTORITM` |
| Routine | `ORWDXR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxr-gtoritm`

---

### `ORWDPS2 CHKGRP`

| Property | Value |
|----------|-------|
| Tag | `CHKGRP` |
| Routine | `ORWDPS2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps2-chkgrp`

---

### `ORWDPS2 QOGRP`

| Property | Value |
|----------|-------|
| Tag | `QOGRP` |
| Routine | `ORWDPS2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps2-qogrp`

---

### `ORWDXR GETPKG`

| Property | Value |
|----------|-------|
| Tag | `GETPKG` |
| Routine | `ORWDXR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxr-getpkg`

---

### `ORBCMA5 GETUD`

| Property | Value |
|----------|-------|
| Tag | `GETUD` |
| Routine | `ORBCMA5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma5-getud`

---

### `ORBCMA5 GETUDID`

| Property | Value |
|----------|-------|
| Tag | `GETUDID` |
| Routine | `ORBCMA5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma5-getudid`

---

### `ORBCMA5 GETIVID`

| Property | Value |
|----------|-------|
| Tag | `GETIVID` |
| Routine | `ORBCMA5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma5-getivid`

---

### `ORBCMA5 ODITMBC`

| Property | Value |
|----------|-------|
| Tag | `ODITMBC` |
| Routine | `ORBCMA5` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma5-oditmbc`

---

### `ORWUBCMA USERINFO`

| Property | Value |
|----------|-------|
| Tag | `USERINFO` |
| Routine | `ORWUBCMA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORWDPS5 | UNKNOWN() | No |

**API Endpoint:** `GET /vista/or/rpc/orwubcma-userinfo`

---

### `ORBCMA32 DLGSLCT`

| Property | Value |
|----------|-------|
| Tag | `DLGSLCT` |
| Routine | `ORBCMA32` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma32-dlgslct`

---

### `ORBCMA1 ODSLCT`

| Property | Value |
|----------|-------|
| Tag | `ODSLCT` |
| Routine | `ORBCMA1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma1-odslct`

---

### `ORBCMA1 CHK94`

| Property | Value |
|----------|-------|
| Tag | `CHK94` |
| Routine | `ORBCMA1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma1-chk94`

---

### `ORBCMA1 FAILDEA`

| Property | Value |
|----------|-------|
| Tag | `FAILDEA` |
| Routine | `ORBCMA1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma1-faildea`

---

### `ORBCMA1 FORMALT`

| Property | Value |
|----------|-------|
| Tag | `FORMALT` |
| Routine | `ORBCMA1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma1-formalt`

---

### `ORBCMA1 DOSEALT`

| Property | Value |
|----------|-------|
| Tag | `DOSEALT` |
| Routine | `ORBCMA1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma1-dosealt`

---

### `ORBCMA1 SCHALL`

| Property | Value |
|----------|-------|
| Tag | `SCHALL` |
| Routine | `ORBCMA1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma1-schall`

---

### `ORBCMA32 AUTH`

| Property | Value |
|----------|-------|
| Tag | `AUTH` |
| Routine | `ORBCMA32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma32-auth`

---

### `ORBCMA32 DRUGMSG`

| Property | Value |
|----------|-------|
| Tag | `DRUGMSG` |
| Routine | `ORBCMA32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BOWDPS32 FORMALT | UNKNOWN() | No |

**API Endpoint:** `GET /vista/or/rpc/orbcma32-drugmsg`

---

### `ORBCMA32 FORMALT`

| Property | Value |
|----------|-------|
| Tag | `FORMALT` |
| Routine | `ORBCMA32` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma32-formalt`

---

### `ORBCMA32 VALROUTE`

| Property | Value |
|----------|-------|
| Tag | `VALROUTE` |
| Routine | `ORBCMA32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma32-valroute`

---

### `ORBCMA32 ISSPLY`

| Property | Value |
|----------|-------|
| Tag | `ISSPLY` |
| Routine | `ORBCMA32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma32-issply`

---

### `ORBCMA32 IVAMT`

| Property | Value |
|----------|-------|
| Tag | `IVAMT` |
| Routine | `ORBCMA32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma32-ivamt`

---

### `ORBCMA32 VALRATE`

| Property | Value |
|----------|-------|
| Tag | `VALRATE` |
| Routine | `ORBCMA32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma32-valrate`

---

### `ORBCMA32 VALSCH`

| Property | Value |
|----------|-------|
| Tag | `VALSCH` |
| Routine | `ORBCMA32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbcma32-valsch`

---

### `ORQPT MAKE RPL`

| Property | Value |
|----------|-------|
| Tag | `RPLMAKE` |
| Routine | `ORQPTQ11` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Passes Team List IEN, creates a TMP file entry of patients based thereon,  and receives a $J job number in return.

**API Endpoint:** `GET /vista/or/rpc/orqpt-make-rpl`

---

### `ORQPT READ RPL`

| Property | Value |
|----------|-------|
| Tag | `RPLREAD` |
| Routine | `ORQPTQ11` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Passes global reference and other parameters, and receives a list of  patients (up to 44 maximum) with IENs, for use in scrolling a Long List  Box (LLB) componenet.

**API Endpoint:** `GET /vista/or/rpc/orqpt-read-rpl`

---

### `ORQPT KILL RPL`

| Property | Value |
|----------|-------|
| Tag | `RPLCLEAN` |
| Routine | `ORQPTQ11` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is passed a ^TMP file root and $J (job number) and kills the ^TMP("ORRPL",$J global data based on the passed file root w/job number.

**API Endpoint:** `GET /vista/or/rpc/orqpt-kill-rpl`

---

### `ORWDPS1 LOCPICK`

| Property | Value |
|----------|-------|
| Tag | `LOCPICK` |
| Routine | `ORWDPS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps1-locpick`

---

### `ORWTIU GET SAVED CP FIELDS`

| Property | Value |
|----------|-------|
| Tag | `GETCP` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Given a TIU document of the clinical procedures class, return the author,  title, cosigner, procedure summary code, date/time of procedure, and  reference date, as stored on the server.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-get-saved-cp-fields`

---

### `ORWOR PKIUSE`

| Property | Value |
|----------|-------|
| Tag | `PKIUSE` |
| Routine | `ORWOR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwor-pkiuse`

---

### `ORWPT LAST5 RPL`

| Property | Value |
|----------|-------|
| Tag | `LAST5RPL` |
| Routine | `ORWPT` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of patients matching the string of Last Name Initial_Last  4 SSN (Initial/Last 4 look-up based on Restricted Patient List).

**API Endpoint:** `GET /vista/or/rpc/orwpt-last5-rpl`

---

### `ORWPT FULLSSN RPL`

| Property | Value |
|----------|-------|
| Tag | `FSSNRPL` |
| Routine | `ORWPT` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Given an SSN in the format 999999999(P), return a list of matching  patients based on Restricted Patient List.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpt-fullssn-rpl`

---

### `ORWOR1 CHKDIG`

| Property | Value |
|----------|-------|
| Tag | `CHKDIG` |
| Routine | `ORWOR1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns true if an order requires a digital signature.

**API Endpoint:** `GET /vista/or/rpc/orwor1-chkdig`

---

### `ORWOR1 GETDTEXT`

| Property | Value |
|----------|-------|
| Tag | `GETDTEXT` |
| Routine | `ORWOR1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns the external text of an existing order.

**API Endpoint:** `GET /vista/or/rpc/orwor1-getdtext`

---

### `ORWOR1 GETDSIG`

| Property | Value |
|----------|-------|
| Tag | `GETDSIG` |
| Routine | `ORWOR1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the digital signature of an existing order.

**API Endpoint:** `GET /vista/or/rpc/orwor1-getdsig`

---

### `ORWOR1 SIG`

| Property | Value |
|----------|-------|
| Tag | `SIG` |
| Routine | `ORWOR1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns 1 if signature gets stored.

**API Endpoint:** `GET /vista/or/rpc/orwor1-sig`

---

### `ORWCIRN RESTRICT`

| Property | Value |
|----------|-------|
| Tag | `RESTRICT` |
| Routine | `ORWCIRN` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC checks for sensitive patients on a remote system.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwcirn-restrict`

---

### `ORWTPD GETIMG`

| Property | Value |
|----------|-------|
| Tag | `GETIMG` |
| Routine | `ORWTPD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpd-getimg`

---

### `ORWORB TEXT FOLLOWUP`

| Property | Value |
|----------|-------|
| Tag | `TXTFUP` |
| Routine | `ORWORB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns text for notifications/alerts with a simple text message follow-up action.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | NOTIFICATION | LITERAL | No |
| 3 | XQADATA | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orworb-text-followup`

---

### `ORWOR RESULT HISTORY`

| Property | Value |
|----------|-------|
| Tag | `RESHIST` |
| Routine | `ORWOR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a result history of a CPRS order.

**API Endpoint:** `GET /vista/or/rpc/orwor-result-history`

---

### `ORWCIRN CHECKLINK`

| Property | Value |
|----------|-------|
| Tag | `CHKLNK` |
| Routine | `ORWCIRN` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Check to see if HL7 TCP link is active.

**API Endpoint:** `GET /vista/or/rpc/orwcirn-checklink`

---

### `OREVNTX PAT`

| Property | Value |
|----------|-------|
| Tag | `PAT` |
| Routine | `OREVNTX` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx-pat`

---

### `OREVNTX ACTIVE`

| Property | Value |
|----------|-------|
| Tag | `ACTIVE` |
| Routine | `OREVNTX` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx-active`

---

### `OREVNTX1 PUTEVNT`

| Property | Value |
|----------|-------|
| Tag | `PUTEVNT` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-putevnt`

---

### `OREVNTX1 GTEVT`

| Property | Value |
|----------|-------|
| Tag | `GTEVT` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-gtevt`

---

### `OREVNTX1 WRLSTED`

| Property | Value |
|----------|-------|
| Tag | `WRLSTED` |
| Routine | `OREVNTX1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-wrlsted`

---

### `OREVNTX1 EVT`

| Property | Value |
|----------|-------|
| Tag | `EVT` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-evt`

---

### `OREVNTX1 EXISTS`

| Property | Value |
|----------|-------|
| Tag | `EXISTS` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-exists`

---

### `OREVNTX1 NAME`

| Property | Value |
|----------|-------|
| Tag | `NAME` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-name`

---

### `OREVNTX1 MATCH`

| Property | Value |
|----------|-------|
| Tag | `MATCH` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-match`

---

### `OREVNTX1 GTEVT1`

| Property | Value |
|----------|-------|
| Tag | `GTEVT1` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-gtevt1`

---

### `OREVNTX1 DIV`

| Property | Value |
|----------|-------|
| Tag | `DIV` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-div`

---

### `OREVNTX1 DIV1`

| Property | Value |
|----------|-------|
| Tag | `DIV1` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-div1`

---

### `OREVNTX1 LOC`

| Property | Value |
|----------|-------|
| Tag | `LOC` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-loc`

---

### `OREVNTX1 LOC1`

| Property | Value |
|----------|-------|
| Tag | `LOC1` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-loc1`

---

### `OREVNTX1 CHGEVT`

| Property | Value |
|----------|-------|
| Tag | `CHGEVT` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-chgevt`

---

### `OREVNTX1 EMPTY`

| Property | Value |
|----------|-------|
| Tag | `EMPTY` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-empty`

---

### `OREVNTX1 DELPTEVT`

| Property | Value |
|----------|-------|
| Tag | `DELPTEVT` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-delptevt`

---

### `ORWDX SENDED`

| Property | Value |
|----------|-------|
| Tag | `SENDED` |
| Routine | `ORWDX` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdx-sended`

---

### `OREVNTX1 GETDLG`

| Property | Value |
|----------|-------|
| Tag | `GETDLG` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-getdlg`

---

### `OREVNTX1 CURSPE`

| Property | Value |
|----------|-------|
| Tag | `CURSPE` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-curspe`

---

### `OREVNTX1 DFLTEVT`

| Property | Value |
|----------|-------|
| Tag | `DFLTEVT` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-dfltevt`

---

### `OREVNTX1 DONE`

| Property | Value |
|----------|-------|
| Tag | `DONE` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-done`

---

### `OREVNTX1 CPACT`

| Property | Value |
|----------|-------|
| Tag | `CPACT` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-cpact`

---

### `OREVNTX1 PRMPTID`

| Property | Value |
|----------|-------|
| Tag | `PRMPTID` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-prmptid`

---

### `ORECS01 CHKESSO`

| Property | Value |
|----------|-------|
| Tag | `CHKESSO` |
| Routine | `ORECS01` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orecs01-chkesso`

---

### `ORECS01 VSITID`

| Property | Value |
|----------|-------|
| Tag | `VSITID` |
| Routine | `ORECS01` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orecs01-vsitid`

---

### `OREVNTX LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `OREVNTX` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx-list`

---

### `ORECS01 ECPRINT`

| Property | Value |
|----------|-------|
| Tag | `ECPRINT` |
| Routine | `ORECS01` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orecs01-ecprint`

---

### `ORECS01 ECRPT`

| Property | Value |
|----------|-------|
| Tag | `ECRPT` |
| Routine | `ORECS01` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/or/rpc/orecs01-ecrpt`

---

### `OREVNTX1 ISDCOD`

| Property | Value |
|----------|-------|
| Tag | `ISDCOD` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-isdcod`

---

### `OREVNTX1 SETDFLT`

| Property | Value |
|----------|-------|
| Tag | `SETDFLT` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-setdflt`

---

### `ORWDPS1 HASOIPI`

| Property | Value |
|----------|-------|
| Tag | `HASOIPI` |
| Routine | `ORWDPS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps1-hasoipi`

---

### `OREVNTX1 DEFLTS`

| Property | Value |
|----------|-------|
| Tag | `DEFLTS` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-deflts`

---

### `OREVNTX1 MULTS`

| Property | Value |
|----------|-------|
| Tag | `MULTS` |
| Routine | `OREVNTX1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-mults`

---

### `OREVNTX1 PROMPT IDS`

| Property | Value |
|----------|-------|
| Tag | `PRTIDS` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-prompt-ids`

---

### `ORWDPS1 HASROUTE`

| Property | Value |
|----------|-------|
| Tag | `HASROUTE` |
| Routine | `ORWDPS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps1-hasroute`

---

### `OREVNTX1 DELDFLT`

| Property | Value |
|----------|-------|
| Tag | `DELDFLT` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-deldflt`

---

### `OREVNTX1 DFLTDLG`

| Property | Value |
|----------|-------|
| Tag | `DFLTDLG` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-dfltdlg`

---

### `ORECS01 GETDIV`

| Property | Value |
|----------|-------|
| Tag | `GETDIV` |
| Routine | `ORECS01` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orecs01-getdiv`

---

### `OREVNTX1 TYPEXT`

| Property | Value |
|----------|-------|
| Tag | `TYPEXT` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-typext`

---

### `ORWORR RGET`

| Property | Value |
|----------|-------|
| Tag | `RGET` |
| Routine | `ORWORR` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orworr-rget`

---

### `OREVNTX1 AUTHMREL`

| Property | Value |
|----------|-------|
| Tag | `AUTHMREL` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-authmrel`

---

### `OREVNTX1 HAVEPRT`

| Property | Value |
|----------|-------|
| Tag | `HAVEPRT` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-haveprt`

---

### `OREVNTX1 CMEVTS`

| Property | Value |
|----------|-------|
| Tag | `CMEVTS` |
| Routine | `OREVNTX1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-cmevts`

---

### `OREVNTX1 ODPTEVID`

| Property | Value |
|----------|-------|
| Tag | `ODPTEVID` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-odptevid`

---

### `ORWOR PKISITE`

| Property | Value |
|----------|-------|
| Tag | `PKISITE` |
| Routine | `ORWOR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwor-pkisite`

---

### `OREVNTX1 COMP`

| Property | Value |
|----------|-------|
| Tag | `COMP` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-comp`

---

### `OREVNTX1 ISHDORD`

| Property | Value |
|----------|-------|
| Tag | `ISHDORD` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-ishdord`

---

### `OREVNTX1 ISPASS`

| Property | Value |
|----------|-------|
| Tag | `ISPASS` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-ispass`

---

### `OREVNTX1 ISPASS1`

| Property | Value |
|----------|-------|
| Tag | `ISPASS1` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-ispass1`

---

### `OREVNTX1 DLGIEN`

| Property | Value |
|----------|-------|
| Tag | `DLGIEN` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-dlgien`

---

### `ORWOR1 SETDTEXT`

| Property | Value |
|----------|-------|
| Tag | `SETDTEXT` |
| Routine | `ORWOR1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Sets/updates the external text of an order. The updated text is also returned.

**API Endpoint:** `GET /vista/or/rpc/orwor1-setdtext`

---

### `ORWOR1 GETDEA`

| Property | Value |
|----------|-------|
| Tag | `GETDEA` |
| Routine | `ORWOR1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns a users DEA number.

**API Endpoint:** `GET /vista/or/rpc/orwor1-getdea`

---

### `ORWOR1 GETDSCH`

| Property | Value |
|----------|-------|
| Tag | `GETDSCH` |
| Routine | `ORWOR1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the schedule of the drug.

**API Endpoint:** `GET /vista/or/rpc/orwor1-getdsch`

---

### `ORWCH LDFONT`

| Property | Value |
|----------|-------|
| Tag | `LDFONT` |
| Routine | `ORWCH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwch-ldfont`

---

### `ORQQCN UNRESOLVED`

| Property | Value |
|----------|-------|
| Tag | `UNRSLVD` |
| Routine | `ORQQCN2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Returns 1 if current user has unresolved consults for current patient, 0  if not.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-unresolved`

---

### `ORWU1 NAMECVT`

| Property | Value |
|----------|-------|
| Tag | `NAMECVT` |
| Routine | `ORWU1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwu1-namecvt`

---

### `ORWDPS5 LESGRP`

| Property | Value |
|----------|-------|
| Tag | `LESGRP` |
| Routine | `ORWDPS5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps5-lesgrp`

---

### `ORWDPS5 LESAPI`

| Property | Value |
|----------|-------|
| Tag | `LESAPI` |
| Routine | `ORWDPS5` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps5-lesapi`

---

### `ORWDXR ORCPLX`

| Property | Value |
|----------|-------|
| Tag | `ORCPLX` |
| Routine | `ORWDXR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxr-orcplx`

---

### `ORWDXR CANRN`

| Property | Value |
|----------|-------|
| Tag | `CANRN` |
| Routine | `ORWDXR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxr-canrn`

---

### `ORWDXR ISCPLX`

| Property | Value |
|----------|-------|
| Tag | `ISCPLX` |
| Routine | `ORWDXR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxr-iscplx`

---

### `ORWDXA OFCPLX`

| Property | Value |
|----------|-------|
| Tag | `OFCPLX` |
| Routine | `ORWDXA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxa-ofcplx`

---

### `ORWDPS1 IVDEA`

| Property | Value |
|----------|-------|
| Tag | `FDEA1` |
| Routine | `ORWDPS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps1-ivdea`

---

### `ORWDXR ISNOW`

| Property | Value |
|----------|-------|
| Tag | `ISNOW` |
| Routine | `ORWDXR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxr-isnow`

---

### `ORRHCQ QRYITR`

| Property | Value |
|----------|-------|
| Tag | `QRYITR` |
| Routine | `ORRHCQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Executes the query for a patient.  An iterator is passed in, in the  format:     ListSource Subscript ^ DFN ^ Item#   The value returned includes the records found and the next iterator:     PtSearched ^ RecordCount ^ ListSource Subscript ^ NextDFN ^ Next Item#

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORRITR | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcq-qryitr`

---

### `ORWU DEFAULT DIVISION`

| Property | Value |
|----------|-------|
| Tag | `DEFDIV` |
| Routine | `ORWU1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns True or False for a user depending on default division  information.

**API Endpoint:** `GET /vista/or/rpc/orwu-default-division`

---

### `OREVNTX1 GETSTS`

| Property | Value |
|----------|-------|
| Tag | `GETSTS` |
| Routine | `OREVNTX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orevntx1-getsts`

---

### `ORWDXA ISACTOI`

| Property | Value |
|----------|-------|
| Tag | `ISACTOI` |
| Routine | `ORWDXA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxa-isactoi`

---

### `ORECS01 SAVPATH`

| Property | Value |
|----------|-------|
| Tag | `SAVPATH` |
| Routine | `ORECS01` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orecs01-savpath`

---

### `ORPRF HASFLG`

| Property | Value |
|----------|-------|
| Tag | `HASFLG` |
| Routine | `ORPRF` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orprf-hasflg`

---

### `ORWPCE ACTIVE CODE`

| Property | Value |
|----------|-------|
| Tag | `CODACTIV` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpce-active-code`

---

### `ORPRF GETFLG`

| Property | Value |
|----------|-------|
| Tag | `GETFLG` |
| Routine | `ORPRF` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orprf-getflg`

---

### `ORPRF CLEAR`

| Property | Value |
|----------|-------|
| Tag | `CLEAR` |
| Routine | `ORPRF` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orprf-clear`

---

### `ORWU1 NEWLOC`

| Property | Value |
|----------|-------|
| Tag | `NEWLOC` |
| Routine | `ORWU1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns a list of Clinics, Wards, and "Other" category entries from the  HOSPITAL LOCATION (#44) file.

**API Endpoint:** `GET /vista/or/rpc/orwu1-newloc`

---

### `ORQQPXRM WOMEN HEALTH SAVE`

| Property | Value |
|----------|-------|
| Tag | `WH` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Pass back data to be file in the Women's Health Package file 790.1.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | WH RESULT | REFERENCE | No |

**API Endpoint:** `POST /vista/or/rpc/orqqpxrm-women-health-save`

---

### `ORRHCR RPTLST`

| Property | Value |
|----------|-------|
| Tag | `RPTLST` |
| Routine | `ORRHCR` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the list of reports that are available to a specific user.

**API Endpoint:** `GET /vista/or/rpc/orrhcr-rptlst`

---

### `ORRHCR RPTDEF`

| Property | Value |
|----------|-------|
| Tag | `RPTDEF` |
| Routine | `ORRHCR` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the name-value pairs the represent the definition of a report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RPTID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcr-rptdef`

---

### `ORRHCU ID2EXT`

| Property | Value |
|----------|-------|
| Tag | `ID2EXT` |
| Routine | `ORRHCU` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the external name of an entry given the internal number.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FNumber | LITERAL | No |
| 2 | IDLST | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcu-id2ext`

---

### `ORRHCO OISETS`

| Property | Value |
|----------|-------|
| Tag | `OISETS` |
| Routine | `ORRHCO` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the list of sets available for listing orderable items.

**API Endpoint:** `GET /vista/or/rpc/orrhco-oisets`

---

### `ORRHCO ORDITM`

| Property | Value |
|----------|-------|
| Tag | `ORDITM` |
| Routine | `ORRHCO` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns a subset of orderable items for use in a long list box.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FROM | LITERAL | No |
| 2 | DIR | LITERAL | No |
| 3 | XREF | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhco-orditm`

---

### `ORRHCT DOCCLS`

| Property | Value |
|----------|-------|
| Tag | `DOCCLS` |
| Routine | `ORRHCT` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of document classes.

**API Endpoint:** `GET /vista/or/rpc/orrhct-doccls`

---

### `ORRHCO ORDSTS`

| Property | Value |
|----------|-------|
| Tag | `ORDSTS` |
| Routine | `ORRHCO` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of order statuses

**API Endpoint:** `GET /vista/or/rpc/orrhco-ordsts`

---

### `ORRHCO SIGNSTS`

| Property | Value |
|----------|-------|
| Tag | `SIGNSTS` |
| Routine | `ORRHCO` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of signature statuses

**API Endpoint:** `GET /vista/or/rpc/orrhco-signsts`

---

### `ORRHCT DOCSTS`

| Property | Value |
|----------|-------|
| Tag | `DOCSTS` |
| Routine | `ORRHCT` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of document statuses.

**API Endpoint:** `GET /vista/or/rpc/orrhct-docsts`

---

### `ORRHCU BYREG`

| Property | Value |
|----------|-------|
| Tag | `BYREG` |
| Routine | `ORRHCU` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of patients listed in a patient registry.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NAM | LITERAL | No |
| 2 | MOD | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcu-byreg`

---

### `ORRHCR USRRPT`

| Property | Value |
|----------|-------|
| Tag | `USRRPT` |
| Routine | `ORRHCR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the IEN of an entry in CPRS QUERY DEFINITION given the display text of the entry.  The entry must be a user-owned report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DTX | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcr-usrrpt`

---

### `ORRHCR SAVDEF`

| Property | Value |
|----------|-------|
| Tag | `SAVDEF` |
| Routine | `ORRHCR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Accepts a set of name-value pairs that describe a newly created custom report.  This creates a new entry in CPRS QUERY DEFINITION.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DEF | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcr-savdef`

---

### `ORRHCU DFLDS`

| Property | Value |
|----------|-------|
| Tag | `DFLDS` |
| Routine | `ORRHCU` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of name-value pairs that represent the display fields that are available based on the search items selected.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TYP | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcu-dflds`

---

### `ORRHCQ SETUP`

| Property | Value |
|----------|-------|
| Tag | `SETUP` |
| Routine | `ORRHCQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Sets up in ^TMP("ORRHCQ",$J) the parameters and constraints that will be used for the query.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | QRY | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcq-setup`

---

### `ORRHCQ SORTBY`

| Property | Value |
|----------|-------|
| Tag | `SORTBY` |
| Routine | `ORRHCQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Causes the query results that are in ^TMP("ORRHCQD",$J) to be sorted on a particular column.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FNM | LITERAL | No |
| 2 | FWD | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcq-sortby`

---

### `ORRHCQ SUBDTA`

| Property | Value |
|----------|-------|
| Tag | `SUBDTA` |
| Routine | `ORRHCQ` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns name-value pairs that represent columns for a subset of records. The list view in the GUI posts an event for which records it needs to display.  This call obtains the data for those records.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FIRST | LITERAL | No |
| 2 | LAST | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcq-subdta`

---

### `ORRHCQ DETAIL`

| Property | Value |
|----------|-------|
| Tag | `DETAIL` |
| Routine | `ORRHCQ` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the text to display for the details of an order.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IDentifier | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcq-detail`

---

### `ORRHCQ PTINFO`

| Property | Value |
|----------|-------|
| Tag | `PTINFO` |
| Routine | `ORRHCQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns patient identifying information to display in the bar above the detailed display.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IDentifier | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcq-ptinfo`

---

### `ORRHCR OWNED`

| Property | Value |
|----------|-------|
| Tag | `OWNED` |
| Routine | `ORRHCR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns true if the current user owns this report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RPT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcr-owned`

---

### `ORRHCR DELETE`

| Property | Value |
|----------|-------|
| Tag | `DELETE` |
| Routine | `ORRHCR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Deletes a user-owned report

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DA number | LITERAL | No |

**API Endpoint:** `POST /vista/or/rpc/orrhcr-delete`

---

### `ORRHCU COLTYP`

| Property | Value |
|----------|-------|
| Tag | `COLTYP` |
| Routine | `ORRHCU` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the sort types for the list of columns passed in.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SRC | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcu-coltyp`

---

### `ORRHCQ CLEAR`

| Property | Value |
|----------|-------|
| Tag | `CLEAR` |
| Routine | `ORRHCQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Cancels the query and cleans up the TMP globals.

**API Endpoint:** `GET /vista/or/rpc/orrhcq-clear`

---

### `ORRHCU REGLST`

| Property | Value |
|----------|-------|
| Tag | `REGLST` |
| Routine | `ORRHCU` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of patient registries.

**API Endpoint:** `GET /vista/or/rpc/orrhcu-reglst`

---

### `ORRHCU REGNAM`

| Property | Value |
|----------|-------|
| Tag | `REGNAM` |
| Routine | `ORRHCU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the full name of a registry given the abbreviated name.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IDentifier | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcu-regnam`

---

### `ORRHCR CTPLST`

| Property | Value |
|----------|-------|
| Tag | `CTPLST` |
| Routine | `ORRHCR` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of all criteria that are available as query constraints and the parent search items each criterion is associated with.

**API Endpoint:** `GET /vista/or/rpc/orrhcr-ctplst`

---

### `ORRHCR TAGDEF`

| Property | Value |
|----------|-------|
| Tag | `TAGDEF` |
| Routine | `ORRHCR` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Obtains a query definition based on the value of the TAG field.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TAG | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcr-tagdef`

---

### `ORRHCO ABSTRT`

| Property | Value |
|----------|-------|
| Tag | `ABSTRT` |
| Routine | `ORRHCO` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orrhco-abstrt`

---

### `ORRHCQ RNGFM`

| Property | Value |
|----------|-------|
| Tag | `RNGFM` |
| Routine | `ORRHCQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orrhcq-rngfm`

---

### `ORRHCR GENRPT`

| Property | Value |
|----------|-------|
| Tag | `GENRPT` |
| Routine | `ORRHCR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orrhcr-genrpt`

---

### `ORRHCO CSLTGRP`

| Property | Value |
|----------|-------|
| Tag | `CGRP` |
| Routine | `ORRHCO` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orrhco-csltgrp`

---

### `ORRC AUTHENTICATE`

| Property | Value |
|----------|-------|
| Tag | `AUTHNTC` |
| Routine | `ORRZAUTH` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This call is currently in use as an abstraction around a general  interface for authentication. It accepts the ACCESS and VERIFY codes for  the current user and returns a userIdTable and a rolesTable.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ACCESS | LITERAL | No |
| 2 | VERIFY | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrc-authenticate`

---

### `ORWTPD GETOCM`

| Property | Value |
|----------|-------|
| Tag | `GETOCM` |
| Routine | `ORWTPD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpd-getocm`

---

### `ORWTPD PUTOCM`

| Property | Value |
|----------|-------|
| Tag | `PUTOCM` |
| Routine | `ORWTPD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpd-putocm`

---

### `ORB FORWARD ALERT`

| Property | Value |
|----------|-------|
| Tag | `FWD` |
| Routine | `ORB31` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** The rpc forwards an alert.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XQAID | LITERAL | No |
| 2 | RECIPIENT | LITERAL | No |
| 3 | TYPE | LITERAL | No |
| 4 | COMMENT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orb-forward-alert`

---

### `ORB RENEW ALERT`

| Property | Value |
|----------|-------|
| Tag | `RENEW` |
| Routine | `ORB31` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This rpc renews an alert.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | XQAID | LITERAL | No |

**API Endpoint:** `POST /vista/or/rpc/orb-renew-alert`

---

### `ORRCQLPT PTDFN`

| Property | Value |
|----------|-------|
| Tag | `PTDFN` |
| Routine | `ORRCQLPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** RETURNS THE DFN GIVEN A REPORT LINE IDENTIFIER

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | OID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrcqlpt-ptdfn`

---

### `ORRCQLPT PTDEMOS`

| Property | Value |
|----------|-------|
| Tag | `PTDEMOS` |
| Routine | `ORRCQLPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Returns patient demographics info in the form: <dfn>^<name>^<ssn>^<dob>^<age>

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrcqlpt-ptdemos`

---

### `ORQQPXRM GET WH REPORT TEXT`

| Property | Value |
|----------|-------|
| Tag | `WHREPORT` |
| Routine | `ORQQPXRM` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the Radiology/Lab Report for a WH Procedure

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-get-wh-report-text`

---

### `ORRHCQ1 GETCNT`

| Property | Value |
|----------|-------|
| Tag | `GETCNT` |
| Routine | `ORRHCQ1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the count of sensitive patients left to evaluate after a main query iteration run.

**API Endpoint:** `GET /vista/or/rpc/orrhcq1-getcnt`

---

### `ORRHCQ1 QRYSITR`

| Property | Value |
|----------|-------|
| Tag | `QRYSITR` |
| Routine | `ORRHCQ1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Similar to the main query iterator routine, except does not process the patients marked as sensitive, and saves them off without screening them.  Subsequent routines are called to manage the list and process those selected for reporting.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ITERATOR | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcq1-qrysitr`

---

### `ORRHCQ1 QSITR`

| Property | Value |
|----------|-------|
| Tag | `QSITR` |
| Routine | `ORRHCQ1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Iterates through sensitive patients identified in a query tool report. Screens patients based on report criteria, and reports sensitive patients as necessary.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Iterator | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcq1-qsitr`

---

### `ORRHCQ1 GETSPT`

| Property | Value |
|----------|-------|
| Tag | `GETSPT` |
| Routine | `ORRHCQ1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Gets sensitive patients from a query tool cohort, where the patients have not yet been screened.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Start | LITERAL | No |
| 2 | Length | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcq1-getspt`

---

### `ORRHCQ1 GETSLN`

| Property | Value |
|----------|-------|
| Tag | `GETSLN` |
| Routine | `ORRHCQ1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** When a query executes, the sensitive patients are saved off before they are evaluated, along with the sensitive information gathered from the routine PTSEC^DGSEC4.  This RPC returns the sensitive message text for the given patient when this query attempted to query their record.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcq1-getsln`

---

### `ORRHCQ1 DELSEN`

| Property | Value |
|----------|-------|
| Tag | `DELSEN` |
| Routine | `ORRHCQ1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Deletes the sensitive patient from the sensitive patient list generated for the currently executing query.  No further evaluation of the  patients record will take place.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orrhcq1-delsen`

---

### `ORRHCU DFLDMAP`

| Property | Value |
|----------|-------|
| Tag | `DFLDMAP` |
| Routine | `ORRHCU` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a mapping from criteria categories to display field categories

**API Endpoint:** `GET /vista/or/rpc/orrhcu-dfldmap`

---

### `ORIMO IMOLOC`

| Property | Value |
|----------|-------|
| Tag | `IMOLOC` |
| Routine | `ORIMO` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/or/rpc/orimo-imoloc`

---

### `ORIMO IMOOD`

| Property | Value |
|----------|-------|
| Tag | `IMOOD` |
| Routine | `ORIMO` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orimo-imood`

---

### `ORWDPS4 IPOD4OP`

| Property | Value |
|----------|-------|
| Tag | `IPOD4OP` |
| Routine | `ORWDPS4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps4-ipod4op`

---

### `ORWDPS4 UPDTDG`

| Property | Value |
|----------|-------|
| Tag | `UPDTDG` |
| Routine | `ORWDPS4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps4-updtdg`

---

### `ORWOR ACTION TEXT`

| Property | Value |
|----------|-------|
| Tag | `ACTXT` |
| Routine | `ORWOR` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwor-action-text`

---

### `ORQQPXRM GEC DIALOG`

| Property | Value |
|----------|-------|
| Tag | `GEC` |
| Routine | `ORQQPXRM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will evaluate the Reminder Dialogs as the Finish button is click for the GEC Project. THis RPC will return an error messages if the four GEC Reminder Dialogs are done out of order.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | Visit | LITERAL | No |
| 4 | NOTEIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-gec-dialog`

---

### `ORWDXR01 CANCHG`

| Property | Value |
|----------|-------|
| Tag | `CANCHG` |
| Routine | `ORWDXR01` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxr01-canchg`

---

### `ORWDXR01 SAVCHG`

| Property | Value |
|----------|-------|
| Tag | `SAVCHG` |
| Routine | `ORWDXR01` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxr01-savchg`

---

### `ORQQPXRM GEC FINISHED?`

| Property | Value |
|----------|-------|
| Tag | `GECF` |
| Routine | `ORQQPXRM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC pass a boolean value to PXRMGECU

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | FIN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-gec-finished?`

---

### `ORQQPXRM CHECK REM VERSION`

| Property | Value |
|----------|-------|
| Tag | `REMVER` |
| Routine | `ORQQPXRM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-check-rem-version`

---

### `ORQQPXRM GEC STATUS PROMPT`

| Property | Value |
|----------|-------|
| Tag | `GECP` |
| Routine | `ORQQPXRM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This remote procedure will return the text value to display in CPRS of the  status of the current GEC Referral.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-gec-status-prompt`

---

### `ORWDXM3 ISUDQO`

| Property | Value |
|----------|-------|
| Tag | `ISUDQO` |
| Routine | `ORWDXM3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxm3-isudqo`

---

### `ORWPS REASON`

| Property | Value |
|----------|-------|
| Tag | `REASON` |
| Routine | `ORWPS` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns list of Statement/Reasons for Non-VA medication orders.

**API Endpoint:** `GET /vista/or/rpc/orwps-reason`

---

### `ORWDPS5 ISVTP`

| Property | Value |
|----------|-------|
| Tag | `ISVTP` |
| Routine | `ORWDPS5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps5-isvtp`

---

### `ORWDBA1 ORPKGTYP`

| Property | Value |
|----------|-------|
| Tag | `ORPKGTYP` |
| Routine | `ORWDBA1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Array of Order Package Types

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORLST | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwdba1-orpkgtyp`

---

### `ORWDBA1 RCVORCI`

| Property | Value |
|----------|-------|
| Tag | `RCVORCI` |
| Routine | `ORWDBA1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Receive Order Entry Billing Aware data from CPRS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIAG | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwdba1-rcvorci`

---

### `ORWDAL32 SEND BULLETIN`

| Property | Value |
|----------|-------|
| Tag | `SENDBULL` |
| Routine | `ORWDAL32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdal32-send-bulletin`

---

### `ORWDXR01 ISSPLY`

| Property | Value |
|----------|-------|
| Tag | `ISSPLY` |
| Routine | `ORWDXR01` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxr01-issply`

---

### `ORWDBA1 SCLST`

| Property | Value |
|----------|-------|
| Tag | `SCLST` |
| Routine | `ORWDBA1` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Array of Order ID's and SC.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | ORLST | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwdba1-sclst`

---

### `ORWDXR01 OXDATA`

| Property | Value |
|----------|-------|
| Tag | `OXDATA` |
| Routine | `ORWDXR01` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxr01-oxdata`

---

### `ORWDBA1 BASTATUS`

| Property | Value |
|----------|-------|
| Tag | `BASTATUS` |
| Routine | `ORWDBA1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Billing Awareness RPC. Returns 0 if BA functionality is off or 1 if BA functionality is on.

**API Endpoint:** `GET /vista/or/rpc/orwdba1-bastatus`

---

### `ORWORB SETSORT`

| Property | Value |
|----------|-------|
| Tag | `SETSORT` |
| Routine | `ORWORB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Sets the GUI alert sort method for the user.  This is set when a user  clicks on the GUI alert columns to change the display sorting.

**API Endpoint:** `GET /vista/or/rpc/orworb-setsort`

---

### `ORWORB GETSORT`

| Property | Value |
|----------|-------|
| Tag | `GETSORT` |
| Routine | `ORWORB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the method for sorting GUI alert display.

**API Endpoint:** `GET /vista/or/rpc/orworb-getsort`

---

### `ORWOR EXPIRED`

| Property | Value |
|----------|-------|
| Tag | `EXPIRED` |
| Routine | `ORWOR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the Fileman Date/Time to begin searching for expired orders.

**API Endpoint:** `GET /vista/or/rpc/orwor-expired`

---

### `ORPRF HASCAT1`

| Property | Value |
|----------|-------|
| Tag | `HASCAT1` |
| Routine | `ORPRF` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orprf-hascat1`

---

### `ORWDPS32 AUTHNVA`

| Property | Value |
|----------|-------|
| Tag | `AUTHNVA` |
| Routine | `ORWDPS32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Checks restrictions for entering non-VA meds.  If no restrictions, a 0 is returned.  If there is a restriction, it is returned in the format: 1^restriction text

**API Endpoint:** `GET /vista/or/rpc/orwdps32-authnva`

---

### `ORWGN GNLOC`

| Property | Value |
|----------|-------|
| Tag | `GNLOC` |
| Routine | `ORWGN` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgn-gnloc`

---

### `ORWGN AUTHUSR`

| Property | Value |
|----------|-------|
| Tag | `AUTHUSR` |
| Routine | `ORWGN` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgn-authusr`

---

### `ORRC SYSID`

| Property | Value |
|----------|-------|
| Tag | `SYS` |
| Routine | `ORRCLNP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the system identifier as a prodcution system or not.

**API Endpoint:** `GET /vista/or/rpc/orrc-sysid`

---

### `ORWDAL32 LOAD FOR EDIT`

| Property | Value |
|----------|-------|
| Tag | `EDITLOAD` |
| Routine | `ORWDAL32` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdal32-load-for-edit`

---

### `ORWDAL32 SAVE ALLERGY`

| Property | Value |
|----------|-------|
| Tag | `EDITSAVE` |
| Routine | `ORWDAL32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/or/rpc/orwdal32-save-allergy`

---

### `ORWDPS4 ISUDIV`

| Property | Value |
|----------|-------|
| Tag | `ISUDIV` |
| Routine | `ORWDPS4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps4-isudiv`

---

### `ORWPCE CXNOSHOW`

| Property | Value |
|----------|-------|
| Tag | `CXNOSHOW` |
| Routine | `ORWPCE2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpce-cxnoshow`

---

### `ORWDBA2 GETPDL`

| Property | Value |
|----------|-------|
| Tag | `GETPDL` |
| Routine | `ORWDBA2` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns a clinician's personal diagnosis codes.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORCIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdba2-getpdl`

---

### `ORWDBA2 ADDPDL`

| Property | Value |
|----------|-------|
| Tag | `ADDPDL` |
| Routine | `ORWDBA2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** Add a new Clinician's Personal DX List or add new ICD9 codes to an  existing Clinician's Personal DX List. The Personal DX list is stored in  the CPRS Diagnosis Provider file, file # 5000017

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORCIEN | LITERAL | No |
| 2 | ORDXA | WORD-PROCESSING | No |
| 3 | ORDXZ | UNKNOWN() | No |

**API Endpoint:** `GET /vista/or/rpc/orwdba2-addpdl`

---

### `ORWDBA2 DELPDL`

| Property | Value |
|----------|-------|
| Tag | `DELPDL` |
| Routine | `ORWDBA2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Delete a selected diagnosis code from a Clinician's Personal DX List. The  personal dx list is stored in CPRS Diagnosis Provider file, file #  5000017.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORCIEN | LITERAL | No |
| 2 | ORDXA | WORD-PROCESSING | No |

**API Endpoint:** `GET /vista/or/rpc/orwdba2-delpdl`

---

### `ORWDBA2 GETDUDC`

| Property | Value |
|----------|-------|
| Tag | `GETDUDC` |
| Routine | `ORWDBA2` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** This returns a list of unique ICD9 diagnoses codes and their descriptions  on orders placed by a clinician for a patient for today. This will be  used to help in filling out the encounter form.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORCIEN | LITERAL | No |
| 2 | ORPTIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdba2-getdudc`

---

### `ORWDBA1 GETORDX`

| Property | Value |
|----------|-------|
| Tag | `GETORDX` |
| Routine | `ORWDBA1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** ARRAY OF DIAGNOSES ASSOCIATED WITH AN ORDER

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdba1-getordx`

---

### `ORWDBA4 GETBAUSR`

| Property | Value |
|----------|-------|
| Tag | `GETBAUSR` |
| Routine | `ORWDBA4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Gets the value of the Enable Billing Awareness By User parameter. The  value returned will be 1 for Yes, Billing Awareness Enabled, and 0 for  No, Billing Awareness Disabled.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORCIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdba4-getbausr`

---

### `ORWDBA4 GETTFCI`

| Property | Value |
|----------|-------|
| Tag | `GETTFCI` |
| Routine | `ORWDBA4` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORIEN | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwdba4-gettfci`

---

### `ORWDBA3 HINTS`

| Property | Value |
|----------|-------|
| Tag | `HINTS` |
| Routine | `ORWDBA3` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns an array of 'Hints' for Treatment Factors for CPRS CI/BA Project.

**API Endpoint:** `GET /vista/or/rpc/orwdba3-hints`

---

### `ORWDAL32 SITE PARAMS`

| Property | Value |
|----------|-------|
| Tag | `GMRASITE` |
| Routine | `ORWDAL32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdal32-site-params`

---

### `ORWTPD1 GETEFDAT`

| Property | Value |
|----------|-------|
| Tag | `GETEFDAT` |
| Routine | `ORWTPD1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpd1-getefdat`

---

### `ORWTPD1 GETEDATS`

| Property | Value |
|----------|-------|
| Tag | `GETEDATS` |
| Routine | `ORWTPD1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpd1-getedats`

---

### `ORWTPD1 PUTEDATS`

| Property | Value |
|----------|-------|
| Tag | `PUTEDATS` |
| Routine | `ORWTPD1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpd1-putedats`

---

### `ORWTPD1 GETCSDEF`

| Property | Value |
|----------|-------|
| Tag | `GETCSDEF` |
| Routine | `ORWTPD1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpd1-getcsdef`

---

### `ORWTPD1 GETCSRNG`

| Property | Value |
|----------|-------|
| Tag | `GETCSRNG` |
| Routine | `ORWTPD1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpd1-getcsrng`

---

### `ORWTPD1 PUTCSRNG`

| Property | Value |
|----------|-------|
| Tag | `PUTCSRNG` |
| Routine | `ORWTPD1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpd1-putcsrng`

---

### `ORWTPD1 GETEAFL`

| Property | Value |
|----------|-------|
| Tag | `GETEAFL` |
| Routine | `ORWTPD1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpd1-geteafl`

---

### `ORWNSS NSSMSG`

| Property | Value |
|----------|-------|
| Tag | `NSSMSG` |
| Routine | `ORWNSS` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwnss-nssmsg`

---

### `ORWNSS QOSCH`

| Property | Value |
|----------|-------|
| Tag | `QOSCH` |
| Routine | `ORWNSS` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwnss-qosch`

---

### `ORWNSS VALSCH`

| Property | Value |
|----------|-------|
| Tag | `VALSCH` |
| Routine | `ORWNSS` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwnss-valsch`

---

### `ORWNSS CHKSCH`

| Property | Value |
|----------|-------|
| Tag | `CHKSCH` |
| Routine | `ORWNSS` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwnss-chksch`

---

### `ORWTIU CHKTXT`

| Property | Value |
|----------|-------|
| Tag | `CHKTXT` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Check for existence of text in TIU(8925,TIUDA, either in "TEXT" or "TEMP"  nodes, before allowing signature.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORTIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-chktxt`

---

### `ORIMO ISCLOC`

| Property | Value |
|----------|-------|
| Tag | `ISCLOC` |
| Routine | `ORIMO` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orimo-iscloc`

---

### `ORIMO ISIVQO`

| Property | Value |
|----------|-------|
| Tag | `ISIVQO` |
| Routine | `ORIMO` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orimo-isivqo`

---

### `ORWDBA7 GETIEN9`

| Property | Value |
|----------|-------|
| Tag | `GETIEN9` |
| Routine | `ORWDBA7` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Receive external ICD9 number and return IEN

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICD9 | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwdba7-getien9`

---

### `ORWDBA7 ISWITCH`

| Property | Value |
|----------|-------|
| Tag | `ISWITCH` |
| Routine | `ORWDBA7` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** CIDC RPC RETURNS 1 IF PATIENT HAS BILLABLE INSURANCE RETURNS 0 IF PATIENT DOES NOT HAVE BILLABLE INSURANCE

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdba7-iswitch`

---

### `ORVAA VAA`

| Property | Value |
|----------|-------|
| Tag | `VAA` |
| Routine | `ORVAA` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns the policy name for a veteran with VA Advantage. If the veteran  does not have VA Advantage the return value will be 0.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orvaa-vaa`

---

### `ORWDFH OPDIETS`

| Property | Value |
|----------|-------|
| Tag | `OPDIETS` |
| Routine | `ORWDFH` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdfh-opdiets`

---

### `ORWDFH CURRENT MEALS`

| Property | Value |
|----------|-------|
| Tag | `CURMEALS` |
| Routine | `ORWDFH` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdfh-current-meals`

---

### `ORWU VERSION`

| Property | Value |
|----------|-------|
| Tag | `VERSION` |
| Routine | `ORWU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns current version of package or namespace

**API Endpoint:** `GET /vista/or/rpc/orwu-version`

---

### `ORWDXVB GETALL`

| Property | Value |
|----------|-------|
| Tag | `GETALL` |
| Routine | `ORWDXVB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Return patient's Blood Bank information.

**API Endpoint:** `GET /vista/or/rpc/orwdxvb-getall`

---

### `ORWDXVB RAW`

| Property | Value |
|----------|-------|
| Tag | `RAW` |
| Routine | `ORWDXVB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Return raw Lab Test Results associated with Blood Bank order request.

**API Endpoint:** `GET /vista/or/rpc/orwdxvb-raw`

---

### `ORWDXVB RESULTS`

| Property | Value |
|----------|-------|
| Tag | `RESULTS` |
| Routine | `ORWDXVB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Return patient's Lab Test Results associated with Blood Bank order request.

**API Endpoint:** `GET /vista/or/rpc/orwdxvb-results`

---

### `ORWDXVB STATALOW`

| Property | Value |
|----------|-------|
| Tag | `STATALOW` |
| Routine | `ORWDXVB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Check to see if user is allowed to order STAT orders through VBECS. Checks users with parameter: OR VBECS STAT USER

**API Endpoint:** `GET /vista/or/rpc/orwdxvb-statalow`

---

### `ORWDXVB COMPORD`

| Property | Value |
|----------|-------|
| Tag | `COMPORD` |
| Routine | `ORWDXVB` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Get sequence order of Blood Components for selection.

**API Endpoint:** `GET /vista/or/rpc/orwdxvb-compord`

---

### `ORWDFH NFSLOC READY`

| Property | Value |
|----------|-------|
| Tag | `OPLOCOK` |
| Routine | `ORWDFH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Return '1' if hospital location has been entered in NUTRITION LOCATION  file for outpatient meal ordering. Return '0' if not yet entered.

**API Endpoint:** `GET /vista/or/rpc/orwdfh-nfsloc-ready`

---

### `ORWGRPC ALLITEMS`

| Property | Value |
|----------|-------|
| Tag | `ALLITEMS` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-allitems`

---

### `ORWGRPC TYPES`

| Property | Value |
|----------|-------|
| Tag | `TYPES` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-types`

---

### `ORWGRPC ITEMS`

| Property | Value |
|----------|-------|
| Tag | `ITEMS` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-items`

---

### `ORWGRPC CLASS`

| Property | Value |
|----------|-------|
| Tag | `CLASS` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-class`

---

### `ORWGRPC ITEMDATA`

| Property | Value |
|----------|-------|
| Tag | `ITEMDATA` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-itemdata`

---

### `ORWGRPC GETPREF`

| Property | Value |
|----------|-------|
| Tag | `GETPREF` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-getpref`

---

### `ORWGRPC SETPREF`

| Property | Value |
|----------|-------|
| Tag | `SETPREF` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-setpref`

---

### `ORWGRPC GETVIEWS`

| Property | Value |
|----------|-------|
| Tag | `GETVIEWS` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-getviews`

---

### `ORWGRPC SETVIEWS`

| Property | Value |
|----------|-------|
| Tag | `SETVIEWS` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-setviews`

---

### `ORWGRPC DELVIEWS`

| Property | Value |
|----------|-------|
| Tag | `DELVIEWS` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-delviews`

---

### `ORWGRPC TESTSPEC`

| Property | Value |
|----------|-------|
| Tag | `TESTSPEC` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-testspec`

---

### `ORWGRPC LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `LOOKUP` |
| Routine | `ORWGRPC` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-lookup`

---

### `ORWGRPC DATEITEM`

| Property | Value |
|----------|-------|
| Tag | `DATEITEM` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-dateitem`

---

### `ORWPCE1 NONCOUNT`

| Property | Value |
|----------|-------|
| Tag | `NONCOUNT` |
| Routine | `ORWPCE1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Is a given HOSPITAL LOCATION (file 44) a non-count clinic?  (DBIA #964)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORLOC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce1-noncount`

---

### `ORWDAL32 CLINUSER`

| Property | Value |
|----------|-------|
| Tag | `CLINUSER` |
| Routine | `ORWDAL33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Determine if user can perform cover sheet allergy actions.

**API Endpoint:** `GET /vista/or/rpc/orwdal32-clinuser`

---

### `ORWPFSS IS PFSS ACTIVE?`

| Property | Value |
|----------|-------|
| Tag | `PFSSACTV` |
| Routine | `ORWPFSS` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpfss-is-pfss-active?`

---

### `ORWGRPC GETDATES`

| Property | Value |
|----------|-------|
| Tag | `GETDATES` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-getdates`

---

### `ORWGRPC DETAIL`

| Property | Value |
|----------|-------|
| Tag | `DETAIL` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-detail`

---

### `ORWGRPC DETAILS`

| Property | Value |
|----------|-------|
| Tag | `DETAILS` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-details`

---

### `ORWMHV MHV`

| Property | Value |
|----------|-------|
| Tag | `MHV` |
| Routine | `ORWMHV` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | UNKNOWN() | No |

**API Endpoint:** `GET /vista/or/rpc/orwmhv-mhv`

---

### `ORWGRPC PUBLIC`

| Property | Value |
|----------|-------|
| Tag | `PUBLIC` |
| Routine | `ORWGRPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-public`

---

### `ORWGRPC RPTPARAM`

| Property | Value |
|----------|-------|
| Tag | `RPTPARAM` |
| Routine | `ORWGRPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-rptparam`

---

### `ORWCIRN WEBADDR`

| Property | Value |
|----------|-------|
| Tag | `WEBADDR` |
| Routine | `ORWCIRN` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Get VistaWeb Web Address.

**API Endpoint:** `GET /vista/or/rpc/orwcirn-webaddr`

---

### `ORWDX CHANGE`

| Property | Value |
|----------|-------|
| Tag | `CHANGE` |
| Routine | `ORWDX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORCLST | REFERENCE | No |
| 2 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdx-change`

---

### `ORWGRPC TAX`

| Property | Value |
|----------|-------|
| Tag | `TAX` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-tax`

---

### `ORWDX1 PATWARD`

| Property | Value |
|----------|-------|
| Tag | `PATWARD` |
| Routine | `ORWDX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdx1-patward`

---

### `ORWRP4 HDR MODIFY`

| Property | Value |
|----------|-------|
| Tag | `HDR` |
| Routine | `ORWRP4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC looks at data returned from the HDR and makes any modifications necessary to make the data compatible with CPRS Reports.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HANDLE | LITERAL | No |
| 2 | ID  | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwrp4-hdr-modify`

---

### `ORWDX1 STCHANGE`

| Property | Value |
|----------|-------|
| Tag | `STCHANGE` |
| Routine | `ORWDX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | ORYARR | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwdx1-stchange`

---

### `ORQQPXRM MHV`

| Property | Value |
|----------|-------|
| Tag | `MHV` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | NAME | LITERAL | No |
| 3 | ANS | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-mhv`

---

### `ORWDX1 DCREN`

| Property | Value |
|----------|-------|
| Tag | `DCREN` |
| Routine | `ORWDX1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORYARR | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwdx1-dcren`

---

### `ORWGRPC GETSIZE`

| Property | Value |
|----------|-------|
| Tag | `GETSIZE` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-getsize`

---

### `ORWGRPC SETSIZE`

| Property | Value |
|----------|-------|
| Tag | `SETSIZE` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-setsize`

---

### `ORWCIRN AUTORDV`

| Property | Value |
|----------|-------|
| Tag | `AUTORDV` |
| Routine | `ORWCIRN` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Get parameter value for ORWRP CIRN AUTOMATIC.

**API Endpoint:** `GET /vista/or/rpc/orwcirn-autordv`

---

### `ORPRF TRIGGER POPUP`

| Property | Value |
|----------|-------|
| Tag | `TRIGRPOP` |
| Routine | `ORPRF` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Returns 1 if popup flag display should be triggered for given patient upon patient selection. If not, returns 0. Does not require clean-up after calling it since it does not set arrays or globals.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PTDFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orprf-trigger-popup`

---

### `ORWCIRN HDRON`

| Property | Value |
|----------|-------|
| Tag | `HDRON` |
| Routine | `ORWCIRN` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Get parameter value for ORWRP HDR ON

**API Endpoint:** `GET /vista/or/rpc/orwcirn-hdron`

---

### `ANRV PROBLEM LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORQQPL` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STATUS | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/anrv-problem-list`

---

### `ORWDX2 DCREASON`

| Property | Value |
|----------|-------|
| Tag | `DCREASON` |
| Routine | `ORWDX2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** RPC to return a list of valid discontinuation reasons.

**API Endpoint:** `GET /vista/or/rpc/orwdx2-dcreason`

---

### `ORWDX1 DCORIG`

| Property | Value |
|----------|-------|
| Tag | `DCORIG` |
| Routine | `ORWDX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdx1-dcorig`

---

### `ORWDX1 UNDCORIG`

| Property | Value |
|----------|-------|
| Tag | `UNDCORIG` |
| Routine | `ORWDX1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORYARR | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwdx1-undcorig`

---

### `ORCDLR2 CHECK ONE LC TO WC`

| Property | Value |
|----------|-------|
| Tag | `KIDS` |
| Routine | `ORCDLR2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orcdlr2-check-one-lc-to-wc`

---

### `ORCDLR2 CHECK ALL LC TO WC`

| Property | Value |
|----------|-------|
| Tag | `GUI` |
| Routine | `ORCDLR2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orcdlr2-check-all-lc-to-wc`

---

### `ORALWORD ALLWORD`

| Property | Value |
|----------|-------|
| Tag | `ALLWORD` |
| Routine | `ORALWORD` |
| Return Type | ARRAY |
| Parameter Count | 4 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | OROI | LITERAL | No |
| 3 | ORX | LITERAL | No |
| 4 | ORTYPE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oralword-allword`

---

### `ORWDX1 ORDMATCH`

| Property | Value |
|----------|-------|
| Tag | `ORDMATCH` |
| Routine | `ORWDX1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC will accept a list of orders and each order status, if one of  the order does not have a status it will return a false value.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | ORYARR | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwdx1-ordmatch`

---

### `ORWDXVB SUBCHK`

| Property | Value |
|----------|-------|
| Tag | `SUBCHK` |
| Routine | `ORWDXVB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Check to see if selected test is a Blood Component or a Diagnostic Test.

**API Endpoint:** `GET /vista/or/rpc/orwdxvb-subchk`

---

### `ORDDPAPI ADMTIME`

| Property | Value |
|----------|-------|
| Tag | `ADMTIME` |
| Routine | `ORDDPAPI` |
| Return Type | WORD PROCESSING |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orddpapi-admtime`

---

### `ORWU PARAMS`

| Property | Value |
|----------|-------|
| Tag | `PARAMS` |
| Routine | `ORWU` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Simple call to return a list of parameter values such as:           INST1^VALUE1         INST2^VALUE2         ...         INSTN^VALUEN   The call assumes the current user, 'defaultable' entities and multiple  instances.

**API Endpoint:** `GET /vista/or/rpc/orwu-params`

---

### `ORWDPS1 DOWSCH`

| Property | Value |
|----------|-------|
| Tag | `DOWSCH` |
| Routine | `ORWDPS1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns a list of schedule that have a frequency defined and the  frequency is less then or equal to 1440 minutes

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | LOCIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdps1-dowsch`

---

### `ORDDPAPI CLOZMSG`

| Property | Value |
|----------|-------|
| Tag | `CLOZMSG` |
| Routine | `ORDDPAPI` |
| Return Type | WORD PROCESSING |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orddpapi-clozmsg`

---

### `ORWDPS33 COMPLOC`

| Property | Value |
|----------|-------|
| Tag | `COMPLOC` |
| Routine | `ORWDPS33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC will return a 0 if the patient location is the same location as  the original order. It will return a 1 if the location is different.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORID | LITERAL | No |
| 2 | LOC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdps33-comploc`

---

### `ORWGRPC FASTITEM`

| Property | Value |
|----------|-------|
| Tag | `FASTITEM` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-fastitem`

---

### `ORWGRPC FASTDATA`

| Property | Value |
|----------|-------|
| Tag | `FASTDATA` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-fastdata`

---

### `ORWGRPC FASTTASK`

| Property | Value |
|----------|-------|
| Tag | `FASTTASK` |
| Routine | `ORWGRPC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-fasttask`

---

### `ORWGRPC FASTLABS`

| Property | Value |
|----------|-------|
| Tag | `FASTLABS` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-fastlabs`

---

### `ORWDPS1 QOMEDALT`

| Property | Value |
|----------|-------|
| Tag | `QOMEDALT` |
| Routine | `ORWDPS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ODIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdps1-qomedalt`

---

### `ORWGRPC ALLVIEWS`

| Property | Value |
|----------|-------|
| Tag | `ALLVIEWS` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-allviews`

---

### `ORWGRPC TESTING`

| Property | Value |
|----------|-------|
| Tag | `TESTING` |
| Routine | `ORWGRPC` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwgrpc-testing`

---

### `ORQQPXRM MHDLL`

| Property | Value |
|----------|-------|
| Tag | `MHDLL` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | INPUTS | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-mhdll`

---

### `ORWDLR33 LC TO WC`

| Property | Value |
|----------|-------|
| Tag | `LCTOWC` |
| Routine | `ORWDLR33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCATION | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdlr33-lc-to-wc`

---

### `ORWU2 COSIGNER`

| Property | Value |
|----------|-------|
| Tag | `COSIGNER` |
| Routine | `ORWU2` |
| Return Type | ARRAY |
| Parameter Count | 6 |

**Description:** Returns a set of New Person file entries for use in a long list box. The set is limited to USR PROVIDERS who do not require cosignature.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORDATE | LITERAL | No |
| 2 | ORDIR | LITERAL | No |
| 3 | ORFROM | LITERAL | No |
| 4 | ORTIUTYP | LITERAL | No |
| 5 | ORTIUDA | LITERAL | No |
| 6 | ORSIM | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwu2-cosigner`

---

### `ORWDXVB NURSADMN`

| Property | Value |
|----------|-------|
| Tag | `NURSADMN` |
| Routine | `ORWDXVB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This procedure checks the parameter OR VBECS SUPPRESS NURS ADMIN to see if the Nursing Administration Order prompt/pop-up should be supressed after a VBECS Blood Bank order has been created.

**API Endpoint:** `GET /vista/or/rpc/orwdxvb-nursadmn`

---

### `ORWDPS32 ALLIVRTE`

| Property | Value |
|----------|-------|
| Tag | `ALLIVRTE` |
| Routine | `ORWDPS32` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps32-allivrte`

---

### `ORWDPS33 IVDOSFRM`

| Property | Value |
|----------|-------|
| Tag | `IVDOSFRM` |
| Routine | `ORWDPS33` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORDERIDS | REFERENCE | No |
| 2 | DEFAULTS | LITERAL | No |
| 3 | ALLIV | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdps33-ivdosfrm`

---

### `ORWDXM1 SVRPC`

| Property | Value |
|----------|-------|
| Tag | `SVRPC` |
| Routine | `ORWDXM1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxm1-svrpc`

---

### `ORWDXVB VBTNS`

| Property | Value |
|----------|-------|
| Tag | `VBTNS` |
| Routine | `ORWDXVB` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxvb-vbtns`

---

### `OR GET COMBAT VET`

| Property | Value |
|----------|-------|
| Tag | `CV` |
| Routine | `ORMARKER` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/or/rpc/or-get-combat-vet`

---

### `ORWDX UNLKOTH`

| Property | Value |
|----------|-------|
| Tag | `UNLKOTH` |
| Routine | `ORWDX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdx-unlkoth`

---

### `ORVW FACLIST`

| Property | Value |
|----------|-------|
| Tag | `FACLIST` |
| Routine | `ORVW` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Wrapper for the TFL^VAFCTFU1 routine, which returns all the treating facilities for a given patient DFN.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orvw-faclist`

---

### `ORAM1 COMPTEST`

| Property | Value |
|----------|-------|
| Tag | `COMPTEST` |
| Routine | `ORAM1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Files complications for the current flowsheet entry.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | COMMARR | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/oram1-comptest`

---

### `ORAM1 PTENTER`

| Property | Value |
|----------|-------|
| Tag | `PTENTER` |
| Routine | `ORAM1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Adds a new patient to the Anticoagulation Flowsheet file (#103).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram1-ptenter`

---

### `ORAM1 FLOWTT`

| Property | Value |
|----------|-------|
| Tag | `FLOWTT` |
| Routine | `ORAM1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Retrieves flowsheet data for the current patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram1-flowtt`

---

### `ORAM1 PCGOAL`

| Property | Value |
|----------|-------|
| Tag | `PCGOAL` |
| Routine | `ORAM1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Calculates percent in goal from filed INR entries for Anticoagulation Management patients - can do either Stable or all patients (pass 1 as  second parameter for stable).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | CMPLX | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram1-pcgoal`

---

### `ORAM1 ACDATA`

| Property | Value |
|----------|-------|
| Tag | `ACDATA` |
| Routine | `ORAM1` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Retrieves record header information (e.g., indication for treatment, permissions, risks, goals, etc.) for the current patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | VISITDATE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram1-acdata`

---

### `ORAM1 ADDTOP`

| Property | Value |
|----------|-------|
| Tag | `ADDTOP` |
| Routine | `ORAM1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Files record header information for the current patient and care episode.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TOPARR | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/oram1-addtop`

---

### `ORAM1 LOCK`

| Property | Value |
|----------|-------|
| Tag | `LOCK` |
| Routine | `ORAM1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Sets lock in Anticoagulation Flowsheet file (#103) so that only one person can edit a given patient's record at a time.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATA | LITERAL | No |

**API Endpoint:** `POST /vista/or/rpc/oram1-lock`

---

### `ORAM1 LOG`

| Property | Value |
|----------|-------|
| Tag | `LOGIT` |
| Routine | `ORAM1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Updates Anticoagulation Flowsheet file (#103) and adds log entry.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FSARRAY | REFERENCE | No |
| 2 | COMP | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram1-log`

---

### `ORAM1 OUTINR`

| Property | Value |
|----------|-------|
| Tag | `OUTINR` |
| Routine | `ORAM1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Receives outside INR values and returns value^date (in $H format) for  graphing.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INRSTRING | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram1-outinr`

---

### `ORAM1 PTCHECK`

| Property | Value |
|----------|-------|
| Tag | `PTCHECK` |
| Routine | `ORAM1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Boolean RPC. Checks to see if patient is in Anticoagulation Flowsheet file (#103).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram1-ptcheck`

---

### `ORAM1 GETPT`

| Property | Value |
|----------|-------|
| Tag | `GETPT` |
| Routine | `ORAM1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns list of patients from Anticoagulation Flowsheet file (#103).

**API Endpoint:** `GET /vista/or/rpc/oram1-getpt`

---

### `ORAM1 TERASE`

| Property | Value |
|----------|-------|
| Tag | `TERASE` |
| Routine | `ORAM1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Removes a patient from the Anticoagulation Team List.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | COMP | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram1-terase`

---

### `ORAM1 UNLOCK`

| Property | Value |
|----------|-------|
| Tag | `UNLOCK` |
| Routine | `ORAM1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Unlocks a patient's record in the Anticoagulation Flowsheet file (#103).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `POST /vista/or/rpc/oram1-unlock`

---

### `ORAM2 NOACT`

| Property | Value |
|----------|-------|
| Tag | `NOACT` |
| Routine | `ORAM2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Checks Anticoagulation Flowsheet file (#103) for patients not seen within the user-specified number of days.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DAYS | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram2-noact`

---

### `ORAM2 SHOWRATE`

| Property | Value |
|----------|-------|
| Tag | `SHOWRATE` |
| Routine | `ORAM2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns percentage of visits in which the patient was on time or within one day (before or after) scheduled draw date.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram2-showrate`

---

### `ORAM2 PTAPPT`

| Property | Value |
|----------|-------|
| Tag | `PTAPPT` |
| Routine | `ORAM2` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the number of patients scheduled in the Anticoagulation clinic per day for the next 30 days.  Only days with appointments are displayed.

**API Endpoint:** `GET /vista/or/rpc/oram2-ptappt`

---

### `ORAM2 REMIND`

| Property | Value |
|----------|-------|
| Tag | `REMIND` |
| Routine | `ORAM2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Sets date and text for ACM Reminder (can also be set as part of a complete visit entry).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | DATE | LITERAL | No |
| 3 | RTEXT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram2-remind`

---

### `ORAM2 TEAMCHK`

| Property | Value |
|----------|-------|
| Tag | `TEAMCHK` |
| Routine | `ORAM2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Checks list of teams to be sure they are in the OE/RR LIST file (#100.21), and returns the IEN and Clinic Name.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TEAMS | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/oram2-teamchk`

---

### `ORAM2 ALLGOAL`

| Property | Value |
|----------|-------|
| Tag | `ALLGOAL` |
| Routine | `ORAM2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the percentage of patients in the Anticoagulation Flowsheet file (#103) whose last INRs (within the specified number of days) were in-goal.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DAYS | LITERAL | No |
| 2 | CLINIC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram2-allgoal`

---

### `ORAM3 PTADR`

| Property | Value |
|----------|-------|
| Tag | `PTADR` |
| Routine | `ORAM3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Retrieves contact information. Will also check for active temporary  information.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram3-ptadr`

---

### `ORAM3 COMPENT`

| Property | Value |
|----------|-------|
| Tag | `COMPENT` |
| Routine | `ORAM3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** Enters complication note into the Anticoagulation Flowsheet file (#103). Can also be entered as part of a complete visit entry.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | DUZ | LITERAL | No |
| 3 | CCODE | LITERAL | No |
| 4 | CTEXT | LITERAL | No |
| 5 | CDATE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram3-compent`

---

### `ORAM3 PTFONE`

| Property | Value |
|----------|-------|
| Tag | `PTFONE` |
| Routine | `ORAM3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Gets home phone^work phone for the patient in question.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram3-ptfone`

---

### `ORAM CONCOMP`

| Property | Value |
|----------|-------|
| Tag | `CONCOMP` |
| Routine | `ORAM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Receives the Consult Number, the note number and the DUZ; completes the consult with the note.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORAMCNUM | LITERAL | No |
| 2 | ORAMNUM | LITERAL | No |
| 3 | DUZ | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram-concomp`

---

### `ORAMSET GET`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `ORAMSET` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the Anticoagulation Manager parameters for the division which the user is logged into.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CLINICLOC | LITERAL | No |
| 2 | VISITDT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oramset-get`

---

### `ORAM HCT`

| Property | Value |
|----------|-------|
| Tag | `HCT` |
| Routine | `ORAM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the patient's most recent Hematocrit (HCT).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram-hct`

---

### `ORAM INR`

| Property | Value |
|----------|-------|
| Tag | `INR` |
| Routine | `ORAM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns last 6 months of INR values and dates.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram-inr`

---

### `ORAM PATIENT`

| Property | Value |
|----------|-------|
| Tag | `PATIENT` |
| Routine | `ORAM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the requested patient's Name, Gender, SSN, and Inpatient Status.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram-patient`

---

### `ORAM PROVIDER`

| Property | Value |
|----------|-------|
| Tag | `PROVIDER` |
| Routine | `ORAM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns provider DUZ and name.

**API Endpoint:** `GET /vista/or/rpc/oram-provider`

---

### `ORAM SIGCHECK`

| Property | Value |
|----------|-------|
| Tag | `SIGCHECK` |
| Routine | `ORAM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Validates the Electronic Signature Code entered by the user.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ESCODE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram-sigcheck`

---

### `ORAMX CONSULT`

| Property | Value |
|----------|-------|
| Tag | `CONSULT` |
| Routine | `ORAMX` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Send DFN and the name of the Consult Service (from the ORAM CONSULT  REQUEST SERVICE parameter). Returns pending and active consults which meet those criteria.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | CNAME | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oramx-consult`

---

### `ORAMX PCESET`

| Property | Value |
|----------|-------|
| Tag | `PCESET` |
| Routine | `ORAMX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Checks for service connection, etc, for PCE data call or files PCE data.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | DATA1 | LITERAL | No |
| 3 | HOSLOC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oramx-pceset`

---

### `ORAMSET GETCLINS`

| Property | Value |
|----------|-------|
| Tag | `GETCLINS` |
| Routine | `ORAMSET` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC fetches the list of Clinic Names from the configuration of the  Anticoagulation Management Application.

**API Endpoint:** `GET /vista/or/rpc/oramset-getclins`

---

### `ORAM ORDER`

| Property | Value |
|----------|-------|
| Tag | `ORDER` |
| Routine | `ORAM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** This RPC supports placing INR and CBC orders from the Anticoagulator  application.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | ORDOC | LITERAL | No |
| 3 | ORQO | LITERAL | No |
| 4 | ORLOC | LITERAL | No |
| 5 | ORCDT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram-order`

---

### `ORAMSET INDICS`

| Property | Value |
|----------|-------|
| Tag | `INDICS` |
| Routine | `ORAMSET` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This call populates the list of selectable indications for  Anticoagulation therapy.

**API Endpoint:** `GET /vista/or/rpc/oramset-indics`

---

### `ORAM APPTMTCH`

| Property | Value |
|----------|-------|
| Tag | `APPTMTCH` |
| Routine | `ORAM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC supports revision of the appointment match when the user selects  a new Clinic in Anticoagulator.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORAMDFN | LITERAL | No |
| 2 | ORAMCL | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oram-apptmtch`

---

### `ORDEA DEATEXT`

| Property | Value |
|----------|-------|
| Tag | `DEATEXT` |
| Routine | `ORDEA` |
| Return Type | WORD PROCESSING |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the text to show on the signature dialog mandated by DEA for when  a controlled substance order is selected to be signed.

**API Endpoint:** `GET /vista/or/rpc/ordea-deatext`

---

### `ORDEA SIGINFO`

| Property | Value |
|----------|-------|
| Tag | `SIGINFO` |
| Routine | `ORDEA` |
| Return Type | WORD PROCESSING |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** returns the provider/patient info that must be displayed when signing a  controlled substance order(s)

**API Endpoint:** `GET /vista/or/rpc/ordea-siginfo`

---

### `ORDEA CSVALUE`

| Property | Value |
|----------|-------|
| Tag | `CSVALUE` |
| Routine | `ORDEA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/ordea-csvalue`

---

### `ORDEA HASHINFO`

| Property | Value |
|----------|-------|
| Tag | `HASHINFO` |
| Routine | `ORDEA` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/ordea-hashinfo`

---

### `ORDEA ORDHINFO`

| Property | Value |
|----------|-------|
| Tag | `ORDHINFO` |
| Routine | `ORDEA` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/ordea-ordhinfo`

---

### `ORWPCE ICDVER`

| Property | Value |
|----------|-------|
| Tag | `ICDVER` |
| Routine | `ORWPCE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the ICD coding system version to be used for diagnosis look-up, as of a particular date of interest.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORDT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce-icdver`

---

### `ORDEA PINLKCHK`

| Property | Value |
|----------|-------|
| Tag | `PINLKCHK` |
| Routine | `ORDEA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/ordea-pinlkchk`

---

### `ORDEA PINLKSET`

| Property | Value |
|----------|-------|
| Tag | `PINLKSET` |
| Routine | `ORDEA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/ordea-pinlkset`

---

### `ORQQPL4 LEX`

| Property | Value |
|----------|-------|
| Tag | `LEX` |
| Routine | `ORQQPL4` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC supports the Clinical Lexicon Search for Problem List. It will  return an indefinite list of terms that match the user's search string.

**API Endpoint:** `GET /vista/or/rpc/orqqpl4-lex`

---

### `ORDEA PNDHLD`

| Property | Value |
|----------|-------|
| Tag | `PNDHLD` |
| Routine | `ORDEA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/ordea-pndhld`

---

### `ORDEA LNKMSG`

| Property | Value |
|----------|-------|
| Tag | `LNKMSG` |
| Routine | `ORDEA` |
| Return Type | WORD PROCESSING |
| Parameter Count | 0 |

**Description:** Returns the text of the OR DEA PIV LINK MSG parameter.

**API Endpoint:** `GET /vista/or/rpc/ordea-lnkmsg`

---

### `ORWPCE4 LEX`

| Property | Value |
|----------|-------|
| Tag | `LEX` |
| Routine | `ORWPCE4` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns list of coded elements based on lexicon look-up. Introduced with  CPRS v29 to maintain compatibility of older call ORWPCE LEX.

**API Endpoint:** `GET /vista/or/rpc/orwpce4-lex`

---

### `OR NO PATIENT CSLT LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `CSLTNP` |
| Routine | `ORRPCLV` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |

**Description:** This RPC provides the means to look up a list of consults without the  patient being in context.   Filtering is provided by:     Start Date   End Date   Consulting Service   Consult Status   Ordering (sending) Provider   Start and End dates are optional.  The search will be limited to 90 days  by de

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORSDT | LITERAL | No |
| 2 | OREDT | LITERAL | No |
| 3 | ORSERV | LITERAL | No |
| 4 | ORSTATUS | LITERAL | No |
| 5 | ORPROV | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/or-no-patient-cslt-lookup`

---

### `ORWLEX GETI10DX`

| Property | Value |
|----------|-------|
| Tag | `GETI10DX` |
| Routine | `ORWLEX` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This call wraps the Lexicon API $$DIAGSRCH^LEX10CS to satisfy the  requirements of the ICD-10-CM diagnosis search.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORX | LITERAL | No |
| 2 | ORDT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwlex-geti10dx`

---

### `ORWPCE I10IMPDT`

| Property | Value |
|----------|-------|
| Tag | `I10IMPDT` |
| Routine | `ORWPCE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the ICD-10 implementation date in FM Date/Time format.

**API Endpoint:** `GET /vista/or/rpc/orwpce-i10impdt`

---

### `ORWLEX GETFREQ`

| Property | Value |
|----------|-------|
| Tag | `GETFREQ` |
| Routine | `ORWLEX` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This call wraps the Lexicon API $$FREQ^LEXU to satisfy the requirements  of the ICD-10-CM diagnosis search.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORSRCHTX | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwlex-getfreq`

---

### `ORWGN IDTVALID`

| Property | Value |
|----------|-------|
| Tag | `IDTVALID` |
| Routine | `ORWGN` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the implementation date of the coding system passed in

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | CSYS | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwgn-idtvalid`

---

### `ORWGN MAXFRQ`

| Property | Value |
|----------|-------|
| Tag | `MAXFRQ` |
| Routine | `ORWGN` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC checks if the frequency of an ICD-10 search term is than the  maximum allowed ICD-10 return values.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORTRM | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwgn-maxfrq`

---

### `ORWRP1A RADIO`

| Property | Value |
|----------|-------|
| Tag | `RADIO` |
| Routine | `ORWRP1A` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Check to determine the method of selecting Date Ranges on the Reports and Labs Tabs in CPRS.

**API Endpoint:** `GET /vista/or/rpc/orwrp1a-radio`

---

### `ORDEBUG SAVERPCS`

| Property | Value |
|----------|-------|
| Tag | `SAVERPCS` |
| Routine | `ORDEBUG` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Saves RPC log from CPRS to be used for other purposes/debugging problems

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORKEY | LITERAL | No |
| 2 | ORDATA | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/ordebug-saverpcs`

---

### `ORDEBUG SAVEDESC`

| Property | Value |
|----------|-------|
| Tag | `SAVEDESC` |
| Routine | `ORDEBUG` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Saves a user supplied description of why they are saving the RPC log from  CRPS

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORKEY | LITERAL | No |
| 2 | ORDATA | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/ordebug-savedesc`

---

### `ORQQCN GET USER AUTH`

| Property | Value |
|----------|-------|
| Tag | `VALID` |
| Routine | `ORQQCN2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** This RPC returns the update authority of a user for a specific Consult.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | GMRCIEN | LITERAL | No |
| 2 | ORDUZ | LITERAL | No |
| 3 | ORIFC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqcn-get-user-auth`

---

### `ORUTL ISCLORD`

| Property | Value |
|----------|-------|
| Tag | `ISCLORD` |
| Routine | `ORUTL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** returns 1 if the ORIFN passed in is a clinic order, 0 otherwise

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | orifn | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orutl-isclord`

---

### `ORBCMA5 LOCK`

| Property | Value |
|----------|-------|
| Tag | `LOCK` |
| Routine | `ORBCMA5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** Due to issues with LOCKing between the CPRS GUI chart and the  BCMAOrderCom dll, some changes are necessary to how locks are handled  when locking the patient chart.   Using the $J value for the CPRS GUI session, the CPRS GUI will call the  BCMAOrderCom dll and pass in the $J value and this value is

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | ORJOB | LITERAL | No |
| 3 | ORY | LITERAL | No |

**API Endpoint:** `POST /vista/or/rpc/orbcma5-lock`

---

### `ORBCMA5 UNLOCK`

| Property | Value |
|----------|-------|
| Tag | `UNLOCK` |
| Routine | `ORBCMA5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/or/rpc/orbcma5-unlock`

---

### `ORBCMA5 JOB`

| Property | Value |
|----------|-------|
| Tag | `JOB` |
| Routine | `ORBCMA5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Due to issues with LOCKing between the CPRS GUI chart and the  BCMAOrderCom dll, some changes are necessary to how locks are handled  when locking the patient chart.   In order to facility those changes, the CPRS GUI chart needs to know the  $J value for the running process for the open connection o

**API Endpoint:** `GET /vista/or/rpc/orbcma5-job`

---

### `ORWU OVERDL`

| Property | Value |
|----------|-------|
| Tag | `OVERDL` |
| Routine | `ORWU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwu-overdl`

---

### `ORUTL4 DLL`

| Property | Value |
|----------|-------|
| Tag | `DLL` |
| Routine | `ORUTL4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will check the version of the user's DLL against the current  version defined on the server for compatibility.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DLLNAME | LITERAL | No |
| 2 | DLLVERSION | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orutl4-dll`

---

### `ORWU MOBAPP`

| Property | Value |
|----------|-------|
| Tag | `MOBAPP` |
| Routine | `ORWU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwu-mobapp`

---

### `ORWCIRN JLV LABEL`

| Property | Value |
|----------|-------|
| Tag | `JLV` |
| Routine | `ORWCIRN` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This RPC gets the Label/Caption for the JLV/VistaWeb external remote data button. The label has historically had a value of  VistaWeb.  With the addition of this RPC and a new parameter,  ORWRP LEGACY VIEWER LABEL, the caption of this button can be changed to JLV (Joint Legacy Viewer) when JLV becom

**API Endpoint:** `GET /vista/or/rpc/orwcirn-jlv-label`

---

### `ORWDSD1 ODSLCT`

| Property | Value |
|----------|-------|
| Tag | `ODSLCT` |
| Routine | `ORWDSD1` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | LOC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdsd1-odslct`

---

### `ORWDPS1 GETPRIOR`

| Property | Value |
|----------|-------|
| Tag | `GETPRIOR` |
| Routine | `ORWDPS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This gets the sites preferred priority for "ASAP". If "ASAP" is not used  it holds the sites alternative to "ASAP" or if "ASAP" has been renamed it  can hold that information if it is chosen. It only holds one entry.

**API Endpoint:** `GET /vista/or/rpc/orwdps1-getprior`

---

### `ORWDPS1 GETPRIEN`

| Property | Value |
|----------|-------|
| Tag | `GETPRIEN` |
| Routine | `ORWDPS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns the IEN of the sites selection for an Alternative to the "ASAP"  order urgency, from file ORD(101.42.

**API Endpoint:** `GET /vista/or/rpc/orwdps1-getprien`

---

### `ORTO GETRVW`

| Property | Value |
|----------|-------|
| Tag | `GETRVW` |
| Routine | `ORTOULT4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Unified Action Profile (UAP). This RPC gets the value of the field 'UAP Reviewed?' field #100,.61,  Filed as the first piece of 100,.61;1.  This  is the status of the review. It returns the string from a set of codes  to CPRS. This includes cont for contiued, chg for changed, dc for discontinued, rn

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORDER IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orto-getrvw`

---

### `ORTO SETRVW`

| Property | Value |
|----------|-------|
| Tag | `SETRVW` |
| Routine | `ORTOULT4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC sets the value of three fields: first the 'UAP Reviewed?' field #100,.61;1, with the passed value (0=NO, 1=YES). Second the 'UAP Date Last Reviewed' field # 100,.61;2 with the ,current date and time; and third the 'UAP Last Reviewed By' field #100.61;3 with the DUZ of the reviewer.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REVIEW STATUS | LITERAL | No |
| 2 | ORDER IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orto-setrvw`

---

### `ORTO SET UAP FLAG`

| Property | Value |
|----------|-------|
| Tag | `SETUAPF` |
| Routine | `ORTOULT4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Unified Action Profile (UAP). Pass in 1 to flag that user has entered UAP view.  Pass in 0 to flag they have changed to any other view in the TfrmOrders.SetOrderView procedure. While in UAP view, new orders will have the UAP Reviewed? field (#100,.61) of the order file set to 'N'. Global  Loaction .

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | FLAG | LITERAL | No |

**API Endpoint:** `POST /vista/or/rpc/orto-set-uap-flag`

---

### `ORTO UAPOFF`

| Property | Value |
|----------|-------|
| Tag | `UAPOFF` |
| Routine | `ORTOULT4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This is used to turn on or off the Unified Action Profile function in  CPRS.

**API Endpoint:** `GET /vista/or/rpc/orto-uapoff`

---

### `ORTO DGROUP`

| Property | Value |
|----------|-------|
| Tag | `DGROUP` |
| Routine | `ORTOULT4` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** RETURNS THE CPRS DISPLAY GROUP NAME

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DGROUP | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orto-dgroup`

---

### `ORALEAPI REPORT`

| Property | Value |
|----------|-------|
| Tag | `REPORT` |
| Routine | `ORALEAPI` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Description:** This RPC returns TIU and OR notification data from the ALERT TRACKING file for a given date range.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SDT | LITERAL | No |
| 2 | EDT | LITERAL | No |
| 3 | TYP | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oraleapi-report`

---

### `ORWPT2 COVID`

| Property | Value |
|----------|-------|
| Tag | `COVID` |
| Routine | `ORWPT2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpt2-covid`

---

### `ORWOTHER SHWOTHER`

| Property | Value |
|----------|-------|
| Tag | `SHWOTHER` |
| Routine | `ORWOTHER` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC returns the controls info for the other information panel in CPRS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwother-shwother`

---

### `ORWOTHER DETAIL`

| Property | Value |
|----------|-------|
| Tag | `DETAIL` |
| Routine | `ORWOTHER` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** This RPC returns a detail information for the patient other information  panel.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | TYPE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwother-detail`

---

### `ORWTIU EXCCOPY`

| Property | Value |
|----------|-------|
| Tag | `EXCCOPY` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Given a TIU note ien, calls EXC^TIUCOP to determine if the note should be excluded from copy/paste tracking.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORTIUDA | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-exccopy`

---

### `ORWTIU PCTCOPY`

| Property | Value |
|----------|-------|
| Tag | `PCTCOPY` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Get the required percentage of matching to verify pasted text originated from previously copied text.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIV | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-pctcopy`

---

### `ORWTIU WRDCOPY`

| Property | Value |
|----------|-------|
| Tag | `WRDCOPY` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** Get the required number of words in pasted text to be tracked as part of the copy/paste functionality.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIV | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-wrdcopy`

---

### `ORWTIU SVCOPY`

| Property | Value |
|----------|-------|
| Tag | `SVCOPY` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Saves copied text to the copy/paste copy buffer.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORTXT | REFERENCE | No |
| 2 | DIV | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-svcopy`

---

### `ORWTIU GETPASTE`

| Property | Value |
|----------|-------|
| Tag | `GETPASTE` |
| Routine | `ORWTIU` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Given a specific document ien, returns an array containing all previously pasted text stored in the copy/paste tracker file for said document.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORTIU | LITERAL | No |
| 2 | DIV | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-getpaste`

---

### `ORWTIU SVPASTE`

| Property | Value |
|----------|-------|
| Tag | `SVPASTE` |
| Routine | `ORWTIU` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Saves pasted text to the copy/paste tracking paste file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORTXT | REFERENCE | No |
| 2 | DIV | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-svpaste`

---

### `ORWTIU VIEWCOPY`

| Property | Value |
|----------|-------|
| Tag | `VIEWCOPY` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUZ | LITERAL | No |
| 2 | IEN | LITERAL | No |
| 3 | INST | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-viewcopy`

---

### `ORWTIU LDCPIDNT`

| Property | Value |
|----------|-------|
| Tag | `LDCPIDNT` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This returns the copy/paste identifier options. The returned data will contain 4 to 5 data pieces, comma delimited. The five data pieces represent Bold (B), Italicize (I), Underline (UL), Highlight (HL), and Highlight Color (HLC). The first four pieces are binary (1 or 0) with a 1 indicating the att

**API Endpoint:** `GET /vista/or/rpc/orwtiu-ldcpidnt`

---

### `ORWTIU SVCPIDNT`

| Property | Value |
|----------|-------|
| Tag | `SVCPIDNT` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This saves the copy/paste identifier options. The saved data will contain 4 to 5 data pieces, comma delimited. The five data pieces represent Bold (B), Italicize (I), Underline (UL), Highlight (HL), and Highlight Color (HLC). The first four pieces are binary (1 or 0) with a 1 indicating the attribut

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORVAL | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-svcpidnt`

---

### `ORQPT PTEAMPR`

| Property | Value |
|----------|-------|
| Tag | `PTEAMPR` |
| Routine | `ORQPTQ1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Function returns a list of PCMM teams for a specific provider.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PROVIDER | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqpt-pteampr`

---

### `ORQPT PTEAM PATIENTS`

| Property | Value |
|----------|-------|
| Tag | `PTEAMPTS` |
| Routine | `ORQPTQ1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Function returns an array of patients on a PCMM team.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TEAM ID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqpt-pteam-patients`

---

### `ORWTPT GETPTEAM`

| Property | Value |
|----------|-------|
| Tag | `GETPTEAM` |
| Routine | `ORWTPT` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Function returns members of a PCMM team.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TEAM | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtpt-getpteam`

---

### `ORWTPP PCMTEAMS`

| Property | Value |
|----------|-------|
| Tag | `PCMTEAMS` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Function returns active PCMM teams for a provider.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PROVIDER | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-pcmteams`

---

### `ORB3UTL DEFER`

| Property | Value |
|----------|-------|
| Tag | `DEFER` |
| Routine | `ORB3UTL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** allows to defer an alert DEFER(ORY,ORPROV,ORALERT,ORDT)  ;defer an alert         ;ORALERT - alert to defer         ;ORPROV - provider to defer the alert for         ;ORDT - date/time to defer the alert until

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORPROV | LITERAL | No |
| 2 | ORALERT | LITERAL | No |
| 3 | ORDT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orb3utl-defer`

---

### `ORB3UTL NOTIFPG`

| Property | Value |
|----------|-------|
| Tag | `NOTIFPG` |
| Routine | `ORB3UTL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** NOTIFPG(ORY,ORPAT,ORPG) ;page through a patients alerts         ;ORPAT - patient DFN         ;ORPG - page to get

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORPAT | LITERAL | No |
| 2 | ORPG | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orb3utl-notifpg`

---

### `ORB3UTL GET NOTIFICATION`

| Property | Value |
|----------|-------|
| Tag | `GETNOTIF` |
| Routine | `ORB3UTL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the entire notificaiton entry as a name=value set.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orb3utl-get-notification`

---

### `ORB3UTL GET DESCRIPTION`

| Property | Value |
|----------|-------|
| Tag | `GETDESC` |
| Routine | `ORB3UTL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orb3utl-get-description`

---

### `ORB3UTL GET EXISTING NOTES`

| Property | Value |
|----------|-------|
| Tag | `GETNOTES` |
| Routine | `ORB3UTL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orb3utl-get-existing-notes`

---

### `ORBSMART ISSMNOT`

| Property | Value |
|----------|-------|
| Tag | `ISSMNOT` |
| Routine | `ORBSMART` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbsmart-issmnot`

---

### `ORWDPS1 MAXDS`

| Property | Value |
|----------|-------|
| Tag | `MAXDS` |
| Routine | `ORWDPS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdps1-maxds`

---

### `ORWTIU START`

| Property | Value |
|----------|-------|
| Tag | `START` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |

**Description:** Queues processes to build the TIU copy buffer for a specified user utilizing CPRS GUI.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | DIV | LITERAL | No |
| 3 | IPADD | LITERAL | No |
| 4 | HWND | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-start`

---

### `ORWTIU STOP`

| Property | Value |
|----------|-------|
| Tag | `STOP` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Description:** Stops the background process to retrieve copy buffer information for a user.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | IPADD | LITERAL | No |
| 3 | HWND | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-stop`

---

### `ORWTIU POLL`

| Property | Value |
|----------|-------|
| Tag | `POLL` |
| Routine | `ORWTIU` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Description:** This RPC is a process to poll the copy buffer retrieval background task for completion and to return the data.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | IPADD | LITERAL | No |
| 3 | HWND | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-poll`

---

### `ORWDXC2 SAVECANC`

| Property | Value |
|----------|-------|
| Tag | `SAVECANC` |
| Routine | `ORWDXC2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdxc2-savecanc`

---

### `ORDDPAPI RLSMSG`

| Property | Value |
|----------|-------|
| Tag | `RLSMSG` |
| Routine | `ORDDPAPI` |
| Return Type | WORD PROCESSING |
| Parameter Count | 0 |

**Description:** This RPC returns the help text that appears on for fOrdersTS

**API Endpoint:** `GET /vista/or/rpc/orddpapi-rlsmsg`

---

### `ORNORC CANCEL`

| Property | Value |
|----------|-------|
| Tag | `CANCEL` |
| Routine | `ORNORC` |
| Return Type | UNKNOWN() |
| Parameter Count | 0 |

**API Endpoint:** `POST /vista/or/rpc/ornorc-cancel`

---

### `ORWORB GETLTXT`

| Property | Value |
|----------|-------|
| Tag | `GETLTXT` |
| Routine | `ORWORB` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORAID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orworb-getltxt`

---

### `ORBSMART INSMALRT`

| Property | Value |
|----------|-------|
| Tag | `INSMALRT` |
| Routine | `ORBSMART` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbsmart-insmalrt`

---

### `ORBSMART OUSMALRT`

| Property | Value |
|----------|-------|
| Tag | `OUSMALRT` |
| Routine | `ORBSMART` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orbsmart-ousmalrt`

---

### `ORWTPD GETOCMIN`

| Property | Value |
|----------|-------|
| Tag | `GETOCMIN` |
| Routine | `ORWTPD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpd-getocmin`

---

### `ORWTPD GETOCMOP`

| Property | Value |
|----------|-------|
| Tag | `GETOCMOP` |
| Routine | `ORWTPD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpd-getocmop`

---

### `ORWTPD PUTOCMIN`

| Property | Value |
|----------|-------|
| Tag | `PUTOCMIN` |
| Routine | `ORWTPD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpd-putocmin`

---

### `ORWTPD PUTOCMOP`

| Property | Value |
|----------|-------|
| Tag | `PUTOCMOP` |
| Routine | `ORWTPD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwtpd-putocmop`

---

### `ORWDSD1 GETINFO`

| Property | Value |
|----------|-------|
| Tag | `GETINFO` |
| Routine | `ORWDSD1` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** This RPC returns the value from either the OR SD ADDITIONAL INFORMATION or the OR SD DIALOG PREREQ parameters by location, clinic stop, division, or  system level.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HLOCIEN | LITERAL | No |
| 2 | WHAT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdsd1-getinfo`

---

### `ORQQPXRM REMINDER LINK SEQ`

| Property | Value |
|----------|-------|
| Tag | `AFFSEQ` |
| Routine | `ORQQPXRM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the dialog sequence number(s) that are affected by a specific  reminder dialog link type.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LINK | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqpxrm-reminder-link-seq`

---

### `OROTHCL GET`

| Property | Value |
|----------|-------|
| Tag | `GET` |
| Routine | `OROTHCL` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** The RPC serves several groups of patients 1) Other Than Honorable (OTH) patients:    With EMERGENT MH OTH care type   With EXTENDED MH OTH care type For the EXTENDED MH OTH, the "OTH-EXT" label will be displayed in the  CPRS button in the CPRS header. For the EMERGENT MH OTH, the "OTH" label and OTH

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | ORDATE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orothcl-get`

---

### `ORWDRA32 RADLONG`

| Property | Value |
|----------|-------|
| Tag | `RADLONG` |
| Routine | `ORWDRA32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwdra32-radlong`

---

### `ORDEA AUINTENT`

| Property | Value |
|----------|-------|
| Tag | `AUINTENT` |
| Routine | `ORDEA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This audits 'intention to sign' for Controlled Substance orders.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORIFN | LITERAL | No |
| 2 | STATE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/ordea-auintent`

---

### `ORWU SYSPARAM`

| Property | Value |
|----------|-------|
| Tag | `JSYSPARM` |
| Routine | `ORWU` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwu-sysparam`

---

### `ORPDMP STRTPDMP`

| Property | Value |
|----------|-------|
| Tag | `STRTPDMP` |
| Routine | `ORPDMP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |

**Description:** This RPC is used to return PDMP results or to tell CPRS to kick off the  timer to retrieve PDMP results from a background job.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER | LITERAL | No |
| 2 | COSIGNER | LITERAL | No |
| 3 | PATIENT | LITERAL | No |
| 4 | VISITSTR | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orpdmp-strtpdmp`

---

### `ORPDMP CHCKTASK`

| Property | Value |
|----------|-------|
| Tag | `CHCKTASK` |
| Routine | `ORPDMP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT | LITERAL | No |
| 2 | HANDLE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orpdmp-chcktask`

---

### `ORPDMPNT MAKENOTE`

| Property | Value |
|----------|-------|
| Tag | `MAKENOTE` |
| Routine | `ORPDMPNT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 10 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | REFERENCE | No |
| 2 | DATE | LITERAL | No |
| 3 | LOC | LITERAL | No |
| 4 | VSTR | LITERAL | No |
| 5 | PAT | LITERAL | No |
| 6 | USER | LITERAL | No |
| 7 | COSIGNER | LITERAL | No |
| 8 | ERROR | LITERAL | No |
| 9 | ERRMSG | REFERENCE | No |
| 10 | HANDLE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orpdmpnt-makenote`

---

### `ORPDMP STOPTASK`

| Property | Value |
|----------|-------|
| Tag | `STOPTASK` |
| Routine | `ORPDMP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HANDLE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orpdmp-stoptask`

---

### `ORPDMP VIEWEDREPORT`

| Property | Value |
|----------|-------|
| Tag | `VIEWEDREPORT` |
| Routine | `ORPDMP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | HANDLE | LITERAL | No |
| 2 | STATUS | LITERAL | No |
| 3 | ERRORARR | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orpdmp-viewedreport`

---

### `ORPDMP GETCACHE`

| Property | Value |
|----------|-------|
| Tag | `GETCACHE` |
| Routine | `ORPDMP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | USER | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orpdmp-getcache`

---

### `ORPDMPNT RECNTNOTE`

| Property | Value |
|----------|-------|
| Tag | `RECNTNOTE` |
| Routine | `ORPDMPNT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orpdmpnt-recntnote`

---

### `ORWPT GET FULL ICN`

| Property | Value |
|----------|-------|
| Tag | `GETFICN` |
| Routine | `ORWPT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** RPC to return the ICN plus checksum for a given DFN.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpt-get-full-icn`

---

### `ORWTIU TEMPLATE PREFERENCES`

| Property | Value |
|----------|-------|
| Tag | `REQDFLD` |
| Routine | `ORWTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Returns or Saves Template Required Fields personal preferences.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ACTION | LITERAL | No |
| 2 | SAVE DATA | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtiu-template-preferences`

---

### `ORWLRAP1 CONFIG`

| Property | Value |
|----------|-------|
| Tag | `CONFIG` |
| Routine | `ORWLRAP1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TYP | LITERAL | No |
| 2 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwlrap1-config`

---

### `ORWLRAP1 SPEC`

| Property | Value |
|----------|-------|
| Tag | `SPEC` |
| Routine | `ORWLRAP1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwlrap1-spec`

---

### `ORWDAL32 CHKMEDS`

| Property | Value |
|----------|-------|
| Tag | `CHKMEDS` |
| Routine | `ORWDAL32` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of all allergy checks related to existing medications for the current patient when a new allergy is added

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | GMRAGNT | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdal32-chkmeds`

---

### `ORWDAL32 GETPROV`

| Property | Value |
|----------|-------|
| Tag | `GETPROV` |
| Routine | `ORWDAL32` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Returns a list of providers and/or teams to receive alerts, based on  an order number, determined by the ORB PROVIDER RECIPIENTS parameter.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORNUM | LITERAL | No |
| 2 | ORDFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdal32-getprov`

---

### `ORWDAL32 SENDALRT`

| Property | Value |
|----------|-------|
| Tag | `SENDALRT` |
| Routine | `ORWDAL32` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** Called to send a group of alerts to specified recipients for new allergies impacting existing med orders.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORDNUM | LITERAL | No |
| 2 | PROVLST | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwdal32-sendalrt`

---

### `ORWTPP GETSURRS`

| Property | Value |
|----------|-------|
| Tag | `GETSURRS` |
| Routine | `ORWTPP` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC returns the full list of available surrogates for the current user.

**API Endpoint:** `GET /vista/or/rpc/orwtpp-getsurrs`

---

### `ORWTPP SURRDFLT`

| Property | Value |
|----------|-------|
| Tag | `SURRDFLT` |
| Routine | `ORWTPP` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This rpc allows the setting and retrieval of the default surrogate settings.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ACTION | LITERAL | No |
| 2 | VALUES | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwtpp-surrdflt`

---

### `ORWDXA1 FLAGACT`

| Property | Value |
|----------|-------|
| Tag | `FLAGACT` |
| Routine | `ORWDXA1` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** Returns information on a flagged order based on the ACTION specified.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORIFN | LITERAL | No |
| 2 | ACTION | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdxa1-flagact`

---

### `ORWDXA1 FLAGCOM`

| Property | Value |
|----------|-------|
| Tag | `FLAGCOM` |
| Routine | `ORWDXA1` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Description:** Add comments to a flagged order.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORFIN | LITERAL | No |
| 2 | ORCOM | REFERENCE | No |
| 3 | ORALRP | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwdxa1-flagcom`

---

### `ORWDXA1 FLAGTXTS`

| Property | Value |
|----------|-------|
| Tag | `FLAGTXTS` |
| Routine | `ORWDXA1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns flag reason, recipients and the comments associated with the list  of flagged orders.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IFNS | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwdxa1-flagtxts`

---

### `ORWPS1 NVADLG`

| Property | Value |
|----------|-------|
| Tag | `NVADLG` |
| Routine | `ORWPS1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns order dialog information for a non-VA medications (PSH OERR).

**API Endpoint:** `GET /vista/or/rpc/orwps1-nvadlg`

---

### `ORQ3 AUTHUSR`

| Property | Value |
|----------|-------|
| Tag | `AUTHUSR` |
| Routine | `ORQ3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orq3-authusr`

---

### `ORQ3 EN`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `ORQ3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |

**Description:** This RPC call will generate a list sorted by Patient Name, Patient IEN, and Order IEN based on all Orders for a particular PROVIDER at the ORDER ACTIONS level where the Activity Date/Time is within the date range passed in.  The list will also contain the Order Status and Date Order Entered In.  Par

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORPRIEN | LITERAL | No |
| 2 | ORDT1 | LITERAL | No |
| 3 | ORDT2 | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orq3-en`

---

### `ORQ3 XFER`

| Property | Value |
|----------|-------|
| Tag | `XFER` |
| Routine | `ORQ3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This RPC call will take a list of Order IENs along with Transferring From Provider, Transferring To Provider, Transferring User & Transfer Date/Time and will create an entry in the ORDER TRANSFERS Multiple which holds the four Transfer related fields just mentioned.   It should return a list of Orde

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LST | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orq3-xfer`

---

### `ORQ3 XFER HISTORY`

| Property | Value |
|----------|-------|
| Tag | `HISTORY` |
| Routine | `ORQ3` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** The purpose of this remote procedure call is to return the transfer  history for the specified order This is related to the Provider Role Tool  and the transfer of an order (for future alert purposes) from one  provider to another.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORIEN | WORD-PROCESSING | No |

**API Endpoint:** `GET /vista/or/rpc/orq3-xfer-history`

---

### `ORQ3 LOADALL`

| Property | Value |
|----------|-------|
| Tag | `LOADALL` |
| Routine | `ORQ3` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC returns the sizing related to the PRT GUI chart parameters   for the user.

**API Endpoint:** `GET /vista/or/rpc/orq3-loadall`

---

### `ORQ3 SAVEALL`

| Property | Value |
|----------|-------|
| Tag | `SAVEALL` |
| Routine | `ORQ3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This RPC saves the sizing related PRT GUI chart parameters for the  user.

**API Endpoint:** `GET /vista/or/rpc/orq3-saveall`

---

### `ORQ3 AUDIT`

| Property | Value |
|----------|-------|
| Tag | `AUDIT` |
| Routine | `ORQ3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** The purpose of this Remote Procedure Call (RPC) is to return all the  transfers that were performed during a specified date range.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORAUST | LITERAL | No |
| 2 | ORAUEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orq3-audit`

---

### `ORWDXC ALLERGY`

| Property | Value |
|----------|-------|
| Tag | `ALLERGY` |
| Routine | `ORWDXC` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Return list of drug-allergy checks on medication selection

**API Endpoint:** `GET /vista/or/rpc/orwdxc-allergy`

---

### `ORWDXC REASON`

| Property | Value |
|----------|-------|
| Tag | `REASON` |
| Routine | `ORWDXC` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of predefined reasons for overriding a drug allergy during medication ordering

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TYP | LITERAL | No |
| 2 | DFN | LITERAL | No |
| 3 | OID | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdxc-reason`

---

### `ORWORB PROUSER`

| Property | Value |
|----------|-------|
| Tag | `PROUSER` |
| Routine | `ORWORB` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Function Returns Processed Alerts for Current User - with optional date range

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STRTDATE | LITERAL | No |
| 2 | STOPDATE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orworb-prouser`

---

### `ORWTPR GETARCHP`

| Property | Value |
|----------|-------|
| Tag | `GETARCHP` |
| Routine | `ORWTPR` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Called to return the parameter value of ORB ARCHIVE PERIOD

**API Endpoint:** `GET /vista/or/rpc/orwtpr-getarchp`

---

### `ORVIMM MAKENOTE`

| Property | Value |
|----------|-------|
| Tag | `MAKENOTE` |
| Routine | `ORVIMM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 8 |

**Description:** This RPC takes an array of immunization objects and create a progress  note.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT | REFERENCE | No |
| 2 | DATE | LITERAL | No |
| 3 | LOC | LITERAL | No |
| 4 | TYPE | LITERAL | No |
| 5 | VSTR | LITERAL | No |
| 6 | PAT | LITERAL | No |
| 7 | USER | LITERAL | No |
| 8 | COSIGNER | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orvimm-makenote`

---

### `ORWDXC SAVEMCHK`

| Property | Value |
|----------|-------|
| Tag | `SAVEMCHK` |
| Routine | `ORWDXC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This remote procedure duplicates the functionality of ORWDXC SAVECHK rpc with the difference being it accepts additional subscript nodes in the LST array.  In addition to "ORCHECKS" it allows for "ORCOMMENTS" and "ORREASONS".

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORVP | LITERAL | No |
| 2 | LST | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwdxc-savemchk`

---

### `ORWDXR01 WARN`

| Property | Value |
|----------|-------|
| Tag | `WARN` |
| Routine | `ORWDXR01` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Determines if a warning needs to be displayed for this order action.

**API Endpoint:** `GET /vista/or/rpc/orwdxr01-warn`

---

### `ORVIMM VIMMREM`

| Property | Value |
|----------|-------|
| Tag | `VIMMREM` |
| Routine | `ORVIMM` |
| Return Type | ARRAY |
| Parameter Count | 4 |

**Description:** This RPC returns a list of Clinical Reminders Statuses based off the site  setup in the VIMM parameters.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PAT | LITERAL | No |
| 2 | USER | LITERAL | No |
| 3 | LOC | LITERAL | No |
| 4 | ISSKIN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orvimm-vimmrem`

---

### `ORFEDT GETLAYOT`

| Property | Value |
|----------|-------|
| Tag | `GETLAYOT` |
| Routine | `ORFEDT` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUTS | REFERENCE | No |
| 2 | DEFAULTS | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orfedt-getlayot`

---

### `ORFEDT BLDRESLT`

| Property | Value |
|----------|-------|
| Tag | `BLDRESLT` |
| Routine | `ORFEDT` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LIST | REFERENCE | No |
| 2 | INPUTS | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orfedt-bldreslt`

---

### `ORVIMM GETITEMS`

| Property | Value |
|----------|-------|
| Tag | `GETITEMS` |
| Routine | `ORVIMM` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** This remote procedure returns a list of immunization or skin test based  off the passed in clinical reminder definition.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DEFIEN | LITERAL | No |
| 2 | TYPE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orvimm-getitems`

---

### `ORVIMM GETHIST`

| Property | Value |
|----------|-------|
| Tag | `GETHIST` |
| Routine | `ORVIMM` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DEFIEN | LITERAL | No |
| 2 | PAT | LITERAL | No |
| 3 | TYPE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orvimm-gethist`

---

### `ORFEDT BLDLAYOT`

| Property | Value |
|----------|-------|
| Tag | `BLDLAYOT` |
| Routine | `ORFEDT` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUTS | REFERENCE | No |
| 2 | TYPE | LITERAL | No |
| 3 | CONTROL | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orfedt-bldlayot`

---

### `ORVIMM USEICE`

| Property | Value |
|----------|-------|
| Tag | `USEICE` |
| Routine | `ORVIMM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** This remote procedure determines if the immunization data entry form  should show the ICE display or the reminder defintion display.

**API Endpoint:** `GET /vista/or/rpc/orvimm-useice`

---

### `ORWPCE5 UCUMLIST`

| Property | Value |
|----------|-------|
| Tag | `UCUMLIST` |
| Routine | `ORWPCE5` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpce5-ucumlist`

---

### `ORWPCE5 REMTAX`

| Property | Value |
|----------|-------|
| Tag | `REMTAX` |
| Routine | `ORWPCE5` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpce5-remtax`

---

### `ORWPCE5 TAXCODES`

| Property | Value |
|----------|-------|
| Tag | `TAXCODES` |
| Routine | `ORWPCE5` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TAXONOMY | LITERAL | No |
| 2 | DATE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce5-taxcodes`

---

### `ORWPCE5 NOTEDATE`

| Property | Value |
|----------|-------|
| Tag | `NOTEDATE` |
| Routine | `ORWPCE5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NOTEIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce5-notedate`

---

### `ORB3U2 GETRCPNT`

| Property | Value |
|----------|-------|
| Tag | `GETRCPNT` |
| Routine | `ORB3U2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orb3u2-getrcpnt`

---

### `ORWPCE5 MAGDAT`

| Property | Value |
|----------|-------|
| Tag | `MAGDAT` |
| Routine | `ORWPCE5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpce5-magdat`

---

### `ORVIMM CHKTITLE`

| Property | Value |
|----------|-------|
| Tag | `CHKTITLE` |
| Routine | `ORVIMM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER | LITERAL | No |
| 2 | ENCUSER | LITERAL | No |
| 3 | DATETIME | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orvimm-chktitle`

---

### `ORWPCE5 NOTELOC`

| Property | Value |
|----------|-------|
| Tag | `NOTELOC` |
| Routine | `ORWPCE5` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpce5-noteloc`

---

### `ORWPCE4 STDCODES`

| Property | Value |
|----------|-------|
| Tag | `STDCODES` |
| Routine | `ORWPCE4` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/or/rpc/orwpce4-stdcodes`

---

### `ORWDPS33 IVIND`

| Property | Value |
|----------|-------|
| Tag | `IVIND` |
| Routine | `ORWDPS33` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** RETURNS INDICATIONS

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ORDERIDS | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orwdps33-ivind`

---

### `ORVIMM GETCODES`

| Property | Value |
|----------|-------|
| Tag | `GETCODES` |
| Routine | `ORVIMM` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VISIT | LITERAL | No |
| 2 | ITEMLIST | REFERENCE | No |

**API Endpoint:** `GET /vista/or/rpc/orvimm-getcodes`

---

### `ORWPCE5 REPLCODE`

| Property | Value |
|----------|-------|
| Tag | `REPLCODE` |
| Routine | `ORWPCE5` |
| Return Type | ARRAY |
| Parameter Count | 3 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ENCDATE | LITERAL | No |
| 2 | CODESYS | LITERAL | No |
| 3 | CODE | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpce5-replcode`

---

### `ORVIMM GETCTINF`

| Property | Value |
|----------|-------|
| Tag | `GETCTINF` |
| Routine | `ORVIMM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC returns the contact information to display in CPRS when an  immunization is selected when there is no active lot number.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOC | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orvimm-getctinf`

---

### `ORVIMM PLOC`

| Property | Value |
|----------|-------|
| Tag | `PLOC` |
| Routine | `ORVIMM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC returns if a CPRS should marked a diagnosis as primary when  documenting an immunization administration from the CPRS coversheet.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LOCIEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orvimm-ploc`

---

### `ORWDXC CLRALLGY`

| Property | Value |
|----------|-------|
| Tag | `CLRALLGY` |
| Routine | `ORWDXC` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This RPC clears the temporary allergy order check(s) associated with a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdxc-clrallgy`

---

### `ORWDPS33 CLZDS`

| Property | Value |
|----------|-------|
| Tag | `CLZDS` |
| Routine | `ORWDPS33` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |

**Description:** This RPC will validate the days supply for a Clozapine patient when  accepting the order in CPRS. It will return a 1 if the days supply passed is 7, 14 or 28 depending on patient's dispense frequency in the CLOZAPINE PATIENT LIST file (#603.01).    For any other days supply, it'll return a zero with

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT IEN | LITERAL | No |
| 2 | DRUG IEN | LITERAL | No |
| 3 | DAYS SUPPLY | LITERAL | No |
| 4 | ORDERABLE ITEM IEN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwdps33-clzds`

---

### `ORACCESS GETNOTES`

| Property | Value |
|----------|-------|
| Tag | `GETNOTES` |
| Routine | `ORACCESS` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | USER | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/oraccess-getnotes`

---

### `ORWU FLDINFO`

| Property | Value |
|----------|-------|
| Tag | `FLDINFO` |
| Routine | `ORWU` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns Field Attributes from the data dictionary.

**API Endpoint:** `GET /vista/or/rpc/orwu-fldinfo`

---

### `ORACCES2 DLGOIINFO`

| Property | Value |
|----------|-------|
| Tag | `DLGOIINFO` |
| Routine | `ORACCES2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Return specified orderable item info for a each order dialog in the list.

**API Endpoint:** `GET /vista/or/rpc/oracces2-dlgoiinfo`

---

### `ORACCES2 LABSBYXREF`

| Property | Value |
|----------|-------|
| Tag | `LABSBYXREF` |
| Routine | `ORACCES2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns an up-arrow delimited list of the short names of display groups  used by the specified orderable item cross-reference.

**API Endpoint:** `GET /vista/or/rpc/oracces2-labsbyxref`

---

### `ORACCES2 DIETINFO`

| Property | Value |
|----------|-------|
| Tag | `DIETINFO` |
| Routine | `ORACCES2` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns Display Group information for Dietetics.

**API Endpoint:** `GET /vista/or/rpc/oracces2-dietinfo`

---

### `ORACCESS EHRACTIVE`

| Property | Value |
|----------|-------|
| Tag | `EHRACTIVE` |
| Routine | `ORACCESS` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Returns 1 if the system is on the new Electronic Health Record, 0 otherwise.

**API Endpoint:** `GET /vista/or/rpc/oraccess-ehractive`

---

### `ORWLRAP1 APORDITM`

| Property | Value |
|----------|-------|
| Tag | `APORDITM` |
| Routine | `ORWLRAP1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Returns an array of orderable items for the CPRS Anatomic Pathology  order dialog in the format:     Y(n)=IEN^.01 Name^.01 Name  -or-  IEN^Synonym <.01 Name>^.01 Name

**API Endpoint:** `GET /vista/or/rpc/orwlrap1-aporditm`

---

### `ORQQVI SWPVIT`

| Property | Value |
|----------|-------|
| Tag | `SWPVIT` |
| Routine | `ORQQVI` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Array of patient most recent vitals within start and stop date/times.  If no start and stop dates are indicated, the most recent are returned.    If no start date is passed then the start date is 1 (i.e. before any dates).    If no stop date is passed then the start date is also the stop date and if

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |
| 2 | START DATE/TIME | LITERAL | No |
| 3 | STOP DATE/TIME | LITERAL | No |
| 4 | SWAP | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orqqvi-swpvit`

---

### `ORWPT2 ID INFO`

| Property | Value |
|----------|-------|
| Tag | `IDINFO` |
| Routine | `ORWPT2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the Inpatient Provider, Primary Care Provider, Last Location Name,  and Last Visit Date for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpt2-id-info`

---

### `ORWPT2 LOOKUP`

| Property | Value |
|----------|-------|
| Tag | `LOOKUP` |
| Routine | `ORWPT2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** The purpose of this Remote Procedure Call is to improve patient safety by providing a methodology for the Computerized Patient Record System (CPRS) to include additional information in the similar patient lookup process.   Specifically, this RPC is a wrapper that includes output from the DG CHK B25

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/or/rpc/orwpt2-lookup`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| PATIENT ID: | ORQQAL LIST | PATIENT ID | LITERAL | rpc |
| ALLERGY ID: | ORQQAL DETAIL | ALLERGY ID | LITERAL | rpc |
| PATIENT ID: | ORQQPL LIST | PATIENT ID | LITERAL | rpc |
| STATUS: | ORQQPL LIST | STATUS | LITERAL | rpc |
| PROBLEM ID: | ORQQPL DETAIL | PROBLEM ID | LITERAL | rpc |
| PATIENT ID: | ORQQXQA PATIENT | PATIENT ID | LITERAL | rpc |
| START DATE: | ORQQXQA PATIENT | START DATE | LITERAL | rpc |
| STOP DATE: | ORQQXQA PATIENT | STOP DATE | LITERAL | rpc |
| USER ID: | ORQQXQA USER | USER ID | LITERAL | rpc |
| START DATE: | ORQQXQA USER | START DATE | LITERAL | rpc |
| STOP DATE: | ORQQXQA USER | STOP DATE | LITERAL | rpc |
| PATIENT ID: | ORQQVI VITALS | PATIENT ID | LITERAL | rpc |
| START DATE/TIME: | ORQQVI VITALS | START DATE/TIME | LITERAL | rpc |
| STOP DATE/TIME: | ORQQVI VITALS | STOP DATE/TIME | LITERAL | rpc |
| USER ID: | ORQPT PROVIDER PATIENTS | USER ID | LITERAL | rpc |
| CLINIC ID: | ORQPT CLINIC PATIENTS | CLINIC ID | LITERAL | rpc |
| START DATE: | ORQPT CLINIC PATIENTS | START DATE | LITERAL | rpc |
| STOP DATE: | ORQPT CLINIC PATIENTS | STOP DATE | LITERAL | rpc |
| SPECIALTY ID: | ORQPT SPECIALTY PATIENTS | SPECIALTY ID | LITERAL | rpc |
| TEAM ID: | ORQPT TEAM PATIENTS | TEAM ID | LITERAL | rpc |
| WARD ID: | ORQPT WARD PATIENTS | WARD ID | LITERAL | rpc |
| PATIENT ID: | ORQQPS LIST | PATIENT ID | LITERAL | rpc |
| START DATE/TIME: | ORQQPS LIST | START DATE/TIME | LITERAL | rpc |
| STOP DATE/TIME: | ORQQPS LIST | STOP DATE/TIME | LITERAL | rpc |
| XQAID: | ORB FOLLOW-UP STRING | XQAID | LITERAL | rpc |
| XQAID: | ORB DELETE ALERT | XQAID | LITERAL | rpc |
| XQAID: | ORB FOLLOW-UP TYPE | XQAID | LITERAL | rpc |
| XQAID: | ORB FOLLOW-UP ARRAY | XQAID | LITERAL | rpc |
| ORDER: | ORQOR DETAIL | ORDER | LITERAL | rpc |
| DFN: | ORWPT ID INFO | DFN | LITERAL | rpc |
| DFN: | ORWLR CUMULATIVE REPORT | DFN | LITERAL | rpc |
| PATIENT ID: | ORQQVS VISITS/APPTS | PATIENT ID | LITERAL | rpc |
| START DATE/TIME: | ORQQVS VISITS/APPTS | START DATE/TIME | LITERAL | rpc |
| STOP DATE/TIME: | ORQQVS VISITS/APPTS | STOP DATE/TIME | LITERAL | rpc |
| DUMMY: | ORQQVS VISITS/APPTS | DUMMY | LITERAL | rpc |
| PATIENT ID: | ORQQPP LIST | PATIENT ID | LITERAL | rpc |
| PATIENT ID: | ORQPT WARDRMBED | PATIENT ID | LITERAL | rpc |
| PATIENT ID: | ORQQPX IMMUN LIST | PATIENT ID | LITERAL | rpc |
| PATIENT: | ORQOR LIST | PATIENT | LITERAL | rpc |
| GROUP: | ORQOR LIST | GROUP | LITERAL | rpc |
| FLAG: | ORQOR LIST | FLAG | LITERAL | rpc |
| STARTDATE: | ORQOR LIST | STARTDATE | LITERAL | rpc |
| STOPDATE: | ORQOR LIST | STOPDATE | LITERAL | rpc |
| PATIENT: | ORQQLR DETAIL | PATIENT | LITERAL | rpc |
| ORDER NUMBER: | ORQQLR DETAIL | ORDER NUMBER | LITERAL | rpc |
| Patient DFN: | ORQQVS DETAIL NOTES | Patient DFN | LITERAL | rpc |
| Visit: | ORQQVS DETAIL NOTES | Visit | LITERAL | rpc |
| Patient: | ORQQVS DETAIL SUMMARY | Patient | LITERAL | rpc |
| Visit: | ORQQVS DETAIL SUMMARY | Visit | LITERAL | rpc |
| PATIENT ID: | ORQQPS DETAIL | PATIENT ID | LITERAL | rpc |
| MEDICATION ID: | ORQQPS DETAIL | MEDICATION ID | LITERAL | rpc |
| PATIENT: | ORQPT ATTENDING/PRIMARY | PATIENT | LITERAL | rpc |
| PATIENT ID: | ORQQAL LIST REPORT | PATIENT ID | LITERAL | rpc |
| PATIENT ID: | ORQQAL LIST | PATIENT ID | LITERAL | rpc |
| ALLERGY ID: | ORQQAL DETAIL | ALLERGY ID | LITERAL | rpc |
| PATIENT ID: | ORQQPL LIST | PATIENT ID | LITERAL | rpc |
| STATUS: | ORQQPL LIST | STATUS | LITERAL | rpc |
| PROBLEM ID: | ORQQPL DETAIL | PROBLEM ID | LITERAL | rpc |
| PATIENT ID: | ORQQXQA PATIENT | PATIENT ID | LITERAL | rpc |
| START DATE: | ORQQXQA PATIENT | START DATE | LITERAL | rpc |
| STOP DATE: | ORQQXQA PATIENT | STOP DATE | LITERAL | rpc |
| USER ID: | ORQQXQA USER | USER ID | LITERAL | rpc |
| START DATE: | ORQQXQA USER | START DATE | LITERAL | rpc |
| STOP DATE: | ORQQXQA USER | STOP DATE | LITERAL | rpc |
| PATIENT ID: | ORQQVI VITALS | PATIENT ID | LITERAL | rpc |
| START DATE/TIME: | ORQQVI VITALS | START DATE/TIME | LITERAL | rpc |
| STOP DATE/TIME: | ORQQVI VITALS | STOP DATE/TIME | LITERAL | rpc |
| USER ID: | ORQPT PROVIDER PATIENTS | USER ID | LITERAL | rpc |
| CLINIC ID: | ORQPT CLINIC PATIENTS | CLINIC ID | LITERAL | rpc |
| START DATE: | ORQPT CLINIC PATIENTS | START DATE | LITERAL | rpc |
| STOP DATE: | ORQPT CLINIC PATIENTS | STOP DATE | LITERAL | rpc |
| SPECIALTY ID: | ORQPT SPECIALTY PATIENTS | SPECIALTY ID | LITERAL | rpc |
| TEAM ID: | ORQPT TEAM PATIENTS | TEAM ID | LITERAL | rpc |
| WARD ID: | ORQPT WARD PATIENTS | WARD ID | LITERAL | rpc |
| PATIENT ID: | ORQQPS LIST | PATIENT ID | LITERAL | rpc |
| START DATE/TIME: | ORQQPS LIST | START DATE/TIME | LITERAL | rpc |
| STOP DATE/TIME: | ORQQPS LIST | STOP DATE/TIME | LITERAL | rpc |
| ORDER: | ORQOR DETAIL | ORDER | LITERAL | rpc |
| PATIENT ID: | ORQQVS VISITS/APPTS | PATIENT ID | LITERAL | rpc |
| START DATE/TIME: | ORQQVS VISITS/APPTS | START DATE/TIME | LITERAL | rpc |
| STOP DATE/TIME: | ORQQVS VISITS/APPTS | STOP DATE/TIME | LITERAL | rpc |
| DUMMY: | ORQQVS VISITS/APPTS | DUMMY | LITERAL | rpc |
| PATIENT ID: | ORQQPP LIST | PATIENT ID | LITERAL | rpc |
| PATIENT ID: | ORQPT WARDRMBED | PATIENT ID | LITERAL | rpc |
| PATIENT ID: | ORQQPX IMMUN LIST | PATIENT ID | LITERAL | rpc |
| PATIENT: | ORQOR LIST | PATIENT | LITERAL | rpc |
| GROUP: | ORQOR LIST | GROUP | LITERAL | rpc |
| FLAG: | ORQOR LIST | FLAG | LITERAL | rpc |
| STARTDATE: | ORQOR LIST | STARTDATE | LITERAL | rpc |
| STOPDATE: | ORQOR LIST | STOPDATE | LITERAL | rpc |
| PATIENT: | ORQQLR DETAIL | PATIENT | LITERAL | rpc |
| ORDER NUMBER: | ORQQLR DETAIL | ORDER NUMBER | LITERAL | rpc |
| Patient DFN: | ORQQVS DETAIL NOTES | Patient DFN | LITERAL | rpc |
| Visit: | ORQQVS DETAIL NOTES | Visit | LITERAL | rpc |
| Patient: | ORQQVS DETAIL SUMMARY | Patient | LITERAL | rpc |
| Visit: | ORQQVS DETAIL SUMMARY | Visit | LITERAL | rpc |
| PATIENT ID: | ORQQPS DETAIL | PATIENT ID | LITERAL | rpc |
| MEDICATION ID: | ORQQPS DETAIL | MEDICATION ID | LITERAL | rpc |
| PATIENT: | ORQPT ATTENDING/PRIMARY | PATIENT | LITERAL | rpc |
| PATIENT ID: | ORQQAL LIST REPORT | PATIENT ID | LITERAL | rpc |
| PATIENT: | ORQPT PATIENT TEAM PROVIDERS | PATIENT | LITERAL | rpc |
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
| DFN: | ORWPT ID INFO | DFN | LITERAL | rpc |
| DFN: | ORWLR CUMULATIVE REPORT | DFN | LITERAL | rpc |
| DFN: | ORWRA IMAGING EXAMS | DFN | LITERAL | rpc |
| DFN: | ORWRA REPORT TEXT | DFN | LITERAL | rpc |
| EXAMID: | ORWRA REPORT TEXT | EXAMID | LITERAL | rpc |
| DFN: | ORWRP REPORT TEXT | DFN | LITERAL | rpc |
| REPORT ID: | ORWRP REPORT TEXT | REPORT ID | LITERAL | rpc |
| HEALTH SUMMARY TYPE: | ORWRP REPORT TEXT | HEALTH SUMMARY TYPE | LITERAL | rpc |
| DATE RANGE: | ORWRP REPORT TEXT | DATE RANGE | LITERAL | rpc |
| REPORT SECTION: | ORWRP REPORT TEXT | REPORT SECTION | LITERAL | rpc |
| DEVICE: | ORWRP PRINT REPORT | DEVICE | LITERAL | rpc |
| DFN: | ORWRP PRINT REPORT | DFN | LITERAL | rpc |
| REPORT ID: | ORWRP PRINT REPORT | REPORT ID | LITERAL | rpc |
| HEALTH SUMMARY TYPE: | ORWRP PRINT REPORT | HEALTH SUMMARY TYPE | LITERAL | rpc |
| DATE RANGE: | ORWRP PRINT REPORT | DATE RANGE | LITERAL | rpc |
| EXAM ID: | ORWRP PRINT REPORT | EXAM ID | LITERAL | rpc |
| DFN: | ORWLR CUMULATIVE SECTION | DFN | LITERAL | rpc |
| PART OF CUMULATIVE: | ORWLR CUMULATIVE SECTION | PART OF CUMULATIVE | LITERAL | rpc |
| DATE RANGE: | ORWLR CUMULATIVE SECTION | DATE RANGE | LITERAL | rpc |
| REPORT SECTION: | ORWLR CUMULATIVE SECTION | REPORT SECTION | LITERAL | rpc |
| DEVICE: | ORWRA PRINT REPORT | DEVICE | LITERAL | rpc |
| DFN: | ORWRA PRINT REPORT | DFN | LITERAL | rpc |
| EXAM ID: | ORWRA PRINT REPORT | EXAM ID | LITERAL | rpc |
| DFN: | ORWCS LIST OF CONSULT REPORTS | DFN | LITERAL | rpc |
| DFN: | ORWCS REPORT TEXT | DFN | LITERAL | rpc |
| CONSULT ID: | ORWCS REPORT TEXT | CONSULT ID | LITERAL | rpc |
| DEVICE: | ORWCS PRINT REPORT | DEVICE | LITERAL | rpc |
| DFN: | ORWCS PRINT REPORT | DFN | LITERAL | rpc |
| CONSULT ID: | ORWCS PRINT REPORT | CONSULT ID | LITERAL | rpc |
| XQAID: | ORB FOLLOW-UP STRING | XQAID | LITERAL | rpc |
| XQAID: | ORB DELETE ALERT | XQAID | LITERAL | rpc |
| XQAID: | ORB FOLLOW-UP TYPE | XQAID | LITERAL | rpc |
| XQAID: | ORB FOLLOW-UP ARRAY | XQAID | LITERAL | rpc |
| BOWDPS32 FORMALT: | ORBCMA32 DRUGMSG | BOWDPS32 FORMALT | UNKNOWN() | rpc |
| XQAID: | ORB FORWARD ALERT | XQAID | LITERAL | rpc |
| RECIPIENT: | ORB FORWARD ALERT | RECIPIENT | LITERAL | rpc |
| TYPE: | ORB FORWARD ALERT | TYPE | LITERAL | rpc |
| COMMENT: | ORB FORWARD ALERT | COMMENT | LITERAL | rpc |
| XQAID: | ORB RENEW ALERT | XQAID | LITERAL | rpc |
| DFN: | ORBCMA5 LOCK | DFN | LITERAL | rpc |
| ORJOB: | ORBCMA5 LOCK | ORJOB | LITERAL | rpc |
| ORY: | ORBCMA5 LOCK | ORY | LITERAL | rpc |
| ORPROV: | ORB3UTL DEFER | ORPROV | LITERAL | rpc |
| ORALERT: | ORB3UTL DEFER | ORALERT | LITERAL | rpc |
| ORDT: | ORB3UTL DEFER | ORDT | LITERAL | rpc |
| ORPAT: | ORB3UTL NOTIFPG | ORPAT | LITERAL | rpc |
| ORPG: | ORB3UTL NOTIFPG | ORPG | LITERAL | rpc |
| IEN: | ORB3UTL GET NOTIFICATION | IEN | LITERAL | rpc |

## Menu Options

### Action

| Name | Security Key |
|------|-------------|
| OR ADD ORDERS | — |
| OR REVIEW ORDERS | — |
| OR PROFILES | — |
| OR RESULTS REPORTING | — |
| OR OE/RR MENU WARD CLERK | — |
| OR OE/RR MENU NURSE | — |
| OR OE/RR MENU CLINICIAN | — |
| OR ADD MENU WARD CLERK | — |
| OR ADD MENU NURSE | — |
| OR ADD MENU CLINICIAN | — |
| OR PARAM CHART COPY | — |
| OR PARAM ORDER MISC | — |
| OR PARAM PRINTS (HOSP) | — |
| OR PARAM PRINTS (LOC) | — |
| OR PARAM REQ/LABEL | — |
| OR PARAM SERVICE COPY | — |
| OR PARAM SUMMARY REPORTS | — |
| OR PARAM WORK COPY | — |
| OR PARAM ADD MENU | — |
| OR PARAM UNSIGNED ORDERS VIEW | — |
| OR TERMINATE CLEANUP | — |
| OR GN SET LOCATIONS | — |
| OR RDI PARAMS | — |
| OR MEDICATION QO CHECKER | — |
| OR INPT CLOZAPINE MESSAGE | — |
| OR CONVERT INP TO IV | — |
| OR IV ADD FREQ UTILITY | — |
| OR DEBUG REPORT | — |
| OR ENABLE CTB CONS ACT DLGS | — |
| OR DST/CTB URL EDIT | XUPROG |
| OR DST/CTB FEATURE SWITCH | — |
| OR UNFLAGGING KEY SETUP | — |
| OR UNFLAGGING RESTRICTIONS | — |
| OR UNFLAGGING MESSAGE | — |
| OR FLAG ORDER EXPIRE DEFAULT | — |
| OR VIMM IMM REM DEFINITIONS | — |
| OR VIMM SKIN TEST REM DEFS | — |
| OR VIMM IMM NOTE TITLE | — |
| OR VIMM REMINDER DIALOG ONLY | — |
| OR IMM CONTACT INFO | — |
| OR IMM COVERSHEET DIAGNOSIS | — |
| OR OTHER BANNER REMINDER | — |

### Menu

| Name | Security Key |
|------|-------------|
| OR MAIN MENU NURSE | — |
| OR MAIN MENU WARD CLERK | — |
| OR MAIN MENU CLINICIAN | — |
| OR PARAM PRINTS | — |
| OR PARAM IRM MENU | XUPROG |
| OR PARAM COORDINATOR MENU | — |
| OR DELAYED ORDERS | — |
| OR BDC MENU | — |
| OR EPCS MENU | — |
| OR SUPPLY UTIL MENU | — |
| OR QUICK ORDER AUDIT MENU | — |
| OR DST/CTB CPRS CONFIGURATION | — |
| OR FLAG/UNFLAG SETUP | — |
| OR VIMM MENU | — |
| OR CPRS WRITE ACCESS MENU | — |

### Broker

| Name | Security Key |
|------|-------------|
| OR CPRS GUI CHART | — |
| OR BCMA ORDER COM | — |
| OR PRT GUI | — |
| OR CRMS MENU | — |

### Run routine

| Name | Security Key |
|------|-------------|
| OR UNSIGNED ORDERS | — |
| OR NATURE/STATUS ORDER SEARCH | — |
| OR PERFORMANCE MONITOR | — |
| OR PATIENT EVENT INQUIRY | — |
| OR DELAYED ORDERS EDITOR | — |
| OR EVENT PARAMETERS | — |
| OR BDC MASTER SWITCH | — |
| OR BDC PROVIDER SWITCH | — |
| OR LAPSED ORDERS | — |
| OR QO CASE REPORT | — |
| OR QO FREETEXT REPORT | — |
| OR EPCS SITE PARAMETER | OREPCSSITE |
| OR EPCS USERS PARAMETER | OREPCSUSERS |
| OR EPCS PROVIDER CONFIG CHECK | — |
| OR EPCS VALIDATION REPORTS | — |
| OR EPCS CS RX BY PROVIDER | — |
| OR CONV INPT QO TO CLIN ORD QO | — |
| OR SUPPLY NF CONVERSION | — |
| OR SUPPLY OP CONVERSION | — |
| OR QUICK ORDER AUDIT PRINT | — |
| OR QUICK ORDER NIGHTLY BG | — |
| OR QUICK ORDER AUDIT MONTHLY | — |
| OR QUICK ORDER DIVISION GROUPS | — |
| OR SUPPLY QO CONVERSION | — |
| OR OTH BTN MSG ADD/EDIT | — |
| OR CS ORDER ANOMALIES | — |
| OR INDICATION USAGE REPORT | — |
| OR NEWPERS DEBUGGER | — |
| OR ZIP CODE MESSAGE | — |
| OR CPRS WRITE ACCESS DISPLAY | — |
| OR CPRS WRITE ACCESS EDIT | — |
| OR CPRS WRITE ACCESS COPY | — |
| OR CPRS WRITE ACCESS CLEAR | — |
| OR CPRS WRITE ACCESS VIEW USER | — |
| OR PACT ACT | — |

### Inquire

| Name | Security Key |
|------|-------------|
| OR QUICK ORDER AUDIT INQUIRY | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `XUPROG`
- `OREPCSSITE`
- `OREPCSUSERS`

## API Route Summary

All routes are prefixed with `/vista/or/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/or/rpc/orqqal-list` | ORQQAL LIST | ARRAY |
| GET | `/vista/or/rpc/orqqal-detail` | ORQQAL DETAIL | ARRAY |
| GET | `/vista/or/rpc/orqqpl-list` | ORQQPL LIST | ARRAY |
| GET | `/vista/or/rpc/orqqpl-detail` | ORQQPL DETAIL | ARRAY |
| GET | `/vista/or/rpc/orqqxqa-patient` | ORQQXQA PATIENT | ARRAY |
| GET | `/vista/or/rpc/orqqxqa-user` | ORQQXQA USER | ARRAY |
| GET | `/vista/or/rpc/orqqvi-vitals` | ORQQVI VITALS | ARRAY |
| GET | `/vista/or/rpc/orqpt-default-patient-list` | ORQPT DEFAULT PATIENT LIST | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqpt-providers` | ORQPT PROVIDERS | ARRAY |
| GET | `/vista/or/rpc/orqpt-provider-patients` | ORQPT PROVIDER PATIENTS | ARRAY |
| GET | `/vista/or/rpc/orqpt-clinic-patients` | ORQPT CLINIC PATIENTS | ARRAY |
| GET | `/vista/or/rpc/orqpt-specialties` | ORQPT SPECIALTIES | ARRAY |
| GET | `/vista/or/rpc/orqpt-specialty-patients` | ORQPT SPECIALTY PATIENTS | ARRAY |
| GET | `/vista/or/rpc/orqpt-teams` | ORQPT TEAMS | ARRAY |
| GET | `/vista/or/rpc/orqpt-team-patients` | ORQPT TEAM PATIENTS | ARRAY |
| GET | `/vista/or/rpc/orqpt-ward-patients` | ORQPT WARD PATIENTS | ARRAY |
| GET | `/vista/or/rpc/orqpt-clinics` | ORQPT CLINICS | ARRAY |
| GET | `/vista/or/rpc/orqqps-list` | ORQQPS LIST | ARRAY |
| GET | `/vista/or/rpc/orb-follow-up-string` | ORB FOLLOW-UP STRING | SINGLE VALUE |
| POST | `/vista/or/rpc/orb-delete-alert` | ORB DELETE ALERT | SINGLE VALUE |
| GET | `/vista/or/rpc/orqpt-wards` | ORQPT WARDS | ARRAY |
| GET | `/vista/or/rpc/orb-follow-up-type` | ORB FOLLOW-UP TYPE | SINGLE VALUE |
| GET | `/vista/or/rpc/orb-follow-up-array` | ORB FOLLOW-UP ARRAY | ARRAY |
| GET | `/vista/or/rpc/orqor-detail` | ORQOR DETAIL | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqpt-default-list-source` | ORQPT DEFAULT LIST SOURCE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt-id-info` | ORWPT ID INFO | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt-list-all` | ORWPT LIST ALL | ARRAY |
| GET | `/vista/or/rpc/orwuh-popup` | ORWUH POPUP | ARRAY |
| GET | `/vista/or/rpc/orwlr-cumulative-report` | ORWLR CUMULATIVE REPORT | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqqvs-visits/appts` | ORQQVS VISITS/APPTS | ARRAY |
| GET | `/vista/or/rpc/orqqpp-list` | ORQQPP LIST | ARRAY |
| GET | `/vista/or/rpc/orqpt-wardrmbed` | ORQPT WARDRMBED | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpx-immun-list` | ORQQPX IMMUN LIST | ARRAY |
| GET | `/vista/or/rpc/orqor-list` | ORQOR LIST | ARRAY |
| GET | `/vista/or/rpc/orqqlr-detail` | ORQQLR DETAIL | ARRAY |
| GET | `/vista/or/rpc/orqqvs-detail-notes` | ORQQVS DETAIL NOTES | ARRAY |
| GET | `/vista/or/rpc/orqqvs-detail-summary` | ORQQVS DETAIL SUMMARY | ARRAY |
| GET | `/vista/or/rpc/orqqps-detail` | ORQQPS DETAIL | ARRAY |
| GET | `/vista/or/rpc/orb-sort-method` | ORB SORT METHOD | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqxmb-mail-groups` | ORQQXMB MAIL GROUPS | ARRAY |
| GET | `/vista/or/rpc/orqpt-attending/primary` | ORQPT ATTENDING/PRIMARY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwd-def` | ORWD DEF | ARRAY |
| GET | `/vista/or/rpc/orq-null-list` | ORQ NULL LIST | ARRAY |
| GET | `/vista/or/rpc/orqqlr-search-range-outpt` | ORQQLR SEARCH RANGE OUTPT | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqal-list-report` | ORQQAL LIST REPORT | ARRAY |
| GET | `/vista/or/rpc/orworr-get` | ORWORR GET | ARRAY |
| GET | `/vista/or/rpc/orwu-userinfo` | ORWU USERINFO | SINGLE VALUE |
| POST | `/vista/or/rpc/orwd-save` | ORWD SAVE | ARRAY |
| POST | `/vista/or/rpc/orwd-sign` | ORWD SIGN | ARRAY |
| GET | `/vista/or/rpc/orwd-oi` | ORWD OI | ARRAY |
| GET | `/vista/or/rpc/orwdlr-def` | ORWDLR DEF | ARRAY |
| GET | `/vista/or/rpc/orwdlr-load` | ORWDLR LOAD | ARRAY |
| GET | `/vista/or/rpc/orqpt-patient-team-providers` | ORQPT PATIENT TEAM PROVIDERS | ARRAY |
| GET | `/vista/or/rpc/orwdlr-abbspec` | ORWDLR ABBSPEC | ARRAY |
| GET | `/vista/or/rpc/orwdlr-allsamp` | ORWDLR ALLSAMP | ARRAY |
| GET | `/vista/or/rpc/orwdlr-oiparam` | ORWDLR OIPARAM | ARRAY |
| GET | `/vista/or/rpc/orwu-validsig` | ORWU VALIDSIG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt-apptlst` | ORWPT APPTLST | ARRAY |
| GET | `/vista/or/rpc/orwu-hosploc` | ORWU HOSPLOC | ARRAY |
| GET | `/vista/or/rpc/orwpt-admitlst` | ORWPT ADMITLST | ARRAY |
| GET | `/vista/or/rpc/orwd-formid` | ORWD FORMID | SINGLE VALUE |
| GET | `/vista/or/rpc/orwd-get4edit` | ORWD GET4EDIT | ARRAY |
| GET | `/vista/or/rpc/orwd-validact` | ORWD VALIDACT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwd-saveact` | ORWD SAVEACT | ARRAY |
| GET | `/vista/or/rpc/orwd-dt` | ORWD DT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdcslt-look200` | ORWDCSLT LOOK200 | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdcslt-def` | ORWDCSLT DEF | ARRAY |
| GET | `/vista/or/rpc/orwd-provkey` | ORWD PROVKEY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdgx-load` | ORWDGX LOAD | ARRAY |
| GET | `/vista/or/rpc/orwdps-load` | ORWDPS LOAD | ARRAY |
| GET | `/vista/or/rpc/orwdra-def` | ORWDRA DEF | ARRAY |
| GET | `/vista/or/rpc/orwdgx-vmdef` | ORWDGX VMDEF | ARRAY |
| GET | `/vista/or/rpc/orwdps-def` | ORWDPS DEF | ARRAY |
| GET | `/vista/or/rpc/orwdlr-stop` | ORWDLR STOP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu-newpers` | ORWU NEWPERS | ARRAY |
| GET | `/vista/or/rpc/orwu-device` | ORWU DEVICE | ARRAY |
| GET | `/vista/or/rpc/orwra-imaging-exams` | ORWRA IMAGING EXAMS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwra-report-text` | ORWRA REPORT TEXT | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqqpl-problem-list` | ORQQPL PROBLEM LIST | ARRAY |
| GET | `/vista/or/rpc/orwrp-report-lists` | ORWRP REPORT LISTS | ARRAY |
| GET | `/vista/or/rpc/orqqpl-user-prob-cats` | ORQQPL USER PROB CATS | ARRAY |
| GET | `/vista/or/rpc/orqqpl-user-prob-list` | ORQQPL USER PROB LIST | ARRAY |
| GET | `/vista/or/rpc/orqqpl-problem-lex-search` | ORQQPL PROBLEM LEX SEARCH | ARRAY |
| GET | `/vista/or/rpc/orqqpl-edit-load` | ORQQPL EDIT LOAD | ARRAY |
| GET | `/vista/or/rpc/orqqpl-init-pt` | ORQQPL INIT PT | ARRAY |
| GET | `/vista/or/rpc/orwrp-report-text` | ORWRP REPORT TEXT | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqqpl-provider-list` | ORQQPL PROVIDER LIST | ARRAY |
| GET | `/vista/or/rpc/orwrp-print-report` | ORWRP PRINT REPORT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwlr-report-lists` | ORWLR REPORT LISTS | GLOBAL ARRAY |
| POST | `/vista/or/rpc/orqqpl-edit-save` | ORQQPL EDIT SAVE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwlr-cumulative-section` | ORWLR CUMULATIVE SECTION | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqqpl-clin-srch` | ORQQPL CLIN SRCH | ARRAY |
| POST | `/vista/or/rpc/orqqpl-add-save` | ORQQPL ADD SAVE | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpl-init-user` | ORQQPL INIT USER | ARRAY |
| POST | `/vista/or/rpc/orqqpl-update` | ORQQPL UPDATE | ARRAY |
| POST | `/vista/or/rpc/orqqpl-delete` | ORQQPL DELETE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwra-print-report` | ORWRA PRINT REPORT | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpl-audit-hist` | ORQQPL AUDIT HIST | ARRAY |
| GET | `/vista/or/rpc/orqqpl-replace` | ORQQPL REPLACE | SINGLE VALUE |
| POST | `/vista/or/rpc/orqqpl-verify` | ORQQPL VERIFY | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpl-prov-filter-list` | ORQQPL PROV FILTER LIST | ARRAY |
| GET | `/vista/or/rpc/orqqpl-clin-filter-list` | ORQQPL CLIN FILTER LIST | ARRAY |
| GET | `/vista/or/rpc/orwdps-inpt` | ORWDPS INPT | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpl-serv-filter-list` | ORQQPL SERV FILTER LIST | ARRAY |
| GET | `/vista/or/rpc/orwdps-outpt` | ORWDPS OUTPT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwcs-list-of-consult-reports` | ORWCS LIST OF CONSULT REPORTS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwcs-report-text` | ORWCS REPORT TEXT | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwcs-print-report` | ORWCS PRINT REPORT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwd-key` | ORWD KEY | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpl-srvc-srch` | ORQQPL SRVC SRCH | ARRAY |
| GET | `/vista/or/rpc/orqqlr-search-range-inpt` | ORQQLR SEARCH RANGE INPT | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpx-reminders-list` | ORQQPX REMINDERS LIST | ARRAY |
| GET | `/vista/or/rpc/orwpt-last5` | ORWPT LAST5 | ARRAY |
| GET | `/vista/or/rpc/orwu-dt` | ORWU DT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt-clinrng` | ORWPT CLINRNG | ARRAY |
| GET | `/vista/or/rpc/orwu-clinloc` | ORWU CLINLOC | ARRAY |
| GET | `/vista/or/rpc/orwpt-top` | ORWPT TOP | ARRAY |
| GET | `/vista/or/rpc/orwpt-selchk` | ORWPT SELCHK | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt-select` | ORWPT SELECT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt-enctitl` | ORWPT ENCTITL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwlrr-atomics` | ORWLRR ATOMICS | ARRAY |
| GET | `/vista/or/rpc/orwlrr-spec` | ORWLRR SPEC | ARRAY |
| GET | `/vista/or/rpc/orwlrr-alltests` | ORWLRR ALLTESTS | ARRAY |
| GET | `/vista/or/rpc/orwlrr-users` | ORWLRR USERS | ARRAY |
| GET | `/vista/or/rpc/orwlrr-tg` | ORWLRR TG | ARRAY |
| GET | `/vista/or/rpc/orwlrr-atests` | ORWLRR ATESTS | ARRAY |
| GET | `/vista/or/rpc/orwlrr-atg` | ORWLRR ATG | ARRAY |
| GET | `/vista/or/rpc/orwlrr-utga` | ORWLRR UTGA | ARRAY |
| GET | `/vista/or/rpc/orwlrr-utgr` | ORWLRR UTGR | ARRAY |
| GET | `/vista/or/rpc/orwlrr-utgd` | ORWLRR UTGD | ARRAY |
| GET | `/vista/or/rpc/orwlrr-interim` | ORWLRR INTERIM | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwlrr-interims` | ORWLRR INTERIMS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwlrr-grid` | ORWLRR GRID | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwpt16-id-info` | ORWPT16 ID INFO | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt16-list-all` | ORWPT16 LIST ALL | ARRAY |
| GET | `/vista/or/rpc/orwpt16-lookup` | ORWPT16 LOOKUP | ARRAY |
| GET | `/vista/or/rpc/orwpt16-demog` | ORWPT16 DEMOG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt16-getvsit` | ORWPT16 GETVSIT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt16-apptlst` | ORWPT16 APPTLST | ARRAY |
| GET | `/vista/or/rpc/orwpt16-admitlst` | ORWPT16 ADMITLST | ARRAY |
| GET | `/vista/or/rpc/orwpt16-pscnvt` | ORWPT16 PSCNVT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu16-userinfo` | ORWU16 USERINFO | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu16-validsig` | ORWU16 VALIDSIG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu16-hosploc` | ORWU16 HOSPLOC | ARRAY |
| GET | `/vista/or/rpc/orwu16-valdt` | ORWU16 VALDT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu16-newpers` | ORWU16 NEWPERS | ARRAY |
| GET | `/vista/or/rpc/orwu16-device` | ORWU16 DEVICE | ARRAY |
| GET | `/vista/or/rpc/orwlrr-interimg` | ORWLRR INTERIMG | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwu-extname` | ORWU EXTNAME | SINGLE VALUE |
| GET | `/vista/or/rpc/orwlrr-newold` | ORWLRR NEWOLD | SINGLE VALUE |
| GET | `/vista/or/rpc/orwlrr-micro` | ORWLRR MICRO | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwlrr-chart` | ORWLRR CHART | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwlrr-chemtest` | ORWLRR CHEMTEST | ARRAY |
| GET | `/vista/or/rpc/orwlrr-param` | ORWLRR PARAM | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt-ptinq` | ORWPT PTINQ | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwpce-diag` | ORWPCE DIAG | ARRAY |
| GET | `/vista/or/rpc/orwpce-proc` | ORWPCE PROC | ARRAY |
| GET | `/vista/or/rpc/orwpce-visit` | ORWPCE VISIT | ARRAY |
| GET | `/vista/or/rpc/orwrp16-report-text` | ORWRP16 REPORT TEXT | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwrp16-report-lists` | ORWRP16 REPORT LISTS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqqpx-reminder-detail` | ORQQPX REMINDER DETAIL | ARRAY |
| GET | `/vista/or/rpc/orwpce-scdis` | ORWPCE SCDIS | ARRAY |
| GET | `/vista/or/rpc/orwpce-scsel` | ORWPCE SCSEL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwux-symtab` | ORWUX SYMTAB | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwpce-pce4note` | ORWPCE PCE4NOTE | ARRAY |
| GET | `/vista/or/rpc/orwordg-mapseq` | ORWORDG MAPSEQ | ARRAY |
| GET | `/vista/or/rpc/orwu-toolmenu` | ORWU TOOLMENU | ARRAY |
| GET | `/vista/or/rpc/orwu-haskey` | ORWU HASKEY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwordg-alltree` | ORWORDG ALLTREE | ARRAY |
| GET | `/vista/or/rpc/orwordg-revsts` | ORWORDG REVSTS | ARRAY |
| GET | `/vista/or/rpc/orwordg-ien` | ORWORDG IEN | SINGLE VALUE |
| POST | `/vista/or/rpc/orwpce-save` | ORWPCE SAVE | ARRAY |
| GET | `/vista/or/rpc/orwpce-cptreqd` | ORWPCE CPTREQD | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-notevstr` | ORWPCE NOTEVSTR | SINGLE VALUE |
| POST | `/vista/or/rpc/orwpce-delete` | ORWPCE DELETE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-lex` | ORWPCE LEX | ARRAY |
| GET | `/vista/or/rpc/orwpce-lexcode` | ORWPCE LEXCODE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwch-loadall` | ORWCH LOADALL | ARRAY |
| GET | `/vista/or/rpc/orwch-savesiz` | ORWCH SAVESIZ | SINGLE VALUE |
| GET | `/vista/or/rpc/orwch-saveall` | ORWCH SAVEALL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwrp1-listnutr` | ORWRP1 LISTNUTR | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqqvi1-grid` | ORQQVI1 GRID | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwps-active` | ORWPS ACTIVE | ARRAY |
| GET | `/vista/or/rpc/orwpt-dfltsrc` | ORWPT DFLTSRC | SINGLE VALUE |
| GET | `/vista/or/rpc/orwps-detail` | ORWPS DETAIL | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwu-patch` | ORWU PATCH | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt-share` | ORWPT SHARE | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-list` | ORQQCN LIST | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqqcn-detail` | ORQQCN DETAIL | GLOBAL ARRAY |
| GET | `/vista/or/rpc/ork-trigger` | ORK TRIGGER | ARRAY |
| GET | `/vista/or/rpc/orwu-generic` | ORWU GENERIC | ARRAY |
| GET | `/vista/or/rpc/orqqcn-receive` | ORQQCN RECEIVE | SINGLE VALUE |
| POST | `/vista/or/rpc/orqqcn-discontinue` | ORQQCN DISCONTINUE | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-forward` | ORQQCN FORWARD | SINGLE VALUE |
| POST | `/vista/or/rpc/orqqcn-set-act-menus` | ORQQCN SET ACT MENUS | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-urgencies` | ORQQCN URGENCIES | ARRAY |
| GET | `/vista/or/rpc/orqqcn-addcmt` | ORQQCN ADDCMT | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-get-consult` | ORQQCN GET CONSULT | ARRAY |
| GET | `/vista/or/rpc/orwdx-orditm` | ORWDX ORDITM | ARRAY |
| GET | `/vista/or/rpc/orwdx-dlgdef` | ORWDX DLGDEF | ARRAY |
| GET | `/vista/or/rpc/orwdx-dlgquik` | ORWDX DLGQUIK | ARRAY |
| GET | `/vista/or/rpc/orwpce-imm` | ORWPCE IMM | ARRAY |
| GET | `/vista/or/rpc/orwpce-sk` | ORWPCE SK | ARRAY |
| GET | `/vista/or/rpc/orwpce-ped` | ORWPCE PED | ARRAY |
| GET | `/vista/or/rpc/orwpce-hf` | ORWPCE HF | ARRAY |
| GET | `/vista/or/rpc/orwpce-trt` | ORWPCE TRT | ARRAY |
| GET | `/vista/or/rpc/orwpce-xam` | ORWPCE XAM | ARRAY |
| POST | `/vista/or/rpc/orwpce-get-set-of-codes` | ORWPCE GET SET OF CODES | ARRAY |
| GET | `/vista/or/rpc/orwpce-get-immunization-type` | ORWPCE GET IMMUNIZATION TYPE | ARRAY |
| GET | `/vista/or/rpc/orwpce-get-skin-test-type` | ORWPCE GET SKIN TEST TYPE | ARRAY |
| GET | `/vista/or/rpc/orwpce-get-education-topics` | ORWPCE GET EDUCATION TOPICS | ARRAY |
| GET | `/vista/or/rpc/orwpce-get-health-factors-ty` | ORWPCE GET HEALTH FACTORS TY | ARRAY |
| GET | `/vista/or/rpc/orwpce-get-exam-type` | ORWPCE GET EXAM TYPE | ARRAY |
| GET | `/vista/or/rpc/orwpce-get-treatment-type` | ORWPCE GET TREATMENT TYPE | ARRAY |
| GET | `/vista/or/rpc/orqqcn-svctree` | ORQQCN SVCTREE | ARRAY |
| GET | `/vista/or/rpc/orwdcn32-def` | ORWDCN32 DEF | ARRAY |
| GET | `/vista/or/rpc/orqqcn-status` | ORQQCN STATUS | ARRAY |
| GET | `/vista/or/rpc/orqqcn-med-results` | ORQQCN MED RESULTS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwdra32-def` | ORWDRA32 DEF | ARRAY |
| POST | `/vista/or/rpc/orwdx-save` | ORWDX SAVE | ARRAY |
| GET | `/vista/or/rpc/orwdps32-dlgslct` | ORWDPS32 DLGSLCT | ARRAY |
| GET | `/vista/or/rpc/orwdps32-oislct` | ORWDPS32 OISLCT | ARRAY |
| GET | `/vista/or/rpc/orwdps32-allroute` | ORWDPS32 ALLROUTE | ARRAY |
| GET | `/vista/or/rpc/orqqvi-vitals-for-date-range` | ORQQVI VITALS FOR DATE RANGE | ARRAY |
| GET | `/vista/or/rpc/orqqvi2-vitals-help` | ORQQVI2 VITALS HELP | ARRAY |
| GET | `/vista/or/rpc/orqqvi2-vitals-rate-check` | ORQQVI2 VITALS RATE CHECK | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqvi2-vitals-validate` | ORQQVI2 VITALS VALIDATE | ARRAY |
| GET | `/vista/or/rpc/orqqvi2-vitals-validate-type` | ORQQVI2 VITALS VALIDATE TYPE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdlr32-def` | ORWDLR32 DEF | ARRAY |
| GET | `/vista/or/rpc/orwdlr32-load` | ORWDLR32 LOAD | ARRAY |
| GET | `/vista/or/rpc/orwdlr32-allsamp` | ORWDLR32 ALLSAMP | ARRAY |
| GET | `/vista/or/rpc/orwdlr32-abbspec` | ORWDLR32 ABBSPEC | ARRAY |
| GET | `/vista/or/rpc/orwdlr32-stop` | ORWDLR32 STOP | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqvi2-vitals-val-&-store` | ORQQVI2 VITALS VAL & STORE | ARRAY |
| GET | `/vista/or/rpc/orwdx-send` | ORWDX SEND | ARRAY |
| GET | `/vista/or/rpc/orwdps32-auth` | ORWDPS32 AUTH | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps32-drugmsg` | ORWDPS32 DRUGMSG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps32-medisiv` | ORWDPS32 MEDISIV | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps32-formalt` | ORWDPS32 FORMALT | ARRAY |
| GET | `/vista/or/rpc/orwdx-wrlst` | ORWDX WRLST | ARRAY |
| GET | `/vista/or/rpc/orqqcn-show-sf513` | ORQQCN SHOW SF513 | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqqcn-print-sf513` | ORQQCN PRINT SF513 | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdra32-procmsg` | ORWDRA32 PROCMSG | ARRAY |
| GET | `/vista/or/rpc/orwdcn32-ordrmsg` | ORWDCN32 ORDRMSG | ARRAY |
| GET | `/vista/or/rpc/orwdra32-raorditm` | ORWDRA32 RAORDITM | ARRAY |
| GET | `/vista/or/rpc/orwdra32-isolatn` | ORWDRA32 ISOLATN | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdra32-approval` | ORWDRA32 APPROVAL | ARRAY |
| GET | `/vista/or/rpc/orwdxa-valid` | ORWDXA VALID | SINGLE VALUE |
| POST | `/vista/or/rpc/orwdxa-hold` | ORWDXA HOLD | ARRAY |
| GET | `/vista/or/rpc/orwdxa-unhold` | ORWDXA UNHOLD | ARRAY |
| POST | `/vista/or/rpc/orwdxa-dc` | ORWDXA DC | ARRAY |
| GET | `/vista/or/rpc/orwdxa-dcreason` | ORWDXA DCREASON | ARRAY |
| GET | `/vista/or/rpc/orwdxa-alert` | ORWDXA ALERT | SINGLE VALUE |
| POST | `/vista/or/rpc/orwdxa-flag` | ORWDXA FLAG | ARRAY |
| GET | `/vista/or/rpc/orwdxa-unflag` | ORWDXA UNFLAG | ARRAY |
| GET | `/vista/or/rpc/orwdxa-flagtxt` | ORWDXA FLAGTXT | ARRAY |
| POST | `/vista/or/rpc/orwdxa-complete` | ORWDXA COMPLETE | ARRAY |
| POST | `/vista/or/rpc/orwdxa-verify` | ORWDXA VERIFY | ARRAY |
| GET | `/vista/or/rpc/orwdps32-scsts` | ORWDPS32 SCSTS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwor-result` | ORWOR RESULT | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwdxa-wcget` | ORWDXA WCGET | ARRAY |
| GET | `/vista/or/rpc/orwdxa-wcput` | ORWDXA WCPUT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdra32-imtypsel` | ORWDRA32 IMTYPSEL | ARRAY |
| GET | `/vista/or/rpc/orwdxq-dlgname` | ORWDXQ DLGNAME | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxq-getqlst` | ORWDXQ GETQLST | ARRAY |
| GET | `/vista/or/rpc/orwpce-active-prov` | ORWPCE ACTIVE PROV | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdlr32-maxdays` | ORWDLR32 MAXDAYS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxq-putqlst` | ORWDXQ PUTQLST | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxq-putqnam` | ORWDXQ PUTQNAM | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxq-dlgsave` | ORWDXQ DLGSAVE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxq-getqnam` | ORWDXQ GETQNAM | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdx-loadrsp` | ORWDX LOADRSP | ARRAY |
| GET | `/vista/or/rpc/orwdx-formid` | ORWDX FORMID | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxr-isrel` | ORWDXR ISREL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwordg-grpseqb` | ORWORDG GRPSEQB | ARRAY |
| GET | `/vista/or/rpc/orwdxr-rnwflds` | ORWDXR RNWFLDS | ARRAY |
| GET | `/vista/or/rpc/orwu-valdt` | ORWU VALDT | SINGLE VALUE |
| POST | `/vista/or/rpc/orwdxr-renew` | ORWDXR RENEW | ARRAY |
| GET | `/vista/or/rpc/orwdra32-radsrc` | ORWDRA32 RADSRC | ARRAY |
| GET | `/vista/or/rpc/orwmc-patient-procedures` | ORWMC PATIENT PROCEDURES | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwdlr32-allspec` | ORWDLR32 ALLSPEC | ARRAY |
| GET | `/vista/or/rpc/orwpt-discharge` | ORWPT DISCHARGE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwps-cover` | ORWPS COVER | ARRAY |
| GET | `/vista/or/rpc/orwcv-vst` | ORWCV VST | ARRAY |
| GET | `/vista/or/rpc/orwcv-lab` | ORWCV LAB | ARRAY |
| GET | `/vista/or/rpc/orwcv-start` | ORWCV START | SINGLE VALUE |
| GET | `/vista/or/rpc/orwcv-dtlvst` | ORWCV DTLVST | ARRAY |
| GET | `/vista/or/rpc/orwcv-poll` | ORWCV POLL | ARRAY |
| GET | `/vista/or/rpc/orwcv-stop` | ORWCV STOP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt-savdflt` | ORWPT SAVDFLT | SINGLE VALUE |
| GET | `/vista/or/rpc/orworr-get4lst` | ORWORR GET4LST | ARRAY |
| GET | `/vista/or/rpc/orworr-aget` | ORWORR AGET | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqqvi-notevit` | ORQQVI NOTEVIT | ARRAY |
| GET | `/vista/or/rpc/orqqcn-sigfind` | ORQQCN SIGFIND | SINGLE VALUE |
| POST | `/vista/or/rpc/orqqcn-admin-complete` | ORQQCN ADMIN COMPLETE | SINGLE VALUE |
| GET | `/vista/or/rpc/orworb-fastuser` | ORWORB FASTUSER | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqorb-sort` | ORQORB SORT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu-versrv` | ORWU VERSRV | SINGLE VALUE |
| POST | `/vista/or/rpc/orwdx-lock` | ORWDX LOCK | SINGLE VALUE |
| POST | `/vista/or/rpc/orwdx-unlock` | ORWDX UNLOCK | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps32-ivamt` | ORWDPS32 IVAMT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps32-valrate` | ORWDPS32 VALRATE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdor-vmslct` | ORWDOR VMSLCT | ARRAY |
| GET | `/vista/or/rpc/orwpce-actprob` | ORWPCE ACTPROB | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orworb-getdata` | ORWORB GETDATA | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-find-consult` | ORQQCN FIND CONSULT | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-get-proc-svcs` | ORQQCN GET PROC SVCS | ARRAY |
| GET | `/vista/or/rpc/orwdfh-txt` | ORWDFH TXT | ARRAY |
| GET | `/vista/or/rpc/orwdfh-param` | ORWDFH PARAM | ARRAY |
| GET | `/vista/or/rpc/orwdfh-tfprod` | ORWDFH TFPROD | ARRAY |
| GET | `/vista/or/rpc/orwdfh-attr` | ORWDFH ATTR | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdfh-diets` | ORWDFH DIETS | ARRAY |
| GET | `/vista/or/rpc/orwdfh-qty2cc` | ORWDFH QTY2CC | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdx-msg` | ORWDX MSG | ARRAY |
| GET | `/vista/or/rpc/orwdx-dgrp` | ORWDX DGRP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxa-dcreqien` | ORWDXA DCREQIEN | SINGLE VALUE |
| GET | `/vista/or/rpc/orworr-gettxt` | ORWORR GETTXT | ARRAY |
| GET | `/vista/or/rpc/orwdfh-addlate` | ORWDFH ADDLATE | ARRAY |
| GET | `/vista/or/rpc/orwdfh-isoien` | ORWDFH ISOIEN | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdfh-curiso` | ORWDFH CURISO | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdfh-isolist` | ORWDFH ISOLIST | ARRAY |
| GET | `/vista/or/rpc/orwdfh-findtyp` | ORWDFH FINDTYP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps32-issply` | ORWDPS32 ISSPLY | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-get-order-number` | ORQQCN GET ORDER NUMBER | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdlr32-lab-coll-time` | ORWDLR32 LAB COLL TIME | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxm-menu` | ORWDXM MENU | ARRAY |
| GET | `/vista/or/rpc/orwdxm-formid` | ORWDXM FORMID | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxm-prompts` | ORWDXM PROMPTS | ARRAY |
| GET | `/vista/or/rpc/orwdxm-dlgname` | ORWDXM DLGNAME | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt1-prcare` | ORWPT1 PRCARE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt1-pcdetail` | ORWPT1 PCDETAIL | ARRAY |
| GET | `/vista/or/rpc/orwu-nphaskey` | ORWU NPHASKEY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdx-dlgid` | ORWDX DLGID | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps32-valsch` | ORWDPS32 VALSCH | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps32-valqty` | ORWDPS32 VALQTY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxm-autoack` | ORWDXM AUTOACK | ARRAY |
| GET | `/vista/or/rpc/orwu-gblref` | ORWU GBLREF | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdx-again` | ORWDX AGAIN | SINGLE VALUE |
| GET | `/vista/or/rpc/orwuxt-lst` | ORWUXT LST | ARRAY |
| GET | `/vista/or/rpc/orwuxt-val` | ORWUXT VAL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwuxt-ref` | ORWUXT REF | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwdlr32-immed-collect` | ORWDLR32 IMMED COLLECT | ARRAY |
| GET | `/vista/or/rpc/orwdlr32-ic-default` | ORWDLR32 IC DEFAULT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdlr32-ic-valid` | ORWDLR32 IC VALID | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpl-prob-comments` | ORQQPL PROB COMMENTS | ARRAY |
| GET | `/vista/or/rpc/orwdxc-on` | ORWDXC ON | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxc-display` | ORWDXC DISPLAY | ARRAY |
| GET | `/vista/or/rpc/orwdxc-fillid` | ORWDXC FILLID | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxc-accept` | ORWDXC ACCEPT | ARRAY |
| GET | `/vista/or/rpc/orwdxc-savechk` | ORWDXC SAVECHK | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxc-session` | ORWDXC SESSION | ARRAY |
| GET | `/vista/or/rpc/orwdxc-delord` | ORWDXC DELORD | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-resubmit` | ORQQCN RESUBMIT | SINGLE VALUE |
| GET | `/vista/or/rpc/orworb-kill-unsig-orders-alert` | ORWORB KILL UNSIG ORDERS ALERT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdcn32-procedures` | ORWDCN32 PROCEDURES | ARRAY |
| GET | `/vista/or/rpc/orqqcn-load-for-edit` | ORQQCN LOAD FOR EDIT | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orworr-getbyifn` | ORWORR GETBYIFN | ARRAY |
| GET | `/vista/or/rpc/orwdal32-allergy-match` | ORWDAL32 ALLERGY MATCH | ARRAY |
| GET | `/vista/or/rpc/orwdal32-def` | ORWDAL32 DEF | ARRAY |
| GET | `/vista/or/rpc/orwdal32-symptoms` | ORWDAL32 SYMPTOMS | ARRAY |
| GET | `/vista/or/rpc/orqqcn-svclist` | ORQQCN SVCLIST | ARRAY |
| GET | `/vista/or/rpc/orwps1-newdlg` | ORWPS1 NEWDLG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwps1-pickup` | ORWPS1 PICKUP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwps1-refill` | ORWPS1 REFILL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwrp-print-lab-reports` | ORWRP PRINT LAB REPORTS | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpl-inactivate` | ORQQPL INACTIVATE | ARRAY |
| GET | `/vista/or/rpc/orwdxm1-bldqrsp` | ORWDXM1 BLDQRSP | ARRAY |
| GET | `/vista/or/rpc/orwdxm2-clrrcl` | ORWDXM2 CLRRCL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdx-dismsg` | ORWDX DISMSG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt-diedon` | ORWPT DIEDON | SINGLE VALUE |
| GET | `/vista/or/rpc/orwd1-param` | ORWD1 PARAM | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt-cwad` | ORWPT CWAD | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdx-sendp` | ORWDX SENDP | ARRAY |
| GET | `/vista/or/rpc/orwd1-printgui` | ORWD1 PRINTGUI | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqvi1-detail` | ORQQVI1 DETAIL | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwor-sheets` | ORWOR SHEETS | ARRAY |
| GET | `/vista/or/rpc/orwor-tsall` | ORWOR TSALL | ARRAY |
| GET | `/vista/or/rpc/orwd1-rvprint` | ORWD1 RVPRINT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwd2-devinfo` | ORWD2 DEVINFO | ARRAY |
| GET | `/vista/or/rpc/orwd2-manual` | ORWD2 MANUAL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxm-mstyle` | ORWDXM MSTYLE | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpl-saveview` | ORQQPL SAVEVIEW | ARRAY |
| GET | `/vista/or/rpc/orwgept-clinrng` | ORWGEPT CLINRNG | ARRAY |
| GET | `/vista/or/rpc/orwdlr32-one-sample` | ORWDLR32 ONE SAMPLE | ARRAY |
| GET | `/vista/or/rpc/orwdlr32-one-specimen` | ORWDLR32 ONE SPECIMEN | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu-inploc` | ORWU INPLOC | ARRAY |
| GET | `/vista/or/rpc/orwdra32-loctype` | ORWDRA32 LOCTYPE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps32-doses` | ORWDPS32 DOSES | ARRAY |
| GET | `/vista/or/rpc/orwpt-fullssn` | ORWPT FULLSSN | ARRAY |
| GET | `/vista/or/rpc/orqqcn2-get-context` | ORQQCN2 GET CONTEXT | SINGLE VALUE |
| POST | `/vista/or/rpc/orqqcn2-save-context` | ORQQCN2 SAVE CONTEXT | ARRAY |
| GET | `/vista/or/rpc/orwtiu-get-tiu-context` | ORWTIU GET TIU CONTEXT | SINGLE VALUE |
| POST | `/vista/or/rpc/orwtiu-save-tiu-context` | ORWTIU SAVE TIU CONTEXT | ARRAY |
| GET | `/vista/or/rpc/orwtiu-get-dcsumm-context` | ORWTIU GET DCSUMM CONTEXT | SINGLE VALUE |
| POST | `/vista/or/rpc/orwtiu-save-dcsumm-context` | ORWTIU SAVE DCSUMM CONTEXT | ARRAY |
| GET | `/vista/or/rpc/orworb-autounflag-orders` | ORWORB AUTOUNFLAG ORDERS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwra-default-exam-settings` | ORWRA DEFAULT EXAM SETTINGS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxm-loadset` | ORWDXM LOADSET | ARRAY |
| GET | `/vista/or/rpc/orwdxc-delay` | ORWDXC DELAY | ARRAY |
| GET | `/vista/or/rpc/orwch-loadsiz` | ORWCH LOADSIZ | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpl-problem-ntrt-bulletin` | ORQQPL PROBLEM NTRT BULLETIN | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-get-dx-text` | ORWPCE GET DX TEXT | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-isprosvc` | ORQQCN ISPROSVC | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps33-getaddfr` | ORWDPS33 GETADDFR | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpx-others-reminders` | ORQQPX OTHERS REMINDERS | ARRAY |
| GET | `/vista/or/rpc/orqqpl-check-dup` | ORQQPL CHECK DUP | SINGLE VALUE |
| GET | `/vista/or/rpc/orcheck-ismono` | ORCHECK ISMONO | SINGLE VALUE |
| GET | `/vista/or/rpc/orcheck-getmono` | ORCHECK GETMONO | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orcheck-getmonol` | ORCHECK GETMONOL | ARRAY |
| GET | `/vista/or/rpc/orcheck-delmono` | ORCHECK DELMONO | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-default-request-reason` | ORQQCN DEFAULT REQUEST REASON | GLOBAL ARRAY |
| POST | `/vista/or/rpc/orwdx-lock-order` | ORWDX LOCK ORDER | SINGLE VALUE |
| POST | `/vista/or/rpc/orwdx-unlock-order` | ORWDX UNLOCK ORDER | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdcn32-newdlg` | ORWDCN32 NEWDLG | SINGLE VALUE |
| GET | `/vista/or/rpc/orqtl-user-teams` | ORQTL USER TEAMS | ARRAY |
| GET | `/vista/or/rpc/orqtl-team-list-patients` | ORQTL TEAM LIST PATIENTS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqtl-team-list-info` | ORQTL TEAM LIST INFO | ARRAY |
| GET | `/vista/or/rpc/orqtl-team-list-users` | ORQTL TEAM LIST USERS | ARRAY |
| GET | `/vista/or/rpc/orqtl-existing-team-autolinks` | ORQTL EXISTING TEAM AUTOLINKS | ARRAY |
| GET | `/vista/or/rpc/orqtl-all-user-teams-patients` | ORQTL ALL USER TEAMS PATIENTS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqqcn-get-service-ien` | ORQQCN GET SERVICE IEN | SINGLE VALUE |
| GET | `/vista/or/rpc/orcheck-getxtra` | ORCHECK GETXTRA | ARRAY |
| GET | `/vista/or/rpc/orcnote-get-total` | ORCNOTE GET TOTAL | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-provdx` | ORQQCN PROVDX | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxvb3-diagord` | ORWDXVB3 DIAGORD | ARRAY |
| GET | `/vista/or/rpc/orwpt-byward` | ORWPT BYWARD | ARRAY |
| GET | `/vista/or/rpc/orwpt-legacy` | ORWPT LEGACY | ARRAY |
| GET | `/vista/or/rpc/orwdxvb3-colltim` | ORWDXVB3 COLLTIM | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxvb3-swpanel` | ORWDXVB3 SWPANEL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwrp-print-windows-report` | ORWRP PRINT WINDOWS REPORT | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqqcn-sf513-windows-print` | ORQQCN SF513 WINDOWS PRINT | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwrp-winprint-lab-reports` | ORWRP WINPRINT LAB REPORTS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwcirn-faclist` | ORWCIRN FACLIST | ARRAY |
| GET | `/vista/or/rpc/orwdlr32-get-lab-times` | ORWDLR32 GET LAB TIMES | ARRAY |
| GET | `/vista/or/rpc/orwrp-winprint-default` | ORWRP WINPRINT DEFAULT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwrp-get-default-printer` | ORWRP GET DEFAULT PRINTER | SINGLE VALUE |
| POST | `/vista/or/rpc/orwrp-save-default-printer` | ORWRP SAVE DEFAULT PRINTER | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-edit-default-reason` | ORQQCN EDIT DEFAULT REASON | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtiu-winprint-note` | ORWTIU WINPRINT NOTE | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwrp2-hs-components` | ORWRP2 HS COMPONENTS | ARRAY |
| GET | `/vista/or/rpc/orwrp2-hs-comp-files` | ORWRP2 HS COMP FILES | ARRAY |
| GET | `/vista/or/rpc/orwrp2-hs-report-text` | ORWRP2 HS REPORT TEXT | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwrp2-hs-file-lookup` | ORWRP2 HS FILE LOOKUP | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwrp2-hs-subitems` | ORWRP2 HS SUBITEMS | ARRAY |
| GET | `/vista/or/rpc/orqqpx-get-hist-locations` | ORQQPX GET HIST LOCATIONS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqqpx-new-reminders-active` | ORQQPX NEW REMINDERS ACTIVE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-get-visit` | ORWPCE GET VISIT | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-canedit` | ORQQCN CANEDIT | SINGLE VALUE |
| GET | `/vista/or/rpc/orworb-kill-expir-med-alert` | ORWORB KILL EXPIR MED ALERT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-mhclinic` | ORWPCE MHCLINIC | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-gafok` | ORWPCE GAFOK | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-loadgaf` | ORWPCE LOADGAF | ARRAY |
| GET | `/vista/or/rpc/orwpce-savegaf` | ORWPCE SAVEGAF | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-force` | ORWPCE FORCE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps32-valroute` | ORWDPS32 VALROUTE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwor-vwget` | ORWOR VWGET | SINGLE VALUE |
| GET | `/vista/or/rpc/orwor-vwset` | ORWOR VWSET | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu-param` | ORWU PARAM | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdor-lkscrn` | ORWDOR LKSCRN | ARRAY |
| GET | `/vista/or/rpc/orwdor-valnum` | ORWDOR VALNUM | SINGLE VALUE |
| GET | `/vista/or/rpc/orworb-unsig-orders-followup` | ORWORB UNSIG ORDERS FOLLOWUP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtiu-get-listbox-item` | ORWTIU GET LISTBOX ITEM | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-hascpt` | ORWPCE HASCPT | ARRAY |
| GET | `/vista/or/rpc/orwpce-askpce` | ORWPCE ASKPCE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-gafurl` | ORWPCE GAFURL | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpxrm-education-subtopics` | ORQQPXRM EDUCATION SUBTOPICS | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-education-summary` | ORQQPXRM EDUCATION SUMMARY | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-education-topic` | ORQQPXRM EDUCATION TOPIC | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-mental-health` | ORQQPXRM MENTAL HEALTH | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-mental-health-results` | ORQQPXRM MENTAL HEALTH RESULTS | ARRAY |
| POST | `/vista/or/rpc/orqqpxrm-mental-health-save` | ORQQPXRM MENTAL HEALTH SAVE | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-progress-note-header` | ORQQPXRM PROGRESS NOTE HEADER | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpxrm-reminder-categories` | ORQQPXRM REMINDER CATEGORIES | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-reminder-detail` | ORQQPXRM REMINDER DETAIL | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-reminder-dialog` | ORQQPXRM REMINDER DIALOG | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-dialog-prompts` | ORQQPXRM DIALOG PROMPTS | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-reminder-evaluation` | ORQQPXRM REMINDER EVALUATION | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-reminder-inquiry` | ORQQPXRM REMINDER INQUIRY | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-reminder-web` | ORQQPXRM REMINDER WEB | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-reminders-unevaluated` | ORQQPXRM REMINDERS UNEVALUATED | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-reminders-applicable` | ORQQPXRM REMINDERS APPLICABLE | ARRAY |
| GET | `/vista/or/rpc/orwpce-mhtestok` | ORWPCE MHTESTOK | SINGLE VALUE |
| GET | `/vista/or/rpc/orwlrr-info` | ORWLRR INFO | ARRAY |
| GET | `/vista/or/rpc/orwor-unsign` | ORWOR UNSIGN | ARRAY |
| GET | `/vista/or/rpc/orwpt-inploc` | ORWPT INPLOC | SINGLE VALUE |
| GET | `/vista/or/rpc/orwd1-comloc` | ORWD1 COMLOC | SINGLE VALUE |
| GET | `/vista/or/rpc/orwd1-sig4any` | ORWD1 SIG4ANY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwd1-sig4one` | ORWD1 SIG4ONE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdlr33-future-lab-collects` | ORWDLR33 FUTURE LAB COLLECTS | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn2-get-prerequisite` | ORQQCN2 GET PREREQUISITE | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqqcn2-schedule-consult` | ORQQCN2 SCHEDULE CONSULT | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpxrm-dialog-active` | ORQQPXRM DIALOG ACTIVE | ARRAY |
| GET | `/vista/or/rpc/orwpce-mh-test-authorized` | ORWPCE MH TEST AUTHORIZED | SINGLE VALUE |
| GET | `/vista/or/rpc/orwrp-print-remote-report` | ORWRP PRINT REMOTE REPORT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwrp-print-windows-remote` | ORWRP PRINT WINDOWS REMOTE | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwrp-print-lab-remote` | ORWRP PRINT LAB REMOTE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwrp-print-windows-lab-remote` | ORWRP PRINT WINDOWS LAB REMOTE | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwrp2-hs-component-subs` | ORWRP2 HS COMPONENT SUBS | ARRAY |
| GET | `/vista/or/rpc/orwch-savfont` | ORWCH SAVFONT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdlr33-lasttime` | ORWDLR33 LASTTIME | SINGLE VALUE |
| GET | `/vista/or/rpc/orwd1-svonly` | ORWD1 SVONLY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-hasvisit` | ORWPCE HASVISIT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-cptmods` | ORWPCE CPTMODS | ARRAY |
| GET | `/vista/or/rpc/orwpce-getmod` | ORWPCE GETMOD | SINGLE VALUE |
| GET | `/vista/or/rpc/pxrm-reminder-dialog-(tiu)` | PXRM REMINDER DIALOG (TIU) | ARRAY |
| GET | `/vista/or/rpc/orqqcn-assignable-med-results` | ORQQCN ASSIGNABLE MED RESULTS | ARRAY |
| GET | `/vista/or/rpc/orqqcn-removable-med-results` | ORQQCN REMOVABLE MED RESULTS | ARRAY |
| GET | `/vista/or/rpc/orqqcn-get-med-result-details` | ORQQCN GET MED RESULT DETAILS | ARRAY |
| GET | `/vista/or/rpc/orqqcn-attach-med-results` | ORQQCN ATTACH MED RESULTS | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-remove-med-results` | ORQQCN REMOVE MED RESULTS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-gettu` | ORWTPP GETTU | ARRAY |
| GET | `/vista/or/rpc/orwtpp-lsdef` | ORWTPP LSDEF | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-newlist` | ORWTPP NEWLIST | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-plists` | ORWTPP PLISTS | ARRAY |
| GET | `/vista/or/rpc/orwtpp-remlist` | ORWTPP REMLIST | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-savecd` | ORWTPP SAVECD | ARRAY |
| GET | `/vista/or/rpc/orwtpp-savecs` | ORWTPP SAVECS | ARRAY |
| GET | `/vista/or/rpc/orwtpp-savelist` | ORWTPP SAVELIST | ARRAY |
| GET | `/vista/or/rpc/orwtpp-savenot` | ORWTPP SAVENOT | ARRAY |
| GET | `/vista/or/rpc/orwtpp-savenoto` | ORWTPP SAVENOTO | ARRAY |
| GET | `/vista/or/rpc/orwtpp-saveoc` | ORWTPP SAVEOC | ARRAY |
| GET | `/vista/or/rpc/orwtpp-savepld` | ORWTPP SAVEPLD | ARRAY |
| GET | `/vista/or/rpc/orwtpp-setcombo` | ORWTPP SETCOMBO | ARRAY |
| GET | `/vista/or/rpc/orwtpp-setother` | ORWTPP SETOTHER | ARRAY |
| GET | `/vista/or/rpc/orwtpp-setrem` | ORWTPP SETREM | ARRAY |
| GET | `/vista/or/rpc/orwtpp-setsub` | ORWTPP SETSUB | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-sortdef` | ORWTPP SORTDEF | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-plteams` | ORWTPP PLTEAMS | ARRAY |
| GET | `/vista/or/rpc/orwtpp-teams` | ORWTPP TEAMS | ARRAY |
| GET | `/vista/or/rpc/orwtpt-ateams` | ORWTPT ATEAMS | ARRAY |
| GET | `/vista/or/rpc/orwtpt-getteam` | ORWTPT GETTEAM | ARRAY |
| GET | `/vista/or/rpc/orwtpn-getclass` | ORWTPN GETCLASS | ARRAY |
| GET | `/vista/or/rpc/orwtpn-gettc` | ORWTPN GETTC | ARRAY |
| GET | `/vista/or/rpc/orwtpo-csarngd` | ORWTPO CSARNGD | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpo-cslabd` | ORWTPO CSLABD | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpo-gettabs` | ORWTPO GETTABS | ARRAY |
| GET | `/vista/or/rpc/orwtpp-addlist` | ORWTPP ADDLIST | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-chksurr` | ORWTPP CHKSURR | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-cldays` | ORWTPP CLDAYS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-clearnot` | ORWTPP CLEARNOT | ARRAY |
| GET | `/vista/or/rpc/orwtpp-clrange` | ORWTPP CLRANGE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-csarng` | ORWTPP CSARNG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-cslab` | ORWTPP CSLAB | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-dellist` | ORWTPP DELLIST | ARRAY |
| GET | `/vista/or/rpc/orwtpp-getcombo` | ORWTPP GETCOMBO | ARRAY |
| GET | `/vista/or/rpc/orwtpp-getnot` | ORWTPP GETNOT | ARRAY |
| GET | `/vista/or/rpc/orwtpp-getnoto` | ORWTPP GETNOTO | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-getoc` | ORWTPP GETOC | ARRAY |
| GET | `/vista/or/rpc/orwtpp-getother` | ORWTPP GETOTHER | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-getrem` | ORWTPP GETREM | ARRAY |
| GET | `/vista/or/rpc/orwtpp-getsub` | ORWTPP GETSUB | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-getsurr` | ORWTPP GETSURR | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-gettd` | ORWTPP GETTD | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-getcos` | ORWTPP GETCOS | ARRAY |
| GET | `/vista/or/rpc/orwtpp-getdcos` | ORWTPP GETDCOS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-setdcos` | ORWTPP SETDCOS | ARRAY |
| GET | `/vista/or/rpc/orworb-kill-expir-oi-alert` | ORWORB KILL EXPIR OI ALERT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwrp-lab-report-lists` | ORWRP LAB REPORT LISTS | ARRAY |
| GET | `/vista/or/rpc/orwpce-getsvc` | ORWPCE GETSVC | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-svc-w/synonyms` | ORQQCN SVC W/SYNONYMS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwcv1-coversheet-list` | ORWCV1 COVERSHEET LIST | ARRAY |
| GET | `/vista/or/rpc/orwtiu-idnotes-installed` | ORWTIU IDNOTES INSTALLED | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpx-get-folders` | ORQQPX GET FOLDERS | SINGLE VALUE |
| POST | `/vista/or/rpc/orqqpx-set-folders` | ORQQPX SET FOLDERS | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpx-get-def-locations` | ORQQPX GET DEF LOCATIONS | ARRAY |
| GET | `/vista/or/rpc/orwdps2-oislct` | ORWDPS2 OISLCT | ARRAY |
| GET | `/vista/or/rpc/orwdps2-admin` | ORWDPS2 ADMIN | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps1-odslct` | ORWDPS1 ODSLCT | ARRAY |
| GET | `/vista/or/rpc/orwdps1-schall` | ORWDPS1 SCHALL | ARRAY |
| GET | `/vista/or/rpc/orwdps2-reqst` | ORWDPS2 REQST | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps2-day2qty` | ORWDPS2 DAY2QTY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdx-dgnm` | ORWDX DGNM | SINGLE VALUE |
| GET | `/vista/or/rpc/orwul-qv4dg` | ORWUL QV4DG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwul-fv4dg` | ORWUL FV4DG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwul-fvsub` | ORWUL FVSUB | ARRAY |
| GET | `/vista/or/rpc/orwul-fvidx` | ORWUL FVIDX | SINGLE VALUE |
| GET | `/vista/or/rpc/orwul-qvsub` | ORWUL QVSUB | ARRAY |
| GET | `/vista/or/rpc/orwul-qvidx` | ORWUL QVIDX | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps1-chk94` | ORWDPS1 CHK94 | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps1-dfltsply` | ORWDPS1 DFLTSPLY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-anytime` | ORWPCE ANYTIME | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-getimg` | ORWTPP GETIMG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpo-getimgd` | ORWTPO GETIMGD | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-setimg` | ORWTPP SETIMG | ARRAY |
| GET | `/vista/or/rpc/orqqpx-rem-insert-at-cursor` | ORQQPX REM INSERT AT CURSOR | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps2-maxref` | ORWDPS2 MAXREF | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps2-schreq` | ORWDPS2 SCHREQ | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-savesurr` | ORWTPP SAVESURR | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-savet` | ORWTPP SAVET | ARRAY |
| GET | `/vista/or/rpc/orwpce-auto-visit-type-select` | ORWPCE AUTO VISIT TYPE SELECT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps2-qty2day` | ORWDPS2 QTY2DAY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwrp-column-headers` | ORWRP COLUMN HEADERS | ARRAY |
| GET | `/vista/or/rpc/orqqpx-new-cover-sheet-rems` | ORQQPX NEW COVER SHEET REMS | ARRAY |
| GET | `/vista/or/rpc/orqqpx-new-cover-sheet-active` | ORQQPX NEW COVER SHEET ACTIVE | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpx-lvremlst` | ORQQPX LVREMLST | ARRAY |
| GET | `/vista/or/rpc/orqqpx-savelvl` | ORQQPX SAVELVL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu-has-option-access` | ORWU HAS OPTION ACCESS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-always-checkout` | ORWPCE ALWAYS CHECKOUT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-get-excluded` | ORWPCE GET EXCLUDED | ARRAY |
| GET | `/vista/or/rpc/orwdps1-formalt` | ORWDPS1 FORMALT | ARRAY |
| GET | `/vista/or/rpc/orqpt-default-list-sort` | ORQPT DEFAULT LIST SORT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps1-dosealt` | ORWDPS1 DOSEALT | ARRAY |
| GET | `/vista/or/rpc/orqpt-default-clinic-date-rang` | ORQPT DEFAULT CLINIC DATE RANG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpr-ocdesc` | ORWTPR OCDESC | ARRAY |
| GET | `/vista/or/rpc/orwtpr-notdesc` | ORWTPR NOTDESC | ARRAY |
| GET | `/vista/or/rpc/orwdps1-faildea` | ORWDPS1 FAILDEA | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtiu-canlink` | ORWTIU CANLINK | SINGLE VALUE |
| GET | `/vista/or/rpc/orwcom-ptobj` | ORWCOM PTOBJ | SINGLE VALUE |
| GET | `/vista/or/rpc/orwcom-orderobj` | ORWCOM ORDEROBJ | SINGLE VALUE |
| GET | `/vista/or/rpc/orwcom-getobjs` | ORWCOM GETOBJS | ARRAY |
| GET | `/vista/or/rpc/orwcom-details` | ORWCOM DETAILS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwsr-show-surg-tab` | ORWSR SHOW SURG TAB | SINGLE VALUE |
| GET | `/vista/or/rpc/orwsr-list` | ORWSR LIST | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwsr-get-surg-context` | ORWSR GET SURG CONTEXT | SINGLE VALUE |
| POST | `/vista/or/rpc/orwsr-save-surg-context` | ORWSR SAVE SURG CONTEXT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwsr-onecase` | ORWSR ONECASE | ARRAY |
| GET | `/vista/or/rpc/orwsr-caselist` | ORWSR CASELIST | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwsr-show-optop-when-signing` | ORWSR SHOW OPTOP WHEN SIGNING | SINGLE VALUE |
| GET | `/vista/or/rpc/orwsr-is-non-or-procedure` | ORWSR IS NON-OR PROCEDURE | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-get-proc-ien` | ORQQCN GET PROC IEN | SINGLE VALUE |
| GET | `/vista/or/rpc/orwrp3-expand-columns` | ORWRP3 EXPAND COLUMNS | ARRAY |
| GET | `/vista/or/rpc/orwtpd-deldflt` | ORWTPD DELDFLT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd-getdflt` | ORWTPD GETDFLT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd-suindv` | ORWTPD SUINDV | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd-rsdflt` | ORWTPD RSDFLT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd-sudf` | ORWTPD SUDF | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd-actdf` | ORWTPD ACTDF | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd-getsets` | ORWTPD GETSETS | ARRAY |
| GET | `/vista/or/rpc/orwrp-print-v-report` | ORWRP PRINT V REPORT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwch-savecol` | ORWCH SAVECOL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwrp2-compabv` | ORWRP2 COMPABV | ARRAY |
| GET | `/vista/or/rpc/orwrp2-savlkup` | ORWRP2 SAVLKUP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwrp2-getlkup` | ORWRP2 GETLKUP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwrp2-compdisp` | ORWRP2 COMPDISP | ARRAY |
| GET | `/vista/or/rpc/orwpce-isclinic` | ORWPCE ISCLINIC | SINGLE VALUE |
| GET | `/vista/or/rpc/orwsr-rptlist` | ORWSR RPTLIST | GLOBAL ARRAY |
| POST | `/vista/or/rpc/orqqpxrm-mst-update` | ORQQPXRM MST UPDATE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwmc-patient-procedures1` | ORWMC PATIENT PROCEDURES1 | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwra-imaging-exams1` | ORWRA IMAGING EXAMS1 | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwra-report-text1` | ORWRA REPORT TEXT1 | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwpce-hncok` | ORWPCE HNCOK | SINGLE VALUE |
| GET | `/vista/or/rpc/orworb-kill-unver-orders-alert` | ORWORB KILL UNVER ORDERS ALERT | SINGLE VALUE |
| GET | `/vista/or/rpc/orworb-kill-unver-meds-alert` | ORWORB KILL UNVER MEDS ALERT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwps-medhist` | ORWPS MEDHIST | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwdps4-cplst` | ORWDPS4 CPLST | ARRAY |
| GET | `/vista/or/rpc/orwdps4-cpinfo` | ORWDPS4 CPINFO | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps2-chkpi` | ORWDPS2 CHKPI | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxr-gtoritm` | ORWDXR GTORITM | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps2-chkgrp` | ORWDPS2 CHKGRP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps2-qogrp` | ORWDPS2 QOGRP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxr-getpkg` | ORWDXR GETPKG | SINGLE VALUE |
| GET | `/vista/or/rpc/orbcma5-getud` | ORBCMA5 GETUD | SINGLE VALUE |
| GET | `/vista/or/rpc/orbcma5-getudid` | ORBCMA5 GETUDID | SINGLE VALUE |
| GET | `/vista/or/rpc/orbcma5-getivid` | ORBCMA5 GETIVID | SINGLE VALUE |
| GET | `/vista/or/rpc/orbcma5-oditmbc` | ORBCMA5 ODITMBC | ARRAY |
| GET | `/vista/or/rpc/orwubcma-userinfo` | ORWUBCMA USERINFO | SINGLE VALUE |
| GET | `/vista/or/rpc/orbcma32-dlgslct` | ORBCMA32 DLGSLCT | ARRAY |
| GET | `/vista/or/rpc/orbcma1-odslct` | ORBCMA1 ODSLCT | ARRAY |
| GET | `/vista/or/rpc/orbcma1-chk94` | ORBCMA1 CHK94 | SINGLE VALUE |
| GET | `/vista/or/rpc/orbcma1-faildea` | ORBCMA1 FAILDEA | SINGLE VALUE |
| GET | `/vista/or/rpc/orbcma1-formalt` | ORBCMA1 FORMALT | ARRAY |
| GET | `/vista/or/rpc/orbcma1-dosealt` | ORBCMA1 DOSEALT | ARRAY |
| GET | `/vista/or/rpc/orbcma1-schall` | ORBCMA1 SCHALL | ARRAY |
| GET | `/vista/or/rpc/orbcma32-auth` | ORBCMA32 AUTH | SINGLE VALUE |
| GET | `/vista/or/rpc/orbcma32-drugmsg` | ORBCMA32 DRUGMSG | SINGLE VALUE |
| GET | `/vista/or/rpc/orbcma32-formalt` | ORBCMA32 FORMALT | ARRAY |
| GET | `/vista/or/rpc/orbcma32-valroute` | ORBCMA32 VALROUTE | SINGLE VALUE |
| GET | `/vista/or/rpc/orbcma32-issply` | ORBCMA32 ISSPLY | SINGLE VALUE |
| GET | `/vista/or/rpc/orbcma32-ivamt` | ORBCMA32 IVAMT | SINGLE VALUE |
| GET | `/vista/or/rpc/orbcma32-valrate` | ORBCMA32 VALRATE | SINGLE VALUE |
| GET | `/vista/or/rpc/orbcma32-valsch` | ORBCMA32 VALSCH | SINGLE VALUE |
| GET | `/vista/or/rpc/orqpt-make-rpl` | ORQPT MAKE RPL | SINGLE VALUE |
| GET | `/vista/or/rpc/orqpt-read-rpl` | ORQPT READ RPL | ARRAY |
| GET | `/vista/or/rpc/orqpt-kill-rpl` | ORQPT KILL RPL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps1-locpick` | ORWDPS1 LOCPICK | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtiu-get-saved-cp-fields` | ORWTIU GET SAVED CP FIELDS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwor-pkiuse` | ORWOR PKIUSE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt-last5-rpl` | ORWPT LAST5 RPL | ARRAY |
| GET | `/vista/or/rpc/orwpt-fullssn-rpl` | ORWPT FULLSSN RPL | ARRAY |
| GET | `/vista/or/rpc/orwor1-chkdig` | ORWOR1 CHKDIG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwor1-getdtext` | ORWOR1 GETDTEXT | ARRAY |
| GET | `/vista/or/rpc/orwor1-getdsig` | ORWOR1 GETDSIG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwor1-sig` | ORWOR1 SIG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwcirn-restrict` | ORWCIRN RESTRICT | ARRAY |
| GET | `/vista/or/rpc/orwtpd-getimg` | ORWTPD GETIMG | SINGLE VALUE |
| GET | `/vista/or/rpc/orworb-text-followup` | ORWORB TEXT FOLLOWUP | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwor-result-history` | ORWOR RESULT HISTORY | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwcirn-checklink` | ORWCIRN CHECKLINK | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx-pat` | OREVNTX PAT | ARRAY |
| GET | `/vista/or/rpc/orevntx-active` | OREVNTX ACTIVE | ARRAY |
| GET | `/vista/or/rpc/orevntx1-putevnt` | OREVNTX1 PUTEVNT | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-gtevt` | OREVNTX1 GTEVT | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-wrlsted` | OREVNTX1 WRLSTED | ARRAY |
| GET | `/vista/or/rpc/orevntx1-evt` | OREVNTX1 EVT | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-exists` | OREVNTX1 EXISTS | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-name` | OREVNTX1 NAME | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-match` | OREVNTX1 MATCH | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-gtevt1` | OREVNTX1 GTEVT1 | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-div` | OREVNTX1 DIV | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-div1` | OREVNTX1 DIV1 | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-loc` | OREVNTX1 LOC | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-loc1` | OREVNTX1 LOC1 | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-chgevt` | OREVNTX1 CHGEVT | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-empty` | OREVNTX1 EMPTY | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-delptevt` | OREVNTX1 DELPTEVT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdx-sended` | ORWDX SENDED | ARRAY |
| GET | `/vista/or/rpc/orevntx1-getdlg` | OREVNTX1 GETDLG | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-curspe` | OREVNTX1 CURSPE | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-dfltevt` | OREVNTX1 DFLTEVT | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-done` | OREVNTX1 DONE | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-cpact` | OREVNTX1 CPACT | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-prmptid` | OREVNTX1 PRMPTID | SINGLE VALUE |
| GET | `/vista/or/rpc/orecs01-chkesso` | ORECS01 CHKESSO | SINGLE VALUE |
| GET | `/vista/or/rpc/orecs01-vsitid` | ORECS01 VSITID | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx-list` | OREVNTX LIST | ARRAY |
| GET | `/vista/or/rpc/orecs01-ecprint` | ORECS01 ECPRINT | SINGLE VALUE |
| GET | `/vista/or/rpc/orecs01-ecrpt` | ORECS01 ECRPT | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orevntx1-isdcod` | OREVNTX1 ISDCOD | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-setdflt` | OREVNTX1 SETDFLT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps1-hasoipi` | ORWDPS1 HASOIPI | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-deflts` | OREVNTX1 DEFLTS | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-mults` | OREVNTX1 MULTS | ARRAY |
| GET | `/vista/or/rpc/orevntx1-prompt-ids` | OREVNTX1 PROMPT IDS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps1-hasroute` | ORWDPS1 HASROUTE | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-deldflt` | OREVNTX1 DELDFLT | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-dfltdlg` | OREVNTX1 DFLTDLG | SINGLE VALUE |
| GET | `/vista/or/rpc/orecs01-getdiv` | ORECS01 GETDIV | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-typext` | OREVNTX1 TYPEXT | SINGLE VALUE |
| GET | `/vista/or/rpc/orworr-rget` | ORWORR RGET | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orevntx1-authmrel` | OREVNTX1 AUTHMREL | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-haveprt` | OREVNTX1 HAVEPRT | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-cmevts` | OREVNTX1 CMEVTS | ARRAY |
| GET | `/vista/or/rpc/orevntx1-odptevid` | OREVNTX1 ODPTEVID | SINGLE VALUE |
| GET | `/vista/or/rpc/orwor-pkisite` | ORWOR PKISITE | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-comp` | OREVNTX1 COMP | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-ishdord` | OREVNTX1 ISHDORD | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-ispass` | OREVNTX1 ISPASS | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-ispass1` | OREVNTX1 ISPASS1 | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-dlgien` | OREVNTX1 DLGIEN | SINGLE VALUE |
| GET | `/vista/or/rpc/orwor1-setdtext` | ORWOR1 SETDTEXT | ARRAY |
| GET | `/vista/or/rpc/orwor1-getdea` | ORWOR1 GETDEA | SINGLE VALUE |
| GET | `/vista/or/rpc/orwor1-getdsch` | ORWOR1 GETDSCH | SINGLE VALUE |
| GET | `/vista/or/rpc/orwch-ldfont` | ORWCH LDFONT | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-unresolved` | ORQQCN UNRESOLVED | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu1-namecvt` | ORWU1 NAMECVT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps5-lesgrp` | ORWDPS5 LESGRP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps5-lesapi` | ORWDPS5 LESAPI | ARRAY |
| GET | `/vista/or/rpc/orwdxr-orcplx` | ORWDXR ORCPLX | ARRAY |
| GET | `/vista/or/rpc/orwdxr-canrn` | ORWDXR CANRN | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxr-iscplx` | ORWDXR ISCPLX | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxa-ofcplx` | ORWDXA OFCPLX | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps1-ivdea` | ORWDPS1 IVDEA | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxr-isnow` | ORWDXR ISNOW | SINGLE VALUE |
| GET | `/vista/or/rpc/orrhcq-qryitr` | ORRHCQ QRYITR | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu-default-division` | ORWU DEFAULT DIVISION | SINGLE VALUE |
| GET | `/vista/or/rpc/orevntx1-getsts` | OREVNTX1 GETSTS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxa-isactoi` | ORWDXA ISACTOI | SINGLE VALUE |
| GET | `/vista/or/rpc/orecs01-savpath` | ORECS01 SAVPATH | SINGLE VALUE |
| GET | `/vista/or/rpc/orprf-hasflg` | ORPRF HASFLG | ARRAY |
| GET | `/vista/or/rpc/orwpce-active-code` | ORWPCE ACTIVE CODE | SINGLE VALUE |
| GET | `/vista/or/rpc/orprf-getflg` | ORPRF GETFLG | ARRAY |
| GET | `/vista/or/rpc/orprf-clear` | ORPRF CLEAR | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu1-newloc` | ORWU1 NEWLOC | ARRAY |
| POST | `/vista/or/rpc/orqqpxrm-women-health-save` | ORQQPXRM WOMEN HEALTH SAVE | ARRAY |
| GET | `/vista/or/rpc/orrhcr-rptlst` | ORRHCR RPTLST | ARRAY |
| GET | `/vista/or/rpc/orrhcr-rptdef` | ORRHCR RPTDEF | ARRAY |
| GET | `/vista/or/rpc/orrhcu-id2ext` | ORRHCU ID2EXT | ARRAY |
| GET | `/vista/or/rpc/orrhco-oisets` | ORRHCO OISETS | ARRAY |
| GET | `/vista/or/rpc/orrhco-orditm` | ORRHCO ORDITM | ARRAY |
| GET | `/vista/or/rpc/orrhct-doccls` | ORRHCT DOCCLS | ARRAY |
| GET | `/vista/or/rpc/orrhco-ordsts` | ORRHCO ORDSTS | ARRAY |
| GET | `/vista/or/rpc/orrhco-signsts` | ORRHCO SIGNSTS | ARRAY |
| GET | `/vista/or/rpc/orrhct-docsts` | ORRHCT DOCSTS | ARRAY |
| GET | `/vista/or/rpc/orrhcu-byreg` | ORRHCU BYREG | ARRAY |
| GET | `/vista/or/rpc/orrhcr-usrrpt` | ORRHCR USRRPT | SINGLE VALUE |
| GET | `/vista/or/rpc/orrhcr-savdef` | ORRHCR SAVDEF | SINGLE VALUE |
| GET | `/vista/or/rpc/orrhcu-dflds` | ORRHCU DFLDS | ARRAY |
| GET | `/vista/or/rpc/orrhcq-setup` | ORRHCQ SETUP | SINGLE VALUE |
| GET | `/vista/or/rpc/orrhcq-sortby` | ORRHCQ SORTBY | SINGLE VALUE |
| GET | `/vista/or/rpc/orrhcq-subdta` | ORRHCQ SUBDTA | ARRAY |
| GET | `/vista/or/rpc/orrhcq-detail` | ORRHCQ DETAIL | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orrhcq-ptinfo` | ORRHCQ PTINFO | SINGLE VALUE |
| GET | `/vista/or/rpc/orrhcr-owned` | ORRHCR OWNED | SINGLE VALUE |
| POST | `/vista/or/rpc/orrhcr-delete` | ORRHCR DELETE | SINGLE VALUE |
| GET | `/vista/or/rpc/orrhcu-coltyp` | ORRHCU COLTYP | ARRAY |
| GET | `/vista/or/rpc/orrhcq-clear` | ORRHCQ CLEAR | SINGLE VALUE |
| GET | `/vista/or/rpc/orrhcu-reglst` | ORRHCU REGLST | ARRAY |
| GET | `/vista/or/rpc/orrhcu-regnam` | ORRHCU REGNAM | SINGLE VALUE |
| GET | `/vista/or/rpc/orrhcr-ctplst` | ORRHCR CTPLST | ARRAY |
| GET | `/vista/or/rpc/orrhcr-tagdef` | ORRHCR TAGDEF | ARRAY |
| GET | `/vista/or/rpc/orrhco-abstrt` | ORRHCO ABSTRT | SINGLE VALUE |
| GET | `/vista/or/rpc/orrhcq-rngfm` | ORRHCQ RNGFM | SINGLE VALUE |
| GET | `/vista/or/rpc/orrhcr-genrpt` | ORRHCR GENRPT | ARRAY |
| GET | `/vista/or/rpc/orrhco-csltgrp` | ORRHCO CSLTGRP | SINGLE VALUE |
| GET | `/vista/or/rpc/orrc-authenticate` | ORRC AUTHENTICATE | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwtpd-getocm` | ORWTPD GETOCM | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd-putocm` | ORWTPD PUTOCM | SINGLE VALUE |
| GET | `/vista/or/rpc/orb-forward-alert` | ORB FORWARD ALERT | SINGLE VALUE |
| POST | `/vista/or/rpc/orb-renew-alert` | ORB RENEW ALERT | SINGLE VALUE |
| GET | `/vista/or/rpc/orrcqlpt-ptdfn` | ORRCQLPT PTDFN | SINGLE VALUE |
| GET | `/vista/or/rpc/orrcqlpt-ptdemos` | ORRCQLPT PTDEMOS | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpxrm-get-wh-report-text` | ORQQPXRM GET WH REPORT TEXT | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orrhcq1-getcnt` | ORRHCQ1 GETCNT | SINGLE VALUE |
| GET | `/vista/or/rpc/orrhcq1-qrysitr` | ORRHCQ1 QRYSITR | SINGLE VALUE |
| GET | `/vista/or/rpc/orrhcq1-qsitr` | ORRHCQ1 QSITR | SINGLE VALUE |
| GET | `/vista/or/rpc/orrhcq1-getspt` | ORRHCQ1 GETSPT | ARRAY |
| GET | `/vista/or/rpc/orrhcq1-getsln` | ORRHCQ1 GETSLN | ARRAY |
| GET | `/vista/or/rpc/orrhcq1-delsen` | ORRHCQ1 DELSEN | SINGLE VALUE |
| GET | `/vista/or/rpc/orrhcu-dfldmap` | ORRHCU DFLDMAP | ARRAY |
| GET | `/vista/or/rpc/orimo-imoloc` | ORIMO IMOLOC | SINGLE VALUE |
| GET | `/vista/or/rpc/orimo-imood` | ORIMO IMOOD | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps4-ipod4op` | ORWDPS4 IPOD4OP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps4-updtdg` | ORWDPS4 UPDTDG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwor-action-text` | ORWOR ACTION TEXT | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-gec-dialog` | ORQQPXRM GEC DIALOG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxr01-canchg` | ORWDXR01 CANCHG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxr01-savchg` | ORWDXR01 SAVCHG | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-gec-finished?` | ORQQPXRM GEC FINISHED? | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpxrm-check-rem-version` | ORQQPXRM CHECK REM VERSION | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpxrm-gec-status-prompt` | ORQQPXRM GEC STATUS PROMPT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxm3-isudqo` | ORWDXM3 ISUDQO | SINGLE VALUE |
| GET | `/vista/or/rpc/orwps-reason` | ORWPS REASON | ARRAY |
| GET | `/vista/or/rpc/orwdps5-isvtp` | ORWDPS5 ISVTP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdba1-orpkgtyp` | ORWDBA1 ORPKGTYP | ARRAY |
| GET | `/vista/or/rpc/orwdba1-rcvorci` | ORWDBA1 RCVORCI | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdal32-send-bulletin` | ORWDAL32 SEND BULLETIN | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxr01-issply` | ORWDXR01 ISSPLY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdba1-sclst` | ORWDBA1 SCLST | ARRAY |
| GET | `/vista/or/rpc/orwdxr01-oxdata` | ORWDXR01 OXDATA | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdba1-bastatus` | ORWDBA1 BASTATUS | SINGLE VALUE |
| GET | `/vista/or/rpc/orworb-setsort` | ORWORB SETSORT | SINGLE VALUE |
| GET | `/vista/or/rpc/orworb-getsort` | ORWORB GETSORT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwor-expired` | ORWOR EXPIRED | SINGLE VALUE |
| GET | `/vista/or/rpc/orprf-hascat1` | ORPRF HASCAT1 | ARRAY |
| GET | `/vista/or/rpc/orwdps32-authnva` | ORWDPS32 AUTHNVA | SINGLE VALUE |
| GET | `/vista/or/rpc/orwgn-gnloc` | ORWGN GNLOC | ARRAY |
| GET | `/vista/or/rpc/orwgn-authusr` | ORWGN AUTHUSR | SINGLE VALUE |
| GET | `/vista/or/rpc/orrc-sysid` | ORRC SYSID | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdal32-load-for-edit` | ORWDAL32 LOAD FOR EDIT | GLOBAL ARRAY |
| POST | `/vista/or/rpc/orwdal32-save-allergy` | ORWDAL32 SAVE ALLERGY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps4-isudiv` | ORWDPS4 ISUDIV | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce-cxnoshow` | ORWPCE CXNOSHOW | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdba2-getpdl` | ORWDBA2 GETPDL | ARRAY |
| GET | `/vista/or/rpc/orwdba2-addpdl` | ORWDBA2 ADDPDL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdba2-delpdl` | ORWDBA2 DELPDL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdba2-getdudc` | ORWDBA2 GETDUDC | ARRAY |
| GET | `/vista/or/rpc/orwdba1-getordx` | ORWDBA1 GETORDX | ARRAY |
| GET | `/vista/or/rpc/orwdba4-getbausr` | ORWDBA4 GETBAUSR | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdba4-gettfci` | ORWDBA4 GETTFCI | ARRAY |
| GET | `/vista/or/rpc/orwdba3-hints` | ORWDBA3 HINTS | ARRAY |
| GET | `/vista/or/rpc/orwdal32-site-params` | ORWDAL32 SITE PARAMS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd1-getefdat` | ORWTPD1 GETEFDAT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd1-getedats` | ORWTPD1 GETEDATS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd1-putedats` | ORWTPD1 PUTEDATS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd1-getcsdef` | ORWTPD1 GETCSDEF | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd1-getcsrng` | ORWTPD1 GETCSRNG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd1-putcsrng` | ORWTPD1 PUTCSRNG | ARRAY |
| GET | `/vista/or/rpc/orwtpd1-geteafl` | ORWTPD1 GETEAFL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwnss-nssmsg` | ORWNSS NSSMSG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwnss-qosch` | ORWNSS QOSCH | SINGLE VALUE |
| GET | `/vista/or/rpc/orwnss-valsch` | ORWNSS VALSCH | SINGLE VALUE |
| GET | `/vista/or/rpc/orwnss-chksch` | ORWNSS CHKSCH | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtiu-chktxt` | ORWTIU CHKTXT | SINGLE VALUE |
| GET | `/vista/or/rpc/orimo-iscloc` | ORIMO ISCLOC | SINGLE VALUE |
| GET | `/vista/or/rpc/orimo-isivqo` | ORIMO ISIVQO | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdba7-getien9` | ORWDBA7 GETIEN9 | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdba7-iswitch` | ORWDBA7 ISWITCH | SINGLE VALUE |
| GET | `/vista/or/rpc/orvaa-vaa` | ORVAA VAA | ARRAY |
| GET | `/vista/or/rpc/orwdfh-opdiets` | ORWDFH OPDIETS | ARRAY |
| GET | `/vista/or/rpc/orwdfh-current-meals` | ORWDFH CURRENT MEALS | ARRAY |
| GET | `/vista/or/rpc/orwu-version` | ORWU VERSION | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxvb-getall` | ORWDXVB GETALL | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwdxvb-raw` | ORWDXVB RAW | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwdxvb-results` | ORWDXVB RESULTS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwdxvb-statalow` | ORWDXVB STATALOW | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxvb-compord` | ORWDXVB COMPORD | ARRAY |
| GET | `/vista/or/rpc/orwdfh-nfsloc-ready` | ORWDFH NFSLOC READY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwgrpc-allitems` | ORWGRPC ALLITEMS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-types` | ORWGRPC TYPES | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-items` | ORWGRPC ITEMS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-class` | ORWGRPC CLASS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-itemdata` | ORWGRPC ITEMDATA | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-getpref` | ORWGRPC GETPREF | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-setpref` | ORWGRPC SETPREF | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-getviews` | ORWGRPC GETVIEWS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-setviews` | ORWGRPC SETVIEWS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-delviews` | ORWGRPC DELVIEWS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-testspec` | ORWGRPC TESTSPEC | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-lookup` | ORWGRPC LOOKUP | ARRAY |
| GET | `/vista/or/rpc/orwgrpc-dateitem` | ORWGRPC DATEITEM | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwpce1-noncount` | ORWPCE1 NONCOUNT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdal32-clinuser` | ORWDAL32 CLINUSER | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpfss-is-pfss-active?` | ORWPFSS IS PFSS ACTIVE? | SINGLE VALUE |
| GET | `/vista/or/rpc/orwgrpc-getdates` | ORWGRPC GETDATES | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-detail` | ORWGRPC DETAIL | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-details` | ORWGRPC DETAILS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwmhv-mhv` | ORWMHV MHV | SINGLE VALUE |
| GET | `/vista/or/rpc/orwgrpc-public` | ORWGRPC PUBLIC | SINGLE VALUE |
| GET | `/vista/or/rpc/orwgrpc-rptparam` | ORWGRPC RPTPARAM | SINGLE VALUE |
| GET | `/vista/or/rpc/orwcirn-webaddr` | ORWCIRN WEBADDR | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdx-change` | ORWDX CHANGE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwgrpc-tax` | ORWGRPC TAX | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwdx1-patward` | ORWDX1 PATWARD | SINGLE VALUE |
| GET | `/vista/or/rpc/orwrp4-hdr-modify` | ORWRP4 HDR MODIFY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdx1-stchange` | ORWDX1 STCHANGE | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpxrm-mhv` | ORQQPXRM MHV | ARRAY |
| GET | `/vista/or/rpc/orwdx1-dcren` | ORWDX1 DCREN | ARRAY |
| GET | `/vista/or/rpc/orwgrpc-getsize` | ORWGRPC GETSIZE | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-setsize` | ORWGRPC SETSIZE | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwcirn-autordv` | ORWCIRN AUTORDV | SINGLE VALUE |
| GET | `/vista/or/rpc/orprf-trigger-popup` | ORPRF TRIGGER POPUP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwcirn-hdron` | ORWCIRN HDRON | SINGLE VALUE |
| GET | `/vista/or/rpc/anrv-problem-list` | ANRV PROBLEM LIST | ARRAY |
| GET | `/vista/or/rpc/orwdx2-dcreason` | ORWDX2 DCREASON | ARRAY |
| GET | `/vista/or/rpc/orwdx1-dcorig` | ORWDX1 DCORIG | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdx1-undcorig` | ORWDX1 UNDCORIG | ARRAY |
| GET | `/vista/or/rpc/orcdlr2-check-one-lc-to-wc` | ORCDLR2 CHECK ONE LC TO WC | ARRAY |
| GET | `/vista/or/rpc/orcdlr2-check-all-lc-to-wc` | ORCDLR2 CHECK ALL LC TO WC | ARRAY |
| GET | `/vista/or/rpc/oralword-allword` | ORALWORD ALLWORD | ARRAY |
| GET | `/vista/or/rpc/orwdx1-ordmatch` | ORWDX1 ORDMATCH | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxvb-subchk` | ORWDXVB SUBCHK | SINGLE VALUE |
| GET | `/vista/or/rpc/orddpapi-admtime` | ORDDPAPI ADMTIME | WORD PROCESSING |
| GET | `/vista/or/rpc/orwu-params` | ORWU PARAMS | ARRAY |
| GET | `/vista/or/rpc/orwdps1-dowsch` | ORWDPS1 DOWSCH | ARRAY |
| GET | `/vista/or/rpc/orddpapi-clozmsg` | ORDDPAPI CLOZMSG | WORD PROCESSING |
| GET | `/vista/or/rpc/orwdps33-comploc` | ORWDPS33 COMPLOC | SINGLE VALUE |
| GET | `/vista/or/rpc/orwgrpc-fastitem` | ORWGRPC FASTITEM | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-fastdata` | ORWGRPC FASTDATA | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-fasttask` | ORWGRPC FASTTASK | SINGLE VALUE |
| GET | `/vista/or/rpc/orwgrpc-fastlabs` | ORWGRPC FASTLABS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwdps1-qomedalt` | ORWDPS1 QOMEDALT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwgrpc-allviews` | ORWGRPC ALLVIEWS | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwgrpc-testing` | ORWGRPC TESTING | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-mhdll` | ORQQPXRM MHDLL | ARRAY |
| GET | `/vista/or/rpc/orwdlr33-lc-to-wc` | ORWDLR33 LC TO WC | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu2-cosigner` | ORWU2 COSIGNER | ARRAY |
| GET | `/vista/or/rpc/orwdxvb-nursadmn` | ORWDXVB NURSADMN | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps32-allivrte` | ORWDPS32 ALLIVRTE | ARRAY |
| GET | `/vista/or/rpc/orwdps33-ivdosfrm` | ORWDPS33 IVDOSFRM | ARRAY |
| GET | `/vista/or/rpc/orwdxm1-svrpc` | ORWDXM1 SVRPC | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxvb-vbtns` | ORWDXVB VBTNS | SINGLE VALUE |
| GET | `/vista/or/rpc/or-get-combat-vet` | OR GET COMBAT VET | ARRAY |
| GET | `/vista/or/rpc/orwdx-unlkoth` | ORWDX UNLKOTH | SINGLE VALUE |
| GET | `/vista/or/rpc/orvw-faclist` | ORVW FACLIST | ARRAY |
| GET | `/vista/or/rpc/oram1-comptest` | ORAM1 COMPTEST | SINGLE VALUE |
| GET | `/vista/or/rpc/oram1-ptenter` | ORAM1 PTENTER | SINGLE VALUE |
| GET | `/vista/or/rpc/oram1-flowtt` | ORAM1 FLOWTT | ARRAY |
| GET | `/vista/or/rpc/oram1-pcgoal` | ORAM1 PCGOAL | SINGLE VALUE |
| GET | `/vista/or/rpc/oram1-acdata` | ORAM1 ACDATA | ARRAY |
| GET | `/vista/or/rpc/oram1-addtop` | ORAM1 ADDTOP | SINGLE VALUE |
| POST | `/vista/or/rpc/oram1-lock` | ORAM1 LOCK | SINGLE VALUE |
| GET | `/vista/or/rpc/oram1-log` | ORAM1 LOG | SINGLE VALUE |
| GET | `/vista/or/rpc/oram1-outinr` | ORAM1 OUTINR | ARRAY |
| GET | `/vista/or/rpc/oram1-ptcheck` | ORAM1 PTCHECK | SINGLE VALUE |
| GET | `/vista/or/rpc/oram1-getpt` | ORAM1 GETPT | ARRAY |
| GET | `/vista/or/rpc/oram1-terase` | ORAM1 TERASE | SINGLE VALUE |
| POST | `/vista/or/rpc/oram1-unlock` | ORAM1 UNLOCK | SINGLE VALUE |
| GET | `/vista/or/rpc/oram2-noact` | ORAM2 NOACT | ARRAY |
| GET | `/vista/or/rpc/oram2-showrate` | ORAM2 SHOWRATE | SINGLE VALUE |
| GET | `/vista/or/rpc/oram2-ptappt` | ORAM2 PTAPPT | ARRAY |
| GET | `/vista/or/rpc/oram2-remind` | ORAM2 REMIND | SINGLE VALUE |
| GET | `/vista/or/rpc/oram2-teamchk` | ORAM2 TEAMCHK | ARRAY |
| GET | `/vista/or/rpc/oram2-allgoal` | ORAM2 ALLGOAL | ARRAY |
| GET | `/vista/or/rpc/oram3-ptadr` | ORAM3 PTADR | SINGLE VALUE |
| GET | `/vista/or/rpc/oram3-compent` | ORAM3 COMPENT | SINGLE VALUE |
| GET | `/vista/or/rpc/oram3-ptfone` | ORAM3 PTFONE | SINGLE VALUE |
| GET | `/vista/or/rpc/oram-concomp` | ORAM CONCOMP | SINGLE VALUE |
| GET | `/vista/or/rpc/oramset-get` | ORAMSET GET | ARRAY |
| GET | `/vista/or/rpc/oram-hct` | ORAM HCT | SINGLE VALUE |
| GET | `/vista/or/rpc/oram-inr` | ORAM INR | ARRAY |
| GET | `/vista/or/rpc/oram-patient` | ORAM PATIENT | SINGLE VALUE |
| GET | `/vista/or/rpc/oram-provider` | ORAM PROVIDER | SINGLE VALUE |
| GET | `/vista/or/rpc/oram-sigcheck` | ORAM SIGCHECK | SINGLE VALUE |
| GET | `/vista/or/rpc/oramx-consult` | ORAMX CONSULT | ARRAY |
| GET | `/vista/or/rpc/oramx-pceset` | ORAMX PCESET | SINGLE VALUE |
| GET | `/vista/or/rpc/oramset-getclins` | ORAMSET GETCLINS | ARRAY |
| GET | `/vista/or/rpc/oram-order` | ORAM ORDER | SINGLE VALUE |
| GET | `/vista/or/rpc/oramset-indics` | ORAMSET INDICS | ARRAY |
| GET | `/vista/or/rpc/oram-apptmtch` | ORAM APPTMTCH | SINGLE VALUE |
| GET | `/vista/or/rpc/ordea-deatext` | ORDEA DEATEXT | WORD PROCESSING |
| GET | `/vista/or/rpc/ordea-siginfo` | ORDEA SIGINFO | WORD PROCESSING |
| GET | `/vista/or/rpc/ordea-csvalue` | ORDEA CSVALUE | SINGLE VALUE |
| GET | `/vista/or/rpc/ordea-hashinfo` | ORDEA HASHINFO | ARRAY |
| GET | `/vista/or/rpc/ordea-ordhinfo` | ORDEA ORDHINFO | ARRAY |
| GET | `/vista/or/rpc/orwpce-icdver` | ORWPCE ICDVER | SINGLE VALUE |
| GET | `/vista/or/rpc/ordea-pinlkchk` | ORDEA PINLKCHK | SINGLE VALUE |
| GET | `/vista/or/rpc/ordea-pinlkset` | ORDEA PINLKSET | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqpl4-lex` | ORQQPL4 LEX | GLOBAL ARRAY |
| GET | `/vista/or/rpc/ordea-pndhld` | ORDEA PNDHLD | SINGLE VALUE |
| GET | `/vista/or/rpc/ordea-lnkmsg` | ORDEA LNKMSG | WORD PROCESSING |
| GET | `/vista/or/rpc/orwpce4-lex` | ORWPCE4 LEX | ARRAY |
| GET | `/vista/or/rpc/or-no-patient-cslt-lookup` | OR NO PATIENT CSLT LOOKUP | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwlex-geti10dx` | ORWLEX GETI10DX | ARRAY |
| GET | `/vista/or/rpc/orwpce-i10impdt` | ORWPCE I10IMPDT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwlex-getfreq` | ORWLEX GETFREQ | SINGLE VALUE |
| GET | `/vista/or/rpc/orwgn-idtvalid` | ORWGN IDTVALID | SINGLE VALUE |
| GET | `/vista/or/rpc/orwgn-maxfrq` | ORWGN MAXFRQ | SINGLE VALUE |
| GET | `/vista/or/rpc/orwrp1a-radio` | ORWRP1A RADIO | SINGLE VALUE |
| GET | `/vista/or/rpc/ordebug-saverpcs` | ORDEBUG SAVERPCS | SINGLE VALUE |
| GET | `/vista/or/rpc/ordebug-savedesc` | ORDEBUG SAVEDESC | SINGLE VALUE |
| GET | `/vista/or/rpc/orqqcn-get-user-auth` | ORQQCN GET USER AUTH | SINGLE VALUE |
| GET | `/vista/or/rpc/orutl-isclord` | ORUTL ISCLORD | SINGLE VALUE |
| POST | `/vista/or/rpc/orbcma5-lock` | ORBCMA5 LOCK | SINGLE VALUE |
| POST | `/vista/or/rpc/orbcma5-unlock` | ORBCMA5 UNLOCK | SINGLE VALUE |
| GET | `/vista/or/rpc/orbcma5-job` | ORBCMA5 JOB | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu-overdl` | ORWU OVERDL | SINGLE VALUE |
| GET | `/vista/or/rpc/orutl4-dll` | ORUTL4 DLL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu-mobapp` | ORWU MOBAPP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwcirn-jlv-label` | ORWCIRN JLV LABEL | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdsd1-odslct` | ORWDSD1 ODSLCT | ARRAY |
| GET | `/vista/or/rpc/orwdps1-getprior` | ORWDPS1 GETPRIOR | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps1-getprien` | ORWDPS1 GETPRIEN | SINGLE VALUE |
| GET | `/vista/or/rpc/orto-getrvw` | ORTO GETRVW | SINGLE VALUE |
| GET | `/vista/or/rpc/orto-setrvw` | ORTO SETRVW | SINGLE VALUE |
| POST | `/vista/or/rpc/orto-set-uap-flag` | ORTO SET UAP FLAG | SINGLE VALUE |
| GET | `/vista/or/rpc/orto-uapoff` | ORTO UAPOFF | SINGLE VALUE |
| GET | `/vista/or/rpc/orto-dgroup` | ORTO DGROUP | SINGLE VALUE |
| GET | `/vista/or/rpc/oraleapi-report` | ORALEAPI REPORT | ARRAY |
| GET | `/vista/or/rpc/orwpt2-covid` | ORWPT2 COVID | SINGLE VALUE |
| GET | `/vista/or/rpc/orwother-shwother` | ORWOTHER SHWOTHER | SINGLE VALUE |
| GET | `/vista/or/rpc/orwother-detail` | ORWOTHER DETAIL | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwtiu-exccopy` | ORWTIU EXCCOPY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtiu-pctcopy` | ORWTIU PCTCOPY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtiu-wrdcopy` | ORWTIU WRDCOPY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtiu-svcopy` | ORWTIU SVCOPY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtiu-getpaste` | ORWTIU GETPASTE | ARRAY |
| GET | `/vista/or/rpc/orwtiu-svpaste` | ORWTIU SVPASTE | ARRAY |
| GET | `/vista/or/rpc/orwtiu-viewcopy` | ORWTIU VIEWCOPY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtiu-ldcpidnt` | ORWTIU LDCPIDNT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtiu-svcpidnt` | ORWTIU SVCPIDNT | SINGLE VALUE |
| GET | `/vista/or/rpc/orqpt-pteampr` | ORQPT PTEAMPR | ARRAY |
| GET | `/vista/or/rpc/orqpt-pteam-patients` | ORQPT PTEAM PATIENTS | ARRAY |
| GET | `/vista/or/rpc/orwtpt-getpteam` | ORWTPT GETPTEAM | ARRAY |
| GET | `/vista/or/rpc/orwtpp-pcmteams` | ORWTPP PCMTEAMS | ARRAY |
| GET | `/vista/or/rpc/orb3utl-defer` | ORB3UTL DEFER | SINGLE VALUE |
| GET | `/vista/or/rpc/orb3utl-notifpg` | ORB3UTL NOTIFPG | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orb3utl-get-notification` | ORB3UTL GET NOTIFICATION | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orb3utl-get-description` | ORB3UTL GET DESCRIPTION | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orb3utl-get-existing-notes` | ORB3UTL GET EXISTING NOTES | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orbsmart-issmnot` | ORBSMART ISSMNOT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps1-maxds` | ORWDPS1 MAXDS | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtiu-start` | ORWTIU START | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtiu-stop` | ORWTIU STOP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtiu-poll` | ORWTIU POLL | ARRAY |
| GET | `/vista/or/rpc/orwdxc2-savecanc` | ORWDXC2 SAVECANC | SINGLE VALUE |
| GET | `/vista/or/rpc/orddpapi-rlsmsg` | ORDDPAPI RLSMSG | WORD PROCESSING |
| POST | `/vista/or/rpc/ornorc-cancel` | ORNORC CANCEL | UNKNOWN() |
| GET | `/vista/or/rpc/orworb-getltxt` | ORWORB GETLTXT | ARRAY |
| GET | `/vista/or/rpc/orbsmart-insmalrt` | ORBSMART INSMALRT | SINGLE VALUE |
| GET | `/vista/or/rpc/orbsmart-ousmalrt` | ORBSMART OUSMALRT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd-getocmin` | ORWTPD GETOCMIN | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd-getocmop` | ORWTPD GETOCMOP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd-putocmin` | ORWTPD PUTOCMIN | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpd-putocmop` | ORWTPD PUTOCMOP | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdsd1-getinfo` | ORWDSD1 GETINFO | ARRAY |
| GET | `/vista/or/rpc/orqqpxrm-reminder-link-seq` | ORQQPXRM REMINDER LINK SEQ | ARRAY |
| GET | `/vista/or/rpc/orothcl-get` | OROTHCL GET | ARRAY |
| GET | `/vista/or/rpc/orwdra32-radlong` | ORWDRA32 RADLONG | SINGLE VALUE |
| GET | `/vista/or/rpc/ordea-auintent` | ORDEA AUINTENT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwu-sysparam` | ORWU SYSPARAM | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orpdmp-strtpdmp` | ORPDMP STRTPDMP | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orpdmp-chcktask` | ORPDMP CHCKTASK | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orpdmpnt-makenote` | ORPDMPNT MAKENOTE | SINGLE VALUE |
| GET | `/vista/or/rpc/orpdmp-stoptask` | ORPDMP STOPTASK | SINGLE VALUE |
| GET | `/vista/or/rpc/orpdmp-viewedreport` | ORPDMP VIEWEDREPORT | SINGLE VALUE |
| GET | `/vista/or/rpc/orpdmp-getcache` | ORPDMP GETCACHE | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orpdmpnt-recntnote` | ORPDMPNT RECNTNOTE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt-get-full-icn` | ORWPT GET FULL ICN | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtiu-template-preferences` | ORWTIU TEMPLATE PREFERENCES | SINGLE VALUE |
| GET | `/vista/or/rpc/orwlrap1-config` | ORWLRAP1 CONFIG | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwlrap1-spec` | ORWLRAP1 SPEC | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwdal32-chkmeds` | ORWDAL32 CHKMEDS | ARRAY |
| GET | `/vista/or/rpc/orwdal32-getprov` | ORWDAL32 GETPROV | ARRAY |
| GET | `/vista/or/rpc/orwdal32-sendalrt` | ORWDAL32 SENDALRT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwtpp-getsurrs` | ORWTPP GETSURRS | ARRAY |
| GET | `/vista/or/rpc/orwtpp-surrdflt` | ORWTPP SURRDFLT | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxa1-flagact` | ORWDXA1 FLAGACT | ARRAY |
| GET | `/vista/or/rpc/orwdxa1-flagcom` | ORWDXA1 FLAGCOM | ARRAY |
| GET | `/vista/or/rpc/orwdxa1-flagtxts` | ORWDXA1 FLAGTXTS | ARRAY |
| GET | `/vista/or/rpc/orwps1-nvadlg` | ORWPS1 NVADLG | SINGLE VALUE |
| GET | `/vista/or/rpc/orq3-authusr` | ORQ3 AUTHUSR | SINGLE VALUE |
| GET | `/vista/or/rpc/orq3-en` | ORQ3 EN | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orq3-xfer` | ORQ3 XFER | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orq3-xfer-history` | ORQ3 XFER HISTORY | ARRAY |
| GET | `/vista/or/rpc/orq3-loadall` | ORQ3 LOADALL | ARRAY |
| GET | `/vista/or/rpc/orq3-saveall` | ORQ3 SAVEALL | SINGLE VALUE |
| GET | `/vista/or/rpc/orq3-audit` | ORQ3 AUDIT | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwdxc-allergy` | ORWDXC ALLERGY | ARRAY |
| GET | `/vista/or/rpc/orwdxc-reason` | ORWDXC REASON | ARRAY |
| GET | `/vista/or/rpc/orworb-prouser` | ORWORB PROUSER | GLOBAL ARRAY |
| GET | `/vista/or/rpc/orwtpr-getarchp` | ORWTPR GETARCHP | SINGLE VALUE |
| GET | `/vista/or/rpc/orvimm-makenote` | ORVIMM MAKENOTE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxc-savemchk` | ORWDXC SAVEMCHK | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxr01-warn` | ORWDXR01 WARN | SINGLE VALUE |
| GET | `/vista/or/rpc/orvimm-vimmrem` | ORVIMM VIMMREM | ARRAY |
| GET | `/vista/or/rpc/orfedt-getlayot` | ORFEDT GETLAYOT | ARRAY |
| GET | `/vista/or/rpc/orfedt-bldreslt` | ORFEDT BLDRESLT | ARRAY |
| GET | `/vista/or/rpc/orvimm-getitems` | ORVIMM GETITEMS | ARRAY |
| GET | `/vista/or/rpc/orvimm-gethist` | ORVIMM GETHIST | ARRAY |
| GET | `/vista/or/rpc/orfedt-bldlayot` | ORFEDT BLDLAYOT | ARRAY |
| GET | `/vista/or/rpc/orvimm-useice` | ORVIMM USEICE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce5-ucumlist` | ORWPCE5 UCUMLIST | ARRAY |
| GET | `/vista/or/rpc/orwpce5-remtax` | ORWPCE5 REMTAX | ARRAY |
| GET | `/vista/or/rpc/orwpce5-taxcodes` | ORWPCE5 TAXCODES | ARRAY |
| GET | `/vista/or/rpc/orwpce5-notedate` | ORWPCE5 NOTEDATE | SINGLE VALUE |
| GET | `/vista/or/rpc/orb3u2-getrcpnt` | ORB3U2 GETRCPNT | ARRAY |
| GET | `/vista/or/rpc/orwpce5-magdat` | ORWPCE5 MAGDAT | SINGLE VALUE |
| GET | `/vista/or/rpc/orvimm-chktitle` | ORVIMM CHKTITLE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce5-noteloc` | ORWPCE5 NOTELOC | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpce4-stdcodes` | ORWPCE4 STDCODES | ARRAY |
| GET | `/vista/or/rpc/orwdps33-ivind` | ORWDPS33 IVIND | ARRAY |
| GET | `/vista/or/rpc/orvimm-getcodes` | ORVIMM GETCODES | ARRAY |
| GET | `/vista/or/rpc/orwpce5-replcode` | ORWPCE5 REPLCODE | ARRAY |
| GET | `/vista/or/rpc/orvimm-getctinf` | ORVIMM GETCTINF | SINGLE VALUE |
| GET | `/vista/or/rpc/orvimm-ploc` | ORVIMM PLOC | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdxc-clrallgy` | ORWDXC CLRALLGY | SINGLE VALUE |
| GET | `/vista/or/rpc/orwdps33-clzds` | ORWDPS33 CLZDS | SINGLE VALUE |
| GET | `/vista/or/rpc/oraccess-getnotes` | ORACCESS GETNOTES | ARRAY |
| GET | `/vista/or/rpc/orwu-fldinfo` | ORWU FLDINFO | ARRAY |
| GET | `/vista/or/rpc/oracces2-dlgoiinfo` | ORACCES2 DLGOIINFO | ARRAY |
| GET | `/vista/or/rpc/oracces2-labsbyxref` | ORACCES2 LABSBYXREF | SINGLE VALUE |
| GET | `/vista/or/rpc/oracces2-dietinfo` | ORACCES2 DIETINFO | ARRAY |
| GET | `/vista/or/rpc/oraccess-ehractive` | ORACCESS EHRACTIVE | SINGLE VALUE |
| GET | `/vista/or/rpc/orwlrap1-aporditm` | ORWLRAP1 APORDITM | ARRAY |
| GET | `/vista/or/rpc/orqqvi-swpvit` | ORQQVI SWPVIT | ARRAY |
| GET | `/vista/or/rpc/orwpt2-id-info` | ORWPT2 ID INFO | SINGLE VALUE |
| GET | `/vista/or/rpc/orwpt2-lookup` | ORWPT2 LOOKUP | ARRAY |
