# Rollback Drills Runbook

> Phase 462 (W30-P7) — Practicing and validating the rollback procedure.

## Overview

Rollback drills ensure the team can revert from VistA-Evolved to VistA-only
operation within the Recovery Time Objective (RTO). Default RTO: 30 minutes.

## Drill Cadence

| When                   | Type                                  |
| ---------------------- | ------------------------------------- |
| Monthly                | Automated drill via script            |
| Pre-cutover (T-7 days) | Full manual drill                     |
| Pre-cutover (T-1 day)  | Automated drill + manual verification |

## Running a Drill

### Automated (simulated)

```powershell
.\scripts\migration\rollback-drill.ps1
```

### Via API

```bash
# Create drill
curl -X POST http://localhost:3001/migration/rollback/drill \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"type": "drill"}'

# Start drill
curl -X POST http://localhost:3001/migration/rollback/:id/start -b cookies.txt

# Complete each step
curl -X POST http://localhost:3001/migration/rollback/:id/step/rs1/complete \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"passed": true}'
```

## Rollback Steps (8 total)

| #   | Step                | Description                                |
| --- | ------------------- | ------------------------------------------ |
| 1   | halt-traffic        | Stop routing traffic to VistA-Evolved      |
| 2   | verify-vista-health | Confirm VistA instance is healthy          |
| 3   | switch-dns          | Point DNS/LB back to VistA-only            |
| 4   | verify-reads        | Validate VistA read operations             |
| 5   | verify-writes       | Validate VistA write operations            |
| 6   | notify-users        | Send rollback notification                 |
| 7   | archive-logs        | Archive VistA-Evolved logs for post-mortem |
| 8   | final-verification  | Post-rollback smoke tests                  |

## Success Criteria

- All 8 steps complete without failure
- Total duration within RTO (30 minutes)
- VistA reads and writes verified functional
- Drill report generated and archived

## Notes

- Drill reports written to `artifacts/rollback-drill-*.json`
- In-memory tracking resets on API restart
- Admin-only access
- Each step is timed individually for bottleneck analysis
