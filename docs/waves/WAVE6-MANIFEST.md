# Wave 6 Manifest — Enterprise Integrations + Customer Ops + Pilot Hospital Hardening

**Created:** 2025-07-22
**Status:** In Progress

## Overview

Wave 6 focuses on enterprise integration capabilities (HL7v2 engine, payer
scale hardening), customer operations tooling (onboarding wizard, support
tooling, data exports), and pilot hospital hardening for production readiness.

## ADR Decisions (Phase 238)

| ADR | Decision | File |
|-----|----------|------|
| HL7 Engine | node-hl7-client/server (MIT, in-process) | [ADR-hl7-engine-choice.md](../decisions/ADR-hl7-engine-choice.md) |
| Progressive Delivery | Script-driven canary + Prometheus metrics | [ADR-progressive-delivery-choice.md](../decisions/ADR-progressive-delivery-choice.md) |
| Usage Metering | Extend analytics pipeline with metering counters | [ADR-metering-choice.md](../decisions/ADR-metering-choice.md) |
| Feature Flags | Extend DB-backed tenant_feature_flag with rollout % | [ADR-feature-flags-choice.md](../decisions/ADR-feature-flags-choice.md) |
| Secrets Sync | External Secrets Operator + AWS SM (prod), SOPS+age (dev) | [ADR-secrets-sync-choice.md](../decisions/ADR-secrets-sync-choice.md) |
| DR / Backup | pg_dump + WAL archiving + Velero (when cluster ready) | [ADR-dr-backup-choice.md](../decisions/ADR-dr-backup-choice.md) |

## Phase Tracker

| # | Phase | Folder | Status | Commit |
|---|-------|--------|--------|--------|
| P1 | 238 — OSS Reuse Audit + ADRs | 235-PHASE-238-OSS-REUSE-AUDIT | In Progress | — |
| P2 | 239 — HL7v2 Engine Packaging | 236-PHASE-239-HL7-ENGINE-PACKAGING | Not Started | — |
| P3 | 240 — HL7v2 Routing Layer | 237-PHASE-240-HL7-ROUTING-LAYER | Not Started | — |
| P4 | 241 — HL7v2 Core Message Packs | 238-PHASE-241-HL7-MESSAGE-PACKS | Not Started | — |
| P5 | 242 — Payer Adapter Scale Hardening | 239-PHASE-242-PAYER-SCALE-HARDENING | Not Started | — |
| P6 | 243 — Onboarding UX Wizard | 240-PHASE-243-ONBOARDING-UX | Not Started | — |
| P7 | 244 — Support Tooling | 241-PHASE-244-SUPPORT-TOOLING | Not Started | — |
| P8 | 245 — Data Portability Exports v2 | 242-PHASE-245-DATA-EXPORTS-V2 | Not Started | — |
| P9 | 246 — Pilot Hospital Hardening | 243-PHASE-246-PILOT-HARDENING | Not Started | — |
| P10 | 247 — Wave 6 Certification Suite | 244-PHASE-247-WAVE6-CERTIFICATION | Not Started | — |

## Dependencies

```
P1 (ADRs) --> P2 (HL7 engine) --> P3 (routing) --> P4 (message packs)
P1 (ADRs) --> P5 (payer hardening)
P1 (ADRs) --> P6 (onboarding) --> P7 (support)
P1 (ADRs) --> P8 (data exports)
P5 + P8 --> P9 (pilot hardening)
P2..P9 --> P10 (certification)
```

## Conventions

- Each phase gets a prompt folder under `prompts/`
- Prompt folder naming: `<prefix>-PHASE-<phaseNum>-<SLUG>`
- Each folder contains `<phaseNum>-01-IMPLEMENT.md` and `<phaseNum>-99-VERIFY.md`
- Evidence goes to `artifacts/evidence/phase<N>/wave6/`
- One coherent commit per phase
