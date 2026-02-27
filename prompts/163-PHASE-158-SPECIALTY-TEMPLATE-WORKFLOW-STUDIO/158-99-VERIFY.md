# Phase 158-99 — VERIFY: Specialty Template & Workflow Studio

## Gates

### Gate 1 — Build & Typecheck
- `pnpm -C apps/api exec tsc --noEmit` passes
- `pnpm -C apps/web exec next build` passes (or lint)

### Gate 2 — DB Schema
- PG migration v23 creates template, template_section, template_field, template_version_event, quick_text tables
- SQLite schema has matching Drizzle definitions
- All tables have tenant_id columns

### Gate 3 — Template CRUD
- POST /admin/templates creates a template
- GET /admin/templates lists templates
- PUT /admin/templates/:id updates
- POST /admin/templates/:id/publish publishes a version
- GET /admin/templates/:id/versions lists version history

### Gate 4 — Specialty Packs (≥40)
- data/templates/ contains specialty pack JSON files
- Combined unique specialty tags ≥ 40
- Templates are loadable via seed endpoint or startup

### Gate 5 — Note Builder
- POST /encounter/note-builder/generate produces draft note text from template
- Draft is saved with local-draft label when TIU unavailable
- When TIU available, calls TIU CREATE RECORD

### Gate 6 — Quick Text
- CRUD for quick_text entries
- Search by tag/specialty

### Gate 7 — Audit Trail
- template_version_event has entries for create/edit/publish
- No PHI in audit entries

### Gate 8 — UI Pages Exist
- /admin/templates page renders
- /encounter/note-builder page renders

### Gate 9 — Store Policy
- All new stores registered in store-policy.ts
- No unregistered Map<> stores

### Gate 10 — Research Sources
- docs/research/phase158-sources.md exists with ≥5 cited sources
- Each has URL, title, access date

### Gate 11 — PHI Leak Scan
- No DFN/SSN/DOB in log.info/warn/error payloads in new files

### Gate 12 — Runbook
- docs/runbooks/phase158-specialty-templates.md exists
