#!/usr/bin/env bash
# =============================================================================
# VistA-Evolved — Development Stop Script
# =============================================================================
# Usage: ./scripts/dev-stop.sh
#        ./scripts/dev-stop.sh -v   # also remove volumes
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo "=== Stopping VistA-Evolved Dev Environment ==="
docker compose down "$@"
echo "[OK] All services stopped."
