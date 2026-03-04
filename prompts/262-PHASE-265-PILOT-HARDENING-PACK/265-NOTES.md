# Phase 265 -- Notes

## Architecture

- SAT suite is a formalized acceptance testing layer on top of the existing posture/preflight/hardening infrastructure
- 30 scenarios map to real RPCs, infrastructure checks, and security validations
- autoCheckFn names correspond to future runtime executors that delegate to existing systems (circuit breaker stats, RPC capability cache, posture gates)
- Degraded mode tracking is event-driven with automatic mitigation activation
- Evidence export bundles SAT results + degraded mode status with SHA-256 manifest hash

## Degraded Mode Mitigations (8 pre-registered)

1. vista-rpc -> circuit-breaker-open (existing Phase 15B)
2. database -> in-memory-fallback (existing lifecycle.ts pattern)
3. imaging -> proxy-bypass (existing imaging-proxy.ts)
4. hl7-engine -> dlq-buffering (existing Phase 259 DLQ)
5. payer-connector -> connector-circuit-breaker (existing Phase 48)
6. audit-shipping -> local-buffering (existing Phase 157 JSONL)
7. analytics -> aggregation-pause (existing Phase 25 aggregator)
8. oidc -> session-fallback (existing auth-routes.ts)

## Future Work

- Wire autoCheckFn to actual runtime checks (HTTP probes, RPC calls)
- Add PDF evidence report generation
- Integrate SAT results with Notion/JIRA via webhook
- Add trending: compare SAT scores across runs for regression detection
- Wire degraded mode events to OTel span events for observability
