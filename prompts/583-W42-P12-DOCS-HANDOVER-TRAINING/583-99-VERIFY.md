# Phase 583 — W42-P12: Verification

> Wave 42: Production Remediation | Phase 583 Verification

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

## Gate 1: ARCHITECTURE.md Exists

```powershell
$paths = @("docs/ARCHITECTURE.md", "ARCHITECTURE.md")
$found = $paths | Where-Object { Test-Path -LiteralPath $_ }
if ($found) { Write-Output "PASS: ARCHITECTURE.md exists at $found" }
else { Write-Error "FAIL: ARCHITECTURE.md not found" }
```

Expected: `PASS`.

---

## Gate 2: GETTING-STARTED.md Exists

```powershell
if (Test-Path -LiteralPath "docs/GETTING-STARTED.md") {
  Write-Output "PASS: GETTING-STARTED.md exists"
} else { Write-Error "FAIL: GETTING-STARTED.md not found" }
```

Expected: `PASS`.

---

## Gate 3: Training Materials Exist

```powershell
$training = @("vista-rpc-protocol-primer.md", "mumps-basics-for-developers.md", "tenant-isolation-guide.md", "adding-a-new-rpc.md", "cprs-panel-development.md")
$missing = $training | Where-Object { -not (Test-Path -LiteralPath "docs/training/$_") }
if ($missing.Count -eq 0) { Write-Output "PASS: All 5 training docs exist" }
else { Write-Error "FAIL: Missing: $($missing -join ', ')" }
```

Expected: `PASS`.

---

## Gate 4: Phase Index Builds

```powershell
node scripts/build-phase-index.mjs 2>&1
```

Expected: No errors; `docs/qa/phase-index.json` updated.

---

## Gate 5: AGENTS.md Has New Entries

```powershell
$content = Get-Content "AGENTS.md" -Raw
$checks = @("DUZ-per-request", "Redis", "single-DUZ")
$missing = $checks | Where-Object { $content -notmatch $_ }
if ($missing.Count -eq 0) { Write-Output "PASS: AGENTS.md has new entries" }
else { Write-Error "FAIL: AGENTS.md missing: $($missing -join ', ')" }
```

Expected: `PASS`.
