# ADR: Global Routing Strategy

**Status:** Accepted
**Date:** 2026-03-01
**Decision Makers:** Platform Engineering
**Phase:** W15-P1 (327)

## Context

With tenants placed in different regions, the platform must route incoming
requests to the correct regional cluster. The routing decision depends on
the tenant identifier extracted from the request.

## Options Considered

### Option A: Per-Region Ingress with Global DNS (CHOSEN)

Each region operates its own ingress (Kubernetes Ingress / load balancer).
A global DNS layer (e.g., Route53, Cloudflare, or equivalent) resolves
tenant-specific subdomains to the correct regional ingress IP.

Tenant identification:
- **Subdomain:** `<tenant>.api.example.com` resolves to the correct region
- **Fallback path routing:** `api.example.com/t/<tenant>/...` for environments
  without wildcard DNS

**Pros:**
- Simple, battle-tested DNS-based routing
- Each region is independently deployable
- TLS termination at regional ingress (no cross-region TLS hop)
- Failover by updating DNS records (controlled TTL)

**Cons:**
- DNS propagation delay during failover (mitigated by low TTL, e.g., 60s)
- Requires wildcard TLS cert or per-tenant cert management
- New tenants need DNS record provisioning

### Option B: Global Load Balancer with Header-Based Routing

A single global LB inspects request headers (e.g., `X-Tenant-Id`) and routes
to the correct regional backend.

**Pros:**
- Single entry point, simpler DNS
- Instant routing changes (no DNS propagation)

**Cons:**
- Global LB is a single point of failure
- All traffic transits the LB region before reaching the target region
- Header-based routing requires client cooperation

### Option C: Service Mesh with Locality-Aware Routing

A multi-cluster service mesh (e.g., Istio) handles cross-cluster traffic.

**Pros:**
- Automatic locality-aware load balancing
- mTLS between clusters

**Cons:**
- High operational complexity
- Overkill for tenant-level placement (mesh does instance-level)

## Decision

**Option A: Per-Region Ingress with Global DNS**

The platform uses DNS-based routing with regional ingress controllers.
Tenant placement determines DNS resolution. Failover is accomplished by
updating DNS records with a controlled TTL (60s default, 10s during incident).

## Routing Model

```
Request: https://<tenant>.api.example.com/vista/ping
  -> DNS resolves to <region-ingress-ip>
  -> Ingress routes to API pod
  -> API extracts tenant from Host header or path
  -> API looks up tenant_db_map for DB routing
```

Fallback (non-wildcard environments):
```
Request: https://api.example.com/t/<tenantSlug>/vista/ping
  -> Global ingress routes based on path prefix
  -> Middleware extracts tenantSlug, resolves tenant_id
```

## Failover Procedure

1. **Detect:** Healthcheck failure on regional ingress (automated or manual)
2. **Decision:** Ops team or automation decides to fail over
3. **Execute:**
   a. Update DNS record for affected tenant(s) to DR region IP
   b. DR region API picks up tenant via control plane lookup
   c. DR region DB already has replicated data (per ADR-MULTI-REGION-POSTGRES)
4. **Verify:** Run routing verify script against affected tenants
5. **Communicate:** Tenant notification via maintenance comms system

## Operational Risks

- **DNS cache poisoning:** Mitigated by DNSSEC where supported
- **Split-brain during failover:** Mitigated by single-writer DB per region
- **TLS cert expiry:** Automated cert renewal (cert-manager or equivalent)
- **Stale DNS in client caches:** Low TTL + client retry logic

## Data Residency Constraints

- DNS routing ensures requests arrive at the correct region first
- No request body or PHI traverses non-assigned regions
- TLS terminates at the assigned region's ingress

## Rollback Plan

1. Revert DNS records to original region IP
2. Wait for TTL expiry (max 60s)
3. Verify routing with `ops:routing:verify`
4. If DNS change caused issues, fall back to path-based routing temporarily
