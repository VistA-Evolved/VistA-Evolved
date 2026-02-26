#!/usr/bin/env bash
# =============================================================================
# VistA Distro Lane -- Health Check
# =============================================================================
# Phase 148: Used by Docker HEALTHCHECK to verify the RPC Broker is listening.
# Returns 0 (healthy) if TCP connection succeeds, 1 otherwise.
# =============================================================================

set -euo pipefail

BROKER_PORT="${VISTA_BROKER_PORT:-9430}"

# TCP probe: attempt to connect to the broker port
# nc (netcat) with 3-second timeout
if nc -z -w 3 127.0.0.1 "${BROKER_PORT}" 2>/dev/null; then
  exit 0
else
  echo "UNHEALTHY: RPC Broker not responding on port ${BROKER_PORT}"
  exit 1
fi
