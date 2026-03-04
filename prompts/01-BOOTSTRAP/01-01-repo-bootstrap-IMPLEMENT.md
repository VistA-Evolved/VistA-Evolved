# Bootstrap 01-01 — Repo Bootstrap (IMPLEMENT)

Goal:
Prepare the repo for AI + team development before any app code:

- folder structure
- baseline docs
- minimal package manager wiring (safe)
- .gitignore + security files

Repo path:
C:\Users\kmoul\OneDrive\Documents\GitHub\VistA-Evolved

Rules:

- Inventory first.
- Do not delete any existing docs.
- If files exist, leave them unless incorrect.

Must ensure these exist:

- README.md
- CONTRIBUTING.md
- SECURITY.md
- LICENSE
- .gitignore
- apps/, docs/, scripts/, services/vista/
- apps/web/README.md, apps/api/README.md, services/vista/README.md
- docs/README.md, docs/architecture/README.md, docs/decisions/README.md, docs/runbooks/README.md
- pnpm-workspace.yaml
- root package.json with:
  private:true, packageManager pinned, engines node >=24 <25

Windows requirements section in README.md:

- Node 24 LTS
- pnpm 10
- PowerShell execution policy RemoteSigned (if needed)

Output:

- list files created/modified
- exact commands to run: pnpm -r install
