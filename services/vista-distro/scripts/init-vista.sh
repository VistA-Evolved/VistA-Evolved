#!/usr/bin/env bash
# =============================================================================
# VistA Distro -- First-Boot Initialization
# =============================================================================
# Runs once on first container start to initialize VistA system parameters,
# register RPCs, and seed base data. Creates a sentinel file to prevent
# re-running on subsequent starts.
#
# This script runs AFTER YottaDB env is sourced and globals are loaded.
# =============================================================================

set -euo pipefail

SENTINEL="/opt/vista/g/.vista-initialized"

if [ -f "$SENTINEL" ]; then
    echo "VistA already initialized (sentinel exists). Skipping init."
    exit 0
fi

echo "=== VistA First-Boot Initialization ==="

# Run ZTMGRSET to initialize Kernel
echo "--- Running ^ZTMGRSET (Kernel Init) ---"
echo 'D ^ZTMGRSET' | /opt/yottadb/current/ydb -direct 2>&1 || {
    echo "WARN: ZTMGRSET may have failed (non-fatal for dev)"
}

# Register all ZVE* RPCs
echo "--- Registering VistA-Evolved RPCs ---"
for routine in ZVEMINS ZVECLIN ZVEWARD ZVEUSER ZVESYS ZVERAD ZVELAB ZVEPHAR ZVEINV ZVEQUAL ZVEWRKF ZVEBILL; do
    if [ -f "/opt/vista/r/${routine}.m" ]; then
        echo "  Running INSTALL^${routine}..."
        echo "D INSTALL^${routine}" | /opt/yottadb/current/ydb -direct 2>&1 || {
            # Try RUN tag if INSTALL doesn't exist
            echo "D RUN^${routine}" | /opt/yottadb/current/ydb -direct 2>&1 || {
                echo "  WARN: ${routine} has no INSTALL or RUN entry (non-fatal)"
            }
        }
    fi
done

# Register interop RPCs
if [ -f "/opt/vista/r/ZVEMINS.m" ]; then
    echo "  Running RUN^ZVEMINS (interop RPCs)..."
    echo 'D RUN^ZVEMINS' | /opt/yottadb/current/ydb -direct 2>&1 || true
fi

# Register RPC contexts via VEMCTX3
if [ -f "/opt/vista/r/VEMCTX3.m" ]; then
    echo "--- Registering RPC Contexts ---"
    echo 'D RUN^VEMCTX3' | /opt/yottadb/current/ydb -direct 2>&1 || true
fi

# Seed base data
echo "--- Seeding Base Data ---"
if [ -f "/opt/vista/r/ZVETNSEED.m" ]; then
    echo "  Running SEED^ZVETNSEED..."
    echo 'D SEED^ZVETNSEED("VISTA EVOLVED MEDICAL CENTER","500","VISTA EVOLVED")' | /opt/yottadb/current/ydb -direct 2>&1 || true
fi

if [ -f "/opt/vista/r/ZVESDSEED.m" ]; then
    echo "  Running EN^ZVESDSEED (scheduling seed)..."
    echo 'D EN^ZVESDSEED' | /opt/yottadb/current/ydb -direct 2>&1 || true
fi

# Run comprehensive seed if available
if [ -f "/opt/vista/r/ZVESEED.m" ]; then
    echo "  Running EN^ZVESEED (comprehensive seed)..."
    echo 'D EN^ZVESEED' | /opt/yottadb/current/ydb -direct 2>&1 || true
fi

# Create sentinel file with metadata
echo "=== Initialization Complete ==="
cat > "$SENTINEL" <<EOF
initialized_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
build_sha=$(cat /opt/vista/build-info.txt 2>/dev/null | grep BUILD_SHA | cut -d= -f2 || echo 'unknown')
hostname=$(hostname)
EOF

echo "Sentinel written to ${SENTINEL}"
