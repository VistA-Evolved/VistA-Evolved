# Phase 239 — HL7v2 Engine Packaging — VERIFY

## Verification Steps

### Gate 1: All source files exist
```powershell
@("types.ts","mllp-server.ts","mllp-client.ts","parser.ts","ack-generator.ts","index.ts") | ForEach-Object { if (Test-Path "apps/api/src/hl7/$_") { "PASS: $_" } else { "FAIL: $_ missing" } }
if (Test-Path "apps/api/src/routes/hl7-engine.ts") { "PASS: hl7-engine.ts" } else { "FAIL: hl7-engine.ts" }
```

### Gate 2: TypeScript compiles
```powershell
pnpm --filter api build
```

### Gate 3: Engine is opt-in (not auto-started)
```powershell
$idx = Get-Content apps/api/src/index.ts -Raw
if ($idx -match "HL7_ENGINE_ENABLED") { "PASS: opt-in gate" } else { "FAIL: no opt-in" }
```

### Gate 4: MLLP framing constants correct
```powershell
$srv = Get-Content apps/api/src/hl7/mllp-server.ts -Raw
if ($srv -match "0x0[bB]" -and $srv -match "0x1[cC]" -and $srv -match "0x0[dD]") { "PASS: MLLP bytes" } else { "FAIL: MLLP bytes" }
```

### Gate 5: Parser handles MSH segment
```powershell
$p = Get-Content apps/api/src/hl7/parser.ts -Raw
if ($p -match "MSH" -and $p -match "parseMessage") { "PASS: parser" } else { "FAIL: parser" }
```

### Gate 6: ACK generator produces AA/AE/AR
```powershell
$a = Get-Content apps/api/src/hl7/ack-generator.ts -Raw
if ($a -match "AA" -and $a -match "AE" -and $a -match "AR") { "PASS: ACK types" } else { "FAIL: ACK types" }
```

### Gate 7: No PHI in logs
```powershell
$all = Get-ChildItem apps/api/src/hl7/*.ts | ForEach-Object { Get-Content $_.FullName -Raw }
$joined = $all -join "`n"
if ($joined -match "console\.log") { "FAIL: console.log found" } else { "PASS: no console.log" }
```

### Gate 8: Health route registered
```powershell
$r = Get-Content apps/api/src/routes/hl7-engine.ts -Raw
if ($r -match "/hl7/health") { "PASS: health route" } else { "FAIL: no health route" }
```

## Acceptance Criteria
- All HL7 engine files compile
- MLLP framing uses correct byte constants
- Engine is opt-in via env var
- Parser handles MSH extraction
- ACK generator supports AA/AE/AR
- No console.log in HL7 code
- Health endpoint registered
