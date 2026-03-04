# Phase 164 -- Certification / Readiness Posture

## Overview

Phase 164 adds a certification/readiness posture domain with 10 gates
covering security documentation, developer onboarding, VistA provisioning,
infrastructure configuration, and architecture docs. Integrated into the
unified `/posture` endpoint and available standalone at `/posture/certification`.

## Architecture

```
apps/api/src/posture/
  certification-posture.ts   -- 10 certification gates
  index.ts                   -- +/posture/certification endpoint, +unified inclusion
```

## Gates

| #   | Gate                  | What It Checks                                              |
| --- | --------------------- | ----------------------------------------------------------- |
| 1   | security_docs         | docs/security/ and analytics data classification docs exist |
| 2   | dev_onboarding_guide  | AGENTS.md exists for developer onboarding                   |
| 3   | env_template          | apps/api/.env.example exists                                |
| 4   | runbooks_coverage     | Recent phase runbooks exist (>= 2 of 4 checked)             |
| 5   | docker_infrastructure | Docker compose files for VistA and production               |
| 6   | vista_provisioning    | install-vista-routines.ps1 unified script present           |
| 7   | module_config_files   | modules.json, skus.json, capabilities.json all present      |
| 8   | rpc_catalog_snapshot  | data/vista/rpc-catalog-snapshot.json exists                 |
| 9   | backup_restore_script | scripts/backup-restore.mjs exists                           |
| 10  | architecture_docs     | Architecture documentation present (>= 1 of 2)              |

## Readiness Levels

| Score | Level       |
| ----- | ----------- |
| >= 90 | production  |
| >= 70 | staging     |
| >= 40 | development |
| < 40  | incomplete  |

## API Endpoints

| Method | Path                   | Description                                        |
| ------ | ---------------------- | -------------------------------------------------- |
| GET    | /posture/certification | Certification posture only                         |
| GET    | /posture               | Unified report (now includes certification domain) |

## Manual Testing

```bash
# Certification posture
curl http://localhost:3001/posture/certification -b cookies.txt | jq .

# Unified posture (includes certification)
curl http://localhost:3001/posture -b cookies.txt | jq '.domains.certification'
```
