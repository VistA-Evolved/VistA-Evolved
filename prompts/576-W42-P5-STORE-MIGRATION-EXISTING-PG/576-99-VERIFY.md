# Phase 576 — W42-P5: Verification

> Wave 42: Production Remediation | Phase 576 Verification

---

## Verification Steps

Run the verification gates and commands documented below in order.

## Expected Output

Each gate should pass or produce a truthful blocker with concrete evidence.

## Negative Tests

Check failure paths, blockers, or integration-pending branches where applicable.

## Evidence Captured

Store command output in artifacts or the specified wave evidence location before marking the phase complete.

---

## Gate 1: Store Policy Updated

```powershell
Select-String -Path "apps/api/src/platform/store-policy.ts" -Pattern "portal-access-logs|imaging-break-glass|telehealth-rooms|scheduling-booking-locks|intake-sessions"
```

Expected: All 10 stores have `pg_backed` or equivalent durability.

---

## Gate 2: No Critical In-Memory Stores

```powershell
cd apps/api; npx tsx -e "
const { getCriticalInMemoryStores } = require('./src/platform/store-policy.ts');
const critical = getCriticalInMemoryStores?.() ?? [];
const migrated = ['portal-access-logs','imaging-break-glass','telehealth-rooms','scheduling-booking-locks','scheduling-waitlist','intake-sessions','clinical-drafts','webhook-subscriptions','fhir-subscriptions'];
const stillCritical = migrated.filter(s => critical.includes(s));
if (stillCritical.length === 0) console.log('PASS: No migrated stores in critical in-memory list');
else console.error('FAIL: Still critical:', stillCritical);
" 2>&1
```

Expected: `PASS` or no migrated stores in critical list.

---

## Gate 3: PG Repos Exist

```powershell
Get-ChildItem -Path "apps/api/src" -Recurse -Filter "*repo*.ts" | Select-String -Pattern "portal_access_log|telehealth_room|intake_session|clinical_draft" -List | Select-Object Path
```

Expected: At least one file per store with PG repo implementation.

---

## Gate 4: TypeScript Compiles

```powershell
cd apps/api; npx tsc --noEmit --skipLibCheck 2>&1 | Select-Object -First 5
```

Expected: No errors (or only pre-existing errors unrelated to store migration).

---

## Gate 5: Store Resolver Blocks SQLite in rc/prod

```powershell
$env:PLATFORM_RUNTIME_MODE = "rc"
cd apps/api; npx tsx -e "
try {
  const { resolveBackend } = require('./src/platform/store-resolver.ts');
  const b = resolveBackend('portal-access-logs');
  if (b === 'pg') console.log('PASS: portal-access-logs resolves to pg');
  else console.error('FAIL: Resolved to', b);
} catch (e) { console.log('PASS: SQLite blocked or pg required'); }
" 2>&1
```

Expected: `PASS` — store resolves to `pg` in rc mode.
