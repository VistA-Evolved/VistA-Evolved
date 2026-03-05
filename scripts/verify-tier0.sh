#!/usr/bin/env bash
# scripts/verify-tier0.sh
# Tier-0 Outpatient Proof Run (bash)
#
# Runs the T0 journey (login -> patient list -> vitals -> allergies -> problems -> logout)
# against the live API and writes a timestamped artifact under artifacts/.
# Exit 0 = all steps passed. Exit 1 = any failure.
#
# Usage:
#   ./scripts/verify-tier0.sh                             # defaults
#   ./scripts/verify-tier0.sh --base-url http://host:3001 # custom API
#   ./scripts/verify-tier0.sh --skip-docker               # skip Docker check

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="http://127.0.0.1:3001"
SKIP_DOCKER=false
ACCESS_CODE=""
VERIFY_CODE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)  BASE_URL="$2"; shift 2 ;;
    --skip-docker) SKIP_DOCKER=true; shift ;;
    --access-code) ACCESS_CODE="$2"; shift 2 ;;
    --verify-code) VERIFY_CODE="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# -- Lane detection (Phase 575) -------------------------------------------
DETECTED_LANE=""
SWAP_JSON=$(curl -s --max-time 5 "$BASE_URL/vista/swap-boundary" 2>/dev/null || echo "")
if [ -n "$SWAP_JSON" ]; then
  # Extract instanceId from JSON (portable: no jq dependency)
  DETECTED_LANE=$(echo "$SWAP_JSON" | grep -oP '"instanceId"\s*:\s*"[^"]*"' | head -1 | grep -oP ':\s*"\K[^"]+' || true)
fi

# Resolve credentials: arg > env > .env.local > lane-based default
if [ -z "$ACCESS_CODE" ] && [ -n "${VISTA_ACCESS_CODE:-}" ]; then ACCESS_CODE="$VISTA_ACCESS_CODE"; fi
if [ -z "$VERIFY_CODE" ] && [ -n "${VISTA_VERIFY_CODE:-}" ]; then VERIFY_CODE="$VISTA_VERIFY_CODE"; fi
if [ -z "$ACCESS_CODE" ] || [ -z "$VERIFY_CODE" ]; then
  ENV_FILE="$ROOT/apps/api/.env.local"
  if [ -f "$ENV_FILE" ]; then
    if [ -z "$ACCESS_CODE" ]; then
      ACCESS_CODE=$(grep -E '^VISTA_ACCESS_CODE=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)
    fi
    if [ -z "$VERIFY_CODE" ]; then
      VERIFY_CODE=$(grep -E '^VISTA_VERIFY_CODE=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)
    fi
  fi
fi
# Lane-based defaults (Phase 575)
if [ -z "$ACCESS_CODE" ] || [ -z "$VERIFY_CODE" ]; then
  case "$DETECTED_LANE" in
    vehu)
      [ -z "$ACCESS_CODE" ] && ACCESS_CODE="PRO1234"
      [ -z "$VERIFY_CODE" ] && VERIFY_CODE="PRO1234!!"
      ;;
    worldvista-ehr|""|worldvista-docker-sandbox)
      [ -z "$ACCESS_CODE" ] && ACCESS_CODE="PROV123"
      [ -z "$VERIFY_CODE" ] && VERIFY_CODE="PROV123!!"
      ;;
    *)
      echo "[ERROR] Unknown VistA lane '$DETECTED_LANE' and no credentials provided."
      echo "  Supply --access-code / --verify-code, or set VISTA_ACCESS_CODE / VISTA_VERIFY_CODE."
      exit 1
      ;;
  esac
fi

# Timestamps and artifact paths
TS="$(date +%Y%m%d-%H%M%S)"
ARTIFACTS_DIR="$ROOT/artifacts"
mkdir -p "$ARTIFACTS_DIR"
ARTIFACT_NAME="tier0-proof-$TS"
OUTPUT_FILE="$ARTIFACTS_DIR/$ARTIFACT_NAME.txt"

EXIT_CODE=0

# Tee helper: write to console and capture to file
exec > >(tee "$OUTPUT_FILE") 2>&1

echo "============================================"
echo "  Tier-0 Outpatient Proof Run"
echo "  $TS"
echo "  API: $BASE_URL"
echo "============================================"
echo ""

# -- Gate 1: Docker check (optional) -------------------------------------
if [ "$SKIP_DOCKER" = false ]; then
  echo "--- Gate 1: Docker VistA container ---"
  if [ -n "$DETECTED_LANE" ]; then
    echo "  Detected lane: $DETECTED_LANE (via /vista/swap-boundary)"
  fi
  if command -v docker &>/dev/null; then
    DOCKER_OUT_WV=$(docker ps --filter "name=wv" --format "{{.Names}}: {{.Status}}" 2>/dev/null || true)
    DOCKER_OUT_VEHU=$(docker ps --filter "name=vehu" --format "{{.Names}}: {{.Status}}" 2>/dev/null || true)
    if echo "$DOCKER_OUT_WV" | grep -q "wv" || echo "$DOCKER_OUT_VEHU" | grep -q "vehu"; then
      echo "  [PASS] VistA container running"
      [ -n "$DOCKER_OUT_VEHU" ] && echo "$DOCKER_OUT_VEHU" | grep -q "vehu" && echo "  $DOCKER_OUT_VEHU"
      [ -n "$DOCKER_OUT_WV" ] && echo "$DOCKER_OUT_WV" | grep -q "wv" && echo "  $DOCKER_OUT_WV"
    else
      echo "  [WARN] VistA container not found (checked both 'wv' and 'vehu')"
    fi
  else
    echo "  [WARN] Docker not available"
  fi
  echo ""
else
  echo "--- Gate 1: Docker check SKIPPED ---"
  echo ""
fi

# -- Gate 2: API reachability ---------------------------------------------
echo "--- Gate 2: API reachability ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "  [PASS] API responded 200 at /health"
else
  echo "  [FAIL] API not reachable at $BASE_URL (HTTP $HTTP_CODE)"
  echo ""
  echo "  To start the API:"
  echo "    cd apps/api"
  echo "    npx tsx --env-file=.env.local src/index.ts"
  exit 1
fi
echo ""

# -- Gate 3: Run T0 journey via clinic-day-runner ------------------------
echo "--- Gate 3: Tier-0 Outpatient Journey (T0) ---"
RUNNER="$ROOT/scripts/qa/clinic-day-runner.mjs"
if [ ! -f "$RUNNER" ]; then
  echo "  [FAIL] Runner not found at scripts/qa/clinic-day-runner.mjs"
  EXIT_CODE=1
else
  set +e
  node "$RUNNER" --base-url "$BASE_URL" --journey T0 --artifact-name "$ARTIFACT_NAME" --access-code "$ACCESS_CODE" --verify-code "$VERIFY_CODE"
  RUNNER_EXIT=$?
  set -e

  echo ""
  if [ "$RUNNER_EXIT" -eq 0 ]; then
    echo "  [PASS] T0 journey completed -- all steps green"
  else
    echo "  [FAIL] T0 journey had failures (exit code $RUNNER_EXIT)"
    EXIT_CODE=1
  fi
fi
echo ""

# -- Gate 4: Artifact integrity -------------------------------------------
echo "--- Gate 4: Artifact integrity ---"
JSON_ARTIFACT="$ARTIFACTS_DIR/$ARTIFACT_NAME.json"
if [ -f "$JSON_ARTIFACT" ]; then
  if command -v python3 &>/dev/null; then
    python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(f'  Journeys: {d[\"summary\"][\"passed\"]}/{d[\"summary\"][\"totalJourneys\"]} passed'); print(f'  Steps:    {d[\"summary\"][\"passedSteps\"]}/{d[\"summary\"][\"totalSteps\"]} passed')" "$JSON_ARTIFACT" 2>/dev/null && echo "  [PASS] Artifact written and parseable" || {
      echo "  [FAIL] Artifact JSON is invalid"
      EXIT_CODE=1
    }
  elif command -v node &>/dev/null; then
    node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); console.log('  Journeys: '+d.summary.passed+'/'+d.summary.totalJourneys+' passed'); console.log('  Steps:    '+d.summary.passedSteps+'/'+d.summary.totalSteps+' passed')" "$JSON_ARTIFACT" 2>/dev/null && echo "  [PASS] Artifact written and parseable" || {
      echo "  [FAIL] Artifact JSON is invalid"
      EXIT_CODE=1
    }
  else
    echo "  [PASS] Artifact file exists (no JSON validator available)"
  fi
else
  echo "  [FAIL] Artifact JSON not found at $JSON_ARTIFACT"
  EXIT_CODE=1
fi
echo ""

# -- Summary --------------------------------------------------------------
echo "============================================"
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "  TIER-0 PROOF: PASS"
  echo "  All outpatient-safe RPCs verified end-to-end."
else
  echo "  TIER-0 PROOF: FAIL"
  echo "  One or more gates did not pass. See output above."
fi
echo "============================================"
echo ""
echo "Artifact: artifacts/$ARTIFACT_NAME.json"
echo "Output:   artifacts/$ARTIFACT_NAME.txt"
echo ""

exit $EXIT_CODE
