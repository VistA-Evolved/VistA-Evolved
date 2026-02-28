# Phase 190 -- Connection Pool Tuning

## Implementation Steps
1. Configure PG pool size based on concurrency needs
2. Add idle timeout configuration
3. Configure max connections per tenant
4. Add pool metrics to /metrics/prometheus

## Files Touched
- apps/api/src/platform/pg/

## Source
- Derived from wave playbook decomposition (Q213-Q215)
- Original phase specification in wave mega-document
- Enriched by Q219 audit to meet quality floor

## Dependencies
- Requires completion of prior phases in the wave sequence
- See wave playbook for cross-phase dependencies
