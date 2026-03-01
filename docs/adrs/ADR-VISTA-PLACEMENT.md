# ADR: VistA Instance Placement Strategy

**Status:** Accepted
**Date:** 2026-03-01
**Decision Makers:** Platform Engineering
**Phase:** W15-P1 (327)

## Context

VistA (via WorldVistA Docker or VistA-Evolved distro) is the clinical data
source-of-truth. In a multi-region deployment, each tenant's VistA instance
must be placed in the same region as their data plane DB to avoid cross-region
RPC latency and data residency violations.

## Options Considered

### Option A: VistA Per Tenant Per Region (CHOSEN)

Each tenant gets a dedicated VistA instance in their assigned region. The API
connects to the local VistA via the RPC Broker on a per-tenant basis.

**Pros:**
- Complete isolation between tenants
- Data residency guaranteed (VistA globals stay in-region)
- Independent maintenance windows per tenant
- Aligns with existing `VISTA_HOST`/`VISTA_PORT` env var pattern

**Cons:**
- Resource-intensive (each VistA instance = YottaDB + broker process)
- More instances to manage and monitor
- Routine installations must be coordinated per instance

### Option B: Shared VistA Per Region (Multi-Tenant VistA)

Multiple tenants share one VistA instance per region, with DUZ/institution
separation.

**Pros:**
- Fewer instances to manage
- Lower resource footprint

**Cons:**
- VistA's multi-tenant support is limited and fragile
- Cross-tenant data leakage risk in globals
- Maintenance affects all tenants simultaneously
- Single VistA failure affects all tenants in the region

### Option C: VistA in Primary Region Only (Centralized)

All VistA instances run in one region. Remote regions connect cross-region
for RPC calls.

**Pros:**
- Simplest operations
- Fewest instances

**Cons:**
- Cross-region RPC latency (50-150ms per call)
- Data residency violation (VistA globals contain PHI)
- Single region failure takes down all clinical operations

## Decision

**Option A: VistA Per Tenant Per Region**

Each tenant has a dedicated VistA instance running in their assigned region.
The API server in that region connects to the local VistA instance.

## Instance Management

1. **Provisioning:** When a tenant is placed in a region, a VistA instance is
   provisioned (Docker container or K8s StatefulSet with persistent volume).
2. **Configuration:** The control plane stores per-tenant VistA connection
   parameters in `tenant_vista_config`:
   - `tenant_id, vista_host, vista_port, vista_instance_id, region`
3. **Routine Installation:** `install-vista-routines.ps1` runs per-instance
   after provisioning and after routine updates.
4. **Health Monitoring:** `/vista/ping` per instance, aggregated in ops dashboard.

## DR Posture

- VistA globals are backed up per-instance (YottaDB journal + MUPIP BACKUP)
- DR: restore VistA from backup in DR region + point API swap boundary
- RPO: last backup timestamp (configurable, default 1h)
- RTO: restore time + routine installation + health check (est. 15-30 min)

**VistA DR is NOT automatic.** The swap boundary (Phase 148) provides the
contract: update `VISTA_HOST`/`VISTA_PORT` in the tenant config, verify via
`/vista/swap-boundary`, then resume.

## Replication Constraints

- VistA/YottaDB does not support native cross-region replication
- Options for future consideration:
  - YottaDB journal shipping (untested at scale)
  - Periodic MUPIP EXTRACT + transfer + MUPIP LOAD
  - Application-level replication via RPC writeback (complex)
- Current decision: backup-based DR, not replication-based DR

## Operational Risks

- **Instance sprawl:** Mitigated by Helm chart with resource limits +
  monitoring per instance. Auto-scaling not supported for VistA containers.
- **Routine drift:** Mitigated by `/vista/provision/status` (Phase 155)
  health check per instance. CI gate verifies routine catalog match.
- **YottaDB volume corruption:** Mitigated by persistent volumes with
  scheduled snapshots. `mupip rundown` on restart (AGENTS.md #53).
- **Memory pressure:** VistA containers have fixed memory footprint (typically
  512MB-2GB). Monitor via Prometheus + OTel metrics.

## Data Residency Constraints

- VistA globals contain PHI (patient records, DUZ mappings, orders)
- VistA instance MUST be in the same region as the tenant's data plane DB
- VistA backups MUST be stored in the same region (or an approved DR region)
- Cross-region VistA access is prohibited

## Rollback Plan

1. If per-tenant VistA causes resource issues, consolidate tenants onto
   shared instances within the same region (Option B fallback)
2. Update `tenant_vista_config` to point tenants at shared instance
3. Verify via `/vista/swap-boundary` per tenant
4. Decommission unused individual instances
