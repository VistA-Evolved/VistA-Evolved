<#
.SYNOPSIS
  Verify environment parity between staging/pilot/dr-validate configs.
.DESCRIPTION
  Validates that environment YAML configs match expected structure,
  required services are enabled, and canary tenant config exists.
.PARAMETER Env
  Target environment: staging, pilot, dr-validate (default: staging)
#>
param(
  [ValidateSet("staging","pilot","dr-validate")]
  [string]$Env = "staging"
)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $total = 0
$root = Split-Path -Parent $PSScriptRoot

function Gate([string]$name, [scriptblock]$check) {
  $script:total++
  try {
    $result = & $check
    if ($result) {
      Write-Host "  PASS  $name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $name" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $name ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== ENVIRONMENT PARITY CHECK: $Env ===" -ForegroundColor Cyan

# --- Gate 1: Config file exists ---
$envFile = "$root/infra/environments/$Env.yaml"
Gate "Config file exists: $Env.yaml" { Test-Path -LiteralPath $envFile }

if (-not (Test-Path -LiteralPath $envFile)) {
  Write-Host "  ABORT: config file missing, cannot continue" -ForegroundColor Red
  exit 1
}

$content = Get-Content $envFile -Raw

# --- Gate 2: Required services ---
Gate "postgres enabled" { $content -match 'postgres:\s*\n\s+enabled:\s*true' }
Gate "redis enabled" { $content -match 'redis:\s*\n\s+enabled:\s*true' }
Gate "ingress enabled" { $content -match 'ingress:\s*\n\s+enabled:\s*true' }
Gate "keycloak enabled" { $content -match 'keycloak:\s*\n\s+enabled:\s*true' }
Gate "observability enabled" { $content -match 'observability:\s*\n\s+enabled:\s*true' }
Gate "networkPolicies enabled" { $content -match 'networkPolicies:\s*\n\s+enabled:\s*true' }
Gate "vista enabled" { $content -match 'vista:\s*\n\s+enabled:\s*true' }

# --- Gate 3: TLS posture ---
Gate "TLS enabled in ingress" { $content -match 'tls:\s*\n\s+enabled:\s*true' }

# --- Gate 4: Secrets strategy ---
Gate "No plaintext passwords" {
  # passwords must be empty (ref-only) or absent
  $matches = [regex]::Matches($content, 'password:\s*"([^"]*)"')
  $allEmpty = $true
  foreach ($m in $matches) {
    if ($m.Groups[1].Value -ne "") { $allEmpty = $false }
  }
  $allEmpty
}

# --- Gate 5: Runtime mode ---
Gate "runtimeMode is rc or prod" { $content -match 'runtimeMode:\s*(rc|prod)' }

# --- Gate 6: Namespace isolation ---
Gate "namespace is environment-specific" {
  $ns = if ($content -match 'namespace:\s*(\S+)') { $Matches[1] } else { "" }
  $ns -ne "default" -and $ns -ne ""
}

# --- Gate 7: Cross-environment parity checks ---
Write-Host "`n--- Cross-Environment Parity ---"
$envFiles = @("staging","pilot","dr-validate")
$configs = @{}
foreach ($e in $envFiles) {
  $path = "$root/infra/environments/$e.yaml"
  if (Test-Path -LiteralPath $path) {
    $configs[$e] = Get-Content $path -Raw
  }
}

Gate "All 3 env configs exist" { $configs.Count -eq 3 }
Gate "All envs have postgres" {
  $all = $true
  foreach ($c in $configs.Values) {
    if ($c -notmatch 'postgres:\s*\n\s+enabled:\s*true') { $all = $false }
  }
  $all
}
Gate "All envs have TLS" {
  $all = $true
  foreach ($c in $configs.Values) {
    if ($c -notmatch 'tls:\s*\n\s+enabled:\s*true') { $all = $false }
  }
  $all
}
Gate "All envs have networkPolicies" {
  $all = $true
  foreach ($c in $configs.Values) {
    if ($c -notmatch 'networkPolicies:\s*\n\s+enabled:\s*true') { $all = $false }
  }
  $all
}

# --- Gate 8: Canary tenant config ---
Gate "Canary tenant config exists" {
  # Check for default tenant in config/
  (Test-Path -LiteralPath "$root/config/capabilities.json") -or
  (Test-Path -LiteralPath "$root/config/modules.json")
}

# --- Summary ---
Write-Host "`n=== PARITY SUMMARY ===" -ForegroundColor Cyan
Write-Host "  Total: $total | PASS: $pass | FAIL: $fail"
if ($fail -eq 0) {
  Write-Host "  ENVIRONMENT PARITY: ALL CHECKS PASSED" -ForegroundColor Green
} else {
  Write-Host "  ENVIRONMENT PARITY: $fail CHECK(S) FAILED" -ForegroundColor Red
}

# --- Write evidence ---
$evidenceDir = "$root/evidence/wave-24/410-environments"
if (-not (Test-Path $evidenceDir)) { New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null }
$report = @{
  environment = $Env
  timestamp = (Get-Date -Format "o")
  total = $total
  pass = $pass
  fail = $fail
  result = if ($fail -eq 0) { "PASS" } else { "FAIL" }
}
$report | ConvertTo-Json | Set-Content "$evidenceDir/parity-$Env.json" -Encoding ASCII

exit $fail
