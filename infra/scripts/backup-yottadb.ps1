# infra/scripts/backup-yottadb.ps1 - YottaDB/VistA database backup
#Requires -Version 5.1
param(
    [ValidateSet('online', 'offline', 'restore')]
    [string]$Mode = "online",

    [string]$BackupDir = "",
    [string]$ContainerName = "",
    [string]$TenantSlug = "",
    [string]$RestoreFrom = "",
    [int]$RetainDays = 7,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

if (-not $BackupDir) {
    $BackupDir = Join-Path $RepoRoot "artifacts/backups/yottadb"
}

# Auto-detect container if not specified
if (-not $ContainerName) {
    if ($TenantSlug) {
        $ContainerName = "ve-vista-$TenantSlug"
    } else {
        # Try to find the running VistA container
        $found = docker ps --filter "ancestor=worldvista/worldvista-ehr" --format "{{.Names}}" 2>$null
        if (-not $found) {
            $found = docker ps --filter "name=vista" --format "{{.Names}}" 2>$null | Select-Object -First 1
        }
        if ($found) { $ContainerName = $found.Trim() }
    }
}

Write-Host "=== VistA-Evolved YottaDB Backup ===" -ForegroundColor Cyan
Write-Host "  Mode:      $Mode"
Write-Host "  Container: $ContainerName"
Write-Host "  BackupDir: $BackupDir"
Write-Host ""

if (-not $ContainerName) {
    Write-Host "ERROR: No VistA container found. Specify -ContainerName or -TenantSlug." -ForegroundColor Red
    exit 1
}

# Ensure backup directory
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

switch ($Mode) {
    'online' {
        $backupName = "ydb-online-${Timestamp}"
        $backupPath = Join-Path $BackupDir $backupName

        if ($DryRun) {
            Write-Host "(dry-run) Would run: mupip backup -online '*' /tmp/backup inside $ContainerName" -ForegroundColor Yellow
        } else {
            Write-Host "Running online backup via mupip..." -ForegroundColor Green

            # Create temp dir in container
            docker exec $ContainerName mkdir -p /tmp/ydb-backup
            if ($LASTEXITCODE -ne 0) {
                Write-Host "ERROR: Failed to create backup dir in container." -ForegroundColor Red
                exit 1
            }

            # Run mupip online backup
            docker exec $ContainerName bash -c 'source /opt/yottadb/current/ydb_env_set 2>/dev/null; mupip backup -online "*" /tmp/ydb-backup/'
            if ($LASTEXITCODE -ne 0) {
                Write-Host "ERROR: mupip backup failed." -ForegroundColor Red
                exit 1
            }

            # Copy backup out of container
            New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
            docker cp "${ContainerName}:/tmp/ydb-backup/." $backupPath

            # Cleanup container temp
            docker exec $ContainerName rm -rf /tmp/ydb-backup

            $size = (Get-ChildItem -Path $backupPath -Recurse | Measure-Object -Property Length -Sum).Sum
            Write-Host "  Backup saved: $backupPath ($size bytes)" -ForegroundColor Green

            # Write manifest
            $manifest = @{
                type = "yottadb-online"
                timestamp = $Timestamp
                container = $ContainerName
                path = $backupPath
                sizeBytes = $size
            }
            $manifest | ConvertTo-Json | Set-Content -Path "$backupPath.manifest.json" -Encoding ASCII
        }
    }

    'offline' {
        Write-Host "Offline backup requires stopping the VistA container." -ForegroundColor Yellow
        $backupName = "ydb-offline-${Timestamp}"
        $backupPath = Join-Path $BackupDir $backupName

        if ($DryRun) {
            Write-Host "(dry-run) Would stop $ContainerName, copy /data, restart" -ForegroundColor Yellow
        } else {
            Write-Host "Stopping container $ContainerName..." -ForegroundColor Yellow
            docker stop $ContainerName
            docker cp "${ContainerName}:/data" $backupPath
            Write-Host "Restarting container $ContainerName..." -ForegroundColor Green
            docker start $ContainerName

            $size = (Get-ChildItem -Path $backupPath -Recurse | Measure-Object -Property Length -Sum).Sum
            Write-Host "  Backup saved: $backupPath ($size bytes)" -ForegroundColor Green
        }
    }

    'restore' {
        if (-not $RestoreFrom) {
            # Find latest online backup
            $latest = Get-ChildItem -Path $BackupDir -Directory -Filter 'ydb-online-*' |
                Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if (-not $latest) {
                Write-Host "ERROR: No backup found in $BackupDir" -ForegroundColor Red
                exit 1
            }
            $RestoreFrom = $latest.FullName
        }

        Write-Host "Restoring from: $RestoreFrom" -ForegroundColor Yellow

        if ($DryRun) {
            Write-Host "(dry-run) Would stop $ContainerName, copy backup to /data, mupip rundown, restart" -ForegroundColor Yellow
        } else {
            Write-Host "Stopping container $ContainerName..." -ForegroundColor Yellow
            docker stop $ContainerName

            # Copy backup into container data volume
            docker cp "$RestoreFrom/." "${ContainerName}:/data"

            # Rundown to clear stale shared memory
            docker start $ContainerName
            Start-Sleep -Seconds 3
            docker exec $ContainerName bash -c 'source /opt/yottadb/current/ydb_env_set 2>/dev/null; mupip rundown -reg "*" 2>/dev/null'

            Write-Host "Restore complete. Waiting for broker port..." -ForegroundColor Green
            Start-Sleep -Seconds 10
            # Verify broker is listening
            $tcpTest = docker exec $ContainerName bash -c 'echo | nc -w 2 127.0.0.1 9430; echo $?'
            if ($tcpTest -match '0') {
                Write-Host "  VistA broker is responding." -ForegroundColor Green
            } else {
                Write-Host "  WARNING: Broker may not be ready yet." -ForegroundColor Yellow
            }
        }
    }
}

# Retention: clean old backups
if ($RetainDays -gt 0 -and $Mode -ne 'restore') {
    $cutoff = (Get-Date).AddDays(-$RetainDays)
    $old = Get-ChildItem -Path $BackupDir -Directory | Where-Object { $_.LastWriteTime -lt $cutoff }
    if ($old) {
        Write-Host ""
        Write-Host "Cleaning backups older than $RetainDays days..." -ForegroundColor Gray
        foreach ($d in $old) {
            if ($DryRun) {
                Write-Host "  (dry-run) Would delete: $($d.Name)" -ForegroundColor Yellow
            } else {
                Remove-Item -Path $d.FullName -Recurse -Force
                Write-Host "  Deleted: $($d.Name)" -ForegroundColor Gray
            }
        }
    }
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
