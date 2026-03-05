# Phase 582 — Notes

> Wave 42: Production Remediation | Phase 582

## Why This Phase Exists

Phase 7 + 8 of the remediation plan: ONC certification requires ~30 FHIR US Core profiles and drug interaction checking (Criterion a.4). This phase implements the high-priority profiles and the interaction check pipeline.

## Key Decisions

- **RxNorm + openFDA**: Free alternatives to FDB/Medi-Span; no license fees.
- **VistA NDF first**: If File 50.6 is populated, use it; avoids external API dependency.
- **No proprietary code tables**: AGENTS.md Phase 40 — CPT/HCPCS/ICD descriptions not bundled; same for drug DBs.

## Deferred Items

- Full 30+ profile set — implement HIGH first, MEDIUM/LOW as capacity allows.
- ONC certification testing — requires ONC-ACB engagement; this phase delivers technical readiness.
