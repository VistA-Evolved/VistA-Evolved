#!/usr/bin/env bash
# =============================================================================
# VistA-Evolved -- Single canonical dev environment entrypoint (bash/macOS/Linux)
# =============================================================================
#
# Two profiles are supported:
#   compose -- All-in-one root docker-compose.yml (worldvista-ehr, broker 9210)
#   vehu    -- VEHU fidelity profile (worldvista/vehu, broker 9431) + local API/Web
#
# Evidence docs (VISTA_CONNECTIVITY_RESULTS.md) are generated under the VEHU profile.
#
# Usage:
#   ./scripts/dev-up.sh --profile vehu
#   ./scripts/dev-up.sh --profile compose
#   ./scripts/dev-up.sh --profile vehu --skip-verify
#   ./scripts/dev-up.sh --profile vehu --skip-gauntlet
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# ---------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------

PROFILE="vehu"
SKIP_VERIFY=false
SKIP_GAUNTLET=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      PROFILE="$2"
      shift 2
      ;;
    --skip-verify)
      SKIP_VERIFY=true
      shift
      ;;
    --skip-gauntlet)
      SKIP_GAUNTLET=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 --profile <compose|vehu> [--skip-verify] [--skip-gauntlet]"
      echo ""
      echo "Profiles:"
      echo "  compose  All-in-one docker-compose.yml (worldvista-ehr, broker 9210)"
      echo "  vehu     VEHU fidelity profile (worldvista/vehu, broker 9431)"
      echo ""
      echo "Options:"
      echo "  --skip-verify    Skip pnpm verify:vista and qa:gauntlet:fast"
      echo "  --skip-gauntlet  Skip qa:gauntlet:fast but still run verify:vista"
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $1"
      echo "Run with --help for usage."
      exit 1
      ;;
  esac
done

if [[ "$PROFILE" != "compose" && "$PROFILE" != "vehu" ]]; then
  echo "ERROR: --profile must be 'compose' or 'vehu' (got: $PROFILE)"
  exit 1
fi

# ---------------------------------------------------------------------
# Profile definitions
# ---------------------------------------------------------------------

if [[ "$PROFILE" == "compose" ]]; then
  LABEL="All-in-one compose (worldvista-ehr)"
  COMPOSE_FILE="docker-compose.yml"
  COMPOSE_ARGS=""
  PG_COMPOSE_FILE=""
  BROKER_HOST="127.0.0.1"
  BROKER_PORT=9210
  ACCESS_CODE="${VISTA_ACCESS_CODE:-PRO1234}"
  VERIFY_CODE="${VISTA_VERIFY_CODE:-PRO1234!!}"
  INSTANCE_ID="compose-dev"
  echo ""
  echo "================================================================"
  echo "  VistA-Evolved Dev-Up  --  Profile: compose"
  echo "  $LABEL"
  echo "================================================================"
  echo ""
  echo "  * VistA broker on port 9210, Web UI on 8001"
  echo "  * PostgreSQL on 5432, Redis on 6379"
  echo "  * API on 4000 (containerized), Web on 5173 (containerized)"
  echo "  * Credentials: set VISTA_ACCESS_CODE / VISTA_VERIFY_CODE in shell or .env"
  echo "  * Requires: .env at repo root (copy from .env.example)"
  echo ""
else
  LABEL="VEHU fidelity profile (worldvista/vehu)"
  COMPOSE_FILE="services/vista/docker-compose.yml"
  COMPOSE_ARGS="--profile vehu"
  PG_COMPOSE_FILE="services/platform-db/docker-compose.yml"
  BROKER_HOST="127.0.0.1"
  BROKER_PORT=9431
  ACCESS_CODE="PRO1234"
  VERIFY_CODE="PRO1234!!"
  INSTANCE_ID="vehu-dev"
  echo ""
  echo "================================================================"
  echo "  VistA-Evolved Dev-Up  --  Profile: vehu"
  echo "  $LABEL"
  echo "================================================================"
  echo ""
  echo "  * VistA VEHU broker on port 9431, SSH on 2223"
  echo "  * PostgreSQL on 5433"
  echo "  * API runs locally on 3001, Web runs locally on 3000"
  echo "  * Credentials: PRO1234 / PRO1234!!"
  echo "  * Requires: apps/api/.env.local (copy from apps/api/.env.example)"
  echo "  * Evidence docs generated under this profile"
  echo ""
fi

# ---------------------------------------------------------------------
# Step 0: Preflight checks
# ---------------------------------------------------------------------

echo "[0/6] Preflight checks..."

# Docker
if ! docker info >/dev/null 2>&1; then
  echo "  [FAIL] Docker is not running. Start Docker Desktop first."
  exit 1
fi
echo "  [OK] Docker is running"

# pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  echo "  [FAIL] pnpm not found. Install via: corepack enable"
  exit 1
fi
echo "  [OK] pnpm available"

# Env file check
if [[ "$PROFILE" == "compose" ]]; then
  if [[ ! -f "$ROOT_DIR/.env" ]]; then
    if [[ -f "$ROOT_DIR/.env.example" ]]; then
      echo "  [WARN] .env not found -- copying from .env.example"
      cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
      echo "  [ACTION] Edit .env and set POSTGRES_PASSWORD + VISTA credentials, then rerun."
      exit 1
    else
      echo "  [FAIL] Neither .env nor .env.example found at repo root."
      exit 1
    fi
  fi
  echo "  [OK] .env exists"
else
  if [[ ! -f "$ROOT_DIR/apps/api/.env.local" ]]; then
    echo "  [WARN] apps/api/.env.local not found."
    echo "         Creating from .env.example with VEHU defaults..."
    if [[ -f "$ROOT_DIR/apps/api/.env.example" ]]; then
      sed -e 's/VISTA_PORT=9430/VISTA_PORT=9431/' \
          -e 's/VISTA_ACCESS_CODE=/VISTA_ACCESS_CODE=PRO1234/' \
          -e 's/VISTA_VERIFY_CODE=/VISTA_VERIFY_CODE=PRO1234!!/' \
          "$ROOT_DIR/apps/api/.env.example" > "$ROOT_DIR/apps/api/.env.local"
      # Add PG URL if not already present
      if ! grep -q 'PLATFORM_PG_URL=' "$ROOT_DIR/apps/api/.env.local"; then
        echo "" >> "$ROOT_DIR/apps/api/.env.local"
        echo "PLATFORM_PG_URL=postgresql://ve_api:ve_dev_only_change_in_prod@127.0.0.1:5433/ve_platform" >> "$ROOT_DIR/apps/api/.env.local"
      fi
      echo "  [OK] apps/api/.env.local created with VEHU defaults. Review and rerun if needed."
    else
      echo "  [FAIL] apps/api/.env.example not found."
      exit 1
    fi
  fi
  echo "  [OK] apps/api/.env.local exists"
fi

# node_modules
if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  echo "  [INFO] node_modules missing -- running pnpm install..."
  pnpm install --frozen-lockfile >/dev/null 2>&1 || {
    echo "  [FAIL] pnpm install failed."
    exit 1
  }
  echo "  [OK] pnpm install complete"
else
  echo "  [OK] node_modules present"
fi

# ---------------------------------------------------------------------
# Step 1: Start Docker services
# ---------------------------------------------------------------------

echo ""
echo "[1/6] Starting Docker services for profile: $PROFILE ..."

if [[ "$PROFILE" == "compose" ]]; then
  echo "  docker compose -f docker-compose.yml up -d"
  docker compose -f "$COMPOSE_FILE" up -d 2>&1 | sed 's/^/  /'
  if [[ $? -ne 0 ]]; then
    echo "  [FAIL] docker compose up failed."
    exit 1
  fi
else
  # VEHU: start VistA + PostgreSQL from separate compose files
  echo "  docker compose -f $COMPOSE_FILE $COMPOSE_ARGS up -d"
  docker compose -f "$COMPOSE_FILE" $COMPOSE_ARGS up -d 2>&1 | sed 's/^/  /'
  if [[ $? -ne 0 ]]; then
    echo "  [FAIL] VistA docker compose up failed."
    exit 1
  fi

  echo "  docker compose -f $PG_COMPOSE_FILE up -d"
  docker compose -f "$PG_COMPOSE_FILE" up -d 2>&1 | sed 's/^/  /'
  if [[ $? -ne 0 ]]; then
    echo "  [FAIL] PostgreSQL docker compose up failed."
    exit 1
  fi
fi

echo "  [OK] Docker services started"

# ---------------------------------------------------------------------
# Step 2: Wait for VistA broker health
# ---------------------------------------------------------------------

echo ""
echo "[2/6] Waiting for VistA broker on port $BROKER_PORT ..."

MAX_WAIT=120
ELAPSED=0
HEALTHY=false

while [[ $ELAPSED -lt $MAX_WAIT ]]; do
  if bash -c "echo > /dev/tcp/$BROKER_HOST/$BROKER_PORT" 2>/dev/null; then
    HEALTHY=true
    break
  fi
  sleep 3
  ELAPSED=$((ELAPSED + 3))
  echo "  ... waiting ($ELAPSED s / $MAX_WAIT s)"
done

if [[ "$HEALTHY" != "true" ]]; then
  echo "  [FAIL] VistA broker not reachable on port $BROKER_PORT after $MAX_WAIT s."
  exit 1
fi

echo "  [OK] VistA broker is accepting connections (${ELAPSED}s)"

# ---------------------------------------------------------------------
# Step 3: Set environment variables for verify step
# ---------------------------------------------------------------------

echo ""
echo "[3/6] Setting environment for verification..."

export VISTA_HOST="$BROKER_HOST"
export VISTA_PORT="$BROKER_PORT"
export VISTA_ACCESS_CODE="$ACCESS_CODE"
export VISTA_VERIFY_CODE="$VERIFY_CODE"
export VISTA_CONTEXT="OR CPRS GUI CHART"
export VISTA_INSTANCE_ID="$INSTANCE_ID"

echo "  VISTA_HOST        = $VISTA_HOST"
echo "  VISTA_PORT        = $VISTA_PORT"
echo "  VISTA_INSTANCE_ID = $VISTA_INSTANCE_ID"
echo "  VISTA_ACCESS_CODE = (set)"
echo "  VISTA_VERIFY_CODE = (set)"
echo "  [OK] Environment configured"

# ---------------------------------------------------------------------
# Step 4: Run pnpm verify:vista
# ---------------------------------------------------------------------

EXIT_CODE=0

if [[ "$SKIP_VERIFY" != "true" ]]; then
  echo ""
  echo "[4/6] Running pnpm verify:vista ..."
  if pnpm verify:vista 2>&1 | sed 's/^/  /'; then
    echo "  [PASS] verify:vista succeeded"
  else
    echo "  [FAIL] verify:vista failed"
    EXIT_CODE=1
  fi
else
  echo ""
  echo "[4/6] Skipped (--skip-verify)"
fi

# ---------------------------------------------------------------------
# Step 5: Run pnpm qa:gauntlet:fast
# ---------------------------------------------------------------------

if [[ "$SKIP_VERIFY" != "true" && "$SKIP_GAUNTLET" != "true" ]]; then
  echo ""
  echo "[5/6] Running pnpm qa:gauntlet:fast ..."
  if pnpm qa:gauntlet:fast 2>&1 | sed 's/^/  /'; then
    echo "  [PASS] qa:gauntlet:fast succeeded"
  else
    echo "  [FAIL] qa:gauntlet:fast failed"
    EXIT_CODE=1
  fi
else
  echo ""
  echo "[5/6] Skipped"
fi

# ---------------------------------------------------------------------
# Step 6: Summary
# ---------------------------------------------------------------------

echo ""
echo "================================================================"
echo "  Profile: $PROFILE  --  $LABEL"
echo "================================================================"
echo ""
echo "  VistA Broker : $BROKER_HOST:$BROKER_PORT"

if [[ "$PROFILE" == "compose" ]]; then
  echo "  API          : http://127.0.0.1:4000  (containerized)"
  echo "  Web          : http://127.0.0.1:5173  (containerized)"
  echo "  PostgreSQL   : 127.0.0.1:5432"
  echo "  Redis        : 127.0.0.1:6379"
  echo "  VistA Web UI : http://127.0.0.1:8001"
else
  echo "  PostgreSQL   : 127.0.0.1:5433"
  echo "  API          : Start manually: cd apps/api && npx tsx --env-file=.env.local src/index.ts"
  echo "  Web          : Start manually: cd apps/web && pnpm dev"
fi

echo ""

if [[ $EXIT_CODE -ne 0 ]]; then
  echo "  RESULT: FAIL"
else
  echo "  RESULT: PASS"
fi

echo ""
exit $EXIT_CODE
