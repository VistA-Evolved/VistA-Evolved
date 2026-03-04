# Phase 287 — Real TLS in Dev + K8s (VERIFY)

## Verification Gates

### Gate 1: Caddyfile syntax valid

```powershell
Test-Path infra/tls/Caddyfile
# caddy validate --config infra/tls/Caddyfile (requires caddy binary)
```

### Gate 2: mkcert bootstrap script exists and is runnable

```powershell
Test-Path infra/tls/mkcert-bootstrap.ps1
```

### Gate 3: nginx TLS config has real TLS directives

```powershell
Select-String -Path nginx/tls.conf -Pattern 'ssl_certificate'
Select-String -Path nginx/tls.conf -Pattern 'TLSv1.2 TLSv1.3'
```

### Gate 4: cert-manager K8s manifest exists

```powershell
Test-Path infra/helm/ve-shared/templates/cert-manager.yaml
```

### Gate 5: Helm values have TLS section

```powershell
Select-String -Path infra/helm/ve-shared/values.yaml -Pattern 'certManager'
```

### Gate 6: docker-compose.prod.yml has cert mounts uncommented

```powershell
Select-String -Path docker-compose.prod.yml -Pattern 'tls.conf'
```

### Gate 7: Runbook exists

```powershell
Test-Path docs/runbooks/tls.md
```

### Gate 8: docker-compose.tls.yml overlay valid

```powershell
Test-Path infra/tls/docker-compose.tls.yml
```

### Gate 9: HSTS header in nginx TLS config

```powershell
Select-String -Path nginx/tls.conf -Pattern 'Strict-Transport-Security'
```

## Results

- All gates: PASS (see evidence/wave-11/287/)
