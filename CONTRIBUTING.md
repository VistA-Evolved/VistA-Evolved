# Contributing to VistA Evolved

## Source of truth
- Planning, roadmap, ADRs, and feature specs live in Notion:
  Company HQ → VistA Evolved HQ
- Code lives in this repository.

## How we work
1) Create/confirm a Feature Spec in Notion (Features database)
2) Check related ADRs (decisions) in Notion
3) Implement in a feature branch
4) Open a Pull Request (PR)
5) PR must include:
   - brief summary of change
   - how to test
   - screenshots (if UI)
   - any new runbook notes

## Branching
- `main` is always stable.
- Use `feature/<short-name>` branches.

## Where code goes
- `apps/web` — React UI
- `apps/api` — Node API
- `services/vista` — VistA/YottaDB environment (Docker)
- `docs/runbooks` — setup + troubleshooting guides

## Non-negotiables
- Keep MVP scope: Patient Search → Allergies → Vitals.
- Do not start Scheduling/CPOE early.
- If something breaks twice, document it in `docs/runbooks/`.

## Workflow
- Default branch: `main`
- Use feature branches: `feat/<short-name>` or `fix/<short-name>`
- Prefer small PRs (easy review, less risk)

## Linking work
When possible, link:
- GitHub Issue ↔ Notion Feature
- PR ↔ Issue
- Architecture-impacting work ↔ ADR

## Decisions (ADRs)
If a change affects architecture, interfaces, tenancy, data model, or deployment:
- Create/Update an ADR (Notion ADR + optionally a repo stub in `docs/decisions/`)

## Commit/PR expectations
- PR includes: what changed, why, how to test
- Add docs/runbook updates when behavior or ops steps change

## Security
Do not commit secrets. Use `.env` locally and a secret manager in deployment.

