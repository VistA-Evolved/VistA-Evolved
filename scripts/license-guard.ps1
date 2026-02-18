param([switch]$Verbose)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$pass = 0
$fail = 0

function Write-Gate {
  param([string]$Name, [bool]$Ok, [string]$Detail = "")
  if ($Ok) {
    Write-Host "  [PASS] $Name" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  [FAIL] $Name - $Detail" -ForegroundColor Red
    $script:fail++
  }
}

function Get-SourceFiles {
  param([string[]]$Paths, [string[]]$Extensions)
  $results = @()
  foreach ($p in $Paths) {
    if (-not (Test-Path $p)) { continue }
    $results += Get-ChildItem -Path $p -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object {
        $_.Extension -in $Extensions -and
        $_.FullName -notmatch "[\\/]node_modules[\\/]" -and
        $_.FullName -notmatch "[\\/]\.next[\\/]" -and
        $_.FullName -notmatch "[\\/]dist[\\/]"
      }
  }
  return $results
}

Write-Host ""
Write-Host "=== License Guard - Phase 26 ===" -ForegroundColor Cyan

# Gate 1: No AIOTP code in apps/ or services/
Write-Host ""
Write-Host "--- Gate 1: No AIOTP code in source tree ---" -ForegroundColor Yellow

$aiotpPatterns = @("ciips-telesalud","ciips-code","openemr-telesalud","openemr-cdss-smart","PAHO","CC BY-NC-SA")
$sourceFiles = Get-SourceFiles -Paths @("$root\apps","$root\services") -Extensions @(".ts",".tsx",".js",".json",".md")
$aiotpViolations = @()

foreach ($pattern in $aiotpPatterns) {
  $found = $sourceFiles | Select-String -Pattern $pattern -SimpleMatch -ErrorAction SilentlyContinue
  if ($found) { $aiotpViolations += $found }
}

Write-Gate "No AIOTP code/references in apps/" ($aiotpViolations.Count -eq 0) "Found $($aiotpViolations.Count) AIOTP references"

# Gate 2: No VA-specific terminology in portal UI
Write-Host ""
Write-Host "--- Gate 2: No VA terminology in portal UI ---" -ForegroundColor Yellow

$portalDir = "$root\apps\portal\src"
$uiViolations = @()

if (Test-Path $portalDir) {
  $portalFiles = Get-SourceFiles -Paths @($portalDir) -Extensions @(".ts",".tsx")
  $vaTerms = @("CPRS","VistA","DUZ","DFN","FileMan","MUMPS")
  foreach ($term in $vaTerms) {
    $found = $portalFiles | Select-String -Pattern $term -SimpleMatch -ErrorAction SilentlyContinue |
      Where-Object { $_.Line -notmatch "^\s*//" -and $_.Line -notmatch "^\s*\*" }
    if ($found) {
      $stringHits = $found | Where-Object { $_.Line -match ('"[^"]*' + [regex]::Escape($term) + '[^"]*"') }
      if ($stringHits) { $uiViolations += $stringHits }
    }
  }
}

Write-Gate "No VA terms in portal UI strings" ($uiViolations.Count -eq 0) "Found $($uiViolations.Count) VA-specific terms"

# Gate 3: THIRD_PARTY_NOTICES.md exists
Write-Host ""
Write-Host "--- Gate 3: Attribution files ---" -ForegroundColor Yellow

Write-Gate "THIRD_PARTY_NOTICES.md exists" (Test-Path "$root\THIRD_PARTY_NOTICES.md")

# Gate 4: reference/ folder structure intact
Write-Host ""
Write-Host "--- Gate 4: Reference folders intact ---" -ForegroundColor Yellow

Write-Gate "HealtheMe reference present" (Test-Path "$root\reference\HealtheMe-master\LICENSE")
Write-Gate "Ottehr reference present" (Test-Path "$root\reference\ottehr ehr main")
Write-Gate "AIOTP reference present (observe only)" (Test-Path "$root\reference\All In One Telehealth Platform -AIOTP-")

# Gate 5: Portal contract exists
Write-Host ""
Write-Host "--- Gate 5: Portal contract artifacts ---" -ForegroundColor Yellow

$contractDir = "$root\docs\contracts\portal"
$contractFiles = @("vista-source-inventory.md","reference-repos-inventory.md","competitive-baseline.md","portal-contract-v1.yaml","portal-capability-matrix.md")

foreach ($f in $contractFiles) {
  Write-Gate "Contract: $f" (Test-Path "$contractDir\$f")
}

# Summary
Write-Host ""
Write-Host "=== License Guard Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
if ($fail -gt 0) {
  Write-Host "  FAIL: $fail" -ForegroundColor Red
  Write-Host ""
  Write-Host "  LICENSE VIOLATIONS DETECTED - fix before committing." -ForegroundColor Red
  exit 1
} else {
  Write-Host "  FAIL: $fail" -ForegroundColor Green
  Write-Host ""
  Write-Host "  All license checks passed." -ForegroundColor Green
  exit 0
}
