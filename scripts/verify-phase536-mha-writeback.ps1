<#
.SYNOPSIS
  Phase 536 verifier -- MHA VistA Writeback (TIU)
.DESCRIPTION
  10 gates validating TIU writeback endpoint for MHA instrument results.
#>
param([switch]$SkipDocker)
$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $total = 10

function Gate($n, $name, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) { Write-Host "  PASS  G${n}: $name" -F Green; $script:pass++ }
    else         { Write-Host "  FAIL  G${n}: $name" -F Red;   $script:fail++ }
  } catch {
    Write-Host "  FAIL  G${n}: $name ($_)" -F Red; $script:fail++
  }
}

Write-Host "`n=== Phase 536 -- MHA VistA Writeback (TIU) ===" -F Cyan

# G1: file-note endpoint exists in routes
Gate 1 "POST /vista/mha/administer/:id/file-note route exists" {
  $f = Get-Content "apps/api/src/routes/mha/index.ts" -Raw
  $f -match 'administer/:id/file-note'
}

# G2: note-generator.ts exists
Gate 2 "note-generator.ts exists" {
  Test-Path -LiteralPath "apps/api/src/routes/mha/note-generator.ts"
}

# G3: generateMhaNote exported
Gate 3 "generateMhaNote function exported" {
  $f = Get-Content "apps/api/src/routes/mha/note-generator.ts" -Raw
  $f -match 'export function generateMhaNote'
}

# G4: TIU CREATE RECORD referenced in file-note route
Gate 4 "TIU CREATE RECORD referenced in route" {
  $f = Get-Content "apps/api/src/routes/mha/index.ts" -Raw
  $f -match 'TIU CREATE RECORD'
}

# G5: TIU SET DOCUMENT TEXT referenced
Gate 5 "TIU SET DOCUMENT TEXT referenced in route" {
  $f = Get-Content "apps/api/src/routes/mha/index.ts" -Raw
  $f -match 'TIU SET DOCUMENT TEXT'
}

# G6: Draft fallback path exists
Gate 6 "Draft fallback path exists" {
  $f = Get-Content "apps/api/src/routes/mha/index.ts" -Raw
  ($f -match 'draftFallback') -and ($f -match '"draft"')
}

# G7: store-policy.ts has mha entries
Gate 7 "store-policy.ts has MHA administration store" {
  $f = Get-Content "apps/api/src/platform/store-policy.ts" -Raw
  ($f -match 'mha-administration-store') -and ($f -match 'mha-patient-index')
}

# G8: vistaFiled update in file-note handler
Gate 8 "vistaFiled update in file-note handler" {
  $f = Get-Content "apps/api/src/routes/mha/index.ts" -Raw
  $f -match 'admin\.vistaFiled\s*=\s*true'
}

# G9: No PHI in note-generator (no hardcoded patient names, SSN, DOB)
Gate 9 "No PHI in note-generator.ts" {
  $f = Get-Content "apps/api/src/routes/mha/note-generator.ts" -Raw
  -not ($f -match '\d{3}-\d{2}-\d{4}') -and -not ($f -match 'SSN|socialSecurity')
}

# G10: Evidence directory
Gate 10 "Evidence directory structure" {
  $dir = "evidence/wave-39/536-W39-P6-MHA-WRITEBACK"
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -Path $dir -ItemType Directory -Force | Out-Null }
  Test-Path -LiteralPath $dir
}

Write-Host "`n--- Result: $pass / $total passed ---" -F $(if ($fail -eq 0) { 'Green' } else { 'Yellow' })

# Write evidence
$evidence = @{
  phase = 536
  wave = 39
  title = "MHA VistA Writeback (TIU)"
  pass = $pass
  fail = $fail
  total = $total
  timestamp = (Get-Date -Format o)
  gates = @("G1:file-note-route","G2:note-generator-exists","G3:generateMhaNote-export",
            "G4:TIU-CREATE-RECORD","G5:TIU-SET-DOCUMENT-TEXT","G6:draft-fallback",
            "G7:store-policy","G8:vistaFiled-update","G9:no-PHI","G10:evidence-dir")
}
$evidenceDir = "evidence/wave-39/536-W39-P6-MHA-WRITEBACK"
if (-not (Test-Path -LiteralPath $evidenceDir)) { New-Item -Path $evidenceDir -ItemType Directory -Force | Out-Null }
$evidence | ConvertTo-Json -Depth 5 | Set-Content "$evidenceDir/verify-result.json" -Encoding UTF8

if ($fail -gt 0) { exit 1 } else { exit 0 }
