# Wave 10 Manifest — Enterprise UX + Migration + SaaS Commercialization

**Generated:** 2026-03-01
**BASE_PHASE:** 280 (computed from max prompt prefix 279 + 1)
**Phases:** 280–285 (6 phases, sequential, no gaps)

## Phase Map

| Phase ID | Folder Prefix | Title | Status | Dependencies |
|----------|---------------|-------|--------|--------------|
| 280 | 280 | Wave 10 Manifest + Phase-ID Resolver + OSS Decision ADRs | Implemented | — |
| 281 | 281 | Theme System Core (design tokens + theme provider + persistence) | Implemented | P280 |
| 282 | 282 | Theme Packs + Tenant Branding Admin | Implemented | P281 |
| 283 | 283 | Migration Templates Expansion (FHIR real, CCDA, vendor profiles) | Implemented | P280 |
| 284 | 284 | SaaS Billing/Metering Integration (OSS-first: Lago adapter) | Implemented | P280 |
| 285 | 285 | Feature Flags Upgrade (OSS-first: Unleash/Flagsmith adapter) | Implemented | P280 |

## Dependency Graph

```
P280 (Manifest + ADRs)
 ├── P281 (Theme Core)
 │    └── P282 (Theme Packs + Branding Admin)
 ├── P283 (Migration Templates)
 ├── P284 (SaaS Billing)
 └── P285 (Feature Flags)
```

## ADR References

| ADR | Path | Decision |
|-----|------|----------|
| OSS Billing | docs/decisions/ADR-OSS-BILLING.md | Lago adapter behind provider-agnostic interface |
| OSS Feature Flags | docs/decisions/ADR-OSS-FEATURE-FLAGS.md | Extend existing DB-backed flags + Unleash adapter option |

## Evidence Directory

All phase evidence stored under `/evidence/wave-10/<phase-id>/`.

## Notes

- Phase numbering is computed at runtime — no hardcoded IDs
- Existing ADRs in docs/decisions/ (ADR-metering-choice.md, ADR-feature-flags-choice.md) remain as prior art
- New ADRs update the decision landscape for Wave 10 OSS-first approach
