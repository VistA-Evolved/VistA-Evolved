# Phase 309 — NOTES

## Decisions Made

1. **Values-driven country packs** — JSON config, not code branches. Leverages
   existing Phase 37C module registry and Phase 109 feature flags.
2. **Hybrid data residency** — region-routed by default, separate-deploy for
   high-assurance. Tenant `dataRegion` is immutable after creation.
3. **Pluggable terminology** — resolver registry pattern with passthrough
   fallback. VistA files remain source of truth; resolvers map outbound only.
4. **Three initial markets** — US (P0, active), PH (P0, active), GH (P1, planned).

## Key Constraints

- Regulatory profile is **locked** after tenant creation — admins cannot
  weaken consent or retention requirements.
- No legal advice in any document — only factual regulatory requirements.
- No proprietary code set tables (CPT, ICD) bundled — code values pass through.
- PhilHealth uses ICD-10 (WHO), not ICD-10-CM — different resolver needed.

## Follow-ups for Later Phases

- Phase 311: Implement DataRegion routing in store-resolver.ts
- Phase 312: Implement consent control UI + enforcement
- Phase 313: Build terminology resolver registry + built-in resolvers
- Phase 314: Create actual country pack JSON files for US, PH, GH
