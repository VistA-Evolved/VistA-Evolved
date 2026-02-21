# Incident Response Runbook — Phase 48

## Overview

This runbook covers incident response procedures for VistA-Evolved API.
It assumes familiarity with the [Observability Runbook](observability.md).

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| SEV-1 | System down, data integrity at risk | Immediate | Audit chain broken, VistA unreachable + CB open |
| SEV-2 | Degraded service, single subsystem | 15 min | Connector CB open, high error rate |
| SEV-3 | Minor degradation, workarounds exist | 1 hour | Slow RPC responses, cache miss spike |
| SEV-4 | Cosmetic, no user impact | Next business day | Log format issue, metric label typo |

## Common Scenarios

### 1. VistA RPC Circuit Breaker Open

**Symptom:** `/ready` returns `ok: false`, `vista_circuit_breaker_state == 1`

**Diagnosis:**
```bash
curl http://127.0.0.1:3001/ready
curl http://127.0.0.1:3001/metrics | grep circuit_breaker
curl http://127.0.0.1:3001/vista/ping
```

**Resolution:**
1. Check VistA container: `docker ps | grep worldvista`
2. If container down: `cd services/vista && docker compose up -d`
3. Wait 15s for port 9430 readiness
4. Reset CB: `curl -X POST http://127.0.0.1:3001/admin/circuit-breaker/reset`
5. Verify: `curl http://127.0.0.1:3001/vista/default-patient-list`

**Escalation:** If VistA container is running but RPC calls fail, check:
- Port 9430 connectivity: `Test-NetConnection -ComputerName 127.0.0.1 -Port 9430`
- RPC broker logs: `docker logs wv --tail 50`

### 2. RCM Connector Circuit Breaker Open

**Symptom:** `rcm_connector_health == 0`, claim submissions failing

**Diagnosis:**
```bash
curl http://127.0.0.1:3001/admin/connector-cbs
```

**Resolution:**
1. Check connector configuration in payer registry
2. Verify payer endpoint reachability
3. Reset CB: `curl -X POST http://127.0.0.1:3001/admin/connector-cb/reset -H "Content-Type: application/json" -d '{"connectorId":"clearinghouse"}'`
4. When `CLAIM_SUBMISSION_ENABLED=false` (default), connector health is informational only

### 3. Audit Chain Integrity Failure

**Symptom:** `/audit/unified/stats` shows `chainValid: false`

**Diagnosis:**
```bash
curl http://127.0.0.1:3001/audit/unified/stats
curl http://127.0.0.1:3001/iam/audit/verify
curl http://127.0.0.1:3001/imaging/audit/verify
curl http://127.0.0.1:3001/rcm/audit/verify
```

**Resolution:**
This is a **SEV-1** event — indicates potential tampering or memory corruption.

1. Export current audit state immediately
2. Check for OOM events: `docker stats`
3. Check for API restarts (in-memory stores reset on restart)
4. If restart was the cause, this is expected -- the chain restarts from genesis
5. If no restart occurred, investigate memory corruption

### 4. High Error Rate

**Symptom:** `rate(vista_errors_total[5m]) > 10`

**Diagnosis:**
```bash
# Check recent errors in structured logs
docker logs vista-api --since 5m | jq 'select(.level == "error")'

# Check which category
curl -s http://127.0.0.1:3001/metrics/prometheus | grep vista_errors_total
```

**Resolution:**
1. Identify error category from metrics
2. If `rpc_timeout`: check VistA load, consider increasing `RPC_CALL_TIMEOUT_MS`
3. If `auth_failure`: check for brute-force attempts, review rate limiter
4. If `connector_error`: see Scenario 2

### 5. Memory Pressure

**Symptom:** `process_resident_memory_bytes` growing, OOM kills

**Diagnosis:**
```bash
curl http://127.0.0.1:3001/metrics | jq '.process'
curl -s http://127.0.0.1:3001/metrics/prometheus | grep process_heap
```

**Resolution:**
1. Check audit store sizes: `curl http://127.0.0.1:3001/audit/unified/stats`
2. Immutable audit: 10K entries max (ring buffer, self-limiting)
3. RCM audit: 20K entries max (FIFO eviction)
4. RPC cache: check `vista_rpc_cache_size`, invalidate if needed:
   ```bash
   curl -X POST http://127.0.0.1:3001/admin/cache/invalidate
   ```

## Log Analysis

### Structured Log Format

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "error",
  "msg": "RPC call failed",
  "requestId": "abc-123",
  "traceId": "0af7651916cd43dd",
  "spanId": "b7ad6b7169203331",
  "rpcName": "ORWPT LIST ALL",
  "error": "Connection timeout"
}
```

### Key Fields for Correlation

| Field | Purpose |
|-------|---------|
| `requestId` | Correlate all log entries for a single HTTP request |
| `traceId` | Link to distributed traces in Jaeger |
| `spanId` | Specific span within the trace |
| `rpcName` | VistA RPC being called |
| `connectorId` | RCM connector identifier |

### Grep Patterns for Common Issues

```bash
# Auth failures
grep '"action":"auth.failed"' logs/immutable-audit.jsonl

# RPC timeouts
grep '"level":"error"' logs/*.log | grep timeout

# Circuit breaker state changes
grep 'circuit.*breaker' logs/*.log
```

### 6. Audit Chain Integrity Failure (Phase 62)

**Symptom:** `/iam/audit/verify` or `/imaging/audit/verify` or `/rcm/audit/verify` returns `{ valid: false }`

**Diagnosis:**
```bash
curl -s http://127.0.0.1:3001/iam/audit/verify | jq .
curl -s http://127.0.0.1:3001/imaging/audit/verify | jq .
curl -s http://127.0.0.1:3001/rcm/audit/verify | jq .
# File-based verification
npx tsx scripts/security/verify-audit-chain.ts --file logs/immutable-audit.jsonl
```

**Resolution:**
- Memory chain reset after API restart is **expected** -- file chain is authoritative
- If JSONL file chain is broken: preserve file as evidence, investigate, report
- See `docs/runbooks/audit-integrity.md` for full procedures

**If tampering suspected (SEV-1):**
1. Preserve the broken JSONL file immediately
2. Do NOT delete or repair -- it is evidence
3. Compare with most recent backup
4. Check filesystem access logs
5. Report to compliance officer per HIPAA breach procedures
6. Restart API to begin new chain, document the gap

## Post-Incident

1. **Document:** Create incident report with timeline, root cause, resolution
2. **Update BUG-TRACKER.md:** Add new bug entry if a software defect was found
3. **Review metrics:** Confirm metrics captured the incident for future alerting
4. **Update this runbook:** If the scenario wasn't covered, add it
