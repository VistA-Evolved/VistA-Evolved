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

### Operational Runbooks
- [docs/runbooks/](runbooks/) -- Step-by-step guides for each phase and subsystem

### Decisions (ADRs)
- [docs/decisions/](decisions/) -- Architecture Decision Records

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
