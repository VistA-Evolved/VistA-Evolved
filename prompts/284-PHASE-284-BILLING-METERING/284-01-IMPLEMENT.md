# Phase 284 - IMPLEMENT: SaaS Billing / Metering

## Objective

Provider-agnostic billing facade with mock (dev) and Lago (self-hosted OSS) adapters, in-memory metering pipeline, admin UI, and store-policy registration.

## Implementation Steps

### 1. BillingProvider Interface (`apps/api/src/billing/types.ts`)

- Define Plan, Subscription, MeteringRecord, Invoice, UsageSummary types
- BillingProvider interface: listPlans, getPlan, createSubscription, getSubscription, cancelSubscription, reportUsage, getUsage, getInvoices, getCurrentInvoice, healthCheck
- BillingProviderType = "mock" | "lago"
- Provider registry: setBillingProvider / getBillingProvider
- MeterEvent union: api_call, rpc_call, physician_active, patient_record_access, storage_mb, fhir_request, hl7_message, report_generated
- BillingWebhookEvent + BillingWebhookPayload types

### 2. MockBillingProvider (`apps/api/src/billing/mock-provider.ts`)

- 4 built-in plans: free ($0), starter ($299), professional ($999), enterprise ($4999)
- In-memory Map stores for subscriptions and usage counters
- Full BillingProvider implementation
- resetMockBillingStores() for test cleanup

### 3. LagoBillingProvider (`apps/api/src/billing/lago-provider.ts`)

- Lago REST API v1 adapter using Node.js fetch
- LAGO_API_URL + LAGO_API_KEY env vars
- lagoFetch helper with AbortSignal.timeout(15s)
- Mappers: mapLagoPlan, mapLagoSubscription, mapLagoInvoice

### 4. Metering Pipeline (`apps/api/src/billing/metering.ts`)

- In-memory counter store per tenant per event type
- incrementMeter() - synchronous hot-path
- getMeterSnapshot() / flushMeters() - async flush to billing provider
- startMeteringFlush() / stopMeteringFlush() - interval timer management
- METERING_FLUSH_INTERVAL_MS env var (default 60s)
- MAX_TENANTS = 10000 guard

### 5. Barrel Export + Init (`apps/api/src/billing/index.ts`)

- initBillingProvider() factory reads BILLING_PROVIDER env var
- Re-exports all types and provider classes

### 6. REST Endpoints (`apps/api/src/billing/billing-routes.ts`)

- GET /admin/billing/plans - list all plans
- GET /admin/billing/plans/:planId - get single plan
- GET /admin/billing/subscriptions/:tenantId - get subscription
- POST /admin/billing/subscriptions - create subscription
- PUT /admin/billing/subscriptions/:tenantId - update subscription
- DELETE /admin/billing/subscriptions/:tenantId - cancel subscription
- GET /admin/billing/usage/:tenantId - get usage summary
- POST /admin/billing/usage/flush - trigger metering flush
- GET /admin/billing/invoices/:tenantId - list invoices
- GET /admin/billing/invoices/:tenantId/current - current invoice
- GET /admin/billing/health - provider health check

### 7. Route Registration (`apps/api/src/server/register-routes.ts`)

- Import billingRoutes
- Register after admin routes

### 8. Store Policy (`apps/api/src/platform/store-policy.ts`)

- billing-subscriptions (cache, in_memory_only, billing domain)
- billing-usage-counters (cache, in_memory_only, billing domain)
- metering-counters (cache, in_memory_only, billing domain)

### 9. Env Vars (`apps/api/.env.example`)

- BILLING_PROVIDER=mock
- LAGO_API_URL=http://localhost:3000
- LAGO_API_KEY=
- METERING_FLUSH_INTERVAL_MS=60000

### 10. Admin UI (`apps/web/src/app/cprs/admin/billing/page.tsx`)

- 4 tabs: Plans, Subscription, Usage, Health
- Plans: card grid with tier badges, pricing, subscribe buttons
- Subscription: status display, cancel button
- Usage: counter table per meter event
- Health: provider health check display

## Files Touched

- `apps/api/src/billing/types.ts` (NEW)
- `apps/api/src/billing/mock-provider.ts` (NEW)
- `apps/api/src/billing/lago-provider.ts` (NEW)
- `apps/api/src/billing/metering.ts` (NEW)
- `apps/api/src/billing/index.ts` (NEW)
- `apps/api/src/billing/billing-routes.ts` (NEW)
- `apps/api/src/server/register-routes.ts` (MODIFIED)
- `apps/api/src/platform/store-policy.ts` (MODIFIED)
- `apps/api/.env.example` (MODIFIED)
- `apps/web/src/app/cprs/admin/billing/page.tsx` (NEW)
