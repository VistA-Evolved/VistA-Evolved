# W8-P7 Evidence: Certification Evidence Bundle v2

## Phase 272 — Certification Evidence Bundle v2

### Deliverables

| Artifact | Path | Status |
|----------|------|--------|
| Evidence Generator v2 | `scripts/generate-certification-evidence-v2.mjs` | Created |
| Evidence Runbook | `docs/runbooks/evidence-bundle-v2.md` | Created |
| Prompt IMPLEMENT | `prompts/270-PHASE-272-CERTIFICATION-BUNDLE-V2/272-01-IMPLEMENT.md` | Created |
| Prompt VERIFY | `prompts/270-PHASE-272-CERTIFICATION-BUNDLE-V2/272-99-VERIFY.md` | Created |

### Bundle Sections (10)

| # | Section | Machine Output |
|---|---------|---------------|
| 1 | Git & Version Metadata | `metadata.json` |
| 2 | TypeScript Compilation | `typecheck.json` |
| 3 | RPC Contract Replay | `rpc-contract-report.json` |
| 4 | Clinical Invariants | `invariants-report.json` |
| 5 | Security Gauntlet | `security-gauntlet.json` |
| 6 | PHI Audit | `phi-audit-report.json` |
| 7 | GameDay Drills | `gameday-results.json` |
| 8 | Audit Chain Verification | `audit-chain.json` |
| 9 | Safety Case Cross-Reference | `safety-case-xref.json` |
| 10 | SHA-256 Manifest | `manifest.json` |

### Execution

```bash
node scripts/generate-certification-evidence-v2.mjs
```

### Mapping to Safety Release Gates

| Release Gate | Evidence Section |
|-------------|-----------------|
| G-01 TypeScript compile | Section 2 |
| G-03 RPC contract replay | Section 3 |
| G-04 PHI leak scan | Section 6 |
| G-05 Secret scan | Section 5 |
| G-06 Dependency vuln | Section 5 |
| G-07 Audit chain integrity | Section 8 |
| G-11 DR backup tested | Section 7 |
| G-14 Clinical invariants | Section 4 |
| G-15 Evidence bundle | Section 10 (manifest) |
