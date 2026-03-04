# VistA Connectivity Verification Results

**Date:** 2026-03-04  
**Target:** VEHU container (`worldvista/vehu:latest`) on port 9431  
**User:** PROGRAMMER,ONE (DUZ=1, PRO1234/PRO1234!!)  
**Script:** `scripts/verify-vista.ts` (via `pnpm verify:vista`)

## Summary: 6/6 PASS

| # | Test | Status | Duration | Detail |
|---|------|--------|----------|--------|
| 0 | Connect | PASS | 3165ms | DUZ=1 |
| 1 | ORWU USERINFO | PASS | 12ms | First line: user info returned |
| 2 | ORWPT LIST ALL | PASS | 51ms | Multiple patients returned |
| 3 | ORWORDG IEN | PASS | 4ms | Response received |
| 4 | ORWU DT | PASS | 2ms | Server time returned |
| 5 | Disconnect | PASS | 0ms | Clean disconnect |

## RPC Capability Probe Summary

**Endpoint:** `GET /vista/rpc-capabilities` (requires auth session)  
**Total Probed:** 87 unique RPCs  
**Available:** 64  
**Missing:** 23 (1 expected, 22 unexpected)

### Available RPCs (64)

- ORWPT LIST ALL, ORWPT SELECT, ORQPT DEFAULT PATIENT LIST
- ORQQAL LIST, ORWDAL32 ALLERGY MATCH, ORWDAL32 SAVE ALLERGY
- ORQQVI VITALS, GMV ADD VM
- TIU DOCUMENTS BY CONTEXT, TIU CREATE RECORD, TIU SET RECORD TEXT, TIU GET RECORD TEXT
- ORWPS ACTIVE, ORWORR GETTXT, ORWDXM AUTOACK
- ORQQPL PROBLEM LIST, ORQQPL4 LEX, ORQQPL ADD SAVE
- ORWDX SAVE, ORWDXA DC, ORWDXA FLAG, ORWDXA VERIFY, ORWORR AGET, ORWOR1 SIG, ORWDXC ACCEPT
- ORQQCN LIST, ORQQCN DETAIL, ORQQCN2 MED RESULTS
- ORWSR LIST, ORWSR RPTLIST
- ORWLRR INTERIM, ORWLRR ACK, ORWLRR CHART
- ORWRP REPORT LISTS, ORWRP REPORT TEXT
- ORWORB UNSIG ORDERS, ORWORB FASTUSER
- ORWCIRN FACILITIES
- MAG4 REMOTE PROCEDURE, RA DETAILED REPORT
- ORWPCE SAVE, ORWPCE VISIT, ORWPCE GET VISIT, ORWPCE DIAG, ORWPCE PROC
- ORWPCE PCE4NOTE, ORWPCE HASVISIT, ORWPCE GETSVC, ORWPCE4 LEX, ORWPCE ACTIVE CODE
- IBCN INSURANCE QUERY, IBD GET ALL PCE DATA, IBD GET FORMSPEC, IBO MT LTC COPAY QUERY
- VE INTEROP HL7 LINKS, VE INTEROP MSG LIST, VE INTEROP MSG DETAIL
- ZVE MAIL FOLDERS, ZVE MAIL LIST, ZVE MAIL GET, ZVE MAIL SEND, ZVE MAIL MANAGE
- VE LIST RPCS, VE RCM PROVIDER INFO

### Missing RPCs (23)

| RPC | Error | Category |
|-----|-------|----------|
| ORQQPL EDIT SAVE | "doesn't exist" | Expected — known sandbox limitation |
| ORWPCE LEXCODE | "doesn't exist" | RPC not registered in VEHU |
| IBARXM QUERY ONLY | "doesn't exist" | RPC not registered in VEHU |
| VE INTEROP HL7 MSGS | "doesn't exist" | Custom routine issue |
| VE INTEROP HLO STATUS | "doesn't exist" | Custom routine issue |
| VE INTEROP QUEUE DEPTH | "doesn't exist" | Custom routine issue |
| ZVEADT WARDS | Socket closed | Custom routine crashes VistA connection |
| ZVEADT BEDS | Not connected | Cascade from ZVEADT WARDS failure |
| ZVEADT MVHIST | Not connected | Cascade from ZVEADT WARDS failure |
| DGPM NEW ADMISSION | Not connected | Cascade from ZVEADT WARDS failure |
| DGPM NEW TRANSFER | Not connected | Cascade from ZVEADT WARDS failure |
| DGPM NEW DISCHARGE | Not connected | Cascade from ZVEADT WARDS failure |
| PSB MED LOG | Not connected | Cascade from ZVEADT WARDS failure |
| PSB ALLERGY | Not connected | Cascade from ZVEADT WARDS failure |
| PSB VALIDATE ORDER | Not connected | Cascade from ZVEADT WARDS failure |
| PSJBCMA | Not connected | Cascade from ZVEADT WARDS failure |
| NURS TASK LIST | Not connected | Cascade from ZVEADT WARDS failure |
| NURS ASSESSMENTS | Not connected | Cascade from ZVEADT WARDS failure |
| LR VERIFY | Not connected | Cascade from ZVEADT WARDS failure |
| GMRIO RESULTS | Not connected | Cascade from ZVEADT WARDS failure |
| GMRIO ADD | Not connected | Cascade from ZVEADT WARDS failure |
| ZVENAS LIST | Not connected | Cascade from ZVEADT WARDS failure |
| ZVENAS SAVE | Not connected | Cascade from ZVEADT WARDS failure |

### Key Finding: ZVEADT WARDS Cascade Failure

The `ZVEADT WARDS` RPC crashes the VistA connection (socket closed), causing all 16 subsequent RPCs to fail with "Not connected." Of the 23 "missing" RPCs, only 6 are genuinely missing — the other 17 are false negatives from the cascade.

**True missing RPCs:** ORQQPL EDIT SAVE, ORWPCE LEXCODE, IBARXM QUERY ONLY, VE INTEROP HL7 MSGS, VE INTEROP HLO STATUS, VE INTEROP QUEUE DEPTH

**ZVEADT crash + cascade:** ZVEADT WARDS + 16 downstream RPCs
