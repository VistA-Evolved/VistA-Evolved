<#
.SYNOPSIS
  Phase 156 Verifier -- Imaging Operationalization (Orthanc Profile + Wiring + CI Smoke)
.DESCRIPTION
  15 gates: S1-S4 (structural), F1-F7 (functional), R1-R4 (regression).
  Validates compose profiles, env docs, CI workflow, health endpoint, and no regressions.
#>
param(
  [switch]$SkipDocker
)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $warn = 0
function Gate($id, $desc) { Write-Host "`n--- $id : $desc ---" -ForegroundColor Cyan }
function Pass($msg) { Write-Host "  PASS: $msg" -ForegroundColor Green; $script:pass++ }
function Fail($msg) { Write-Host "  FAIL: $msg" -ForegroundColor Red; $script:fail++ }
function Warn($msg) { Write-Host "  WARN: $msg" -ForegroundColor Yellow; $script:warn++ }

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path -LiteralPath "$repoRoot\apps\api\src\index.ts")) {
  $repoRoot = Split-Path -Parent $PSScriptRoot
}
if (-not (Test-Path -LiteralPath "$repoRoot\apps\api\src\index.ts")) {
  $repoRoot = $PSScriptRoot | Split-Path | Split-Path
}

Write-Host "=== Phase 156 Verifier -- Imaging Operationalization ===" -ForegroundColor Magenta
Write-Host "Repo root: $repoRoot"

# ---------- S1: Dev compose has imaging profile ----------
Gate "S1" "Dev compose has imaging profile with Orthanc + OHIF"
$devCompose = "$repoRoot\services\imaging\docker-compose.yml"
if (Test-Path -LiteralPath $devCompose) {
  $devContent = Get-Content $devCompose -Raw
  if ($devContent -match 'profiles:\s*\["imaging"\]') {
    Pass "Dev compose has imaging profile"
  } else { Fail "Dev compose missing 'profiles: [imaging]'" }
  if ($devContent -match 'orthancteam/orthanc') {
    Pass "Orthanc image referenced"
  } else { Fail "Orthanc image not found in dev compose" }
  if ($devContent -match 'ohif/app') {
    Pass "OHIF image referenced"
  } else { Fail "OHIF image not found in dev compose" }
} else { Fail "Dev compose not found at $devCompose" }

# ---------- S2: Prod compose has optional imaging profile ----------
Gate "S2" "Prod compose includes imaging profile (optional)"
$prodCompose = "$repoRoot\docker-compose.prod.yml"
if (Test-Path -LiteralPath $prodCompose) {
  $prodContent = Get-Content $prodCompose -Raw
  if ($prodContent -match 'profiles:\s*\["imaging"\]') {
    Pass "Prod compose has imaging profile"
  } else { Fail "Prod compose missing imaging profile" }
  if ($prodContent -match 'orthanc-data') {
    Pass "Orthanc data volume in prod compose"
  } else { Fail "orthanc-data volume missing from prod compose" }
  if ($prodContent -match 'INGEST_SERVICE_KEY') {
    Pass "Ingest webhook secret wired in prod compose"
  } else { Warn "INGEST_SERVICE_KEY not found in prod compose" }
} else { Fail "Prod compose not found" }

# ---------- S3: .env.example documents imaging vars ----------
Gate "S3" ".env.example documents all imaging env vars"
$envExample = "$repoRoot\apps\api\.env.example"
if (Test-Path -LiteralPath $envExample) {
  $envContent = Get-Content $envExample -Raw
  $requiredVars = @(
    "ORTHANC_URL", "OHIF_URL", "ORTHANC_DICOMWEB_ROOT",
    "IMAGING_PROXY_TIMEOUT_MS", "IMAGING_QIDO_CACHE_TTL_MS",
    "IMAGING_ENABLE_DEMO_UPLOAD", "IMAGING_MAX_UPLOAD_BYTES",
    "IMAGING_INGEST_WEBHOOK_SECRET",
    "DICOMWEB_RATE_LIMIT", "DICOMWEB_RATE_WINDOW_MS"
  )
  $missing = @()
  foreach ($v in $requiredVars) {
    if ($envContent -notmatch [regex]::Escape($v)) { $missing += $v }
  }
  if ($missing.Count -eq 0) {
    Pass "All $($requiredVars.Count) imaging env vars documented"
  } else {
    Fail "Missing env vars: $($missing -join ', ')"
  }
} else { Fail ".env.example not found" }

# ---------- S4: CI imaging smoke workflow exists ----------
Gate "S4" "CI imaging smoke workflow exists"
$ciWorkflow = "$repoRoot\.github\workflows\ci-imaging-smoke.yml"
if (Test-Path -LiteralPath $ciWorkflow) {
  $ciContent = Get-Content $ciWorkflow -Raw
  if ($ciContent -match 'orthancteam/orthanc') {
    Pass "CI workflow uses Orthanc service container"
  } else { Fail "CI workflow missing Orthanc service container" }
  if ($ciContent -match 'dicom-web/studies') {
    Pass "CI workflow tests DICOMweb QIDO-RS"
  } else { Fail "CI workflow missing DICOMweb test" }
  if ($ciContent -match 'services/imaging') {
    Pass "CI workflow scoped to imaging paths"
  } else { Warn "CI workflow not path-scoped" }
} else { Fail "CI imaging smoke workflow not found" }

# ---------- F1: /imaging/health endpoint exists in code ----------
Gate "F1" "/imaging/health route registered"
$proxyFile = "$repoRoot\apps\api\src\routes\imaging-proxy.ts"
if (Test-Path -LiteralPath $proxyFile) {
  $proxyContent = Get-Content $proxyFile -Raw
  if ($proxyContent -match '/imaging/health') {
    Pass "/imaging/health route found in imaging-proxy.ts"
  } else { Fail "/imaging/health not found" }
  if ($proxyContent -match 'ohifStatus') {
    Pass "OHIF live probe in health endpoint (Phase 156)"
  } else { Warn "OHIF live probe not detected" }
  if ($proxyContent -match 'composeProfile') {
    Pass "Compose profile hint in health response"
  } else { Warn "composeProfile hint missing" }
} else { Fail "imaging-proxy.ts not found" }

# ---------- F2: AUTH_RULES covers /imaging/health ----------
Gate "F2" "AUTH_RULES covers /imaging/health"
$securityFile = "$repoRoot\apps\api\src\middleware\security.ts"
if (Test-Path -LiteralPath $securityFile) {
  $secContent = Get-Content $securityFile -Raw
  if ($secContent -match 'imaging.health') {
    Pass "/imaging/health in AUTH_RULES"
  } else { Fail "/imaging/health not in AUTH_RULES" }
} else { Fail "security.ts not found" }

# ---------- F3: server-config.ts has all IMAGING_CONFIG vars ----------
Gate "F3" "server-config.ts IMAGING_CONFIG complete"
$configFile = "$repoRoot\apps\api\src\config\server-config.ts"
if (Test-Path -LiteralPath $configFile) {
  $cfgContent = Get-Content $configFile -Raw
  $cfgVars = @("orthancUrl", "ohifUrl", "dicomWebRoot", "proxyTimeoutMs", "qidoCacheTtlMs", "ingestWebhookSecret")
  $cfgMissing = @()
  foreach ($v in $cfgVars) {
    if ($cfgContent -notmatch [regex]::Escape($v)) { $cfgMissing += $v }
  }
  if ($cfgMissing.Count -eq 0) {
    Pass "All $($cfgVars.Count) IMAGING_CONFIG fields present"
  } else { Fail "Missing IMAGING_CONFIG fields: $($cfgMissing -join ', ')" }
} else { Fail "server-config.ts not found" }

# ---------- F4: orthanc.json config valid ----------
Gate "F4" "orthanc.json DICOMweb enabled + auth disabled"
$orthancJson = "$repoRoot\services\imaging\orthanc.json"
if (Test-Path -LiteralPath $orthancJson) {
  try {
    $oCfg = Get-Content $orthancJson -Raw | ConvertFrom-Json
    if ($oCfg.DicomWeb.Enable -eq $true) { Pass "DICOMweb enabled" }
    else { Fail "DICOMweb not enabled" }
    if ($oCfg.AuthenticationEnabled -eq $false) { Pass "Auth disabled (API proxy handles auth)" }
    else { Warn "Auth enabled -- API proxy pattern expects Orthanc auth disabled" }
    if ($oCfg.DicomPort -eq 4242) { Pass "DICOM port 4242" }
    else { Fail "DICOM port not 4242: $($oCfg.DicomPort)" }
  } catch {
    Fail "orthanc.json parse error: $_"
  }
} else { Fail "orthanc.json not found" }

# ---------- F5: Lua ingest callback present ----------
Gate "F5" "on-stable-study.lua exists"
$luaFile = "$repoRoot\services\imaging\on-stable-study.lua"
if (Test-Path -LiteralPath $luaFile) {
  $luaContent = Get-Content $luaFile -Raw
  if ($luaContent -match 'OnStableStudy') {
    Pass "OnStableStudy hook present"
  } else { Fail "OnStableStudy hook not found in Lua" }
} else { Fail "on-stable-study.lua not found" }

# ---------- F6: imaging-viewer.ts has health probes ----------
Gate "F6" "imaging-viewer.ts has Orthanc + OHIF probes"
$viewerFile = "$repoRoot\apps\api\src\routes\imaging-viewer.ts"
if (Test-Path -LiteralPath $viewerFile) {
  $viewerContent = Get-Content $viewerFile -Raw
  if ($viewerContent -match 'isOrthancReachable') {
    Pass "isOrthancReachable probe exists"
  } else { Fail "isOrthancReachable not found" }
  if ($viewerContent -match 'isViewerReachable') {
    Pass "isViewerReachable probe exists"
  } else { Fail "isViewerReachable not found" }
} else { Fail "imaging-viewer.ts not found" }

# ---------- F7: Live Orthanc probe (if Docker available) ----------
Gate "F7" "Live Orthanc health probe"
if ($SkipDocker) {
  Warn "Skipped -- -SkipDocker specified"
} else {
  try {
    $sysResp = $null
    try {
      $sysResp = Invoke-WebRequest -Uri "http://127.0.0.1:8042/system" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    } catch { }
    if ($sysResp -and $sysResp.StatusCode -eq 200) {
      Pass "Orthanc /system reachable on port 8042"
      $sysJson = $sysResp.Content | ConvertFrom-Json
      Write-Host "    Version: $($sysJson.Version), Name: $($sysJson.Name)"
    } else {
      Warn "Orthanc not reachable on port 8042 (start with: docker compose --profile imaging up -d)"
    }
  } catch {
    Warn "Orthanc probe failed: $_"
  }
}

# ---------- R1: No console.log in imaging routes ----------
Gate "R1" "No console.log in imaging route files"
$imgRouteFiles = Get-ChildItem "$repoRoot\apps\api\src\routes" -Filter "imaging-*" -File -ErrorAction SilentlyContinue
$clCount = 0
foreach ($f in $imgRouteFiles) {
  $lines = Select-String -LiteralPath $f.FullName -Pattern "console\.log" -AllMatches
  $clCount += $lines.Count
}
if ($clCount -eq 0) { Pass "No console.log in imaging routes" }
else { Fail "$clCount console.log calls in imaging routes" }

# ---------- R2: No hardcoded credentials in imaging code ----------
Gate "R2" "No hardcoded credentials in imaging files"
$credPatterns = @("PROV123", "password", "secret.*=.*[`"'](?!dev-imaging)")
$credHits = 0
$imgFiles = @(
  "$repoRoot\services\imaging\docker-compose.yml",
  "$repoRoot\services\imaging\orthanc.json",
  "$repoRoot\apps\api\src\routes\imaging-proxy.ts",
  "$repoRoot\apps\api\src\routes\imaging-viewer.ts"
)
foreach ($f in $imgFiles) {
  if (Test-Path -LiteralPath $f) {
    $content = Get-Content $f -Raw
    foreach ($p in $credPatterns) {
      if ($content -match $p) { $credHits++; Write-Host "    Credential pattern '$p' in $f" }
    }
  }
}
if ($credHits -eq 0) { Pass "No hardcoded credentials" }
else { Warn "$credHits potential credential patterns found" }

# ---------- R3: Imaging proxy still has RBAC ----------
Gate "R3" "Imaging proxy retains RBAC + break-glass checks"
if (Test-Path -LiteralPath $proxyFile) {
  $proxyContent = Get-Content $proxyFile -Raw
  if ($proxyContent -match 'hasImagingPermission|imaging_view') {
    Pass "RBAC permission checks present"
  } else { Fail "RBAC permission checks missing from imaging proxy" }
  if ($proxyContent -match 'break.?glass|breakGlass') {
    Pass "Break-glass references present"
  } else { Warn "Break-glass references not found" }
} else { Fail "imaging-proxy.ts not found" }

# ---------- R4: Prompt files exist ----------
Gate "R4" "Phase 156 prompt files exist"
$promptDir = Get-ChildItem "$repoRoot\prompts" -Directory -Filter "*PHASE-156*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($promptDir) {
  $impl = Get-ChildItem $promptDir.FullName -Filter "*IMPLEMENT*" -ErrorAction SilentlyContinue
  $verify = Get-ChildItem $promptDir.FullName -Filter "*VERIFY*" -ErrorAction SilentlyContinue
  if ($impl) { Pass "IMPLEMENT prompt found" } else { Fail "IMPLEMENT prompt missing" }
  if ($verify) { Pass "VERIFY prompt found" } else { Fail "VERIFY prompt missing" }
} else { Fail "Phase 156 prompt directory not found" }

# ---------- Summary ----------
Write-Host "`n=============================" -ForegroundColor Magenta
Write-Host "Phase 156 Verifier Results" -ForegroundColor Magenta
Write-Host "  PASS : $pass" -ForegroundColor Green
Write-Host "  FAIL : $fail" -ForegroundColor Red
Write-Host "  WARN : $warn" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Magenta

if ($fail -gt 0) {
  Write-Host "`nVERDICT: FAIL ($fail failures)" -ForegroundColor Red
  exit 1
} else {
  Write-Host "`nVERDICT: PASS" -ForegroundColor Green
  exit 0
}
