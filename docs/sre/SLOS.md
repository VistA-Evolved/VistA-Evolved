# Service Level Objectives (SLOs)

> Phase 416 (W24-P8): Post-Go-Live Monitoring + SRE

## Overview
These SLOs define the reliability targets for VistA-Evolved pilot deployments.
They form the basis for error budgets and incident response decisions.

---

## SLO Definitions

### SLO-1: API Availability
| Field | Value |
|-------|-------|
| Target | 99.5% (monthly) |
| Measurement | `/health` returns 200 / total probes |
| Window | 30-day rolling |
| Budget | 3.6 hours downtime per month |
| Alerting | Page at 99.0% (burn rate > 2x) |

### SLO-2: Request Latency (p99)
| Field | Value |
|-------|-------|
| Target | p99 < 3,000 ms |
| Measurement | Histogram from Prometheus `http_request_duration_seconds` |
| Window | 1-hour rolling |
| Budget | 1% of requests may exceed 3s |
| Alerting | Page when p99 > 5,000 ms for > 5 min |

### SLO-3: VistA RPC Success Rate
| Field | Value |
|-------|-------|
| Target | 99.0% of RPC calls succeed |
| Measurement | `rpc_calls_total{status="success"}` / `rpc_calls_total` |
| Window | 1-hour rolling |
| Budget | 1% failure rate |
| Alerting | Circuit breaker open = immediate page |

### SLO-4: Error Rate
| Field | Value |
|-------|-------|
| Target | < 1% 5xx responses |
| Measurement | `http_responses_total{status=~"5.."}` / `http_responses_total` |
| Window | 15-min rolling |
| Budget | 1% |
| Alerting | Page at > 2% for > 5 min |

### SLO-5: Login Success Rate
| Field | Value |
|-------|-------|
| Target | 99.5% |
| Measurement | Successful logins / total login attempts |
| Window | 1-hour rolling |
| Budget | 0.5% failure rate |
| Alerting | Page at > 2% failure rate |

### SLO-6: Data Plane Integrity
| Field | Value |
|-------|-------|
| Target | 100% of posture gates pass |
| Measurement | `/posture/data-plane` returns all gates pass |
| Window | Continuous |
| Budget | 0 (any failure = immediate investigation) |
| Alerting | Any gate failure = page |

---

## SLO Summary Table

| SLO | Target | Budget | Window | Severity |
|-----|--------|--------|--------|----------|
| SLO-1 Availability | 99.5% | 3.6h/month | 30d | P1 |
| SLO-2 Latency | p99 < 3s | 1% | 1h | P2 |
| SLO-3 RPC Success | 99.0% | 1% | 1h | P1 |
| SLO-4 Error Rate | < 1% 5xx | 1% | 15m | P1 |
| SLO-5 Login Success | 99.5% | 0.5% | 1h | P1 |
| SLO-6 Data Plane | 100% | 0 | Continuous | P0 |

---

## Measurement Infrastructure
- Prometheus scrapes `/metrics/prometheus` every 15s
- Jaeger traces for RPC latency breakdown
- OTel Collector strips PHI before storage
- Grafana dashboards (future: production deployment)
