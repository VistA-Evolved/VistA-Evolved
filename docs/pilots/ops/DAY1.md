# Day 1 Operations Runbook

> Phase 417 (W24-P9): Post-Go-Live Operations

## Overview

Day 1 after cutover is the highest-risk period. This runbook covers the
first 24 hours of operations for a pilot deployment.

---

## Hour 0-1: Immediate Post-Cutover

### Monitoring Checkpoints

- [ ] `/health` returning 200
- [ ] `/ready` returning `ok: true`
- [ ] `/posture/data-plane` all gates passing
- [ ] Circuit breaker closed
- [ ] VistA RPC broker connected
- [ ] No error spikes in logs

### First User Validation

- [ ] First clinician logs in successfully
- [ ] Patient search returns results
- [ ] Allergy list loads
- [ ] Medication list loads

### Communication

- [ ] "Go-live confirmed" message sent to stakeholders
- [ ] On-call roster active and confirmed

---

## Hour 1-4: Early Monitoring

### SLO Monitoring

- [ ] SLO-1 (Availability): check every 15 min
- [ ] SLO-4 (Error Rate): watch for > 1% 5xx
- [ ] SLO-3 (RPC Success): watch for circuit breaker trips

### Escalation Triggers

| Condition                  | Action                                    |
| -------------------------- | ----------------------------------------- |
| Any 5xx spike > 2%         | Alert on-call, prepare rollback           |
| Circuit breaker open       | Page entire team                          |
| User reports data mismatch | Immediate investigation, prepare rollback |
| Login failures > 5%        | Check auth service, prepare rollback      |

### Log Review

- [ ] Check for unexpected error patterns
- [ ] Verify no PHI in log output
- [ ] Check audit trail is recording

---

## Hour 4-12: Stabilization

### Periodic Checks (every 2 hours)

- [ ] SLO dashboard green
- [ ] Prometheus metrics normal
- [ ] Memory usage stable (no leaks)
- [ ] Connection pool healthy

### Clinical Workflow Smoke Tests

- [ ] Provider completes a patient encounter
- [ ] Order entered and visible in orders list
- [ ] Note created and saved as draft
- [ ] Allergy added successfully

---

## Hour 12-24: Handoff

### End of Day 1 Checklist

- [ ] All SLOs within budget
- [ ] No open P0 or P1 incidents
- [ ] Night shift on-call briefed
- [ ] Day 1 summary report compiled
- [ ] Any issues documented with workarounds

### Handoff to Night Operations

- [ ] Monitoring alerts configured
- [ ] Escalation path confirmed
- [ ] Rollback authority delegated (if needed)

---

## Day 1 Summary Template

```
Customer: _______________
Date: _______________
Cutover Time: _______________

SLO Status: [ ] All Green / [ ] Yellow / [ ] Red
Active Incidents: _______________
Resolved Incidents: _______________
Users Active: _______________
Key Issues: _______________

Day 1 Verdict: [ ] STABLE / [ ] MONITORING / [ ] CONCERNING
```
