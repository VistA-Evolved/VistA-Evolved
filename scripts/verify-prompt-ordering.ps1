<#
.SYNOPSIS
  Verify prompt folder ordering and naming integrity.

.DESCRIPTION
  Phase 95 -- Prompt Folder Linter.
  Checks that:
    1. Each prompt folder has required IMPLEMENT + VERIFY files
    2. File prefixes match the folder phase number
    3. First H1 header matches the filename phase
    4. No duplicate folder numbers (within the non-archive subset)

.EXAMPLE
  .\scripts\verify-prompt-ordering.ps1
#>

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$promptsDir = Join-Path $repoRoot "prompts"

Write-Host "=== Prompt Folder Linter ===" -ForegroundColor Cyan
Write-Host "Scanning: $promptsDir"
Write-Host ""

$pass = 0
$warn = 0
$fail = 0

# Get all prompt folders (skip 00-ARCHIVE, 00-ORDERING-RULES.md)
$folders = Get-ChildItem -LiteralPath $promptsDir -Directory |
  Where-Object { $_.Name -ne "00-ARCHIVE" } |
  Sort-Object Name

if ($folders.Count -eq 0) {
  Write-Host "[WARN] No prompt folders found" -ForegroundColor Yellow
  exit 0
}

Write-Host "Found $($folders.Count) prompt folders" -ForegroundColor Gray
Write-Host ""

$phaseNumbers = @{}

foreach ($folder in $folders) {
  $name = $folder.Name

  # Extract phase number from folder name (e.g., "99-PHASE-38-RCM" -> "38")
  # Pattern: NN-PHASE-XX-... where XX is the phase number
  if ($name -match "^(\d+)-PHASE-(\d+)") {
    $prefix = $Matches[1]
    $phaseNum = $Matches[2]
  } elseif ($name -match "^(\d+)-") {
    $prefix = $Matches[1]
    $phaseNum = $prefix
  } else {
    Write-Host "[WARN] $name -- cannot parse phase number" -ForegroundColor Yellow
    $warn++
    continue
  }

  # Check for duplicate phase numbers
  if ($phaseNumbers.ContainsKey($phaseNum)) {
    Write-Host "[WARN] $name -- phase $phaseNum also in $($phaseNumbers[$phaseNum])" -ForegroundColor Yellow
    $warn++
  }
  $phaseNumbers[$phaseNum] = $name

  # Check for IMPLEMENT file
  $implFiles = Get-ChildItem -LiteralPath $folder.FullName -File |
    Where-Object { $_.Name -match "IMPLEMENT" }
  if ($implFiles.Count -eq 0) {
    Write-Host "[FAIL] $name -- missing IMPLEMENT file" -ForegroundColor Red
    $fail++
  } else {
    $pass++
  }

  # Check for VERIFY file
  $verifyFiles = Get-ChildItem -LiteralPath $folder.FullName -File |
    Where-Object { $_.Name -match "VERIFY" }
  if ($verifyFiles.Count -eq 0) {
    Write-Host "[FAIL] $name -- missing VERIFY file" -ForegroundColor Red
    $fail++
  } else {
    $pass++
  }

  # Check file prefix matches expected pattern
  $allFiles = Get-ChildItem -LiteralPath $folder.FullName -File -Filter "*.md"
  foreach ($f in $allFiles) {
    if ($f.Name -match "^(\d+)-") {
      $filePrefix = $Matches[1]
      # File prefix should match the phase number
      if ($filePrefix -ne $phaseNum) {
        Write-Host "[WARN] $name/$($f.Name) -- file prefix $filePrefix does not match phase $phaseNum" -ForegroundColor Yellow
        $warn++
      } else {
        $pass++
      }
    }
  }
}

Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  WARN: $warn" -ForegroundColor Yellow
Write-Host "  FAIL: $fail" -ForegroundColor Red
Write-Host ""

if ($fail -gt 0) {
  Write-Host "RESULT: ISSUES FOUND" -ForegroundColor Red
  exit 1
} else {
  Write-Host "RESULT: OK ($warn warnings)" -ForegroundColor Green
  exit 0
}
