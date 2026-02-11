# Playbook Overview — What we are building

VistA Evolved is:
- apps/web: Next.js browser UI
- apps/api: Fastify API
- services/vista: Docker VistA sandbox (WorldVistA image)
- API integrates to VistA via RPC Broker (XWB) on port 9430

Key deliverables by phase:
- Phase 1: Web + API scaffolds run locally
- Phase 2: Docker sandbox runs and 9430 is reachable
- Phase 3: /vista/ping verifies connectivity
- Phase 4A: /vista/default-patient-list returns real VistA data via RPC Broker
- Phase 4B: /vista/patient-search?q= returns real matches

Required repository artifacts:
- scripts/verify-phase1-to-phase4a.ps1 (or verify-phase1-to-phase4b.ps1)
- docs/runbooks/ for each phase
- apps/api/.env.example committed, apps/api/.env.local untracked
- AGENTS.md for onboarding and “hard-won fixes”
