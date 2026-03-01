# Phase 316 — Notes — Trust Center Pack

## Design Decisions

1. **Three documents, not one** — Separated into trust center (overview),
   security posture (technical controls), and architecture (system design).
   Each serves a different audience: executives, security assessors, engineers.

2. **No legal claims** — The trust center documents technical controls and
   coverage metrics. It does not claim compliance certification. Each
   deployment must be independently assessed.

3. **Machine-readable companion** — The `/compliance/*` endpoints (Phase 315)
   provide the same data in JSON for automated tooling. The trust center
   docs are the human-readable layer.

4. **Version tracking** — Documents reference phase numbers for each control.
   This provides traceability from the trust center back to the git history.

5. **Zero-dependency highlight** — The architecture overview emphasizes the
   zero-dependency approach for PG, S3, and JWT. This is a significant
   security differentiator (minimal supply chain surface).

## Cross-References

- Compliance matrix: apps/api/src/services/compliance-matrix.ts (Phase 315)
- Country packs: country-packs/{US,PH,GH}/values.json (Phase 314)
- Security posture probe: apps/api/src/posture/ (Phase 107)
- Audit verification: GET /iam/audit/verify (Phase 35)
