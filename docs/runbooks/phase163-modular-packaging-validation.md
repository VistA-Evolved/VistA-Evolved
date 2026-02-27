# Phase 163 -- Modular Packaging Validation

## Overview

Phase 163 adds a validation engine that checks module packaging integrity
at runtime via admin API endpoints. Three validation categories:

1. **Dependency Integrity** -- unmet deps, circular references, SKU validity
2. **Boundary Integrity** -- route pattern overlaps, adapter references, regex validity
3. **Coverage Integrity** -- capability-module alignment, store-policy cross-refs

## Architecture

```
apps/api/src/modules/validation/
  types.ts                  -- ValidationIssue, ValidationCategory, ValidationReport
  dependency-validator.ts   -- Dep graph checks, circular detection, SKU validation
  boundary-checker.ts       -- Route overlap, adapter refs, health endpoint declarations
  coverage-validator.ts     -- Capability-module coverage, store-policy cross-ref
  index.ts                  -- Barrel + runAllValidations()

apps/api/src/routes/
  module-validation-routes.ts -- 5 admin endpoints
```

## API Endpoints

All under `/admin/module-validation/` (admin auth required):

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/module-validation/report | Full validation report (all 3 categories) |
| GET | /admin/module-validation/dependencies?tenantId=default | Dependency checks only |
| GET | /admin/module-validation/boundaries | Boundary checks only |
| GET | /admin/module-validation/coverage?tenantId=default | Coverage checks only |
| GET | /admin/module-validation/summary | Pass/fail + counts |

## Validation Codes

### Dependency Integrity
| Code | Severity | Description |
|------|----------|-------------|
| DEP_UNMET | error | Enabled module missing dependency |
| DEP_CIRCULAR | error | Circular dependency chain |
| SKU_INVALID_MODULE | error | SKU references non-existent module |
| SKU_UNKNOWN | error | Active SKU not in profiles |
| ALWAYS_ENABLED_MISSING | error | alwaysEnabled module not in enabled set |
| DEP_DEEP_CHAIN | warning | Dependency chain > 5 levels |
| DEP_OK | info | All dependencies valid |

### Boundary Integrity
| Code | Severity | Description |
|------|----------|-------------|
| ROUTE_INVALID_REGEX | error | Invalid route pattern regex |
| ROUTE_OVERLAP | warning | Two modules' patterns match same paths |
| ADAPTER_UNKNOWN | warning | Module references unregistered adapter |
| HEALTH_MISSING | info | Module has no healthCheckEndpoint |
| ROUTE_NONE | info | Module has no route patterns |
| BOUNDARY_OK | info | All boundaries valid |

### Coverage Integrity
| Code | Severity | Description |
|------|----------|-------------|
| CAP_ORPHAN_MODULE | error | Capability references non-existent module |
| MODULE_NO_CAPS | warning | Module has zero capabilities |
| STORE_NOT_IN_POLICY | warning | Module dataStore not in store-policy |
| CAP_LOW_COVERAGE | warning | Low capabilities-per-module ratio |
| CAP_SUMMARY | info | Capability status counts |
| STORE_UNMATCHED_DOMAIN | info | store-policy domain without matching module |

## Manual Testing

```bash
# Full report
curl http://localhost:3001/admin/module-validation/report -b cookies.txt | jq .

# Quick summary
curl http://localhost:3001/admin/module-validation/summary -b cookies.txt

# Dependencies only
curl http://localhost:3001/admin/module-validation/dependencies -b cookies.txt
```

## Integration with CI

The validation report can be consumed programmatically. A CI gate should:
1. Call `/admin/module-validation/summary`
2. Assert `passed: true`
3. Assert `errorCount: 0`
