# Week 1 Operations Runbook

> Phase 417 (W24-P9): Post-Go-Live Operations

## Overview

The first week establishes operational patterns and catches issues that
only emerge with sustained real-world usage.

---

## Daily Checks (Days 2-7)

### Morning (Start of Business)

- [ ] SLO dashboard review
- [ ] Overnight incident review
- [ ] Error budget burn rate check
- [ ] VistA connection health
- [ ] Pending incident follow-ups

### End of Day

- [ ] Day summary compiled
- [ ] Any new issues documented
- [ ] Next-day on-call confirmed
- [ ] SLO snapshot recorded

---

## Day 2-3: Pattern Recognition

### Performance Baseline

- [ ] Establish normal request rate (avg RPM)
- [ ] Establish normal error rate baseline
- [ ] Identify peak usage hours
- [ ] Memory/CPU usage patterns documented

### User Feedback Collection

- [ ] Gather feedback from 3+ providers
- [ ] Document any workflow friction points
- [ ] Note any "expected missing" features
- [ ] Track training needs

---

## Day 4-5: Fine-Tuning

### Configuration Adjustments

- [ ] Review rate limiter settings
- [ ] Check circuit breaker thresholds
- [ ] Adjust cache TTLs if needed
- [ ] Review session timeout settings

### Data Validation

- [ ] Spot-check 10 patient records for accuracy
- [ ] Verify allergy data consistency
- [ ] Check order history completeness
- [ ] Validate medication list accuracy

---

## Day 6-7: Week 1 Assessment

### SLO Review

| SLO           | Day 1 | Day 3 | Day 7 | Target |
| ------------- | ----- | ----- | ----- | ------ |
| Availability  |       |       |       | 99.5%  |
| Latency p99   |       |       |       | < 3s   |
| RPC Success   |       |       |       | 99.0%  |
| Error Rate    |       |       |       | < 1%   |
| Login Success |       |       |       | 99.5%  |
| Data Plane    |       |       |       | 100%   |

### Incident Summary

| #   | Severity | Status | Resolution |
| --- | -------- | ------ | ---------- |
|     |          |        |            |

### User Adoption

- Active users: **\_**
- Peak concurrent: **\_**
- Top 3 used features: **\_**
- Top 3 issues reported: **\_**

---

## Week 1 Summary Template

```
Customer: _______________
Week Ending: _______________

SLO Budget Status: [ ] Green / [ ] Yellow / [ ] Red
Total Incidents: _____ (P0: ___ P1: ___ P2: ___ P3: ___)
Resolved: _____
Open: _____

User Satisfaction: [ ] Positive / [ ] Neutral / [ ] Negative
Rollback Required: [ ] No / [ ] Yes (date: ___)

Week 1 Verdict: [ ] STABLE / [ ] NEEDS ATTENTION / [ ] ESCALATE
```

---

## Graduation Criteria (Week 1 -> Month 1)

- [ ] Zero P0 incidents
- [ ] No more than 2 P1 incidents, all resolved
- [ ] SLO-1 (availability) > 99.5% for full week
- [ ] No rollback required
- [ ] User adoption > 80% of expected users
- [ ] Clinical safety lead signoff
