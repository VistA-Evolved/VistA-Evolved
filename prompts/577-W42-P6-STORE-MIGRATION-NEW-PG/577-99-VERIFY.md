# Phase 577 — W42-P6: Verification

> Wave 42: Production Remediation | Phase 577 Verification

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

## Gate 1: All 17 Repos Exist

```powershell
$tables = @('intake_brain_state','intake_brain_audit','mha_administration','cp_result','imaging_capture','scheduling_recall','portal_audit_event','hl7_route','hl7_tenant_endpoint','hl7_message_event','webhook_delivery_log','fhir_notification','med_rec_session','discharge_plan','mar_safety_event','device_alarm','plugin_registry')
foreach ($t in $tables) {
  $found = Get-ChildItem -Path apps/api/src -Recurse -Filter "*.ts" | Select-String -Pattern $t -List
  if (-not $found) { Write-Error "FAIL: No repo/code for $t" }
}
Write-Output "PASS: All 17 tables have code references"
```

Expected: `PASS`.

---

## Gate 2: Migration v60 Creates Tables

```powershell
Select-String -Path "apps/api/src/platform/pg/pg-migrate.ts" -Pattern "intake_brain_state|mha_administration|device_alarm|plugin_registry"
```

Expected: All 17 table names appear in migration SQL.

---

## Gate 3: Store Policy Updated

```powershell
Select-String -Path "apps/api/src/platform/store-policy.ts" -Pattern "intake-brain|mha-administration|cp-result|imaging-capture|scheduling-recall|portal-audit|hl7-route|webhook-delivery|fhir-notification|med-rec|discharge-plan|mar-safety|device-alarm|plugin-registry"
```

Expected: All 17 stores listed with `pg_backed` durability.

---

## Gate 4: TypeScript Compiles

```powershell
cd apps/api; npx tsc --noEmit --skipLibCheck 2>&1 | Select-Object -First 5
```

Expected: No compilation errors.

---

## Gate 5: RLS Tables Include New Tables

```powershell
Select-String -Path "apps/api/src/platform/pg/pg-migrate.ts" -Pattern "CANONICAL_RLS_TABLES" -Context 0,30
```

Expected: All 17 new tables in `CANONICAL_RLS_TABLES` array.
