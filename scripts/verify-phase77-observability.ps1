<#
.SYNOPSIS
    Phase 77 Verifier -- Observability + Reliability v1
.DESCRIPTION
    69 gates across 6 categories:
      A. Correlation ID (10)   B. Tracing (12)
      C. Metrics + SLO (15)    D. PHI-Safe Telemetry (15)
      E. Observability Config (8)  F. Structural Integrity (9)
#>
param([switch]$SkipDocker)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path "$root\apps")) { $root = Split-Path -Parent $PSScriptRoot }
if (-not (Test-Path "$root\apps")) { $root = $PSScriptRoot -replace '\\scripts$','' }

$pass = 0; $fail = 0; $total = 0
$results = @()

function Gate([string]$id, [string]$desc, [bool]$ok) {
    $script:total++
    $status = if ($ok) { $script:pass++; 'PASS' } else { $script:fail++; 'FAIL' }
    $symbol = if ($ok) { '  ' } else { 'X ' }
    Write-Host "$symbol [$status] $id -- $desc"
    $script:results += @{ id = $id; desc = $desc; pass = $ok }
}

Write-Host ""
Write-Host "============================================================"
Write-Host " Phase 77 Verifier -- Observability + Reliability v1"
Write-Host "============================================================"
Write-Host ""

# ================================================================
# A. Correlation ID Gates (10)
# ================================================================
Write-Host "--- A. Correlation ID Gates ---"

$fetchCorr = "$root\apps\web\src\lib\fetch-with-correlation.ts"
Gate "A01" "fetch-with-correlation.ts exists" (Test-Path -LiteralPath $fetchCorr)

if (Test-Path -LiteralPath $fetchCorr) {
    $fc = Get-Content $fetchCorr -Raw
    Gate "A02" "exports correlatedFetch" ($fc -match 'export\s+(async\s+)?function\s+correlatedFetch')
    Gate "A03" "generates X-Request-Id header" ($fc -match 'X-Request-Id')
    Gate "A04" "exports correlatedGet" ($fc -match 'export\s+(async\s+)?function\s+correlatedGet')
    Gate "A05" "exports correlatedPost" ($fc -match 'export\s+(async\s+)?function\s+correlatedPost')
    Gate "A06" "includes credentials: include" ($fc -match "credentials.*[':]+.*include")
} else {
    Gate "A02" "exports correlatedFetch" $false
    Gate "A03" "generates X-Request-Id header" $false
    Gate "A04" "exports correlatedGet" $false
    Gate "A05" "exports correlatedPost" $false
    Gate "A06" "includes credentials: include" $false
}

$apiTs = "$root\apps\web\src\lib\api.ts"
if (Test-Path -LiteralPath $apiTs) {
    $api = Get-Content $apiTs -Raw
    Gate "A07" "api.ts imports from fetch-with-correlation" ($api -match 'fetch-with-correlation')
} else {
    Gate "A07" "api.ts imports from fetch-with-correlation" $false
}

$dcTs = "$root\apps\web\src\stores\data-cache.tsx"
if (Test-Path -LiteralPath $dcTs) {
    $dc = Get-Content $dcTs -Raw
    Gate "A08" "data-cache.tsx imports from fetch-with-correlation" ($dc -match 'fetch-with-correlation')
} else {
    Gate "A08" "data-cache.tsx imports from fetch-with-correlation" $false
}

$secTs = "$root\apps\api\src\middleware\security.ts"
if (Test-Path -LiteralPath $secTs) {
    $sec = Get-Content $secTs -Raw
    Gate "A09" "security.ts reads x-request-id from request" ($sec -match 'x-request-id')
    Gate "A10" "security.ts sets X-Request-Id on response" ($sec -match 'X-Request-Id')
} else {
    Gate "A09" "security.ts reads x-request-id from request" $false
    Gate "A10" "security.ts sets X-Request-Id on response" $false
}

# ================================================================
# B. Tracing Gates (12)
# ================================================================
Write-Host ""
Write-Host "--- B. Tracing Gates ---"

$spansTs = "$root\apps\api\src\telemetry\spans.ts"
Gate "B01" "spans.ts exists" (Test-Path -LiteralPath $spansTs)

if (Test-Path -LiteralPath $spansTs) {
    $sp = Get-Content $spansTs -Raw
    Gate "B02" "spans.ts exports withSpan" ($sp -match 'export\s+(async\s+)?function\s+withSpan')
    Gate "B03" "spans.ts exports spanBusinessAction" ($sp -match 'export\s+function\s+spanBusinessAction')
    Gate "B04" "spans.ts exports spanModuleToggle" ($sp -match 'export\s+function\s+spanModuleToggle')
    Gate "B05" "spans.ts exports spanRcmOperation" ($sp -match 'export\s+function\s+spanRcmOperation')
    Gate "B06" "spans.ts exports endBusinessSpan" ($sp -match 'export\s+function\s+endBusinessSpan')
    Gate "B07" "spans.ts imports from tracing.ts" ($sp -match 'from.*tracing')
    Gate "B08" "spans.ts imports assertNoPhiInAttributes" ($sp -match 'assertNoPhiInAttributes')
} else {
    Gate "B02" "spans.ts exports withSpan" $false
    Gate "B03" "spans.ts exports spanBusinessAction" $false
    Gate "B04" "spans.ts exports spanModuleToggle" $false
    Gate "B05" "spans.ts exports spanRcmOperation" $false
    Gate "B06" "spans.ts exports endBusinessSpan" $false
    Gate "B07" "spans.ts imports from tracing.ts" $false
    Gate "B08" "spans.ts imports assertNoPhiInAttributes" $false
}

$tracingTs = "$root\apps\api\src\telemetry\tracing.ts"
if (Test-Path -LiteralPath $tracingTs) {
    $tr = Get-Content $tracingTs -Raw
    Gate "B09" "tracing.ts has initTracing" ($tr -match 'function\s+initTracing')
    Gate "B10" "tracing.ts has shutdownTracing" ($tr -match 'function\s+shutdownTracing')
    Gate "B11" "tracing.ts has startRpcSpan" ($tr -match 'function\s+startRpcSpan')
} else {
    Gate "B09" "tracing.ts has initTracing" $false
    Gate "B10" "tracing.ts has shutdownTracing" $false
    Gate "B11" "tracing.ts has startRpcSpan" $false
}

$indexTs = "$root\apps\api\src\index.ts"
if (Test-Path -LiteralPath $indexTs) {
    $idx = Get-Content $indexTs -Raw
    Gate "B12" "index.ts calls initTracing and bridgeTracingToLogger" (($idx -match 'initTracing') -and ($idx -match 'bridgeTracingToLogger'))
} else {
    Gate "B12" "index.ts calls initTracing and bridgeTracingToLogger" $false
}

# ================================================================
# C. Metrics + SLO Gates (15)
# ================================================================
Write-Host ""
Write-Host "--- C. Metrics + SLO Gates ---"

$metricsTs = "$root\apps\api\src\telemetry\metrics.ts"
if (Test-Path -LiteralPath $metricsTs) {
    $met = Get-Content $metricsTs -Raw
    Gate "C01" "metrics.ts has http_request_duration_seconds histogram" ($met -match 'http_request_duration_seconds')
    Gate "C02" "metrics.ts has http_requests_total counter" ($met -match 'http_requests_total')
    Gate "C03" "metrics.ts has vista_rpc_call_duration_seconds histogram" ($met -match 'vista_rpc_call_duration_seconds')
    Gate "C04" "metrics.ts has vista_rpc_calls_total counter" ($met -match 'vista_rpc_calls_total')
    Gate "C05" "metrics.ts has circuit_breaker_state gauge" ($met -match 'circuit_breaker_state')
    Gate "C06" "metrics.ts has sanitizeRoute function" ($met -match 'function\s+sanitizeRoute')
    Gate "C07" "metrics.ts has getPrometheusMetrics export" ($met -match 'function\s+getPrometheusMetrics')
    Gate "C08" "metrics.ts has sloLatencyWithinBudget gauge" ($met -match 'slo_latency_within_budget')
    Gate "C09" "metrics.ts has sloErrorBudgetRemaining gauge" ($met -match 'slo_error_budget_remaining')
    Gate "C10" "metrics.ts has recordSloSample function" ($met -match 'function\s+recordSloSample')
} else {
    for ($i = 1; $i -le 10; $i++) {
        Gate "C$('{0:D2}' -f $i)" "metrics.ts gate $i" $false
    }
}

# Performance budgets file
$budgets = "$root\config\performance-budgets.json"
Gate "C11" "performance-budgets.json exists" (Test-Path -LiteralPath $budgets)

if (Test-Path -LiteralPath $budgets) {
    $bj = Get-Content $budgets -Raw
    Gate "C12" "budgets has apiLatencyBudgets" ($bj -match 'apiLatencyBudgets')
    Gate "C13" "budgets has vistaRpcBudgets" ($bj -match 'vistaRpcBudgets')
    Gate "C14" "budgets has loadTestThresholds" ($bj -match 'loadTestThresholds')
} else {
    Gate "C12" "budgets has apiLatencyBudgets" $false
    Gate "C13" "budgets has vistaRpcBudgets" $false
    Gate "C14" "budgets has loadTestThresholds" $false
}

# Metrics endpoint in auth bypass
if (Test-Path -LiteralPath $secTs) {
    $sec = Get-Content $secTs -Raw
    Gate "C15" "/metrics in AUTH_RULES bypass" ($sec -match 'metrics')
} else {
    Gate "C15" "/metrics in AUTH_RULES bypass" $false
}

# ================================================================
# D. PHI-Safe Telemetry Gates (15)
# ================================================================
Write-Host ""
Write-Host "--- D. PHI-Safe Telemetry Gates ---"

$phiTs = "$root\apps\api\src\lib\phi-redaction.ts"
if (Test-Path -LiteralPath $phiTs) {
    $phi = Get-Content $phiTs -Raw
    Gate "D01" "phi-redaction.ts exports CREDENTIAL_FIELDS" ($phi -match 'export\s+const\s+CREDENTIAL_FIELDS')
    Gate "D02" "phi-redaction.ts exports PHI_FIELDS" ($phi -match 'export\s+const\s+PHI_FIELDS')
    Gate "D03" "phi-redaction.ts exports ALL_BLOCKED_FIELDS" ($phi -match 'export\s+const\s+ALL_BLOCKED_FIELDS')
    Gate "D04" "phi-redaction.ts exports assertNoPhiInAttributes" ($phi -match 'export\s+function\s+assertNoPhiInAttributes')
    Gate "D05" "phi-redaction.ts exports assertNoPhiInMetricLabels" ($phi -match 'export\s+function\s+assertNoPhiInMetricLabels')
    Gate "D06" "phi-redaction.ts blocks ssn" ($phi -match '"ssn"')
    Gate "D07" "phi-redaction.ts blocks dateofbirth" (($phi -match 'dateofbirth') -or ($phi -match 'dob'))
    Gate "D08" "phi-redaction.ts blocks patientname" ($phi -match '"patientname"')
} else {
    for ($i = 1; $i -le 8; $i++) {
        Gate "D$('{0:D2}' -f $i)" "phi-redaction gate $i" $false
    }
}

$logTs = "$root\apps\api\src\lib\logger.ts"
if (Test-Path -LiteralPath $logTs) {
    $lg = Get-Content $logTs -Raw
    Gate "D09" "logger.ts imports ALL_BLOCKED_FIELDS" ($lg -match 'ALL_BLOCKED_FIELDS')
    Gate "D10" "logger.ts imports INLINE_REDACT_PATTERNS" ($lg -match 'INLINE_REDACT_PATTERNS')
    Gate "D11" "logger.ts has redactObject function" ($lg -match 'function\s+redactObject')
    Gate "D12" "logger.ts bridges OTel trace IDs" ($lg -match 'bridgeTracingToLogger')
} else {
    Gate "D09" "logger.ts imports ALL_BLOCKED_FIELDS" $false
    Gate "D10" "logger.ts imports INLINE_REDACT_PATTERNS" $false
    Gate "D11" "logger.ts has redactObject function" $false
    Gate "D12" "logger.ts bridges OTel trace IDs" $false
}

# Scan telemetry files for PHI field usage in attributes
$telDir = "$root\apps\api\src\telemetry"
$phiInTelemetry = $false
if (Test-Path -LiteralPath $telDir) {
    $telFiles = Get-ChildItem -LiteralPath $telDir -Filter '*.ts' -Recurse
    foreach ($f in $telFiles) {
        $c = Get-Content $f.FullName -Raw
        # Check for PHI fields used as span attribute keys (not in import/export/type lines)
        $lines = Get-Content $f.FullName
        foreach ($line in $lines) {
            if ($line -match '^\s*(import|export|type|interface|\*|//)') { continue }
            $phiPattern = '(ssn|socialsecuritynumber|dateofbirth|patientname|password|accesscode|verifycode)'
            if ($line -match $phiPattern) {
                # Allow if it's in an assertion/check/comment context
                if ($line -match 'assertNoPhiIn|BLOCKED_FIELDS|CREDENTIAL_FIELDS|PHI_FIELDS|redact') { continue }
                $phiInTelemetry = $true
                break
            }
        }
    }
}
Gate "D13" "No PHI field used as span attribute in telemetry/" (-not $phiInTelemetry)

if (Test-Path -LiteralPath $tracingTs) {
    $tr = Get-Content $tracingTs -Raw
    Gate "D14" "tracing.ts request hooks are no-ops (PHI-safe)" ($tr -match 'requestHook.*?=>.*?\{\s*\}|requestHook.*?function.*?\{\s*\}|requestHook.*?noop|applyCustomAttributesOnSpan.*?\(\)')
} else {
    Gate "D14" "tracing.ts request hooks are no-ops (PHI-safe)" $false
}

if (Test-Path -LiteralPath $metricsTs) {
    $met = Get-Content $metricsTs -Raw
    Gate "D15" "sanitizeRoute strips UUIDs and numeric segments" (($met -match 'replace.*uuid') -or ($met -match 'replace.*\\d\+') -or ($met -match ':id'))
} else {
    Gate "D15" "sanitizeRoute strips UUIDs and numeric segments" $false
}

# ================================================================
# E. Observability Config Gates (8)
# ================================================================
Write-Host ""
Write-Host "--- E. Observability Config Gates ---"

$obsConfig = "$root\apps\api\src\config\observability-config.ts"
Gate "E01" "observability-config.ts exists" (Test-Path -LiteralPath $obsConfig)

if (Test-Path -LiteralPath $obsConfig) {
    $oc = Get-Content $obsConfig -Raw
    Gate "E02" "exports OBSERVABILITY_CONFIG" ($oc -match 'export\s+const\s+OBSERVABILITY_CONFIG')
    Gate "E03" "has samplingRate config" ($oc -match 'samplingRate')
    Gate "E04" "has metricLabelAllowlist" ($oc -match 'metricLabelAllowlist')
    Gate "E05" "has spanAttributeAllowlist" ($oc -match 'spanAttributeAllowlist')
    Gate "E06" "PHI redaction cannot be disabled (true as const)" ($oc -match 'phiRedactionEnabled.*true\s+as\s+const')
    Gate "E07" "reads env vars for overrides" ($oc -match 'process\.env')
    Gate "E08" "exports getLatencyBudget" ($oc -match 'export\s+function\s+getLatencyBudget')
} else {
    for ($i = 2; $i -le 8; $i++) {
        Gate "E$('{0:D2}' -f $i)" "observability-config gate $i" $false
    }
}

# ================================================================
# F. Structural Integrity Gates (9)
# ================================================================
Write-Host ""
Write-Host "--- F. Structural Integrity Gates ---"

# Anti-sprawl
Gate "F01" "No /reports directory at root" (-not (Test-Path "$root\reports"))
Gate "F02" "No /docs/reports directory" (-not (Test-Path "$root\docs\reports") -or ((Get-ChildItem "$root\docs\reports" -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0))

# Console.log cap (exclude tools/ and register.ts which are legitimate CLI/bootstrap)
$clCount = 0
$tsFiles = Get-ChildItem -Path "$root\apps\api\src" -Filter '*.ts' -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\tools\\' -and $_.Name -ne 'register.ts' }
foreach ($f in $tsFiles) {
    $lines = Get-Content $f.FullName -ErrorAction SilentlyContinue
    foreach ($line in $lines) {
        if ($line -match '^\s*console\.log\(' -and $line -notmatch '//.*console\.log') {
            $clCount++
        }
    }
}
Gate "F03" "console.log count <= 6 in production API code ($clCount found)" ($clCount -le 6)

# Credentials (exclude known-safe: config, session-store, tests, tools, e2e)
$credFiles = Get-ChildItem -Path "$root\apps" -Filter '*.ts' -Recurse -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -ne 'page.tsx' -and
        $_.FullName -notmatch 'node_modules' -and
        $_.FullName -notmatch '\\tools\\' -and
        $_.FullName -notmatch '\\tests\\' -and
        $_.FullName -notmatch '\\e2e\\' -and
        $_.FullName -notmatch '\.test\.ts$' -and
        $_.Name -ne 'config.ts' -and
        $_.Name -ne 'session-store.ts'
    }
$credLeak = $false
foreach ($f in $credFiles) {
    $c = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
    if ($c -and $c -match 'PROV123' -and $f.FullName -notmatch 'page\.tsx$') {
        $credLeak = $true; break
    }
}
Gate "F04" "No hardcoded PROV123 outside exempted files" (-not $credLeak)

# Prompt files
Gate "F05" "prompts/82-PHASE-77-OBSERVABILITY-V1/ exists" (Test-Path -LiteralPath "$root\prompts\82-PHASE-77-OBSERVABILITY-V1")
Gate "F06" "77-01-IMPLEMENT.md exists" (Test-Path -LiteralPath "$root\prompts\82-PHASE-77-OBSERVABILITY-V1\77-01-IMPLEMENT.md")
Gate "F07" "77-99-VERIFY.md exists" (Test-Path -LiteralPath "$root\prompts\82-PHASE-77-OBSERVABILITY-V1\77-99-VERIFY.md")

# Runbook
Gate "F08" "phase77-observability-reliability.md exists" (Test-Path -LiteralPath "$root\docs\runbooks\phase77-observability-reliability.md")

# Verify-latest delegation
$vl = "$root\scripts\verify-latest.ps1"
if (Test-Path -LiteralPath $vl) {
    $vlc = Get-Content $vl -Raw
    Gate "F09" "verify-latest.ps1 delegates to Phase 77" ($vlc -match 'phase77|Phase.77')
} else {
    Gate "F09" "verify-latest.ps1 delegates to Phase 77" $false
}

# ================================================================
# Evidence artifacts
# ================================================================
Write-Host ""
Write-Host "--- Evidence Artifacts ---"

$artifactDir = "$root\artifacts\phase77"
if (-not (Test-Path -LiteralPath $artifactDir)) {
    New-Item -Path $artifactDir -ItemType Directory -Force | Out-Null
}

# Gate results
$gateJson = $results | ConvertTo-Json -Depth 3
Set-Content -LiteralPath "$artifactDir\gate-results.json" -Value $gateJson -Encoding ASCII

# Telemetry inventory
$telInventory = @{
    correlationId = @{
        fetchWithCorrelation = (Test-Path -LiteralPath $fetchCorr)
        apiTsUsesCorrelation = (Test-Path -LiteralPath $apiTs) -and ((Get-Content $apiTs -Raw) -match 'fetch-with-correlation')
        dataCacheUsesCorrelation = (Test-Path -LiteralPath $dcTs) -and ((Get-Content $dcTs -Raw) -match 'fetch-with-correlation')
    }
    tracing = @{
        tracingTs = (Test-Path -LiteralPath $tracingTs)
        spansTs = (Test-Path -LiteralPath $spansTs)
        otelEnabled = 'env:OTEL_ENABLED'
    }
    metrics = @{
        metricsTs = (Test-Path -LiteralPath $metricsTs)
        sloGauges = (Test-Path -LiteralPath $metricsTs) -and ((Get-Content $metricsTs -Raw) -match 'slo_latency_within_budget')
        perfBudgets = (Test-Path -LiteralPath $budgets)
    }
    phiSafety = @{
        phiRedactionTs = (Test-Path -LiteralPath $phiTs)
        assertNoPhiInAttributes = (Test-Path -LiteralPath $phiTs) -and ((Get-Content $phiTs -Raw) -match 'assertNoPhiInAttributes')
        phiInTelemetry = $phiInTelemetry
    }
    config = @{
        observabilityConfig = (Test-Path -LiteralPath $obsConfig)
    }
}
$telJson = $telInventory | ConvertTo-Json -Depth 4
Set-Content -LiteralPath "$artifactDir\telemetry-inventory.json" -Value $telJson -Encoding ASCII

Write-Host "  Evidence written to artifacts/phase77/"

# ================================================================
# Summary
# ================================================================
Write-Host ""
Write-Host "============================================================"
Write-Host " Phase 77 Verifier -- RESULTS"
Write-Host "============================================================"
Write-Host "  PASS: $pass / $total"
Write-Host "  FAIL: $fail / $total"
Write-Host "============================================================"

if ($fail -gt 0) {
    Write-Host ""
    Write-Host "FAILED gates:"
    foreach ($r in $results) {
        if (-not $r.pass) { Write-Host "  X $($r.id) -- $($r.desc)" }
    }
    exit 1
}

Write-Host ""
Write-Host "ALL $total GATES PASSED"
exit 0
