# First 72 Hours — Post-Go-Live Monitoring Guide

> **Phase 273**: Hour-by-hour monitoring priorities, escalation rules, known failure modes.

---

## Hour-by-Hour Monitoring

### Hours 0-4: Critical Watch

**Monitoring cadence**: Every 15 minutes

| Check | Endpoint / Method | Alert Threshold |
|-------|--------------------|-----------------|
| API alive | `GET /health` | Any non-200 |
| API ready | `GET /ready` | `ok: false` for > 2 min |
| VistA connected | `GET /vista/ping` | `ok: false` for > 1 min |
| Error rate | Prometheus `http_errors_total` | > 5% of requests |
| Response time P95 | Prometheus `http_duration_seconds` | > 2s |
| Circuit breaker | `GET /ready` details | `open` state |
| Audit chain | `GET /iam/audit/verify` | `chainValid: false` |
| Memory usage | `GET /posture/performance` | > 80% heap |

**Actions**:
- Assign on-call engineer for continuous monitoring
- Keep rollback backup readily accessible
- Log all issues in incident channel

### Hours 4-12: Stabilization

**Monitoring cadence**: Every 30 minutes

| Check | Alert Threshold |
|-------|-----------------|
| All checks from Hours 0-4 | Same thresholds |
| Login success rate | < 95% |
| Patient search latency | P95 > 3s |
| RPC call success rate | < 98% |
| Active sessions | Unexpected drop > 50% |

**Actions**:
- Review first shift's clinical workflows end-to-end
- Check audit trail for any anomalies
- Verify data written during go-live reads back correctly

### Hours 12-24: Day 1 Complete

**Monitoring cadence**: Every 60 minutes

| Check | Alert Threshold |
|-------|-----------------|
| Daily aggregation ran | Analytics aggregation job completed |
| Backup ran successfully | Backup script completed |
| Disk usage | > 70% |
| Queue depth | > 100 pending jobs |

**Actions**:
- Run evidence bundle: `node scripts/generate-certification-evidence-v2.mjs`
- Compare Day 1 metrics to baseline
- Brief stakeholders on Day 1 status

### Hours 24-48: Day 2

**Monitoring cadence**: Every 2 hours

| Check | Notes |
|-------|-------|
| Second-day usage patterns | Compare to Day 1 |
| Any recurring errors | Review structured logs |
| User feedback | Collect from pilot users |
| Performance trends | CPU/memory/disk trending |

### Hours 48-72: Day 3

**Monitoring cadence**: Every 4 hours

| Check | Notes |
|-------|-------|
| Stabilization trends | Errors declining? |
| Audit trail growth | Normal rate? |
| Storage projections | Days until disk full? |
| Go/No-Go for full rollout | Decision gate |

---

## Escalation Rules

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **SEV-1** | System down, patient safety risk | < 5 minutes | Page on-call + CTO |
| **SEV-2** | Major feature broken, data integrity risk | < 15 minutes | Page on-call |
| **SEV-3** | Partial feature degraded, workaround exists | < 1 hour | Slack channel |
| **SEV-4** | Minor cosmetic or performance issue | < 4 hours | Ticket |

### Escalation Triggers

| Condition | Severity | Action |
|-----------|----------|--------|
| API unreachable for > 2 minutes | SEV-1 | Page + consider rollback |
| VistA connection lost for > 5 minutes | SEV-1 | Page + check VistA health |
| Audit chain integrity failure | SEV-1 | Stop writes, investigate |
| PHI exposure detected | SEV-1 | Isolate, page security team |
| Login broken for all users | SEV-2 | Page, 15-min rollback decision |
| Circuit breaker stuck open | SEV-2 | Investigate VistA, page ops |
| Single feature not working | SEV-3 | Disable via feature flag |
| Slow queries (P95 > 5s) | SEV-3 | Investigate, tune queries |
| UI rendering issue | SEV-4 | Create ticket |

---

## Known Failure Modes

### FM-1: VistA Connection Drop

**Symptoms**: Circuit breaker open, clinical reads fail
**Cause**: VistA container restart, network partition, port exhaustion
**Response**:
1. Check VistA Docker logs: `docker logs <wv-container>`
2. Check if port 9430 is responsive: `nc -z <host> 9430`
3. Wait 30-45s for circuit breaker recovery
4. If no recovery: restart API (circuit breaker resets)

### FM-2: Session Spill After Restart

**Symptoms**: Users get 401 after API restart
**Cause**: In-memory session cache cleared on restart
**Response**:
1. Users re-login (sessions persist in PG, cache refills)
2. If PG sessions also lost: check PG connection
3. Not a data integrity issue — expected transient behavior

### FM-3: Stale Cache

**Symptoms**: Patient data shows old values
**Cause**: RPC capability cache (5 min TTL), clinical report cache (30s TTL)
**Response**:
1. Wait for cache TTL expiry
2. If urgent: restart API to clear all caches
3. No data corruption — display-only issue

### FM-4: Memory Pressure

**Symptoms**: API slow, heap > 80%
**Cause**: Large in-memory stores (30+ stores, some unbounded)
**Response**:
1. Check `/posture/performance` for heap details
2. Identify largest stores via posture data
3. Restart API to clear in-memory stores
4. Long-term: migrate large stores to PG

### FM-5: Audit Log File Growth

**Symptoms**: Disk filling up
**Cause**: `logs/immutable-audit.jsonl` grows unbounded
**Response**:
1. Enable audit shipping (`AUDIT_SHIP_ENABLED=true`) to offload to S3
2. Rotate file: rename current, API creates new on next write
3. Keep old file for chain verification

### FM-6: OIDC Token Validation Failure

**Symptoms**: All OIDC logins fail
**Cause**: JWKS cache stale, issuer misconfigured, clock skew
**Response**:
1. Check `OIDC_ISSUER` is reachable
2. Restart API to refresh JWKS cache
3. Check server clock sync (NTP)
4. Fallback to VistA RPC auth if `OIDC_ENABLED=false`

---

## Monitoring Dashboards

### Required Metrics

If Prometheus + Grafana deployed:

```
# API health
up{job="vista-evolved-api"}

# Request rate
rate(http_request_duration_seconds_count[5m])

# Error rate
rate(http_request_duration_seconds_count{status_code=~"5.."}[5m])

# RPC call rate
rate(vista_rpc_call_total[5m])

# Circuit breaker state
vista_circuit_breaker_state

# Active sessions
vista_active_sessions
```

### Log Queries

```bash
# Errors in last hour
grep '"level":"error"' logs/app.log | tail -20

# VistA RPC failures
grep '"rpc"' logs/app.log | grep '"ok":false' | tail -10

# Auth failures
grep '"action":"auth.login"' logs/immutable-audit.jsonl | grep '"outcome":"failed"' | tail -10
```

---

## Go/No-Go Decision at 72 Hours

The pilot continues to full rollout if **all** conditions met:

- [ ] Zero SEV-1 incidents
- [ ] Fewer than 3 SEV-2 incidents (all resolved)
- [ ] Error rate < 1% over 24h rolling window
- [ ] P95 latency < 2s
- [ ] Audit chain intact
- [ ] User satisfaction: no blocking workflow issues
- [ ] Evidence bundle v2 passes all sections
