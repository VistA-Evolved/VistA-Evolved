# Wave 40 -- Repo Truth Restoration: PromptOps Repair + Gates Green + Snapshot Hygiene

## Phase Map

| Phase | Code | Title | Status |
|-------|------|-------|--------|
| 543 | P1 | Wave 40 Bootstrap: Reserve + Manifest + Baseline | Planned |
| 544 | P2 | Repair Wave 38 Prompt Folders (522-530) | Planned |
| 545 | P3 | Repair Wave 39 Prompt Folders (531-542) | Planned |
| 546 | P4 | Fix Old-Style Wave Prompt Filenames (509-521 etc.) | Planned |
| 547 | P5 | Resolve Prompt Prefix Collisions (263, 290) | Planned |
| 548 | P6 | Strict Prompts Quality for Wave Folders | Planned |
| 549 | P7 | Wave Phase Folder Generator Script | Planned |
| 550 | P8 | Fix i18n Coverage Gate Syntax Error | Planned |
| 551 | P9 | Fix Restart/Durability Gates (lifecycle.ts) | Planned |
| 552 | P10 | RPC Snapshot Hygiene (rpc-trace-compare green) | Planned |
| 553 | P11 | Secret Scan Remediation | Planned |
| 554 | P12 | PHI Leak Remediation: Safe Error Responses | Planned |
| 555 | P13 | Integration-Pending Budget Stabilization | Planned |

## Scope

Fix the root cause of drift/collisions so Wave 41+ won't repeat failures.
Covers prompt folder hygiene, gate script fixes, snapshot regeneration,
secret/PHI scan remediation, and integration-pending budget stabilization.

## Definition of Done

- prompts-tree-health PASS
- wave-phase-lint PASS
- prompts-audit shows no collisions
- rpc-trace-compare PASS
- i18n-coverage-gate runs successfully
- secret-scan PASS
- phi-leak-scan PASS
- Integration-pending budget PASS
