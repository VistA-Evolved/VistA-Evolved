<# Phase 66 -- Production IAM v1 (OIDC + SAML Posture) Verification
   Checks: IdP types, OIDC provider, SAML broker, VistA binding,
   provider registry, routes, security posture, audit, capabilities.
#>
param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $total = 0

function Write-Gate([string]$Name, [bool]$Ok) {
  $script:total++
  if ($Ok) { $script:pass++; Write-Host "  PASS  $Name" -ForegroundColor Green }
  else     { $script:fail++; Write-Host "  FAIL  $Name" -ForegroundColor Red }
}

function Test-FileContains([string]$Path, [string]$Pattern) {
  if (!(Test-Path -LiteralPath $Path)) { return $false }
  $content = Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue
  return ($content -match [regex]::Escape($Pattern))
}

function Test-FileRegex([string]$Path, [string]$Regex) {
  if (!(Test-Path -LiteralPath $Path)) { return $false }
  $content = Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue
  return ($content -match $Regex)
}

Write-Host "`n=== Phase 66: Production IAM v1 (OIDC + SAML Posture) ===" -ForegroundColor Cyan

# --- Artifacts ---
Write-Host "`n--- Artifacts ---" -ForegroundColor Yellow
Write-Gate "inventory.json exists" (Test-Path -LiteralPath "artifacts/phase66/inventory.json")
Write-Gate "iam-plan.json exists" (Test-Path -LiteralPath "artifacts/phase66/iam-plan.json")

# --- Prompts ---
Write-Host "`n--- Prompts ---" -ForegroundColor Yellow
Write-Gate "72-01-IMPLEMENT.md exists" (Test-Path -LiteralPath "prompts/72-PHASE-66-PRODUCTION-IAM-V1/72-01-IMPLEMENT.md")
Write-Gate "72-99-VERIFY.md exists" (Test-Path -LiteralPath "prompts/72-PHASE-66-PRODUCTION-IAM-V1/72-99-VERIFY.md")

# --- IdP Types ---
Write-Host "`n--- IdP Types (types.ts) ---" -ForegroundColor Yellow
$typesPath = "apps/api/src/auth/idp/types.ts"
Write-Gate "types.ts exists" (Test-Path -LiteralPath $typesPath)
Write-Gate "IdentityProvider interface" (Test-FileContains $typesPath "interface IdentityProvider")
Write-Gate "IdentityResult type" (Test-FileContains $typesPath "IdentityResult")
Write-Gate "IdpType union (vista|oidc|saml-broker)" (Test-FileRegex $typesPath "vista.*oidc.*saml-broker")
Write-Gate "getAuthorizationUrl method" (Test-FileContains $typesPath "getAuthorizationUrl")
Write-Gate "handleCallback method" (Test-FileContains $typesPath "handleCallback")
Write-Gate "isEnabled method" (Test-FileContains $typesPath "isEnabled")
Write-Gate "healthCheck method" (Test-FileContains $typesPath "healthCheck")
Write-Gate "VistaBindingResult type" (Test-FileContains $typesPath "VistaBindingResult")
Write-Gate "VistaBindingStatus type" (Test-FileContains $typesPath "VistaBindingStatus")
Write-Gate "OidcIdpConfig type" (Test-FileContains $typesPath "OidcIdpConfig")
Write-Gate "SamlBrokerConfig type" (Test-FileContains $typesPath "SamlBrokerConfig")

# --- OIDC Provider ---
Write-Host "`n--- OIDC Provider (oidc-idp.ts) ---" -ForegroundColor Yellow
$oidcPath = "apps/api/src/auth/idp/oidc-idp.ts"
Write-Gate "oidc-idp.ts exists" (Test-Path -LiteralPath $oidcPath)
Write-Gate "implements IdentityProvider" (Test-FileContains $oidcPath "implements IdentityProvider")
Write-Gate "OidcIdentityProvider class" (Test-FileContains $oidcPath "class OidcIdentityProvider")
Write-Gate "IDP_OIDC_ENABLED env var" (Test-FileContains $oidcPath "IDP_OIDC_ENABLED")
Write-Gate "IDP_OIDC_ISSUER env var" (Test-FileContains $oidcPath "IDP_OIDC_ISSUER")
Write-Gate "IDP_OIDC_CLIENT_ID env var" (Test-FileContains $oidcPath "IDP_OIDC_CLIENT_ID")
Write-Gate "IDP_OIDC_CLIENT_SECRET env var" (Test-FileContains $oidcPath "IDP_OIDC_CLIENT_SECRET")
Write-Gate "Authorization code exchange" (Test-FileContains $oidcPath "exchangeCodeForTokens")
Write-Gate "JWT validation used" (Test-FileContains $oidcPath "validateJwt")
Write-Gate "Claims mapping" (Test-FileContains $oidcPath "mapClaimsToIdentity")
Write-Gate "No localStorage mention" (-not (Test-FileContains $oidcPath "localStorage"))

# --- SAML Broker ---
Write-Host "`n--- SAML Broker (saml-broker-idp.ts) ---" -ForegroundColor Yellow
$samlPath = "apps/api/src/auth/idp/saml-broker-idp.ts"
Write-Gate "saml-broker-idp.ts exists" (Test-Path -LiteralPath $samlPath)
Write-Gate "implements IdentityProvider" (Test-FileContains $samlPath "implements IdentityProvider")
Write-Gate "SamlBrokerIdentityProvider class" (Test-FileContains $samlPath "class SamlBrokerIdentityProvider")
Write-Gate "Broker pattern (speaks OIDC)" (Test-FileContains $samlPath "kc_idp_hint")
Write-Gate "IDP_SAML_BROKER_ENABLED env var" (Test-FileContains $samlPath "IDP_SAML_BROKER_ENABLED")
Write-Gate "IDP_SAML_BROKER_IDP_ALIAS env var" (Test-FileContains $samlPath "IDP_SAML_BROKER_IDP_ALIAS")
Write-Gate "No SAML XML parsing in app" (-not (Test-FileRegex $samlPath "SAMLResponse|saml2p:|urn:oasis:names"))

# --- VistA Binding ---
Write-Host "`n--- VistA Binding (vista-binding.ts) ---" -ForegroundColor Yellow
$bindPath = "apps/api/src/auth/idp/vista-binding.ts"
Write-Gate "vista-binding.ts exists" (Test-Path -LiteralPath $bindPath)
Write-Gate "bindVistaSession function" (Test-FileContains $bindPath "bindVistaSession")
Write-Gate "getVistaBinding function" (Test-FileContains $bindPath "getVistaBinding")
Write-Gate "getVistaBindingStatus function" (Test-FileContains $bindPath "getVistaBindingStatus")
Write-Gate "requireVistaBinding function" (Test-FileContains $bindPath "requireVistaBinding")
Write-Gate "unbindVistaSession function" (Test-FileContains $bindPath "unbindVistaSession")
Write-Gate "XUS AV CODE target" (Test-FileContains $bindPath "XUS AV CODE")
Write-Gate "XWB CREATE CONTEXT target" (Test-FileContains $bindPath "XWB CREATE CONTEXT")
Write-Gate "pendingTargets array" (Test-FileContains $bindPath "pendingTargets")
Write-Gate "8h TTL for binding" (Test-FileRegex $bindPath "8\s*\*\s*60\s*\*\s*60\s*\*\s*1000|28800000")

# --- Provider Registry ---
Write-Host "`n--- Provider Registry (index.ts) ---" -ForegroundColor Yellow
$registryPath = "apps/api/src/auth/idp/index.ts"
Write-Gate "index.ts exists" (Test-Path -LiteralPath $registryPath)
Write-Gate "initIdentityProviders function" (Test-FileContains $registryPath "initIdentityProviders")
Write-Gate "getProvider function" (Test-FileContains $registryPath "getProvider")
Write-Gate "getDefaultProvider function" (Test-FileContains $registryPath "getDefaultProvider")
Write-Gate "listProviders function" (Test-FileContains $registryPath "listProviders")
Write-Gate "checkAllProviderHealth function" (Test-FileContains $registryPath "checkAllProviderHealth")

# --- IdP Routes ---
Write-Host "`n--- IdP Routes (idp-routes.ts) ---" -ForegroundColor Yellow
$routesPath = "apps/api/src/auth/idp/idp-routes.ts"
Write-Gate "idp-routes.ts exists" (Test-Path -LiteralPath $routesPath)
Write-Gate "GET /auth/idp/providers" (Test-FileContains $routesPath "/auth/idp/providers")
Write-Gate "GET /auth/idp/authorize/:type" (Test-FileContains $routesPath "/auth/idp/authorize/:type")
Write-Gate "GET /auth/idp/callback/:type" (Test-FileContains $routesPath "/auth/idp/callback/:type")
Write-Gate "POST /auth/idp/vista-bind" (Test-FileContains $routesPath "/auth/idp/vista-bind")
Write-Gate "GET /auth/idp/vista-status" (Test-FileContains $routesPath "/auth/idp/vista-status")
Write-Gate "GET /auth/idp/health" (Test-FileContains $routesPath "/auth/idp/health")

# --- Security Posture ---
Write-Host "`n--- Security Posture ---" -ForegroundColor Yellow
Write-Gate "State param for CSRF in auth flow" (Test-FileContains $routesPath "state")
Write-Gate "Nonce for replay protection" (Test-FileContains $routesPath "nonce")
Write-Gate "httpOnly cookie (setCookie + httpOnly)" (Test-FileContains $routesPath "setCookie")
Write-Gate "No localStorage in routes" (-not (Test-FileContains $routesPath "localStorage"))
Write-Gate "randomBytes for state generation" (Test-FileContains $routesPath "randomBytes")
Write-Gate "Auth state TTL (5 min)" (Test-FileRegex $routesPath "5\s*\*\s*60\s*\*\s*1000|300000|300_000")

# --- index.ts Wiring ---
Write-Host "`n--- API index.ts Wiring ---" -ForegroundColor Yellow
$indexPath = "apps/api/src/index.ts"
Write-Gate "idpRoutes imported" (Test-FileContains $indexPath "idpRoutes")
Write-Gate "initIdentityProviders called" (Test-FileContains $indexPath "initIdentityProviders")
Write-Gate "idpRoutes registered" (Test-FileContains $indexPath "server.register(idpRoutes)")

# --- Audit Types ---
Write-Host "`n--- Audit Integration ---" -ForegroundColor Yellow
$auditPath = "apps/api/src/lib/audit.ts"
Write-Gate "auth.idp.authorize audit action" (Test-FileContains $auditPath "auth.idp.authorize")
Write-Gate "auth.idp.callback audit action" (Test-FileContains $auditPath "auth.idp.callback")
Write-Gate "auth.idp.login audit action" (Test-FileContains $auditPath "auth.idp.login")
Write-Gate "auth.vista-bind audit action" (Test-FileContains $auditPath "auth.vista-bind")

$immAuditPath = "apps/api/src/lib/immutable-audit.ts"
Write-Gate "auth.idp.login immutable audit" (Test-FileContains $immAuditPath "auth.idp.login")
Write-Gate "auth.idp.failed immutable audit" (Test-FileContains $immAuditPath "auth.idp.failed")
Write-Gate "auth.vista-bind immutable audit" (Test-FileContains $immAuditPath "auth.vista-bind")

# --- Capabilities ---
Write-Host "`n--- Capabilities ---" -ForegroundColor Yellow
$capsPath = "config/capabilities.json"
Write-Gate "iam.oidc.login capability" (Test-FileContains $capsPath "iam.oidc.login")
Write-Gate "iam.saml-broker.login capability" (Test-FileContains $capsPath "iam.saml-broker.login")
Write-Gate "iam.vista-binding capability" (Test-FileContains $capsPath "iam.vista-binding")
Write-Gate "iam.idp.health capability" (Test-FileContains $capsPath "iam.idp.health")
Write-Gate "XUS AV CODE in vista-binding cap" (Test-FileRegex $capsPath 'iam\.vista-binding[\s\S]*?XUS AV CODE')

# --- Runbook ---
Write-Host "`n--- Runbook ---" -ForegroundColor Yellow
$runbookPath = "docs/runbooks/auth-oidc-saml.md"
Write-Gate "auth-oidc-saml.md runbook exists" (Test-Path -LiteralPath $runbookPath)
Write-Gate "Runbook covers OIDC config" (Test-FileContains $runbookPath "IDP_OIDC_ENABLED")
Write-Gate "Runbook covers SAML broker config" (Test-FileContains $runbookPath "IDP_SAML_BROKER_ENABLED")
Write-Gate "Runbook covers vista-bind" (Test-FileContains $runbookPath "vista-bind")
Write-Gate "Runbook covers Keycloak" (Test-FileContains $runbookPath "Keycloak")

# --- TSC Clean ---
Write-Host "`n--- TypeScript Compilation ---" -ForegroundColor Yellow
Push-Location "apps/api"
$tscOut = & npx tsc --noEmit 2>&1 | Out-String
$tscOk = $LASTEXITCODE -eq 0
Pop-Location
Write-Gate "TSC clean (apps/api)" $tscOk
if (-not $tscOk) { Write-Host "    TSC output: $tscOut" -ForegroundColor DarkGray }

# --- No localStorage tokens anywhere in IdP code ---
Write-Host "`n--- Anti-Patterns ---" -ForegroundColor Yellow
$idpDir = "apps/api/src/auth/idp"
$idpFiles = Get-ChildItem -LiteralPath $idpDir -Filter "*.ts" -ErrorAction SilentlyContinue
$localStorageFound = $false
foreach ($f in $idpFiles) {
  if (Test-FileContains $f.FullName "localStorage") { $localStorageFound = $true }
}
Write-Gate "No localStorage in any IdP file" (-not $localStorageFound)

$bearerTokenFound = $false
foreach ($f in $idpFiles) {
  if (Test-FileRegex $f.FullName "Authorization.*Bearer.*token") { $bearerTokenFound = $true }
}
Write-Gate "No Bearer token pattern in IdP code" (-not $bearerTokenFound)

# --- Summary ---
Write-Host "`n=== Phase 66 Results: $pass/$total PASS, $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
if ($fail -gt 0) { exit 1 }
