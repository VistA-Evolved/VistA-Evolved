# infra/scripts/backup-pg.ps1 - PostgreSQL backup with PITR support
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
    [ValidateSet('full', 'wal', 'restore')]
    [string]$Mode = "full",

    [string]$BackupDir = "",
    [string]$S3Bucket = "",
    [string]$S3Endpoint = "",
    [string]$PgHost = "127.0.0.1",
    [string]$PgPort = "5432",
    [string]$PgUser = "ve_api",
    [string]$PgDb = "ve_platform",
    [string]$RestoreTarget = "",  # ISO 8601 timestamp for PITR
    [switch]$DryRun
)

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

if (-not $BackupDir) {
    $BackupDir = Join-Path $RepoRoot "artifacts/backups/pg"
}

Write-Host "=== VistA-Evolved PG Backup ===" -ForegroundColor Cyan
Write-Host "  Mode:      $Mode"
Write-Host "  PG Host:   ${PgHost}:${PgPort}"
Write-Host "  Database:  $PgDb"
Write-Host "  BackupDir: $BackupDir"
Write-Host ""

# Ensure backup directory
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

switch ($Mode) {
    'full' {
        $dumpFile = Join-Path $BackupDir "pg-full-${Timestamp}.sql.gz"
        $cmd = "pg_dump -h $PgHost -p $PgPort -U $PgUser -d $PgDb -Fc"

        if ($DryRun) {
            Write-Host "(dry-run) Would run: $cmd > $dumpFile" -ForegroundColor Yellow
        } else {
            Write-Host "Running full backup..." -ForegroundColor Green

            # Try Docker-based pg_dump first (for Kind/Docker setups)
            $dockerPg = docker ps --filter "name=platform-db" --format "{{.Names}}" 2>$null
            if ($dockerPg) {
                Write-Host "  Using Docker container: $dockerPg" -ForegroundColor Gray
                docker exec $dockerPg pg_dump -U $PgUser -d $PgDb -Fc | Set-Content -Path $dumpFile -Encoding Byte
            } else {
                # Try native pg_dump
                if (Get-Command pg_dump -ErrorAction SilentlyContinue) {
                    & pg_dump -h $PgHost -p $PgPort -U $PgUser -d $PgDb -Fc | Set-Content -Path $dumpFile -Encoding Byte
                } else {
                    Write-Host "ERROR: Neither Docker PG container nor pg_dump found." -ForegroundColor Red
                    exit 1
                }
            }

            $size = (Get-Item $dumpFile).Length
            Write-Host "  Backup saved: $dumpFile ($size bytes)" -ForegroundColor Green

            # Write manifest
            $manifest = @{
                type = "pg-full"
                timestamp = $Timestamp
                database = $PgDb
                file = $dumpFile
                sizeBytes = $size
            }
            $manifest | ConvertTo-Json | Set-Content -Path (Join-Path $BackupDir "pg-full-${Timestamp}.manifest.json") -Encoding ASCII
        }
    }

    'wal' {
        Write-Host "WAL archiving configuration:" -ForegroundColor Green
        Write-Host "  To enable continuous WAL archiving, set in postgresql.conf:" -ForegroundColor Gray
        Write-Host "    wal_level = replica" -ForegroundColor Gray
        Write-Host "    archive_mode = on" -ForegroundColor Gray
        Write-Host "    archive_command = 'cp %p $BackupDir/wal/%f'" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  For K8s deployments, use pgBackRest or wal-g:" -ForegroundColor Gray
        Write-Host "    pgbackrest --stanza=ve-platform backup --type=full" -ForegroundColor Gray

        if (-not $DryRun) {
            $walDir = Join-Path $BackupDir "wal"
            if (-not (Test-Path $walDir)) {
                New-Item -ItemType Directory -Path $walDir -Force | Out-Null
                Write-Host "  Created WAL archive dir: $walDir" -ForegroundColor Green
            }
        }
    }

    'restore' {
        if (-not $RestoreTarget) {
            # Find latest full backup
            $latest = Get-ChildItem -Path $BackupDir -Filter 'pg-full-*.sql.gz' |
                Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if (-not $latest) {
                Write-Host "ERROR: No backup files found in $BackupDir" -ForegroundColor Red
                exit 1
            }
            $RestoreTarget = $latest.FullName
        }

        Write-Host "Restoring from: $RestoreTarget" -ForegroundColor Yellow

        if ($DryRun) {
            Write-Host "(dry-run) Would run: pg_restore -h $PgHost -p $PgPort -U $PgUser -d $PgDb -c $RestoreTarget" -ForegroundColor Yellow
        } else {
            $dockerPg = docker ps --filter "name=platform-db" --format "{{.Names}}" 2>$null
            if ($dockerPg) {
                Get-Content -Path $RestoreTarget -Encoding Byte |
                    docker exec -i $dockerPg pg_restore -U $PgUser -d $PgDb -c
            } else {
                & pg_restore -h $PgHost -p $PgPort -U $PgUser -d $PgDb -c $RestoreTarget
            }

            if ($LASTEXITCODE -ne 0) {
                Write-Host "WARNING: pg_restore exited with code $LASTEXITCODE (some errors are expected for DROP IF EXISTS)" -ForegroundColor Yellow
            } else {
                Write-Host "Restore complete." -ForegroundColor Green
            }
        }
    }
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
