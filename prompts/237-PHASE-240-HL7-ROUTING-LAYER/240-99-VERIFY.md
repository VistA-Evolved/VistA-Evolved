# Phase 240 — HL7v2 Routing Layer — VERIFY

## Verification Steps

### Gate 1: All routing files exist

```powershell
@("types.ts","registry.ts","matcher.ts","transform.ts","dispatcher.ts","index.ts") | ForEach-Object { if (Test-Path "apps/api/src/hl7/routing/$_") { "PASS: $_" } else { "FAIL: $_ missing" } }
if (Test-Path "apps/api/src/routes/hl7-routing.ts") { "PASS: hl7-routing.ts" } else { "FAIL: hl7-routing.ts" }
```

### Gate 2: TypeScript compiles

```powershell
pnpm --filter api build
```

### Gate 3: Route registry has CRUD

```powershell
$r = Get-Content apps/api/src/hl7/routing/registry.ts -Raw
if ($r -match "addRoute" -and $r -match "removeRoute" -and $r -match "getRoute") { "PASS: CRUD" } else { "FAIL: CRUD" }
```

### Gate 4: Matcher handles message type filtering

```powershell
$m = Get-Content apps/api/src/hl7/routing/matcher.ts -Raw
if ($m -match "matchRoutes" -and $m -match "messageType") { "PASS: matcher" } else { "FAIL: matcher" }
```

### Gate 5: Transform pipeline exists

```powershell
$t = Get-Content apps/api/src/hl7/routing/transform.ts -Raw
if ($t -match "applyTransforms|runTransformPipeline") { "PASS: transform" } else { "FAIL: transform" }
```

### Gate 6: No PHI in logs

```powershell
$all = (Get-ChildItem apps/api/src/hl7/routing/*.ts | ForEach-Object { Get-Content $_.FullName -Raw }) -join "`n"
if ($all -match "console\.log") { "FAIL: console.log" } else { "PASS: no console.log" }
```

### Gate 7: Dead-letter queue exists

```powershell
$d = Get-Content apps/api/src/hl7/routing/dispatcher.ts -Raw
if ($d -match "deadLetter|unroutable") { "PASS: DLQ" } else { "FAIL: no DLQ" }
```

## Acceptance Criteria

- All routing files compile
- Route registry supports CRUD
- Matcher filters by message type
- Transform pipeline chains transforms
- Dead-letter queue for unmatched messages
- No console.log in routing code
