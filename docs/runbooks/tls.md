# TLS Configuration Runbook

> Phase 287 -- Real TLS in Dev + K8s

## Overview

VistA-Evolved supports HTTPS at every layer:

| Environment         | TLS Provider             | Config Location                                    |
| ------------------- | ------------------------ | -------------------------------------------------- |
| Local dev           | Caddy (auto self-signed) | `infra/tls/Caddyfile`                              |
| Local dev (manual)  | mkcert                   | `infra/tls/mkcert-bootstrap.ps1`                   |
| Docker Compose prod | nginx + mounted certs    | `nginx/tls.conf`                                   |
| Kubernetes          | cert-manager             | `infra/helm/ve-shared/templates/cert-manager.yaml` |

## Option A: Caddy (quickest for local dev)

### Prerequisites

- Docker installed
- Add `127.0.0.1 ehr.local` to your hosts file

### Steps

```powershell
# 1. Add hosts entry (run as Administrator)
Add-Content -Path "$env:SystemRoot\System32\drivers\etc\hosts" -Value "`n127.0.0.1 ehr.local"

# 2. Start Caddy TLS proxy
docker compose -f infra/tls/docker-compose.tls.yml up -d

# 3. Start API + Web normally
cd apps/api; npx tsx --env-file=.env.local src/index.ts   # port 3001
cd apps/web; pnpm dev                                      # port 3000

# 4. Open https://ehr.local
# Accept the self-signed cert warning on first visit, or run:
# caddy trust  (to install Caddy's internal CA into your system)
```

### Verify

```powershell
curl.exe -k https://ehr.local/health
# Expected: {"status":"ok",...}
```

## Option B: mkcert (trusted local certs)

### Prerequisites

- mkcert installed: `choco install mkcert` or `scoop install mkcert`
- Run as Administrator (for CA install)

### Steps

```powershell
# 1. Run bootstrap (installs CA + generates certs + updates hosts)
.\infra\tls\mkcert-bootstrap.ps1

# 2. Copy certs for nginx (if using prod compose)
Copy-Item infra\tls\certs\cert.pem nginx\certs\
Copy-Item infra\tls\certs\key.pem  nginx\certs\

# 3. Or use with Caddy (mount certs volume in docker-compose.tls.yml)
# Uncomment the certs volume mount in docker-compose.tls.yml

# 4. Start services and access https://ehr.local (no browser warning)
```

## Option C: Docker Compose Production (nginx)

### Prerequisites

- TLS certificates (from mkcert, Let's Encrypt, or your CA)
- Certs placed at `nginx/certs/cert.pem` and `nginx/certs/key.pem`

### Steps

```powershell
# 1. Place certs
mkdir nginx\certs -Force
Copy-Item <your-cert.pem> nginx\certs\cert.pem
Copy-Item <your-key.pem>  nginx\certs\key.pem

# 2. Start prod compose
docker compose -f docker-compose.prod.yml up -d

# 3. Verify
curl.exe -k https://localhost/health
```

### nginx TLS details

- TLS config: `nginx/tls.conf` (included via `conf.d/*.conf`)
- Protocols: TLSv1.2 + TLSv1.3
- HSTS: `max-age=63072000; includeSubDomains; preload`
- HTTP automatically redirects to HTTPS when tls.conf is active

## Option D: Kubernetes (cert-manager)

### Prerequisites

- cert-manager installed in cluster:
  ```bash
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.yaml
  ```

### Steps

```powershell
# 1. Enable cert-manager in Helm values
helm upgrade ve-shared infra/helm/ve-shared `
  --set certManager.enabled=true `
  --set certManager.type=self-signed

# 2. For production (Let's Encrypt):
helm upgrade ve-shared infra/helm/ve-shared `
  --set certManager.enabled=true `
  --set certManager.type=acme `
  --set certManager.acme.email=ops@yourorg.com `
  --set "certManager.certificate.dnsNames[0]=ehr.yourdomain.com"

# 3. Verify certificate is issued
kubectl get certificate -n ve-system
kubectl describe certificate ve-gateway-tls -n ve-system
```

### Certificate details

- Secret name: `ve-gateway-tls-secret`
- Duration: 90 days (configurable)
- Auto-renew: 15 days before expiry
- Key algorithm: ECDSA P-256

## Cookie secure flag alignment

All session cookies automatically set `secure: true` when:

- `NODE_ENV=production`, OR
- `PLATFORM_RUNTIME_MODE=rc` or `prod`

This ensures cookies work correctly over HTTPS in all environments.
See Phase 153 notes in AGENTS.md for details.

## Troubleshooting

### Browser shows "NET::ERR_CERT_AUTHORITY_INVALID"

- **Caddy**: Run `docker exec ve-caddy-tls caddy trust` or accept the warning
- **mkcert**: Run `mkcert -install` to install the CA
- **cert-manager**: Check issuer status with `kubectl describe clusterissuer`

### Caddy can't reach API/Web

- Ensure `host.docker.internal` resolves (Docker Desktop should handle this)
- On Linux, add `--add-host=host.docker.internal:host-gateway` to Docker run

### nginx returns 502 Bad Gateway

- Check that API and Web containers are healthy
- Check upstream names match: `api:3001` and `web:3000`
- Check TLS cert paths match the volume mounts

### HSTS prevents HTTP access after enabling TLS

- HSTS is persistent in browsers. Clear HSTS for your domain in browser settings.
- Chrome: `chrome://net-internals/#hsts` -- delete domain entry
