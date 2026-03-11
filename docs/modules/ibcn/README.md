# IBCN (IBCN)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

Charges, claims, insurance, means test, copay

| Property | Value |
|----------|-------|
| Namespace | `IBCN` |
| Tier | 5 |
| FileMan Files | 5 |
| RPCs | 2 |
| Menu Options | 34 |
| VDL Manual | `integrated-billing-user-guide.pdf` |

## FileMan Files

| File # | Name | Fields | Global |
|--------|------|--------|--------|
| 350 | File #350 | ? | ? |
| 399 | File #399 | ? | ? |
| 361 | File #361 | ? | ? |
| 361.1 | File #361.1 | ? | ? |
| 355.3 | File #355.3 | ? | ? |

## Remote Procedure Calls (RPCs)

### `IBCN INSURANCE QUERY`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `IBCNRDV` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This does a remote query on the insurance information.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBICN | LITERAL | No |

**API Endpoint:** `GET /vista/ibcn/rpc/ibcn-insurance-query`

---

### `IBCN INSURANCE QUERY TASK`

| Property | Value |
|----------|-------|
| Tag | `RPC` |
| Routine | `IBCNRDV` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This does a remote query on the insurance information. This is the one  that used during tasked jobs to avoid user data exchange.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IBICN | LITERAL | No |

**API Endpoint:** `GET /vista/ibcn/rpc/ibcn-insurance-query-task`

---


## Roll & Scroll Prompt Mappings

These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.

| R&S Prompt | RPC | Parameter | Type | Source |
|------------|-----|-----------|------|--------|
| FORMID: | IBD EXPAND FORMID | FORMID | LITERAL | rpc |
| FORMTYPE: | IBD GET FORMSPEC | FORMTYPE | LITERAL | rpc |
| CLINIC: | IBD GET INPUT OBJECT BY CLINIC | CLINIC | LITERAL | rpc |
| FRM: | IBD GET INPUT OBJECT BY FORM | FRM | LITERAL | rpc |
| IBDF: | IBD GET ONE INPUT OBJECT | IBDF | REFERENCE | rpc |
| FORMDATA: | IBD RECEIVE FORM DATA | FORMDATA | REFERENCE | rpc |
| IBDAV: | IBD VALIDATE USER | IBDAV | REFERENCE | rpc |
| IBDF: | IBD RECEIVE DATA | IBDF | REFERENCE | rpc |
| IBDF: | IBD ELAPSED TIME | IBDF | REFERENCE | rpc |
| FORMID: | IBD STORE WORKSTATION ERROR | FORMID | REFERENCE | rpc |
| FORMID: | IBD STORE IMAGE NAME | FORMID | REFERENCE | rpc |
| IBDATA: | IBD GET ALL PCE DATA | IBDATA | REFERENCE | rpc |
| IBDF: | IBD GET PAST APPT LIST | IBDF | REFERENCE | rpc |
| IBICN: | IBARXM QUERY ONLY | IBICN | LITERAL | rpc |
| IBM: | IBARXM QUERY ONLY | IBM | LITERAL | rpc |
| IBD: | IBARXM TRANS DATA | IBD | LITERAL | rpc |
| IBICN: | IBARXM TRANS DATA | IBICN | LITERAL | rpc |
| IBICN: | IBARXM TRANS BILL | IBICN | LITERAL | rpc |
| IBT: | IBARXM TRANS BILL | IBT | LITERAL | rpc |
| IBB: | IBARXM TRANS BILL | IBB | LITERAL | rpc |
| IBM: | IBARXM QUERY SUPPRESS USER | IBM | LITERAL | rpc |
| IBICN: | IBARXM QUERY SUPPRESS USER | IBICN | LITERAL | rpc |
| IBICN: | IBO MT LTC COPAY QUERY | IBICN | LITERAL | rpc |
| DFN: | IBO MT LTC COPAY QUERY | DFN | LITERAL | rpc |
| IBBDT: | IBO MT LTC COPAY QUERY | IBBDT | LITERAL | rpc |
| IBEDT: | IBO MT LTC COPAY QUERY | IBEDT | LITERAL | rpc |
| IBICN: | IBCN INSURANCE QUERY | IBICN | LITERAL | rpc |
| IBICN: | IBCN INSURANCE QUERY TASK | IBICN | LITERAL | rpc |
| IBDF: | IBD GET FORMSPEC GLOBAL | IBDF | REFERENCE | rpc |
| FORMID: | IBD GET SCAN PAGE INFO | FORMID | LITERAL | rpc |
| ARG: | IBTAS 837 CLAIM DATA | ARG | REFERENCE | rpc |
| ARG: | IBTAS 837 EDICLAIMS | ARG | REFERENCE | rpc |
| ARG: | IBTAS 837 ACK | ARG | REFERENCE | rpc |
| IBICN: | IBECEA COPAY SYNCH | IBICN | LITERAL | rpc |
| IBSITE: | IBECEA COPAY SYNCH | IBSITE | LITERAL | rpc |
| IBBILL: | IBECEA COPAY SYNCH | IBBILL | LITERAL | rpc |
| IBVISDT: | IBECEA COPAY SYNCH | IBVISDT | LITERAL | rpc |
| IBSTAT: | IBECEA COPAY SYNCH | IBSTAT | LITERAL | rpc |
| IBCOMM: | IBECEA COPAY SYNCH | IBCOMM | LITERAL | rpc |
| IBUNIQ: | IBECEA COPAY SYNCH | IBUNIQ | LITERAL | rpc |
| IBELGRP: | IBECEA COPAY SYNCH | IBELGRP | LITERAL | rpc |
| ARG: | IBTAS FACILITY BY VISN | ARG | LITERAL | rpc |
| ARG: | IBTAS 277STAT | ARG | REFERENCE | rpc |
| ARG: | IBTAS 837 FHIR ENABLE | ARG | REFERENCE | rpc |
| ARG: | IBTAS 837 TEST CLAIMS | ARG | REFERENCE | rpc |
| ARG: | IBTAS 837 CLAIM NUMBER | ARG | REFERENCE | rpc |
| ARG: | IBTAS PCR IENS | ARG | REFERENCE | rpc |
| ARG: | IBTAS PCR CLAIM DATA | ARG | REFERENCE | rpc |
| ARG: | IBTAS PCR WRITEBACK | ARG | REFERENCE | rpc |
| ARG: | IBTASDB POST | ARG | REFERENCE | rpc |
| IBICN: | IBMH COPAY SYNCH | IBICN | LITERAL | rpc |
| IBSITE: | IBMH COPAY SYNCH | IBSITE | LITERAL | rpc |
| IBBILL: | IBMH COPAY SYNCH | IBBILL | LITERAL | rpc |
| IBVISDT : | IBMH COPAY SYNCH | IBVISDT  | LITERAL | rpc |
| IBSTAT: | IBMH COPAY SYNCH | IBSTAT | LITERAL | rpc |
| IBCOMM: | IBMH COPAY SYNCH | IBCOMM | LITERAL | rpc |
| IBUNIQ: | IBMH COPAY SYNCH | IBUNIQ | LITERAL | rpc |
| FORMID: | IBD EXPAND FORMID | FORMID | LITERAL | rpc |
| FORMTYPE: | IBD GET FORMSPEC | FORMTYPE | LITERAL | rpc |
| CLINIC: | IBD GET INPUT OBJECT BY CLINIC | CLINIC | LITERAL | rpc |
| FRM: | IBD GET INPUT OBJECT BY FORM | FRM | LITERAL | rpc |
| IBDF: | IBD GET ONE INPUT OBJECT | IBDF | REFERENCE | rpc |
| FORMDATA: | IBD RECEIVE FORM DATA | FORMDATA | REFERENCE | rpc |
| IBDAV: | IBD VALIDATE USER | IBDAV | REFERENCE | rpc |
| IBDF: | IBD RECEIVE DATA | IBDF | REFERENCE | rpc |
| IBDF: | IBD ELAPSED TIME | IBDF | REFERENCE | rpc |
| FORMID: | IBD STORE WORKSTATION ERROR | FORMID | REFERENCE | rpc |
| FORMID: | IBD STORE IMAGE NAME | FORMID | REFERENCE | rpc |
| IBDATA: | IBD GET ALL PCE DATA | IBDATA | REFERENCE | rpc |
| IBDF: | IBD GET PAST APPT LIST | IBDF | REFERENCE | rpc |
| IBDF: | IBD GET FORMSPEC GLOBAL | IBDF | REFERENCE | rpc |
| FORMID: | IBD GET SCAN PAGE INFO | FORMID | LITERAL | rpc |
| IBICN: | IBCN INSURANCE QUERY | IBICN | LITERAL | rpc |
| IBICN: | IBCN INSURANCE QUERY TASK | IBICN | LITERAL | rpc |

## Menu Options

### Menu

| Name | Security Key |
|------|-------------|
| IBCN INSURANCE MGMT MENU | — |
| IBCN VIEW INSURANCE DATA | — |
| IBCN INS RPTS | — |

### Run routine

| Name | Security Key |
|------|-------------|
| IBCN INSURANCE CO EDIT | IB INSURANCE COMPANY EDIT |
| IBCN PATIENT INSURANCE | — |
| IBCN VIEW PATIENT INSURANCE | — |
| IBCN VIEW INSURANCE CO | — |
| IBCN LIST NEW NOT VER | — |
| IBCN LIST PLANS BY INS CO | — |
| IBCN INSURANCE BUFFER PROCESS | — |
| IBCN OUTPUT INS BUFF ACTIVITY | — |
| IBCN OUTPUT INS BUFF EMPLOYEE | — |
| IBCN INSURANCE BUFFER PURGE | — |
| IBCN ID DUP INSURANCE ENTRIES | — |
| IBCN POL W/NO EFF DATE REPORT | — |
| IBCN MOVE SUBSCRIB TO PLAN | — |
| IBCN PT W/WO INSURANCE REPORT | — |
| IBCN NO COVERAGE VERIFIED | — |
| IBCN SPLIT COMBO POLICIES | — |
| IBCN REMOTE INSURANCE QUERY | — |
| IBCN INSURANCE EDI REPORT | — |
| IBCN RESYNCH INS COMP | — |
| IBCN UPDATE SUBSCRIBER INFO | IB SUPERVISOR |
| IBCN USER EDIT RPT | — |
| IBCN HPID CLAIM RPT | — |
| IBCN EXPIRE GROUP SUBSCRIBERS | — |
| IBCN EINSURANCE NIGHT PROCESS | — |
| IBCN COVERAGE LIMITATION RPT | — |
| IBCN INS COMPANY MISSING DATA | — |
| IBCN GRP PLAN MISSING DATA | — |
| IBCN PT MISSING COVERAGE REPT | — |
| IBCN DAILY BUFFER REPORT | — |
| IBCN EDI PAYER ID REPT | — |
| IBCN DUP GRP PLAN BY INS RPT | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `IB INSURANCE COMPANY EDIT`
- `IB SUPERVISOR`

## API Route Summary

All routes are prefixed with `/vista/ibcn/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| GET | `/vista/ibcn/rpc/ibcn-insurance-query` | IBCN INSURANCE QUERY | ARRAY |
| GET | `/vista/ibcn/rpc/ibcn-insurance-query-task` | IBCN INSURANCE QUERY TASK | ARRAY |

## VDL Documentation Reference

Source manual: `data/vista/vdl-manuals/integrated-billing-user-guide.pdf`

Refer to the official VA VistA Documentation Library (VDL) manual for:

- Roll & Scroll terminal operation procedures
- Security key assignments and menu management
- FileMan file relationships and data entry rules
- MUMPS routine reference and entry points
