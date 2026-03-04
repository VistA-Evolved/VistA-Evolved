# Pilot Readiness Gates -- VistA-Evolved

> Single source of truth for what must pass before a pilot tenant goes live.
> Each gate maps to an executable command that produces a PASS/FAIL result.

---

## Gate Definitions

### G1 -- GA Readiness (Platform Posture)

| Check                      | Command                                    | Passing Criteria        |
| -------------------------- | ------------------------------------------ | ----------------------- |
| TypeScript build clean     | `cd apps/api; pnpm exec tsc --noEmit`      | Exit code 0, no errors  |
| Production posture QA      | `node scripts/qa-gates/prod-posture.mjs`   | All sub-gates pass      |
| Data plane posture         | `curl -s http://API/posture/data-plane`    | All gates `pass`        |
| Security cert posture      | `curl -s http://API/posture/security-cert` | All phases present      |
| Module entitlements seeded | `curl -s http://API/admin/modules/catalog` | Modules match archetype |

### G2 -- Interop Certification

| Check                  | Command                                        | Passing Criteria         |
| ---------------------- | ---------------------------------------------- | ------------------------ |
| HL7 pack tests         | `pwsh scripts/verify-wave17-packs.ps1`         | All gates pass           |
| HIE certification      | `pwsh scripts/verify-wave23-hie.ps1`           | All gates pass           |
| Interop gateway routes | `curl -s http://API/interop-gateway/dashboard` | `ok: true`, channels > 0 |

### G3 -- Device Certification

| Check                | Command                                  | Passing Criteria  |
| -------------------- | ---------------------------------------- | ----------------- |
| Device gateway tests | `pwsh scripts/verify-wave21-devices.ps1` | All gates pass    |
| DICOM connectivity   | `curl -s http://API/imaging/health`      | Orthanc connected |

### G4 -- HIE Certification

| Check                    | Command                                          | Passing Criteria   |
| ------------------------ | ------------------------------------------------ | ------------------ |
| HIE cert runner          | `pwsh scripts/verify-wave23-hie.ps1`             | 103/103 gates pass |
| Document exchange routes | `curl -s http://API/document-exchange/dashboard` | `ok: true`         |
| MPI routes               | `curl -s http://API/mpi/dashboard`               | `ok: true`         |

### G5 -- Customer Integration Certification

| Check                    | Command                                                           | Passing Criteria       |
| ------------------------ | ----------------------------------------------------------------- | ---------------------- |
| Per-customer cert runner | `pwsh scripts/certify-pilot-customer.ps1 --tenant T --facility F` | Exit 0, all packs pass |
| Evidence pack generated  | Check `/evidence/wave-24/W24-CUSTOMER-CERT/<tenant>/`             | summary.json exists    |

### G6 -- Environment Parity

| Check                | Command                                           | Passing Criteria       |
| -------------------- | ------------------------------------------------- | ---------------------- |
| Env parity script    | `pwsh scripts/verify-env-parity.ps1 -Env staging` | All parity checks pass |
| Canary tenant exists | Included in parity script                         | Canary health OK       |

### G7 -- Data Migration

| Check               | Command                                                | Passing Criteria  |
| ------------------- | ------------------------------------------------------ | ----------------- |
| Migration rehearsal | `pwsh scripts/migrate-rehearsal.ps1 -Tenant T -DryRun` | Exit 0, no errors |
| Idempotency check   | Run rehearsal twice                                    | No duplicates     |

### G8 -- UAT Sign-off

| Check                | Command                                         | Passing Criteria         |
| -------------------- | ----------------------------------------------- | ------------------------ |
| UAT sign-off exists  | Check `/docs/pilots/uat/signoffs/<tenant>-*.md` | File exists, status=PASS |
| Automated UAT subset | Playwright suite for archetype                  | All tests pass           |

### G9 -- DR Freshness

| Check                  | Command                                         | Passing Criteria         |
| ---------------------- | ----------------------------------------------- | ------------------------ |
| DR rehearsal timestamp | Check evidence trail                            | Within 7 days of go-live |
| Backup/restore script  | `node scripts/backup-restore.mjs backup`        | Exit 0                   |
| Restore validation     | `node scripts/backup-restore.mjs restore --yes` | Exit 0, data intact      |

### G10 -- Security Certification

| Check                 | Command                                                | Passing Criteria   |
| --------------------- | ------------------------------------------------------ | ------------------ |
| Security posture      | `curl -s http://API/posture/security-cert`             | All phases present |
| PHI leak audit        | `node scripts/qa-gates/phi-leak-audit.mjs` (if exists) | No leaks           |
| Audit chain integrity | `curl -s http://API/iam/audit/verify`                  | `valid: true`      |

---

## Aggregate Go/No-Go

The aggregate gate runner is:

```powershell
pwsh scripts/pilot-go-no-go.ps1 --tenant <id>
```

It checks G1-G10 and produces a PASS/FAIL report.

**Policy**: ALL gates must pass. Any single FAIL blocks go-live.

---

## Freshness Requirements

| Artifact                  | Max Age |
| ------------------------- | ------- |
| DR rehearsal              | 7 days  |
| Security cert             | 30 days |
| Customer integration cert | 7 days  |
| UAT sign-off              | 14 days |
| Migration rehearsal       | 7 days  |
| Environment parity        | 1 day   |
