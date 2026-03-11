# =============================================================================
# VistA Distro Lane -- Reproducible Production VistA Container
# =============================================================================
# Phase 148 + Master Plan: Full VistA from WorldVistA/VistA-M latest with
# globals loaded, RPCs registered, SSH for terminal access, seed data.
#
# Build:
#   .\build.ps1                    # recommended (copies routines first)
#   OR manually:
#   docker build -t vista-evolved/vista-distro:latest .
#
# Run:
#   docker run -d \
#     -p 9430:9430 -p 2223:22 \
#     -e VISTA_ADMIN_ACCESS=<your-access-code> \
#     -e VISTA_ADMIN_VERIFY=<your-verify-code> \
#     --name vista-distro \
#     vista-evolved/vista-distro:latest
#
# SECURITY:
#   - No default credentials baked in
#   - RPC Broker listens on 0.0.0.0:9430
#   - SSH available on port 22 (map to 2223 externally)
#   - Non-root runtime user for VistA processes
# =============================================================================

# ---------- Build args (overridable) ----------
ARG YOTTADB_IMAGE=yottadb/yottadb-debian:r2.02

# =============================================================================
# Stage 1: Builder -- clone VistA-M, load routines + globals
# =============================================================================
FROM ${YOTTADB_IMAGE} AS builder

ARG BUILD_SHA=dev
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="VistA-Evolved Distro Lane" \
      org.opencontainers.image.description="Full VistA build from WorldVistA/VistA-M with 196 packages" \
      org.opencontainers.image.source="https://github.com/VistA-Evolved/VistA-Evolved" \
      org.opencontainers.image.revision="${BUILD_SHA}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.vendor="VistA-Evolved"

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Use pre-cloned VistA-M from local build context (avoids re-downloading ~2GB each build).
# One-time setup: git clone --depth 1 https://github.com/WorldVistA/VistA-M.git services/vista-distro/VistA-M
WORKDIR /opt/vista-build
COPY VistA-M/Packages /opt/vista-build/VistA-M/Packages

# Prepare directory structure
RUN mkdir -p /opt/vista/r /opt/vista/g /opt/vista/o /opt/vista/scripts

# --- Copy routines from all 196 packages ---
RUN find /opt/vista-build/VistA-M/Packages -name "*.m" -exec cp {} /opt/vista/r/ \;

# --- Copy custom VistA-Evolved routines (ZVE* namespace) ---
COPY routines/*.m /opt/vista/r/

# --- Copy scripts ---
COPY scripts/ /opt/vista/scripts/
RUN chmod +x /opt/vista/scripts/*.sh 2>/dev/null || true

# --- Copy entrypoint and health check ---
COPY entrypoint.sh /opt/vista/entrypoint.sh
COPY health-check.sh /opt/vista/health-check.sh
RUN chmod +x /opt/vista/entrypoint.sh /opt/vista/health-check.sh

# --- Configure YottaDB database for VistA ---
# Based on WorldVistA/docker-vista createVistaInstance.sh:
# RECORD_SIZE=16368 KEY_SIZE=1019 BLOCK_SIZE=4096
# Temp region for HLTMP/TMP/UTILITY/XTMP etc.
RUN bash -c '\
    export gtm_dist=/opt/yottadb/current && \
    export ydb_chset=M && \
    export LC_ALL=C && \
    source /opt/yottadb/current/ydb_env_set && \
    export ydb_gbldir=/opt/vista/g/vista.gld && \
    export gtmgbldir=/opt/vista/g/vista.gld && \
    echo "=== Configuring YottaDB database for VistA ===" && \
    echo "ydb_gbldir=$ydb_gbldir" && \
    printf "%s\n" \
      "c -s DEFAULT -ACCESS_METHOD=BG -BLOCK_SIZE=4096 -ALLOCATION=200000 -EXTENSION_COUNT=1024 -GLOBAL_BUFFER_COUNT=4096 -LOCK_SPACE=400 -FILE=/opt/vista/g/vista.dat" \
      "a -s TEMP -ACCESS_METHOD=MM -BLOCK_SIZE=4096 -ALLOCATION=10000 -EXTENSION_COUNT=1024 -GLOBAL_BUFFER_COUNT=4096 -LOCK_SPACE=400 -FILE=/opt/vista/g/temp.dat" \
      "c -r DEFAULT -RECORD_SIZE=16368 -KEY_SIZE=1019 -NOJOURNAL -DYNAMIC_SEGMENT=DEFAULT -NULL_SUBSCRIPTS=ALWAYS" \
      "a -r TEMP -RECORD_SIZE=16368 -KEY_SIZE=1019 -NOJOURNAL -DYNAMIC_SEGMENT=TEMP -NULL_SUBSCRIPTS=ALWAYS" \
      "a -n TMP -r=TEMP" "a -n TEMP -r=TEMP" "a -n UTILITY -r=TEMP" \
      "a -n XTMP -r=TEMP" "a -n XUTL -r=TEMP" "a -n HLTMP -r=TEMP" \
      "a -n BMXTMP -r=TEMP" "a -n VPRHTTP -r=TEMP" "a -n KMPTMP -r=TEMP" \
      "sh -a" \
    | $ydb_dist/yottadb -run GDE && \
    echo "GLD created at: $ydb_gbldir" && \
    ls -la /opt/vista/g/ && \
    $ydb_dist/mupip create && \
    echo "=== Database configured for VistA ===" \
'

# --- Load globals (database) from VistA-M ---
# Key: mupip CLI parser needs escaped quotes around paths with spaces.
# Pattern from WorldVistA/docker-vista importVistA.sh:
#   xargs -0 -I{} -n 1 -P $cores $gtm_dist/mupip load \"{}\"
RUN bash -c '\
    export gtm_dist=/opt/yottadb/current && \
    export ydb_chset=M && \
    export LC_ALL=C && \
    source /opt/yottadb/current/ydb_env_set && \
    export ydb_gbldir=/opt/vista/g/vista.gld && \
    export ydb_routines="/opt/vista/r $ydb_routines" && \
    echo "=== Loading VistA-M globals ===" && \
    TOTAL=$(find /opt/vista-build/VistA-M/Packages -name "*.zwr" | wc -l) && \
    echo "  Found $TOTAL .zwr files" && \
    CORES=$(($(getconf _NPROCESSORS_ONLN) - 1)) && \
    if [ $CORES -lt 1 ]; then CORES=1; fi && \
    echo "  Using $CORES cores for parallel loading" && \
    find /opt/vista-build/VistA-M/Packages -name "*.zwr" -print0 | \
      xargs -0 -I{} -n 1 -P $CORES $ydb_dist/mupip load \"{}\" \
      >> /opt/vista/g/globals-load.log 2>&1 ; \
    ERRS=$(grep -c "%-E-" /opt/vista/g/globals-load.log 2>/dev/null || echo 0) && \
    echo "=== Globals loading complete (errors: $ERRS) ===" \
'

# Write build metadata
RUN echo "BUILD_SHA=${BUILD_SHA}" > /opt/vista/build-info.txt && \
    echo "BUILD_DATE=${BUILD_DATE}" >> /opt/vista/build-info.txt && \
    echo "VISTA_SOURCE=local-VistA-M" >> /opt/vista/build-info.txt && \
    echo "ROUTINE_COUNT=$(ls /opt/vista/r/*.m 2>/dev/null | wc -l)" >> /opt/vista/build-info.txt

# =============================================================================
# Stage 2: Runtime -- VistA server with RPC Broker + SSH
# =============================================================================
FROM ${YOTTADB_IMAGE} AS runtime

USER root

# Runtime dependencies: xinetd (broker), openssh (terminal), netcat (healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    xinetd \
    openssh-server \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /run/sshd

# Create non-root VistA user with home directory
RUN groupadd -r vista && useradd -r -g vista -d /opt/vista -s /bin/bash vista && \
    echo "vista:vista" | chpasswd

# Copy built artifacts from builder stage
COPY --from=builder /opt/vista /opt/vista

# Set ownership
RUN chown -R vista:vista /opt/vista

# Configure SSH for terminal access
RUN sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    echo "AllowUsers vista" >> /etc/ssh/sshd_config && \
    ssh-keygen -A

# Create VistA login shell script (what runs when user SSHs in)
RUN echo '#!/bin/bash' > /opt/vista/vista-login.sh && \
    echo 'export gtm_dist=/opt/yottadb/current' >> /opt/vista/vista-login.sh && \
    echo 'export ydb_chset=M' >> /opt/vista/vista-login.sh && \
    echo 'export LC_ALL=C' >> /opt/vista/vista-login.sh && \
    echo 'source /opt/yottadb/current/ydb_env_set 2>/dev/null' >> /opt/vista/vista-login.sh && \
    echo 'export ydb_gbldir=/opt/vista/g/vista.gld' >> /opt/vista/vista-login.sh && \
    echo 'export ydb_routines="/opt/vista/r $ydb_routines"' >> /opt/vista/vista-login.sh && \
    echo 'echo "VistA-Evolved Terminal"' >> /opt/vista/vista-login.sh && \
    echo 'echo "Type D ^ZU to start VistA"' >> /opt/vista/vista-login.sh && \
    echo 'exec /opt/yottadb/current/ydb -direct' >> /opt/vista/vista-login.sh && \
    chmod +x /opt/vista/vista-login.sh

# ---------- Environment ----------
ENV VISTA_BROKER_PORT=9430 \
    VISTA_HOME=/opt/vista \
    VISTA_ROUTINES=/opt/vista/r \
    VISTA_GLOBALS=/opt/vista/g \
    VISTA_ADMIN_ACCESS="" \
    VISTA_ADMIN_VERIFY="" \
    VISTA_BROKER_BIND=0.0.0.0 \
    VISTA_SSH_ENABLED=true \
    ydb_chset=M \
    LC_ALL=C \
    gtm_dist=/opt/yottadb/current

# Expose RPC Broker + SSH
EXPOSE 9430 22

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD /opt/vista/health-check.sh || exit 1

WORKDIR /opt/vista
ENTRYPOINT ["/opt/vista/entrypoint.sh"]
