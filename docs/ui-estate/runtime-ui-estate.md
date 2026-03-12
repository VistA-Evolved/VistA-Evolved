# Runtime UI Estate Inventory

Generated: 2026-03-12T06:16:27.610Z

## Purpose

This inventory defines the current runtime UI boundary for the full truth and UX audit.
It is intentionally breadth-first: every user-facing app family is counted and cross-checked against registries, docs, tests, and certification signals.

## Summary

- Next.js pages: 120
- Mobile screens: 8
- Desktop shell files: 3
- E2E specs: 61
- VistA panel registry entries: 76
- CPRS action registry entries: 92
- Module docs directories: 157
- Package certification entries: 86

## User-Facing Apps

- Web pages: 90
- Portal pages: 27
- Marketing pages: 3
- Mobile screens: 8
- Desktop shell files: 3

## Cross-Checks

- Panel registry: 76 entries from apps/web/src/lib/vista-panel-registry.ts
- Action registry: 92 entries from apps/web/src/actions/actionRegistry.ts
- Module docs: 157 directories under docs/modules
- Certification source: data/vista/package-certification.json
- Dead-click artifact present: yes

## Certification Snapshot

- certified: 23
- partial: 63

## Next Actions

- Use this inventory as the outer boundary for the page-by-page and control-by-control audit.
- Cross-check every visible UI surface against live verification and truthful UX states.
- Do not treat generated package breadth as equivalent to certified completion.

