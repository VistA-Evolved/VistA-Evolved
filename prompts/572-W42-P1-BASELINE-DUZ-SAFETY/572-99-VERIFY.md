# Phase 572 — W42-P1: Verification

> Wave 42: Production Remediation | Phase 572 Verification

---

## Verification Steps

Run the verification gates and commands documented below in order.

## Expected Output

Each gate should pass or produce a truthful blocker with concrete evidence.

## Negative Tests

Check failure paths, blockers, or integration-pending branches where applicable.

## Evidence Captured

Store command output in artifacts or the specified wave evidence location before marking the phase complete.

---

## Gate 1: Root Directory Clean

```powershell
$expected = @('package.json','pnpm-workspace.yaml','pnpm-lock.yaml',
  'docker-compose.yml','docker-compose.prod.yml','eslint.config.mjs',
  '.prettierrc','.prettierignore','.gitignore','.hadolint.yaml','.sops.yaml',
  'README.md','AGENTS.md','CONTRIBUTING.md','SECURITY.md',
  'THIRD_PARTY_NOTICES.md','LICENSE','.env.example')
$actual = (Get-ChildItem -File).Name
$stray = $actual | Where-Object { $_ -notin $expected }
if ($stray) { Write-Error "FAIL: Stray files in root: $($stray -join ', ')" }
else { Write-Output "PASS: Root directory clean" }
```

## Gate 2: Test Fixtures Moved

```powershell
$count = (Get-ChildItem test-fixtures -File).Count
if ($count -gt 50) { Write-Output "PASS: $count test fixtures archived" }
else { Write-Error "FAIL: Expected 50+ test fixtures, found $count" }
```

## Gate 3: Gitignore Updated

```powershell
if (Select-String -Path .gitignore -Pattern 'test-fixtures') {
  Write-Output "PASS: test-fixtures in .gitignore"
} else { Write-Error "FAIL: test-fixtures not in .gitignore" }
```

## Gate 4: DUZ Problem Documented

```powershell
if (Test-Path -LiteralPath "docs/security/single-duz-problem.md") {
  $content = Get-Content "docs/security/single-duz-problem.md" -Raw
  if ($content -match 'DUZ' -and $content -match 'patient safety') {
    Write-Output "PASS: DUZ problem documented"
  } else { Write-Error "FAIL: Document missing key content" }
} else { Write-Error "FAIL: docs/security/single-duz-problem.md not found" }
```

## Gate 5: Baseline Evidence

```powershell
if (Test-Path -LiteralPath "evidence/wave-42") {
  Write-Output "PASS: evidence/wave-42 directory exists"
} else { Write-Error "FAIL: evidence/wave-42 directory not found" }
```

## Gate 6: AGENTS.md Updated

```powershell
$agents = Get-Content AGENTS.md -Raw
if ($agents -match 'single-DUZ' -or $agents -match 'DUZ-per-request') {
  Write-Output "PASS: AGENTS.md has DUZ safety entry"
} else { Write-Error "FAIL: AGENTS.md missing DUZ safety entry" }
```
