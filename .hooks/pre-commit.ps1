# Phase 53 + Phase 104 - Pre-commit hook for Windows (PowerShell)
#
# Installation (PowerShell):
#   git config core.hooksPath .hooks
#
# This is the PowerShell equivalent of the .hooks/pre-commit shell script.
# Git on Windows will try the shell script first; if sh is not available,
# use this by renaming or configuring appropriately.
#
# Phase 104: Added secret/credential pattern scanner to prevent
# accidental credential commits outside the login page.

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

# Phase 104: Secret/credential scanning
# Patterns that should NOT appear in staged .ts files (except login page)
$secretPatterns = @(
    'PROV123',
    'PHARM123',
    'NURSE123',
    'password\s*[:=]\s*[''"][^''"]+[''"]',
    'api[_-]?key\s*[:=]\s*[''"][^''"]+[''"]',
    'secret\s*[:=]\s*[''"][^''"]+[''"]'
)
# Files exempt from secret scanning (login page has sandbox creds gated by NODE_ENV)
$secretExemptPatterns = @('page\.tsx$', '\.env\.example$', '\.env\.local$', 'AGENTS\.md$', 'BUG-TRACKER\.md$', 'runbooks/', '\.test\.', '\.spec\.')

foreach ($file in $staged) {
    # Only scan code files
    if ($file -notmatch '\.(ts|tsx|js|jsx|json)$') { continue }
    # Skip exempt files
    $exempt = $false
    foreach ($exemptPattern in $secretExemptPatterns) {
        if ($file -match $exemptPattern) { $exempt = $true; break }
    }
    if ($exempt) { continue }

    # Get staged content of the file
    $content = git show ":$file" 2>$null
    if (-not $content) { continue }

    foreach ($secretPattern in $secretPatterns) {
        if ($content -match $secretPattern) {
            $violations += "  SECRET: $file contains potential credential pattern: $secretPattern"
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
    Write-Host "        Credentials must not appear in code files."
    Write-Host "        See docs/POLICY.md for allowed documentation roots."
    Write-Host ""
    Write-Host "To bypass (emergency only): git commit --no-verify"
    exit 1
}

exit 0
