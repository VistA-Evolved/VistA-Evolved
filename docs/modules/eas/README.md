# Enrollment Application System (EAS)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `EAS` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 1 |
| Menu Options | 41 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `EAS ESR MESSAGING`

| Property | Value |
|----------|-------|
| Tag | `TAG` |
| Routine | `EAS1071A` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This is a stub RPC to trigger dual messaging changes on Vista Sites

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | MODE | LITERAL | No |

**API Endpoint:** `GET /vista/eas/rpc/eas-esr-messaging`

---


## Menu Options

### Server

| Name | Security Key |
|------|-------------|
| EAS EZ SERVER | — |

### Run routine

| Name | Security Key |
|------|-------------|
| EAS EZ 1010EZ PROCESSING | — |
| EAS EZ QUICK LOOKUP | — |
| EAS EZ REMOVE SIGNATURE | — |
| EAS MEANS TEST SIG SUM RPT | — |
| EAS MEANS TEST SIG DET RPT | — |
| EAS GMT THRESHOLDS LOOKUP | — |
| EAS VIEW PATIENT ADDRESS | — |
| EAS MERGE DUP MT/COPAY DEP | DG MEANSTEST |
| EAS DELETE MT/COPAY DEPENDENT | DG MEANSTEST |
| EAS DUPLICATE DEPENDENTS RPT | DG MEANSTEST |

### Menu

| Name | Security Key |
|------|-------------|
| EAS EZ MENU | — |
| EAS MEANS TEST SIGNATURE RPTS | — |
| EAS MT PRINT MENU | — |
| EAS MT AUTO LETTERS MENU | — |
| EAS MT REPORT MENU | — |
| EAS MT SETUP MENU | EAS MTSUPV |

### Action

| Name | Security Key |
|------|-------------|
| EAS MT 30 DAY LETTER PRINT | — |
| EAS MT 60 DAY LETTER PRINT | — |
| EAS MT 0 DAY LETTER PRINT | — |
| EAS MT LETTERS SEARCH | — |
| EAS MT RETURNED | — |
| EAS MT SUMMARY REPORT | — |
| EAS MT REPRINT LETTERS | — |
| EAS MT PENDING LETTERS | — |
| EAS MT REPRINT SINGLE LETTER | — |
| EAS MT STATISTICS SUMMARY | — |
| EAS MT LETTERS BG SEARCH | — |
| EAS MT PROHIBIT EDIT | — |
| EAS MT PARAMETERS | — |
| EAS MT UNRETURNED LETTERS | — |
| EAS MT LETTERS BG PRINT | — |
| EAS MT EXPIRATIONS | — |
| EAS MT EXPIRATION BG PRINT | — |
| EAS MT CLEAR IN USE FLAG | — |
| EAS MT REPORT OF CONTACT | — |
| EAS MT APPT EXPIRATION RPT | — |
| EAS MT TEST LETTER | — |
| EAS MT UE STATUS | — |
| EAS MT UES OVERRIDE | EAS MT UES OVERRIDE |

### Edit

| Name | Security Key |
|------|-------------|
| EAS MT LETTERS EDIT | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `EAS MTSUPV`
- `DG MEANSTEST`
- `EAS MT UES OVERRIDE`

## API Route Summary

All routes are prefixed with `/vista/eas/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/eas/rpc/eas-esr-messaging` | EAS ESR MESSAGING | ARRAY |
