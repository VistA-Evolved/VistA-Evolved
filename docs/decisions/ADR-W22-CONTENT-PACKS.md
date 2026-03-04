# ADR: Clinical Content Pack Architecture v2

- **Status**: Accepted
- **Date**: 2026-03-01
- **Phase**: 389 (W22-P1)

## Context

Phase 158 introduced the template engine with `ClinicalTemplate`, `SpecialtyPack`,
and `TemplateSection` types. The existing system supports:

- Template CRUD with versioning and publish/archive lifecycle
- Specialty tags (45 specialties) and setting tags (inpatient/outpatient/ed/any)
- Quick-text library and auto-expand rules
- Pack validator (section/field validation)

Wave 22 requires extending this to clinical content packs that include not just
templates but also order sets, flowsheets, inbox routing rules, and dashboards.
Each specialty area (primary care, ICU, pharmacy, lab, imaging) needs an
installable, versionable, auditable content bundle.

## Decision

**Extend the existing pack model** rather than replacing it. Add new content
types alongside templates within the existing `SpecialtyPack` structure.

### Pack Format v2

```typescript
interface ContentPackV2 {
  packId: string; // e.g. "outpatient-primary-care"
  version: string; // semver: "1.0.0"
  name: string;
  specialty: string;
  setting: TemplateSetting;
  description: string;
  country?: string; // ISO 3166-1 alpha-2
  locale?: string; // BCP 47

  // Content sections (all optional per pack)
  templates: TemplateInput[];
  orderSets: OrderSetInput[];
  flowsheets: FlowsheetInput[];
  inboxRules: InboxRuleInput[];
  dashboards: DashboardInput[];
  cdsRules: CdsRuleInput[];

  // Governance
  requires?: string[]; // prerequisite packIds
  minPlatformVersion?: string;
  migrations?: PackMigration[];
}
```

### Versioning Strategy

- **Semver** for pack versions (MAJOR.MINOR.PATCH)
- **MAJOR**: breaking changes (removed fields, restructured order sets)
- **MINOR**: new content added (new template, new order set)
- **PATCH**: text fixes, clarifications
- **Migrations**: each MAJOR bump includes a `PackMigration` with `up`/`down`
  functions that transform tenant data between versions
- **Rollback**: `down` migration + re-install previous version; rollback is
  tenant-scoped and does not affect other tenants

### Install/Uninstall Lifecycle

1. **Validate** — pack validator checks structural integrity + dependency
   prerequisites
2. **Preview** — tenant admin sees what will be added/changed
3. **Install** — content items are created in the tenant's scope with
   `source: { packId, packVersion }` metadata
4. **Audit** — install event logged to immutable audit trail
5. **Rollback** — removes pack-sourced items OR runs down-migration;
   user-modified copies are preserved (marked `forked: true`)

### Why not a separate content management system?

- Templates already live in our store with tenant scoping
- Adding external CMS introduces deployment complexity
- Pack installs are infrequent (per-tenant, admin-driven)
- Our existing audit + RBAC infrastructure covers governance

### Why not embed content in code?

- Content is data, not code — separating enables non-dev authoring
- Different tenants need different packs (US vs PH, primary care vs ICU)
- Versioning content independently from platform releases
- Rollback without platform redeployment

## Consequences

- Pack authors create JSON/YAML bundles following the v2 schema
- Platform validates and installs at runtime, not build time
- Migration logic must be idempotent and backward-compatible
- Pack dependencies create an install ordering constraint
- User-customized (forked) templates survive rollback but may diverge
- Country/locale-specific packs enable Wave 22 P9 localization work
