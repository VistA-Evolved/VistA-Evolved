# Incident Response Runbook

> Covers alerting, triage, escalation, mitigation, and post-incident review.

## Severity Levels

| Severity  | Description                      | Response Time     | Escalation                      |
| --------- | -------------------------------- | ----------------- | ------------------------------- |
| **SEV-1** | Total outage, data loss risk     | 15 min            | Page on-call + engineering lead |
| **SEV-2** | Partial degradation (>5% errors) | 30 min            | Page on-call                    |
| **SEV-3** | Minor degradation (<5% errors)   | 2 hours           | Slack notification              |
| **SEV-4** | Cosmetic / non-urgent            | Next business day | Ticket                          |

## Alert Sources

| Source              | Location                                    | Alerts                          |
| ------------------- | ------------------------------------------- | ------------------------------- |
| Prometheus          | `infra/observability/slo/alerts.rules.yaml` | SLO burn-rate, pod health, disk |
| API circuit breaker | `/ready` returns `ok: false`                | K8s readiness probe fails       |
| ArgoCD              | Application sync status                     | Degraded / OutOfSync            |
| GitHub Actions      | `cd-deploy.yml`, `dr-nightly.yml`           | Build/deploy/DR failures        |

## Triage Checklist

### 1. Identify Scope

```powershell
# Check overall health
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:3001/ready

# Check VistA connectivity
curl http://127.0.0.1:3001/vista/ping

# Check circuit breaker state
curl http://127.0.0.1:3001/posture/performance
```

### 2. Check Pod Status

```powershell
kubectl get pods -n ve-tenant-demo --sort-by=.status.startTime
kubectl describe pod <name> -n ve-tenant-demo
kubectl logs <name> -n ve-tenant-demo --tail=200
```

### 3. Check ArgoCD Sync

```powershell
kubectl get applications -n argocd
# Look for: Synced/Healthy vs OutOfSync/Degraded
```

### 4. Check Prometheus Metrics

```
# Error rate
sum(rate(http_requests_total{code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# p95 latency
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# Circuit breaker state
rpc_circuit_breaker_state
```

## Mitigation Actions

### Rollback (most common)

```powershell
# Automatic rollback to last-known-good
.\infra\scripts\rollback-release.ps1 -Environment prod

# Verify rollback
kubectl get pods -n ve-tenant-demo --watch
```

### VistA Broker Down

```powershell
# Restart VistA container
docker restart wv

# Wait for ready
Start-Sleep -Seconds 20
curl http://127.0.0.1:3001/vista/ping
```

### Database Issues

```powershell
# Check PG connections
psql $PLATFORM_PG_URL -c "SELECT count(*) FROM pg_stat_activity;"

# If corrupted, restore from backup
node scripts/backup-restore.mjs restore --target pg --yes
```

### Pod Crash Loop

```powershell
# Get crash reason
kubectl logs <pod> -n <ns> --previous --tail=100

# Common: OOM (increase memory limit)
# Common: Config error (check ConfigMap)
# Common: VistA unreachable (check network policy)
```

## Incident Artifact Collection

```powershell
# Collect all incident evidence
.\infra\scripts\release-failure-pack.ps1 -Environment prod

# Output includes:
# - Rendered manifests
# - Pod logs (tail 500)
# - Canary check results
# - K8s events
# - Git diff (HEAD~3)
# - incident-summary.json
```

## Post-Incident Review

### Within 24 Hours

1. Create incident ticket with:
   - Timeline (detection -> mitigation -> resolution)
   - Root cause
   - Impact (users affected, duration)
   - Artifacts path

2. Update bug tracker: `docs/BUG-TRACKER.md`

3. If new SLO gap identified, update:
   - `infra/observability/slo/slo-spec.yaml`
   - `infra/observability/slo/alerts.rules.yaml`

### Within 1 Week

1. Blameless post-mortem document
2. Action items with owners and due dates
3. Verify preventive measures are in place
4. Update this runbook if procedures changed

## Communication Templates

### SEV-1 Initial

```
INCIDENT: [Brief description]
SEVERITY: SEV-1
STATUS: Investigating
IMPACT: [Scope of impact]
NEXT UPDATE: [Time]
```

### Resolution

```
INCIDENT: [Brief description]
SEVERITY: SEV-1
STATUS: Resolved
ROOT CAUSE: [One-liner]
DURATION: [Start - End]
FOLLOW-UP: Post-mortem scheduled for [date]
```

## Key Contacts

| Role             | Escalation Path                     |
| ---------------- | ----------------------------------- |
| On-call engineer | PagerDuty rotation                  |
| Engineering lead | Slack #ve-incidents                 |
| Security         | Slack #ve-security (for PHI/breach) |
| Operations       | Slack #ve-ops                       |
