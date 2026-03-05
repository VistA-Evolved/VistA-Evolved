# Prompt Redundancy Report

Generated: 2026-03-04T16:47:29.350Z
Source: docs/qa/phase-index.json (565 phases)

## Summary

| Metric                            | Count |
| --------------------------------- | ----- |
| Exact duplicate phase numbers     | 4     |
| Near-duplicate fingerprint groups | 1     |
| Total redundant folders           | 11    |

> **Policy:** Redundant folders are NOT deleted. They are marked with
> `REDUNDANT_OF: <canonical-folder>` in their NOTES.md file.

## Exact Duplicates (Same Phase Number)

### Phase 263 (2 folders)

**Canonical:** `260-PHASE-263-SUPPORT-TOOLING-V2`

| Folder                                | Title                          | Status    |
| ------------------------------------- | ------------------------------ | --------- |
| `260-PHASE-263-SUPPORT-TOOLING-V2`    | Support Tooling v2 — IMPLEMENT | CANONICAL |
| `263-PHASE-263-WAVE8-INTEGRITY-AUDIT` | Wave 8 Integrity Audit         | REDUNDANT |

### Phase 283 (2 folders)

**Canonical:** `281-PHASE-283-THEME-SYSTEM-CORE`

| Folder                              | Title                                                            | Status    |
| ----------------------------------- | ---------------------------------------------------------------- | --------- |
| `281-PHASE-283-THEME-SYSTEM-CORE`   | Theme System Core (design tokens + theme provider + persistence) | CANONICAL |
| `283-PHASE-283-MIGRATION-TEMPLATES` | Migration Templates Expansion                                    | REDUNDANT |

### Phase 284 (2 folders)

**Canonical:** `282-PHASE-284-THEME-PACKS-BRANDING`

| Folder                               | Title                               | Status    |
| ------------------------------------ | ----------------------------------- | --------- |
| `282-PHASE-284-THEME-PACKS-BRANDING` | Theme Packs + Tenant Branding Admin | CANONICAL |
| `284-PHASE-284-BILLING-METERING`     | IMPLEMENT: SaaS Billing / Metering  | REDUNDANT |

### Phase 290 (2 folders)

**Canonical:** `290-PHASE-290-WAVE9-INTEGRITY-AUDIT`

| Folder                                | Title                                   | Status    |
| ------------------------------------- | --------------------------------------- | --------- |
| `290-PHASE-290-WAVE9-INTEGRITY-AUDIT` | Wave 9 Integrity Audit — Implementation | CANONICAL |
| `297-PHASE-290-INTEROP-CERT-HARNESS`  | Interop Certification Harness           | REDUNDANT |

## Near-Duplicate Fingerprints

These folders have different phase numbers but nearly identical content fingerprints.

### Fingerprint Group: 4358b5009c67 (8 folders)

**Canonical:** `106-PHASE-102-REGISTRY-MIGRATION`

| Folder                             | Phase | Title             |
| ---------------------------------- | ----- | ----------------- |
| `106-PHASE-102-REGISTRY-MIGRATION` | 102   | Notes (CANONICAL) |
| `287-PHASE-94-PH-HMO-WORKFLOW`     | 94    | Notes             |
| `488-W33-P8-UI-HARDENING`          | 488   | Notes             |
| `489-W33-P9-DAY-IN-THE-LIFE`       | 489   | Notes             |
| `490-W33-P10-PRODUCTION-GATES`     | 490   | Notes             |
| `507-W35-P8-ROLE-ACCEPTANCE`       | 507   | Notes             |
| `508-W35-P9-OPERATIONAL-RUNBOOKS`  | 508   | Notes             |
| `509-W35-P10-RC-EVIDENCE-BUNDLE`   | 509   | Notes             |

## Recommendations

1. For exact duplicates: the CANONICAL folder has the lowest prefix and is the
   authoritative prompt. Non-canonical folders have `REDUNDANT_OF:` markers.
2. For near-duplicates: review manually. Different phase numbers with similar
   content may be legitimate iterations or may need consolidation marks.
3. Use `node scripts/prompt-ref.mjs --phase <N>` to find all folders for a phase.
4. New code references should use the canonical folder name.
