<#
.SYNOPSIS
    Phase 24 device test harness — verifies imaging device registry endpoints.
.DESCRIPTION
    Tests CRUD operations on /imaging/devices, C-ECHO test endpoint,
    and verifies AE Title validation rules.
.NOTES
    Requires: API server running, admin session cookie.
    Usage: .\scripts\verify-imaging-devices.ps1 [-ApiBase http://localhost:3001]
#>

param(
    [string]$ApiBase = "http://localhost:3001"
)

$ErrorActionPreference = "Stop"
$pass = 0; $fail = 0; $skip = 0

function Test-Gate {
    param([string]$Name, [scriptblock]$Check)
    try {
        $result = & $Check
        if ($result) {
            Write-Host "  PASS  $Name" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  FAIL  $Name" -ForegroundColor Red
            $script:fail++
        }
    } catch {
        Write-Host "  FAIL  $Name — $($_.Exception.Message)" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host "`n=== Phase 24: Imaging Device Registry Test Harness ===" -ForegroundColor Cyan
Write-Host "API: $ApiBase`n"

# Step 1: Login to get session cookie
Write-Host "--- Step 1: Authenticate ---" -ForegroundColor Yellow
$loginBody = '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'
try {
    $loginResp = Invoke-WebRequest -UseBasicParsing -Uri "$ApiBase/auth/login" `
        -Method POST -ContentType "application/json" -Body $loginBody `
        -SessionVariable session
    $loginOk = ($loginResp.StatusCode -eq 200)
} catch {
    Write-Host "  FAIL  Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nCannot continue without authentication." -ForegroundColor Red
    exit 1
}
Test-Gate "Login succeeds" { $loginOk }

# Step 2: List devices (initially empty or existing)
Write-Host "`n--- Step 2: List Devices ---" -ForegroundColor Yellow
$listResp = Invoke-WebRequest -UseBasicParsing -Uri "$ApiBase/imaging/devices" `
    -WebSession $session
$listData = $listResp.Content | ConvertFrom-Json
Test-Gate "GET /imaging/devices returns 200" { $listResp.StatusCode -eq 200 }
Test-Gate "Response has devices array" { $null -ne $listData.devices }

$initialCount = @($listData.devices).Count
Write-Host "  INFO  Initial device count: $initialCount" -ForegroundColor Gray

# Step 3: Create a device
Write-Host "`n--- Step 3: Create Device ---" -ForegroundColor Yellow
$createBody = @{
    aeTitle     = "TEST_DEVICE_01"
    hostname    = "192.168.1.200"
    port        = 11112
    description = "Test device for Phase 24 verification"
    modality    = "CT"
    facility    = "TEST_FACILITY"
    location    = "Test Lab"
    tlsMode     = "off"
    ipAllowlist = @("192.168.1.0/24")
} | ConvertTo-Json

try {
    $createResp = Invoke-WebRequest -UseBasicParsing -Uri "$ApiBase/imaging/devices" `
        -Method POST -ContentType "application/json" -Body $createBody `
        -WebSession $session
    $createData = $createResp.Content | ConvertFrom-Json
    $deviceId = $createData.device.id
    Test-Gate "POST /imaging/devices returns 201" { $createResp.StatusCode -eq 201 }
    Test-Gate "Device has valid ID" { $null -ne $deviceId -and $deviceId.Length -gt 0 }
    Test-Gate "AE Title matches" { $createData.device.aeTitle -eq "TEST_DEVICE_01" }
    Test-Gate "Modality is CT" { $createData.device.modality -eq "CT" }
    Test-Gate "Status defaults to testing" { $createData.device.status -eq "testing" }
} catch {
    Write-Host "  FAIL  Create device: $($_.Exception.Message)" -ForegroundColor Red
    $fail += 5
    $deviceId = $null
}

# Step 4: AE Title validation
Write-Host "`n--- Step 4: AE Title Validation ---" -ForegroundColor Yellow

# Invalid: lowercase
$invalidBody1 = @{
    aeTitle = "lowercase_bad"; hostname = "1.2.3.4"; port = 104; modality = "CR"
} | ConvertTo-Json
try {
    Invoke-WebRequest -UseBasicParsing -Uri "$ApiBase/imaging/devices" `
        -Method POST -ContentType "application/json" -Body $invalidBody1 `
        -WebSession $session -ErrorAction Stop
    Test-Gate "Reject lowercase AE Title" { $false }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Test-Gate "Reject lowercase AE Title (400)" { $code -eq 400 }
}

# Invalid: too long (>16 chars)
$invalidBody2 = @{
    aeTitle = "TOOOOOOLOOOOOONG1"; hostname = "1.2.3.4"; port = 104; modality = "CR"
} | ConvertTo-Json
try {
    Invoke-WebRequest -UseBasicParsing -Uri "$ApiBase/imaging/devices" `
        -Method POST -ContentType "application/json" -Body $invalidBody2 `
        -WebSession $session -ErrorAction Stop
    Test-Gate "Reject AE Title >16 chars" { $false }
} catch {
    $code2 = $_.Exception.Response.StatusCode.value__
    Test-Gate "Reject AE Title >16 chars (400)" { $code2 -eq 400 }
}

# Duplicate AE Title
if ($deviceId) {
    try {
        Invoke-WebRequest -UseBasicParsing -Uri "$ApiBase/imaging/devices" `
            -Method POST -ContentType "application/json" -Body $createBody `
            -WebSession $session -ErrorAction Stop
        Test-Gate "Reject duplicate AE Title" { $false }
    } catch {
        $code3 = $_.Exception.Response.StatusCode.value__
        Test-Gate "Reject duplicate AE Title (409)" { $code3 -eq 409 }
    }
}

# Step 5: Get device by ID
Write-Host "`n--- Step 5: Get Device by ID ---" -ForegroundColor Yellow
if ($deviceId) {
    $getResp = Invoke-WebRequest -UseBasicParsing -Uri "$ApiBase/imaging/devices/$deviceId" `
        -WebSession $session
    $getData = $getResp.Content | ConvertFrom-Json
    Test-Gate "GET /imaging/devices/:id returns 200" { $getResp.StatusCode -eq 200 }
    Test-Gate "Device ID matches" { $getData.device.id -eq $deviceId }
} else {
    Write-Host "  SKIP  No device ID from create step" -ForegroundColor DarkYellow
    $skip += 2
}

# Step 6: Update device
Write-Host "`n--- Step 6: Update Device ---" -ForegroundColor Yellow
if ($deviceId) {
    $updateBody = @{ status = "active"; description = "Updated by test harness" } | ConvertTo-Json
    $updateResp = Invoke-WebRequest -UseBasicParsing -Uri "$ApiBase/imaging/devices/$deviceId" `
        -Method Patch -ContentType "application/json" -Body $updateBody `
        -WebSession $session
    $updateData = $updateResp.Content | ConvertFrom-Json
    Test-Gate "PATCH /imaging/devices/:id returns 200" { $updateResp.StatusCode -eq 200 }
    Test-Gate "Status updated to active" { $updateData.device.status -eq "active" }
} else {
    Write-Host "  SKIP  No device ID from create step" -ForegroundColor DarkYellow
    $skip += 2
}

# Step 7: C-ECHO test (may fail if Orthanc not running or device unreachable)
Write-Host "`n--- Step 7: C-ECHO Test ---" -ForegroundColor Yellow
if ($deviceId) {
    try {
        $echoResp = Invoke-WebRequest -UseBasicParsing `
            -Uri "$ApiBase/imaging/devices/$deviceId/echo" `
            -Method POST -WebSession $session
        Test-Gate "POST /imaging/devices/:id/echo returns 200" { $echoResp.StatusCode -eq 200 }
    } catch {
        $echoCode = $_.Exception.Response.StatusCode.value__
        # C-ECHO failure is expected if device is fake
        if ($echoCode -eq 200 -or $echoCode -eq 502 -or $echoCode -eq 504) {
            Write-Host "  SKIP  C-ECHO failed (expected: test device is not real)" -ForegroundColor DarkYellow
            $skip++
        } else {
            Test-Gate "C-ECHO endpoint accessible" { $false }
        }
    }
} else {
    Write-Host "  SKIP  No device ID" -ForegroundColor DarkYellow
    $skip++
}

# Step 8: Delete (decommission) device
Write-Host "`n--- Step 8: Decommission Device ---" -ForegroundColor Yellow
if ($deviceId) {
    $delResp = Invoke-WebRequest -UseBasicParsing -Uri "$ApiBase/imaging/devices/$deviceId" `
        -Method Delete -WebSession $session
    $delData = $delResp.Content | ConvertFrom-Json
    Test-Gate "DELETE /imaging/devices/:id returns 200" { $delResp.StatusCode -eq 200 }
    Test-Gate "Device status is decommissioned" { $delData.device.status -eq "decommissioned" }
} else {
    Write-Host "  SKIP  No device ID" -ForegroundColor DarkYellow
    $skip += 2
}

# Step 9: Verify list count
Write-Host "`n--- Step 9: Final List Check ---" -ForegroundColor Yellow
$finalListResp = Invoke-WebRequest -UseBasicParsing -Uri "$ApiBase/imaging/devices" `
    -WebSession $session
$finalData = $finalListResp.Content | ConvertFrom-Json
$finalCount = @($finalData.devices).Count
Test-Gate "Final device list accessible" { $finalListResp.StatusCode -eq 200 }

# Summary
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  Device Test Harness Results" -ForegroundColor Cyan
Write-Host "  PASS: $pass   FAIL: $fail   SKIP: $skip" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "============================================`n" -ForegroundColor Cyan

if ($fail -gt 0) { exit 1 }
