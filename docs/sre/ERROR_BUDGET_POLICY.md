# Error Budget Policy

> Phase 416 (W24-P8): Post-Go-Live Monitoring + SRE

## Overview

Error budgets quantify the acceptable unreliability for each SLO. When the
budget is exhausted, development velocity is traded for reliability work.

---

## Budget Calculation

```
Error Budget = 1 - SLO Target

Example: SLO-1 (99.5% availability)
  Budget = 1 - 0.995 = 0.005 = 0.5%
  Monthly budget = 0.5% * 30d * 24h * 60m = 216 minutes = 3.6 hours
```

---

## Budget Tiers

### Green (> 50% budget remaining)

- Normal development velocity
- Feature work proceeds
- No special restrictions

### Yellow (25-50% budget remaining)

- Feature work continues with caution
- All deployments require extra validation
- Rollback plan must be ready before deploy
- Post-deploy monitoring increased to 30 min

### Red (< 25% budget remaining)

- Feature freeze (except reliability fixes)
- All engineering effort on reliability
- Incident review required before any deploy
- Executive notification

### Exhausted (0% budget remaining)

- Complete feature freeze
- Emergency reliability sprint
- All deploys blocked except hotfixes
- Daily standup with SRE + engineering leads
- Budget resets at next measurement window

---

## Budget Consumption Events

| Event                | Budget Impact           | Required Action                 |
| -------------------- | ----------------------- | ------------------------------- |
| Planned maintenance  | Does NOT consume budget | Pre-announced, maintenance mode |
| Unplanned downtime   | Consumes budget         | Incident report within 24h      |
| Degraded performance | Consumes proportional   | Monitor closely                 |
| Data plane failure   | Immediate red           | Stop all deploys                |
| Patient safety event | Immediate exhausted     | Full incident response          |

---

## Incident Severity Mapping

| Severity | Definition                     | Response Time     | Escalation     |
| -------- | ------------------------------ | ----------------- | -------------- |
| P0       | Patient safety / data loss     | Immediate         | All hands      |
| P1       | Service down / SLO breach      | 15 min            | On-call + lead |
| P2       | Degraded performance           | 1 hour            | On-call        |
| P3       | Minor issue, workaround exists | Next business day | Queue          |

---

## Budget Review Cadence

| Review                      | Frequency | Participants          |
| --------------------------- | --------- | --------------------- |
| SLO dashboard check         | Daily     | On-call engineer      |
| Budget burn rate review     | Weekly    | SRE team              |
| Monthly SLO report          | Monthly   | Engineering + Product |
| Quarterly SLO target review | Quarterly | Engineering + Exec    |

---

## Policy Enforcement

1. Budget status is visible on the SRE dashboard
2. Automated alerts at Yellow and Red thresholds
3. Feature freeze at Red is mandatory, not optional
4. Budget exceptions require VP-level approval
5. Post-incident review must include budget impact analysis
