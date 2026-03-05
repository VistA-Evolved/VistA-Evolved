# Phase/Wave Comment Traceability Audit

Generated: 2026-03-05T12:23:24.509Z
Files scanned: 2110

## Summary

| Metric | Count |
|--------|-------|
| Unique phase tokens in code | 550 |
| Total phase references | 6738 |
| Resolved to single folder | 466 |
| Resolved via base phase | 78 |
| Unresolved (no matching folder) | 2 |
| Ambiguous (multiple folders) | 4 |
| Unique wave tokens | 38 |
| Total wave references | 513 |

## Top 50 Most-Referenced Phase Tokens

| Rank | Token | Refs | Resolved To |
|------|-------|------|-------------|
| 1 | Phase 24 | 120 | 26-PHASE-24-IMAGING-ENTERPRISE |
| 2 | Phase 136 | 112 | 141-PHASE-136-STORE-POLICY-GATE |
| 3 | Phase 146 | 111 | 151-PHASE-146-DURABILITY-WAVE3 |
| 4 | Phase 38 | 110 | 42-PHASE-38-RCM-PAYER-CONNECTIVITY |
| 5 | Phase 23 | 102 | 25-PHASE-23-IMAGING-WORKFLOW |
| 6 | Phase 40 | 88 | 44-PHASE-40-PAYER-CONNECTIVITY |
| 7 | Phase 35 | 78 | 37-PHASE-35-IAM-AUTHZ-AUDIT |
| 8 | Phase 37C | 76 | 41-PHASE-37C-PRODUCT-MODULARITY |
| 9 | Phase 36 | 67 | 38-PHASE-36-OBSERVABILITY-RELIABILITY |
| 10 | Phase 30 | 62 | 32-PHASE-30-TELEHEALTH |
| 11 | Phase 132 | 59 | 136-PHASE-132-CSRF-SYNC-TOKEN |
| 12 | Phase 154 | 57 | 159-PHASE-154-CPOE-SIGNING |
| 13 | Phase 31 | 57 | 33-PHASE-31-SHARING-EXPORTS |
| 14 | Phase 25 | 55 | 27-PHASE-25-BI-ANALYTICS |
| 15 | Phase 22 | 55 | 24-PHASE-22-IMAGING-PLATFORM |
| 16 | Phase 27 | 53 | 29-PHASE-27-PORTAL-CORE |
| 17 | Phase 32 | 53 | 34-PHASE-32-MESSAGING-REFILLS |
| 18 | Phase 147 | 52 | 152-PHASE-147-SCHEDULING-DEPTH-V2 |
| 19 | Phase 109 | 50 | 113-PHASE-109-MODULAR-PACKAGING |
| 20 | Phase 26 | 49 | 28-PHASE-26-PORTAL-TELEHEALTH |
| 21 | Phase 21 | 48 | 23-PHASE-21-INTEROP-REALITY |
| 22 | Phase 12 | 47 | 14-PHASE-12-CPRS-PARITY-WIRING |
| 23 | Phase 125 | 45 | 129-PHASE-125-POSTGRES-ONLY-DATAPLANE |
| 24 | Phase 131 | 44 | 135-PHASE-131-SCHEDULING-DEPTH |
| 25 | Phase 157 | 44 | 162-PHASE-157-AUDIT-JSONL-SHIPPING |
| 26 | Phase 33 | 42 | 35-PHASE-33-AI-ASSIST-GATEWAY |
| 27 | Phase 126 | 40 | 130-PHASE-126-RCM-DURABILITY-PG |
| 28 | Phase 568 | 39 | 568-PHASE-568-ZVEADT-CRASH-FIX |
| 29 | Phase 16 | 38 | 18-PHASE-16-PRODUCTION-READINESS |
| 30 | Phase 107 | 38 | 111-PHASE-107-PRODUCTION-POSTURE |
| 31 | Phase 123 | 36 | 127-PHASE-123-SCHEDULING-SD |
| 32 | Phase 101 | 36 | 105-PHASE-101-PLATFORM-DATA-LAYER |
| 33 | Phase 128 | 34 | 132-PHASE-128-IMAGING-SCHEDULING-PG |
| 34 | Phase 1 | 34 | 02-PHASE-1-HELLO-SYSTEM |
| 35 | Phase 34 | 33 | 36-PHASE-34-REGULATED-SDLC |
| 36 | Phase 51 | 33 | 56-PHASE-51-ENTERPRISE-PACKAGING |
| 37 | Phase 28 | 32 | 30-PHASE-28-ENTERPRISE-INTAKE-OS |
| 38 | Phase 39 | 32 | 43-PHASE-39-BILLING-GROUNDING |
| 39 | Phase 121 | 31 | 125-PHASE-121-DURABILITY-WAVE-1 |
| 40 | Phase 13 | 31 | 15-PHASE-13-CPRS-OPERATIONALIZATION |
| 41 | Phase 143 | 31 | 148-PHASE-143-AI-INTAKE-ENGINE |
| 42 | Phase 104 | 31 | 108-PHASE-104-DB-SECURITY |
| 43 | Phase 67 | 31 | 73-PHASE-67-ADT-INPATIENT |
| 44 | Phase 102 | 30 | 106-PHASE-102-REGISTRY-MIGRATION |
| 45 | Phase 94 | 30 | 287-PHASE-94-PH-HMO-WORKFLOW |
| 46 | Phase 108 | 30 | 112-PHASE-108-PHASE-AUDIT-HARNESS |
| 47 | Phase 281 | 29 | 279-PHASE-281-DATA-MIGRATION-FOUNDATIONS |
| 48 | Phase 69 | 29 | 75-PHASE-69-RCM-OPS-EXCELLENCE |
| 49 | Phase 153 | 28 | 158-PHASE-153-IAM-OIDC-DEFAULT |
| 50 | Phase 44 | 28 | 49-PHASE-44-PAYER-DIRECTORY |

## Unresolved Tokens

These phase tokens appear in code but **cannot be mapped to any prompt folder**.

| Token | Refs | Sample File |
|-------|------|-------------|
| Phase 4 | 10 | scripts/dr/restore-verify.mjs |
| Phase 0 | 2 | docs/SESSION_LOG.md |

## Resolved via Base Phase

These subphase tokens (e.g. "15B") were resolved by matching their base phase number.

| Token | Refs | Base Phase | Base Folder |
|-------|------|------------|-------------|
| Phase 14D | 17 | 14 | 16-PHASE-14-PARITY-CLOSURE |
| Phase 15B | 15 | 15 | 17-PHASE-15-ENTERPRISE-HARDENING |
| Phase 5D | 13 | 5 | 07-PHASE-5-CORE-CLINICAL-WORKFLOW |
| Phase 25D | 10 | 25 | 27-PHASE-25-BI-ANALYTICS |
| Phase 15C | 9 | 15 | 17-PHASE-15-ENTERPRISE-HARDENING |
| Phase 68B | 9 | 68 | 74-PHASE-68-NURSING-WORKFLOW |
| Phase 17A | 8 | 17 | 19-PHASE-17-MULTITENANT-CONTROL-PLANE |
| Phase 6A | 8 | 6 | 08-PHASE-6-VITALS |
| Phase 5B | 8 | 5 | 07-PHASE-5-CORE-CLINICAL-WORKFLOW |
| Phase 5C | 8 | 5 | 07-PHASE-5-CORE-CLINICAL-WORKFLOW |
| Phase 15A | 7 | 15 | 17-PHASE-15-ENTERPRISE-HARDENING |
| Phase 14A | 7 | 14 | 16-PHASE-14-PARITY-CLOSURE |
| Phase 14B | 6 | 14 | 16-PHASE-14-PARITY-CLOSURE |
| Phase 67B | 6 | 67 | 73-PHASE-67-ADT-INPATIENT |
| Phase 18E | 6 | 18 | 20-PHASE-18-INTEROP-IMAGING |
| Phase 9B | 6 | 9 | 11-PHASE-9-PROBLEM-LIST |
| Phase 8B | 6 | 8 | 10-PHASE-8-MEDICATIONS |
| Phase 84B | 5 | 84 | 89-PHASE-84-NURSING |
| Phase 14C | 5 | 14 | 16-PHASE-14-PARITY-CLOSURE |
| Phase 18C | 5 | 18 | 20-PHASE-18-INTEROP-IMAGING |
| Phase 7B | 5 | 7 | 09-PHASE-7-NOTES |
| Phase 15E | 5 | 15 | 17-PHASE-15-ENTERPRISE-HARDENING |
| Phase 13B | 4 | 13 | 15-PHASE-13-CPRS-OPERATIONALIZATION |
| Phase 13F | 4 | 13 | 15-PHASE-13-CPRS-OPERATIONALIZATION |
| Phase 6B | 4 | 6 | 08-PHASE-6-VITALS |
| Phase 8A | 4 | 8 | 10-PHASE-8-MEDICATIONS |
| Phase 9A | 4 | 9 | 11-PHASE-9-PROBLEM-LIST |
| Phase 11A | 4 | 11 | 13-PHASE-11-CPRS-WEB-REPLICA |
| Phase 11B | 4 | 11 | 13-PHASE-11-CPRS-WEB-REPLICA |
| Phase 11C | 4 | 11 | 13-PHASE-11-CPRS-WEB-REPLICA |
| Phase 11D | 4 | 11 | 13-PHASE-11-CPRS-WEB-REPLICA |
| Phase 11F | 4 | 11 | 13-PHASE-11-CPRS-WEB-REPLICA |
| Phase 5A | 4 | 5 | 07-PHASE-5-CORE-CLINICAL-WORKFLOW |
| Phase 10A | 4 | 10 | 12-PHASE-10-CPRS-EXTRACT |
| Phase 15F | 3 | 15 | 17-PHASE-15-ENTERPRISE-HARDENING |
| Phase 103B | 3 | 103 | 107-PHASE-103-DB-PERFORMANCE |
| Phase 65B | 3 | 65 | 71-PHASE-65-IMMUNIZATIONS |
| Phase 18B | 3 | 18 | 20-PHASE-18-INTEROP-IMAGING |
| Phase 13G | 3 | 13 | 15-PHASE-13-CPRS-OPERATIONALIZATION |
| Phase 7A | 3 | 7 | 09-PHASE-7-NOTES |
| Phase 11E | 3 | 11 | 13-PHASE-11-CPRS-WEB-REPLICA |
| Phase 11G | 3 | 11 | 13-PHASE-11-CPRS-WEB-REPLICA |
| Phase 11H | 3 | 11 | 13-PHASE-11-CPRS-WEB-REPLICA |
| Phase 12A | 3 | 12 | 14-PHASE-12-CPRS-PARITY-WIRING |
| Phase 12B | 3 | 12 | 14-PHASE-12-CPRS-PARITY-WIRING |
| Phase 12C | 3 | 12 | 14-PHASE-12-CPRS-PARITY-WIRING |
| Phase 12D | 3 | 12 | 14-PHASE-12-CPRS-PARITY-WIRING |
| Phase 12E | 3 | 12 | 14-PHASE-12-CPRS-PARITY-WIRING |
| Phase 1B | 3 | 1 | 02-PHASE-1-HELLO-SYSTEM |
| Phase 1C | 3 | 1 | 02-PHASE-1-HELLO-SYSTEM |
| Phase 83B | 3 | 83 | 88-PHASE-83-INPATIENT-ADT |
| Phase 17B | 2 | 17 | 19-PHASE-17-MULTITENANT-CONTROL-PLANE |
| Phase 137B | 2 | 137 | 142-PHASE-137-ADT-BEDBOARD |
| Phase 19A | 2 | 19 | 21-PHASE-19-REPORTING-GOVERNANCE |
| Phase 17F | 2 | 17 | 19-PHASE-17-MULTITENANT-CONTROL-PLANE |
| Phase 13A | 2 | 13 | 15-PHASE-13-CPRS-OPERATIONALIZATION |
| Phase 15D | 2 | 15 | 17-PHASE-15-ENTERPRISE-HARDENING |
| Phase 15G | 2 | 15 | 17-PHASE-15-ENTERPRISE-HARDENING |
| Phase 24C | 1 | 24 | 26-PHASE-24-IMAGING-ENTERPRISE |
| Phase 18A | 1 | 18 | 20-PHASE-18-INTEROP-IMAGING |
| Phase 19B | 1 | 19 | 21-PHASE-19-REPORTING-GOVERNANCE |
| Phase 25C | 1 | 25 | 27-PHASE-25-BI-ANALYTICS |
| Phase 25B | 1 | 25 | 27-PHASE-25-BI-ANALYTICS |
| Phase 25E | 1 | 25 | 27-PHASE-25-BI-ANALYTICS |
| Phase 19C | 1 | 19 | 21-PHASE-19-REPORTING-GOVERNANCE |
| Phase 17D | 1 | 17 | 19-PHASE-17-MULTITENANT-CONTROL-PLANE |
| Phase 12F | 1 | 12 | 14-PHASE-12-CPRS-PARITY-WIRING |
| Phase 17E | 1 | 17 | 19-PHASE-17-MULTITENANT-CONTROL-PLANE |
| Phase 17C | 1 | 17 | 19-PHASE-17-MULTITENANT-CONTROL-PLANE |
| Phase 13C | 1 | 13 | 15-PHASE-13-CPRS-OPERATIONALIZATION |
| Phase 13D | 1 | 13 | 15-PHASE-13-CPRS-OPERATIONALIZATION |
| Phase 13E | 1 | 13 | 15-PHASE-13-CPRS-OPERATIONALIZATION |
| Phase 13H | 1 | 13 | 15-PHASE-13-CPRS-OPERATIONALIZATION |
| Phase 14E | 1 | 14 | 16-PHASE-14-PARITY-CLOSURE |
| Phase 10D | 1 | 10 | 12-PHASE-10-CPRS-EXTRACT |
| Phase 10B | 1 | 10 | 12-PHASE-10-CPRS-EXTRACT |
| Phase 10C | 1 | 10 | 12-PHASE-10-CPRS-EXTRACT |
| Phase 140D | 1 | 140 | 145-PHASE-140-PORTAL-PARITY |

## Ambiguous Tokens (Multiple Folders)

These tokens resolve to **more than one** prompt folder.
The recommended canonical folder (lowest prefix) is marked with **[C]**.

### Phase 284 (19 refs)

- `282-PHASE-284-THEME-PACKS-BRANDING` **[C]**
- `284-PHASE-284-BILLING-METERING`

### Phase 263 (10 refs)

- `260-PHASE-263-SUPPORT-TOOLING-V2` **[C]**
- `263-PHASE-263-WAVE8-INTEGRITY-AUDIT`

### Phase 290 (6 refs)

- `290-PHASE-290-WAVE9-INTEGRITY-AUDIT` **[C]**
- `297-PHASE-290-INTEROP-CERT-HARNESS`

### Phase 283 (1 refs)

- `281-PHASE-283-THEME-SYSTEM-CORE` **[C]**
- `283-PHASE-283-MIGRATION-TEMPLATES`

## Wave References

| Wave | Refs | Matching Folders |
|------|------|-----------------|
| Wave 6 | 60 | 0 |
| Wave 8 | 41 | 0 |
| Wave 21 | 36 | 11 |
| Wave 1 | 28 | 0 |
| Wave 7 | 26 | 0 |
| Wave 2 | 25 | 0 |
| Wave 16 | 24 | 9 |
| Wave 22 | 21 | 10 |
| Wave 37 | 21 | 9 |
| Wave 14 | 19 | 9 |
| Wave 39 | 19 | 12 |
| Wave 15 | 16 | 10 |
| Wave 20 | 15 | 8 |
| Wave 12 | 14 | 1 |
| Wave 19 | 12 | 8 |
| Wave 10 | 11 | 0 |
| Wave 9 | 11 | 0 |
| Wave 13 | 10 | 0 |
| Wave 24 | 10 | 9 |
| Wave 3 | 10 | 0 |
| Wave 23 | 9 | 10 |
| Wave 41 | 9 | 8 |
| Wave 17 | 8 | 8 |
| Wave 18 | 8 | 8 |
| Wave 38 | 7 | 9 |
| Wave 34 | 6 | 9 |
| Wave 31 | 5 | 0 |
| Wave 36 | 5 | 3 |
| Wave 30 | 5 | 0 |
| Wave 5 | 4 | 0 |
| Wave 40 | 4 | 15 |
| Wave 29 | 3 | 0 |
| Wave 28 | 2 | 1 |
| Wave 56 | 2 | 0 |
| Wave 11 | 2 | 0 |
| Wave 33 | 2 | 10 |
| Wave 4 | 2 | 0 |
| Wave 35 | 1 | 10 |

## How to Fix Unresolved References

For each unresolved token, one of:
1. The phase was never prompted (ad-hoc work) - add a retroactive prompt folder
2. The phase number in the comment is wrong - fix the comment
3. The phase exists under a different token - update the comment to the correct token

Use `node scripts/prompt-ref.mjs --search "<keyword>"` to find the right folder.

## How to Fix Ambiguous References

For each ambiguous token, the canonical folder is the one with the lowest prefix.
Add `REDUNDANT_OF: <canonical-folder>` to NOTES.md in non-canonical folders.
New code should use the format: `Phase <token> (PromptFolder: <canonical-folder>)`
