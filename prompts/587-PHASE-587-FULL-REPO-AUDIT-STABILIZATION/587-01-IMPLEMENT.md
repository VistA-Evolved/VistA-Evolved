# Phase 587 - Full Repo Audit Stabilization - IMPLEMENT

## User Request
Perform a full, no-shortcuts repository audit and stabilization pass for VistA-Evolved, including architecture blueprinting, gap analysis, tenant/module/scalability/concurrency risks, VistA MUMPS necessity review, QA/verification integrity, and an enterprise handover package for a development team.

## Implementation Steps
1. Run Docker-first infrastructure checks and confirm `vehu` and `ve-platform-db` are healthy.
2. Start API with `.env.local` and confirm startup and health endpoints.
3. Validate live VistA route behavior using real login and patient DFN data.
4. Inventory architecture from code, config, docs, routes, adapters, and module registry.
5. Audit verification system from `qa/gauntlet`, `scripts/qa-gates`, CI workflows, and verifiers.
6. Audit `services/vista/*.m` routines for production necessity vs diagnostics and safety patterns.
7. Assess tenancy and concurrency from runtime mode, RLS, module guard, and RPC connection paths.
8. Identify high-severity issues and implement targeted fixes with minimal, deterministic edits.
9. Re-run focused verification (live runtime + gates + type checks/errors where relevant).
10. Publish consolidated audit + stabilization + handover/training outputs.

## Files Touched
- prompts/587-PHASE-587-FULL-REPO-AUDIT-STABILIZATION/587-01-IMPLEMENT.md
- prompts/587-PHASE-587-FULL-REPO-AUDIT-STABILIZATION/587-99-VERIFY.md
- docs/runbooks/<to-be-created-or-updated>.md
- ops/summary.md
- ops/notion-update.json
- <code files identified during high-severity fix pass>
