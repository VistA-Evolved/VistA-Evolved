# Phase 360 — W18-P7: Plugin Marketplace + Install/Approval Flow

## IMPLEMENT
- Marketplace registry: list plugins, version info, permissions, approval status
- Approval workflow: submitted -> under_review -> approved/rejected
- Install/uninstall with audit trail
- Reversible operations
- PG migration v48 for marketplace_listing + marketplace_approval tables
- Routes: /marketplace/listings, /marketplace/:id/approve, /marketplace/:id/install, /marketplace/:id/uninstall, /marketplace/health

## Files
- apps/api/src/services/plugin-marketplace-service.ts
- apps/api/src/routes/marketplace-routes.ts
