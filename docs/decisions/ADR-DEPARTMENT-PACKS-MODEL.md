# ADR: Department Packs Model

## Status
Accepted

## Context
Departments/specialties need different module configurations (e.g., imaging for radiology,
RCM for billing, telehealth for primary care). Configuration should be reproducible,
versioned, auditable, and reversible.

## Decision
- **Code-driven pack definitions** stored as JSON manifests in `config/packs/`.
- **Pack format:** `{ id, name, version, modules[], featureFlags{}, prerequisites[], countryPacks[] }`.
- **Installation is tenant+department-scoped:** `department_pack_install` PG table tracks
  what's installed where, with snapshot of prior config for rollback.
- **Audit:** All install/uninstall operations logged to immutable audit trail.
- **No runtime code loading:** Packs only toggle existing modules/flags — no dynamic
  code injection. This is a configuration management pattern, not a plugin system.
- **Certification:** Each pack has a test scenario (W17-P8) that validates the pack
  works correctly before marking it "certified" for production use.

## Alternatives Considered
- **Data-driven packs in DB only:** Rejected — harder to version-control, review in PRs.
- **Plugin system with dynamic imports:** Rejected — security risk, complexity.

## Consequences
- Pack definitions are code-reviewed via normal PR process.
- Tenant admins install packs via API/UI, not by editing config files.
- Pack prerequisites prevent invalid configurations (e.g., can't install imaging pack
  without the imaging module enabled in the SKU).
