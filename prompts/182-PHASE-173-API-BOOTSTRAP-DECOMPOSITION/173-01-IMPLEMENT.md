# Phase 173 -- API Bootstrap Decomposition

## Implementation Steps
1. Decompose index.ts god-file into thin entrypoint
2. Create server/ directory with register-plugins.ts, register-routes.ts, lifecycle.ts
3. Extract all plugin registration (CORS, cookie, rate-limit, CSRF) into register-plugins
4. Extract all route registration into register-routes with domain groupings
5. Extract graceful shutdown, SIGINT/SIGTERM handlers into lifecycle.ts
6. Verify startup sequence: plugins -> routes -> listen

## Files Touched
- apps/api/src/index.ts
- apps/api/src/server/register-plugins.ts
- apps/api/src/server/register-routes.ts
- apps/api/src/server/lifecycle.ts

## Source
- Derived from wave playbook decomposition (Q213-Q215)
- Original phase specification in wave mega-document
