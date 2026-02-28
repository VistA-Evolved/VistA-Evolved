# Go-Live Cutover Runbook

> **Phase 273**: End-to-end cutover procedure for pilot hospital deployment.

---

## Table of Contents

1. [Pre-Cutover Checklist](#pre-cutover-checklist)
2. [Cutover Steps](#cutover-steps)
3. [Post-Cutover Validation](#post-cutover-validation)
4. [Rollback Procedure](#rollback-procedure)
5. [Communication Templates](#communication-templates)

---

## Pre-Cutover Checklist

Complete **all** items before beginning cutover. Mark each complete with initials and timestamp.

### Infrastructure (Items 1-8)

| # | Item | Owner | Status |
|---|------|-------|--------|
| 1 | PostgreSQL provisioned and accessible | Ops | ☐ |
| 2 | `PLATFORM_RUNTIME_MODE=rc` set and validated | Ops | ☐ |
| 3 | `PLATFORM_PG_URL` configured | Ops | ☐ |
| 4 | RLS enabled on all tenant tables (21 tables) | Ops | ☐ |
| 5 | VistA instance reachable on target host:port | Ops | ☐ |
| 6 | VistA routines installed (`install-vista-routines.ps1`) | Ops | ☐ |
| 7 | DNS configured for API + web + portal | Ops | ☐ |
| 8 | TLS certificates provisioned and tested | Ops | ☐ |

### Security (Items 9-14)

| # | Item | Owner | Status |
|---|------|-------|--------|
| 9 | OIDC provider configured (`OIDC_ENABLED=true`) | Security | ☐ |
| 10 | OIDC issuer, client ID, audience set | Security | ☐ |
| 11 | Cookie `secure: true` verified in rc/prod mode | Security | ☐ |
| 12 | CSRF tokens validated end-to-end | Security | ☐ |
| 13 | Rate limiters tuned for expected load | Security | ☐ |
| 14 | Admin accounts provisioned (not default sandbox creds) | Security | ☐ |

### Data (Items 15-20)

| # | Item | Owner | Status |
|---|------|-------|--------|
| 15 | SQLite-to-PG migration completed | Data | ☐ |
| 16 | Payer seed data loaded for target market | Data | ☐ |
| 17 | Tenant configuration seeded | Data | ☐ |
| 18 | Module entitlements configured for pilot SKU | Data | ☐ |
| 19 | Backup/restore tested (PG + audit JSONL) | Data | ☐ |
| 20 | Audit shipping configured (if using S3) | Data | ☐ |

### Verification (Items 21-28)

| # | Item | Owner | Status |
|---|------|-------|--------|
| 21 | Evidence bundle v2 generated and reviewed | QA | ☐ |
| 22 | All 16 release gates pass (SAFETY_RELEASE_GATE.md) | QA | ☐ |
| 23 | RPC contract replay: 0 failures | QA | ☐ |
| 24 | Clinical invariants: 0 failures | QA | ☐ |
| 25 | Security gauntlet: 0 critical findings | QA | ☐ |
| 26 | PHI audit: 0 leaks | QA | ☐ |
| 27 | GameDay drills completed (restore + rollback) | QA | ☐ |
| 28 | Smoke tests pass (k6 or manual) | QA | ☐ |

---

## Cutover Steps

Execute in order. Record start time for each step.

### Phase A: Preparation (T-60 to T-0)

| Step | Action | Duration | Owner |
|------|--------|----------|-------|
| A1 | Announce maintenance window to stakeholders | — | PM |
| A2 | Disable new user registrations | 1 min | Security |
| A3 | Take final backup: `node scripts/backup-restore.mjs backup` | 5 min | Ops |
| A4 | Verify backup integrity | 2 min | Ops |
| A5 | Record current git SHA and config state | 1 min | Dev |

### Phase B: Deploy (T+0 to T+15)

| Step | Action | Duration | Owner |
|------|--------|----------|-------|
| B1 | Deploy API with `PLATFORM_RUNTIME_MODE=prod` | 5 min | Ops |
| B2 | Run PG migrations: API auto-runs on startup | 2 min | Ops |
| B3 | Verify posture: `curl /posture/data-plane` | 1 min | Ops |
| B4 | Verify provision: `curl /vista/provision/status` | 1 min | Ops |
| B5 | Deploy web frontend | 3 min | Ops |
| B6 | Deploy patient portal | 3 min | Ops |

### Phase C: Validation (T+15 to T+30)

| Step | Action | Duration | Owner |
|------|--------|----------|-------|
| C1 | Health check: `curl /health` → 200 | 1 min | Ops |
| C2 | Ready check: `curl /ready` → `ok: true` | 1 min | Ops |
| C3 | VistA ping: `curl /vista/ping` → connected | 1 min | Ops |
| C4 | Login test: authenticate with pilot credentials | 2 min | QA |
| C5 | Patient search: verify search returns results | 2 min | QA |
| C6 | Clinical read: verify allergies, meds, notes load | 5 min | QA |
| C7 | Audit trail: verify `curl /iam/audit/verify` → valid | 1 min | QA |

### Phase D: Open (T+30)

| Step | Action | Duration | Owner |
|------|--------|----------|-------|
| D1 | Re-enable user access | 1 min | Security |
| D2 | Announce go-live to stakeholders | — | PM |
| D3 | Begin first-72-hours monitoring | ongoing | Ops |

---

## Post-Cutover Validation

Run within 1 hour of go-live:

```bash
# Generate evidence bundle with production build ID
node scripts/generate-certification-evidence-v2.mjs --build-id prod-golive-$(date +%Y%m%d)

# Verify posture gates
curl -s http://API_URL/posture/data-plane | jq .
curl -s http://API_URL/posture/observability | jq .
curl -s http://API_URL/posture/performance | jq .
```

---

## Rollback Procedure

**Decision criteria**: Rollback if ANY of these are true:
- Patient data integrity compromised
- Authentication completely broken (no users can log in)
- VistA connection permanently lost
- Critical PHI exposure detected

### Rollback Steps (target: < 15 minutes)

| Step | Action | Duration |
|------|--------|----------|
| R1 | Announce rollback to stakeholders | 1 min |
| R2 | Disable user access | 1 min |
| R3 | Stop current API deployment | 1 min |
| R4 | Restore previous deployment (last known good SHA) | 5 min |
| R5 | Restore database from pre-cutover backup | 5 min |
| R6 | — `node scripts/backup-restore.mjs restore --from <backup-dir> --yes` | — |
| R7 | Verify health: `/health`, `/ready`, `/vista/ping` | 2 min |
| R8 | Re-enable user access | 1 min |
| R9 | Announce rollback complete, schedule post-mortem | — |

### Rollback Decision Tree

```
Issue detected
  │
  ├─ Patient safety risk? ──── YES ──→ IMMEDIATE ROLLBACK
  │
  ├─ Auth broken for all? ──── YES ──→ ROLLBACK within 15 min
  │
  ├─ Partial feature broken? ─ YES ──→ Disable feature flag, monitor
  │                                     Rollback if not fixed in 2h
  │
  └─ Performance degraded? ─── YES ──→ Scale up, tune
                                        Rollback if not improved in 1h
```

---

## Communication Templates

### Pre-Cutover Notice

```
Subject: [VistA-Evolved] Scheduled Maintenance — [DATE] [TIME]

The system will be unavailable for approximately 30 minutes during
deployment. During this time:
- Patient data will not be accessible
- Ongoing sessions will be terminated

Expected timeline:
  Start:    [TIME]
  Complete: [TIME + 30min]

Contact [NAME] at [EMAIL] with questions.
```

### Go-Live Announcement

```
Subject: [VistA-Evolved] System Live — [DATE]

Deployment complete. The system is now available.

If you experience any issues, contact [SUPPORT].

Known limitations in pilot:
- [List any known pending features]
```

### Rollback Notice

```
Subject: [VistA-Evolved] ROLLBACK — System Reverted

Due to [BRIEF REASON], the system has been reverted to the
previous version. A post-mortem will be scheduled.

Current status: System operational on previous version.
Next steps: [TIMELINE for re-attempt]
```
