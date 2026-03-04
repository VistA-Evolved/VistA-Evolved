# ADR: OSS Billing Integration (Wave 10)

**Status:** Accepted
**Date:** 2026-03-01
**Phase:** 284 (Wave 10 P5)

## Context

VistA-Evolved needs SaaS billing/metering to support multi-tenant commercial
deployments. Current state:

- **RCM domain** (Phase 38+): Full claim/payer/remittance lifecycle — but this is
  _patient billing_ (revenue cycle), not _SaaS subscription billing_.
- **ADR-metering-choice.md** (Phase 238): Accepted decision to extend analytics-store
  with per-tenant metering counters. Not yet implemented.
- **Tenant lifecycle** (Phase 17A/275): Tenant CRUD via `tenant-config.ts` with
  PG write-through. Module entitlements via `tenant_module` table with `plan_tier`.
- **No subscription management**: No recurring billing, plan enforcement, usage
  invoicing, or webhook-driven status changes.

## Options Considered

| Option                                 | License         | Pros                                                            | Cons                                                    |
| -------------------------------------- | --------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| **Lago** (self-hosted)                 | AGPLv3          | OSS, real-time events, plan modeling, usage metering, invoicing | AGPLv3 affects distribution, heavy Ruby stack           |
| **Stripe Billing**                     | Proprietary API | Best integrations, battle-tested                                | Vendor lock-in, per-transaction cost, requires internet |
| **Kill Bill**                          | Apache-2.0      | Java, mature subscription engine                                | Heavy JVM ops, overkill for initial scale               |
| **Custom in-process**                  | N/A             | Zero deps, full control                                         | Must build invoicing, plan enforcement, retry logic     |
| **Provider-agnostic interface + mock** | N/A             | Decoupled, swap-ready                                           | Still needs at least one real adapter                   |

## Decision

**Create a provider-agnostic `BillingProvider` interface with:**

1. A **mock adapter** for dev/test (default)
2. A **Lago adapter** as the first real integration
3. The interface is swap-ready for Stripe, Kill Bill, or custom

### Why Lago as default OSS choice

- Self-hosted, no vendor dependency for air-gapped healthcare installs
- Real-time usage events match our metering architecture
- Plan modeling (per-physician, usage add-ons) aligns with healthcare SaaS pricing
- Webhook-based event system integrates well with Fastify

### AGPLv3 License Note

Lago server is AGPLv3 — it runs as a separate service (not linked into our code).
Our adapter communicates via HTTP API. This does NOT trigger AGPLv3 copyleft for
VistA-Evolved's Apache-2.0 codebase. The Lago container is optional and not
required for core VistA-Evolved functionality.

## Integration Plan

1. Define `BillingProvider` interface in `apps/api/src/billing/types.ts`
2. Implement `MockBillingProvider` that returns canned responses
3. Implement `LagoBillingProvider` that calls Lago REST API
4. Add `BILLING_PROVIDER=mock|lago` env var for adapter selection
5. Wire subscription status into tenant lifecycle: `active` / `past_due` / `suspended`
6. Add metering counters using existing analytics-store extension pattern
7. Add Lago to `docker-compose.prod.yml` under `profiles: [billing]`

## Rollback Plan

- Set `BILLING_PROVIDER=mock` to disable all external billing
- Mock adapter returns `{ ok: true }` for all operations — no tenant disruption
- Remove Lago container from compose — no code changes needed
- Billing enforcement middleware has a bypass when mock provider is active

## Security / PHI Notes

- Billing data must NOT contain patient information
- Tenant ID is the billing dimension (not patient, not user)
- Lago API calls use service-to-service keys, never session cookies
- Invoice data contains plan names and quantities only
