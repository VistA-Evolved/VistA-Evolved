# Documentation (docs)

This folder contains engineering documentation for VistA Evolved.

## Folder map

- `docs/architecture/` — architecture overview, diagrams, system design notes
- `docs/decisions/` — ADR snapshots (source of truth remains Notion)
- `docs/runbooks/` — how-to guides for setup, debugging, and operations

## Source of truth

For engineers working in this repository:

- `docs/INDEX.md` is the curated documentation entry point.
- `docs/POLICY.md` defines where durable docs are allowed to live.
- `docs/architecture/**` and `docs/runbooks/**` are the maintained in-repo
  references for architecture and operations.

External planning systems may still exist, but contributors should not depend on
them to understand the runtime, wiring, or verification rules of the codebase.
