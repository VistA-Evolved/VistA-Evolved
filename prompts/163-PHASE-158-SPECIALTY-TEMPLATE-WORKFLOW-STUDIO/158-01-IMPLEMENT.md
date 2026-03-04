# Phase 158-01 — IMPLEMENT: Specialty Template & Workflow Studio

## Goal

Build a structured template engine with 40+ specialty packs, versioning,
TIU draft export, and a note-builder UI for rapid clinical documentation.

## Inventory

- **Current templates**: 5 hardcoded LOCAL_TEMPLATES in NotesPanel.tsx (SOAP, Progress, Telephone, Addendum, Brief)
- **Tenant noteTemplates**: NoteTemplate interface in tenant-context.tsx (plain text, no structured fields)
- **TIU posture**: 10 TIU RPCs registered; TIU CREATE RECORD + SET DOCUMENT TEXT callable; fallback to ServerDraft
- **DB**: No note_template tables exist; PG migration at v22; SQLite schema has ~50 tables
- **I18n**: en/fil/es locales via apps/portal/public/messages/

## Implementation Steps

1. Create PG tables: template, template_section, template_field, template_version_event, quick_text
2. Create SQLite Drizzle schema mirrors
3. Seed 40+ specialty template packs from data/templates/
4. Build template CRUD API routes (/admin/templates/\*)
5. Build note-builder API routes (/encounter/note-builder/\*)
6. Build admin template management UI page
7. Build encounter note-builder UI page
8. Wire TIU export when RPCs available; local-draft fallback
9. Create docs/research/phase158-sources.md with cited references

## Files Touched

- apps/api/src/platform/db/schema.ts (new tables)
- apps/api/src/platform/db/migrate.ts (SQLite DDL)
- apps/api/src/platform/pg/pg-migrate.ts (PG v23 migration)
- apps/api/src/routes/template-routes.ts (new)
- apps/api/src/services/template-engine.ts (new)
- data/templates/\*.json (specialty packs)
- apps/web/src/app/cprs/admin/templates/page.tsx (new)
- apps/web/src/app/encounter/note-builder/page.tsx (new)
- apps/api/src/platform/store-policy.ts (register new stores)
- config/modules.json (add clinical.templates capability)
- docs/research/phase158-sources.md (new)
- docs/runbooks/phase158-specialty-templates.md (new)
