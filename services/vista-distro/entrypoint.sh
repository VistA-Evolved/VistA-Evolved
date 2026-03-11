#!/usr/bin/env bash
# =============================================================================
# VistA Distro Lane -- Runtime Entrypoint
# =============================================================================
# Starts YottaDB + VistA RPC Broker + SSH terminal access.
# On first boot, runs initialization (RPC registration, seed data).
#
# SECURITY:
#   - Fails fast if VISTA_ADMIN_ACCESS / VISTA_ADMIN_VERIFY not set
#   - No default credentials
#   - Logs startup metadata (never credentials)
# =============================================================================

set -eo pipefail

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
SSH_ENABLED="${VISTA_SSH_ENABLED:-true}"

echo "============================================================"
echo "  VistA-Evolved Distro Lane -- Starting"
echo "============================================================"
echo "  Broker port:    ${BROKER_PORT}"
echo "  Broker bind:    ${BROKER_BIND}"
echo "  SSH enabled:    ${SSH_ENABLED}"
echo "  VistA home:     ${VISTA_HOME:-/opt/vista}"
echo "  Build info:     $(cat /opt/vista/build-info.txt 2>/dev/null || echo 'N/A')"
echo "  Credentials:    [REDACTED -- provided via env]"
echo "============================================================"

# ---------- Initialize YottaDB environment ----------

export gtm_dist=/opt/yottadb/current
export ydb_chset=M
export LC_ALL=C
if [ -f /opt/yottadb/current/ydb_env_set ]; then
  source /opt/yottadb/current/ydb_env_set
fi

export ydb_gbldir=/opt/vista/g/vista.gld
export ydb_routines="${VISTA_ROUTINES:-/opt/vista/r} ${ydb_routines:-}"

# Clear stale shared memory (required after container restart, see AGENTS.md #53)
mupip rundown -reg "*" 2>/dev/null || true

# ---------- First-boot initialization ----------

SENTINEL="/opt/vista/g/.vista-initialized"
if [ ! -f "$SENTINEL" ]; then
  echo ""
  echo "=== First Boot Detected -- Running Initialization ==="

  # Run admin user provisioning
  if [ -f "/opt/vista/r/ZVEDIST.m" ]; then
    echo "--- Provisioning admin user ---"
    echo "D PROV^ZVEDIST(\"${VISTA_ADMIN_ACCESS}\",\"${VISTA_ADMIN_VERIFY}\")" | \
      /opt/yottadb/current/ydb -direct 2>&1 || {
      echo "WARN: Admin provisioning may have failed"
    }
  fi

  # Run system initialization
  if [ -f "/opt/vista/r/ZVEINIT.m" ]; then
    echo "--- Running system initialization ---"
    echo 'D EN^ZVEINIT' | /opt/yottadb/current/ydb -direct 2>&1 || {
      echo "WARN: System init may have failed (non-fatal for dev)"
    }
  fi

  # Run comprehensive seed data
  if [ -f "/opt/vista/r/ZVESEED.m" ]; then
    echo "--- Seeding reference data ---"
    echo 'D EN^ZVESEED' | /opt/yottadb/current/ydb -direct 2>&1 || {
      echo "WARN: Seed data may have failed (non-fatal for dev)"
    }
  fi

  # Create sentinel
  cat > "$SENTINEL" <<EOF
initialized_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
build_sha=$(grep BUILD_SHA /opt/vista/build-info.txt 2>/dev/null | cut -d= -f2 || echo 'unknown')
hostname=$(hostname)
EOF
  echo "=== Initialization Complete ==="
  echo ""
fi

# ---------- Start SSH daemon (for terminal access) ----------

if [ "$SSH_ENABLED" = "true" ]; then
  echo "Starting SSH daemon for terminal access..."
  /usr/sbin/sshd 2>/dev/null || {
    echo "WARN: SSH daemon failed to start (terminal mode unavailable)"
  }
fi

# ---------- Start RPC Broker listener ----------

echo "Starting RPC Broker listener on ${BROKER_BIND}:${BROKER_PORT}..."

mkdir -p /tmp/xinetd.d

cat > /opt/vista/broker-start.sh <<'BROKEOF'
#!/bin/bash
export gtm_dist=/opt/yottadb/current
export ydb_chset=M
export LC_ALL=C
source /opt/yottadb/current/ydb_env_set 2>/dev/null
export ydb_gbldir=/opt/vista/g/vista.gld
export ydb_routines="/opt/vista/r $ydb_routines"
exec /opt/yottadb/current/ydb -run XWBTCPL
BROKEOF
chmod +x /opt/vista/broker-start.sh

cat > /tmp/xinetd.d/vista-broker <<EOF
service vista-broker
{
    type         = UNLISTED
    socket_type  = stream
    protocol     = tcp
    wait         = no
    user         = vista
    bind         = ${BROKER_BIND}
    port         = ${BROKER_PORT}
    server       = /opt/vista/broker-start.sh
    instances    = 128
    per_source   = 32
    log_on_failure += USERID HOST
}
EOF

echo "RPC Broker ready on port ${BROKER_PORT}"
exec xinetd -f /tmp/xinetd.d/vista-broker -dontfork -stayalive
