# Phase 176 -- Tenant RLS Enforcement

## Implementation Steps
1. Enable FORCE ROW LEVEL SECURITY on all tenant-scoped tables
2. Create RLS policies scoped to app.current_tenant_id
3. Set tenant context via SET LOCAL in transaction scope
4. Verify pooled connections cannot leak tenant data

## Files Touched
- apps/api/src/platform/pg/pg-migrate.ts
- apps/api/src/platform/pg/tenant-context.ts

## Source
- Derived from wave playbook decomposition (Q213-Q215)
- Original phase specification in wave mega-document
- Enriched by Q219 audit to meet quality floor

## Dependencies
- Requires completion of prior phases in the wave sequence
- See wave playbook for cross-phase dependencies
