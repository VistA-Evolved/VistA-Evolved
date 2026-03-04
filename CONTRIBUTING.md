# Contributing to VistA Evolved

## Source of Truth

- Planning, roadmap, and feature specs live in Notion.
- Code, runbooks, architecture docs, and session logs live in this repository.
- AI agent context lives in [AGENTS.md](AGENTS.md).

## Branching

- `main` is always stable.
- `feature/<short-name>` — new features
- `feat/<short-name>` — shorthand alias for features
- `fix/<short-name>` — bug fixes

## Workflow

1. Create a feature branch from `main`.
2. Implement in small, focused commits.
3. Run `pnpm qa:gauntlet:fast` before pushing.
4. Open a Pull Request using the [PR template](.github/pull_request_template.md).
5. PR must include:
   - Brief summary of what changed and why
   - How to test
   - Screenshots (if UI)
   - Updated `docs/SESSION_LOG.md` entry

## Where Code Goes

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js clinician CPRS UI |
| `apps/api` | Fastify API server |
| `apps/portal` | Next.js patient portal |
| `services/vista` | VistA Docker compose + MUMPS routines |
| `services/platform-db` | PostgreSQL Docker compose |
| `docs/runbooks` | Step-by-step operational guides |
| `scripts` | Verifiers, installers, QA gates |
| `config` | Module, SKU, and capability JSON |

## QA Gates

Every PR should pass:

- **Type-check**: `pnpm build` (no TypeScript errors)
- **Lint + Tests**: `pnpm qa:gauntlet:fast`
- **Phase verifier**: `.\scripts\verify-latest.ps1` (if touching a specific phase)

## Commit Conventions

- Prefer small PRs (easy review, less risk).
- One logical change per commit.
- If something breaks twice, document it in `docs/runbooks/` and
  `docs/BUG-TRACKER.md`.

## Session Log

After each working session, append an entry to `docs/SESSION_LOG.md` with:
- Session ID, date, and phase/task label
- What was completed
- What remains
- Any bugs found (with BUG-xxx reference)

## Decisions (ADRs)

If a change affects architecture, interfaces, tenancy, data model, or
deployment, create an ADR in `docs/decisions/`.

## Security

- Do not commit secrets. Use `apps/api/.env.local` locally.
- Credentials must not appear outside the login page (`NODE_ENV` guard).
- Read AGENTS.md §6 ("Key Gotchas") before touching auth or VistA protocol code.
