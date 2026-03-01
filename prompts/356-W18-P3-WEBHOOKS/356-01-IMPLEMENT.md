# Phase 356 — W18-P3: Webhooks Framework

## IMPLEMENT
- Webhook subscription model: id, tenantId, url, secret, eventFilters, enabled, retryPolicy
- HMAC-SHA256 signing with timestamp + nonce
- Retry/backoff + DLQ
- Test webhook endpoint
- PG migration v45 for webhook_subscription + webhook_delivery_log tables
- Routes: /webhooks CRUD, /webhooks/:id/test, /webhooks/deliveries, /webhooks/health

## Files
- apps/api/src/services/webhook-service.ts
- apps/api/src/routes/webhook-routes.ts
