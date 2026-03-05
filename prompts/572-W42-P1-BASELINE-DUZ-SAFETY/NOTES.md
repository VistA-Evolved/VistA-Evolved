# Phase 572 — Notes

> Wave 42: Production Remediation | Phase 572

## Why This Phase Exists

This is Phase 0 of the Complete Production Remediation Plan. Before making any
code changes, we must capture the exact state of the system (gauntlet baseline)
and document the most critical safety issue discovered during the audit: the
single-DUZ problem where all VistA RPC calls execute under one provider identity.

## Decisions

- **Root cleanup strategy**: Move to `test-fixtures/` rather than delete, since
  some of these files may be useful as reference for test development later.
- **DUZ fix goes in Phase 573**: The actual code changes for DUZ-per-request
  are in the RPC connection pool phase. This phase only documents and designs.
- **Gauntlet baseline may have failures**: That's expected — the whole point
  is to capture the "before" state. Don't fix gauntlet failures here.

## Lessons Learned

- Over 170 stray test/curl artifact files accumulated in the repo root over
  the course of 571 phases. The `.gitignore` already excluded them from git,
  but they cluttered the workspace.
- The single-DUZ problem was not caught until Phase 572 because the sandbox
  environment (single-user dev testing) masked it. In production with multiple
  clinicians, this would be a critical audit finding.

## Deferred

- Full gauntlet run requires VistA Docker to be running. The baseline capture
  can be completed when Docker is available. The evidence directory is created
  regardless.
