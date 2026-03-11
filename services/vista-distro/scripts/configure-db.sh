#!/usr/bin/env bash
# =============================================================================
# Configure YottaDB database for VistA
# =============================================================================
# VistA requires larger key and record sizes than YottaDB defaults.
# This script sources the YottaDB environment (which creates a default DB),
# then reconfigures it with VistA-appropriate settings via GDE.
# =============================================================================

set -eo pipefail

echo "=== Configuring YottaDB database for VistA ==="

# Source YottaDB environment (creates default database)
# Note: ydb_env_set references gtm_dist internally which may not be set,
# so we cannot use bash strict mode (-u) before sourcing.
export gtm_dist=/opt/yottadb/current
source /opt/yottadb/current/ydb_env_set

echo "  ydb_dir: ${ydb_dir}"
echo "  ydb_gbldir: ${ydb_gbldir}"

# Reconfigure the DEFAULT region for VistA's needs
# Key size: 1023 (max for YottaDB, VistA globals can have long subscripts)
# Record size: 1048576 (1MB -- VistA word-processing fields can be large)
# Block size: 4096 (standard)
# Journal: off for build (would enable in production)
$ydb_dist/yottadb -run GDE <<'GDE_COMMANDS'
change -segment DEFAULT -block_size=4096 -allocation=200000 -extension_count=100000 -global_buffer_count=2048 -file_name=$ydb_dir/$ydb_rel/g/yottadb.dat
change -region DEFAULT -record_size=1048576 -key_size=1023 -journal=off -null_subscripts=always
exit
GDE_COMMANDS

echo "  GDE configuration applied"

# Recreate the database file with new settings
if [ -f "${ydb_dir}/${ydb_rel}/g/yottadb.dat" ]; then
    rm -f "${ydb_dir}/${ydb_rel}/g/yottadb.dat"
fi
$ydb_dist/mupip create

echo "  Database file created with VistA settings"

# Also set up /opt/vista/g as the database location for runtime
mkdir -p /opt/vista/g
cp "${ydb_dir}/${ydb_rel}/g/yottadb.dat" /opt/vista/g/ 2>/dev/null || true
cp "${ydb_gbldir}" /opt/vista/g/ 2>/dev/null || true

echo "=== Database configuration complete ==="
