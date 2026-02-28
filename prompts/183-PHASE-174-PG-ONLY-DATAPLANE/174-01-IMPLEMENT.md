# Phase 174 -- Postgres-Only Platform Dataplane

## Implementation Steps
- Remove SQLite repos from store-resolver, remove better-sqlite3 dependency, require PLATFORM_PG_URL for all environments

## Files Touched
- See Wave 1 playbook: prompts/00-PLAYBOOKS/wave1-prod-convergence/173-01-IMPLEMENT.md