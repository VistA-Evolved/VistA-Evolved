# ADR-W23-CONSENT-POU

## Status
Accepted

## Context
Wave 23 requires a consent management and Purpose of Use (POU) enforcement
engine to support cross-organizational health information exchange. Different
jurisdictions mandate varying consent models (opt-in, opt-out, emergency
override) and POU classification schemes.

## Decision
Implement an in-memory consent directive store with POU-based access evaluation:
- 9 standard Purpose of Use codes (TREAT, HPAYMT, HOPERAT, PUBHLTH, RESEARCH,
  ETREAT, PATRQT, SYSADMIN, HMARKT)
- ETREAT (emergency treatment) always permits access regardless of directives
- Disclosure logging for all consent evaluation events
- Provision-based matching: actor, purpose, security label
- Default-permit when no matching provisions exist

## Consequences
- Emergency treatment access cannot be blocked by patient consent directives
- All access evaluations are logged as disclosures for audit trail
- In-memory storage resets on API restart (consistent with W23 patterns)
- Future: integrate with FHIR Consent resources and XDS.b BPPC profiles
