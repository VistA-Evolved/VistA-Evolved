#!/usr/bin/env bash
# =============================================================================
# VistA-Evolved -- Development Logs Script
# =============================================================================
# Usage: ./scripts/dev-logs.sh           # all services
#        ./scripts/dev-logs.sh api       # specific service
#        ./scripts/dev-logs.sh api web   # multiple services
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

docker compose logs -f "$@"
