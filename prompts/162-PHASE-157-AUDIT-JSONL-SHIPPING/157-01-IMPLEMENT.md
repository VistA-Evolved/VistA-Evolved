# Phase 157 — Audit JSONL Shipping to Object Store (IMPLEMENT)

## User Request
Close audit gap "append-only but not externally replicated".
Implement an audit shipper that uploads immutable audit JSONL to object storage (MinIO/S3 compatible), with integrity hashes.

## Non-negotiables
- No PHI leaks (audit entries already PHI-redacted by immutable-audit.ts)
- Tenant-aware partitioning (object keys prefixed by tenantId)
- Retryable and idempotent (offset tracked in Postgres)

## Implementation Steps
1. Create S3/MinIO-compatible object store client (zero npm deps, raw HTTP)
2. Create PG migration v22 for `audit_ship_offset` table
3. Create audit shipper service with:
   - Scheduled job (default 5 min interval)
   - Read new JSONL lines since last shipped offset
   - Group by tenant, upload chunk per tenant
   - Generate SHA-256 manifest per upload
   - Track offset + manifest in Postgres
4. Add admin API routes:
   - GET /audit/shipping/status - shipping health
   - POST /audit/shipping/trigger - manual trigger
   - GET /audit/shipping/manifests - list manifests
5. Register store in store-policy.ts
6. Wire start/stop into server startup/shutdown
7. Add posture gate for audit replication
8. Environment variables:
   - AUDIT_SHIP_ENABLED (default false)
   - AUDIT_SHIP_ENDPOINT (MinIO/S3 URL)
   - AUDIT_SHIP_BUCKET (default "vista-evolved-audit")
   - AUDIT_SHIP_ACCESS_KEY / AUDIT_SHIP_SECRET_KEY
   - AUDIT_SHIP_REGION (default "us-east-1")
   - AUDIT_SHIP_INTERVAL_MS (default 300000 = 5 min)
   - AUDIT_SHIP_CHUNK_SIZE (default 1000 lines per upload)
9. Create verification script
10. Create runbook

## Files Touched
- apps/api/src/audit-shipping/s3-client.ts (new)
- apps/api/src/audit-shipping/shipper.ts (new)
- apps/api/src/audit-shipping/manifest.ts (new)
- apps/api/src/audit-shipping/types.ts (new)
- apps/api/src/routes/audit-shipping-routes.ts (new)
- apps/api/src/posture/audit-shipping-posture.ts (new)
- apps/api/src/platform/pg/pg-migrate.ts (add v22)
- apps/api/src/platform/db/migrate.ts (add SQLite table)
- apps/api/src/platform/db/schema.ts (add drizzle schema)
- apps/api/src/platform/store-policy.ts (add store entry)
- apps/api/src/middleware/security.ts (add shutdown + AUTH_RULE)
- apps/api/src/posture/index.ts (add shipping posture)
- apps/api/src/index.ts (wire startup)
- apps/api/.env.example (add env vars)
- scripts/verify-phase157-audit-shipping.ps1 (new)
- docs/runbooks/phase157-audit-shipping.md (new)

## Verification Steps
See 157-99-VERIFY.md
