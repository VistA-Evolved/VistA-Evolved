# VistA-Evolved — Safety Release Gate

> **Document Version**: 1.0 — Phase 266
> **Classification**: Deployment Gate Criteria
> **Last Updated**: 2026-02-28

---

## Purpose

No release candidate (RC) may be promoted to pilot or production unless
**every gate below passes**. Gates are ordered by priority. A failure in any
Critical gate blocks the release entirely.

---

## Gate Summary

| #    | Gate                          | Severity | Automated | Tool / Script                                 |
| ---- | ----------------------------- | -------- | --------- | --------------------------------------------- |
| G-01 | TypeScript compilation        | Critical | Yes       | `npx tsc --noEmit`                            |
| G-02 | Unit test suite               | Critical | Yes       | `pnpm qa:api` (Vitest)                        |
| G-03 | RPC contract replay           | Critical | Yes       | `rpc-contract-replay.test.ts`                 |
| G-04 | PHI leak scan                 | Critical | Yes       | `scripts/phi-leak-scan.mjs`                   |
| G-05 | Secret scan                   | Critical | Yes       | `scripts/secret-scan.mjs`                     |
| G-06 | Dependency vulnerability scan | Critical | Yes       | `pnpm audit --audit-level=critical`           |
| G-07 | Audit chain integrity         | Critical | Yes       | `GET /iam/audit/verify`                       |
| G-08 | Tenant isolation (RLS)        | Critical | Yes       | `rls-cross-reference.test.ts`                 |
| G-09 | Store policy compliance       | High     | Yes       | `scripts/qa-gates/store-policy-gate.mjs`      |
| G-10 | SAT suite (≥80% pass)         | High     | Yes       | `pnpm qa:gauntlet:rc`                         |
| G-11 | DR backup verification        | High     | Yes       | `scripts/backup-restore.mjs status`           |
| G-12 | Data plane posture            | High     | Yes       | `GET /posture/data-plane`                     |
| G-13 | Security gauntlet             | High     | Yes       | `scripts/security/gauntlet.mjs`               |
| G-14 | Clinical invariant suite      | High     | Yes       | `apps/api/tests/invariants/`                  |
| G-15 | Evidence bundle generation    | Medium   | Yes       | `scripts/generate-certification-evidence.mjs` |
| G-16 | Go-live checklist sign-off    | Medium   | Manual    | `docs/runbooks/go-live.md`                    |

---

## Gate Details

### G-01: TypeScript Compilation

```bash
npx tsc --noEmit
```

- **Pass**: Exit code 0, zero errors
- **Fail**: Any type error blocks release

### G-02: Unit Test Suite

```bash
cd apps/api && pnpm vitest run
```

- **Pass**: All non-skipped tests pass
- **Fail**: Any test failure blocks release
- **Note**: Integration tests requiring Docker may be skipped with `--testPathIgnorePatterns`

### G-03: RPC Contract Replay

```bash
cd apps/api && pnpm vitest run tests/rpc-contract-replay.test.ts
```

- **Pass**: All fixture validations pass, PHI scan clean
- **Fail**: Any schema mismatch or PHI detection blocks release
- **Reference**: Safety Case H-007 (RPC Protocol Regression)

### G-04: PHI Leak Scan

```bash
node scripts/phi-leak-scan.mjs
```

- **Pass**: Zero violations
- **Fail**: Any PHI pattern detected in source blocks release
- **Reference**: Safety Case H-006 (PHI Leak)

### G-05: Secret Scan

```bash
node scripts/secret-scan.mjs
```

- **Pass**: Zero hardcoded credentials outside exemptions
- **Fail**: Any secret found blocks release

### G-06: Dependency Vulnerability Scan

```bash
pnpm audit --audit-level=critical
```

- **Pass**: Zero critical vulnerabilities
- **Fail**: Any critical CVE blocks release
- **Note**: Known CVEs may be ignored in `package.json` `pnpm.auditConfig.ignoreCves`

### G-07: Audit Chain Integrity

```bash
curl -s http://localhost:3001/iam/audit/verify | jq .valid
```

- **Pass**: `valid: true` for all chains
- **Fail**: Any chain break blocks release
- **Reference**: Safety Case H-004 (Audit Gap)

### G-08: Tenant Isolation (RLS)

```bash
cd apps/api && pnpm vitest run tests/rls-cross-reference.test.ts
```

- **Pass**: All RLS policies verified
- **Fail**: Missing RLS blocks release
- **Reference**: Safety Case H-009 (Tenant Cross-Contamination)

### G-09: Store Policy Compliance

```bash
node scripts/qa-gates/store-policy-gate.mjs
```

- **Pass**: All in-memory stores registered, no critical+in_memory_only violations
- **Fail**: Unregistered stores or policy violations block release

### G-10: SAT Suite

```bash
pnpm qa:gauntlet:rc
```

- **Pass**: ≥80% of scenarios pass
- **Fail**: <80% pass rate blocks release
- **Note**: Some scenarios require Docker (VistA, PG)

### G-11: DR Backup Verification

```bash
node scripts/backup-restore.mjs status
```

- **Pass**: All configured stores report backup capability
- **Fail**: Missing backup configuration blocks release
- **Reference**: Safety Case H-010 (Backup Failure)

### G-12: Data Plane Posture

```bash
curl -s http://localhost:3001/posture/data-plane | jq .overallHealth
```

- **Pass**: `overallHealth: "healthy"` or all critical gates pass
- **Fail**: Critical data plane gate failure blocks release

### G-13: Security Gauntlet

```bash
node scripts/security/gauntlet.mjs
```

- **Pass**: Dependency, SAST, and container scan thresholds met
- **Fail**: Threshold violations block release

### G-14: Clinical Invariant Suite

```bash
cd apps/api && pnpm vitest run tests/invariants/
```

- **Pass**: All patient identity, encounter, and medication invariants hold
- **Fail**: Any invariant violation blocks release
- **Reference**: Safety Case H-001, H-003

### G-15: Evidence Bundle Generation

```bash
node scripts/generate-certification-evidence.mjs --build-id rc-$(git rev-parse --short HEAD)
```

- **Pass**: Bundle generated with manifest
- **Fail**: Missing evidence section warns but does not block

### G-16: Go-Live Checklist

- **Pass**: All items in `docs/runbooks/go-live.md` checked by a human
- **Fail**: Unsigned checklist blocks pilot deployment

---

## Deployment Tiers

| Tier            | Required Gates                     | Approval                             |
| --------------- | ---------------------------------- | ------------------------------------ |
| **Development** | G-01, G-02                         | Self                                 |
| **Staging**     | G-01 through G-10                  | Tech Lead                            |
| **Pilot**       | G-01 through G-16                  | Tech Lead + Clinical Lead            |
| **Production**  | G-01 through G-16 + 72h pilot soak | Tech Lead + Clinical Lead + Security |

---

## Revision History

| Version | Date       | Author    | Changes               |
| ------- | ---------- | --------- | --------------------- |
| 1.0     | 2026-02-28 | Phase 266 | Initial release gates |
