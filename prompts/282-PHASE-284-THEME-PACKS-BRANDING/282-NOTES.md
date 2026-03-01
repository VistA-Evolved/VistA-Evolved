# Phase 284 — Notes

## Design Decisions
- Branding stored as dedicated JSONB column (migration v28) rather than inside ui_defaults.
  This keeps UI defaults (user preferences) separate from facility branding (admin config).
- Sanitization is full-replace, not partial merge. This prevents stale fields from persisting.
- HTTPS-only for logo/favicon URLs prevents mixed-content warnings and XSS via data: URLs.
- Preview tab renders a simplified mock — actual CSS token application happens in CPRSUIProvider.

## Existing Pattern Reuse
- Route pattern: same as GET/PUT /admin/feature-flags/:tenantId
- Audit pattern: same as config.tenant-update event structure
- UI pattern: same tabbed admin layout as modules page
- Store pattern: sync to DB via existing syncToDb() function

## Future Work
- File upload for logos (currently URL-based for simplicity)
- Custom theme pack creation from branding colors (auto-generate tokens)
- Multi-tenant branding comparison view
