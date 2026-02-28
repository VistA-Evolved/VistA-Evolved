# Phase 278 — End-to-End Certification Gates

## User Request
Define structured certification scenarios that cover the critical clinical
pathways (outpatient visit, portal session, imaging study, RCM claim, pharmacy,
lab order). Build a cert runner that executes scenario checklists and produces
a structured pass/fail report.

## Implementation Steps

1. Create `config/certification-scenarios.json`:
   - 12 scenarios covering outpatient, portal, imaging, RCM, pharmacy, lab,
     scheduling, telehealth, nursing, ADT, interop, admin
   - Each scenario: id, name, domain, steps[], expectedOutcome

2. Create `scripts/qa-gates/certification-runner.mjs`:
   - Load scenarios from JSON
   - For each scenario: check that all referenced routes exist in the API
   - Check that all referenced RPCs exist in rpcRegistry
   - Check that all referenced UI pages exist in the web app
   - Produce structured report

3. Create `docs/certification/certification-matrix.md`:
   - Human-readable certification matrix
   - Maps scenarios to regulatory requirements (ONC, HIPAA)

## Verification Steps
- Scenarios JSON is well-formed with 12+ scenarios
- Cert runner executes and produces report
- Report identifies which scenarios are ready vs pending
