# Month 1 Operations Runbook

> Phase 417 (W24-P9): Post-Go-Live Operations

## Overview
Month 1 focuses on long-term stability validation, capacity planning,
and preparation for general availability expansion.

---

## Weekly Cadence (Weeks 2-4)

### Weekly Review Meeting
- [ ] SLO dashboard walk-through
- [ ] Error budget burn rate
- [ ] Incident review + post-mortems
- [ ] User feedback summary
- [ ] Capacity metrics review

### Weekly Checks
- [ ] Database growth rate
- [ ] Audit trail chain integrity (`GET /imaging/audit/verify`)
- [ ] Backup verification (restore test monthly)
- [ ] Security posture check (`/posture/security-cert`)
- [ ] VistA provisioning status (`/vista/provision/status`)

---

## Week 2: Stability Confirmation

### Performance Trending
- [ ] Compare Week 2 baseline to Week 1
- [ ] Document any degradation trends
- [ ] Memory leak detection (heap snapshots)
- [ ] Connection pool exhaustion check

### Integration Health
- [ ] HL7 message throughput (if applicable)
- [ ] FHIR call success rate
- [ ] Payer connectivity (if RCM active)
- [ ] Imaging ingest reconciliation (if imaging active)

---

## Week 3: Capacity Planning

### Growth Projections
- [ ] Current user count vs projected
- [ ] Request rate growth rate
- [ ] Database size growth rate
- [ ] Audit trail growth rate

### Scaling Readiness
- [ ] Horizontal scaling tested (multiple API instances)
- [ ] PG connection pool adequate
- [ ] Rate limiter thresholds appropriate
- [ ] CDN/cache hit rates acceptable

---

## Week 4: Month 1 Assessment

### SLO Monthly Report
| SLO | Week 1 | Week 2 | Week 3 | Week 4 | Target |
|-----|--------|--------|--------|--------|--------|
| Availability | | | | | 99.5% |
| Latency p99 | | | | | < 3s |
| RPC Success | | | | | 99.0% |
| Error Rate | | | | | < 1% |
| Login Success | | | | | 99.5% |
| Data Plane | | | | | 100% |

### Incident Trend
| Week | P0 | P1 | P2 | P3 | Total |
|------|----|----|----|----|-------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |

### Error Budget Status
- Budget consumed: _____%
- Budget remaining: _____%
- Budget tier: [ ] Green / [ ] Yellow / [ ] Red

---

## Month 1 Summary Template

```
Customer: _______________
Month Ending: _______________

SLO Compliance: ___/6 SLOs met target
Error Budget: _____% remaining
Total Incidents: _____ (P0: ___ P1: ___ P2: ___ P3: ___)
Mean Time to Resolve (P1): _____ hours

User Adoption: _____% of expected
User Satisfaction: [ ] Positive / [ ] Neutral / [ ] Negative

Recommendation: [ ] CONTINUE / [ ] EXPAND / [ ] PAUSE / [ ] WIND DOWN

Month 1 Verdict: [ ] PRODUCTION READY / [ ] EXTENDED PILOT / [ ] DECOMMISSION
```

---

## GA Expansion Criteria

All of the following must be true before expanding to additional sites:

- [ ] All 6 SLOs met for consecutive 30 days
- [ ] Zero P0 incidents in month 1
- [ ] Error budget > 50% remaining
- [ ] User adoption > 90% of expected
- [ ] Clinical safety lead signoff
- [ ] No open P1 incidents
- [ ] Backup restore tested successfully
- [ ] DR rehearsal completed within last 30 days
- [ ] Security certification current (< 30 days old)
- [ ] Go/No-Go committee approval
