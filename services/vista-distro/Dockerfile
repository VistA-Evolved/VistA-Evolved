# =============================================================================
# VistA Distro Lane -- Reproducible Production VistA Container
# =============================================================================
# Phase 148: Alternative to WorldVistA demo Docker image.
#
# This Dockerfile builds a VistA instance from versioned sources using
# YottaDB as the MUMPS engine. It does NOT bake in any credentials --
# all authentication is injected at runtime via environment variables.
#
# Build:
#   docker build -t vista-evolved/vista-distro:latest .
#   OR with version pinning:
#   docker build \
#     --build-arg YOTTADB_IMAGE=yottadb/yottadb-debian:r2.02 \
#     --build-arg VISTA_ROUTINE_REF=master \
#     --build-arg BUILD_SHA=$(git rev-parse --short HEAD) \
#     -t vista-evolved/vista-distro:$(date +%Y%m%d) .
#
# Run:
#   docker run -d \
#     -p 9430:9430 \
#     -e VISTA_BROKER_PORT=9430 \
#     -e VISTA_ADMIN_ACCESS=<your-access-code> \
#     -e VISTA_ADMIN_VERIFY=<your-verify-code> \
#     --name vista-distro \
#     vista-evolved/vista-distro:latest
#
# SECURITY:
#   - No default credentials baked in
#   - RPC Broker listens only on 0.0.0.0:9430 (configurable)
#   - SSH disabled by default
#   - Non-root runtime user
# =============================================================================

# ---------- Build args (overridable) ----------
ARG YOTTADB_IMAGE=yottadb/yottadb-debian:r2.02

# =============================================================================
# Stage 1: Builder -- install VistA routines + globals
# =============================================================================
FROM ${YOTTADB_IMAGE} AS builder

ARG VISTA_ROUTINE_SOURCE=https://github.com/WorldVistA/VistA-M.git
ARG VISTA_ROUTINE_REF=master
ARG BUILD_SHA=dev
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="VistA-Evolved Distro Lane" \
      org.opencontainers.image.description="Reproducible VistA build from versioned sources" \
      org.opencontainers.image.source="https://github.com/VistA-Evolved/VistA-Evolved" \
      org.opencontainers.image.revision="${BUILD_SHA}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.vendor="VistA-Evolved"

# Install build dependencies
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Clone VistA routine source at pinned ref
WORKDIR /opt/vista-build
RUN git clone --depth 1 --branch ${VISTA_ROUTINE_REF} \
    ${VISTA_ROUTINE_SOURCE} /opt/vista-build/VistA-M

# Prepare routine and global directories
RUN mkdir -p /opt/vista/r /opt/vista/g /opt/vista/o

# Copy MUMPS routines (.m files) into the routine directory
# VistA-M repo structure: Packages/<package>/Routines/*.m
RUN find /opt/vista-build/VistA-M/Packages -name "*.m" -exec cp {} /opt/vista/r/ \;

# Copy our custom VistA-Evolved routines (ZVE* namespace)
COPY routines/*.m /opt/vista/r/

# Copy the entrypoint and health scripts
COPY entrypoint.sh /opt/vista/entrypoint.sh
COPY health-check.sh /opt/vista/health-check.sh
RUN chmod +x /opt/vista/entrypoint.sh /opt/vista/health-check.sh

# Write build metadata
RUN echo "BUILD_SHA=${BUILD_SHA}" > /opt/vista/build-info.txt && \
    echo "BUILD_DATE=${BUILD_DATE}" >> /opt/vista/build-info.txt && \
    echo "VISTA_ROUTINE_REF=${VISTA_ROUTINE_REF}" >> /opt/vista/build-info.txt

# =============================================================================
# Stage 2: Runtime -- minimal VistA server
# =============================================================================
FROM ${YOTTADB_IMAGE} AS runtime

USER root

# Runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    xinetd \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Create non-root VistA user
RUN groupadd -r vista && useradd -r -g vista -d /opt/vista -s /bin/bash vista

# Copy built artifacts from builder stage
COPY --from=builder /opt/vista /opt/vista

# Set ownership
RUN chown -R vista:vista /opt/vista

# ---------- Environment (all overridable at runtime) ----------
# SECURITY: No default credentials. Container fails fast if not provided.
ENV VISTA_BROKER_PORT=9430 \
    VISTA_HOME=/opt/vista \
    VISTA_ROUTINES=/opt/vista/r \
    VISTA_GLOBALS=/opt/vista/g \
    # Credentials injected at runtime -- never baked in
    VISTA_ADMIN_ACCESS="" \
    VISTA_ADMIN_VERIFY="" \
    # Network: broker listens on all interfaces (Docker networking)
    VISTA_BROKER_BIND=0.0.0.0

# Expose only the RPC Broker port
EXPOSE ${VISTA_BROKER_PORT}

# Health check: TCP probe on broker port
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD /opt/vista/health-check.sh || exit 1

# Run as non-root
USER vista
WORKDIR /opt/vista

ENTRYPOINT ["/opt/vista/entrypoint.sh"]
