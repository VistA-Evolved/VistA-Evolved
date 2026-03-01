# ADR: Cost Attribution Strategy

**Status:** Accepted
**Date:** 2026-03-01
**Decision Makers:** Platform Engineering
**Phase:** W15-P1 (327)

## Context

As VistA-Evolved moves to multi-tenant SaaS with per-region infrastructure,
the platform needs per-tenant cost visibility for:
- Pricing accuracy (cost-plus or margin-based pricing)
- Budget alerting (runaway tenants, unexpected spikes)
- Capacity planning (predict infrastructure needs per growth)
- Tenant self-service (usage transparency)

## Options Considered

### Option A: OpenCost Integration (CHOSEN)

Deploy OpenCost alongside Prometheus to provide Kubernetes-native cost
allocation by namespace/label/pod.

**Pros:**
- CNCF project, active community
- Native K8s integration (reads pod resource usage from kubelet)
- Correlates with cloud pricing APIs (AWS, GCP, Azure)
- Label-based allocation maps directly to tenant namespaces
- REST API for programmatic access

**Cons:**
- Requires Prometheus (already deployed, Phase 36)
- K8s-specific (non-K8s resources need supplementary tracking)
- Cloud pricing API access may require IAM setup

### Option B: Custom Metrics Pipeline

Build a custom cost pipeline using Prometheus resource metrics + cloud
billing APIs + a purpose-built aggregator.

**Pros:**
- Full control over cost model
- Can include non-K8s costs (VistA instances, blob storage, network)

**Cons:**
- Significant build effort
- Duplicates what OpenCost provides for K8s workloads
- Maintenance burden

### Option C: Cloud Provider Native (AWS Cost Explorer / GCP Billing)

Use cloud provider cost tools with resource tagging.

**Pros:**
- Accurate cloud costs
- No additional tooling

**Cons:**
- Vendor lock-in
- Tag propagation is fragile (missed tags = unallocated costs)
- Limited to cloud costs (no insight into application-level usage)

## Decision

**Option A: OpenCost Integration** for K8s workload costs, with a
supplementary cost ingestion layer for non-K8s resources (VistA instances,
blob storage, network egress). The supplementary layer uses the same
`tenant_cost_daily` schema so all costs aggregate uniformly.

## Cost Model

### K8s Workload Costs (via OpenCost)
- CPU cost per tenant (request-based + usage-based)
- Memory cost per tenant
- Persistent volume cost per tenant
- Network cost per tenant (ingress + egress)

### Non-K8s Costs (via supplementary ingestion)
- VistA instance cost (fixed per instance, allocated to tenant)
- Blob storage cost (per tenant backup/audit volume)
- Cross-region replication bandwidth
- Managed database cost (allocated proportionally by tenant data size)

### Budget Tiers

| Plan Tier | Monthly Budget | Alert Threshold | Hard Limit |
|-----------|---------------|-----------------|------------|
| Starter | $500 | 80% | 120% (notify only) |
| Professional | $2,000 | 80% | 150% (notify only) |
| Enterprise | $10,000 | 80% | 200% (notify only) |
| Custom | Configurable | Configurable | Configurable |

Hard limits are notify-only. We do not auto-throttle tenants for cost
overruns. Throttling requires manual ops decision.

## Storage Schema

```sql
tenant_cost_daily (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  date DATE NOT NULL,
  region VARCHAR(32) NOT NULL,
  cpu_cost_usd DECIMAL(10,4) DEFAULT 0,
  ram_cost_usd DECIMAL(10,4) DEFAULT 0,
  pv_cost_usd DECIMAL(10,4) DEFAULT 0,
  network_cost_usd DECIMAL(10,4) DEFAULT 0,
  vista_cost_usd DECIMAL(10,4) DEFAULT 0,
  storage_cost_usd DECIMAL(10,4) DEFAULT 0,
  other_cost_usd DECIMAL(10,4) DEFAULT 0,
  total_cost_usd DECIMAL(12,4) GENERATED ALWAYS AS (
    cpu_cost_usd + ram_cost_usd + pv_cost_usd + network_cost_usd +
    vista_cost_usd + storage_cost_usd + other_cost_usd
  ) STORED,
  source VARCHAR(32) NOT NULL, -- 'opencost', 'manual', 'cloud-billing'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, date, region, source)
)
```

## Operational Risks

- **OpenCost data staleness:** Metrics lag ~5min. Acceptable for daily rollup.
- **Cloud pricing API changes:** Pin pricing API version; alert on schema changes.
- **Missing labels:** Unallocated costs go to a "shared/platform" bucket.
  Alert if unallocated exceeds 20% of total.
- **Cost spike false positives:** Use 7-day rolling average as baseline for
  anomaly detection, not instantaneous comparison.

## Data Residency Constraints

- Cost data is NOT PHI. No patient data in cost tables.
- Cost data can be aggregated cross-region in the primary control plane DB.
- Tenant identifiers in cost data are opaque IDs, not PHI.

## Rollback Plan

1. Disable OpenCost Helm release (costs stop being collected)
2. Cost ingestion job logs warning and skips
3. Historical cost data remains in `tenant_cost_daily` (no data loss)
4. UI shows "cost data unavailable" state
5. Budget alerts stop firing (acceptable during rollback)
