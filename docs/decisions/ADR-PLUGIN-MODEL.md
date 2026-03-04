# ADR: Plugin Model

## Status

Accepted

## Context

VistA-Evolved needs an extension mechanism that allows:

- Third-party integrations without forking core
- Safe execution with resource limits
- Audit trail for install/uninstall actions
- Tenant-scoped policies controlling which plugins are allowed
- Both backend (event consumers, validators) and UI (tiles, widgets) extensions

Options considered:

1. **Department Packs only** (Phase 349) -- config packs, not code execution
2. **Dynamic plugins with signing** -- code execution with trust verification
3. **WebAssembly sandboxing** -- strongest isolation but complex
4. **Iframe-only UI plugins** -- simple containment for frontend

## Decision

- **Signed plugin manifests with controlled extension points.**
- Backend plugins:
  - Manifest: name, version, permissions, entry points (event consumers, validators, transformers)
  - Signing: SHA-256 content hash verified at install time
  - Isolation: execution timeouts (default 5s), memory monitoring (where feasible)
  - Network: denied by default unless manifest declares `permissions.network: true`
- UI extensions:
  - Extension slots: dashboard tiles, patient chart side panels
  - Embed strategy: controlled component injection with React portals
  - Tenant policies control which extensions are visible
  - No cross-tenant data access
- Marketplace:
  - Registry of available plugins with version info and permissions
  - Admin approval workflow before installation
  - Audited install/uninstall with reversibility
- Relationship to Department Packs:
  - Packs are configuration bundles (Phase 349) -- no code execution
  - Plugins are executable extensions -- different trust model
  - Both coexist; packs may reference plugins they require

## Consequences

- Plugin signing prevents tampered code from executing.
- Extension points are explicit -- plugins cannot monkey-patch core.
- UI extensions use React portals (not iframes) for performance.
- Future: WebAssembly sandbox for untrusted third-party plugins.
