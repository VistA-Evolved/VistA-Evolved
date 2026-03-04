# Rollback Runbook Template

> Phase 415 (W24-P7): Cutover + Rollback + DR Rehearsal

## 1. Rollback Criteria

A rollback MUST be initiated if ANY of these conditions are met:

| #   | Condition               | Trigger                                           |
| --- | ----------------------- | ------------------------------------------------- |
| 1   | Patient safety event    | Any clinical data loss or corruption              |
| 2   | Authentication failure  | Users cannot log in within 15 min of cutover      |
| 3   | VistA connectivity loss | RPC broker unreachable for > 5 min post-unlock    |
| 4   | Data integrity failure  | PG row counts diverge from migration source       |
| 5   | SLO breach              | Error rate > 5% or p99 latency > 10s for > 10 min |
| 6   | Go/No-Go lead decision  | Lead determines risk exceeds tolerance            |

---

## 2. Rollback Decision

| Field                | Value                      |
| -------------------- | -------------------------- |
| Decision Time        | **\*\*\*\***\_**\*\*\*\*** |
| Trigger Condition    | # **\_**                   |
| Decision Maker       | **\*\*\*\***\_**\*\*\*\*** |
| Rollback Approved By | **\*\*\*\***\_**\*\*\*\*** |

---

## 3. Rollback Sequence

### Phase R1: Stop + Protect (T + 0:00)

1. [ ] Enable maintenance mode (`MAINTENANCE_MODE=true`)
2. [ ] Wait for drain timeout (30s)
3. [ ] Stop API process
4. [ ] Take current PG snapshot (preserve for forensics)

### Phase R2: Restore (T + 0:10)

5. [ ] Restore database from pre-cutover backup
   ```powershell
   node scripts/backup-restore.mjs restore --yes
   ```
6. [ ] Verify backup hash matches pre-cutover checksum
7. [ ] Restore VistA globals if modified
   ```powershell
   # If VistA routines were updated, Docker image rollback:
   docker compose -f services/vista/docker-compose.yml down
   docker compose -f services/vista/docker-compose.yml up -d
   ```

### Phase R3: Revert Config (T + 0:25)

8. [ ] Revert `PLATFORM_RUNTIME_MODE` to `dev`
9. [ ] Revert `STORE_BACKEND` to `auto` or `sqlite`
10. [ ] Revert any env var changes made during cutover
11. [ ] Restart API with pre-cutover config

### Phase R4: Validate (T + 0:35)

12. [ ] Verify `/health` returns 200
13. [ ] Verify `/ready` returns `ok: true`
14. [ ] Verify patient search works
15. [ ] Verify allergy read works
16. [ ] Verify no data loss (spot-check 3 patients)

### Phase R5: Unlock (T + 0:45)

17. [ ] Disable maintenance mode
18. [ ] Notify stakeholders: rollback complete
19. [ ] First user login verified

---

## 4. Post-Rollback Actions

- [ ] Incident report filed within 24 hours
- [ ] Root cause analysis scheduled within 72 hours
- [ ] Migration artifacts preserved for forensics
- [ ] Stakeholder communication sent
- [ ] Re-cutover date proposed (minimum 7-day gap)

---

## 5. Signoff

| Role                 | Name | Signature | Date/Time |
| -------------------- | ---- | --------- | --------- |
| Rollback Lead        |      |           |           |
| Technical Lead       |      |           |           |
| Clinical Safety Lead |      |           |           |
| Incident Manager     |      |           |           |

---

## 6. DR Rehearsal Integration

This rollback procedure should be rehearsed using the DR validation
environment (`infra/environments/dr-validate.yaml`):

```powershell
# 1. Deploy to DR environment
# 2. Run cutover sequence
# 3. Simulate failure condition
# 4. Execute rollback
# 5. Verify restoration
# 6. Record rehearsal evidence
```

DR rehearsal should be completed within 7 days of planned cutover.
Evidence recorded in `evidence/wave-24/415-cutover/`.

---

## 7. Lessons Learned

_Record after every rollback or DR rehearsal:_

1. ***
2. ***
3. ***
