# ADR: Secrets Rotation

**Status:** Accepted  
**Date:** 2026-03-01  
**Phase:** 337 (Wave 16 P1)  
**Deciders:** Architecture team

## Context

VistA-Evolved uses environment variables for all secrets (DB creds, OIDC
client secrets, webhook keys, VistA RPC credentials). This works for dev but
lacks:

- Envelope encryption for data at rest
- Automated rotation workflows
- Audit trail for secret access
- Key lifecycle management (creation → rotation → revocation → destruction)
- Separation between master keys and data keys

Production deployments need: DB credential rotation, integration key rotation
(HL7/X12 connectors), webhook signing key rotation, and export encryption keys.

## Decision

**Hybrid envelope encryption** using an abstract `KeyProvider` interface that
supports multiple backends (env-var, file-based, cloud KMS, Vault) selectable
via configuration.

Rationale:

- No mandatory external infrastructure (env-var backend for dev/sandbox)
- Cloud KMS or Vault backend for production (infrastructure team deploys)
- Envelope encryption pattern is cloud-agnostic
- Rotation workflows are idempotent and audited
- Zero new npm dependencies (Node.js crypto module suffices)

## Alternatives Considered

### Option A: HashiCorp Vault

- **Pros:** Industry standard, full key lifecycle, dynamic secrets, excellent
  audit trail, supports transit encryption
- **Cons:** Requires Vault server infrastructure, operational complexity,
  adds network dependency for every secret access
- **License:** BSL 1.1 (Vault 1.14+) — restrictive for SaaS competitors
- **Deferred:** Can be a `KeyProvider` backend when infrastructure is available

### Option B: Cloud KMS + External Secrets Operator (ESO)

- **Pros:** Managed service, no self-hosted infra, K8s-native with ESO
- **Cons:** Cloud-vendor lock-in, ESO adds Kubernetes dependency, different
  APIs per cloud provider
- **License:** ESO is Apache 2.0 — acceptable
- **Deferred:** Can be a `KeyProvider` backend for cloud deployments

### Option C: Sealed Secrets (Bitnami)

- **Pros:** GitOps-friendly, secrets encrypted in repo
- **Cons:** Kubernetes-only, no key rotation, no dynamic secrets, no audit
- **License:** Apache 2.0 — acceptable
- **Rejected:** Too limited for rotation workflows

### Option D: Hybrid Envelope Encryption (CHOSEN)

- **Pros:** Backend-agnostic, works from dev to production, no mandatory
  external deps, audited rotation, zero npm deps
- **Cons:** Must implement wrapper ourselves, less battle-tested than Vault
- **Selected:** Best fit for the project's zero-external-dep core pattern

## Implementation Plan

1. Define `KeyProvider` interface: `getMasterKey()`, `generateDataKey()`,
   `encryptDataKey()`, `decryptDataKey()`, `rotateDataKey()`, `listKeys()`
2. Backends:
   - `EnvKeyProvider` — reads master key from `MASTER_ENCRYPTION_KEY` env var
   - `FileKeyProvider` — reads from a key file (for Docker/K8s secrets mount)
   - `VaultKeyProvider` — stub/interface for HashiCorp Vault transit engine
   - `KmsKeyProvider` — stub/interface for cloud KMS
3. Envelope encryption: `encrypt(plaintext, dataKeyId)` → `{ciphertext, encryptedDataKey, iv, tag}`
4. Rotation workflows:
   - `ops:rotate:db-creds` — generate new creds, update connection, verify, audit
   - `ops:rotate:integration-creds` — rotate HL7/X12 connector credentials
   - `ops:rotate:signing-keys` — rotate webhook/pack signing keys, dual-verify period
5. All rotation events logged to immutable audit
6. Secret references in DB (never plaintext secrets)

## Operational Notes

- Master key compromise = full data breach; protect with hardware/KMS in production
- Data key rotation can be done without re-encrypting all data (lazy re-encryption)
- Rotation dry-run mode: `--dry-run` flag validates the workflow without applying
- Secrets never appear in logs (denylist enforced by structured logger)
- Key destruction is soft-delete with 30-day grace period

## Rollback Plan

1. Keep existing env-var secrets as fallback
2. `KeyProvider` backend selection via `KEY_PROVIDER=env|file|vault|kms`
3. If envelope encryption breaks: decrypt with current keys, revert to plaintext
4. Rotation can be reversed by restoring previous credential from audit log
5. No data loss — encrypted data retains the encrypted data key alongside it
