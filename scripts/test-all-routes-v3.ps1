# Test all generated VistA module routes against live API
# Outputs counts of OK, ERROR, EMPTY, FAIL

$API = "http://127.0.0.1:3001"

# Login
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
$null = curl.exe -s -c cookies.txt -X POST "$API/auth/login" -H "Content-Type: application/json" -d "@login-body.json"
Write-Host "Logged in"

# Discover all GET routes under /vista/*/rpc/*
$routeFiles = Get-ChildItem "apps\api\src\routes\vista" -Filter "*.ts" | Where-Object { $_.Name -ne "index.ts" }

$okCount = 0
$emptyCount = 0
$errorCount = 0
$failCount = 0
$total = 0
$errors = @()

foreach ($file in $routeFiles) {
    $content = Get-Content $file.FullName -Raw
    # Extract route paths
    $matches = [regex]::Matches($content, "server\.(get|post)\('(/vista/[^']+)'")
    foreach ($m in $matches) {
        $method = $m.Groups[1].Value
        $path = $m.Groups[2].Value
        $total++
        
        # Add default params for testing
        $testUrl = "$API$path"
        if ($path -notmatch '\?') {
            # Check if route needs dfn
            if ($content -match "if \(!q\.dfn\)") {
                $testUrl += "?dfn=46"
            }
        }
        
        try {
            if ($method -eq "get") {
                $resp = curl.exe -s -b cookies.txt $testUrl 2>$null
            } else {
                $resp = curl.exe -s -b cookies.txt -X POST $testUrl -H "Content-Type: application/json" -d "{}" 2>$null
            }
            
            $hasOk = $resp -match '"ok":true'
            $hasMumpsErr = $resp -match 'YDB-E-|LVUNDEF|UNDEF|cannot be run'
            $hasEmptyData = $resp -match '"data":\[\]'
            $hasData = $resp -match '"data":\[".+'
            
            if ($hasOk -and $hasMumpsErr) {
                $errorCount++
                $errors += "$path -> MUMPS_ERROR"
            } elseif ($hasOk -and $hasData) {
                $okCount++
            } elseif ($hasOk -and $hasEmptyData) {
                $emptyCount++
            } elseif ($hasOk) {
                $emptyCount++
            } else {
                $failCount++
                $errors += "$path -> FAIL: $($resp.Substring(0, [Math]::Min(100, $resp.Length)))"
            }
        } catch {
            $failCount++
            $errors += "$path -> EXCEPTION: $_"
        }
        
        if ($total % 25 -eq 0) {
            Write-Host "  Tested $total routes..."
        }
    }
}

Write-Host ""
Write-Host "=== Route Test Results ==="
Write-Host "Total:      $total"
Write-Host "OK (data):  $okCount ($([math]::Round($okCount/$total*100,1))%)"
Write-Host "Empty:      $emptyCount ($([math]::Round($emptyCount/$total*100,1))%)"
Write-Host "MUMPS err:  $errorCount ($([math]::Round($errorCount/$total*100,1))%)"
Write-Host "FAIL:       $failCount ($([math]::Round($failCount/$total*100,1))%)"
Write-Host ""

if ($errors.Count -gt 0) {
    Write-Host "=== Errors (first 30) ==="
    $errors | Select-Object -First 30 | ForEach-Object { Write-Host "  $_" }
}

# Save results
$results = @{
    total = $total
    ok = $okCount
    empty = $emptyCount
    mumpsError = $errorCount
    fail = $failCount
    errors = $errors
}
$results | ConvertTo-Json | Set-Content "artifacts\route-test-results.json" -Encoding UTF8

Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
