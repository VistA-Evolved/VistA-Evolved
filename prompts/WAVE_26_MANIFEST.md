# Wave 26 Manifest -- Prompts Integrity Reset + VistA Runtime Baseline

> Fix remaining prompt drift (shadow folders, collisions), then characterize
> VistA runtime-layer options and identify safe-harbor RPC candidates.

## Phase Map

| Wave Phase | Resolved ID | Title | Prompt Folder | Status |
|------------|-------------|-------|---------------|--------|
| W26-P1 | 423 | Prompts Drift Repair + Lint Hardening | `423-PHASE-423-PROMPTS-REPAIR` | Verified |
| W26-P2 | 424 | VistA Runtime Strategy + Baseline Matrix | `424-PHASE-424-VISTA-RUNTIME-STRATEGY` | Verified |
| W26-P3 | 425 | Container-Probe Script + Capability Snapshot | `425-PHASE-425-CONTAINER-PROBE` | Verified |
| W26-P4 | 426 | RPC Safe-Harbor List v2 | `426-PHASE-426-RPC-SAFE-HARBOR-V2` | Verified |
| W26-P5 | 427 | Write-Back Feasibility Report | `427-PHASE-427-WRITEBACK-FEASIBILITY` | Verified |
| W26-P6 | 428 | Adapter Health Dashboard Panel | `428-PHASE-428-ADAPTER-HEALTH-PANEL` | Verified |
| W26-P7 | 429 | Runtime-Mode Integration Tests | `429-PHASE-429-RUNTIME-MODE-TESTS` | Verified |
| W26-P8 | 430 | W26 Integrity Audit + Evidence Bundle | `430-PHASE-430-W26-INTEGRITY-AUDIT` | Verified |

## Scope

Wave 26 is a **foundation wave** that:
1. Completes prompt-system hygiene started in W25
2. Documents VistA runtime options (WorldVistA Docker, VistA-M repo, Vetera)
3. Probes the running container for installed RPCs, globals, and file availability
4. Produces a safe-harbor RPC list for write-back candidates
5. Creates a feasibility report for inpatient/pharmacy/lab write-back (W27 prep)
6. Adds adapter health visibility to the admin dashboard
7. Integrates runtime-mode awareness into the test suite
8. Runs an integrity audit encompassing all W26 changes

## Prerequisites
- Wave 25 completed (Phases 418-422)
- WorldVistA Docker sandbox running (port 9430)
- API server running with valid `.env.local`

## Phase Range
- Reserved: 423-430 (8 phases)
- See `docs/qa/prompt-phase-range-reservations.json`
