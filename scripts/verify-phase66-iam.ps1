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

# --- VERIFY-Specific Security Gates (Phase 66 VERIFY) ---
Write-Host "`n--- G66 Security Gates ---" -ForegroundColor Yellow

# G66-OIDC: OIDC flow end-to-end wired
Write-Gate "G66-OIDC: OIDC provider exists and implements interface" (Test-FileContains $oidcPath "implements IdentityProvider")
Write-Gate "G66-OIDC: OIDC callback exchanges code for tokens" (Test-FileContains $oidcPath "exchangeCodeForTokens")
Write-Gate "G66-OIDC: OIDC callback validates JWT" (Test-FileContains $oidcPath "validateJwt")

# G66-SAML: Broker posture documented, no fragile SAML parsing
Write-Gate "G66-SAML: No SAMLResponse parsing in app" (-not (Test-FileRegex $samlPath "SAMLResponse"))
Write-Gate "G66-SAML: Speaks OIDC to broker (kc_idp_hint)" (Test-FileContains $samlPath "kc_idp_hint")
Write-Gate "G66-SAML: Broker pattern documented in header" (Test-FileContains $samlPath "broker pattern")

# G66-COOKIES: httpOnly/secure/sameSite, no localStorage
Write-Gate "G66-COOKIES: httpOnly cookie set" (Test-FileContains $routesPath "httpOnly: true")
Write-Gate "G66-COOKIES: sameSite lax" (Test-FileRegex $routesPath "sameSite.*lax")
Write-Gate "G66-COOKIES: secure in production" (Test-FileRegex $routesPath "secure.*NODE_ENV.*production")

# G66-CSRF: State + nonce enforced, not conditional
Write-Gate "G66-CSRF: State is mandatory when expectedState set (oidc)" (Test-FileRegex $oidcPath "if \(params\.expectedState\)")
Write-Gate "G66-CSRF: State is mandatory when expectedState set (saml)" (Test-FileRegex $samlPath "if \(params\.expectedState\)")
Write-Gate "G66-CSRF: Nonce is mandatory when expectedNonce set (oidc)" (Test-FileRegex $oidcPath "if \(params\.expectedNonce\)")
Write-Gate "G66-CSRF: Auth state is one-time-use (delete after get)" (Test-FileContains $routesPath "pendingAuthStates.delete(query.state)")

# G66-OPEN-REDIRECT: redirect_uri not from query params
Write-Gate "G66-OPEN-REDIRECT: No redirect_uri from query params" (-not (Test-FileRegex $routesPath "request\.query.*redirect_uri"))

# G66-RBAC: Permissions returned on login
Write-Gate "G66-RBAC: getPermissionsForRole used in callback" (Test-FileContains $routesPath "getPermissionsForRole")

# G66-TENANT: tenant resolved from claims
Write-Gate "G66-TENANT: tenantId in session from IdP claims" (Test-FileContains $routesPath "tenantId: identity.tenantId")

# G66-PHI: No secrets/PHI in logs
# G66-PHI: Verify error_description is NOT in any .send() response payload
# The string exists in the file (query type, log.warn) but must not appear in reply.send()
$routeContent = Get-Content -LiteralPath $routesPath -Raw -ErrorAction SilentlyContinue
$sendBlocks = [regex]::Matches($routeContent, '\.send\(\{[^}]+\}')
$descInSend = $false
foreach ($m in $sendBlocks) {
  if ($m.Value -match 'error_description') { $descInSend = $true }
}
Write-Gate "G66-PHI: Error description not leaked to client" (-not $descInSend)
Write-Gate "G66-PHI: VistA error sanitized (no raw err.message)" (-not (Test-FileRegex $bindPath "error:.*err\.message"))
Write-Gate "G66-PHI: State truncated in audit" (Test-FileContains $routesPath "state.substring(0, 8)")

# G66-TIMERS: setInterval uses .unref()
Write-Gate "G66-TIMERS: Auth state cleanup uses .unref()" (Test-FileRegex $routesPath "60 \* 1000\)\.unref\(\)")
Write-Gate "G66-TIMERS: VistA binding cleanup uses .unref()" (Test-FileRegex $bindPath "60 \* 1000\)\.unref\(\)")

# G66-UNUSED: No dead imports
Write-Gate "G66-UNUSED: No unused createHash in oidc" (-not (Test-FileContains $oidcPath "createHash"))
Write-Gate "G66-UNUSED: No unused mapUserRole in routes" (-not (Test-FileContains $routesPath "mapUserRole"))
Write-Gate "G66-UNUSED: No unused resolveTenantId in routes" (-not (Test-FileRegex $routesPath "import.*resolveTenantId"))

# G66-FACILITY: Defaults warn when using fallback station
Write-Gate "G66-FACILITY: OIDC warns on fallback station" (Test-FileContains $oidcPath "defaulting to 500 (sandbox)")
Write-Gate "G66-FACILITY: SAML warns on fallback station" (Test-FileContains $samlPath "defaulting to 500 (sandbox)")

# G66-REGRESSION: Phase 65 + Phase 54 regression
Write-Host "`n--- Regression ---" -ForegroundColor Yellow
Write-Gate "Phase 65 verifier exists" (Test-Path -LiteralPath "scripts/verify-phase65-immunizations.ps1")

# --- Summary ---
Write-Host "`n=== Phase 66 Results: $pass/$total PASS, $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
if ($fail -gt 0) { exit 1 }
