<# Phase 39 Verification -- VistA Billing Grounding + Capability Map + Read-Only RCM #>
param([switch]$SkipDocker, [switch]$SkipLive)

$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 0
$root = Split-Path $PSScriptRoot -Parent

function gate([string]$name, [scriptblock]$test) {
    $script:total++
    try {
        $ok = & $test
        if ($ok) { Write-Host "  PASS  $name" -ForegroundColor Green; $script:pass++ }
        else     { Write-Host "  FAIL  $name" -ForegroundColor Red;   $script:fail++ }
    } catch {
        Write-Host "  FAIL  $name ($_)" -ForegroundColor Red; $script:fail++
    }
}

Write-Host "`n=== Phase 39 Verification: VistA Billing Grounding ===" -ForegroundColor Cyan
Write-Host ""

# ─── Part A: Static File Analysis ────────────────────────────────────
Write-Host "--- Part A: Static File Analysis ---" -ForegroundColor Yellow

gate "A01 capability-map-billing.json exists" {
    Test-Path -LiteralPath "$root\data\vista\capability-map-billing.json"
}

gate "A02 capability-map-billing.json is valid JSON" {
    $j = Get-Content "$root\data\vista\capability-map-billing.json" -Raw | ConvertFrom-Json
    $null -ne $j.summary
}

gate "A03 capability map has globals section" {
    $j = Get-Content "$root\data\vista\capability-map-billing.json" -Raw | ConvertFrom-Json
    $null -ne $j.globals -and $null -ne $j.globals.VISIT
}

gate "A04 capability map has rpcs section" {
    $j = Get-Content "$root\data\vista\capability-map-billing.json" -Raw | ConvertFrom-Json
    $null -ne $j.rpcs -and $null -ne $j.rpcs.encounter_read
}

gate "A05 capability map has endpoints section" {
    $j = Get-Content "$root\data\vista\capability-map-billing.json" -Raw | ConvertFrom-Json
    ($j.endpoints | Measure-Object).Count -ge 6
}

gate "A06 capability map summary has live and pending counts" {
    $j = Get-Content "$root\data\vista\capability-map-billing.json" -Raw | ConvertFrom-Json
    $j.summary.liveEndpoints -ge 3 -and $j.summary.pendingEndpoints -ge 3
}

gate "A07 capability-map-billing.md exists" {
    Test-Path -LiteralPath "$root\docs\vista\capability-map-billing.md"
}

gate "A08 capability-map-billing.md mentions PCE" {
    (Get-Content "$root\docs\vista\capability-map-billing.md" -Raw) -match "PCE"
}

gate "A09 vista-rcm.ts exists" {
    Test-Path -LiteralPath "$root\apps\api\src\routes\vista-rcm.ts"
}

gate "A10 vista-rcm.ts has encounters endpoint" {
    (Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw) -match "/vista/rcm/encounters"
}

gate "A11 vista-rcm.ts has insurance endpoint" {
    (Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw) -match "/vista/rcm/insurance"
}

gate "A12 vista-rcm.ts has icd-search endpoint" {
    (Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw) -match "/vista/rcm/icd-search"
}

gate "A13 vista-rcm.ts has charges endpoint" {
    (Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw) -match "/vista/rcm/charges"
}

gate "A14 vista-rcm.ts has claims-status endpoint" {
    (Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw) -match "/vista/rcm/claims-status"
}

gate "A15 vista-rcm.ts has ar-status endpoint" {
    (Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw) -match "/vista/rcm/ar-status"
}

gate "A16 vista-rcm.ts has capability-map endpoint" {
    (Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw) -match "/vista/rcm/capability-map"
}

gate "A17 vista-rcm.ts imports audit" {
    (Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw) -match "import.*audit"
}

gate "A18 vista-rcm.ts uses safeErr" {
    (Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw) -match "safeErr"
}

gate "A19 vista-rcm.ts uses validateCredentials" {
    (Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw) -match "validateCredentials"
}

gate "A20 vista-rcm.ts has integration-pending response" {
    (Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw) -match "integration-pending"
}

gate "A21 vista-rcm.ts has vistaGrounding metadata" {
    (Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw) -match "vistaGrounding"
}

gate "A22 index.ts imports vistaRcmRoutes" {
    (Get-Content "$root\apps\api\src\index.ts" -Raw) -match "import vistaRcmRoutes"
}

gate "A23 index.ts registers vistaRcmRoutes" {
    (Get-Content "$root\apps\api\src\index.ts" -Raw) -match "server\.register\(vistaRcmRoutes\)"
}

gate "A24 rpcCapabilities.ts has billing domain RPCs" {
    (Get-Content "$root\apps\api\src\vista\rpcCapabilities.ts" -Raw) -match 'domain: "billing"'
}

gate "A25 rpcCapabilities.ts has IBCN INSURANCE QUERY" {
    (Get-Content "$root\apps\api\src\vista\rpcCapabilities.ts" -Raw) -match "IBCN INSURANCE QUERY"
}

gate "A26 rpcCapabilities.ts has ORWPCE4 LEX" {
    (Get-Content "$root\apps\api\src\vista\rpcCapabilities.ts" -Raw) -match "ORWPCE4 LEX"
}

gate "A27 rpcCapabilities.ts has ORWPCE VISIT" {
    (Get-Content "$root\apps\api\src\vista\rpcCapabilities.ts" -Raw) -match 'rpc: "ORWPCE VISIT"'
}

gate "A28 audit.ts has rcm billing audit actions" {
    $a = Get-Content "$root\apps\api\src\lib\audit.ts" -Raw
    $a -match "phi\.rcm-encounters-view" -and $a -match "phi\.rcm-insurance-view" -and $a -match "data\.icd-search"
}

gate "A29 audit.ts has pending audit actions" {
    $a = Get-Content "$root\apps\api\src\lib\audit.ts" -Raw
    $a -match "phi\.rcm-charges-view" -and $a -match "phi\.rcm-claims-status-view" -and $a -match "phi\.rcm-ar-status-view"
}

# ─── Part B: UI Checks ──────────────────────────────────────────────
Write-Host "`n--- Part B: UI Checks ---" -ForegroundColor Yellow

gate "B01 RCM page.tsx has VistA Billing tab" {
    (Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw) -match "vista-billing"
}

gate "B02 RCM page.tsx has VistaBillingTab component" {
    (Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw) -match "function VistaBillingTab"
}

gate "B03 RCM page.tsx has encounter display" {
    (Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw) -match "Encounters.*PCE"
}

gate "B04 RCM page.tsx has insurance display" {
    (Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw) -match "Insurance Coverage"
}

gate "B05 RCM page.tsx has ICD search" {
    (Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw) -match "ICD-10 Code Search"
}

gate "B06 RCM page.tsx has integration-pending panels" {
    (Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw) -match "integration-pending"
}

gate "B07 RCM page.tsx has capability summary" {
    (Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw) -match "Capability Summary"
}

gate "B08 RCM page.tsx has DFN input" {
    (Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw) -match "Patient DFN"
}

gate "B09 RCM page.tsx calls /vista/rcm/encounters" {
    (Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw) -match "/vista/rcm/encounters"
}

gate "B10 RCM page.tsx has 5 tabs total" {
    $content = Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw
    ($content -match "vista-billing") -and ($content -match "Claim Workqueue") -and ($content -match "Payer Registry") -and ($content -match "Connectors") -and ($content -match "Audit Trail")
}

# ─── Part C: Documentation Checks ───────────────────────────────────
Write-Host "`n--- Part C: Documentation Checks ---" -ForegroundColor Yellow

gate "C01 rcm-billing-grounding.md runbook exists" {
    Test-Path -LiteralPath "$root\docs\runbooks\rcm-billing-grounding.md"
}

gate "C02 runbook mentions ORWPCE VISIT" {
    (Get-Content "$root\docs\runbooks\rcm-billing-grounding.md" -Raw) -match "ORWPCE VISIT"
}

gate "C03 runbook mentions IBCN INSURANCE QUERY" {
    (Get-Content "$root\docs\runbooks\rcm-billing-grounding.md" -Raw) -match "IBCN INSURANCE QUERY"
}

gate "C04 runbook has security section" {
    (Get-Content "$root\docs\runbooks\rcm-billing-grounding.md" -Raw) -match "Security"
}

gate "C05 AGENTS.md has Phase 39 architecture" {
    (Get-Content "$root\AGENTS.md" -Raw) -match "Phase 39 additions"
}

gate "C06 AGENTS.md has gotcha 89 (billing split)" {
    (Get-Content "$root\AGENTS.md" -Raw) -match "89\.\s.*billing data is split"
}

gate "C07 AGENTS.md has gotcha 90 (85 RPCs)" {
    (Get-Content "$root\AGENTS.md" -Raw) -match "90\.\s.*85 billing-related RPCs"
}

gate "C08 AGENTS.md has gotcha 93 (MUMPS probing)" {
    (Get-Content "$root\AGENTS.md" -Raw) -match "93\.\s.*MUMPS probing"
}

gate "C09 prompt file exists" {
    Test-Path -LiteralPath "$root\prompts\43-PHASE-39-BILLING-GROUNDING\prompt.md"
}

gate "C10 ops summary exists" {
    Test-Path -LiteralPath "$root\ops\phase39-summary.md"
}

gate "C11 ops notion update exists" {
    Test-Path -LiteralPath "$root\ops\phase39-notion-update.json"
}

# ─── Part D: MUMPS Probe Routines ───────────────────────────────────
Write-Host "`n--- Part D: MUMPS Probe Routines ---" -ForegroundColor Yellow

gate "D01 ZVEBILP.m exists" {
    Test-Path -LiteralPath "$root\services\vista\ZVEBILP.m"
}

gate "D02 ZVEBILR.m exists" {
    Test-Path -LiteralPath "$root\services\vista\ZVEBILR.m"
}

gate "D03 ZVEBILP.m probes IB globals" {
    (Get-Content "$root\services\vista\ZVEBILP.m" -Raw) -match "\^IB\("
}

gate "D04 ZVEBILP.m probes PRCA globals" {
    (Get-Content "$root\services\vista\ZVEBILP.m" -Raw) -match "\^PRCA\("
}

gate "D05 ZVEBILP.m probes AUPNVSIT" {
    (Get-Content "$root\services\vista\ZVEBILP.m" -Raw) -match "\^AUPNVSIT"
}

gate "D06 ZVEBILR.m probes RPCs" {
    (Get-Content "$root\services\vista\ZVEBILR.m" -Raw) -match "\^XWB\(8994"
}

gate "D07 ZVEBILR.m checks FileMan files" {
    (Get-Content "$root\services\vista\ZVEBILR.m" -Raw) -match "FileMan File Definitions"
}

# ─── Part E: TypeScript Compilation ─────────────────────────────────
Write-Host "`n--- Part E: TypeScript Compilation ---" -ForegroundColor Yellow

gate "E01 API compiles with zero errors" {
    Push-Location "$root\apps\api"
    $out = pnpm exec tsc --noEmit 2>&1 | Out-String
    Pop-Location
    $out.Trim().Length -eq 0
}

# ─── Part F: Security & PHI Scan ────────────────────────────────────
Write-Host "`n--- Part F: Security & PHI Scan ---" -ForegroundColor Yellow

gate "F01 vista-rcm.ts no hardcoded credentials" {
    $c = Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw
    -not ($c -match "PROV123|PHARM123|NURSE123")
}

gate "F02 vista-rcm.ts no console.log" {
    $c = Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw
    -not ($c -match "console\.log")
}

gate "F03 vista-rcm.ts uses auditActor" {
    (Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw) -match "auditActor"
}

gate "F04 vista-rcm.ts uses error sanitization" {
    (Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw) -match "safeErr\(err\)"
}

gate "F05 capability map no credentials" {
    $c = Get-Content "$root\data\vista\capability-map-billing.json" -Raw
    -not ($c -match "PROV123|password|verifyCode")
}

# ─── Part G: VistA-First Enforcement ────────────────────────────────
Write-Host "`n--- Part G: VistA-First Enforcement ---" -ForegroundColor Yellow

gate "G01 live endpoints use callRpc" {
    $c = Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw
    $c -match "callRpc\(" -and $c -match "connect\(\)" -and $c -match "disconnect\(\)"
}

gate "G02 pending endpoints have vistaGrounding metadata" {
    $c = Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw
    ([regex]::Matches($c, "vistaFiles")).Count -ge 3
}

gate "G03 pending endpoints name target routines" {
    $c = Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw
    $c -match "IBCF" -and $c -match "PRCAFN" -and $c -match "PRCASER"
}

gate "G04 pending endpoints have migration path" {
    $c = Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw
    ([regex]::Matches($c, "migrationPath")).Count -ge 3
}

gate "G05 no fake billing engine (no SQLite/Postgres for billing)" {
    $c = Get-Content "$root\apps\api\src\routes\vista-rcm.ts" -Raw
    -not ($c -match "sqlite|postgres|knex|prisma|drizzle")
}

gate "G06 capability map grounded in probe results" {
    $j = Get-Content "$root\data\vista\capability-map-billing.json" -Raw | ConvertFrom-Json
    $j.globals.VISIT.count -eq 68 -and $j.globals.V_CPT.count -eq 32
}

gate "G07 endpoints array includes live and pending" {
    $j = Get-Content "$root\data\vista\capability-map-billing.json" -Raw | ConvertFrom-Json
    $live = ($j.endpoints | Where-Object { $_.status -eq "live" } | Measure-Object).Count
    $pending = ($j.endpoints | Where-Object { $_.status -eq "integration-pending" } | Measure-Object).Count
    $live -ge 3 -and $pending -ge 3
}

gate "G08 rpcs section catalogues encounter_read as live" {
    $j = Get-Content "$root\data\vista\capability-map-billing.json" -Raw | ConvertFrom-Json
    $j.rpcs.encounter_read.status -eq "live"
}

# ─── Part H: Prompt Ordering Integrity ──────────────────────────────
Write-Host "`n--- Part H: Prompt Ordering Integrity ---" -ForegroundColor Yellow

gate "H01 prompt dir has correct prefix (43)" {
    Test-Path -LiteralPath "$root\prompts\43-PHASE-39-BILLING-GROUNDING"
}

gate "H02 prompt.md has implementation steps" {
    (Get-Content "$root\prompts\43-PHASE-39-BILLING-GROUNDING\prompt.md" -Raw) -match "Implementation Steps"
}

gate "H03 prompt.md has files touched" {
    (Get-Content "$root\prompts\43-PHASE-39-BILLING-GROUNDING\prompt.md" -Raw) -match "Files Touched"
}

# ─── Summary ─────────────────────────────────────────────────────────
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "  Phase 39 Verification Results" -ForegroundColor Cyan
Write-Host "  PASS: $pass / $total" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Yellow' })
if ($fail -gt 0) {
    Write-Host "  FAIL: $fail / $total" -ForegroundColor Red
}
Write-Host "=====================================" -ForegroundColor Cyan

exit $fail
