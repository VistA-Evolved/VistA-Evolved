# Cutover Runbook Template

> Phase 415 (W24-P7): Cutover + Rollback + DR Rehearsal

## 1. Overview

| Field                | Value                                                    |
| -------------------- | -------------------------------------------------------- |
| Customer             | **\*\*\*\***\_**\*\*\*\***                               |
| Archetype            | [ ] Clinic / [ ] Hospital                                |
| Cutover Date         | **\*\*\*\***\_**\*\*\*\***                               |
| Cutover Window       | **\*\*\*\***\_**\*\*\*\*** (e.g., Sat 22:00 - Sun 06:00) |
| Rollback Deadline    | **\*\*\*\***\_**\*\*\*\*** (T + 4 hours)                 |
| Go/No-Go Lead        | **\*\*\*\***\_**\*\*\*\***                               |
| Technical Lead       | **\*\*\*\***\_**\*\*\*\***                               |
| Clinical Safety Lead | **\*\*\*\***\_**\*\*\*\***                               |

---

## 2. Pre-Cutover Checklist (T - 7 days)

- [ ] All UAT scenarios passed (Phase 414 signoff)
- [ ] Migration rehearsal clean (Phase 413 evidence)
- [ ] Certification runner passed (Phase 412 evidence)
- [ ] Environment parity confirmed (Phase 410 evidence)
- [ ] VistA provisioning verified (`/vista/provision/status`)
- [ ] Backup taken and verified
- [ ] Communication sent to all stakeholders
- [ ] On-call roster confirmed
- [ ] Rollback plan reviewed and approved

---

## 3. Pre-Cutover Checklist (T - 1 day)

- [ ] Final backup taken
- [ ] Database snapshot created
- [ ] VistA Docker snapshot tagged
- [ ] API version confirmed (`/health` endpoint)
- [ ] All pending orders/notes signed or deferred
- [ ] Go/No-Go decision: PROCEED / ABORT

---

## 4. Cutover Sequence

### Phase A: Lock (T + 0:00)

1. [ ] Enable maintenance mode (`MAINTENANCE_MODE=true`)
2. [ ] Verify no active user sessions (drain timeout: 30s)
3. [ ] Take final database backup
4. [ ] Record backup hash/checksum

### Phase B: Migrate (T + 0:15)

5. [ ] Run SQLite-to-PG migration (`scripts/migrations/sqlite-to-pg.mjs`)
6. [ ] Verify row counts match between source and target
7. [ ] Run payer seed if needed
8. [ ] Apply VistA routine updates (`scripts/install-vista-routines.ps1`)

### Phase C: Validate (T + 0:45)

9. [ ] Switch runtime mode to `rc` (`PLATFORM_RUNTIME_MODE=rc`)
10. [ ] Start API against PG backend
11. [ ] Verify `/ready` returns `ok: true`
12. [ ] Verify `/posture/data-plane` all gates pass
13. [ ] Verify `/vista/provision/status` returns fully-provisioned
14. [ ] Run smoke test (patient search, allergy read)

### Phase D: Unlock (T + 1:15)

15. [ ] Disable maintenance mode
16. [ ] Verify first user can log in
17. [ ] Run 3 critical UAT scenarios (lookup, allergy, orders)
18. [ ] Confirm: CUTOVER COMPLETE or ROLLBACK

---

## 5. Post-Cutover Verification (T + 1:30)

- [ ] All SLO targets met for first 15 minutes
- [ ] No error spike in logs
- [ ] Circuit breaker closed
- [ ] Prometheus metrics showing healthy request rates
- [ ] Clinical safety lead confirms no patient safety issues

---

## 6. Signoff

| Role                 | Name | Signature | Date/Time |
| -------------------- | ---- | --------- | --------- |
| Go/No-Go Lead        |      |           |           |
| Technical Lead       |      |           |           |
| Clinical Safety Lead |      |           |           |
| Ops On-Call          |      |           |           |

---

## 7. Notes

_Record any deviations, issues, or lessons learned during cutover:_

1. ***
2. ***
3. ***
