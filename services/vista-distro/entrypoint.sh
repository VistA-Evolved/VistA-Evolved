#!/usr/bin/env bash
# =============================================================================
# VistA Distro Lane -- Runtime Entrypoint
# =============================================================================
# Phase 148: Starts YottaDB + VistA RPC Broker listener.
#
# SECURITY:
#   - Fails fast if VISTA_ADMIN_ACCESS / VISTA_ADMIN_VERIFY not set
#   - No default credentials
#   - Logs startup metadata (never credentials)
# =============================================================================

set -euo pipefail

# ---------- Validate required environment ----------

if [ -z "${VISTA_ADMIN_ACCESS:-}" ] || [ -z "${VISTA_ADMIN_VERIFY:-}" ]; then
  echo "FATAL: VISTA_ADMIN_ACCESS and VISTA_ADMIN_VERIFY must be set."
  echo "       These are the initial admin credentials for the VistA instance."
  echo "       Pass them via -e flags or Docker secrets."
  echo ""
  echo "       docker run -e VISTA_ADMIN_ACCESS=... -e VISTA_ADMIN_VERIFY=... ..."
  exit 1
fi

BROKER_PORT="${VISTA_BROKER_PORT:-9430}"
BROKER_BIND="${VISTA_BROKER_BIND:-0.0.0.0}"

echo "============================================================"
echo "  VistA Distro Lane -- Starting"
echo "============================================================"
echo "  Broker port:    ${BROKER_PORT}"
echo "  Broker bind:    ${BROKER_BIND}"
echo "  VistA home:     ${VISTA_HOME:-/opt/vista}"
echo "  Build info:     $(cat /opt/vista/build-info.txt 2>/dev/null || echo 'N/A')"
echo "  Credentials:    [REDACTED -- provided via env]"
echo "============================================================"

# ---------- Initialize YottaDB environment ----------

# Source YottaDB env if available (sets ydb_dist, ydb_gbldir, ydb_routines, etc.)
if [ -f /opt/yottadb/current/ydb_env_set ]; then
  # shellcheck disable=SC1091
  source /opt/yottadb/current/ydb_env_set
fi

# Extend ydb_routines to include our VistA routine directory
export ydb_routines="${VISTA_ROUTINES:-/opt/vista/r} ${ydb_routines:-}"

# Run mupip rundown to clear stale shared memory (required after container restart)
# See AGENTS.md gotcha #53
mupip rundown -reg "*" 2>/dev/null || true

# ---------- Provision initial admin user (if DB is fresh) ----------
# ---------- Admin user provisioning (scaffold) ----------
# NOTE: Actual VistA user creation requires running a MUMPS routine that
# manipulates ^VA(200) and related globals. This is NOT yet implemented.
# The VistA-M data image must already contain a usable admin account.
# Future: implement ZVEDIST.m to idempotently create the admin user from
# VISTA_ADMIN_ACCESS / VISTA_ADMIN_VERIFY env vars.
#
# For now, the env vars serve as a "contract" -- the container will not
# start without them, ensuring operators consciously configure credentials
# even though provisioning is deferred.

echo "NOTICE: Admin user provisioning is a scaffold. VistA-M data must contain a usable account."
echo "  Configured access code present: yes (length=${#VISTA_ADMIN_ACCESS})"

# ---------- Start RPC Broker listener ----------
# The XWB Broker listener is the standard VistA RPC Broker that CPRS and
# our API connect to. In production VistA, this is typically managed by
# xinetd or TaskMan.

echo "Starting RPC Broker listener on ${BROKER_BIND}:${BROKER_PORT}..."

# Write xinetd configuration for the RPC Broker
mkdir -p /tmp/xinetd.d
cat > /tmp/xinetd.d/vista-broker <<EOF
service vista-broker
{
    type         = UNLISTED
    socket_type  = stream
    protocol     = tcp
    wait         = no
    # NOTE: xinetd runs as 'vista' user (Dockerfile USER directive), so
    # the 'user' directive below is informational only (xinetd cannot
    # switch users without root). Child processes inherit 'vista'.
    user         = vista
    bind         = ${BROKER_BIND}
    port         = ${BROKER_PORT}
    # ydb is the standard YottaDB binary/symlink in r2.x images
    server       = /opt/yottadb/current/ydb
    server_args  = -run XWBTCPL
    instances    = 128
    per_source   = 32
    log_on_failure += USERID HOST
}
EOF

# Start xinetd in foreground (PID 1 pattern for Docker)
echo "RPC Broker ready on port ${BROKER_PORT}"
exec xinetd -f /tmp/xinetd.d/vista-broker -dontfork -stayalive
