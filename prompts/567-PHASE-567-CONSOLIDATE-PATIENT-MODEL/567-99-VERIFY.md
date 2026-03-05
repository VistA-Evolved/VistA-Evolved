# Phase 567 -- Verify: Consolidate Patient Model & Top Duplicates

## Verification Steps

1. **TypeScript compilation** — zero errors across all 4 packages:

   ```
   cd shared && npx tsc --noEmit         # 0 errors
   cd apps/web && npx tsc --noEmit       # 0 errors
   cd apps/api && npx tsc --noEmit       # 0 errors
   cd apps/portal && npx tsc --noEmit    # 0 errors
   ```

2. **File existence** — canonical types exist:

   ```
   ls shared/src/clinical/patient.ts     # exists
   ls shared/src/clinical/allergy.ts     # exists
   ls shared/src/clinical/vital.ts       # exists
   ls shared/src/clinical/note.ts        # exists
   ls shared/src/clinical/medication.ts  # exists
   ls shared/src/clinical/problem.ts     # exists
   ls shared/src/auth/user-role.ts       # exists
   ```

3. **Export count** — patient.ts has ≥3 exports:

   ```
   grep -c '^export' shared/src/clinical/patient.ts  # expect 7
   ```

4. **No duplicate definitions remain** in consolidated files:

   ```
   grep 'interface Patient ' apps/web/src/lib/chart-types.ts       # 0 matches
   grep 'interface Allergy ' apps/web/src/stores/data-cache.tsx     # 0 matches
   grep 'type UserRole' apps/web/src/stores/session-context.tsx     # only re-export
   ```

5. **DATA_MODEL_AUDIT.md updated** — D-05 through D-08 marked DONE

## Acceptance Criteria

- [ ] `@vista-evolved/shared-types` package created and linked
- [ ] Patient, PatientSummary, PatientCreateRequest, PatientUpdateRequest exported
- [ ] 5 clinical types (Allergy, Vital, Note, Medication, Problem) canonicalized
- [ ] UserRole consolidated (API + web → shared-types)
- [ ] SupportedLocale consolidated (web + portal + API → locale-utils)
- [ ] Zero TypeScript errors in shared, web, API, portal
- [ ] All former duplicate definitions either deleted or replaced with re-exports
- [ ] DATA_MODEL_AUDIT.md D-05, D-06, D-07, D-08 marked DONE
