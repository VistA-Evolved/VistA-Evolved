# Runbooks

Runbooks are step-by-step operational guides for developers.

## What will live here
- Local setup (Docker, Node, YottaDB/VistA)
- Troubleshooting common failures (bridge issues, RPC issues, container issues)
- Developer workflows (branching, testing, releases)
- Deployment notes (later)

## Phase 10 — CPRS Extract

| Subphase | Runbook | Command |
|----------|---------|---------|
| 10A — Inventory Extraction | [cprs-inventory-extraction.md](cprs-inventory-extraction.md) | `pnpm run cprs:extract` |
| 10B — Contract Generation | [cprs-contract-generation.md](cprs-contract-generation.md) | `pnpm run cprs:extract` (then validate) |
| 10C — Replica Shell (Web UI) | [cprs-replica-shell.md](cprs-replica-shell.md) | `pnpm -C apps/web build` |
| 10D — API Scaffold Generator | [cprs-api-scaffold-generator.md](cprs-api-scaffold-generator.md) | `pnpm run cprs:generate-stubs` |

## Rule
If someone gets stuck twice on the same thing, write a runbook.
