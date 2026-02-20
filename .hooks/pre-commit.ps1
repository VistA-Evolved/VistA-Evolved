# Phase 53 - Pre-commit hook for Windows (PowerShell)
#
# Installation (PowerShell):
#   git config core.hooksPath .hooks
#
# This is the PowerShell equivalent of the .hooks/pre-commit shell script.
# Git on Windows will try the shell script first; if sh is not available,
# use this by renaming or configuring appropriately.

$staged = git diff --cached --name-only --diff-filter=ACM 2>$null
if (-not $staged) { exit 0 }

$bannedPaths = @('^reports/', '^docs/reports/', '^artifacts/', '^docs/verify/')
$bannedFiles = @('phase\d+-verify-report', 'verify-output')

$violations = @()

foreach ($file in $staged) {
    foreach ($pattern in $bannedPaths) {
        if ($file -match $pattern) {
            $violations += "  BLOCKED: $file (banned path: $pattern)"
        }
    }
    foreach ($pattern in $bannedFiles) {
        if ($file -match $pattern) {
            $violations += "  BLOCKED: $file (banned pattern: $pattern)"
        }
    }
}

if ($violations.Count -gt 0) {
    Write-Host ""
    Write-Host "=== VistA-Evolved Pre-Commit Policy Gate ==="
    Write-Host ""
    Write-Host "Commit BLOCKED -- staged files violate repo policy:"
    foreach ($v in $violations) { Write-Host $v }
    Write-Host ""
    Write-Host "Policy: Verification outputs belong in /artifacts/ (gitignored)."
    Write-Host "        See docs/POLICY.md for allowed documentation roots."
    Write-Host ""
    Write-Host "To bypass (emergency only): git commit --no-verify"
    exit 1
}

exit 0
