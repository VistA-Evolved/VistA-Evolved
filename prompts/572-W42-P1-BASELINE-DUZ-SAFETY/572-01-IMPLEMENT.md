# Phase 572 — W42-P1: Baseline Capture + DUZ Safety Fix

> Wave 42: Production Remediation | Position 1 of 15
> Depends on: Nothing (this runs first)

---

## Objective

Before changing any code, capture a full baseline of the system's current state.
Then document and design the fix for the **single-DUZ problem** — the #1 patient
safety risk in the entire system.

---

## Task 0A: Run Full Gauntlet Baseline

```bash
node qa/gauntlet/cli.mjs --suite full > evidence/wave-42/572-baseline-gauntlet.txt 2>&1
```

Save the structured output as `evidence/wave-42/572-baseline-gauntlet.json`.
This is the "before" snapshot. Every gate's pass/fail status is recorded here.

---

## Task 0B: Clean Root Directory

Move all stray test JSON, cookie, and log files from the repo root into
`test-fixtures/`. Add `/test-fixtures/` to `.gitignore`.

**Expected root contents after cleanup:**
`package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `docker-compose.yml`,
`docker-compose.prod.yml`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`,
`.gitignore`, `.hadolint.yaml`, `.sops.yaml`, `README.md`, `AGENTS.md`,
`CONTRIBUTING.md`, `SECURITY.md`, `THIRD_PARTY_NOTICES.md`, `LICENSE`.

---

## Task 0C: Document the Single-DUZ Problem

### The Problem

The API authenticates to VistA **once** with a single set of credentials from
`.env.local` (`VISTA_ACCESS_CODE` / `VISTA_VERIFY_CODE`). Every RPC call from
every user — regardless of which clinician is logged in — executes under that
single DUZ (VistA internal user ID, typically DUZ 87 for PROVIDER,CLYDE).

This means:

- All clinical notes appear authored by PROVIDER,CLYDE
- All orders appear signed by PROVIDER,CLYDE
- All medication administrations attributed to PROVIDER,CLYDE
- VistA audit trails are meaningless — one DUZ for all actions
- **Legal liability**: clinical actions not attributed to acting clinician
- **Patient safety**: wrong provider on medication orders and notes

### The Fix Design (implemented in Phase 573)

The connection pool must support **per-user authentication**:

1. When a clinician logs in via the web UI (`POST /auth/login`), their VistA
   access/verify codes authenticate them and return their DUZ.
2. The session stores `{ duz, tenantId }` (access/verify codes are NOT stored
   in the session — they're used once for auth then discarded).
3. When a route calls `safeCallRpc(rpcName, params, { tenantId, duz })`, the
   pool routes to a connection authenticated as that DUZ.
4. Each connection in the pool is authenticated via `XUS AV CODE` for a specific
   user. The pool key is `tenantId:duz`.
5. For service-level calls (webhooks, cron, no user context), use the system
   DUZ from env vars.

### Files to Create/Modify

- `docs/security/single-duz-problem.md` — Full documentation of the problem
  and the fix design
- `apps/api/.env.example` — Add comment about DUZ-per-request
- Update `AGENTS.md` with entry about single-DUZ problem

### Acceptance Criteria

- [ ] `evidence/wave-42/572-baseline-gauntlet.json` exists with gate results
- [ ] Root directory contains only expected files
- [ ] `/test-fixtures/` added to `.gitignore`
- [ ] `docs/security/single-duz-problem.md` exists with full problem + fix design
- [ ] AGENTS.md updated with DUZ safety entry
