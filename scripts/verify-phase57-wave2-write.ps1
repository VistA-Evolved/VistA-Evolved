<# ============================================================
   verify-phase57-wave2-write.ps1
   Phase 57: CPRS Functional Parity Wave 2 (WRITE) Safety + Capability Detection
   ============================================================
   Gates:
     G57-1  wave57-plan.json exists with >= 11 write actions and safetyRules
     G57-2  Wave 2 API route file exists with >= 11 POST endpoints
     G57-3  Action registry has rpcKind field on all actions (read/write)
     G57-4  Write actions have endpoints wired to wave2 routes
     G57-5  Idempotency store exists in wave2-routes (X-Idempotency-Key)
     G57-6  LOCK/UNLOCK pattern in orders/draft and meds/quick-order
     G57-7  safeCallRpc used (not raw callRpc) with idempotent:false
     G57-8  No mock data / fake success in Wave 2 routes
     G57-9  New write dialog components exist (4 new dialogs)
     G57-10 CPRSModals wires all 7 write dialogs
     G57-11 Audit types include Phase 57 write events
     G57-12 No PHI in audit detail (metadata only pattern)
   ============================================================ #>
param([switch]$Verbose)

$ErrorActionPreference = "Stop"
$pass = 0; $fail = 0; $warn = 0
function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $id  $desc" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $id  $desc" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $id  $desc -- $_" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 57 Verification: CPRS Wave 2 (WRITE) Safety + Capability Detection ===" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------
# G57-1: wave57-plan.json exists with correct structure
# ---------------------------------------------------------------
Gate "G57-1" "wave57-plan.json exists with >= 11 write actions and safetyRules" {
  $planPath = "artifacts/cprs/wave57-plan.json"
  if (-not (Test-Path -LiteralPath $planPath)) { return $false }
  $plan = Get-Content $planPath -Raw | ConvertFrom-Json
  $actionCount = ($plan.writeActions | Measure-Object).Count
  $hasSafety = $null -ne $plan.safetyRules
  ($actionCount -ge 11) -and $hasSafety
}

# ---------------------------------------------------------------
# G57-2: Wave 2 API route file exists with >= 11 POST endpoints
# ---------------------------------------------------------------
Gate "G57-2" "Wave 2 API routes file exists with >= 11 POST endpoints" {
  $routePath = "apps/api/src/routes/cprs/wave2-routes.ts"
  if (-not (Test-Path -LiteralPath $routePath)) { return $false }
  $content = Get-Content $routePath -Raw
  $endpoints = ([regex]::Matches($content, 'server\.post\(')).Count
  $endpoints -ge 11
}

# ---------------------------------------------------------------
# G57-3: Action registry has rpcKind field on all actions
# ---------------------------------------------------------------
Gate "G57-3" "Action registry has rpcKind on all actions (read + write)" {
  $regPath = "apps/web/src/actions/actionRegistry.ts"
  $content = Get-Content $regPath -Raw
  $hasRpcKindField = $content -match 'rpcKind:\s*"read"\s*\|'
  # Count only real action entries (actionId: "xxx"), not interface defs or function signatures
  $actionCount = ([regex]::Matches($content, 'actionId:\s*"')).Count
  # Count rpcKind values followed by comma (property), not | (type def)
  $rpcKindCount = ([regex]::Matches($content, 'rpcKind:\s*"(read|write)",?')).Count
  $writeCount = ([regex]::Matches($content, 'rpcKind:\s*"write",?')).Count
  $readCount = ([regex]::Matches($content, 'rpcKind:\s*"read",?')).Count
  # Subtract the interface definition (rpcKind: "read" | "write") from rpcKind count if present
  $typeDefCount = ([regex]::Matches($content, 'rpcKind:\s*"read"\s*\|\s*"write"')).Count
  $effectiveRpcKind = $rpcKindCount - $typeDefCount
  if ($Verbose) { Write-Host "    actions=$actionCount rpcKind=$effectiveRpcKind (raw=$rpcKindCount typeDef=$typeDefCount) read=$readCount write=$writeCount" }
  $hasRpcKindField -and ($effectiveRpcKind -eq $actionCount) -and ($writeCount -ge 12) -and ($readCount -ge 40)
}

# ---------------------------------------------------------------
# G57-4: Write actions have endpoints wired to wave2 routes
# ---------------------------------------------------------------
Gate "G57-4" "Write actions have endpoints pointing to /vista/cprs/* write routes" {
  $regPath = "apps/web/src/actions/actionRegistry.ts"
  $content = Get-Content $regPath -Raw
  $writeEndpoints = @(
    '/vista/cprs/problems/add',
    '/vista/cprs/problems/edit',
    '/vista/cprs/notes/create',
    '/vista/cprs/orders/draft',
    '/vista/cprs/meds/quick-order',
    '/vista/cprs/labs/ack',
    '/vista/cprs/vitals/add',
    '/vista/cprs/allergies/add'
  )
  $found = 0
  foreach ($ep in $writeEndpoints) {
    if ($content -match [regex]::Escape($ep)) { $found++ }
  }
  $found -ge 8
}

# ---------------------------------------------------------------
# G57-5: Idempotency store exists in wave2-routes
# ---------------------------------------------------------------
Gate "G57-5" "Idempotency key support (X-Idempotency-Key header)" {
  $routePath = "apps/api/src/routes/cprs/wave2-routes.ts"
  $content = Get-Content $routePath -Raw
  ($content -match 'X-Idempotency-Key') -and ($content -match 'idempotencyStore') -and ($content -match 'checkIdempotency')
}

# ---------------------------------------------------------------
# G57-6: LOCK/UNLOCK pattern in order and med routes
# ---------------------------------------------------------------
Gate "G57-6" "LOCK/UNLOCK pattern in orders/draft and meds/quick-order" {
  $routePath = "apps/api/src/routes/cprs/wave2-routes.ts"
  $content = Get-Content $routePath -Raw
  $hasLock = $content -match 'ORWDX LOCK'
  $hasUnlock = $content -match 'ORWDX UNLOCK'
  $hasAlwaysUnlock = $content -match 'ALWAYS unlock'
  $hasLock -and $hasUnlock -and $hasAlwaysUnlock
}

# ---------------------------------------------------------------
# G57-7: Uses safeCallRpc with idempotent:false (no raw callRpc)
# ---------------------------------------------------------------
Gate "G57-7" "safeCallRpc used with idempotent:false (not raw callRpc)" {
  $routePath = "apps/api/src/routes/cprs/wave2-routes.ts"
  $content = Get-Content $routePath -Raw
  $hasSafe = $content -match 'safeCallRpc'
  $hasIdempotentFalse = $content -match 'idempotent:\s*false'
  # Should NOT import raw callRpc
  $hasRawCallRpc = $content -match 'import.*\bcallRpc\b.*from.*rpcBrokerClient'
  $hasSafe -and $hasIdempotentFalse -and (-not $hasRawCallRpc)
}

# ---------------------------------------------------------------
# G57-8: No mock/fake data in Wave 2 routes
# ---------------------------------------------------------------
Gate "G57-8" "No mock/fake/hardcoded data in Wave 2 files" {
  $files = @(
    "apps/api/src/routes/cprs/wave2-routes.ts"
  )
  $mockPatterns = @('mock', 'fake', 'dummy', 'hardcoded', 'sampleData', 'testPatient')
  $foundMock = $false
  foreach ($f in $files) {
    if (Test-Path -LiteralPath $f) {
      $content = (Get-Content $f -Raw).ToLower()
      foreach ($p in $mockPatterns) {
        if ($content -match $p) {
          if ($Verbose) { Write-Host "    Found '$p' in $f" -ForegroundColor Yellow }
          $foundMock = $true
        }
      }
    }
  }
  -not $foundMock
}

# ---------------------------------------------------------------
# G57-9: New write dialog components exist (4 new)
# ---------------------------------------------------------------
Gate "G57-9" "4 new write dialog components exist" {
  $dialogs = @(
    "apps/web/src/components/cprs/dialogs/CreateNoteDialog.tsx",
    "apps/web/src/components/cprs/dialogs/AddVitalDialog.tsx",
    "apps/web/src/components/cprs/dialogs/AddAllergyDialog.tsx",
    "apps/web/src/components/cprs/dialogs/AcknowledgeLabDialog.tsx"
  )
  $found = 0
  foreach ($d in $dialogs) {
    if (Test-Path -LiteralPath $d) { $found++ }
  }
  $found -ge 4
}

# ---------------------------------------------------------------
# G57-10: CPRSModals wires all 7 write dialogs
# ---------------------------------------------------------------
Gate "G57-10" "CPRSModals wires all 7 write dialogs (3 existing + 4 new)" {
  $modalPath = "apps/web/src/components/cprs/CPRSModals.tsx"
  $content = Get-Content $modalPath -Raw
  $dialogs = @('AddProblemDialog', 'EditProblemDialog', 'AddMedicationDialog', 'CreateNoteDialog', 'AddVitalDialog', 'AddAllergyDialog', 'AcknowledgeLabDialog')
  $found = 0
  foreach ($d in $dialogs) {
    if ($content -match $d) { $found++ }
  }
  $found -ge 7
}

# ---------------------------------------------------------------
# G57-11: Audit types include Phase 57 write events
# ---------------------------------------------------------------
Gate "G57-11" "Audit types include Phase 57 write events" {
  $auditPath = "apps/api/src/lib/audit.ts"
  $content = Get-Content $auditPath -Raw
  $events = @('clinical.problem-edit', 'clinical.order-draft', 'clinical.order-verify', 'clinical.consult-complete')
  $found = 0
  foreach ($e in $events) {
    if ($content -match [regex]::Escape($e)) { $found++ }
  }
  $found -ge 4
}

# ---------------------------------------------------------------
# G57-12: No PHI in audit detail (metadata only)
# ---------------------------------------------------------------
Gate "G57-12" "No PHI logged in audit detail (metadata-only pattern)" {
  $routePath = "apps/api/src/routes/cprs/wave2-routes.ts"
  $content = Get-Content $routePath -Raw
  # Check that audit calls use metadata only (mode, rpc, draftId)
  $hasMetadataOnly = $content -match 'NEVER log input args'
  # Should NOT pass problemText, noteText, etc. to audit detail
  $phiInAudit = $content -match 'detail:.*problemText|detail:.*noteText|detail:.*reactant'
  $hasMetadataOnly -and (-not $phiInAudit)
}

# ---------------------------------------------------------------
# Summary
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=== Phase 57 Results ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
if ($fail -gt 0) {
  Write-Host "  FAIL: $fail" -ForegroundColor Red
  exit 1
} else {
  Write-Host "  All gates passed." -ForegroundColor Green
  exit 0
}
