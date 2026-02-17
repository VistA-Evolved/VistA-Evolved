# Phase 18 VERIFY — Enterprise Interop + Imaging Platform Integration

## Pass Criteria
1. `scripts/verify-latest.ps1` → all PASS, 0 FAIL, 0 WARN
2. Phase 10→17 regression checks included and passing
3. Integration registry types and CRUD validated
4. Imaging service adapter loads correctly in both configured and unconfigured states
5. Viewer launch enabled/disabled based on configuration
6. RBAC admin-only enforced on all integration config endpoints
7. Audit events fire for integration changes and viewer launches
8. Remote Data Viewer shows configured external sources
9. Device onboarding config model present
10. No TypeScript compile errors in either app

## Areas to Test
- Integration registry API: GET/PUT/DELETE /admin/integrations/registry/*
- Imaging service: GET /vista/imaging/studies, GET /vista/imaging/viewer-url
- Admin console: integration list, status chips, probe, enable/disable, error log
- Remote Data Viewer: external sources from registry
- ReportsPanel: imaging presence indicators
- Audit trail for integration operations
