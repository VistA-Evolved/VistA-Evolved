# Phase 359 — W18-P6: UI Extension Slots

## IMPLEMENT
- Extension slot registry: dashboard tile, patient chart side panel
- Slot manifest: slotId, pluginId, tenantId, component, permissions, enabled
- Tenant policy enforcement: only allowed extensions render
- No cross-tenant data access
- Routes: /ui-extensions/slots, /ui-extensions/register, /ui-extensions/:id/enable, /ui-extensions/health

## Files
- apps/api/src/services/ui-extension-service.ts
- apps/api/src/routes/ui-extension-routes.ts
