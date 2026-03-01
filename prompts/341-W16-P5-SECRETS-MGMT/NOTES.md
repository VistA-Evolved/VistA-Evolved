# Phase 341 Notes

- KeyProvider is a strategy interface: env (default), file, vault (HTTP stub), kms (stub)
- Envelope encryption: random 256-bit DEK encrypts data, KEK encrypts DEK
- Rotation: new key version created, old marked "retiring", grace period before "expired"
- All key material in memory only — never persisted unencrypted
- PG table stores encrypted key blobs + metadata (version, algorithm, status)
