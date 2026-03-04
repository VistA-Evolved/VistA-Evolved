# ADR: Clearinghouse Transport Strategy

**Status:** Accepted  
**Date:** 2026-03-01  
**Phase:** W14-P1 (Phase 317)

## Context

VistA-Evolved exchanges X12 files with payers and clearinghouses via multiple transport protocols. The codebase has 14 connector files but no actual transport implementations — all simulate transmission.

## Options Evaluated

### Transport Protocols

| Protocol           | Use Case                                                                 | Prevalence                           |
| ------------------ | ------------------------------------------------------------------------ | ------------------------------------ |
| **SFTP**           | Batch file exchange (837 submit, 835 retrieve)                           | Most common US clearinghouse pattern |
| **HTTPS REST API** | Real-time eligibility (270/271), modern clearinghouses (Stedi, Availity) | Growing rapidly                      |
| **AS2**            | EDI exchange with MDN receipts                                           | Legacy, declining (Walmart-era)      |
| **Direct MLLP**    | HL7v2 point-to-point (not X12)                                           | Handled by HL7 engine                |

### Implementation Options

#### Option A: ssh2 (npm) for SFTP

- **License:** MIT
- **Pros:** Pure JS, no native deps, well-maintained (9M weekly downloads), supports password + key auth
- **Cons:** We own retry/circuit-breaker logic

#### Option B: as2-lib (npm) for AS2

- **License:** Apache 2.0
- **Pros:** Standards-compliant, MDN handling
- **Cons:** Very niche, low download count, AS2 is declining

#### Option C: Custom HTTPS Adapters (Current Pattern)

- **License:** Project-owned
- **Pros:** Already have adapter scaffolds for Availity, Stedi, Office Ally, PhilHealth, etc.
- **Cons:** Each adapter is independent — no shared HTTP transport layer

## Decision

**Implement SFTP + HTTPS adapters; stub AS2 with documentation.**

Rationale:

1. **SFTP** (via `ssh2` npm package) is the highest-priority transport — most US clearinghouses (Office Ally, Change Healthcare, Availity batch) use SFTP for 837/835 exchange.
2. **HTTPS REST** adapters already exist as scaffolds — harden with shared retry/auth patterns.
3. **AS2** is legacy and declining. Stub the interface with a clear migration path documented in the runbook. Implement only if a specific customer requires it.

## Integration Plan

1. Create `ClearinghouseTransport` adapter interface with `sendFile`, `pollInbox`, `acknowledgeReceipt` (W14-P6)
2. Implement `SftpTransport` using `ssh2` (W14-P6)
3. Implement `HttpsTransport` wrapping Node.js `fetch` with OAuth2/API-key auth (W14-P6)
4. Create sandbox harness with fake clearinghouse container for deterministic testing (W14-P6)
5. Stub `As2Transport` with error message pointing to runbook

## Credential Management

- No raw credentials in code or env vars
- Credentials referenced via `integration_credentials_refs` (secret_ref pointer)
- SFTP keys stored in platform secret management (env-var ref or KMS pointer)
- Support key rotation via `rotated_at` timestamp tracking

## Rollback Plan

All transports implement the same `ClearinghouseTransport` interface. If `ssh2` proves unstable, swap to `ssh2-sftp-client` (MIT, higher-level wrapper) or shell out to system `sftp`. The adapter interface isolates all consumers.

## License Notes

- `ssh2`: MIT — pure JavaScript, no native compilation required
- `as2-lib`: Apache 2.0 — only if adopted later
