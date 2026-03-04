# ADR: GA Readiness Model

## Status

Accepted

## Context

VistA-Evolved needs a structured approach to determine when the platform is
ready for General Availability. Without a formal checklist, readiness is
subjective and dependent on tribal knowledge.

## Decision

We adopt a **gate-based readiness model** with 19 gates covering:

- Infrastructure (TLS, DR, observability)
- Security (policy engine, audit, PHI redaction, OIDC)
- Certification runners (security, interop, department packs, scale)
- Operations (release train, support ops, data rights)
- Documentation (trust center, performance budgets)

Each gate requires **evidence presence** -- a specific file or artifact that
demonstrates the capability exists. The `ga-checklist.ps1` script automates
verification.

## Consequences

- GA readiness is deterministic and repeatable
- New capabilities must register a gate to be included
- Evidence gaps are visible before launch
- Does NOT constitute legal or regulatory certification
