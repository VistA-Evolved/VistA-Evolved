# Phase 581 — Notes

> Wave 42: Production Remediation | Phase 581

## Why This Phase Exists

Phase 5 of the remediation plan: features that return "integration-pending" need to be either implemented (when RPCs exist) or marked with explicit vistaGrounding so operators know exactly what VistA subsystem to integrate for production.

## Key Decisions

- **PSB package**: Not in WorldVistA Docker; mark as integration-pending with targetRpc.
- **DGPM ADT writes**: Require specific VistA configuration; mark as integration-pending.
- **No fake success**: Never return ok:true when the route is a no-op; always integration-pending with vistaGrounding.

## Deferred Items

- PSB MED LOG implementation — requires VistA BCMA/PSB package.
- DGPM ADT write implementation — requires VistA ADT configuration.
- MD package (Medicine) RPCs — site-specific; may not exist in standard VistA.
