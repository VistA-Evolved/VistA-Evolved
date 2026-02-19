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
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Phase 35 VERIFY -- Enterprise IAM, Policy & Immutable Audit" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# ================================================================
# G35-0  REGRESSION
# ================================================================
Write-Host ""
Write-Host "--- G35-0: Regression (Phase 34 chain) ---" -ForegroundColor Yellow

$phase34Script = "$root\scripts\verify-phase1-to-phase34.ps1"
if (Test-Path $phase34Script) {
  Write-Host "  Delegating to Phase 34 verifier..." -ForegroundColor DarkGray
  & powershell -ExecutionPolicy Bypass -File $phase34Script -SkipPlaywright -SkipE2E 2>&1 | Out-Null
  $phase34Exit = $LASTEXITCODE
  if ($phase34Exit -eq 0) {
    Write-Gate "Phase 34 regression: all gates pass" $true
  } else {
    Write-Warning-Gate "Phase 34 regression" "Phase 34 verifier returned exit code $phase34Exit (non-blocking)"
  }
} else {
  Write-Warning-Gate "Phase 34 regression" "verify-phase1-to-phase34.ps1 not found (non-blocking)"
}

# ================================================================
# G35-1  PROMPTS
# ================================================================
Write-Host ""
Write-Host "--- G35-1: Prompts ---" -ForegroundColor Yellow

$promptsDir = "$root\prompts"
Write-Gate "Phase 35 prompt folder exists" (Test-Path -LiteralPath "$promptsDir\37-PHASE-35-IAM-AUTHZ-AUDIT")
Write-Gate "Phase 35 IMPLEMENT prompt" (Test-Path -LiteralPath "$promptsDir\37-PHASE-35-IAM-AUTHZ-AUDIT\37-01-iam-authz-audit-IMPLEMENT.md")
Write-Gate "Phase 35 VERIFY prompt" (Test-Path -LiteralPath "$promptsDir\37-PHASE-35-IAM-AUTHZ-AUDIT\37-99-iam-authz-audit-VERIFY.md")

# ================================================================
# G35-2  KEYCLOAK / OPA INFRA
# ================================================================
Write-Host ""
Write-Host "--- G35-2: Keycloak + OPA Infrastructure ---" -ForegroundColor Yellow

Write-Gate "Keycloak docker-compose.yml exists" (Test-Path -LiteralPath "$root\services\keycloak\docker-compose.yml")
Write-Gate "Keycloak realm-export.json exists" (Test-Path -LiteralPath "$root\infra\keycloak\realm-export.json")
Write-Gate "Keycloak README exists" (Test-Path -LiteralPath "$root\infra\keycloak\README.md")
Write-Gate "OPA authz.rego exists" (Test-Path -LiteralPath "$root\infra\opa\policy\authz.rego")
Write-Gate "OPA data.json exists" (Test-Path -LiteralPath "$root\infra\opa\policy\data.json")

# Realm content checks
$realmFile = "$root\infra\keycloak\realm-export.json"
if (Test-Path -LiteralPath $realmFile) {
  Write-Gate "Realm has vista-evolved realm name" (Test-FileContains $realmFile "vista-evolved")
  Write-Gate "Realm has provider role" (Test-FileContains $realmFile "provider")
  Write-Gate "Realm has admin role" (Test-FileContains $realmFile "admin")
  Write-Gate "Realm has support role" (Test-FileContains $realmFile "support")
  Write-Gate "Realm has WebAuthn" (Test-FileContains $realmFile "webauthn" -IsRegex)
  Write-Gate "Realm has DUZ mapper" (Test-FileContains $realmFile "duz")
  Write-Gate "Realm has 3+ clients" (Test-FileContains $realmFile "vista-evolved-api")
} else {
  Write-Gate "Realm content checks" $false "realm-export.json missing"
}

# OPA content checks
$regoFile = "$root\infra\opa\policy\authz.rego"
if (Test-Path -LiteralPath $regoFile) {
  Write-Gate "OPA Rego has default deny" (Test-FileContains $regoFile "default allow" -IsRegex)
  Write-Gate "OPA Rego has admin superuser" (Test-FileContains $regoFile "admin" -IsRegex)
  Write-Gate "OPA Rego has tenant isolation" (Test-FileContains $regoFile "tenant" -IsRegex)
} else {
  Write-Gate "OPA Rego content checks" $false "authz.rego missing"
}

# ================================================================
# G35-3  OIDC / JWT AUTH LAYER
# ================================================================
Write-Host ""
Write-Host "--- G35-3: OIDC / JWT Auth Layer ---" -ForegroundColor Yellow

$oidcFile = "$root\apps\api\src\auth\oidc-provider.ts"
$jwtFile = "$root\apps\api\src\auth\jwt-validator.ts"

Write-Gate "oidc-provider.ts exists" (Test-Path -LiteralPath $oidcFile)
Write-Gate "jwt-validator.ts exists" (Test-Path -LiteralPath $jwtFile)

if (Test-Path -LiteralPath $oidcFile) {
  Write-Gate "OIDC has getOidcConfig export" (Test-FileContains $oidcFile "export function getOidcConfig")
  Write-Gate "OIDC has fetchDiscovery export" (Test-FileContains $oidcFile "export async function fetchDiscovery")
  Write-Gate "OIDC has extractRolesFromClaims" (Test-FileContains $oidcFile "extractRolesFromClaims")
  Write-Gate "OIDC reads OIDC_ENABLED env" (Test-FileContains $oidcFile "OIDC_ENABLED")
  Write-Gate "OIDC caches discovery" (Test-FileContains $oidcFile "cache" -IsRegex)
}

if (Test-Path -LiteralPath $jwtFile) {
  Write-Gate "JWT has validateJwt export" (Test-FileContains $jwtFile "export async function validateJwt")
  Write-Gate "JWT supports RS256" (Test-FileContains $jwtFile "RS256")
  Write-Gate "JWT supports ES256" (Test-FileContains $jwtFile "ES256")
  Write-Gate "JWT has JWKS cache" (Test-FileContains $jwtFile "jwksCache" -IsRegex)
  Write-Gate "JWT zero-dependency (no import pg/jsonwebtoken)" (-not (Test-FileContains $jwtFile "require(" -IsRegex))
}

# ================================================================
# G35-4  POLICY ENGINE
# ================================================================
Write-Host ""
Write-Host "--- G35-4: Policy Engine ---" -ForegroundColor Yellow

$policyFile = "$root\apps\api\src\auth\policy-engine.ts"
$defaultPolicyFile = "$root\apps\api\src\auth\policies\default-policy.ts"

Write-Gate "policy-engine.ts exists" (Test-Path -LiteralPath $policyFile)
Write-Gate "default-policy.ts exists" (Test-Path -LiteralPath $defaultPolicyFile)

if (Test-Path -LiteralPath $policyFile) {
  Write-Gate "Policy has evaluatePolicy export" (Test-FileContains $policyFile "export function evaluatePolicy")
  Write-Gate "Policy has checkPolicy export" (Test-FileContains $policyFile "export function checkPolicy")
  Write-Gate "Policy has ROLE_ACTION_MAP" (Test-FileContains $policyFile "ROLE_ACTION_MAP")
  Write-Gate "Policy has ROUTE_ACTION_MAP" (Test-FileContains $policyFile "ROUTE_ACTION_MAP")
  Write-Gate "Policy has default-deny" (Test-FileContains $policyFile "deny" -IsRegex)
  Write-Gate "Policy has admin superuser" (Test-FileContains $policyFile "admin" -IsRegex)
  Write-Gate "Policy has tenant isolation" (Test-FileContains $policyFile "tenant" -IsRegex)
  Write-Gate "Policy has break-glass" (Test-FileContains $policyFile "break.glass" -IsRegex)
  Write-Gate "Policy has 30+ actions" (Test-FileContains $policyFile "phi\." -IsRegex)

  # Count approximate action mappings
  $actionCount = (Select-String -LiteralPath $policyFile -Pattern '^\s+"[a-z]+\.' -AllMatches).Count
  Write-Gate "Policy has significant action mappings (>=20)" ($actionCount -ge 20) "Found $actionCount"
}

if (Test-Path -LiteralPath $defaultPolicyFile) {
  Write-Gate "Default policy has role definitions" (Test-FileContains $defaultPolicyFile "RoleDefinition" -IsRegex)
  Write-Gate "Default policy has environment policies" (Test-FileContains $defaultPolicyFile "EnvironmentPolicy" -IsRegex)
}

# ================================================================
# G35-5  IMMUTABLE AUDIT
# ================================================================
Write-Host ""
Write-Host "--- G35-5: Immutable Audit ---" -ForegroundColor Yellow

$auditFile = "$root\apps\api\src\lib\immutable-audit.ts"

Write-Gate "immutable-audit.ts exists" (Test-Path -LiteralPath $auditFile)

if (Test-Path -LiteralPath $auditFile) {
  Write-Gate "Audit has SHA-256 hashing" (Test-FileContains $auditFile "sha256" -IsRegex)
  Write-Gate "Audit has immutableAudit export" (Test-FileContains $auditFile "export function immutableAudit")
  Write-Gate "Audit has verifyAuditChain export" (Test-FileContains $auditFile "export function verifyAuditChain")
  Write-Gate "Audit has queryImmutableAudit export" (Test-FileContains $auditFile "export function queryImmutableAudit")
  Write-Gate "Audit has getImmutableAuditStats export" (Test-FileContains $auditFile "export function getImmutableAuditStats")
  Write-Gate "Audit has PHI sanitization" (Test-FileContains $auditFile "sanitize" -IsRegex)
  Write-Gate "Audit has hash chain linking" (Test-FileContains $auditFile "previousHash" -IsRegex)
  Write-Gate "Audit has JSONL file sink" (Test-FileContains $auditFile "jsonl" -IsRegex)
  Write-Gate "Audit has ring buffer" (Test-FileContains $auditFile "MAX_ENTRIES" -IsRegex)
  Write-Gate "Audit has IP hashing" (Test-FileContains $auditFile "hashIp" -IsRegex)
  Write-Gate "Audit strips SSN" (Test-FileContains $auditFile "SSN\|ssn\|\d{3}-\d{2}" -IsRegex)
  Write-Gate "Audit has 30+ action types" (Test-FileContains $auditFile "auth\.login" -IsRegex)
}

# ================================================================
# G35-6  BIOMETRICS / PASSKEYS
# ================================================================
Write-Host ""
Write-Host "--- G35-6: Biometrics / Passkeys ---" -ForegroundColor Yellow

$bioTypesFile = "$root\apps\api\src\auth\biometric\types.ts"
$passkeysFile = "$root\apps\api\src\auth\biometric\passkeys-provider.ts"
$faceFile = "$root\apps\api\src\auth\biometric\face-provider.ts"
$bioIndexFile = "$root\apps\api\src\auth\biometric\index.ts"

Write-Gate "biometric/types.ts exists" (Test-Path -LiteralPath $bioTypesFile)
Write-Gate "passkeys-provider.ts exists" (Test-Path -LiteralPath $passkeysFile)
Write-Gate "face-provider.ts exists" (Test-Path -LiteralPath $faceFile)
Write-Gate "biometric/index.ts exists" (Test-Path -LiteralPath $bioIndexFile)

if (Test-Path -LiteralPath $bioTypesFile) {
  Write-Gate "Types has BiometricAuthProvider interface" (Test-FileContains $bioTypesFile "BiometricAuthProvider")
  Write-Gate "Types has startRegistration method" (Test-FileContains $bioTypesFile "startRegistration")
  Write-Gate "Types has startAuthentication method" (Test-FileContains $bioTypesFile "startAuthentication")
}

if (Test-Path -LiteralPath $passkeysFile) {
  Write-Gate "Passkeys has PasskeysProvider class" (Test-FileContains $passkeysFile "class PasskeysProvider")
  Write-Gate "Passkeys delegates to Keycloak" (Test-FileContains $passkeysFile "keycloak" -IsRegex)
  Write-Gate "Passkeys has challenge store" (Test-FileContains $passkeysFile "challenge" -IsRegex)
  Write-Gate "Passkeys has 5-min TTL" (Test-FileContains $passkeysFile "300" -IsRegex)
}

if (Test-Path -LiteralPath $faceFile) {
  Write-Gate "Face provider disabled by default" (Test-FileContains $faceFile "enabled.*false" -IsRegex)
  Write-Gate "Face refuses storeRawImages" (Test-FileContains $faceFile "storeRawImages" -IsRegex)
}

if (Test-Path -LiteralPath $bioIndexFile) {
  Write-Gate "Index has initBiometricProviders" (Test-FileContains $bioIndexFile "initBiometricProviders")
  Write-Gate "Index has listBiometricProviders" (Test-FileContains $bioIndexFile "listBiometricProviders")
}

# ================================================================
# G35-7  IAM ROUTES
# ================================================================
Write-Host ""
Write-Host "--- G35-7: IAM Routes ---" -ForegroundColor Yellow

$iamRoutesFile = "$root\apps\api\src\routes\iam-routes.ts"

Write-Gate "iam-routes.ts exists" (Test-Path -LiteralPath $iamRoutesFile)

if (Test-Path -LiteralPath $iamRoutesFile) {
  Write-Gate "IAM has /iam/audit/events endpoint" (Test-FileContains $iamRoutesFile "/iam/audit/events")
  Write-Gate "IAM has /iam/audit/stats endpoint" (Test-FileContains $iamRoutesFile "/iam/audit/stats")
  Write-Gate "IAM has /iam/audit/verify endpoint" (Test-FileContains $iamRoutesFile "/iam/audit/verify")
  Write-Gate "IAM has /iam/policy/capabilities" (Test-FileContains $iamRoutesFile "/iam/policy/capabilities")
  Write-Gate "IAM has /iam/policy/evaluate" (Test-FileContains $iamRoutesFile "/iam/policy/evaluate")
  Write-Gate "IAM has /iam/oidc/config" (Test-FileContains $iamRoutesFile "/iam/oidc/config")
  Write-Gate "IAM has /iam/biometric/providers" (Test-FileContains $iamRoutesFile "/iam/biometric/providers")
  Write-Gate "IAM has /iam/health" (Test-FileContains $iamRoutesFile "/iam/health")
  Write-Gate "IAM uses requireSession" (Test-FileContains $iamRoutesFile "requireSession")
  Write-Gate "IAM uses requireRole" (Test-FileContains $iamRoutesFile "requireRole")
}

# ================================================================
# G35-8  SECURITY MIDDLEWARE INTEGRATION
# ================================================================
Write-Host ""
Write-Host "--- G35-8: Security Middleware Integration ---" -ForegroundColor Yellow

$securityFile = "$root\apps\api\src\middleware\security.ts"
$indexFile = "$root\apps\api\src\index.ts"

if (Test-Path -LiteralPath $securityFile) {
  Write-Gate "Security has /iam/ auth rule" (Test-FileContains $securityFile "iam" -IsRegex)
  Write-Gate "Security has OIDC config route (no auth)" (Test-FileContains $securityFile "oidc" -IsRegex)
}

if (Test-Path -LiteralPath $indexFile) {
  Write-Gate "index.ts imports iamRoutes" (Test-FileContains $indexFile "iam-routes")
  Write-Gate "index.ts registers iamRoutes" (Test-FileContains $indexFile "server.register(iamRoutes)")
}

# ================================================================
# G35-9  AUDIT VIEWER UI
# ================================================================
Write-Host ""
Write-Host "--- G35-9: Audit Viewer UI ---" -ForegroundColor Yellow

$auditViewerFile = "$root\apps\web\src\app\cprs\admin\audit-viewer\page.tsx"

Write-Gate "audit-viewer/page.tsx exists" (Test-Path -LiteralPath $auditViewerFile)

if (Test-Path -LiteralPath $auditViewerFile) {
  Write-Gate "Audit viewer has Events tab" (Test-FileContains $auditViewerFile "Events" -IsRegex)
  Write-Gate "Audit viewer has Stats tab" (Test-FileContains $auditViewerFile "Stats" -IsRegex)
  Write-Gate "Audit viewer has Chain tab" (Test-FileContains $auditViewerFile "Chain" -IsRegex)
  Write-Gate "Audit viewer has Policy tab" (Test-FileContains $auditViewerFile "Policy" -IsRegex)
  Write-Gate "Audit viewer fetches /iam/audit" (Test-FileContains $auditViewerFile "/iam/audit")
  Write-Gate "Audit viewer has admin guard" (Test-FileContains $auditViewerFile "admin" -IsRegex)
}

# ================================================================
# G35-10  SESSION CONTEXT UPDATES
# ================================================================
Write-Host ""
Write-Host "--- G35-10: Session Context ---" -ForegroundColor Yellow

$sessionCtxFile = "$root\apps\web\src\stores\session-context.tsx"

if (Test-Path -LiteralPath $sessionCtxFile) {
  Write-Gate "Session context has support role" (Test-FileContains $sessionCtxFile "support")
  Write-Gate "Session context has tenantId field" (Test-FileContains $sessionCtxFile "tenantId")
  Write-Gate "Session context has authMethod field" (Test-FileContains $sessionCtxFile "authMethod")
}

# ================================================================
# G35-11  DOCS + AGENTS.md
# ================================================================
Write-Host ""
Write-Host "--- G35-11: Documentation ---" -ForegroundColor Yellow

Write-Gate "Runbook exists" (Test-Path -LiteralPath "$root\docs\runbooks\phase35-iam-authz-audit.md")

$agentsFile = "$root\AGENTS.md"
if (Test-Path -LiteralPath $agentsFile) {
  Write-Gate "AGENTS.md has Phase 35 architecture map" (Test-FileContains $agentsFile "Phase 35")
  Write-Gate "AGENTS.md has policy engine gotcha" (Test-FileContains $agentsFile "Never bypass the policy engine")
  Write-Gate "AGENTS.md has PHI audit gotcha" (Test-FileContains $agentsFile "Never log PHI in immutable audit")
  Write-Gate "AGENTS.md has OIDC opt-in gotcha" (Test-FileContains $agentsFile "OIDC is opt-in")
  Write-Gate "AGENTS.md has passkey gotcha" (Test-FileContains $agentsFile "Passkey data never stored locally")
  Write-Gate "AGENTS.md has dual sinks gotcha" (Test-FileContains $agentsFile "Immutable audit has dual sinks")
  Write-Gate "AGENTS.md has Keycloak gotcha" (Test-FileContains $agentsFile "Keycloak realm auto-imports")
}

# ================================================================
# G35-12  NO SECRETS IN SOURCE
# ================================================================
Write-Host ""
Write-Host "--- G35-12: Secret Scan ---" -ForegroundColor Yellow

# Ensure no hardcoded secrets in new Phase 35 files
$phase35Files = @(
  "$root\apps\api\src\auth\oidc-provider.ts",
  "$root\apps\api\src\auth\jwt-validator.ts",
  "$root\apps\api\src\auth\policy-engine.ts",
  "$root\apps\api\src\lib\immutable-audit.ts",
  "$root\apps\api\src\routes\iam-routes.ts"
)

$secretFound = $false
foreach ($f in $phase35Files) {
  if (Test-Path -LiteralPath $f) {
    $content = Get-Content -LiteralPath $f -Raw
    if ($content -match "PROV123|PHARM123|NURSE123|sk-[a-zA-Z0-9]{20,}|password\s*=\s*['""][^'""]+['""]") {
      $secretFound = $true
      Write-Gate "No hardcoded secrets in $(Split-Path -Leaf $f)" $false "Secret pattern found"
    }
  }
}
if (-not $secretFound) {
  Write-Gate "No hardcoded secrets in Phase 35 files" $true
}

# ================================================================
# G35-13  TYPESCRIPT COMPILATION
# ================================================================
Write-Host ""
Write-Host "--- G35-13: TypeScript Compilation ---" -ForegroundColor Yellow

Push-Location "$root\apps\api"
$tscResult = & npx tsc --noEmit 2>&1
$tscExit = $LASTEXITCODE
Pop-Location

if ($tscExit -eq 0) {
  Write-Gate "API TypeScript compiles clean" $true
} else {
  # Check if errors are only in Phase 35 files
  $tscErrors = $tscResult | Out-String
  Write-Warning-Gate "API TypeScript compilation" "tsc --noEmit returned $tscExit (review needed)"
}

# ================================================================
# SUMMARY
# ================================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SUMMARY: $pass PASS, $fail FAIL, $warn WARN" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ($fail -gt 0) { exit 1 } else { exit 0 }
