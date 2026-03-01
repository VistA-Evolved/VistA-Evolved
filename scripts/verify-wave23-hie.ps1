<#
.SYNOPSIS
  Wave 23 -- Longitudinal Interop + HIE + Multi-Country Exchange Packs Certification Runner
  Phase 408 (W23-P10): Push-button verification across all 9 implementation phases.

.DESCRIPTION
  Verifies file existence, barrel exports, route registrations, AUTH_RULES,
  store-policy entries, type coverage, and prompt folder completeness
  for Phases 399-407 (W23-P1 through W23-P9).

.PARAMETER SkipDocker
  Skip Docker-dependent checks.
#>
param(
  [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$pass = 0
$fail = 0
$total = 0

function Gate([string]$name, [scriptblock]$test) {
  $script:total++
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $name" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $name -- $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
  }
}

function FileExists([string]$rel) {
  $p = Join-Path $root $rel
  return (Test-Path -LiteralPath $p)
}

function FileContains([string]$rel, [string]$pattern) {
  $p = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $p)) { return $false }
  $content = Get-Content -LiteralPath $p -Raw -ErrorAction SilentlyContinue
  return ($content -match [regex]::Escape($pattern))
}

function FileMatchesRegex([string]$rel, [string]$regex) {
  $p = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $p)) { return $false }
  $content = Get-Content -LiteralPath $p -Raw -ErrorAction SilentlyContinue
  return ($content -match $regex)
}

Write-Host ""
Write-Host "=== Wave 23 Longitudinal Interop + HIE -- Certification Runner ===" -ForegroundColor Cyan
Write-Host "  Phase 408 (W23-P10) -- $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

# -------------------------------------------------------------------------
# Section 1: P1 Manifest + ADRs (Phase 399)
# -------------------------------------------------------------------------
Write-Host "--- Section 1: P1 Manifest + ADRs (Phase 399) ---" -ForegroundColor Yellow

Gate "Manifest exists" { FileExists "prompts\WAVE_23_MANIFEST.md" }
Gate "ADR interop gateway" { FileExists "docs\decisions\ADR-W23-INTEROP-GATEWAY.md" }
Gate "ADR MPI design" { FileExists "docs\decisions\ADR-W23-MPI.md" }
Gate "ADR consent POU" { FileExists "docs\decisions\ADR-W23-CONSENT-POU.md" }
Gate "ADR exchange packs" { FileExists "docs\decisions\ADR-W23-TEFCA-PACK.md" }
Gate "ADR bulk data" { FileExists "docs\decisions\ADR-W23-BULK-DATA.md" }
Gate "Country exchange map" { FileExists "docs\interop\country-exchange-map.md" }

# -------------------------------------------------------------------------
# Section 2: P2 Interop Gateway (Phase 400)
# -------------------------------------------------------------------------
Write-Host "--- Section 2: P2 Interop Gateway (Phase 400) ---" -ForegroundColor Yellow

Gate "gateway types.ts" { FileExists "apps\api\src\interop-gateway\types.ts" }
Gate "gateway-store.ts" { FileExists "apps\api\src\interop-gateway\gateway-store.ts" }
Gate "gateway-routes.ts" { FileExists "apps\api\src\interop-gateway\gateway-routes.ts" }
Gate "gateway index.ts barrel" { FileExists "apps\api\src\interop-gateway\index.ts" }
Gate "gateway exports interopGatewayRoutes" {
  FileContains "apps\api\src\interop-gateway\index.ts" "interopGatewayRoutes"
}
Gate "gateway types: GatewayChannel" {
  FileContains "apps\api\src\interop-gateway\types.ts" "GatewayChannel"
}
Gate "gateway types: TransformPipeline" {
  FileContains "apps\api\src\interop-gateway\types.ts" "TransformPipeline"
}
Gate "gateway types: GatewayTransaction" {
  FileContains "apps\api\src\interop-gateway\types.ts" "GatewayTransaction"
}
Gate "gateway types: MediatorConfig" {
  FileContains "apps\api\src\interop-gateway\types.ts" "MediatorConfig"
}

# -------------------------------------------------------------------------
# Section 3: P3 MPI / Client Registry (Phase 401)
# -------------------------------------------------------------------------
Write-Host "--- Section 3: P3 MPI / Client Registry (Phase 401) ---" -ForegroundColor Yellow

Gate "mpi types.ts" { FileExists "apps\api\src\mpi\types.ts" }
Gate "mpi-store.ts" { FileExists "apps\api\src\mpi\mpi-store.ts" }
Gate "mpi-routes.ts" { FileExists "apps\api\src\mpi\mpi-routes.ts" }
Gate "mpi index.ts barrel" { FileExists "apps\api\src\mpi\index.ts" }
Gate "mpi exports mpiRoutes" {
  FileContains "apps\api\src\mpi\index.ts" "mpiRoutes"
}
Gate "mpi types: MpiPatientIdentity" {
  FileContains "apps\api\src\mpi\types.ts" "MpiPatientIdentity"
}
Gate "mpi types: IdentifierSystem" {
  FileContains "apps\api\src\mpi\types.ts" "IdentifierSystem"
}
Gate "mpi store: findMatches" {
  FileContains "apps\api\src\mpi\mpi-store.ts" "findMatches"
}
Gate "mpi store: mergeIdentities" {
  FileContains "apps\api\src\mpi\mpi-store.ts" "mergeIdentities"
}

# -------------------------------------------------------------------------
# Section 4: P4 Provider Directory (Phase 402)
# -------------------------------------------------------------------------
Write-Host "--- Section 4: P4 Provider Directory (Phase 402) ---" -ForegroundColor Yellow

Gate "directory types.ts" { FileExists "apps\api\src\provider-directory\types.ts" }
Gate "directory-store.ts" { FileExists "apps\api\src\provider-directory\directory-store.ts" }
Gate "directory-routes.ts" { FileExists "apps\api\src\provider-directory\directory-routes.ts" }
Gate "directory index.ts barrel" { FileExists "apps\api\src\provider-directory\index.ts" }
Gate "directory exports providerDirectoryRoutes" {
  FileContains "apps\api\src\provider-directory\index.ts" "providerDirectoryRoutes"
}
Gate "directory types: DirectoryPractitioner" {
  FileContains "apps\api\src\provider-directory\types.ts" "DirectoryPractitioner"
}
Gate "directory types: DirectoryOrganization" {
  FileContains "apps\api\src\provider-directory\types.ts" "DirectoryOrganization"
}
Gate "directory types: DirectoryLocation" {
  FileContains "apps\api\src\provider-directory\types.ts" "DirectoryLocation"
}

# -------------------------------------------------------------------------
# Section 5: P5 Document Exchange (Phase 403)
# -------------------------------------------------------------------------
Write-Host "--- Section 5: P5 Document Exchange (Phase 403) ---" -ForegroundColor Yellow

Gate "exchange types.ts" { FileExists "apps\api\src\document-exchange\types.ts" }
Gate "exchange-store.ts" { FileExists "apps\api\src\document-exchange\exchange-store.ts" }
Gate "exchange-routes.ts" { FileExists "apps\api\src\document-exchange\exchange-routes.ts" }
Gate "exchange index.ts barrel" { FileExists "apps\api\src\document-exchange\index.ts" }
Gate "exchange exports documentExchangeRoutes" {
  FileContains "apps\api\src\document-exchange\index.ts" "documentExchangeRoutes"
}
Gate "exchange types: DocumentReference" {
  FileContains "apps\api\src\document-exchange\types.ts" "DocumentReference"
}
Gate "exchange types: DocumentSubmissionSet" {
  FileContains "apps\api\src\document-exchange\types.ts" "DocumentSubmissionSet"
}
Gate "exchange store: SHA-256 hashing" {
  FileMatchesRegex "apps\api\src\document-exchange\exchange-store.ts" "sha256|createHash"
}

# -------------------------------------------------------------------------
# Section 6: P6 Bulk Data (Phase 404)
# -------------------------------------------------------------------------
Write-Host "--- Section 6: P6 Bulk Data (Phase 404) ---" -ForegroundColor Yellow

Gate "bulk types.ts" { FileExists "apps\api\src\bulk-data\types.ts" }
Gate "bulk-store.ts" { FileExists "apps\api\src\bulk-data\bulk-store.ts" }
Gate "bulk-routes.ts" { FileExists "apps\api\src\bulk-data\bulk-routes.ts" }
Gate "bulk index.ts barrel" { FileExists "apps\api\src\bulk-data\index.ts" }
Gate "bulk exports bulkDataRoutes" {
  FileContains "apps\api\src\bulk-data\index.ts" "bulkDataRoutes"
}
Gate "bulk types: BulkJob" {
  FileContains "apps\api\src\bulk-data\types.ts" "BulkJob"
}
Gate "bulk types: BulkResourceType" {
  FileContains "apps\api\src\bulk-data\types.ts" "BulkResourceType"
}
Gate "bulk routes: 202 Accepted" {
  FileContains "apps\api\src\bulk-data\bulk-routes.ts" "202"
}

# -------------------------------------------------------------------------
# Section 7: P7 Consent + POU (Phase 405)
# -------------------------------------------------------------------------
Write-Host "--- Section 7: P7 Consent + POU (Phase 405) ---" -ForegroundColor Yellow

Gate "consent types.ts" { FileExists "apps\api\src\consent-pou\types.ts" }
Gate "consent-store.ts" { FileExists "apps\api\src\consent-pou\consent-store.ts" }
Gate "consent-routes.ts" { FileExists "apps\api\src\consent-pou\consent-routes.ts" }
Gate "consent index.ts barrel" { FileExists "apps\api\src\consent-pou\index.ts" }
Gate "consent exports consentPouRoutes" {
  FileContains "apps\api\src\consent-pou\index.ts" "consentPouRoutes"
}
Gate "consent types: ConsentDirective" {
  FileContains "apps\api\src\consent-pou\types.ts" "ConsentDirective"
}
Gate "consent types: PurposeOfUse" {
  FileContains "apps\api\src\consent-pou\types.ts" "PurposeOfUse"
}
Gate "consent store: evaluateConsent" {
  FileContains "apps\api\src\consent-pou\consent-store.ts" "evaluateConsent"
}
Gate "consent store: ETREAT override" {
  FileContains "apps\api\src\consent-pou\consent-store.ts" "ETREAT"
}

# -------------------------------------------------------------------------
# Section 8: P8 US Exchange Pack (Phase 406) + P9 Global Packs (Phase 407)
# -------------------------------------------------------------------------
Write-Host "--- Section 8: P8+P9 Exchange Packs (Phases 406-407) ---" -ForegroundColor Yellow

Gate "packs types.ts" { FileExists "apps\api\src\exchange-packs\types.ts" }
Gate "pack-store.ts" { FileExists "apps\api\src\exchange-packs\pack-store.ts" }
Gate "pack-routes.ts" { FileExists "apps\api\src\exchange-packs\pack-routes.ts" }
Gate "packs index.ts barrel" { FileExists "apps\api\src\exchange-packs\index.ts" }
Gate "packs exports exchangePackRoutes" {
  FileContains "apps\api\src\exchange-packs\index.ts" "exchangePackRoutes"
}
Gate "packs types: ExchangePackProfile" {
  FileContains "apps\api\src\exchange-packs\types.ts" "ExchangePackProfile"
}
Gate "packs types: ExchangeConnector" {
  FileContains "apps\api\src\exchange-packs\types.ts" "ExchangeConnector"
}
Gate "pack profile: us-tefca" {
  FileContains "apps\api\src\exchange-packs\pack-store.ts" "us-tefca"
}
Gate "pack profile: us-smart" {
  FileContains "apps\api\src\exchange-packs\pack-store.ts" "us-smart"
}
Gate "pack profile: eu-xds" {
  FileContains "apps\api\src\exchange-packs\pack-store.ts" "eu-xds"
}
Gate "pack profile: eu-mhd" {
  FileContains "apps\api\src\exchange-packs\pack-store.ts" "eu-mhd"
}
Gate "pack profile: openhie-shrx" {
  FileContains "apps\api\src\exchange-packs\pack-store.ts" "openhie-shrx"
}
Gate "pack profile: openhie-shr" {
  FileContains "apps\api\src\exchange-packs\pack-store.ts" "openhie-shr"
}

# -------------------------------------------------------------------------
# Section 9: Platform Wiring
# -------------------------------------------------------------------------
Write-Host "--- Section 9: Platform Wiring ---" -ForegroundColor Yellow

Gate "register-routes: interopGatewayRoutes" {
  FileContains "apps\api\src\server\register-routes.ts" "interopGatewayRoutes"
}
Gate "register-routes: mpiRoutes" {
  FileContains "apps\api\src\server\register-routes.ts" "mpiRoutes"
}
Gate "register-routes: providerDirectoryRoutes" {
  FileContains "apps\api\src\server\register-routes.ts" "providerDirectoryRoutes"
}
Gate "register-routes: documentExchangeRoutes" {
  FileContains "apps\api\src\server\register-routes.ts" "documentExchangeRoutes"
}
Gate "register-routes: bulkDataRoutes" {
  FileContains "apps\api\src\server\register-routes.ts" "bulkDataRoutes"
}
Gate "register-routes: consentPouRoutes" {
  FileContains "apps\api\src\server\register-routes.ts" "consentPouRoutes"
}
Gate "register-routes: exchangePackRoutes" {
  FileContains "apps\api\src\server\register-routes.ts" "exchangePackRoutes"
}

Gate "AUTH_RULES: interop-gateway" {
  FileMatchesRegex "apps\api\src\middleware\security.ts" "interop-gateway.*session"
}
Gate "AUTH_RULES: mpi" {
  FileMatchesRegex "apps\api\src\middleware\security.ts" "mpi.*session"
}
Gate "AUTH_RULES: provider-directory" {
  FileMatchesRegex "apps\api\src\middleware\security.ts" "provider-directory.*session"
}
Gate "AUTH_RULES: document-exchange" {
  FileMatchesRegex "apps\api\src\middleware\security.ts" "document-exchange.*session"
}
Gate "AUTH_RULES: bulk-data" {
  FileMatchesRegex "apps\api\src\middleware\security.ts" "bulk-data.*session"
}
Gate "AUTH_RULES: consent-pou" {
  FileMatchesRegex "apps\api\src\middleware\security.ts" "consent-pou.*session"
}
Gate "AUTH_RULES: exchange-packs" {
  FileMatchesRegex "apps\api\src\middleware\security.ts" "exchange-packs.*session"
}

Gate "store-policy: interop-gateway-channels" {
  FileContains "apps\api\src\platform\store-policy.ts" "interop-gateway-channels"
}
Gate "store-policy: mpi-identities" {
  FileContains "apps\api\src\platform\store-policy.ts" "mpi-identities"
}
Gate "store-policy: provider-directory-practitioners" {
  FileContains "apps\api\src\platform\store-policy.ts" "provider-directory-practitioners"
}
Gate "store-policy: document-exchange-documents" {
  FileContains "apps\api\src\platform\store-policy.ts" "document-exchange-documents"
}
Gate "store-policy: bulk-data-jobs" {
  FileContains "apps\api\src\platform\store-policy.ts" "bulk-data-jobs"
}
Gate "store-policy: consent-pou-directives" {
  FileContains "apps\api\src\platform\store-policy.ts" "consent-pou-directives"
}
Gate "store-policy: exchange-pack-connectors" {
  FileContains "apps\api\src\platform\store-policy.ts" "exchange-pack-connectors"
}

# -------------------------------------------------------------------------
# Section 10: TypeScript Compilation
# -------------------------------------------------------------------------
Write-Host "--- Section 10: TypeScript Compilation ---" -ForegroundColor Yellow

Gate "tsc --noEmit clean" {
  Push-Location (Join-Path $root "apps\api")
  try {
    $null = & pnpm exec tsc --noEmit 2>&1
    $exitOk = $LASTEXITCODE -eq 0
    return $exitOk
  } finally {
    Pop-Location
  }
}

# -------------------------------------------------------------------------
# Section 11: Prompt Folders
# -------------------------------------------------------------------------
Write-Host "--- Section 11: Prompt Folders ---" -ForegroundColor Yellow

Gate "Prompt: 399-W23-P1" { FileExists "prompts\399-W23-P1-MANIFEST-ADRS\399-01-IMPLEMENT.md" }
Gate "Prompt: 400-W23-P2" { FileExists "prompts\400-W23-P2-INTEROP-GATEWAY\400-01-IMPLEMENT.md" }
Gate "Prompt: 401-W23-P3" { FileExists "prompts\401-W23-P3-MPI-CLIENT-REGISTRY\401-01-IMPLEMENT.md" }
Gate "Prompt: 402-W23-P4" { FileExists "prompts\402-W23-P4-PROVIDER-DIRECTORY\402-01-IMPLEMENT.md" }
Gate "Prompt: 403-W23-P5" { FileExists "prompts\403-W23-P5-DOCUMENT-EXCHANGE\403-01-IMPLEMENT.md" }
Gate "Prompt: 404-W23-P6" { FileExists "prompts\404-W23-P6-BULK-DATA\404-01-IMPLEMENT.md" }
Gate "Prompt: 405-W23-P7" { FileExists "prompts\405-W23-P7-CONSENT-POU\405-01-IMPLEMENT.md" }
Gate "Prompt: 406-W23-P8" { FileExists "prompts\406-W23-P8-US-EXCHANGE-PACK\406-01-IMPLEMENT.md" }
Gate "Prompt: 407-W23-P9" { FileExists "prompts\407-W23-P9-GLOBAL-EXCHANGE-PACKS\407-01-IMPLEMENT.md" }
Gate "Prompt: 408-W23-P10" { FileExists "prompts\408-W23-P10-HIE-CERT-RUNNER\408-01-IMPLEMENT.md" }

# -------------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------------
Write-Host ""
Write-Host "=== CERTIFICATION SUMMARY ===" -ForegroundColor Cyan
Write-Host "  Total gates: $total"
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($fail -eq 0) {
  Write-Host "  WAVE 23 CERTIFICATION: ALL GATES PASSED" -ForegroundColor Green
  exit 0
} else {
  Write-Host "  WAVE 23 CERTIFICATION: $fail GATE(S) FAILED" -ForegroundColor Red
  exit 1
}
