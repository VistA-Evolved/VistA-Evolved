<# Phase 116 -- Postgres Job Queue (Graphile Worker) + Job Governance Verifier #>
param([switch]$SkipDocker)

$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $skip = 0
$results = @()

function Gate([string]$tag, [string]$desc, [scriptblock]$test) {
  try {
    $ok = & $test
    if ($ok) {
      $results += "PASS  $tag  $desc"; $script:pass++
    } else {
      $results += "FAIL  $tag  $desc"; $script:fail++
    }
  } catch {
    $results += "FAIL  $tag  $desc [$_]"; $script:fail++
  }
}

# PS 5.1 Join-Path only takes 2 args -- use helper
function JP { param([string[]]$parts) $p = $parts[0]; for ($i=1;$i -lt $parts.Length;$i++) { $p = Join-Path $p $parts[$i] }; $p }

$root = Split-Path -Parent $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
$api = JP @($root, 'apps', 'api')

Write-Host "`n=== Phase 116 Verifier -- Postgres Job Queue ==="

# ---- Gate 1: graphile-worker dependency ----
Gate 'DEP-001' 'graphile-worker in package.json' {
  $pkg = Get-Content (Join-Path $api 'package.json') -Raw | ConvertFrom-Json
  $null -ne $pkg.dependencies.'graphile-worker'
}

# ---- Gate 2: worker script in package.json ----
Gate 'DEP-002' 'worker script in package.json' {
  $pkg = Get-Content (Join-Path $api 'package.json') -Raw | ConvertFrom-Json
  $null -ne $pkg.scripts.worker
}

# ---- Gate 3-12: File existence ----
Gate 'FILE-001' 'jobs/registry.ts exists' {
  Test-Path -LiteralPath (JP @($api, 'src', 'jobs', 'registry.ts'))
}

Gate 'FILE-002' 'jobs/governance.ts exists' {
  Test-Path -LiteralPath (JP @($api, 'src', 'jobs', 'governance.ts'))
}

Gate 'FILE-003' 'jobs/runner.ts exists' {
  Test-Path -LiteralPath (JP @($api, 'src', 'jobs', 'runner.ts'))
}

Gate 'FILE-004' 'jobs/worker-entrypoint.ts exists' {
  Test-Path -LiteralPath (JP @($api, 'src', 'jobs', 'worker-entrypoint.ts'))
}

Gate 'FILE-005' 'jobs/index.ts exists' {
  Test-Path -LiteralPath (JP @($api, 'src', 'jobs', 'index.ts'))
}

Gate 'FILE-006' 'eligibility-check-poll task exists' {
  Test-Path -LiteralPath (JP @($api, 'src', 'jobs', 'tasks', 'eligibility-check-poll.ts'))
}

Gate 'FILE-007' 'claim-status-poll task exists' {
  Test-Path -LiteralPath (JP @($api, 'src', 'jobs', 'tasks', 'claim-status-poll.ts'))
}

Gate 'FILE-008' 'evidence-staleness-scan task exists' {
  Test-Path -LiteralPath (JP @($api, 'src', 'jobs', 'tasks', 'evidence-staleness-scan.ts'))
}

Gate 'FILE-009' 'retention-cleanup task exists' {
  Test-Path -LiteralPath (JP @($api, 'src', 'jobs', 'tasks', 'retention-cleanup.ts'))
}

Gate 'FILE-010' 'routes/job-admin-routes.ts exists' {
  Test-Path -LiteralPath (JP @($api, 'src', 'routes', 'job-admin-routes.ts'))
}

# ---- Registry gates ----
Gate 'REG-001' 'JOB_NAMES has 4 entries' {
  $content = Get-Content (JP @($api, 'src', 'jobs', 'registry.ts')) -Raw
  ($content -match 'ELIGIBILITY_CHECK_POLL') -and
  ($content -match 'CLAIM_STATUS_POLL') -and
  ($content -match 'EVIDENCE_STALENESS_SCAN') -and
  ($content -match 'RETENTION_CLEANUP')
}

Gate 'REG-002' 'Zod payload schemas defined' {
  $content = Get-Content (JP @($api, 'src', 'jobs', 'registry.ts')) -Raw
  ($content -match 'z\.object') -and ($content -match 'JOB_PAYLOAD_SCHEMAS')
}

# ---- PHI gates ----
Gate 'PHI-001' 'PHI_BLOCKED_FIELDS set defined' {
  $content = Get-Content (JP @($api, 'src', 'jobs', 'registry.ts')) -Raw
  ($content -match 'PHI_BLOCKED_FIELDS') -and ($content -match 'patientName')
}

Gate 'PHI-002' 'containsPhiFields function exported' {
  $content = Get-Content (JP @($api, 'src', 'jobs', 'registry.ts')) -Raw
  $content -match 'export function containsPhiFields'
}

Gate 'PHI-003' 'Governance validates PHI fields' {
  $content = Get-Content (JP @($api, 'src', 'jobs', 'governance.ts')) -Raw
  ($content -match 'containsPhiFields') -and ($content -match 'PHI fields detected')
}

Gate 'PHI-004' 'Error messages redacted before logging' {
  $content = Get-Content (JP @($api, 'src', 'jobs', 'governance.ts')) -Raw
  ($content -match 'redactErrorMessage') -and ($content -match 'REDACTED')
}

# ---- DB gates ----
Gate 'DB-001' 'job_run_log CREATE TABLE in pg-migrate.ts' {
  $content = Get-Content (JP @($api, 'src', 'platform', 'pg', 'pg-migrate.ts')) -Raw
  $content -match 'CREATE TABLE IF NOT EXISTS job_run_log'
}

Gate 'DB-002' 'job_run_log indexes defined' {
  $content = Get-Content (JP @($api, 'src', 'platform', 'pg', 'pg-migrate.ts')) -Raw
  ($content -match 'idx_job_run_log_name') -and ($content -match 'idx_job_run_log_tenant')
}

Gate 'DB-003' 'job_run_log in RLS tenant tables' {
  $content = Get-Content (JP @($api, 'src', 'platform', 'pg', 'pg-migrate.ts')) -Raw
  $content -match '"job_run_log"'
}

# ---- Runner gates ----
Gate 'RUN-001' 'Runner uses getPgPool for connection' {
  $content = Get-Content (JP @($api, 'src', 'jobs', 'runner.ts')) -Raw
  ($content -match 'getPgPool') -and ($content -match 'pgPool')
}

Gate 'RUN-002' 'Runner wraps tasks with governedTask' {
  $content = Get-Content (JP @($api, 'src', 'jobs', 'runner.ts')) -Raw
  ($content -match 'governedTask') -and ($content -match 'validateJobPayload')
}

Gate 'RUN-003' 'Default cron schedules defined' {
  $content = Get-Content (JP @($api, 'src', 'jobs', 'registry.ts')) -Raw
  ($content -match 'DEFAULT_CRON_SCHEDULES') -and ($content -match '\*/5 \* \* \* \*')
}

# ---- Wiring gates ----
Gate 'WIRE-001' 'Embedded worker gated by JOB_WORKER_ENABLED in index.ts' {
  $content = Get-Content (JP @($api, 'src', 'index.ts')) -Raw
  $content -match 'JOB_WORKER_ENABLED.*true'
}

Gate 'WIRE-002' 'jobAdminRoutes registered in index.ts' {
  $content = Get-Content (JP @($api, 'src', 'index.ts')) -Raw
  $content -match 'jobAdminRoutes'
}

Gate 'WIRE-003' 'stopJobRunner in security.ts shutdown' {
  $content = Get-Content (JP @($api, 'src', 'middleware', 'security.ts')) -Raw
  $content -match 'stopJobRunner'
}

# ---- TSC gate ----
Gate 'TSC-001' 'npx tsc --noEmit clean' {
  Push-Location $api
  $output = npx tsc --noEmit 2>&1
  Pop-Location
  $LASTEXITCODE -eq 0
}

# ---- PHI in tasks ----
Gate 'PHI-005' 'No patientName/ssn/dob in task files' {
  $taskDir = JP @($api, 'src', 'jobs', 'tasks')
  $content = Get-ChildItem $taskDir -Filter '*.ts' | ForEach-Object { Get-Content $_.FullName -Raw }
  $joined = $content -join "`n"
  -not ($joined -match 'patientName|\.ssn|\.dob|dateOfBirth|socialSecurity')
}

# ---- Doc gates ----
Gate 'DOC-001' 'Prompt file exists' {
  $promptDir = JP @($root, 'prompts', '119-PHASE-116-JOB-QUEUE')
  Test-Path -LiteralPath (Join-Path $promptDir '116-01-IMPLEMENT.md')
}

Gate 'DOC-002' 'Runbook exists' {
  Test-Path -LiteralPath (JP @($root, 'docs', 'runbooks', 'jobs-graphile-worker.md'))
}

# ---- Lint gate ----
Gate 'LINT-001' 'No console.log in jobs module' {
  $jobsDir = JP @($api, 'src', 'jobs')
  $content = Get-ChildItem $jobsDir -Recurse -Filter '*.ts' | ForEach-Object { Get-Content $_.FullName -Raw }
  $joined = $content -join "`n"
  -not ($joined -match 'console\.log')
}

# ---- Config gates ----
Gate 'CFG-001' 'Cron schedule env override via JOB_CRON_*' {
  $content = Get-Content (JP @($api, 'src', 'jobs', 'registry.ts')) -Raw
  $content -match 'JOB_CRON_'
}

Gate 'CFG-002' 'Concurrency env override via JOB_CONCURRENCY_*' {
  $content = Get-Content (JP @($api, 'src', 'jobs', 'registry.ts')) -Raw
  $content -match 'JOB_CONCURRENCY_'
}

# ---- Results ----
Write-Host ''
$results | ForEach-Object { Write-Host $_ }
Write-Host "`n=== Phase 116 Results: $pass PASS / $fail FAIL / $skip SKIP ==="

if ($fail -gt 0) { exit 1 } else { exit 0 }
