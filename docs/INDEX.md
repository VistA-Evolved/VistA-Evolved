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
- [prompts/00-ORDERING-RULES.md](../prompts/00-ORDERING-RULES.md) -- Prompt naming conventions

### Architecture

- [docs/architecture/](architecture/) -- Architecture specifications
- [docs/vista/](vista/) -- VistA capability maps and grounding docs
- [docs/vista-alignment/](vista-alignment/) -- RPC coverage maps (CPRS + Vivian + API cross-reference)

### Operational Runbooks

- [docs/runbooks/](runbooks/) -- Step-by-step guides for each phase and subsystem

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
