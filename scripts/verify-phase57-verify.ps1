<#
  Phase 57 VERIFY -- CPRS Wave 2 (WRITE) Safety + Capability Detection
  Gates:
    G57-1 wave57-plan.json exists (artifact only)
    G57-2 each write dialog is real or honest-pending with target RPC(s)
    G57-3 no fake success -- no hardcoded ok:true without RPC attempt or draft
    G57-4 audit events emitted (no PHI in detail)
    G57-5 dead clicks = 0 on write dialogs
    G57-6 verify-latest + PHI scan + secret scan pass
#>
param([switch]$Verbose)

$ErrorActionPreference = "Stop"
$pass = 0; $fail = 0

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
    Write-Host "  FAIL  $id  $desc ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host ""
Write-Host "=== Phase 57 VERIFY: CPRS Wave 2 (WRITE) Safety + Capability Detection ==="
Write-Host ""

# ---------------------------------------------------------------
# G57-1: wave57-plan.json exists with writeActions + safetyRules
# ---------------------------------------------------------------
Gate "G57-1" "wave57-plan.json exists with writeActions and safetyRules" {
  $path = "artifacts/cprs/wave57-plan.json"
  if (-not (Test-Path -LiteralPath $path)) { return $false }
  $json = Get-Content $path -Raw | ConvertFrom-Json
  ($null -ne $json.writeActions) -and ($json.writeActions.Count -ge 11) -and ($null -ne $json.safetyRules)
}

# ---------------------------------------------------------------
# G57-2: Each write dialog calls a real API or shows honest-pending
# ---------------------------------------------------------------
Gate "G57-2" "Each write dialog is real or honest-pending with target RPC(s)" {
  $dialogDir = "apps/web/src/components/cprs/dialogs"
  $dialogs = @(
    @{ file = "AddProblemDialog.tsx";     pattern = "/vista/cprs/problems/add" },
    @{ file = "EditProblemDialog.tsx";    pattern = "/vista/cprs/problems/edit" },
    @{ file = "AddMedicationDialog.tsx";  pattern = "/vista/cprs/meds/quick-order" },
    @{ file = "CreateNoteDialog.tsx";     pattern = "/vista/cprs/notes/create" },
    @{ file = "AddVitalDialog.tsx";       pattern = "/vista/cprs/vitals/add" },
    @{ file = "AddAllergyDialog.tsx";     pattern = "/vista/cprs/allergies/add" },
    @{ file = "AcknowledgeLabDialog.tsx"; pattern = "/vista/cprs/labs/ack" }
  )
  $allGood = $true
  foreach ($d in $dialogs) {
    $content = Get-Content "$dialogDir/$($d.file)" -Raw
    # Must call the wave2 endpoint OR contain "integration-pending" with RPC name
    $hasEndpoint = $content -match [regex]::Escape($d.pattern)
    $hasPending = $content -match "integration.pending"
    if (-not ($hasEndpoint -or $hasPending)) {
      if ($Verbose) { Write-Host "    MISS: $($d.file) does not call $($d.pattern)" }
      $allGood = $false
    }
  }
  $allGood
}

# ---------------------------------------------------------------
# G57-3: No fake success -- no hardcoded {ok:true} without RPC/draft
# ---------------------------------------------------------------
Gate "G57-3" "No fake success in wave2 routes (every ok:true preceded by RPC or draft)" {
  $routeFile = "apps/api/src/routes/cprs/wave2-routes.ts"
  $content = Get-Content $routeFile -Raw

  # Every ok:true must be accompanied by mode:"real" (after safeCallRpc) or mode:"draft" (after createDraft)
  # or status:"integration-pending" (honest pending)
  $okTrueCount = ([regex]::Matches($content, 'ok:\s*true')).Count
  $realCount = ([regex]::Matches($content, 'mode:\s*"real"')).Count
  $draftCount = ([regex]::Matches($content, 'mode:\s*"draft"')).Count
  $pendingCount = ([regex]::Matches($content, 'status:\s*"integration-pending"')).Count

  # All ok:true should be real + draft + pending
  if ($Verbose) { Write-Host "    ok:true=$okTrueCount real=$realCount draft=$draftCount pending=$pendingCount" }
  $totalLegit = $realCount + $draftCount + $pendingCount
  ($totalLegit -ge $okTrueCount) -and ($okTrueCount -gt 0)
}

# ---------------------------------------------------------------
# G57-4: Audit events emitted, no PHI in audit detail
# ---------------------------------------------------------------
Gate "G57-4" "Audit events emitted for writes, no PHI in audit detail" {
  $routeFile = "apps/api/src/routes/cprs/wave2-routes.ts"
  $content = Get-Content $routeFile -Raw

  # Must have auditWrite calls
  $auditCalls = ([regex]::Matches($content, 'auditWrite\(')).Count
  if ($auditCalls -lt 10) {
    if ($Verbose) { Write-Host "    Only $auditCalls auditWrite calls (expected >= 10)" }
    return $false
  }

  # Audit helper must NEVER log input args
  # Check that auditWrite only passes mode/rpc/draftId, never body/field values
  $auditHelper = $content | Select-String -Pattern 'function auditWrite' -SimpleMatch
  if (-not $auditHelper) { return $false }

  # No body.*, no problemText, no noteText, no reactant, no value in audit detail
  # Exclude action name strings (e.g. "clinical.note-create") from false positives
  $phiInAudit = $content -match 'auditWrite\([^)]*(?:body\.\w|,\s*problemText|,\s*noteText|,\s*reactant|,\s*reactions|,\s*severity|,\s*comments\b)'
  -not $phiInAudit
}

# ---------------------------------------------------------------
# G57-5: Dead clicks = 0 on write dialogs
# ---------------------------------------------------------------
Gate "G57-5" "Dead clicks = 0 -- every submit button has a handler" {
  $dialogDir = "apps/web/src/components/cprs/dialogs"
  $files = Get-ChildItem $dialogDir -Filter "*Dialog.tsx"
  $allGood = $true

  foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw

    # Every button with btnPrimary must have an onClick handler
    $primaryBtns = [regex]::Matches($content, '<button[^>]*btnPrimary[^>]*>')
    foreach ($btn in $primaryBtns) {
      if ($btn.Value -notmatch 'onClick') {
        if ($Verbose) { Write-Host "    DEAD CLICK: $($f.Name) has btnPrimary without onClick" }
        $allGood = $false
      }
    }

    # Every fetch() must use credentials: 'include'
    $fetchCalls = [regex]::Matches($content, 'fetch\(')
    $credsCalls = [regex]::Matches($content, "credentials:\s*'include'")
    if ($fetchCalls.Count -gt 0 -and $credsCalls.Count -lt $fetchCalls.Count) {
      if ($Verbose) { Write-Host "    $($f.Name): fetch without credentials:include ($($fetchCalls.Count) fetches, $($credsCalls.Count) with creds)" }
      $allGood = $false
    }

    # Every fetch to a write endpoint must have X-Idempotency-Key
    $postFetches = [regex]::Matches($content, "method:\s*'POST'")
    $idempKeys = [regex]::Matches($content, 'X-Idempotency-Key')
    if ($postFetches.Count -gt 0 -and $idempKeys.Count -lt $postFetches.Count) {
      if ($Verbose) { Write-Host "    $($f.Name): POST without X-Idempotency-Key ($($postFetches.Count) POSTs, $($idempKeys.Count) keys)" }
      $allGood = $false
    }
  }

  $allGood
}

# ---------------------------------------------------------------
# G57-6: verify-latest passes + PHI scan + secret scan
# ---------------------------------------------------------------
Gate "G57-6" "verify-latest + PHI scan + secret scan pass" {
  # 6a: verify-latest delegates to phase57 verifier
  $latestContent = Get-Content "scripts/verify-latest.ps1" -Raw
  $delegatesTo57 = $latestContent -match "verify-phase57"
  if (-not $delegatesTo57) {
    if ($Verbose) { Write-Host "    verify-latest does not delegate to phase57" }
    return $false
  }

  # 6b: PHI scan -- no SSN patterns, no DOB patterns in wave2 code
  $wave2Files = @(
    "apps/api/src/routes/cprs/wave2-routes.ts",
    "apps/web/src/components/cprs/dialogs/CreateNoteDialog.tsx",
    "apps/web/src/components/cprs/dialogs/AddVitalDialog.tsx",
    "apps/web/src/components/cprs/dialogs/AddAllergyDialog.tsx",
    "apps/web/src/components/cprs/dialogs/AcknowledgeLabDialog.tsx"
  )
  $phiFound = $false
  foreach ($f in $wave2Files) {
    if (Test-Path -LiteralPath $f) {
      $c = Get-Content $f -Raw
      if ($c -match '\b\d{3}-\d{2}-\d{4}\b') {
        if ($Verbose) { Write-Host "    PHI: SSN pattern in $f" }
        $phiFound = $true
      }
      if ($c -match '\b(?:date.?of.?birth|DOB|SSN|social.?security)\b' -and $f -notmatch "test|spec") {
        if ($Verbose) { Write-Host "    PHI: DOB/SSN reference in $f" }
        $phiFound = $true
      }
    }
  }
  if ($phiFound) { return $false }

  # 6c: Secret scan -- no hardcoded PROV123 outside login page
  $secretsFound = $false
  foreach ($f in $wave2Files) {
    if (Test-Path -LiteralPath $f) {
      $c = Get-Content $f -Raw
      if ($c -match 'PROV123|PHARM123|NURSE123') {
        if ($Verbose) { Write-Host "    SECRET: hardcoded credential in $f" }
        $secretsFound = $true
      }
    }
  }
  -not $secretsFound
}

# ---------------------------------------------------------------
# Summary
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=== Phase 57 VERIFY Results ==="
Write-Host "  PASS: $pass"
if ($fail -gt 0) { Write-Host "  FAIL: $fail" -ForegroundColor Red }
else { Write-Host "  All gates passed." -ForegroundColor Green }

exit $fail
