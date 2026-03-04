# Phase 250 — VistA RPC Contract Harness (Wave 7 P3)

## Objective

Build a contract-test harness for the top 10 VistA RPCs so every RPC call
has a deterministic, PHI-free fixture that can be replayed in CI without a
live VistA instance.

## Implementation Steps

### 1. Define RPC Contracts (`apps/api/src/vista/contracts/rpc-contracts.ts`)

- Create `RpcContract` interface: rpcName, domain, outputSchema, sanitizeFields, failureCases
- Register 10 contracts covering auth, patient, allergy, vitals, meds, problems,
  TIU, notifications, labs, and default-patient-list RPCs
- Output schemas define minLines, maxLines, mustContain, mustNotContain patterns

### 2. PHI Sanitizer (`apps/api/src/vista/contracts/sanitize.ts`)

- 6 deny patterns: SSN, DOB, patient names, phone, address, MRN
- `hashIdentifier()` — SHA-256 with salt, first 12 chars
- `normalizeTimestamp()` — FileMan date conversion
- `sanitizeRpcOutput()` — applies contract-specific rules + global deny patterns
- `verifyNoPhiInFixture()` — returns violations list for CI gates

### 3. RECORD/REPLAY Modes (`apps/api/src/vista/contracts/modes.ts`)

- `ContractMode` = record | replay
- `VISTA_CONTRACT_MODE` env var controls mode
- `fixtureFilePath()` resolves fixture paths from RPC name + case name
- `RpcFixture` interface: rpcName, recordedAt, sanitized, response

### 4. Fixture Files (`apps/api/tests/fixtures/vista/`)

- 10 directories (one per contracted RPC)
- Each has `success.json` (representative sanitized output) and `empty.json` (empty response)
- 20 total fixture files, all valid JSON, all PHI-free

### 5. Replay Test Suite (`apps/api/tests/rpc-contract-replay.test.ts`)

- Vitest suite that loads fixtures and validates against contract schemas
- Per-RPC tests: fixture exists, meets schema, no PHI
- Global PHI scan: SSN patterns, credential patterns

### 6. Record Tool (`scripts/vista-contracts-record.ts`)

- Dev-only TSX script for recording from live VistA
- Safety guard: requires `VISTA_CONTRACT_MODE=record`
- Dynamic import of broker client to avoid hard dependency at lint time
- Sanitizes output before saving

## Files Touched

- `apps/api/src/vista/contracts/rpc-contracts.ts` — NEW
- `apps/api/src/vista/contracts/sanitize.ts` — NEW
- `apps/api/src/vista/contracts/modes.ts` — NEW
- `apps/api/src/vista/contracts/index.ts` — NEW
- `apps/api/tests/fixtures/vista/*/success.json` — NEW (10 files)
- `apps/api/tests/fixtures/vista/*/empty.json` — NEW (10 files)
- `apps/api/tests/rpc-contract-replay.test.ts` — NEW
- `scripts/vista-contracts-record.ts` — NEW
- `scripts/verify-phase250-rpc-contracts.ps1` — NEW

## Depends On

- Phase 249 (P2) — Supply Chain Security Baseline
- Existing: `apps/api/src/vista/rpcRegistry.ts`, `rpcBrokerClient.ts`, `rpc-resilience.ts`

## Verification

Run `scripts/verify-phase250-rpc-contracts.ps1` — 20 gates, all must PASS.
