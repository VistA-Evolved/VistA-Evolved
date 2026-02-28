# Phase 287 — Real TLS in Dev + K8s (IMPLEMENT)

## Goal
Enable HTTPS everywhere: local development via Caddy auto-TLS, production via
cert-manager + nginx. Eliminate plain-HTTP dev habits that mask cookie/CORS bugs.

## Implementation Steps

1. Create `infra/tls/Caddyfile` — local reverse proxy with automatic HTTPS
2. Create `infra/tls/docker-compose.tls.yml` — Caddy overlay for dev
3. Create `infra/tls/mkcert-bootstrap.ps1` — generates local CA + certs for ehr.local
4. Update `nginx/nginx.conf` — activate TLS server block with conditional include
5. Create `nginx/tls.conf` — TLS-only server block (included when certs mounted)
6. Create cert-manager K8s manifests:
   - `infra/helm/ve-shared/templates/cert-manager.yaml`
   - Update `infra/helm/ve-shared/values.yaml` with tls section
7. Update `docker-compose.prod.yml` — mount certs in proxy service
8. Create `docs/runbooks/tls.md`
9. Create verification script `scripts/verify-phase287-tls.ps1`

## Files Touched
- `infra/tls/Caddyfile` (NEW)
- `infra/tls/docker-compose.tls.yml` (NEW)
- `infra/tls/mkcert-bootstrap.ps1` (NEW)
- `nginx/nginx.conf` (MODIFIED)
- `nginx/tls.conf` (NEW)
- `infra/helm/ve-shared/templates/cert-manager.yaml` (NEW)
- `infra/helm/ve-shared/values.yaml` (MODIFIED)
- `docker-compose.prod.yml` (MODIFIED)
- `docs/runbooks/tls.md` (NEW)
- `scripts/verify-phase287-tls.ps1` (NEW)
