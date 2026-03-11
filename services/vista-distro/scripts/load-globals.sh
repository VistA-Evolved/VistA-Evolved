#!/usr/bin/env bash
# =============================================================================
# Load VistA-M globals (.zwr files) into YottaDB
# =============================================================================
# CRITICAL: VistA-M directory names contain spaces (e.g. "Accounts Receivable",
# "Adverse Reaction Tracking"). Must handle spaces correctly.
# Uses find -print0 + read -d '' for null-delimited iteration.
# =============================================================================

set -eo pipefail

echo "=== Loading VistA-M globals ==="

# Source YottaDB environment
export gtm_dist=/opt/yottadb/current
source /opt/yottadb/current/ydb_env_set
export ydb_routines="/opt/vista/r $ydb_routines"

GLOBALS_DIR="/opt/vista-build/VistA-M/Packages"
LOG_FILE="/opt/vista/g/globals-load.log"
ERR_FILE="/opt/vista/g/globals-errors.log"

: > "$LOG_FILE"
: > "$ERR_FILE"

# Count total files first
TOTAL_FILES=$(find "$GLOBALS_DIR" -name "*.zwr" | wc -l)
echo "  Found $TOTAL_FILES .zwr files to load"

LOADED=0
ERRORS=0
COUNT=0

# Use a temp file for tracking counts (subshell issue with pipes)
COUNTER_FILE=$(mktemp)
echo "0 0 0" > "$COUNTER_FILE"

# Process each .zwr file, handling spaces in paths
find "$GLOBALS_DIR" -name "*.zwr" -print0 | while IFS= read -r -d '' zwrfile; do
    COUNT=$((COUNT + 1))

    if $ydb_dist/mupip load "$zwrfile" >> "$LOG_FILE" 2>&1; then
        LOADED=$((LOADED + 1))
    else
        ERRORS=$((ERRORS + 1))
        echo "$zwrfile" >> "$ERR_FILE"
    fi

    if [ $((COUNT % 500)) -eq 0 ]; then
        echo "  Progress: ${COUNT}/${TOTAL_FILES} (${LOADED} loaded, ${ERRORS} errors)"
    fi

    # Write counts to temp file for post-loop access
    echo "$COUNT $LOADED $ERRORS" > "$COUNTER_FILE"
done

# Read final counts
read FINAL_COUNT FINAL_LOADED FINAL_ERRORS < "$COUNTER_FILE"
rm -f "$COUNTER_FILE"

echo ""
echo "=== Globals load complete ==="
echo "  Total .zwr files: ${FINAL_COUNT:-$TOTAL_FILES}"
echo "  Successfully loaded: ${FINAL_LOADED:-0}"
echo "  Errors: ${FINAL_ERRORS:-0}"

# Show first few errors if any
if [ -s "$ERR_FILE" ]; then
    echo ""
    echo "  First 10 errors:"
    head -10 "$ERR_FILE" | while read -r line; do
        echo "    $line"
    done
fi

echo "  Full log: $LOG_FILE"
echo "  Error list: $ERR_FILE"
