# KMP (KMP)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `KMP` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 28 |
| Menu Options | 1 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `KMPD FILE SEARCH`

| Property | Value |
|----------|-------|
| Tag | `FILESRC` |
| Routine | `KMPDU5` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Search for entries in file.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM1 | LITERAL | No |
| 2 | PARAM2 | LITERAL | No |
| 3 | PARAM3 | LITERAL | No |
| 4 | PARAM4 | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-file-search`

---

### `KMPD VERSION`

| Property | Value |
|----------|-------|
| Tag | `VERSION` |
| Routine | `KMPDU5` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Get version number for CM Developer Tools application.

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-version`

---

### `KMPD ENVIRONMENT`

| Property | Value |
|----------|-------|
| Tag | `ENV` |
| Routine | `KMPDU5` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-environment`

---

### `KMPD FILE INQUIRY`

| Property | Value |
|----------|-------|
| Tag | `FILEINQ` |
| Routine | `KMPDU5` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Return all data in file for specific entry.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM1 | LITERAL | No |
| 2 | PARAM2 | LITERAL | No |
| 3 | PARAM3 | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-file-inquiry`

---

### `KMPD GLOBAL LIST`

| Property | Value |
|----------|-------|
| Tag | `GBLLIST` |
| Routine | `KMPDU1` |
| Return Type | ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Global list.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM1 | LITERAL | No |
| 2 | PARAM2 | LITERAL | No |
| 3 | PARAM3 | LITERAL | No |
| 4 | LINE LENGTH | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-global-list`

---

### `KMPD ERROR LOG DATA`

| Property | Value |
|----------|-------|
| Tag | `ERRDATA` |
| Routine | `KMPDU3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Get data from file #3.075 (ERROR LOG).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM1 | LITERAL | No |
| 2 | PARAM2 | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-error-log-data`

---

### `KMPD ROUTINE FIND`

| Property | Value |
|----------|-------|
| Tag | `ROUFIND` |
| Routine | `KMPDU2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Return list of routine names.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM1 | LITERAL | No |
| 2 | PARAM2 | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-routine-find`

---

### `KMPD ROUTINE INQ`

| Property | Value |
|----------|-------|
| Tag | `ROUINQ` |
| Routine | `KMPDU2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Routine inquiry.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM1 | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-routine-inq`

---

### `KMPD ROUTINE LINE SRCH`

| Property | Value |
|----------|-------|
| Tag | `ROUSRC2` |
| Routine | `KMPDU2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Search routine(s) for text.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ROUTINES | REFERENCE | No |
| 2 | SEARCH TEXT | LITERAL | No |
| 3 | GLOBAL | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-routine-line-srch`

---

### `KMPD ROUTINE STATS`

| Property | Value |
|----------|-------|
| Tag | `ROUSTATS` |
| Routine | `KMPDU3` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Routine stats from file #8972.1 (CAPMAN ROUTINE STATS).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM1 | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-routine-stats`

---

### `KMPD ROUTINE SAVE`

| Property | Value |
|----------|-------|
| Tag | `ROUSAVE` |
| Routine | `KMPDU3` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Save Routine.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM1 | LITERAL | No |
| 2 | PARAM2 | REFERENCE | No |

**API Endpoint:** `POST /vista/kmp/rpc/kmpd-routine-save`

---

### `KMPD FM DATE`

| Property | Value |
|----------|-------|
| Tag | `FMDTI` |
| Routine | `KMPDU` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Return user response as fm date.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM1 | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-fm-date`

---

### `KMPD ERROR LOG DATE`

| Property | Value |
|----------|-------|
| Tag | `ERRDATE` |
| Routine | `KMPDU3` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Get matching date or list of dates from file #3.075 (ERROR LOG).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM1 | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-error-log-date`

---

### `KMPD ASSOC ROUTINE ADD/DEL`

| Property | Value |
|----------|-------|
| Tag | `ASSCROU` |
| Routine | `KMPDU4` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Delete all entries in multiple field #11 (ASSOCIATED ROUTINE) in file #8972.1 (CM CODE EVALUATOR) and then add entries to multiple.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM1 | LITERAL | No |
| 2 | PARAM2 | REFERENCE | No |

**API Endpoint:** `POST /vista/kmp/rpc/kmpd-assoc-routine-add/del`

---

### `KMPD APPL STATUS`

| Property | Value |
|----------|-------|
| Tag | `STATUS` |
| Routine | `KMPDU6` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns the status for cm applications: HL7                                         RUM                                         SAGG                                         TIMING

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | APPLICATION | LITERAL | No |
| 2 | GLOBAL | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-appl-status`

---

### `KMPD DATA ELEMENTS`

| Property | Value |
|----------|-------|
| Tag | `ELEMENTS` |
| Routine | `KMPDU6` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Return list of Data Elements in format: piece^name   example 5^M Commands

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-data-elements`

---

### `KMPD NODES`

| Property | Value |
|----------|-------|
| Tag | `NODES` |
| Routine | `KMPDU6` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Return the names of active nodes.

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-nodes`

---

### `KMPD TMG MON DATA`

| Property | Value |
|----------|-------|
| Tag | `TMGMON` |
| Routine | `KMPDU7` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Return Timing Monitor data.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MONITOR START TIME | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-tmg-mon-data`

---

### `KMPD USER PARAMETERS`

| Property | Value |
|----------|-------|
| Tag | `USRPARAM` |
| Routine | `KMPDU6` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Set/Get gui option info.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUZ | LITERAL | No |
| 2 | TYPE | LITERAL | No |
| 3 | OPTION | REFERENCE | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-user-parameters`

---

### `KMPD TMG DATES`

| Property | Value |
|----------|-------|
| Tag | `TMGDATES` |
| Routine | `KMPDU7` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Return Timing dates in format:           array(0)=FMStartDate^ExtStartDate^FMEndDate^ExtEndDate         array(1)=FMDate^ExtDate         array(2)=FMDate^ExtDate         array(...)=...

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SUBSCRIPT | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-tmg-dates`

---

### `KMPD TMG REPORTS`

| Property | Value |
|----------|-------|
| Tag | `TMGRPT` |
| Routine | `KMPDU7` |
| Return Type | ARRAY |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Description:** Get Timing Reports data.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DATES | REFERENCE | No |
| 2 | TIME FRAME | LITERAL | No |
| 3 | REPORT NAME | LITERAL | No |
| 4 | TTL SEARCH | LITERAL | No |
| 5 | SECONDS | LITERAL | No |
| 6 | HOUR | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-tmg-reports`

---

### `KMPD REPORT DEFINITION`

| Property | Value |
|----------|-------|
| Tag | `REPDEF` |
| Routine | `KMPDU4` |
| Return Type | WORD PROCESSING |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Get Report Definition from file #8973.3 (CP REPORT).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REPORT | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-report-definition`

---

### `KMPD TMG STATUS`

| Property | Value |
|----------|-------|
| Tag | `TMGSTAT` |
| Routine | `KMPDU7` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Timing Monitor status.

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-tmg-status`

---

### `KMPD RUM START/STOP`

| Property | Value |
|----------|-------|
| Tag | `RUMSS` |
| Routine | `KMPDU6` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Start/Stop RUM.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | START/STOP | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-rum-start/stop`

---

### `KMPD TMG START/STOP`

| Property | Value |
|----------|-------|
| Tag | `TMGSST` |
| Routine | `KMPDU7` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Start/Stop Timing Monitor.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | START/STOP | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-tmg-start/stop`

---

### `KMPD RUM ENV`

| Property | Value |
|----------|-------|
| Tag | `RUMENV` |
| Routine | `KMPDU6` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RUM environment.

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-rum-env`

---

### `KMPD SEARCH BY LIST`

| Property | Value |
|----------|-------|
| Tag | `SBLIST` |
| Routine | `KMPDU7` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Search By list.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LISTTYPE | LITERAL | No |
| 2 | SUBSCRIPT | LITERAL | No |
| 3 | DATAGLOBAL | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-search-by-list`

---

### `KMPD ERROR LOG LIST`

| Property | Value |
|----------|-------|
| Tag | `ERRLIST` |
| Routine | `KMPDU3` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Return a list of errors for a certain date from file #3.075 (ERROR LOG).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAM1 | LITERAL | No |
| 2 | SCREEN | LITERAL | No |
| 3 | DATAGLOBAL | LITERAL | No |

**API Endpoint:** `GET /vista/kmp/rpc/kmpd-error-log-list`

---


## Menu Options

### Action

| Name | Security Key |
|------|-------------|
| KMP MAIL GROUP EDIT | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/kmp/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/kmp/rpc/kmpd-file-search` | KMPD FILE SEARCH | GLOBAL ARRAY |
| GET | `/vista/kmp/rpc/kmpd-version` | KMPD VERSION | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-environment` | KMPD ENVIRONMENT | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-file-inquiry` | KMPD FILE INQUIRY | GLOBAL ARRAY |
| GET | `/vista/kmp/rpc/kmpd-global-list` | KMPD GLOBAL LIST | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-error-log-data` | KMPD ERROR LOG DATA | GLOBAL ARRAY |
| GET | `/vista/kmp/rpc/kmpd-routine-find` | KMPD ROUTINE FIND | GLOBAL ARRAY |
| GET | `/vista/kmp/rpc/kmpd-routine-inq` | KMPD ROUTINE INQ | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-routine-line-srch` | KMPD ROUTINE LINE SRCH | GLOBAL ARRAY |
| GET | `/vista/kmp/rpc/kmpd-routine-stats` | KMPD ROUTINE STATS | ARRAY |
| POST | `/vista/kmp/rpc/kmpd-routine-save` | KMPD ROUTINE SAVE | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-fm-date` | KMPD FM DATE | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-error-log-date` | KMPD ERROR LOG DATE | ARRAY |
| POST | `/vista/kmp/rpc/kmpd-assoc-routine-add/del` | KMPD ASSOC ROUTINE ADD/DEL | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-appl-status` | KMPD APPL STATUS | GLOBAL ARRAY |
| GET | `/vista/kmp/rpc/kmpd-data-elements` | KMPD DATA ELEMENTS | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-nodes` | KMPD NODES | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-tmg-mon-data` | KMPD TMG MON DATA | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-user-parameters` | KMPD USER PARAMETERS | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-tmg-dates` | KMPD TMG DATES | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-tmg-reports` | KMPD TMG REPORTS | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-report-definition` | KMPD REPORT DEFINITION | WORD PROCESSING |
| GET | `/vista/kmp/rpc/kmpd-tmg-status` | KMPD TMG STATUS | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-rum-start/stop` | KMPD RUM START/STOP | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-tmg-start/stop` | KMPD TMG START/STOP | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-rum-env` | KMPD RUM ENV | ARRAY |
| GET | `/vista/kmp/rpc/kmpd-search-by-list` | KMPD SEARCH BY LIST | GLOBAL ARRAY |
| GET | `/vista/kmp/rpc/kmpd-error-log-list` | KMPD ERROR LOG LIST | GLOBAL ARRAY |
