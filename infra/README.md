# VistA-Evolved Infrastructure

Container-per-tenant Kubernetes deployment using Helm.

## Prerequisites

| Tool | Min Version | Install |
|------|-------------|---------|
| Docker Desktop | 4.x | https://docs.docker.com/desktop/ |
| kind | 0.20+ | `choco install kind` or https://kind.sigs.k8s.io/ |
| kubectl | 1.28+ | `choco install kubernetes-cli` |
| helm | 3.14+ | `choco install kubernetes-helm` |

## Quick Start (Local Kind)

```powershell
# 1. Create the Kind cluster
.\infra\scripts\kind-up.ps1

# 2. Build and load images
.\infra\scripts\build-images.ps1
kind load docker-image vista-evolved/api:dev --name ve-local
kind load docker-image vista-evolved/web:dev --name ve-local

# 3. Install shared layer
.\infra\scripts\helm-install-shared.ps1

# 4. Install a tenant
helm upgrade --install demo infra/helm/ve-tenant \
  --set tenantId=t-demo,tenantSlug=demo

# 5. Verify
kubectl get pods -n ve-system
kubectl get pods -n ve-tenant-demo
```

## Directory Layout

```
infra/
  helm/
    ve-shared/        Shared platform layer (PG, Redis, Nginx gateway)
    ve-tenant/        Per-tenant release (API + VistA + PVC)
  environments/
    dev.yaml          Kind / local overlay
    staging.yaml      Staging overlay
    prod.yaml         Production overlay
  scripts/
    kind-up.ps1       Create Kind cluster
    kind-down.ps1     Delete Kind cluster
    helm-install-shared.ps1   Install ve-shared chart
    helm-uninstall-shared.ps1 Uninstall ve-shared chart
    build-images.ps1  Build Docker images (Q180)
  keycloak/           Keycloak realm config (Phase 35)
  opa/                OPA policy files (Phase 35)
```

## Architecture

```
                   Internet
                      |
             +--------+--------+
             | Nginx Gateway   |  ve-system namespace
             | (NodePort 30080)|
             +----+-------+----+
                  |       |
     +------------+       +-------------+
     v                                  v
  ve-tenant-acme                   ve-tenant-beta
  +----------------+               +----------------+
  | API Deployment |               | API Deployment |
  | VistA/YottaDB  |               | VistA/YottaDB  |
  | PVC            |               | PVC            |
  +----------------+               +----------------+
           |                                |
           +-----------+  +-----------------+
                       v  v
              +------------------+
              | Platform PG 16   |  ve-system namespace
              | (shared, RLS)    |
              +------------------+
```

## Environment Overlays

| Overlay | Network Policies | Keycloak | Observability | Storage |
|---------|-----------------|----------|---------------|---------|
| dev     | off | off | off | 2Gi PG |
| staging | on  | on  | on  | 20Gi PG |
| prod    | on  | on  | on  | 100Gi PG, restricted PSS |

## Secrets Management

Secrets are placeholder values in the Helm chart. For production:
- Use SOPS + age for encrypting values files (Q184)
- Or use External Secrets Operator with cloud KMS
- Never commit plaintext secrets

## Verify

```powershell
# Lint both charts
helm lint infra/helm/ve-shared
helm lint infra/helm/ve-tenant --set tenantId=test,tenantSlug=test

# Template render (dry-run)
helm template ve-shared infra/helm/ve-shared -f infra/environments/dev.yaml
helm template demo infra/helm/ve-tenant --set tenantId=test,tenantSlug=test
```
