# Phase 157 — Audit JSONL Shipping to Object Store (VERIFY)

## Prerequisites
- API server running
- MinIO container running (or AUDIT_SHIP_ENABLED=false for dry-run)
- Admin session cookie

## Verification Gates
1. TypeScript compiles clean
2. PG migration v22 applies (audit_ship_offset + audit_ship_manifest tables)
3. SQLite migration applies (same tables)
4. GET /audit/shipping/status returns valid response (admin only)
5. POST /audit/shipping/trigger returns accepted (admin only)
6. GET /audit/shipping/manifests returns array
7. Shipper job starts/stops with server lifecycle
8. No PHI in shipped JSONL chunks
9. Manifests contain SHA-256 hashes
10. Posture gate reports shipping status
11. Store policy entry exists
12. Env vars documented in .env.example
13. Runbook exists
14. Gauntlet RC passes
15. No console.log added
