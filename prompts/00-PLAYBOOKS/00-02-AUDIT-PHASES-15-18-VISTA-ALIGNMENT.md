# Prompt: Audit Phases 15–18 Against Real VistA/CPRS

## User Request

Audit Phases 15–18 of VistA-Evolved against real VistA/CPRS to categorize every feature as REAL VISTA, CPRS ANALOG, VISTA EXTENSION, or INVENTED.

## Implementation Steps

1. Read all source files for Phases 15–18
2. Identify every discrete feature in each phase
3. Cross-reference each feature against real VistA namespaces (XUS*, MAG*, OR*, RA*, etc.), CPRS desktop behavior, and standard VistA ecosystem patterns
4. Produce a categorized audit

## Verification Steps

- Manual review of classifications against VistA technical documentation

## Files Inspected

- apps/api/src/middleware/security.ts
- apps/api/src/lib/audit.ts
- apps/api/src/lib/logger.ts
- apps/api/src/lib/rpc-resilience.ts
- apps/api/src/config/server-config.ts
- apps/api/src/config/tenant-config.ts
- apps/api/src/config/integration-registry.ts
- apps/api/src/auth/session-store.ts
- apps/api/src/routes/admin.ts
- apps/api/src/routes/interop.ts
- apps/api/src/routes/imaging.ts
- apps/api/src/services/imaging-service.ts
- apps/api/src/index.ts
