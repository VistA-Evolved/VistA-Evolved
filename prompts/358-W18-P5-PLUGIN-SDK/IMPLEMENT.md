# Phase 358 — W18-P5: Backend Plugin SDK

## IMPLEMENT

- Plugin manifest: name, version, permissions, entryPoints, contentHash
- Signing: SHA-256 content hash verification
- Extension points: event consumers, webhook transformers, custom validators
- Isolation: execution timeouts, deny-network-by-default
- Audit: install/uninstall logged to immutable audit
- PG migration v47 for plugin_registry + plugin_audit_log tables
- Routes: /plugins CRUD, /plugins/:id/verify, /plugins/:id/enable, /plugins/:id/disable, /plugins/health

## Files

- apps/api/src/services/plugin-sdk.ts
- apps/api/src/routes/plugin-routes.ts
