# Phase 329 — W15-P3: Global Routing (VERIFY)

## Verification Gates

| # | Gate | Pass Criteria |
|---|------|---------------|
| 1 | tsc --noEmit | 0 errors |
| 2 | Service file | global-routing.ts exists |
| 3 | Routes file | global-routing-routes.ts exists |
| 4 | AUTH_RULES | /platform/routing/ with admin auth |
| 5 | Route registration | globalRoutingRoutes imported + registered |
| 6 | Tenant resolution subdomain | <tenant>.api.example.com extracts tenant |
| 7 | Tenant resolution path | /t/<tenant>/... extracts tenant |
| 8 | Tenant resolution header | X-Tenant-Id header extracts tenant |
| 9 | Ingress CRUD | register, list, get, health update |
| 10 | DNS CRUD | create, list, get, update target |
| 11 | Failover lifecycle | initiate, complete with DNS update |
| 12 | Store: dns-records | in STORE_INVENTORY |
| 13 | Store: regional-ingresses | in STORE_INVENTORY |
| 14 | Store: failover-events | in STORE_INVENTORY |
| 15 | Store: routing-audit | in STORE_INVENTORY |
| 16 | No PHI | No patient data in routing types |

## Result
- ALL 16 GATES: PASS
- tsc --noEmit: 0 errors
