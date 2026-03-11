#!/usr/bin/env bash
# =============================================================================
# VistA Distro -- Globals Loader
# =============================================================================
# Loads all .zwr (ZWRITE format) global files from VistA-M into YottaDB.
# Called during Docker build phase after GDE/database creation.
#
# Usage: ./globals-load.sh /path/to/VistA-M
# =============================================================================

set -euo pipefail

VISTAM_DIR="${1:-/opt/vista-build/VistA-M}"
LOG_FILE="/opt/vista/g/globals-load.log"

echo "=== VistA Globals Loader ==="
echo "  Source: ${VISTAM_DIR}"
echo "  Target: \$ydb_gbldir"

if [ ! -d "${VISTAM_DIR}/Packages" ]; then
    echo "ERROR: VistA-M Packages directory not found at ${VISTAM_DIR}/Packages"
    exit 1
fi

TOTAL=0
LOADED=0
ERRORS=0

# Find all .zwr files and load them
while IFS= read -r -d '' zwrfile; do
    TOTAL=$((TOTAL + 1))
    BASENAME=$(basename "$zwrfile")

    if mupip load "$zwrfile" >> "$LOG_FILE" 2>&1; then
        LOADED=$((LOADED + 1))
    else
        ERRORS=$((ERRORS + 1))
        echo "  WARN: Failed to load $BASENAME (non-fatal)"
    fi

    # Progress every 100 files
    if [ $((TOTAL % 100)) -eq 0 ]; then
        echo "  Progress: ${TOTAL} files processed (${LOADED} loaded, ${ERRORS} errors)"
    fi
done < <(find "${VISTAM_DIR}/Packages" -name "*.zwr" -print0 | sort -z)

echo "=== Globals Load Complete ==="
echo "  Total files: ${TOTAL}"
echo "  Loaded:      ${LOADED}"
echo "  Errors:      ${ERRORS}"

# Check for critical errors
if [ "$LOADED" -eq 0 ] && [ "$TOTAL" -gt 0 ]; then
    echo "FATAL: Zero globals loaded out of ${TOTAL} files"
    exit 1
fi

echo "  Log: ${LOG_FILE}"
