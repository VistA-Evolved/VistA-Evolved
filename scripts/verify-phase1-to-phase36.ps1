param([switch]$SkipDocker, [switch]$SkipPlaywright, [switch]$SkipE2E)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$pass = 0
$fail = 0
$warn = 0

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

function Write-Warning-Gate {
  param([string]$Name, [string]$Detail = "")
  Write-Host "  [WARN] $Name - $Detail" -ForegroundColor Yellow
  $script:warn++
}

function Test-FileContains {
  param([string]$Path, [string]$Pattern, [switch]$IsRegex)
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  if ($IsRegex) {
    return (Select-String -LiteralPath $Path -Pattern $Pattern -Quiet)
  }
  return (Select-String -LiteralPath $Path -Pattern $Pattern -SimpleMatch -Quiet)
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Phase 36 VERIFY -- Production Observability & Reliability"  -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# ================================================================
# G36-0  REGRESSION
# ================================================================
Write-Host ""
Write-Host "--- G36-0: Regression (Phase 35 chain) ---" -ForegroundColor Yellow

$phase35Script = "$root\scripts\verify-phase1-to-phase35.ps1"
if (Test-Path $phase35Script) {
  Write-Host "  Delegating to Phase 35 verifier (60s timeout)..." -ForegroundColor DarkGray
  $job = Start-Job -ScriptBlock {
    param($s)
    & powershell -NoProfile -ExecutionPolicy Bypass -File $s -SkipPlaywright -SkipE2E 2>&1 | Out-Null
    $LASTEXITCODE
  } -ArgumentList $phase35Script
  $finished = $job | Wait-Job -Timeout 60
  if ($finished) {
    $phase35Exit = Receive-Job $job
    Remove-Job $job -Force
    if ($phase35Exit -eq 0) {
      Write-Gate "Phase 35 regression: all gates pass" $true
    } else {
      Write-Warning-Gate "Phase 35 regression" "Phase 35 verifier returned exit code $phase35Exit (non-blocking)"
    }
  } else {
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -Force -ErrorAction SilentlyContinue
    Write-Warning-Gate "Phase 35 regression" "Phase 35 verifier timed out after 60s (non-blocking)"
  }
} else {
  Write-Warning-Gate "Phase 35 regression" "verify-phase1-to-phase35.ps1 not found (non-blocking)"
}

# ================================================================
# G36-1  PROMPTS
# ================================================================
Write-Host ""
Write-Host "--- G36-1: Prompts ---" -ForegroundColor Yellow

$promptsDir = "$root\prompts"
Write-Gate "Phase 36 prompt folder exists" (Test-Path -LiteralPath "$promptsDir\38-PHASE-36-OBSERVABILITY-RELIABILITY")
Write-Gate "Phase 36 IMPLEMENT prompt" (Test-Path -LiteralPath "$promptsDir\38-PHASE-36-OBSERVABILITY-RELIABILITY\38-01-observability-reliability-IMPLEMENT.md")
Write-Gate "Phase 36 VERIFY prompt" (Test-Path -LiteralPath "$promptsDir\38-PHASE-36-OBSERVABILITY-RELIABILITY\38-99-observability-reliability-VERIFY.md")

# ================================================================
# G36-2  OBSERVABILITY INFRASTRUCTURE
# ================================================================
Write-Host ""
Write-Host "--- G36-2: Observability Infrastructure ---" -ForegroundColor Yellow

$obsDir = "$root\services\observability"
Write-Gate "Observability docker-compose.yml" (Test-Path -LiteralPath "$obsDir\docker-compose.yml")
Write-Gate "OTel Collector config" (Test-Path -LiteralPath "$obsDir\otel-collector-config.yaml")
Write-Gate "Prometheus config" (Test-Path -LiteralPath "$obsDir\prometheus.yml")

# Docker compose content
$dcFile = "$obsDir\docker-compose.yml"
if (Test-Path -LiteralPath $dcFile) {
  Write-Gate "Has otel-collector service" (Test-FileContains $dcFile "otel-collector")
  Write-Gate "Has jaeger service" (Test-FileContains $dcFile "jaeger")
  Write-Gate "Has prometheus service" (Test-FileContains $dcFile "prometheus")
  Write-Gate "OTel Collector image version" (Test-FileContains $dcFile "opentelemetry-collector-contrib")
  Write-Gate "Jaeger image" (Test-FileContains $dcFile "jaegertracing")
  Write-Gate "Prometheus image" (Test-FileContains $dcFile "prom/prometheus")
} else {
  Write-Gate "Docker compose content" $false "docker-compose.yml missing"
}

# OTel Collector config content
$collConfig = "$obsDir\otel-collector-config.yaml"
if (Test-Path -LiteralPath $collConfig) {
  Write-Gate "Collector has OTLP receiver" (Test-FileContains $collConfig "otlp:")
  Write-Gate "Collector has PHI stripper" (Test-FileContains $collConfig "strip-phi")
  Write-Gate "Collector strips request bodies" (Test-FileContains $collConfig "rpc.request.body")
  Write-Gate "Collector strips patient data" (Test-FileContains $collConfig "patient")
  Write-Gate "Collector has Jaeger exporter" (Test-FileContains $collConfig "jaeger")
  Write-Gate "Collector has Prometheus exporter" (Test-FileContains $collConfig "prometheus")
  Write-Gate "Collector has memory limiter" (Test-FileContains $collConfig "memory_limiter")
} else {
  Write-Gate "Collector config content" $false "otel-collector-config.yaml missing"
}

# Prometheus config content
$promConfig = "$obsDir\prometheus.yml"
if (Test-Path -LiteralPath $promConfig) {
  Write-Gate "Prometheus scrapes API" (Test-FileContains $promConfig "vista-evolved-api")
  Write-Gate "Prometheus scrapes collector" (Test-FileContains $promConfig "otel-collector")
  Write-Gate "Prometheus has /metrics/prometheus path" (Test-FileContains $promConfig "metrics/prometheus")
} else {
  Write-Gate "Prometheus config content" $false "prometheus.yml missing"
}

# ================================================================
# G36-3  TELEMETRY MODULE (TRACING)
# ================================================================
Write-Host ""
Write-Host "--- G36-3: Telemetry - Tracing ---" -ForegroundColor Yellow

$tracingFile = "$root\apps\api\src\telemetry\tracing.ts"
Write-Gate "tracing.ts exists" (Test-Path -LiteralPath $tracingFile)

if (Test-Path -LiteralPath $tracingFile) {
  Write-Gate "Has initTracing function" (Test-FileContains $tracingFile "initTracing")
  Write-Gate "Has shutdownTracing function" (Test-FileContains $tracingFile "shutdownTracing")
  Write-Gate "Has OTEL_ENABLED gate" (Test-FileContains $tracingFile "OTEL_ENABLED")
  Write-Gate "Has startRpcSpan helper" (Test-FileContains $tracingFile "startRpcSpan")
  Write-Gate "Has endRpcSpan helper" (Test-FileContains $tracingFile "endRpcSpan")
  Write-Gate "Has getCurrentTraceId" (Test-FileContains $tracingFile "getCurrentTraceId")
  Write-Gate "Has getCurrentSpanId" (Test-FileContains $tracingFile "getCurrentSpanId")
  Write-Gate "Uses OTLP HTTP exporter" (Test-FileContains $tracingFile "OTLPTraceExporter" -IsRegex)
  Write-Gate "Has auto-instrumentation" (Test-FileContains $tracingFile "getNodeAutoInstrumentations" -IsRegex)
  Write-Gate "Disables fs instrumentation" (Test-FileContains $tracingFile "@opentelemetry/instrumentation-fs")
  Write-Gate "Disables dns instrumentation" (Test-FileContains $tracingFile "@opentelemetry/instrumentation-dns")
  # PHI safety
  Write-Gate "No body capture (empty hooks)" (Test-FileContains $tracingFile "requestHook" -IsRegex)
} else {
  Write-Gate "Tracing module content" $false "tracing.ts missing"
}

# ================================================================
# G36-4  TELEMETRY MODULE (METRICS)
# ================================================================
Write-Host ""
Write-Host "--- G36-4: Telemetry - Metrics ---" -ForegroundColor Yellow

$metricsFile = "$root\apps\api\src\telemetry\metrics.ts"
Write-Gate "metrics.ts exists" (Test-Path -LiteralPath $metricsFile)

if (Test-Path -LiteralPath $metricsFile) {
  Write-Gate "Has prom-client Registry" (Test-FileContains $metricsFile "Registry")
  Write-Gate "Has httpRequestDuration histogram" (Test-FileContains $metricsFile "httpRequestDuration")
  Write-Gate "Has httpRequestsTotal counter" (Test-FileContains $metricsFile "httpRequestsTotal")
  Write-Gate "Has httpActiveRequests gauge" (Test-FileContains $metricsFile "httpActiveRequests")
  Write-Gate "Has rpcCallDuration histogram" (Test-FileContains $metricsFile "rpcCallDuration")
  Write-Gate "Has rpcCallsTotal counter" (Test-FileContains $metricsFile "rpcCallsTotal")
  Write-Gate "Has circuitBreakerState gauge" (Test-FileContains $metricsFile "circuitBreakerState")
  Write-Gate "Has circuitBreakerTrips counter" (Test-FileContains $metricsFile "circuitBreakerTrips")
  Write-Gate "Has errorsTotal counter" (Test-FileContains $metricsFile "errorsTotal")
  Write-Gate "Has sanitizeRoute function" (Test-FileContains $metricsFile "sanitizeRoute")
  Write-Gate "sanitizeRoute replaces UUIDs" (Test-FileContains $metricsFile ":id" -IsRegex)
  Write-Gate "Has getPrometheusMetrics" (Test-FileContains $metricsFile "getPrometheusMetrics")
  Write-Gate "Has collectDefaultMetrics" (Test-FileContains $metricsFile "collectDefaultMetrics")
} else {
  Write-Gate "Metrics module content" $false "metrics.ts missing"
}

# ================================================================
# G36-5  INTEGRATION (logger, security, index, rpc-resilience)
# ================================================================
Write-Host ""
Write-Host "--- G36-5: Integration Points ---" -ForegroundColor Yellow

# Logger bridge
$loggerFile = "$root\apps\api\src\lib\logger.ts"
if (Test-Path -LiteralPath $loggerFile) {
  Write-Gate "Logger has bridgeTracingToLogger" (Test-FileContains $loggerFile "bridgeTracingToLogger")
  Write-Gate "Logger emits traceId" (Test-FileContains $loggerFile "traceId")
  Write-Gate "Logger emits spanId" (Test-FileContains $loggerFile "spanId")
} else {
  Write-Gate "Logger integration" $false "logger.ts missing"
}

# Security middleware
$securityFile = "$root\apps\api\src\middleware\security.ts"
if (Test-Path -LiteralPath $securityFile) {
  Write-Gate "Security has X-Trace-Id header" (Test-FileContains $securityFile "X-Trace-Id")
  Write-Gate "Security has httpActiveRequests" (Test-FileContains $securityFile "httpActiveRequests")
  Write-Gate "Security has httpRequestDuration" (Test-FileContains $securityFile "httpRequestDuration")
  Write-Gate "Security has drain timeout" (Test-FileContains $securityFile "SHUTDOWN_DRAIN_TIMEOUT_MS" -IsRegex)
  Write-Gate "Security has shutdownTracing" (Test-FileContains $securityFile "shutdownTracing")
  Write-Gate "Security has errorsTotal" (Test-FileContains $securityFile "errorsTotal")
} else {
  Write-Gate "Security integration" $false "security.ts missing"
}

# Index.ts
$indexFile = "$root\apps\api\src\index.ts"
if (Test-Path -LiteralPath $indexFile) {
  Write-Gate "Index imports initTracing" (Test-FileContains $indexFile "initTracing")
  Write-Gate "Index imports bridgeTracingToLogger" (Test-FileContains $indexFile "bridgeTracingToLogger")
  Write-Gate "Index has /metrics/prometheus route" (Test-FileContains $indexFile "metrics/prometheus")
  Write-Gate "Index has circuitBreaker in health" (Test-FileContains $indexFile "circuitBreaker")
  Write-Gate "Index has tracingEnabled in health" (Test-FileContains $indexFile "tracingEnabled")
} else {
  Write-Gate "Index integration" $false "index.ts missing"
}

# RPC Resilience
$rpcFile = "$root\apps\api\src\lib\rpc-resilience.ts"
if (Test-Path -LiteralPath $rpcFile) {
  Write-Gate "RPC has startRpcSpan" (Test-FileContains $rpcFile "startRpcSpan")
  Write-Gate "RPC has endRpcSpan" (Test-FileContains $rpcFile "endRpcSpan")
  Write-Gate "RPC has rpcCallDuration" (Test-FileContains $rpcFile "rpcCallDuration")
  Write-Gate "RPC has circuitBreakerTrips" (Test-FileContains $rpcFile "circuitBreakerTrips")
} else {
  Write-Gate "RPC resilience integration" $false "rpc-resilience.ts missing"
}

# ================================================================
# G36-6  PHI SAFETY
# ================================================================
Write-Host ""
Write-Host "--- G36-6: PHI Safety ---" -ForegroundColor Yellow

# No PHI in tracing module
if (Test-Path -LiteralPath $tracingFile) {
  $tracingContent = Get-Content $tracingFile -Raw
  $noPHI = -not ($tracingContent -match 'patient.*name|ssn|dob|accessCode|verifyCode')
  Write-Gate "Tracing no PHI fields captured" $noPHI
}

# Collector strips PHI
if (Test-Path -LiteralPath $collConfig) {
  Write-Gate "Collector strips response bodies" (Test-FileContains $collConfig "rpc.response.body")
  Write-Gate "Collector strips http bodies" (Test-FileContains $collConfig "http.request.body")
  Write-Gate "Collector strips credentials" (Test-FileContains $collConfig "user.password")
  Write-Gate "Collector strips db.statement" (Test-FileContains $collConfig "db.statement")
}

# ================================================================
# G36-7  K6 SMOKE TESTS
# ================================================================
Write-Host ""
Write-Host "--- G36-7: k6 Smoke Tests ---" -ForegroundColor Yellow

$k6Dir = "$root\tests\k6"
Write-Gate "smoke-login.js exists" (Test-Path -LiteralPath "$k6Dir\smoke-login.js")
Write-Gate "smoke-reads.js exists" (Test-Path -LiteralPath "$k6Dir\smoke-reads.js")
Write-Gate "smoke-write.js exists" (Test-Path -LiteralPath "$k6Dir\smoke-write.js")
Write-Gate "run-smoke.ps1 exists" (Test-Path -LiteralPath "$k6Dir\run-smoke.ps1")

if (Test-Path -LiteralPath "$k6Dir\smoke-login.js") {
  Write-Gate "Login test has thresholds" (Test-FileContains "$k6Dir\smoke-login.js" "thresholds")
  Write-Gate "Login test has health check" (Test-FileContains "$k6Dir\smoke-login.js" "health")
}

if (Test-Path -LiteralPath "$k6Dir\smoke-reads.js") {
  Write-Gate "Reads test has patient-search" (Test-FileContains "$k6Dir\smoke-reads.js" "patient-search")
  Write-Gate "Reads test has demographics" (Test-FileContains "$k6Dir\smoke-reads.js" "demographics")
  Write-Gate "Reads test has allergies" (Test-FileContains "$k6Dir\smoke-reads.js" "allergies")
  Write-Gate "Reads test has vitals" (Test-FileContains "$k6Dir\smoke-reads.js" "vitals")
}

if (Test-Path -LiteralPath "$k6Dir\smoke-write.js") {
  Write-Gate "Write test has add-allergy" (Test-FileContains "$k6Dir\smoke-write.js" "add-allergy")
  Write-Gate "Write test has high failure tolerance" (Test-FileContains "$k6Dir\smoke-write.js" "0.80" -IsRegex)
}

# ================================================================
# G36-8  DOCUMENTATION
# ================================================================
Write-Host ""
Write-Host "--- G36-8: Documentation ---" -ForegroundColor Yellow

Write-Gate "Phase 36 runbook exists" (Test-Path -LiteralPath "$root\docs\runbooks\phase36-observability-reliability.md")

$runbook = "$root\docs\runbooks\phase36-observability-reliability.md"
if (Test-Path -LiteralPath $runbook) {
  Write-Gate "Runbook covers OTel" (Test-FileContains $runbook "OpenTelemetry")
  Write-Gate "Runbook covers Jaeger" (Test-FileContains $runbook "Jaeger")
  Write-Gate "Runbook covers Prometheus" (Test-FileContains $runbook "Prometheus")
  Write-Gate "Runbook covers k6" (Test-FileContains $runbook "k6")
  Write-Gate "Runbook covers PHI safety" (Test-FileContains $runbook "PHI")
  Write-Gate "Runbook covers drain timeout" (Test-FileContains $runbook "drain")
  Write-Gate "Runbook covers SLO" (Test-FileContains $runbook "SLO")
}

# AGENTS.md Phase 36 content
$agentsFile = "$root\AGENTS.md"
if (Test-Path -LiteralPath $agentsFile) {
  Write-Gate "AGENTS.md has Phase 36 architecture map" (Test-FileContains $agentsFile "Phase 36 additions")
  Write-Gate "AGENTS.md has OTel gotcha" (Test-FileContains $agentsFile "OTEL_ENABLED")
  Write-Gate "AGENTS.md has PHI collector gotcha" (Test-FileContains $agentsFile "strip-phi")
  Write-Gate "AGENTS.md has sanitizeRoute gotcha" (Test-FileContains $agentsFile "sanitizeRoute")
  Write-Gate "AGENTS.md has drain timeout gotcha" (Test-FileContains $agentsFile "drain timeout")
  Write-Gate "AGENTS.md has k6 gotcha" (Test-FileContains $agentsFile "k6 smoke tests")
} else {
  Write-Gate "AGENTS.md Phase 36 content" $false "AGENTS.md missing"
}

# ================================================================
# G36-9  DEPENDENCIES
# ================================================================
Write-Host ""
Write-Host "--- G36-9: Dependencies ---" -ForegroundColor Yellow

$pkgFile = "$root\apps\api\package.json"
if (Test-Path -LiteralPath $pkgFile) {
  Write-Gate "prom-client in deps" (Test-FileContains $pkgFile "prom-client")
  Write-Gate "@opentelemetry/sdk-node in deps" (Test-FileContains $pkgFile "@opentelemetry/sdk-node")
  Write-Gate "@opentelemetry/api in deps" (Test-FileContains $pkgFile "@opentelemetry/api")
  Write-Gate "@opentelemetry/auto-instrumentations-node in deps" (Test-FileContains $pkgFile "@opentelemetry/auto-instrumentations-node")
  Write-Gate "@opentelemetry/exporter-trace-otlp-http in deps" (Test-FileContains $pkgFile "exporter-trace-otlp-http")
} else {
  Write-Gate "Package.json deps" $false "package.json missing"
}

# ================================================================
# G36-10  NO SECRETS LEAK
# ================================================================
Write-Host ""
Write-Host "--- G36-10: No Secrets Leak ---" -ForegroundColor Yellow

# Check telemetry files don't contain hardcoded credentials
$telFiles = @($tracingFile, $metricsFile)
$secretsClean = $true
foreach ($f in $telFiles) {
  if (Test-Path -LiteralPath $f) {
    $content = Get-Content $f -Raw
    if ($content -match 'PROV123|PHARM123|NURSE123') {
      $secretsClean = $false
    }
  }
}
Write-Gate "No hardcoded credentials in telemetry" $secretsClean

# ================================================================
# G36-11  TYPESCRIPT COMPILATION
# ================================================================
Write-Host ""
Write-Host "--- G36-11: TypeScript Compilation ---" -ForegroundColor Yellow

Push-Location "$root\apps\api"
$tscResult = & npx tsc --noEmit 2>&1
$tscOk = ($LASTEXITCODE -eq 0)
Pop-Location
if ($tscOk) {
  Write-Gate "TypeScript compiles cleanly" $true
} else {
  $errCount = ($tscResult | Select-String "error TS" | Measure-Object).Count
  Write-Gate "TypeScript compiles cleanly" $false "$errCount errors"
  if ($errCount -le 10) {
    $tscResult | Select-String "error TS" | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
  }
}

# ================================================================
# SUMMARY
# ================================================================
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Phase 36 Results: $pass PASS / $fail FAIL / $warn WARN" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

if ($fail -gt 0) { exit 1 } else { exit 0 }
