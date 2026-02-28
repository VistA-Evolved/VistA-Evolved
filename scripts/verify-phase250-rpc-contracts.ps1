<# Phase 250 - VistA RPC Contract Harness Verifier (Wave 7 P3) #>
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

Write-Host "`n=== Phase 250: VistA RPC Contract Harness ===" -ForegroundColor Cyan

# --- G1: contracts directory exists ---
$contractsDir = Join-Path $root "apps\api\src\vista\contracts"
Gate "G01 contracts/ dir" (Test-Path -LiteralPath $contractsDir) "missing contracts directory"

# --- G2: core contract files exist ---
$coreFiles = @("rpc-contracts.ts","sanitize.ts","modes.ts","index.ts")
$allExist = $true
foreach ($f in $coreFiles) {
  if (-not (Test-Path -LiteralPath (Join-Path $contractsDir $f))) { $allExist = $false; break }
}
Gate "G02 core contract files" $allExist "missing one or more: $($coreFiles -join ', ')"

# --- G3: at least 10 RPCs contracted ---
$contractFile = Join-Path $contractsDir "rpc-contracts.ts"
if (Test-Path -LiteralPath $contractFile) {
  $content = Get-Content $contractFile -Raw
  $matches = [regex]::Matches($content, 'rpcName:\s*[''"]')
  Gate "G03 >= 10 contracted RPCs" ($matches.Count -ge 10) "found $($matches.Count)"
} else {
  Gate "G03 >= 10 contracted RPCs" $false "rpc-contracts.ts not found"
}

# --- G4: sanitize.ts has PHI deny patterns ---
$sanitizeFile = Join-Path $contractsDir "sanitize.ts"
if (Test-Path -LiteralPath $sanitizeFile) {
  $san = Get-Content $sanitizeFile -Raw
  $hasSSN = $san -match 'SSN|ssn|\d{3}-\d{2}-\d{4}'
  $hasDOB = $san -match 'DOB|dob|date.of.birth'
  Gate "G04 PHI deny patterns" ($hasSSN -and $hasDOB) "missing SSN or DOB patterns"
} else {
  Gate "G04 PHI deny patterns" $false "sanitize.ts not found"
}

# --- G5: modes.ts supports RECORD/REPLAY ---
$modesFile = Join-Path $contractsDir "modes.ts"
if (Test-Path -LiteralPath $modesFile) {
  $modes = Get-Content $modesFile -Raw
  $hasRecord = $modes -match 'record'
  $hasReplay = $modes -match 'replay'
  Gate "G05 RECORD/REPLAY modes" ($hasRecord -and $hasReplay) "missing record or replay"
} else {
  Gate "G05 RECORD/REPLAY modes" $false "modes.ts not found"
}

# --- G6: fixtures directory with >= 20 JSON files ---
$fixtureDir = Join-Path $root "apps\api\tests\fixtures\vista"
if (Test-Path -LiteralPath $fixtureDir) {
  $jsonFiles = Get-ChildItem -LiteralPath $fixtureDir -Recurse -Filter "*.json"
  Gate "G06 >= 20 fixture files" ($jsonFiles.Count -ge 20) "found $($jsonFiles.Count)"
} else {
  Gate "G06 >= 20 fixture files" $false "fixtures/vista/ not found"
}

# --- G7: each contracted RPC has success + empty fixtures ---
$rpcNames = @(
  "XUS_SIGNON_SETUP","ORWPT_LIST_ALL","ORQQAL_LIST","GMV_VM_ALLDATA",
  "ORWPS_ACTIVE","ORQQPL_LIST","TIU_DOCUMENTS_BY_CONTEXT",
  "ORWORB_FASTUSER","ORWLRR_INTERIMG","ORQPT_DEFAULT_LIST_SOURCE"
)
$allFixtures = $true
foreach ($rpc in $rpcNames) {
  $sPath = Join-Path $fixtureDir "$rpc\success.json"
  $ePath = Join-Path $fixtureDir "$rpc\empty.json"
  if (-not (Test-Path -LiteralPath $sPath) -or -not (Test-Path -LiteralPath $ePath)) {
    $allFixtures = $false
    break
  }
}
Gate "G07 all RPCs have success+empty" $allFixtures "missing fixture pair"

# --- G8: no SSN patterns in fixture files ---
$ssnHit = $false
if (Test-Path -LiteralPath $fixtureDir) {
  $allJson = Get-ChildItem -LiteralPath $fixtureDir -Recurse -Filter "*.json"
  foreach ($jf in $allJson) {
    $jContent = Get-Content $jf.FullName -Raw
    if ($jContent -match '\b\d{3}-\d{2}-\d{4}\b') { $ssnHit = $true; break }
  }
}
Gate "G08 no SSN in fixtures" (-not $ssnHit) "SSN pattern found"

# --- G9: no real patient names in fixture files ---
$nameHit = $false
if (Test-Path -LiteralPath $fixtureDir) {
  foreach ($jf in $allJson) {
    $jContent = Get-Content $jf.FullName -Raw
    # Check for PROV123 or NURSE123 or known credentials
    if ($jContent -match 'PROV123|NURSE123|PHARM123') { $nameHit = $true; break }
  }
}
Gate "G09 no credentials in fixtures" (-not $nameHit) "credential pattern found"

# --- G10: replay test suite exists ---
$testFile = Join-Path $root "apps\api\tests\rpc-contract-replay.test.ts"
Gate "G10 replay test suite" (Test-Path -LiteralPath $testFile) "missing test file"

# --- G11: replay test imports from contracts ---
if (Test-Path -LiteralPath $testFile) {
  $testContent = Get-Content $testFile -Raw
  $importsContracts = $testContent -match 'vista/contracts'
  Gate "G11 test imports contracts" $importsContracts "no import from vista/contracts"
} else {
  Gate "G11 test imports contracts" $false "test file not found"
}

# --- G12: record tool exists ---
$recordTool = Join-Path $root "scripts\vista-contracts-record.ts"
Gate "G12 record tool exists" (Test-Path -LiteralPath $recordTool) "missing record tool"

# --- G13: record tool has safety guard ---
if (Test-Path -LiteralPath $recordTool) {
  $recContent = Get-Content $recordTool -Raw
  Gate "G13 record tool safety" ($recContent -match 'VISTA_CONTRACT_MODE') "no mode check"
} else {
  Gate "G13 record tool safety" $false "record tool not found"
}

# --- G14: barrel index exports all modules ---
$barrelFile = Join-Path $contractsDir "index.ts"
if (Test-Path -LiteralPath $barrelFile) {
  $barrel = Get-Content $barrelFile -Raw
  $exportsAll = ($barrel -match 'rpc-contracts') -and ($barrel -match 'sanitize') -and ($barrel -match 'modes')
  Gate "G14 barrel exports" $exportsAll "index.ts missing exports"
} else {
  Gate "G14 barrel exports" $false "index.ts not found"
}

# --- G15: prompt folder exists ---
$promptDir = Join-Path $root "prompts\247-PHASE-250-RPC-CONTRACT-HARNESS"
Gate "G15 prompt folder" (Test-Path -LiteralPath $promptDir) "missing prompt folder"

# --- G16: IMPLEMENT prompt ---
$implFile = Join-Path $promptDir "250-01-IMPLEMENT.md"
Gate "G16 IMPLEMENT prompt" (Test-Path -LiteralPath $implFile) "missing 250-01-IMPLEMENT.md"

# --- G17: VERIFY prompt ---
$verFile = Join-Path $promptDir "250-99-VERIFY.md"
Gate "G17 VERIFY prompt" (Test-Path -LiteralPath $verFile) "missing 250-99-VERIFY.md"

# --- G18: evidence directory ---
$evidDir = Join-Path $root "evidence\wave-7\P3"
Gate "G18 evidence dir" (Test-Path -LiteralPath $evidDir) "missing evidence/wave-7/P3"

# --- G19: TypeScript builds clean ---
Write-Host "`n  Running tsc build check..." -ForegroundColor Gray
Push-Location (Join-Path $root "apps\api")
$buildResult = & pnpm exec tsc --noEmit 2>&1
$buildOk = $LASTEXITCODE -eq 0
Pop-Location
Gate "G19 TypeScript compiles" $buildOk "tsc errors found"

# --- G20: fixtures are valid JSON ---
$jsonValid = $true
if (Test-Path -LiteralPath $fixtureDir) {
  foreach ($jf in (Get-ChildItem -LiteralPath $fixtureDir -Recurse -Filter "*.json")) {
    try {
      $raw = Get-Content $jf.FullName -Raw
      if ($raw.Length -gt 0 -and $raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
      $null = ConvertFrom-Json $raw
    } catch {
      $jsonValid = $false
      break
    }
  }
}
Gate "G20 all fixtures valid JSON" $jsonValid "invalid JSON found"

# --- Summary ---
Write-Host "`n--- Phase 250 Results ---" -ForegroundColor Cyan
Write-Host "  PASS: $pass  FAIL: $fail  WARN: $warn"
if ($fail -gt 0) { Write-Host "  VERDICT: FAIL" -ForegroundColor Red; exit 1 }
else { Write-Host "  VERDICT: PASS" -ForegroundColor Green; exit 0 }
