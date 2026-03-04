# Phase 357 — W18-P4: FHIR Subscriptions v1 (rest-hook)

## IMPLEMENT

- Subscription registry: id, tenantId, criteria, channel (rest-hook), endpoint, status
- Delivery through webhook framework
- Event mapping: domain events -> FHIR resource events
- CapabilityStatement reference for subscriptions supported
- PG migration v46 for fhir_subscription table
- Routes: /fhir-subscriptions CRUD, /fhir-subscriptions/:id/status, /fhir-subscriptions/health

## Files

- apps/api/src/services/fhir-subscription-service.ts
- apps/api/src/routes/fhir-subscription-routes.ts
