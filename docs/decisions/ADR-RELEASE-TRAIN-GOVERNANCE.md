# ADR: Release Train Governance

## Status
Accepted

## Context
Production deployments need structured change management to minimize risk.
Ad-hoc deployments lead to inconsistent rollback procedures and missed
stakeholder notifications.

## Decision
We implement a **release train model** with:
- **Change windows**: Scheduled maintenance periods with advance notification
- **Approval workflow**: Admin-approval required before deployment
- **Canary deployment**: Optional canary phase before full promotion
- **Rollback automation**: One-command rollback with automatic notification
- **Comms templates**: Standardized maintenance and incident notifications

All release events are recorded in an in-memory store (with PG migration
target) and surfaced through admin API endpoints.

## Consequences
- Deployments follow a predictable cadence
- Stakeholders receive advance notice of maintenance
- Rollback is always available and tested
- Release history is auditable
