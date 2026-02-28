#!/usr/bin/env pwsh
<#
  Phase 241 -- HL7v2 Core Message Packs  (Wave 6 P4)
  Verification script -- 8 gates
#>
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 8

function gate($n, $label, [scriptblock]$test) {
  try {
    $ok = & $test
    if ($ok) { Write-Host "  PASS  gate $n -- $label" -ForegroundColor Green; $script:pass++ }
    else     { Write-Host "  FAIL  gate $n -- $label" -ForegroundColor Red;   $script:fail++ }
  } catch {
    Write-Host "  FAIL  gate $n -- $label ($_)" -ForegroundColor Red; $script:fail++
  }
}

Write-Host "`n=== Phase 241 (Wave 6 P4): HL7v2 Core Message Packs ===`n"

# Gate 1: All pack files exist
gate 1 "All P4 source files exist" {
  $files = @(
    "apps/api/src/hl7/packs/types.ts",
    "apps/api/src/hl7/packs/adt-pack.ts",
    "apps/api/src/hl7/packs/orm-pack.ts",
    "apps/api/src/hl7/packs/oru-pack.ts",
    "apps/api/src/hl7/packs/siu-pack.ts",
    "apps/api/src/hl7/packs/index.ts",
    "apps/api/src/routes/hl7-packs.ts"
  )
  $allExist = $true
  foreach ($f in $files) {
    if (-not (Test-Path -LiteralPath $f)) {
      Write-Host "    Missing: $f" -ForegroundColor Yellow
      $allExist = $false
    }
  }
  $allExist
}

# Gate 2: TypeScript compiles
gate 2 "TypeScript compiles clean" {
  $out = pnpm --filter api build 2>&1 | Out-String
  $LASTEXITCODE -eq 0
}

# Gate 3: Pack registry has adt, orm, oru, siu
gate 3 "Pack registry has all 4 packs" {
  $content = Get-Content "apps/api/src/hl7/packs/index.ts" -Raw
  ($content -match 'registerPack\(adtPack\)') -and
  ($content -match 'registerPack\(ormPack\)') -and
  ($content -match 'registerPack\(oruPack\)') -and
  ($content -match 'registerPack\(siuPack\)')
}

# Gate 4: ADT pack has builders + validator
gate 4 "ADT pack has builders + validator" {
  $content = Get-Content "apps/api/src/hl7/packs/adt-pack.ts" -Raw
  ($content -match 'export function buildAdtA01') -and
  ($content -match 'export function validateAdtMessage')
}

# Gate 5: ORM pack has builder + validator
gate 5 "ORM pack has builder + validator" {
  $content = Get-Content "apps/api/src/hl7/packs/orm-pack.ts" -Raw
  ($content -match 'export function buildOrmO01') -and
  ($content -match 'export function validateOrmMessage')
}

# Gate 6: ORU pack has builder + validator
gate 6 "ORU pack has builder + validator" {
  $content = Get-Content "apps/api/src/hl7/packs/oru-pack.ts" -Raw
  ($content -match 'export function buildOruR01') -and
  ($content -match 'export function validateOruMessage')
}

# Gate 7: SIU pack has builders + validator
gate 7 "SIU pack has builders + validator" {
  $content = Get-Content "apps/api/src/hl7/packs/siu-pack.ts" -Raw
  ($content -match 'export function buildSiuS12') -and
  ($content -match 'export function validateSiuMessage')
}

# Gate 8: No console.log in pack files
gate 8 "No console.log in pack files" {
  $packFiles = Get-ChildItem "apps/api/src/hl7/packs" -Filter "*.ts" -Recurse
  $routeFile = Get-Item "apps/api/src/routes/hl7-packs.ts"
  $allFiles = @($packFiles) + @($routeFile)
  $hits = $allFiles | Select-String -Pattern 'console\.log' -SimpleMatch
  $hits.Count -eq 0
}

Write-Host "`n--- Result: $pass / $total passed, $fail failed ---"
if ($fail -gt 0) { exit 1 } else { exit 0 }
