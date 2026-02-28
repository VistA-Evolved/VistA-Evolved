# W8-P6 Evidence: Resilience GameDays

## Phase 271 — Resilience & GameDay Drills

### Deliverables

| Artifact | Path | Status |
|----------|------|--------|
| GameDay: DB Down | `docs/runbooks/gameday-db-down.md` | Created |
| GameDay: VistA Down | `docs/runbooks/gameday-vista-down.md` | Created |
| GameDay: Queue Backlog | `docs/runbooks/gameday-queue-backlog.md` | Created |
| GameDay: Node Drain | `docs/runbooks/gameday-node-drain.md` | Created |
| Drill Runner Script | `scripts/dr/gameday-drill.mjs` | Created |
| RPO/RTO Results | `artifacts/dr/gameday-results.json` | Generated at runtime |

### RPO/RTO Summary

| Scenario | RPO Target | RTO Target | Verified By |
|----------|-----------|-----------|-------------|
| Database Down | 0 data loss (committed txns) | < 5 minutes | `gameday-drill.mjs failover` |
| VistA RPC Broker Down | N/A (VistA is SoT) | < 2 minutes | `gameday-drill.mjs failover` |
| Queue Backlog | 0 (persisted in PG) | < 10 minutes | Manual drill |
| Node Drain / Pod Eviction | 0 (PG committed) | < 30 seconds | `gameday-drill.mjs rollback` |

### Built-In Resilience Controls

1. **Circuit Breaker** (rpc-resilience.ts): 5 failures → open, 30s half-open, 2 retries
2. **Graceful Shutdown** (security.ts): SIGINT/SIGTERM → drain → disconnect → exit
3. **Backup/Restore** (backup-restore.mjs): SQLite + PG + audit JSONL
4. **Audit Chain** (immutable-audit.ts): SHA-256 hash chain verifiable via API
5. **Store Policy** (store-policy.ts): 172 tracked stores with loss-on-restart classification

### Drill Execution

```bash
# Run all drills
node scripts/dr/gameday-drill.mjs all

# Run specific drill
node scripts/dr/gameday-drill.mjs failover
node scripts/dr/gameday-drill.mjs restore
node scripts/dr/gameday-drill.mjs rollback

# Machine-readable output only
node scripts/dr/gameday-drill.mjs all --json
```

### Mapping to Safety Case

| Hazard | Control | GameDay Drill |
|--------|---------|---------------|
| H-002 (Data corruption) | C-002, C-023 | DB Down, Restore |
| H-004 (Audit gap) | C-004, C-005 | Node Drain |
| H-007 (RPC regression) | C-011 | VistA Down |
| H-010 (Backup failure) | C-023 | Restore |
