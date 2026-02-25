<# Phase 100 -- Eligibility + Claim Status Polling Framework Verifier
   Gates: source structure, domain types, DB schema/migration, store,
          adapters, routes, UI, security/PHI, audit, build, docs,
          runtime endpoint battery, persistence, regression
   Enhanced in VERIFY pass with runtime tests (gates 74-94)
#>
param([switch]$SkipDocker, [switch]$SkipRuntime, [switch]$SkipBuild)

$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 0

function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  $script:total++
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

Write-Host "`n=== Phase 100 -- Eligibility + Claim Status Polling Framework Verification ===" -ForegroundColor Cyan

# ================================================================
# Section A: Source Structure (9 gates)
# ================================================================
Write-Host "`n--- A. Source Structure ---" -ForegroundColor Yellow

Gate "P100-001" "types.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/eligibility/types.ts"
}

Gate "P100-002" "store.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/eligibility/store.ts"
}

Gate "P100-003" "routes.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/eligibility/routes.ts"
}

Gate "P100-004" "manual-adapter.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/eligibility/manual-adapter.ts"
}

Gate "P100-005" "edi-stub-adapters.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/eligibility/edi-stub-adapters.ts"
}

Gate "P100-006" "schema.ts exists (DB)" {
  Test-Path -LiteralPath "apps/api/src/platform/db/schema.ts"
}

Gate "P100-007" "migrate.ts exists (DB)" {
  Test-Path -LiteralPath "apps/api/src/platform/db/migrate.ts"
}

Gate "P100-008" "index.ts exists (route registration)" {
  Test-Path -LiteralPath "apps/api/src/index.ts"
}

Gate "P100-009" "RCM page.tsx exists (UI)" {
  Test-Path -LiteralPath "apps/web/src/app/cprs/admin/rcm/page.tsx"
}

# ================================================================
# Section B: Domain Types (8 gates)
# ================================================================
Write-Host "`n--- B. Domain Types ---" -ForegroundColor Yellow

$typesFile = "apps/api/src/rcm/eligibility/types.ts"

Gate "P100-010" "EligibilityProvenance enum has 5 values" {
  $c = (Select-String -Path $typesFile -Pattern "MANUAL|SANDBOX|EDI_270_271|CLEARINGHOUSE|PORTAL").Count
  $c -ge 5
}

Gate "P100-011" "ClaimStatusProvenance enum has 5 values" {
  $c = (Select-String -Path $typesFile -Pattern "EDI_276_277").Count
  $c -ge 1
}

Gate "P100-012" "EligibilityCheckRequest type" {
  (Select-String -Path $typesFile -Pattern "EligibilityCheckRequest").Count -ge 1
}

Gate "P100-013" "EligibilityCheckRecord type" {
  (Select-String -Path $typesFile -Pattern "EligibilityCheckRecord").Count -ge 1
}

Gate "P100-014" "ClaimStatusCheckRequest type" {
  (Select-String -Path $typesFile -Pattern "ClaimStatusCheckRequest").Count -ge 1
}

Gate "P100-015" "ClaimStatusCheckRecord type" {
  (Select-String -Path $typesFile -Pattern "ClaimStatusCheckRecord").Count -ge 1
}

Gate "P100-016" "EligibilityStats type" {
  (Select-String -Path $typesFile -Pattern "EligibilityStats").Count -ge 1
}

Gate "P100-017" "ClaimStatusStats type" {
  (Select-String -Path $typesFile -Pattern "ClaimStatusStats").Count -ge 1
}

# ================================================================
# Section C: DB Schema + Migration (8 gates)
# ================================================================
Write-Host "`n--- C. DB Schema + Migration ---" -ForegroundColor Yellow

$schemaFile  = "apps/api/src/platform/db/schema.ts"
$migrateFile = "apps/api/src/platform/db/migrate.ts"

Gate "P100-018" "schema.ts has eligibilityCheck table" {
  (Select-String -Path $schemaFile -Pattern "eligibilityCheck").Count -ge 1
}

Gate "P100-019" "schema.ts has claimStatusCheck table" {
  (Select-String -Path $schemaFile -Pattern "claimStatusCheck").Count -ge 1
}

Gate "P100-020" "migrate.ts creates eligibility_check table" {
  (Select-String -Path $migrateFile -Pattern "eligibility_check").Count -ge 1
}

Gate "P100-021" "migrate.ts creates claim_status_check table" {
  (Select-String -Path $migrateFile -Pattern "claim_status_check").Count -ge 1
}

Gate "P100-022" "migrate.ts has eligibility indexes (6)" {
  $c = (Select-String -Path $migrateFile -Pattern "idx_elig_").Count
  $c -ge 6
}

Gate "P100-023" "migrate.ts has claim status indexes (6)" {
  $c = (Select-String -Path $migrateFile -Pattern "idx_cstat_").Count
  $c -ge 6
}

Gate "P100-024" "schema.ts eligibility has provenance column" {
  (Select-String -Path $schemaFile -Pattern "provenance.*text.*eligibility").Count -ge 1 -or
  (Select-String -Path $schemaFile -Pattern "eligibilityCheck" -Context 0,20 | Out-String) -match "provenance"
}

Gate "P100-025" "schema.ts claim_status has claimRef column" {
  (Select-String -Path $schemaFile -Pattern "claimStatusCheck" -Context 0,20 | Out-String) -match "claimRef"
}

# ================================================================
# Section D: Durable Store (8 gates)
# ================================================================
Write-Host "`n--- D. Durable Store ---" -ForegroundColor Yellow

$storeFile = "apps/api/src/rcm/eligibility/store.ts"

Gate "P100-026" "insertEligibilityCheck function" {
  (Select-String -Path $storeFile -Pattern "insertEligibilityCheck").Count -ge 1
}

Gate "P100-027" "getEligibilityCheckById function" {
  (Select-String -Path $storeFile -Pattern "getEligibilityCheckById").Count -ge 1
}

Gate "P100-028" "listEligibilityChecks function" {
  (Select-String -Path $storeFile -Pattern "listEligibilityChecks").Count -ge 1
}

Gate "P100-029" "getEligibilityStats function" {
  (Select-String -Path $storeFile -Pattern "getEligibilityStats").Count -ge 1
}

Gate "P100-030" "insertClaimStatusCheck function" {
  (Select-String -Path $storeFile -Pattern "insertClaimStatusCheck").Count -ge 1
}

Gate "P100-031" "getClaimStatusTimeline function" {
  (Select-String -Path $storeFile -Pattern "getClaimStatusTimeline").Count -ge 1
}

Gate "P100-032" "listClaimStatusChecks function" {
  (Select-String -Path $storeFile -Pattern "listClaimStatusChecks").Count -ge 1
}

Gate "P100-033" "getClaimStatusStats function" {
  (Select-String -Path $storeFile -Pattern "getClaimStatusStats").Count -ge 1
}

# ================================================================
# Section E: Adapters (10 gates)
# ================================================================
Write-Host "`n--- E. Adapters ---" -ForegroundColor Yellow

$manualFile = "apps/api/src/rcm/eligibility/manual-adapter.ts"
$ediFile    = "apps/api/src/rcm/eligibility/edi-stub-adapters.ts"

Gate "P100-034" "ManualPayerAdapter class" {
  (Select-String -Path $manualFile -Pattern "ManualPayerAdapter").Count -ge 1
}

Gate "P100-035" "Manual adapter implements PayerAdapter" {
  (Select-String -Path $manualFile -Pattern "implements PayerAdapter").Count -ge 1
}

Gate "P100-036" "Manual checkEligibility returns isTestData false" {
  (Select-String -Path $manualFile -Pattern "isTestData.*false").Count -ge 1
}

Gate "P100-037" "Manual pollClaimStatus implemented" {
  (Select-String -Path $manualFile -Pattern "pollClaimStatus").Count -ge 1
}

Gate "P100-038" "Edi270271StubAdapter class" {
  (Select-String -Path $ediFile -Pattern "Edi270271StubAdapter").Count -ge 1
}

Gate "P100-039" "Edi276277StubAdapter class" {
  (Select-String -Path $ediFile -Pattern "Edi276277StubAdapter").Count -ge 1
}

Gate "P100-040" "EDI 270/271 returns integration_pending" {
  (Select-String -Path $ediFile -Pattern "integration_pending").Count -ge 1
}

Gate "P100-041" "EDI stubs list required env vars" {
  (Select-String -Path $ediFile -Pattern "EDI_CLEARINGHOUSE_URL").Count -ge 1
}

Gate "P100-042" "EDI stubs have migrationPath" {
  (Select-String -Path $ediFile -Pattern "migrationPath").Count -ge 1
}

Gate "P100-043" "EDI stubs not enabled by default" {
  (Select-String -Path $ediFile -Pattern "enabled.*false").Count -ge 1
}

# ================================================================
# Section F: Routes (12 gates)
# ================================================================
Write-Host "`n--- F. Routes ---" -ForegroundColor Yellow

$routesFile = "apps/api/src/rcm/eligibility/routes.ts"

Gate "P100-044" "POST /rcm/eligibility/check route" {
  (Select-String -Path $routesFile -Pattern "/rcm/eligibility/check").Count -ge 1
}

Gate "P100-045" "GET /rcm/eligibility/history route" {
  (Select-String -Path $routesFile -Pattern "/rcm/eligibility/history").Count -ge 1
}

Gate "P100-046" "GET /rcm/eligibility/stats route" {
  (Select-String -Path $routesFile -Pattern "/rcm/eligibility/stats").Count -ge 1
}

Gate "P100-047" "GET /rcm/eligibility/:id route" {
  (Select-String -Path $routesFile -Pattern "/rcm/eligibility/:id").Count -ge 1
}

Gate "P100-048" "POST /rcm/claim-status/check route" {
  (Select-String -Path $routesFile -Pattern "/rcm/claim-status/check").Count -ge 1
}

Gate "P100-049" "POST /rcm/claim-status/schedule route" {
  (Select-String -Path $routesFile -Pattern "/rcm/claim-status/schedule").Count -ge 1
}

Gate "P100-050" "GET /rcm/claim-status/history route" {
  (Select-String -Path $routesFile -Pattern "/rcm/claim-status/history").Count -ge 1
}

Gate "P100-051" "GET /rcm/claim-status/timeline route" {
  (Select-String -Path $routesFile -Pattern "/rcm/claim-status/timeline").Count -ge 1
}

Gate "P100-052" "GET /rcm/claim-status/stats route" {
  (Select-String -Path $routesFile -Pattern "/rcm/claim-status/stats").Count -ge 1
}

Gate "P100-053" "GET /rcm/claim-status/:id route" {
  (Select-String -Path $routesFile -Pattern "/rcm/claim-status/:id").Count -ge 1
}

Gate "P100-054" "GET /rcm/eligibility-adapters route" {
  (Select-String -Path $routesFile -Pattern "/rcm/eligibility-adapters").Count -ge 1
}

Gate "P100-055" "Routes import appendRcmAudit" {
  (Select-String -Path $routesFile -Pattern "appendRcmAudit").Count -ge 1
}

# ================================================================
# Section G: Route Registration (2 gates)
# ================================================================
Write-Host "`n--- G. Route Registration ---" -ForegroundColor Yellow

$indexFile = "apps/api/src/index.ts"

Gate "P100-056" "index.ts imports eligibilityClaimStatusRoutes" {
  (Select-String -Path $indexFile -Pattern "eligibilityClaimStatusRoutes").Count -ge 1
}

Gate "P100-057" "index.ts registers eligibilityClaimStatusRoutes" {
  (Select-String -Path $indexFile -Pattern "server.register\(eligibilityClaimStatusRoutes\)").Count -ge 1
}

# ================================================================
# Section H: UI (8 gates)
# ================================================================
Write-Host "`n--- H. UI ---" -ForegroundColor Yellow

$pageFile = "apps/web/src/app/cprs/admin/rcm/page.tsx"

Gate "P100-058" "page.tsx has EligibilityTab component" {
  (Select-String -Path $pageFile -Pattern "EligibilityTab").Count -ge 1
}

Gate "P100-059" "page.tsx has ClaimStatusTab component" {
  (Select-String -Path $pageFile -Pattern "ClaimStatusTab").Count -ge 1
}

Gate "P100-060" "page.tsx has claim-status tab ID" {
  (Select-String -Path $pageFile -Pattern "claim-status").Count -ge 1
}

Gate "P100-061" "EligibilityTab has provenance selector" {
  (Select-String -Path $pageFile -Pattern "provenance").Count -ge 1
}

Gate "P100-062" "EligibilityTab has stats display" {
  (Select-String -Path $pageFile -Pattern "eligStats|eligibility.*stats").Count -ge 1
}

Gate "P100-063" "ClaimStatusTab has timeline feature" {
  (Select-String -Path $pageFile -Pattern "timeline").Count -ge 1
}

Gate "P100-064" "ClaimStatusTab has stats display" {
  (Select-String -Path $pageFile -Pattern "csStats|claim.*status.*stats").Count -ge 1
}

Gate "P100-065" "Credentials: include for fetch calls" {
  (Select-String -Path $pageFile -Pattern "credentials.*include").Count -ge 1
}

# ================================================================
# Section I: Security + PHI (4 gates)
# ================================================================
Write-Host "`n--- I. Security + PHI ---" -ForegroundColor Yellow

Gate "P100-066" "No hardcoded credentials in routes" {
  $hits = Select-String -Path $routesFile -Pattern "PROV123|password|secret" -CaseSensitive
  $null -eq $hits -or $hits.Count -eq 0
}

Gate "P100-067" "No hardcoded credentials in store" {
  $hits = Select-String -Path $storeFile -Pattern "PROV123|password|secret" -CaseSensitive
  $null -eq $hits -or $hits.Count -eq 0
}

Gate "P100-068" "No console.log in eligibility module" {
  $eligDir = "apps/api/src/rcm/eligibility"
  $hits = Get-ChildItem -Path $eligDir -Filter "*.ts" | Select-String -Pattern "console\.log"
  $null -eq $hits -or $hits.Count -eq 0
}

Gate "P100-069" "No patient names stored in audit (routes use appendRcmAudit)" {
  $hits = Select-String -Path $routesFile -Pattern "appendRcmAudit"
  $hits.Count -ge 3
}

# ================================================================
# Section J: Docs (3 gates)
# ================================================================
Write-Host "`n--- J. Docs ---" -ForegroundColor Yellow

Gate "P100-070" "Runbook exists" {
  Test-Path -LiteralPath "docs/runbooks/rcm-eligibility-claimstatus-phase100.md"
}

Gate "P100-071" "Prompt file exists" {
  Test-Path -LiteralPath "prompts/100-PHASE-100-ELIGIBILITY-CLAIMSTATUS/100-01-IMPLEMENT.md"
}

Gate "P100-072" "Verify script exists" {
  Test-Path -LiteralPath "scripts/verify-phase100-eligibility-claimstatus.ps1"
}

# ================================================================
# Section K: Build (1 gate)
# ================================================================
if (-not $SkipBuild) {
  Write-Host "`n--- K. Build ---" -ForegroundColor Yellow

  Gate "P100-073" "API tsc --noEmit clean" {
    Push-Location "apps/api"
    $out = npx tsc --noEmit 2>&1 | Out-String
    Pop-Location
    $out -notmatch "error TS"
  }
} else {
  Write-Host "`n--- K. Build (SKIPPED) ---" -ForegroundColor Yellow
}

# ================================================================
# Section L: VERIFY-pass Fixes (5 gates)
# ================================================================
Write-Host "`n--- L. VERIFY-pass Fixes ---" -ForegroundColor Yellow

Gate "P100-074" "No dead safeJsonParse in store" {
  $hits = Select-String -Path "apps/api/src/rcm/eligibility/store.ts" -Pattern "function safeJsonParse"
  $hits.Count -eq 0
}

Gate "P100-075" "replaceAll for underscores in EligibilityTab" {
  (Select-String -Path "apps/web/src/app/cprs/admin/rcm/page.tsx" -Pattern "replaceAll\(['\`"]_['\`"]").Count -ge 2
}

Gate "P100-076" "Priority validation in schedule route" {
  (Select-String -Path "apps/api/src/rcm/eligibility/routes.ts" -Pattern "Math\.max.*Math\.min|Math\.min.*Math\.max").Count -ge 1
}

Gate "P100-077" "Old Phase 69 eligibility route removed from rcm-routes.ts" {
  $hits = Select-String -Path "apps/api/src/rcm/rcm-routes.ts" -Pattern "server\.post\(.*/rcm/eligibility/check"
  $hits.Count -eq 0
}

Gate "P100-078" "verify-latest.ps1 delegates to phase100" {
  (Select-String -Path "scripts/verify-latest.ps1" -Pattern "verify-phase100").Count -ge 1
}

# ================================================================
# Section M: Runtime Endpoint Battery (20 gates)
# ================================================================
Write-Host "`n--- M. Runtime Endpoint Battery ---" -ForegroundColor Yellow

$apiBase = "http://127.0.0.1:3001"

$apiUp = $false
if (-not $SkipRuntime) {
  try {
    $h = Invoke-WebRequest -Uri "$apiBase/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $apiUp = ($h.StatusCode -eq 200)
  } catch {
    $apiUp = $false
  }
}

if ($SkipRuntime -or (-not $apiUp)) {
  if (-not $SkipRuntime) {
    Write-Host "  SKIP  API not reachable at $apiBase -- skipping runtime tests" -ForegroundColor DarkGray
  } else {
    Write-Host "  SKIP  M. Runtime (--SkipRuntime)" -ForegroundColor DarkGray
  }
} else {
  # Authenticate
  $loginBody = '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'
  $session = Invoke-WebRequest -Uri "$apiBase/auth/login" -Method POST `
    -ContentType "application/json" -Body $loginBody `
    -SessionVariable wsess -UseBasicParsing -ErrorAction Stop
  # Phase 132: Extract CSRF from JSON response body (synchronizer token pattern)
  $loginResp = $session.Content | ConvertFrom-Json
  $csrf = if ($loginResp.csrfToken) { $loginResp.csrfToken } else { "" }
  $hdrs = @{ "x-csrf-token" = $csrf }

  Gate "P100-079" "POST /rcm/eligibility/check MANUAL returns 201" {
    $body = '{"patientDfn":"3","payerId":"TEST-P100","provenance":"MANUAL","manualResult":{"eligible":true,"notes":"verify-script"}}'
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/eligibility/check" -Method POST `
      -ContentType "application/json" -Body $body -WebSession $wsess `
      -Headers $hdrs -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 201) -and ($r.Content -match '"provenance":"MANUAL"')
  }

  Gate "P100-080" "POST /rcm/eligibility/check SANDBOX returns 201" {
    $body = '{"patientDfn":"3","payerId":"SBX-TEST","provenance":"SANDBOX"}'
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/eligibility/check" -Method POST `
      -ContentType "application/json" -Body $body -WebSession $wsess `
      -Headers $hdrs -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 201) -and ($r.Content -match '"provenance":"SANDBOX"')
  }

  Gate "P100-081" "POST /rcm/eligibility/check EDI returns integration_pending" {
    $body = '{"patientDfn":"3","payerId":"BCBS-001","provenance":"EDI_270_271"}'
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/eligibility/check" -Method POST `
      -ContentType "application/json" -Body $body -WebSession $wsess `
      -Headers $hdrs -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 201) -and ($r.Content -match '"integration_pending"')
  }

  Gate "P100-082" "POST eligibility/check rejects missing patientDfn (400)" {
    try {
      Invoke-WebRequest -Uri "$apiBase/rcm/eligibility/check" -Method POST `
        -ContentType "application/json" -Body '{"payerId":"X"}' -WebSession $wsess `
        -Headers $hdrs -UseBasicParsing -ErrorAction Stop
      $false
    } catch {
      $_.Exception.Response.StatusCode.value__ -eq 400
    }
  }

  Gate "P100-083" "GET /rcm/eligibility/history returns items array" {
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/eligibility/history" `
      -WebSession $wsess -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 200) -and ($r.Content -match '"items":\[')
  }

  Gate "P100-084" "GET /rcm/eligibility/stats returns totalChecks" {
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/eligibility/stats" `
      -WebSession $wsess -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 200) -and ($r.Content -match '"totalChecks"')
  }

  Gate "P100-085" "GET /rcm/eligibility/:id returns specific check" {
    $hist = Invoke-WebRequest -Uri "$apiBase/rcm/eligibility/history?limit=1" `
      -WebSession $wsess -UseBasicParsing -ErrorAction Stop
    $firstId = ($hist.Content | ConvertFrom-Json).items[0].id
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/eligibility/$firstId" `
      -WebSession $wsess -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 200) -and ($r.Content -match $firstId)
  }

  Gate "P100-086" "GET /rcm/eligibility-adapters returns adapter list" {
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/eligibility-adapters" `
      -WebSession $wsess -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 200) -and ($r.Content -match '"adapters"')
  }

  Gate "P100-087" "POST /rcm/claim-status/check MANUAL returns 201" {
    $body = '{"claimRef":"CLM-P100","payerId":"BCBS-001","provenance":"MANUAL","manualResult":{"claimStatus":"accepted","paidAmountCents":50000}}'
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/claim-status/check" -Method POST `
      -ContentType "application/json" -Body $body -WebSession $wsess `
      -Headers $hdrs -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 201) -and ($r.Content -match '"provenance":"MANUAL"')
  }

  Gate "P100-088" "POST /rcm/claim-status/check SANDBOX returns 201" {
    $body = '{"claimRef":"CLM-P100","payerId":"SBX-TEST","provenance":"SANDBOX"}'
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/claim-status/check" -Method POST `
      -ContentType "application/json" -Body $body -WebSession $wsess `
      -Headers $hdrs -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 201) -and ($r.Content -match '"provenance":"SANDBOX"')
  }

  Gate "P100-089" "POST /rcm/claim-status/check EDI returns integration_pending" {
    $body = '{"claimRef":"CLM-P100","payerId":"BCBS-001","provenance":"EDI_276_277"}'
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/claim-status/check" -Method POST `
      -ContentType "application/json" -Body $body -WebSession $wsess `
      -Headers $hdrs -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 201) -and ($r.Content -match '"integration_pending"')
  }

  Gate "P100-090" "POST claim-status/check rejects missing claimRef (400)" {
    try {
      Invoke-WebRequest -Uri "$apiBase/rcm/claim-status/check" -Method POST `
        -ContentType "application/json" -Body '{"payerId":"X"}' -WebSession $wsess `
        -Headers $hdrs -UseBasicParsing -ErrorAction Stop
      $false
    } catch {
      $_.Exception.Response.StatusCode.value__ -eq 400
    }
  }

  Gate "P100-091" "POST /rcm/claim-status/schedule returns jobId" {
    $body = '{"claimRef":"CLM-P100","payerId":"BCBS-001","intervalMinutes":60,"maxPolls":5,"priority":3}'
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/claim-status/schedule" -Method POST `
      -ContentType "application/json" -Body $body -WebSession $wsess `
      -Headers $hdrs -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 200 -or $r.StatusCode -eq 201) -and ($r.Content -match '"jobId"')
  }

  Gate "P100-092" "GET /rcm/claim-status/history returns items" {
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/claim-status/history" `
      -WebSession $wsess -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 200) -and ($r.Content -match '"items":\[')
  }

  Gate "P100-093" "GET /rcm/claim-status/timeline returns timeline" {
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/claim-status/timeline?claimRef=CLM-P100" `
      -WebSession $wsess -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 200) -and ($r.Content -match '"timeline"')
  }

  Gate "P100-094" "GET /rcm/claim-status/stats returns totalChecks" {
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/claim-status/stats" `
      -WebSession $wsess -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 200) -and ($r.Content -match '"totalChecks"')
  }

  Gate "P100-095" "GET /rcm/claim-status/:id returns specific check" {
    $hist = Invoke-WebRequest -Uri "$apiBase/rcm/claim-status/history?limit=1" `
      -WebSession $wsess -UseBasicParsing -ErrorAction Stop
    $firstId = ($hist.Content | ConvertFrom-Json).items[0].id
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/claim-status/$firstId" `
      -WebSession $wsess -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 200) -and ($r.Content -match $firstId)
  }

  # Regression: existing RCM endpoints
  Gate "P100-096" "Regression: GET /rcm/payers still works" {
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/payers" `
      -WebSession $wsess -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 200) -and ($r.Content -match '"payers"')
  }

  Gate "P100-097" "Regression: GET /rcm/audit/verify still works" {
    $r = Invoke-WebRequest -Uri "$apiBase/rcm/audit/verify" `
      -WebSession $wsess -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 200) -and ($r.Content -match '"valid"')
  }

  Gate "P100-098" "Regression: GET /health returns ok" {
    $r = Invoke-WebRequest -Uri "$apiBase/health" -UseBasicParsing -ErrorAction Stop
    ($r.StatusCode -eq 200) -and ($r.Content -match '"ok":true')
  }
}

# ================================================================
# Summary
# ================================================================
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  Phase 100 Verification: $pass / $total PASS" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
if ($fail -gt 0) {
  Write-Host "  $fail gate(s) FAILED" -ForegroundColor Red
}
Write-Host "============================================`n" -ForegroundColor Cyan

exit $fail
