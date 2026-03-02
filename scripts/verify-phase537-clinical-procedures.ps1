<#
.SYNOPSIS
  Phase 537 verifier -- Clinical Procedures v1 (CP/MD)
.DESCRIPTION
  12 gates validating CP/MD route module, RPCs, capabilities, panel, and wiring.
#>
param([switch]$SkipDocker)
$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $total = 12

function Gate($n, $name, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) { Write-Host "  PASS  G${n}: $name" -F Green; $script:pass++ }
    else         { Write-Host "  FAIL  G${n}: $name" -F Red;   $script:fail++ }
  } catch {
    Write-Host "  FAIL  G${n}: $name ($_)" -F Red; $script:fail++
  }
}

Write-Host "`n=== Phase 537 -- Clinical Procedures v1 (CP/MD) ===" -F Cyan

Gate 1 "Route file exists" {
  Test-Path -LiteralPath "apps/api/src/routes/clinical-procedures/index.ts"
}

Gate 2 "GET /vista/clinical-procedures route" {
  $f = Get-Content "apps/api/src/routes/clinical-procedures/index.ts" -Raw
  $f -match '/vista/clinical-procedures"'
}

Gate 3 "GET /vista/clinical-procedures/:id route" {
  $f = Get-Content "apps/api/src/routes/clinical-procedures/index.ts" -Raw
  $f -match '/vista/clinical-procedures/:id'
}

Gate 4 "GET /vista/clinical-procedures/medicine route" {
  $f = Get-Content "apps/api/src/routes/clinical-procedures/index.ts" -Raw
  $f -match '/vista/clinical-procedures/medicine'
}

Gate 5 "integration-pending pattern" {
  $f = Get-Content "apps/api/src/routes/clinical-procedures/index.ts" -Raw
  $f -match 'integration-pending'
}

Gate 6 "vistaGrounding metadata" {
  $f = Get-Content "apps/api/src/routes/clinical-procedures/index.ts" -Raw
  $f -match 'vistaGrounding'
}

Gate 7 "rpcRegistry has MD RPCs (>=5)" {
  $f = Get-Content "apps/api/src/vista/rpcRegistry.ts" -Raw
  $matches = [regex]::Matches($f, 'domain:\s*"clinical-procedures"')
  $matches.Count -ge 5
}

Gate 8 "capabilities.json has clinical.procedures entries" {
  $f = Get-Content "config/capabilities.json" -Raw
  ($f -match 'clinical\.procedures\.list') -and ($f -match 'clinical\.procedures\.detail') -and ($f -match 'clinical\.procedures\.medicine')
}

Gate 9 "modules.json has clinical-procedures route pattern" {
  $f = Get-Content "config/modules.json" -Raw
  $f -match 'clinical-procedures'
}

Gate 10 "ClinicalProceduresPanel.tsx exists" {
  Test-Path -LiteralPath "apps/web/src/components/cprs/panels/ClinicalProceduresPanel.tsx"
}

Gate 11 "Panel barrel exports ClinicalProceduresPanel" {
  $f = Get-Content "apps/web/src/components/cprs/panels/index.ts" -Raw
  $f -match 'ClinicalProceduresPanel'
}

Gate 12 "register-routes.ts wired" {
  $f = Get-Content "apps/api/src/server/register-routes.ts" -Raw
  ($f -match 'clinicalProceduresRoutes') -and ($f -match 'clinical-procedures/index')
}

Write-Host "`n--- Result: $pass / $total passed ---" -F $(if ($fail -eq 0) { 'Green' } else { 'Yellow' })

$evidenceDir = "evidence/wave-39/537-W39-P7-CLINICAL-PROCEDURES"
if (-not (Test-Path -LiteralPath $evidenceDir)) { New-Item -Path $evidenceDir -ItemType Directory -Force | Out-Null }
@{
  phase = 537; wave = 39; title = "Clinical Procedures v1 (CP/MD)"
  pass = $pass; fail = $fail; total = $total
  timestamp = (Get-Date -Format o)
} | ConvertTo-Json -Depth 5 | Set-Content "$evidenceDir/verify-result.json" -Encoding UTF8

if ($fail -gt 0) { exit 1 } else { exit 0 }
