# ADR: Secrets Sync Choice

**Status:** Accepted
**Date:** 2025-07-22
**Phase:** 238 (Wave 6 P1)

## Context

VistA-Evolved needs a secrets management strategy for production deployments.
Current state:

- **SOPS + age**: Encrypted secrets files committed to repo, decrypted at deploy time
- **credential-encryption.ts**: AES-256-GCM encryption for VistA credentials at rest
- **VaultInterface**: TypeScript interface defined for external vault integration
- **env vars**: Runtime secrets via `.env.local` (git-ignored) and Docker `-e` flags
- **IMAGING_INGEST_WEBHOOK_SECRET**, **PLATFORM_PG_URL**, **OIDC_CLIENT_SECRET**:
  Examples of secrets currently passed via env vars

**What is missing:**
- No external vault or KMS integration (env-var master key only)
- No External Secrets Operator for K8s
- No secret rotation automation
- VaultInterface defined but not implemented
- SOPS keys managed manually (no KMS backend)

## Decision

**Target External Secrets Operator (ESO) for K8s production deployments.
Keep SOPS + age for dev/CI. Implement VaultInterface against AWS Secrets Manager
as the first production backend.**

Rationale:
- ESO is the K8s-native standard for external secret sync (CNCF project)
- AWS Secrets Manager is the most likely production target (EKS deployment)
- SOPS + age remains perfect for dev (no cloud dependency)
- VaultInterface is already defined — just needs concrete implementation
- ESO supports multiple backends (AWS, Azure, GCP, HashiCorp Vault) via
  SecretStore CRDs, so we're not locked to AWS

## Alternatives Considered

| Option | License | Pros | Cons |
|--------|---------|------|------|
| **HashiCorp Vault** | BSL (was MPL) | Feature-rich, self-hosted | BSL license change, operational burden |
| **sealed-secrets** | Apache-2.0 | Simple, K8s-native | No rotation, no external backend |
| **External Secrets Operator** | Apache-2.0 | Multi-backend, CNCF, rotation | Requires ESO controller in cluster |
| **SOPS only** | MPL-2.0 | Simple, works now | No runtime rotation, manual key mgmt |
| **AWS Secrets Manager direct** | N/A | Native AWS integration | Vendor lock-in, no K8s sync |

## Consequences

**Positive:**
- Cloud-agnostic via ESO SecretStore abstraction
- Automatic secret rotation via ESO refresh intervals
- Dev workflow unchanged (SOPS + age continues working)
- VaultInterface implementation enables testing with mock backends
- CNCF project with strong community support

**Negative:**
- ESO controller is another cluster component to manage
- AWS Secrets Manager has per-secret costs ($0.40/secret/month)
- Two secret management modes (SOPS for dev, ESO for prod) adds complexity

**Migration path:**
1. Phase 238: Decision locked (this ADR)
2. Phase 246 (P9): Implement VaultInterface for AWS Secrets Manager
3. Phase 246 (P9): Add ESO manifests to Helm charts
4. Production cutover: Deploy ESO, create SecretStore, migrate env vars

## Security / PHI Notes

- VistA credentials (access/verify codes) are the most sensitive secrets
- OIDC client secrets must be rotated on schedule
- PG connection strings contain passwords — must not appear in logs
- ESO SecretStore credentials themselves need bootstrap (chicken-and-egg)
  — use IAM roles for service accounts (IRSA) in AWS

## Ops Notes

- Dev: `sops -d secrets.enc.yaml | kubectl apply -f -`
- Prod: ESO syncs SecretStore -> K8s Secret automatically
- Rotation: Configure `refreshInterval: 1h` on ExternalSecret resources
- Monitoring: ESO exposes Prometheus metrics for sync failures
- Fallback: If ESO is down, existing K8s Secrets persist until pod restart
