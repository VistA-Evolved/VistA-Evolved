# PAID (PRS)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `PRS` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 2 |
| Menu Options | 1 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `PRSN NURS LOCATION EXTRACTION`

| Property | Value |
|----------|-------|
| Tag | `NURSLOC` |
| Routine | `PRSN9A` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** VANOD shall have the ability to extract data from the Nursing Location  (file # 211.4).   For inpatient settings the location data can be used by VANOD as a map  between nurse POC data and the patients for whom they provide care.  For  other care settings the location data can be used to report an a

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PRSNDT | LITERAL | No |

**API Endpoint:** `GET /vista/prs/rpc/prsn-nurs-location-extraction`

---

### `PRSN POC DAILY TIME EXTRACTION`

| Property | Value |
|----------|-------|
| Tag | `POCTIME` |
| Routine | `PRSN9B` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** VANOD shall have the ability to extract data from the POC DAILY ACTIVITY EXTRACTION File (#451.7).   Input Parameters: The PEV RPC Broker call shall be called with the following input parameters.   Parameter 1:  Integer - records with a sequence number greater than this value shall be returned, in s

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PRSNSEQ | LITERAL | No |
| 2 | PRSNREC | LITERAL | No |

**API Endpoint:** `GET /vista/prs/rpc/prsn-poc-daily-time-extraction`

---


## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| PRS MONTH CALENDAR | — |

## Security Keys

No security keys defined for this package.

## API Route Summary

All routes are prefixed with `/vista/prs/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/prs/rpc/prsn-nurs-location-extraction` | PRSN NURS LOCATION EXTRACTION | GLOBAL ARRAY |
| GET | `/vista/prs/rpc/prsn-poc-daily-time-extraction` | PRSN POC DAILY TIME EXTRACTION | GLOBAL ARRAY |
