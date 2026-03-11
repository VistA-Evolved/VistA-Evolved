#!/usr/bin/env pwsh
$ErrorActionPreference = "Continue"
$API = "http://127.0.0.1:3001"

Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
$null = curl.exe -s -c cookies.txt -X POST "$API/auth/login" -H "Content-Type: application/json" -d "@login-body.json"
Write-Host "Logged in"

$allRoutes = Get-ChildItem "apps\api\src\routes\vista\*.ts" -Exclude "index.ts" | ForEach-Object {
    $pkg = $_.BaseName
    Select-String -Path $_.FullName -Pattern "server\.(get|post)" | ForEach-Object {
        if ($_.Line -match "'([^']+)'") {
            $method = if ($_.Line -match "server\.post") { "POST" } else { "GET" }
            [PSCustomObject]@{Package=$pkg; Route=$matches[1]; Method=$method}
        }
    }
}

Write-Host "Testing $($allRoutes.Count) routes..."

$ok = 0; $emptyOk = 0; $mumpsErr = 0; $fourOhFour = 0; $authErr = 0; $connErr = 0; $other = 0
$details = @()
$i = 0

foreach ($r in $allRoutes) {
    $i++
    $url = "$API$($r.Route)"
    if ($r.Method -eq "GET") { $url += "?dfn=46" }
    
    $raw = curl.exe -s -w "`n%{http_code}" -b cookies.txt $url 2>&1
    $lines = $raw -split "`n"
    $httpCode = $lines[-1].Trim()
    $body = ($lines[0..($lines.Length-2)]) -join "`n"
    
    $status = "unknown"
    if ($httpCode -eq "200" -and $body -match '"ok"\s*:\s*true' -and $body -match '"data"\s*:\s*\[' -and $body -notmatch '"data"\s*:\s*\[\s*\]') {
        $status = "data_returned"; $ok++
    } elseif ($httpCode -eq "200" -and $body -match '"ok"\s*:\s*true') {
        $status = "ok_empty"; $emptyOk++
    } elseif ($body -match 'LVUNDEF|YDB-E|ERROR=') {
        $status = "mumps_error"; $mumpsErr++
    } elseif ($httpCode -eq "404") {
        $status = "not_found"; $fourOhFour++
    } elseif ($httpCode -match '401|403') {
        $status = "auth_error"; $authErr++
    } elseif ($httpCode -eq "000" -or $body -eq "") {
        $status = "connection_error"; $connErr++
    } else {
        $status = "other_$httpCode"; $other++
    }
    
    $snippet = if ($body.Length -gt 120) { $body.Substring(0, 120) } else { $body }
    $details += "$status`t$httpCode`t$($r.Package)`t$($r.Route)`t$snippet"
    
    if ($i % 50 -eq 0) { Write-Host "  Tested $i / $($allRoutes.Count)..." }
}

Write-Host "`n=== RESULTS ==="
Write-Host "  Total:           $($allRoutes.Count)"
Write-Host "  Data returned:   $ok"
Write-Host "  OK (empty):      $emptyOk"
Write-Host "  MUMPS errors:    $mumpsErr"
Write-Host "  404:             $fourOhFour"
Write-Host "  Auth errors:     $authErr"
Write-Host "  Conn errors:     $connErr"
Write-Host "  Other:           $other"

Write-Host "`n=== SAMPLE RESPONSES ==="
$details | Select-Object -First 20 | ForEach-Object { Write-Host $_ }

Write-Host "`n=== DATA-RETURNING ROUTES ==="
$details | Where-Object { $_ -match "^data_returned" } | ForEach-Object { Write-Host $_ }

$details | Set-Content -Path "data\vista\route-test-details.txt" -Encoding UTF8
Write-Host "`nDetails saved to data\vista\route-test-details.txt"

Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
