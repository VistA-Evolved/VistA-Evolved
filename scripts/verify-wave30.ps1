<# Wave 30 Verifier -- Phase 463 (W30-P8)
   Confirms all 8 W30 phases (456-463) have deliverables.
#>
param([string]$RepoRoot = (Split-Path $PSScriptRoot))

$ErrorActionPreference = "Stop"
$pass = 0; $fail = 0

function Gate([string]$Name, [scriptblock]$Check) {
  try {
    $result = & $Check
    if ($result) {
      Write-Host "  PASS  $Name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $Name" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $Name -- $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Wave 30 Verification (Migration at Scale) ===`n"

# Phase 456 - FHIR Import
Gate "P456 prompt" { Test-Path -LiteralPath (Join-Path (Join-Path $RepoRoot "prompts") "456-PHASE-456-FHIR-IMPORT\456-01-IMPLEMENT.md") }
Gate "P456 fhir-import.ts" { Test-Path (Join-Path (Join-Path $RepoRoot "apps") "api\src\migration\fhir-import.ts") }

# Phase 457 - C-CDA Ingest
Gate "P457 prompt" { Test-Path -LiteralPath (Join-Path (Join-Path $RepoRoot "prompts") "457-PHASE-457-CCDA-INGEST\457-01-IMPLEMENT.md") }
Gate "P457 ccda-ingest.ts" { Test-Path (Join-Path (Join-Path $RepoRoot "apps") "api\src\migration\ccda-ingest.ts") }

# Phase 458 - HL7v2 ADT
Gate "P458 prompt" { Test-Path -LiteralPath (Join-Path (Join-Path $RepoRoot "prompts") "458-PHASE-458-HL7V2-ADT\458-01-IMPLEMENT.md") }
Gate "P458 hl7v2-adt.ts" { Test-Path (Join-Path (Join-Path $RepoRoot "apps") "api\src\migration\hl7v2-adt.ts") }

# Phase 459 - Dual-Run
Gate "P459 prompt" { Test-Path -LiteralPath (Join-Path (Join-Path $RepoRoot "prompts") "459-PHASE-459-DUAL-RUN\459-01-IMPLEMENT.md") }
Gate "P459 dual-run.ts" { Test-Path (Join-Path (Join-Path $RepoRoot "apps") "api\src\migration\dual-run.ts") }

# Phase 460 - Recon Engine
Gate "P460 prompt" { Test-Path -LiteralPath (Join-Path (Join-Path $RepoRoot "prompts") "460-PHASE-460-RECON-ENGINE\460-01-IMPLEMENT.md") }
Gate "P460 recon-engine.ts" { Test-Path (Join-Path (Join-Path $RepoRoot "apps") "api\src\migration\recon-engine.ts") }

# Phase 461 - Cutover Playbook
Gate "P461 prompt" { Test-Path -LiteralPath (Join-Path (Join-Path $RepoRoot "prompts") "461-PHASE-461-CUTOVER-PLAYBOOK\461-01-IMPLEMENT.md") }
Gate "P461 cutover-tracker.ts" { Test-Path (Join-Path (Join-Path $RepoRoot "apps") "api\src\migration\cutover-tracker.ts") }
Gate "P461 cutover-gates.ps1" { Test-Path (Join-Path (Join-Path $RepoRoot "scripts") "migration\cutover-gates.ps1") }

# Phase 462 - Rollback Drills
Gate "P462 prompt" { Test-Path -LiteralPath (Join-Path (Join-Path $RepoRoot "prompts") "462-PHASE-462-ROLLBACK-DRILLS\462-01-IMPLEMENT.md") }
Gate "P462 rollback-executor.ts" { Test-Path (Join-Path (Join-Path $RepoRoot "apps") "api\src\migration\rollback-executor.ts") }
Gate "P462 rollback-drill.ps1" { Test-Path (Join-Path (Join-Path $RepoRoot "scripts") "migration\rollback-drill.ps1") }

# Phase 463 - Migration QA Gate
Gate "P463 prompt" { Test-Path -LiteralPath (Join-Path (Join-Path $RepoRoot "prompts") "463-PHASE-463-MIGRATION-QA\463-01-IMPLEMENT.md") }
Gate "P463 this verifier" { Test-Path (Join-Path (Join-Path $RepoRoot "scripts") "verify-wave30.ps1") }

# Shared deliverables
Gate "migration-routes.ts" { Test-Path (Join-Path (Join-Path $RepoRoot "apps") "api\src\routes\migration-routes.ts") }
Gate "FHIR types in types.ts" {
  $t = Get-Content (Join-Path (Join-Path $RepoRoot "apps") "api\src\migration\types.ts") -Raw
  $t -match "FhirBundle"
}

$total = $pass + $fail
Write-Host "`n--- Wave 30: $pass/$total passed ---"
if ($fail -gt 0) {
  Write-Host "WAVE 30 VERIFICATION FAILED" -ForegroundColor Red
  exit 1
} else {
  Write-Host "WAVE 30 VERIFIED" -ForegroundColor Green
}
