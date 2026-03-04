# Wave 28 Manifest -- Regulatory/Compliance + Multi-Country Packaging

> Add regulatory compliance gates, multi-country configuration,
> and packaging profiles for international deployment.

## Phase Map

| Wave Phase | Resolved ID | Title                                      | Prompt Folder                           | Status      |
| ---------- | ----------- | ------------------------------------------ | --------------------------------------- | ----------- |
| W28-P1     | 439         | Regulatory Framework + Compliance Registry | `439-PHASE-439-REGULATORY-FRAMEWORK`    | Not started |
| W28-P2     | 440         | US HIPAA Compliance Profile                | `440-PHASE-440-US-HIPAA-PROFILE`        | Not started |
| W28-P3     | 441         | PH Data Privacy Act Profile                | `441-PHASE-441-PH-DATA-PRIVACY-PROFILE` | Not started |
| W28-P4     | 442         | Multi-Country Config + Locale System       | `442-PHASE-442-MULTI-COUNTRY-CONFIG`    | Not started |
| W28-P5     | 443         | Packaging Profiles + Build Matrix          | `443-PHASE-443-PACKAGING-PROFILES`      | Not started |
| W28-P6     | 444         | Compliance Verification Suite              | `444-PHASE-444-COMPLIANCE-VERIFICATION` | Not started |
| W28-P7     | 445         | Deployment Runbook + Cutover Checklist     | `445-PHASE-445-DEPLOYMENT-RUNBOOK`      | Not started |
| W28-P8     | 446         | W28 Integrity Audit + Evidence Bundle      | `446-PHASE-446-W28-INTEGRITY-AUDIT`     | Not started |

## Scope

Wave 28 builds the **regulatory/compliance layer** and **multi-country packaging**:

1. Pluggable compliance registry (country → rules → enforcement)
2. US HIPAA compliance profile (audit, encryption, access controls, BAA)
3. Philippines Data Privacy Act profile (NPC registration, consent, breach notification)
4. Multi-country configuration with locale-aware formatting
5. Build-time packaging profiles for different deployment targets
6. Automated compliance verification against configured profiles
7. Production deployment runbook with cutover checklist
8. Wave-level integrity audit

## Prerequisites

- Wave 27 completed (Phases 431-438)
- Write-back paths verified and stable
- Existing regulatory infrastructure (Phase 35 IAM, Phase 38 RCM PHI)

## Phase Range

- Reserved: 439-446 (8 phases)
- See `docs/qa/prompt-phase-range-reservations.json`
