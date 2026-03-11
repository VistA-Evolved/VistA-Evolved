#!/usr/bin/env pwsh
# Test all generated VistA module routes against live VEHU
# Outputs: data/vista/route-test-results.json

$ErrorActionPreference = "Continue"
$API = "http://127.0.0.1:3001"
$DFN = "46"
$CookieFile = "cookies.txt"

# Login
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
$null = curl.exe -s -c $CookieFile -X POST "$API/auth/login" -H "Content-Type: application/json" -d "@login-body.json"
Write-Host "Logged in"

# Collect all routes
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

$results = @()
$ok = 0; $mumpsErr = 0; $emptyOk = 0; $notFound = 0; $authErr = 0; $other = 0
$i = 0

foreach ($r in $allRoutes) {
    $i++
    $url = "$API$($r.Route)"
    if ($r.Method -eq "GET") { $url += "?dfn=$DFN" }
    
    try {
        $resp = curl.exe -s -b $CookieFile $url 2>&1
        $status = "unknown"
        $rpcData = ""
        
        if ($resp -match '"ok":true.*"data":\[".+"\]') { $status = "data_returned"; $ok++ }
        elseif ($resp -match '"ok":true.*"data":\[\]') { $status = "empty_ok"; $emptyOk++ }
        elseif ($resp -match '"ok":true') { $status = "ok_other"; $ok++ }
        elseif ($resp -match 'LVUNDEF|ERROR=|YDB-E') { $status = "mumps_error"; $mumpsErr++ }
        elseif ($resp -match '404') { $status = "not_found"; $notFound++ }
        elseif ($resp -match '401|403') { $status = "auth_error"; $authErr++ }
        else { $status = "other"; $other++ }
        
        $results += [PSCustomObject]@{
            package = $r.Package
            route = $r.Route
            method = $r.Method
            status = $status
            snippet = if ($resp.Length -gt 200) { $resp.Substring(0, 200) } else { $resp }
        }
    } catch {
        $results += [PSCustomObject]@{
            package = $r.Package
            route = $r.Route
            method = $r.Method
            status = "exception"
            snippet = $_.Exception.Message
        }
        $other++
    }
    
    if ($i % 50 -eq 0) { Write-Host "  Tested $i / $($allRoutes.Count)..." }
}

Write-Host "`n=== RESULTS ==="
Write-Host "  Total routes:    $($allRoutes.Count)"
Write-Host "  Data returned:   $ok"
Write-Host "  Empty but OK:    $emptyOk"
Write-Host "  MUMPS errors:    $mumpsErr"
Write-Host "  404 not found:   $notFound"
Write-Host "  Auth errors:     $authErr"
Write-Host "  Other:           $other"

# Write JSON
$json = $results | ConvertTo-Json -Depth 3
$outputPath = "data\vista\route-test-results.json"
New-Item -ItemType Directory -Force -Path (Split-Path $outputPath) | Out-Null
Set-Content -Path $outputPath -Value $json -Encoding UTF8
Write-Host "`nResults written to $outputPath"

# Summary by package
Write-Host "`n=== BY PACKAGE ==="
$results | Group-Object package | ForEach-Object {
    $pkgData = $_.Group | Where-Object { $_.status -eq "data_returned" -or $_.status -eq "ok_other" }
    $pkgEmpty = $_.Group | Where-Object { $_.status -eq "empty_ok" }
    $pkgErr = $_.Group | Where-Object { $_.status -eq "mumps_error" }
    Write-Host ("  {0,-8} total:{1,3}  data:{2,3}  empty:{3,3}  mumps_err:{4,3}" -f $_.Name, $_.Count, $pkgData.Count, $pkgEmpty.Count, $pkgErr.Count)
}

# Cleanup
Remove-Item login-body.json, $CookieFile -ErrorAction SilentlyContinue
