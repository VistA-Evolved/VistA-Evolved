#!/usr/bin/env bash
# =============================================================================
# VistA-Evolved -- Development Start Script (LEGACY HELPER)
# =============================================================================
# LEGACY: This script predates the canonical dev-up entrypoints.
#   Canonical entrypoint: ./scripts/dev-up.sh --profile <compose|vehu>
#   See README.md "Quick Start" for the official workflow.
#
# This script only handles the root docker-compose.yml (compose profile).
# It does NOT support the VEHU profile.
#
# Original usage: ./scripts/dev-start.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo "=== VistA-Evolved Dev Environment ==="

# 1. Check Docker is running
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running. Please start Docker Desktop and try again."
  exit 1
fi
echo "[OK] Docker is running"

# 2. Copy .env.example to .env if .env doesn't exist
if [ ! -f .env ]; then
  echo "[SETUP] Creating .env from .env.example..."
  cp .env.example .env
  echo "[WARN] .env created with placeholder values — edit it before starting services."
  echo "       At minimum, set POSTGRES_PASSWORD and VISTA credentials."
  echo ""
  echo "  nano .env   # or your preferred editor"
  echo ""
  exit 0
fi
echo "[OK] .env exists"

# 3. Validate required variables
if grep -q "your_postgres_password_here" .env 2>/dev/null; then
  echo "ERROR: POSTGRES_PASSWORD is still the placeholder value."
  echo "       Edit .env and set a real password before starting."
  exit 1
fi

# 4. Start all services
echo ""
echo "Starting all services..."
docker compose up --build "$@"
