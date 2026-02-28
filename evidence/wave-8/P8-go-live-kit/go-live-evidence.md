# W8-P8 Evidence: Go-Live Cutover Kit

## Phase 273 — Go-Live Cutover Kit

### Deliverables

| Artifact | Path | Status |
|----------|------|--------|
| Go-Live Runbook | `docs/runbooks/go-live.md` | Created |
| First 72 Hours Guide | `docs/runbooks/first-72-hours.md` | Created |
| Pilot Mode Guide | `docs/runbooks/pilot-mode.md` | Created |
| Prompt IMPLEMENT | `prompts/271-PHASE-273-GO-LIVE-CUTOVER-KIT/273-01-IMPLEMENT.md` | Created |
| Prompt VERIFY | `prompts/271-PHASE-273-GO-LIVE-CUTOVER-KIT/273-99-VERIFY.md` | Created |

### Go-Live Checklist Summary

- **28 pre-cutover items** across 4 categories:
  - Infrastructure (8 items)
  - Security (6 items)
  - Data (6 items)
  - Verification (8 items)
- **4 cutover phases**: Preparation → Deploy → Validation → Open
- **Rollback procedure**: 9 steps, target < 15 minutes
- **Communication templates**: Pre-cutover, go-live, rollback

### First 72 Hours Summary

- **Hours 0-4**: 15-minute monitoring cadence, 8 critical checks
- **Hours 4-12**: 30-minute cadence, login/search/RPC metrics
- **Hours 12-24**: 60-minute cadence, aggregation/backup/disk
- **Hours 24-48**: 2-hour cadence, pattern comparison
- **Hours 48-72**: 4-hour cadence, go/no-go decision

### Known Failure Modes Documented

| ID | Failure Mode | Severity | Recovery Time |
|----|-------------|----------|---------------|
| FM-1 | VistA connection drop | SEV-1 | 30-45s (circuit breaker) |
| FM-2 | Session spill after restart | SEV-3 | Immediate (re-login) |
| FM-3 | Stale cache | SEV-4 | 30s-5min (TTL expiry) |
| FM-4 | Memory pressure | SEV-3 | Immediate (restart) |
| FM-5 | Audit log growth | SEV-4 | Enable shipping |
| FM-6 | OIDC validation failure | SEV-2 | Restart or fallback |

### Mapping to Safety Case

| Safety Gate | Go-Live Artifact |
|------------|-----------------|
| G-15 Evidence bundle | Pre-cutover checklist item 21 |
| G-16 Go-live checklist signed | Go-live.md checklist |
| All 16 gates | Pre-cutover checklist item 22 |
