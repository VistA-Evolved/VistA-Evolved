# Full Audit + Fix + Verify (Phase 1 → Phase 4B)

Goal:
A new smart agent can audit and repair the repo without breaking anything.

Rules:
- Inventory first
- minimal edits only
- no secrets
- no refactors
- rerun verification after changes

Must ensure:
- verify-phase1-to-phase4a.ps1 passes (and phase4b verify if script exists)
- docker sandbox starts and 9430 reachable
- /health, /vista/ping, /vista/default-patient-list, /vista/patient-search succeed
- runbooks match the real commands
- AGENTS.md and prompts system remain consistent
