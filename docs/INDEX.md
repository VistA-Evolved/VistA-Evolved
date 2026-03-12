# VistA-Evolved Documentation Index

> **Single curated entry point for all documentation.**
> See `docs/POLICY.md` for documentation rules.

---

## Quick Links

### Getting Started

- [AGENTS.md](../AGENTS.md) -- Agent & developer onboarding (credentials, architecture, gotchas)
- [README.md](../README.md) -- Project overview
- [CONTRIBUTING.md](../CONTRIBUTING.md) -- Contribution guidelines

### Policy & Governance

- [docs/POLICY.md](POLICY.md) -- Documentation policy (allowed/forbidden roots)
- [docs/governance/PROOF-AND-GOVERNANCE.md](governance/PROOF-AND-GOVERNANCE.md) -- Proof-driven build system: non-negotiable rules, 9-stage build order, required task format
- [docs/canonical/source-of-truth-index.md](canonical/source-of-truth-index.md) -- Which doc governs repo rules, runtime truth, upstream sources, prompts, verification
- [GOVERNANCE.md](../GOVERNANCE.md) -- Root summary: repo as salvage + governed platform; future work follows protocol
- [prompts/00-ORDERING-RULES.md](../prompts/00-ORDERING-RULES.md) -- Prompt naming conventions

### Architecture

- [docs/architecture/](architecture/) -- Architecture specifications
- [docs/architecture/hybrid-saas-runtime-topology.md](architecture/hybrid-saas-runtime-topology.md) -- Cloud SaaS, on-prem, and hybrid runtime model
- [docs/vista/](vista/) -- VistA capability maps and grounding docs
- [docs/vista-alignment/](vista-alignment/) -- RPC coverage maps (CPRS + Vivian + API cross-reference)

### Operational Runbooks

- [docs/runbooks/](runbooks/) -- Step-by-step guides for each phase and subsystem
- [docs/runbooks/production-readiness-handoff.md](runbooks/production-readiness-handoff.md) -- Engineering-team handoff for current runtime truth
- [docs/runbooks/ai-proof-driven-stabilization.md](runbooks/ai-proof-driven-stabilization.md) -- AI remediation loop with mandatory proof steps
- [docs/runbooks/canonical-clinical-journeys.md](runbooks/canonical-clinical-journeys.md) -- Canonical clinician route families and maturity map

### Decisions (ADRs)

- [docs/decisions/](decisions/) -- Architecture Decision Records

### Safety

- [docs/safety/SAFETY_CASE.md](safety/SAFETY_CASE.md) -- Living safety case (hazards, controls, tests, evidence)
- [docs/safety/SAFETY_RELEASE_GATE.md](safety/SAFETY_RELEASE_GATE.md) -- Minimum gates for pilot/prod deploy

### Go-Live & Operations

- [docs/runbooks/go-live.md](runbooks/go-live.md) -- Pre-cutover checklist, cutover steps, rollback procedure
- [docs/runbooks/first-72-hours.md](runbooks/first-72-hours.md) -- Post-go-live monitoring, escalation rules, known failure modes
- [docs/runbooks/pilot-mode.md](runbooks/pilot-mode.md) -- SKU profiles, feature flags, adapter toggles
- [docs/runbooks/evidence-bundle-v2.md](runbooks/evidence-bundle-v2.md) -- Certification evidence bundle v2

### Resilience & GameDay Drills

- [docs/runbooks/gameday-db-down.md](runbooks/gameday-db-down.md) -- Database failure drill
- [docs/runbooks/gameday-vista-down.md](runbooks/gameday-vista-down.md) -- VistA RPC broker failure drill
- [docs/runbooks/gameday-queue-backlog.md](runbooks/gameday-queue-backlog.md) -- Queue backlog drill
- [docs/runbooks/gameday-node-drain.md](runbooks/gameday-node-drain.md) -- Node drain / pod eviction drill

### Security & Compliance

- [docs/security/](security/) -- Security documentation
- [docs/compliance/](compliance/) -- Regulatory compliance

### Bug Tracker

- [docs/BUG-TRACKER.md](BUG-TRACKER.md) -- Comprehensive bug log with root cause analysis

### Revenue Cycle Management

- [docs/rcm/](rcm/) -- RCM architecture, PHI handling, payer guides

### Verification

- Verification outputs are **artifacts**, not documentation.
- They are written to `/artifacts/` (gitignored) and uploaded as CI artifacts.
- Run `scripts/verify-latest.ps1` for the latest phase verifier.
- Run `pnpm qa:runtime-truth` to generate a live runtime truth map at `artifacts/runtime-truth-map/latest.json`.
