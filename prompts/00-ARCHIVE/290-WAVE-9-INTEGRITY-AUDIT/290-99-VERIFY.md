# 290 — Wave 9 Integrity Audit — Verification

## Verification Steps

1. **TypeScript build** — `pnpm -C apps/api exec tsc --noEmit` returns 0 errors
2. **IDE error scan** — All 10 modified files show 0 code errors
3. **CSS variable coverage** — `:root` block has 48 variables matching theme-tokens.ts
4. **No hardcoded hex in modified CSS** — All color values use `var(--cprs-*, #fallback)` pattern
5. **Store-policy completeness** — All Wave 9 in-memory Maps registered
6. **HL7 barrel completeness** — fhir-bridge, channel-health, outbound-builder all re-exported
7. **Route wiring** — All new HL7 and migration module functions reachable via HTTP
8. **PG barrel** — readThroughGet, readThroughList, hydrateMapsFromPg, HydrateTask exported

## Acceptance Criteria

- [ ] TS build CLEAN (0 errors)
- [ ] 0 IDE errors on all modified files
- [ ] All 5 MODERATE issues resolved
- [ ] All 1 MINOR issue resolved
- [ ] All 6 PRE-EXISTING issues resolved
- [ ] No `as any` casts remain in fhir-bridge.ts resource.id access
- [ ] No hardcoded hex colors in badge/listBadge/MenuBar CSS
- [ ] 48 CSS custom properties in `:root` and `[data-theme='dark']`
