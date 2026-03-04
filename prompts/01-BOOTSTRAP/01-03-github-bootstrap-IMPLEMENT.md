# Bootstrap 01-03 — GitHub Bootstrap (IMPLEMENT)

Goal:
Prepare GitHub repo for a team:

- labels
- milestones
- issue templates
- CodeQL workflow that does NOT fail early
- CI workflow that stays green early

Rules:

- Inventory first.
- Do not require paid GitHub upgrades (branch rulesets may not enforce on private org).
- Prefer “best effort” protections via team policy + PR workflow.

Must create/ensure:

- .github/ISSUE_TEMPLATE/bug_report.md
- .github/ISSUE_TEMPLATE/feature_request.md
- .github/ISSUE_TEMPLATE/documentation_request.md
- .github/ISSUE_TEMPLATE/engineering_task.md
- .github/ISSUE_TEMPLATE/config.yml (include Notion HQ link placeholder)
- .github/workflows/ci.yml (safe)
- .github/workflows/codeql.yml (skip gracefully if no JS/TS detected)

Deliverable:

- list files created/modified
- how to create labels/milestones manually (human checklist)
