<# Phase 251 - API + FHIR Contract Verification (Wave 7 P4) #>
param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $warn = 0
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)

function Gate($name, $ok, $detail) {
  if ($ok) { Write-Host "  PASS  $name" -ForegroundColor Green; $script:pass++ }
  else     { Write-Host "  FAIL  $name -- $detail" -ForegroundColor Red; $script:fail++ }
}
function Warn($name, $detail) {
  Write-Host "  WARN  $name -- $detail" -ForegroundColor Yellow; $script:warn++
}

Write-Host "`n=== Phase 251: API + FHIR Contract Verification ===" -ForegroundColor Cyan

# --- G1: api-contracts directory ---
$contractsDir = Join-Path $root "apps\api\src\api-contracts"
Gate "G01 api-contracts/ dir" (Test-Path -LiteralPath $contractsDir) "missing"

# --- G2: route-contracts.ts exists ---
$routeFile = Join-Path $contractsDir "route-contracts.ts"
Gate "G02 route-contracts.ts" (Test-Path -LiteralPath $routeFile) "missing"

# --- G3: barrel index ---
$barrelFile = Join-Path $contractsDir "index.ts"
Gate "G03 barrel index" (Test-Path -LiteralPath $barrelFile) "missing"

# --- G4: >= 25 route contracts ---
if (Test-Path -LiteralPath $routeFile) {
  $content = Get-Content $routeFile -Raw
  $matches = [regex]::Matches($content, 'path:\s*[''"]')
  Gate "G04 >= 25 route contracts" ($matches.Count -ge 25) "found $($matches.Count)"
} else {
  Gate "G04 >= 25 route contracts" $false "file not found"
}

# --- G5: covers 5 domains ---
if (Test-Path -LiteralPath $routeFile) {
  $domains = @("infra","auth","clinical","fhir","admin")
  $allDomains = $true
  foreach ($d in $domains) {
    if ($content -notmatch "domain:\s*['""]$d") { $allDomains = $false; break }
  }
  Gate "G05 5 domain coverage" $allDomains "missing domain"
} else {
  Gate "G05 5 domain coverage" $false "file not found"
}

# --- G6: FHIR metadata contract ---
if (Test-Path -LiteralPath $routeFile) {
  Gate "G06 FHIR metadata contract" ($content -match '/fhir/metadata') "missing"
} else {
  Gate "G06 FHIR metadata contract" $false "file not found"
}

# --- G7: all 7 FHIR resource types ---
$fhirTypes = @("Patient","AllergyIntolerance","Condition","Observation","MedicationRequest","DocumentReference","Encounter")
$allFhir = $true
if (Test-Path -LiteralPath $routeFile) {
  foreach ($ft in $fhirTypes) {
    if ($content -notmatch "/fhir/$ft") { $allFhir = $false; break }
  }
}
Gate "G07 7 FHIR resource types" $allFhir "missing FHIR type"

# --- G8: SMART discovery contract ---
if (Test-Path -LiteralPath $routeFile) {
  Gate "G08 SMART discovery" ($content -match 'smart-configuration') "missing"
} else {
  Gate "G08 SMART discovery" $false "file not found"
}

# --- G9: API contract test exists ---
$apiTest = Join-Path $root "apps\api\tests\api-contract-verification.test.ts"
Gate "G09 API contract test" (Test-Path -LiteralPath $apiTest) "missing"

# --- G10: FHIR contract test exists ---
$fhirTest = Join-Path $root "apps\api\tests\fhir-contract-verification.test.ts"
Gate "G10 FHIR contract test" (Test-Path -LiteralPath $fhirTest) "missing"

# --- G11: API test imports route contracts ---
if (Test-Path -LiteralPath $apiTest) {
  $apiTestContent = Get-Content $apiTest -Raw
  Gate "G11 API test imports" ($apiTestContent -match 'api-contracts') "no import"
} else {
  Gate "G11 API test imports" $false "test not found"
}

# --- G12: FHIR test imports capability statement ---
if (Test-Path -LiteralPath $fhirTest) {
  $fhirTestContent = Get-Content $fhirTest -Raw
  Gate "G12 FHIR test imports" ($fhirTestContent -match 'capability-statement') "no import"
} else {
  Gate "G12 FHIR test imports" $false "test not found"
}

# --- G13: prompt folder ---
$promptDir = Join-Path $root "prompts\248-PHASE-251-API-FHIR-CONTRACT-VERIFICATION"
Gate "G13 prompt folder" (Test-Path -LiteralPath $promptDir) "missing"

# --- G14: IMPLEMENT prompt ---
$implFile = Join-Path $promptDir "251-01-IMPLEMENT.md"
Gate "G14 IMPLEMENT prompt" (Test-Path -LiteralPath $implFile) "missing"

# --- G15: VERIFY prompt ---
$verFile = Join-Path $promptDir "251-99-VERIFY.md"
Gate "G15 VERIFY prompt" (Test-Path -LiteralPath $verFile) "missing"

# --- G16: evidence dir ---
$evidDir = Join-Path $root "evidence\wave-7\P4"
Gate "G16 evidence dir" (Test-Path -LiteralPath $evidDir) "missing"

# --- G17: TypeScript compiles ---
Write-Host "`n  Running tsc build check..." -ForegroundColor Gray
Push-Location (Join-Path $root "apps\api")
$buildResult = & pnpm exec tsc --noEmit 2>&1
$buildOk = $LASTEXITCODE -eq 0
Pop-Location
Gate "G17 TypeScript compiles" $buildOk "tsc errors"

# --- G18: Auth level types exported ---
if (Test-Path -LiteralPath $barrelFile) {
  $barrelContent = Get-Content $barrelFile -Raw
  Gate "G18 AuthLevel exported" ($barrelContent -match 'AuthLevel') "not exported"
} else {
  Gate "G18 AuthLevel exported" $false "barrel not found"
}

# --- Summary ---
Write-Host "`n--- Phase 251 Results ---" -ForegroundColor Cyan
Write-Host "  PASS: $pass  FAIL: $fail  WARN: $warn"
if ($fail -gt 0) { Write-Host "  VERDICT: FAIL" -ForegroundColor Red; exit 1 }
else { Write-Host "  VERDICT: PASS" -ForegroundColor Green; exit 0 }
