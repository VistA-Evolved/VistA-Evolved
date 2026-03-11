# Adverse Reaction Tracking (GMRA)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Patient allergies, reactions, causative agents

| Property | Value |
|----------|-------|
| Namespace | `GMRA` |
| Tier | 5 |
| FileMan Files | 4 |
| RPCs | 3 |
| Menu Options | 44 |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 120.8 | File #120.8 | ? | ? |
| 120.82 | File #120.82 | ? | ? |
| 120.83 | File #120.83 | ? | ? |
| 120.84 | File #120.84 | ? | ? |

## Remote Procedure Calls (RPCs)

### `ORQQAL LIST`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `ORQQAL` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns a list of allergies for a patient.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |

**API Endpoint:** `GET /vista/gmra/rpc/orqqal-list`

---

### `ORQQAL DETAIL`

| Property | Value |
|----------|-------|
| Tag | `DETAIL` |
| Routine | `ORQQAL` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This function returns a string of information for a specific allergy/ adverse reaction.  Returned data is delimited by "^" and includes: allergen/reactant, originator, originator title, verified/not verified,  observed/historical,<blank>,type, observation date, severity, drug class,  symptoms/reacti

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ALLERGY ID | LITERAL | No |

**API Endpoint:** `GET /vista/gmra/rpc/orqqal-detail`

---

### `ORQQAL LIST REPORT`

| Property | Value |
|----------|-------|
| Tag | `LRPT` |
| Routine | `ORQQAL` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** Returns a list of allergens, severity and signs/symptoms in a report format which can be used in a "detailed" display.  This RPC was set up to support the listing of allergies when selected from the Patient Postings list.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENT ID | LITERAL | No |

**API Endpoint:** `GET /vista/gmra/rpc/orqqal-list-report`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| PATIENT ID: | ORQQAL LIST | PATIENT ID | LITERAL | rpc |
| ALLERGY ID: | ORQQAL DETAIL | ALLERGY ID | LITERAL | rpc |
| PATIENT ID: | ORQQAL LIST REPORT | PATIENT ID | LITERAL | rpc |

## Menu Options

### Run routine

| Name | Security Key |
|------|-------------|
| GMRA SITE FILE | — |
| GMRA ALLERGY FILE EDIT | — |
| GMRA REACTION FILE EDIT | — |
| GMRA PATIENT A/AR EDIT | — |
| GMRA PRINT-COMPLETE LISTING | — |
| GMRA MARK CHART | — |
| GMRA PATIENT A/AR VERIFY | GMRA-ALLERGY VERIFY |
| GMRA PRINT-ACTIVE LISTING | — |
| GMRA PRINT-NOT SIGNED OFF | — |
| GMRA PRINT-ID BAND/CHART | — |
| GMRA PRINT-PATIENTS NOT ASKED | — |
| GMRA FDA EDIT | — |
| GMRA PRINT-FDA REPORT | — |
| GMRA P&T EDIT | — |
| GMRA PRINT-FDA EXCEPT BY PT | — |
| GMRA PRINT-EXCEPT BY DATE | — |
| GMRA PRINT-FDA REPORT BY DT | — |
| GMRA PRINT A/AR NV | — |
| GMRA TASK A/AR NV | — |
| GMRA PRINT SIGN BY LOC/DATE | — |
| GMRA PRINT ART TRACKING REPORT | — |
| GMRA PRINT LIST FATAL REACTION | — |
| GMRA PRINT SUM OF OUTCOME | — |
| GMRA PRINT FREQUENCY REACTION | — |
| GMRA PRINT FREQUENCY DR CL | — |
| GMRA PRINT REPORTED REACTIONS | — |
| GMRA PRINT ADR OUTCOME | — |
| GMRA PRINT ADR REPORT | — |
| GMRA USER E/E PAT REC DATA | — |
| GMRA DOC REF-CARD | — |
| GMRA FREE TEXT UTILITY | — |
| GMRA ASSESSMENT UTILITY | — |

### Menu

| Name | Security Key |
|------|-------------|
| GMRA SITE FILE MENU | — |
| GMRA USER MENU | — |
| GMRA VERIFIER MENU | — |
| GMRA P&T MENU | — |
| GMRA PRINT VERIFIER MENU | — |
| GMRA PRINT P&T MENU | — |
| GMRA CLINICIAN MENU | — |
| GMRA PRINT CLINICIAN MENU | — |
| GMRA FDA ENTER/EDIT MENU | — |

### Print

| Name | Security Key |
|------|-------------|
| GMRA PRINT AUTOVERIFIED DATA | — |
| GMRA PRINT SIGN/SYMPTOMS LIST | — |
| GMRA PRINT ALLERGIES LIST | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `GMRA-ALLERGY VERIFY`

## API Route Summary

All routes are prefixed with `/vista/gmra/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/gmra/rpc/orqqal-list` | ORQQAL LIST | ARRAY |
| GET | `/vista/gmra/rpc/orqqal-detail` | ORQQAL DETAIL | ARRAY |
| GET | `/vista/gmra/rpc/orqqal-list-report` | ORQQAL LIST REPORT | ARRAY |
