# Phase 175 -- Schema + Migration Single Source of Truth

## Implementation Steps
- Keep pg-schema.ts as canonical types, keep pg-migrate.ts as canonical migration runner, remove SQLite migration runner from startup path, add pnpm db:migrate script

## Files Touched
- See Wave 1 playbook: prompts/00-PLAYBOOKS/wave1-prod-convergence/173-01-IMPLEMENT.md