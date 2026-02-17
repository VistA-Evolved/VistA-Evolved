# VistA Capability Matrix — Screen/Feature → VistA Package → RPC → FileMan Binding

> **Phase 20 — VistA-First Grounding**
> Every clinical screen/action MUST map to a VistA package + RPC(s) or be explicitly
> marked "integration-pending" with a mapped RPC target. Platform-only features
> (security, telemetry, caching) are labeled separately.

---

## Legend

| State | Meaning |
|-------|---------|
| **wired** | Live RPC call to VistA, data flows end-to-end |
| **stub** | RPC known, endpoint scaffolded, not yet calling VistA |
| **mock** | UI exists but data is fabricated / hardcoded |
| **gap** | No RPC identified yet; needs VistA-side research |
| **platform** | Not a VistA concern — pure platform infrastructure |

---

## 1. Authentication & Session (Kernel — XUS\*, XWB\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| User login | Kernel (XUS) | `XUS SIGNON SETUP`, `XUS AV CODE` | NEW PERSON #200 | **wired** | — |
| Context creation | Kernel (XWB) | `XWB CREATE CONTEXT` | OPTION #19, PROTOCOL #101 | **wired** | — |
| User info retrieval | Kernel (XUS) | `XUS GET USER INFO` | NEW PERSON #200 | **wired** | — |
| Session management | — | — | — | **platform** | In-memory session store; VistA DUZ is source of identity |
| Role mapping | Kernel | — | NEW PERSON #200 (keys, classes) | **platform** | Roles derived from VistA user; consider reading CPRS keys |
| Multi-tenant RBAC | — | — | — | **platform** | Tenant isolation is a platform concern, not VistA-native |

---

## 2. Patient Selection (OE/RR — OR\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| Patient search | OE/RR | `ORWPT LIST ALL` | PATIENT #2 | **wired** | — |
| Patient select/demographics | OE/RR | `ORWPT SELECT` | PATIENT #2, PATIENT/IHS #9000001 | **wired** | — |
| Default patient list | OE/RR | `ORQPT DEFAULT PATIENT LIST` | OE/RR PATIENT LIST #100.21 | **wired** | — |
| Patient photo | Imaging (MAG) | `MAGG PAT PHOTOS` | IMAGE #2005 | **gap** | Wire RPC; display in patient banner |
| Sensitive patient check | Registration | `DG SENSITIVE RECORD ACCESS` | PATIENT #2 (sensitive flag) | **gap** | Required for HIPAA; add before chart open |
| Means test / eligibility | Registration (DG) | `DG CHK PAT/DIV MEANS TEST` | PATIENT #2, ANNUAL MEANS TEST #408.31 | **gap** | Administrative feature; low priority |

---

## 3. Cover Sheet (OE/RR — OR\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| Active problems | Problem List (GMPL) | `ORWCH PROBLEM LIST` | PROBLEM #9000011 | **wired** | — |
| Active medications | Pharmacy (OE/RR) | `ORWPS ACTIVE` | PRESCRIPTION #52, NON-VA MED #55 | **wired** | — |
| Active allergies | Allergy (GMRA) | `ORQQAL LIST` | PATIENT ALLERGIES #120.8 | **wired** | — |
| Recent vitals | Vitals (GMV) | `ORQQVI VITALS` | GMRV VITAL MEASUREMENT #120.5 | **wired** | — |
| Postings (crisis notes, alerts) | TIU / Postings | `TIU GET PN TITLES`, `ORQQPP LIST` | TIU DOCUMENT #8925 | **gap** | Wire postings display |
| Recent lab results | Lab (LR) | `ORWLRR INTERIM` | LAB DATA #63 | **wired** | — |
| Active orders | OE/RR | `ORWORR AGET` | ORDER #100 | **gap** | Wire active orders summary |
| Visits/appointments | Scheduling (SD) | `ORWCV VST` | VISIT #9000010 | **gap** | Wire recent visits |
| Reminders (clinical) | Clinical Reminders (PXRM) | `ORQQPX REMINDERS UNEVALUATED` | REMINDER #801.41 | **gap** | Wire clinical reminders |

---

## 4. Problem List (GMPL\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| List active/inactive problems | Problem List (GMPL) | `ORWCH PROBLEM LIST` | PROBLEM #9000011 | **wired** (via OE/RR wrapper) | — |
| ICD search / lexicon | Lexicon (LEX) | `ORQQPL4 LEX` | EXPRESSIONS #757.01 | **wired** | — |
| Add problem | GMPL | `ORQQPL ADD SAVE` | PROBLEM #9000011 | **stub** | In write-backs.ts; needs live testing |
| Edit problem | GMPL | `ORQQPL EDIT SAVE` | PROBLEM #9000011 | **stub** | In write-backs.ts; needs live testing |
| Delete/inactivate problem | GMPL | `ORQQPL DELETE`, `ORQQPL REPLACE` | PROBLEM #9000011 | **gap** | Add RPC calls |
| Problem detail view | GMPL | `ORQQPL DETAIL` | PROBLEM #9000011 | **gap** | Add detail endpoint |
| Problem categories/filters | GMPL | `ORQQPL INIT PT` | PROBLEM #9000011 | **gap** | Service connection, exposures, etc. |

---

## 5. Medications (Pharmacy — PSO\*, PSJ\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| Active med list | OE/RR + Pharmacy | `ORWPS ACTIVE` | PRESCRIPTION #52, UNIT DOSE #55, NON-VA MED #55.05 | **wired** | — |
| Med detail/sig text | OE/RR | `ORWORR GETTXT` | ORDER #100 | **wired** | — |
| Quick-order med | OE/RR | `ORWDX LOCK`→`ORWDXM AUTOACK`→`ORWDX UNLOCK` | ORDER #100 | **wired** | — |
| Outpatient dispense history | Pharmacy (PSO) | `PSO RXINFO` | PRESCRIPTION #52 | **gap** | Wire dispense details |
| IV medications | Pharmacy (PSJ) | `ORWPS COVER` | IV #55.01 | **gap** | Wire IV display |
| Med reconciliation | Pharmacy | `ORWDXR01 DCORIG` | ORDER #100 | **gap** | Complex workflow; Phase 21+ |
| Drug interaction check | Pharmacy (PSJOE) | `ORWDXA DCREASON` | (order checks) | **gap** | Critical safety feature |

---

## 6. Orders (OE/RR — OR\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| Current orders list | OE/RR | `ORWORR AGET`, `ORWORR GET4LST` | ORDER #100 | **gap** | Wire order display |
| Order detail | OE/RR | `ORWORR GETTXT` | ORDER #100 | **wired** (for meds) | Generalize to all orders |
| Sign order | OE/RR | `ORWDX SAVE` | ORDER #100 | **stub** | In write-backs.ts |
| Release order | OE/RR | `ORWDXA VERIFY` | ORDER #100 | **stub** | In write-backs.ts |
| Discontinue order | OE/RR | `ORWDXA DC` | ORDER #100 | **gap** | Add DC endpoint |
| Order checks | OE/RR | `ORWDXC DISPLAY`, `ORWDXC SAVECHK` | ORDER CHECK #100.08 | **gap** | Critical safety; must implement |
| Quick orders / order sets | OE/RR | `ORWDXM MENU`, `ORWDXM1 BLDQRSP` | ORDER DIALOG #101.41 | **gap** | Complex; Phase 21+ |
| Unsigned orders count | OE/RR | `ORWORB UNSIG ORDERS` | ORDER #100 | **wired** (inbox) | — |

---

## 7. Notes / TIU (TIU\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| Notes list by context | TIU | `TIU DOCUMENTS BY CONTEXT` | TIU DOCUMENT #8925 | **wired** | — |
| Note full text | TIU | `TIU GET RECORD TEXT` | TIU DOCUMENT #8925 | **wired** | — |
| Create note | TIU | `TIU CREATE RECORD`, `TIU SET DOCUMENT TEXT` | TIU DOCUMENT #8925 | **wired** | — |
| Sign note | TIU | `TIU SIGN RECORD` | TIU DOCUMENT #8925 | **gap** | Add sign endpoint |
| Addendum | TIU | `TIU CREATE ADDENDUM` | TIU DOCUMENT #8925 | **gap** | Add addendum endpoint |
| Note titles/classes | TIU | `TIU GET PN TITLES`, `TIU PERSONAL TITLE LIST` | TIU DOCUMENT DEFINITION #8925.1 | **gap** | Add title lookup |
| Templates | TIU | `TIU TEMPLATE GET DEFAULTS` | TIU TEMPLATE #8927 | **gap** | wire VistA templates (not just platform ones) |

---

## 8. Consults (GMRC\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| Consult list | Consults (GMRC) | `ORQQCN LIST` | REQUEST/CONSULTATION #123 | **wired** | — |
| Consult detail | GMRC | `ORQQCN DETAIL` | REQUEST/CONSULTATION #123 | **wired** | — |
| Create consult | GMRC | `ORQQCN2 MED RESULTS` | REQUEST/CONSULTATION #123 | **stub** | In write-backs.ts |
| Consult service list | GMRC | `ORQQCN SVCLIST` | SERVICE #123.5 | **gap** | Wire for consult ordering |
| Complete/update consult | GMRC | `ORQQCN SET ACT MENUS` | REQUEST/CONSULTATION #123 | **gap** | Add action endpoints |

---

## 9. Surgery (SR\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| Surgery case list | Surgery (SR) | `ORWSR LIST` | SURGERY #130 | **wired** | — |
| Surgery case detail | Surgery (SR) | `ORWSR ONE` | SURGERY #130 | **gap** | Wire detail view |
| Surgery report text | Surgery (SR) | (via TIU) | TIU DOCUMENT #8925 | **gap** | Wire report text display |

---

## 10. Discharge Summaries (TIU)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| DC summary list | TIU | `TIU DOCUMENTS BY CONTEXT` (class 244) | TIU DOCUMENT #8925 | **wired** | — |
| DC summary text | TIU | `TIU GET RECORD TEXT` | TIU DOCUMENT #8925 | **wired** | — |

---

## 11. Labs (LR\*, OR\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| Interim lab results | Lab (LR) via OE/RR | `ORWLRR INTERIM` | LAB DATA #63 | **wired** | — |
| Lab acknowledge | Lab (LR) via OE/RR | `ORWLRR ACK` | LAB DATA #63 | **stub** | In write-backs.ts |
| Lab orders pending | Lab (LR) | `ORWLRR CHART` | LAB DATA #63 | **gap** | Wire cumulative view |
| Lab detail / graph | Lab (LR) | `ORWLRR INTERIM [detail]` | LAB DATA #63 | **gap** | Wire trending |
| Micro results | Lab (LR) | `ORWLRR MICRO` | LAB DATA #63 (micro sub-file) | **gap** | Wire micro results |
| Anatomic path | Lab (LR) | `ORWLRR ATH` | LAB DATA #63 (AP sub-file) | **gap** | Wire AP results |

---

## 12. Reports / Health Summary (GMTS\*, OR\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| Report category list | Health Summary (GMTS) | `ORWRP REPORT LISTS` | HEALTH SUMMARY TYPE #142, OE/RR REPORT #101.24 | **wired** | — |
| Report text rendering | GMTS / OE/RR | `ORWRP REPORT TEXT` | (varies by report type) | **wired** | — |
| Health summary types | GMTS | `ORWRP2 HS TYPE LIST` | HEALTH SUMMARY TYPE #142 | **gap** | Wire HS type picker |
| Health summary components | GMTS | `ORWRP2 HS COMPONENTS` | HEALTH SUMMARY COMPONENT #142.1 | **gap** | Wire component config |
| Remote data access | Remote Data (HDR) | `ORWCIRN FACLIST`, `XWB REMOTE RPC` | INSTITUTION #4 | **gap** | Wire remote facility data |

---

## 13. Allergies (GMRA\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| Allergy list | Allergy (GMRA) | `ORQQAL LIST` | PATIENT ALLERGIES #120.8 | **wired** | — |
| Allergy search | OE/RR | `ORWDAL32 ALLERGY MATCH` | GMR ALLERGIES #120.82 | **wired** | — |
| Add allergy | Allergy (GMRA) | `ORWDAL32 SAVE ALLERGY` | PATIENT ALLERGIES #120.8 | **wired** | — |
| Allergy detail | Allergy (GMRA) | `ORQQAL DETAIL` | PATIENT ALLERGIES #120.8 | **gap** | Wire detail view |
| Mark entered in error | Allergy (GMRA) | `ORQQAL1 LISTERR` | PATIENT ALLERGIES #120.8 | **gap** | Wire error mark |

---

## 14. Vitals (GMV\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| Vitals list | Vitals (GMV) | `ORQQVI VITALS` | GMRV VITAL MEASUREMENT #120.5 | **wired** | — |
| Add vitals | Vitals (GMV) | `GMV ADD VM` | GMRV VITAL MEASUREMENT #120.5 | **wired** | — |
| Vitals detail/trends | Vitals (GMV) | `GMV LATEST VM` | GMRV VITAL MEASUREMENT #120.5 | **gap** | Wire trending |
| Vital type setup | Vitals (GMV) | `GMV VITAL TYPE IEN` | GMRV VITAL TYPE #120.51 | **gap** | Wire type config |

---

## 15. Imaging (MAG\*, RA\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| Imaging status probe | Imaging (MAG) | `MAG4 REMOTE PROCEDURE` | IMAGE #2005 | **wired** | — |
| Patient image list | Imaging (MAG) | `MAG4 PAT GET IMAGES` | IMAGE #2005 | **gap** | Wire study list from VistA |
| Image metadata | Imaging (MAG) | `MAG4 IMAGE INFO` | IMAGE #2005 | **gap** | Wire metadata display |
| Radiology report | Radiology (RA) | `RA DETAILED REPORT` | RAD/NUC MED REPORTS #74 | **wired** | — |
| Radiology exam list | Radiology (RA) | `MAGV RAD EXAM LIST` | RAD/NUC MED PATIENT #70 | **gap** | Wire exam worklist |
| OHIF viewer launch | — | — | — | **wired** | URL generation from StudyInstanceUID |
| DICOMweb metadata | — | — | — | **wired** | Proxied from Orthanc (when configured) |
| Image capture | Imaging (MAG) | `MAGG CAPTURE` | IMAGE #2005 | **gap** | Future: web capture workflow |
| Cross-site image exchange | Imaging (MAG) | `MAG4 REMOTE IMAGE VIEWS` | IMAGE #2005 | **gap** | VIX-equivalent via DICOMweb federation |

---

## 16. Inbox / Notifications (OR\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| Unsigned orders | OE/RR | `ORWORB UNSIG ORDERS` | ORDER #100 | **wired** | — |
| Fast user info | OE/RR | `ORWORB FASTUSER` | NEW PERSON #200 | **wired** | — |
| Notification list | OE/RR | `ORWORB GETSORT` | OE/RR NOTIFICATIONS #100.9 | **gap** | Wire VistA notification types |
| Flag order for review | OE/RR | `ORWORB SETSORT` | OE/RR NOTIFICATIONS #100.9 | **gap** | Wire notification actions |

---

## 17. HL7 / HLO Interop (HL\*, HLO\*)

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| HL7 logical links | HL7 (HL) | — (direct FileMan read) | HL LOGICAL LINK #870 | **gap** | Requires RPC wrapper or direct read |
| HL7 message text | HL7 (HL) | — | HL7 MESSAGE TEXT #772 | **gap** | Requires RPC wrapper |
| HL7 message admin | HL7 (HL) | — | HL7 MESSAGE ADMIN #773 | **gap** | Requires RPC wrapper |
| HL7 monitor jobs | HL7 (HL) | — | HL7 MONITOR EVENTS #776.* | **gap** | Requires RPC wrapper |
| HLO application registry | HLO | — | HLO APPLICATION REGISTRY #779.2 | **gap** | Requires RPC wrapper |
| HLO subscription registry | HLO | — | HLO SUBSCRIPTION REGISTRY #779.4 | **gap** | Requires RPC wrapper |
| HLO priority queues | HLO | — | HLO PRIORITY QUEUE #779.9 | **gap** | Requires RPC wrapper |
| HL7 SITE PARAMETERS | HL7 (HL) | — | HL7 SITE PARAMETERS #869.3 | **gap** | Config reference |
| HLCS configuration | HL7 (HL) | — | HL COMMUNICATION SERVER #869 | **gap** | Config reference |

> **Current state**: The Interop Monitor (Phase 18) displays integration health via
> the platform's `integration-registry.ts` — this tracks connector types (vista-rpc,
> fhir, hl7v2, dicom, etc.) but does NOT yet read from VistA's HL7/HLO file structures.
> All HL7/HLO items are **integration-pending** and require either:
> - VistA-side RPC wrappers (KIDS build) for FileMan reads, or
> - Direct M routine calls via the RPC Broker for read-only monitoring.

---

## 18. FHIR Integration

| Feature | VistA Package | RPC(s) | FileMan Files | State | Next Step |
|---------|--------------|--------|---------------|-------|-----------|
| C0FHIR (WorldVistA) | FHIR (C0F) | `C0FHIR*` RPCs | Various (mapped via C0F) | **gap** | See `docs/fhir-posture.md` |
| VPR (Virtual Patient Record) | VPR | `VPR GET PATIENT DATA` | Various | **gap** | Legacy; evaluate as FHIR source |
| FHIR facade | — | — | — | **gap** | Platform concern; see posture doc |

---

## 19. Platform-Only Features (No VistA Binding Required)

| Feature | Category | Notes |
|---------|----------|-------|
| Security middleware | Platform | Request IDs, rate limiting, CORS, CSP headers |
| Audit logging | Platform | HIPAA-posture event logging (40+ action types) |
| Circuit breaker / resilience | Platform | RPC failure protection, retries, caching |
| Multi-tenant control plane | Platform | Tenant CRUD, feature flags, UI defaults |
| Report caching | Platform | In-memory TTL cache for report endpoints |
| Export governance | Platform | Job management, CSV/JSON generation, policy enforcement |
| RPC console (WebSocket) | Platform | Developer tool for ad-hoc RPC execution |
| RPC capabilities probe | Platform | Discovers available RPCs against VistA instance |
| RCM placeholder | Platform | Feature-flagged; no VistA binding (future RCM integration) |
| Session management | Platform | Cookie-based sessions with DUZ from VistA |
| Graceful shutdown | Platform | Connection draining, cleanup |

---

## Summary Statistics

| Category | Wired | Stub | Gap | Platform | Total |
|----------|-------|------|-----|----------|-------|
| Auth/Session | 3 | 0 | 0 | 3 | 6 |
| Patient Selection | 3 | 0 | 3 | 0 | 6 |
| Cover Sheet | 5 | 0 | 4 | 0 | 9 |
| Problem List | 2 | 2 | 3 | 0 | 7 |
| Medications | 3 | 0 | 4 | 0 | 7 |
| Orders | 1 | 2 | 4 | 0 | 7 |
| Notes/TIU | 3 | 0 | 4 | 0 | 7 |
| Consults | 2 | 1 | 2 | 0 | 5 |
| Surgery | 1 | 0 | 2 | 0 | 3 |
| DC Summaries | 2 | 0 | 0 | 0 | 2 |
| Labs | 1 | 1 | 4 | 0 | 6 |
| Reports/Health Summary | 2 | 0 | 3 | 0 | 5 |
| Allergies | 3 | 0 | 2 | 0 | 5 |
| Vitals | 2 | 0 | 2 | 0 | 4 |
| Imaging | 3 | 0 | 5 | 1 | 9 |
| Inbox/Notifications | 2 | 0 | 2 | 0 | 4 |
| HL7/HLO Interop | 0 | 0 | 9 | 0 | 9 |
| FHIR | 0 | 0 | 3 | 0 | 3 |
| Platform | 0 | 0 | 0 | 11 | 11 |
| **TOTAL** | **38** | **6** | **56** | **15** | **115** |

> **38 features wired** (live VistA RPC), **6 stubbed**, **56 gaps** to fill,
> **15 platform-only** features with no VistA binding needed.
