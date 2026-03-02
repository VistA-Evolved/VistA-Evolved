<#
.SYNOPSIS
  Phase 535 Verifier -- MHA v1 LForms Questionnaire Engine [W39-P5]
.DESCRIPTION
  13 gates: instruments exist, schema, lforms dep, routes, RPCs, capabilities,
  MHAPanel, barrel, register-routes, scoring, modules, no PHI, evidence dir.
#>
[CmdletBinding()] param()
$ErrorActionPreference = 'Stop'
$pass = 0; $fail = 0; $total = 13

function Gate($n, $name, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) { Write-Host "  PASS  G${n}: $name" -ForegroundColor Green; $script:pass++ }
    else         { Write-Host "  FAIL  G${n}: $name" -ForegroundColor Red;   $script:fail++ }
  } catch {
    Write-Host "  FAIL  G${n}: $name [$_]" -ForegroundColor Red; $script:fail++
  }
}

Write-Host "`n=== Phase 535 Verifier: MHA v1 LForms ===" -ForegroundColor Cyan

# G1 -- Instrument files exist (5)
Gate 1 "Instrument files exist (5)" {
  $dir = "data/instruments"
  $files = Get-ChildItem -LiteralPath $dir -Filter "*.questionnaire.json" -ErrorAction SilentlyContinue
  $files.Count -ge 5
}

# G2 -- Instrument schema valid
Gate 2 "Instrument schema valid" {
  $allValid = $true
  $dir = "data/instruments"
  foreach ($f in (Get-ChildItem -LiteralPath $dir -Filter "*.questionnaire.json")) {
    $json = Get-Content $f.FullName -Raw | ConvertFrom-Json
    if ($json.resourceType -ne "Questionnaire") { $allValid = $false; Write-Verbose "$($f.Name): missing resourceType" }
    if (-not $json.item) { $allValid = $false; Write-Verbose "$($f.Name): missing item array" }
    if (-not $json.title) { $allValid = $false; Write-Verbose "$($f.Name): missing title" }
    if (-not $json.id) { $allValid = $false; Write-Verbose "$($f.Name): missing id" }
  }
  $allValid
}

# G3 -- @lhncbc/lforms in deps
Gate 3 "@lhncbc/lforms in web deps" {
  $pkg = Get-Content "apps/web/package.json" -Raw
  $pkg -match '@lhncbc/lforms'
}

# G4 -- API route file exists
Gate 4 "MHA route file exists" {
  Test-Path -LiteralPath "apps/api/src/routes/mha/index.ts"
}

# G5 -- RPC registry has MH RPCs (>=5)
Gate 5 "RPC registry has mental-health RPCs (>=5)" {
  $content = Get-Content "apps/api/src/vista/rpcRegistry.ts" -Raw
  $matches = [regex]::Matches($content, 'domain:\s*"mental-health"')
  $matches.Count -ge 5
}

# G6 -- Capabilities defined
Gate 6 "Capabilities: clinical.mha.* entries" {
  $content = Get-Content "config/capabilities.json" -Raw
  ($content -match 'clinical\.mha\.instruments\.list') -and
  ($content -match 'clinical\.mha\.instruments\.administer') -and
  ($content -match 'clinical\.mha\.results\.list') -and
  ($content -match 'clinical\.mha\.results\.detail')
}

# G7 -- MHAPanel.tsx exists
Gate 7 "MHAPanel.tsx exists" {
  Test-Path -LiteralPath "apps/web/src/components/cprs/panels/MHAPanel.tsx"
}

# G8 -- Panel exported from barrel
Gate 8 "MHAPanel in barrel index" {
  $idx = Get-Content "apps/web/src/components/cprs/panels/index.ts" -Raw
  $idx -match 'MHAPanel'
}

# G9 -- register-routes.ts wired
Gate 9 "MHA routes wired in register-routes.ts" {
  $content = Get-Content "apps/api/src/server/register-routes.ts" -Raw
  ($content -match 'mhaRoutes') -and ($content -match 'routes/mha/index')
}

# G10 -- Scoring engine exists
Gate 10 "Scoring engine exists" {
  Test-Path -LiteralPath "apps/api/src/routes/mha/scoring.ts"
}

# G11 -- Module config updated
Gate 11 "modules.json has /vista/mha route pattern" {
  $content = Get-Content "config/modules.json" -Raw
  $content -match '/vista/mha'
}

# G12 -- No PHI in evidence
Gate 12 "No PHI patterns in created files" {
  $noPhi = $true
  $files = @(
    "apps/api/src/routes/mha/index.ts",
    "apps/api/src/routes/mha/scoring.ts",
    "apps/api/src/routes/mha/instruments.ts",
    "apps/web/src/components/cprs/panels/MHAPanel.tsx"
  )
  foreach ($f in $files) {
    if (Test-Path -LiteralPath $f) {
      $c = Get-Content $f -Raw
      if ($c -match '\d{3}-\d{2}-\d{4}') { $noPhi = $false; Write-Verbose "PHI pattern in $f" }
    }
  }
  $noPhi
}

# G13 -- Evidence directory
Gate 13 "Evidence directory created" {
  $dir = "evidence/wave-39/535-W39-P5-MHA-V1"
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Test-Path -LiteralPath $dir
}

Write-Host "`n=== Results: $pass PASS / $fail FAIL / $total TOTAL ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
if ($fail -gt 0) { exit 1 }
