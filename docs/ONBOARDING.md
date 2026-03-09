# New Developer Onboarding Guide

Welcome to VistA Evolved. This guide gets you productive in under an hour.

## What You Need to Know

VistA Evolved modernizes the VA's VistA EHR with a TypeScript web stack.
The clinical brain is VistA (MUMPS/YottaDB) -- we never reinvent clinical
logic, we wrap it with modern UI and APIs.

## First 30 Minutes

### 1. Set Up Your Environment

```powershell
# Clone
git clone https://github.com/VistA-Evolved/VistA-Evolved.git
cd VistA-Evolved

# Install dependencies
pnpm install

# Start everything (Docker + VistA + PG + health checks)
.\scripts\dev-up.ps1 -RuntimeLane vehu
```

See `docs/runbooks/run-from-zero.md` for the complete checklist.

### 2. Verify It Works

```powershell
curl.exe http://127.0.0.1:3001/health
curl.exe http://127.0.0.1:3001/vista/ping
```

### 3. Start the Web UI

```powershell
cd apps/web && pnpm dev
```

Open http://localhost:3000. Login with PRO1234 / PRO1234!!

### 4. Navigate the Codebase

```
apps/
  api/          Fastify API server (port 3001)
  web/          Clinician Next.js app (port 3000)
  portal/       Patient Next.js app (port 3002)

config/         Module/SKU/capability definitions
services/       Docker compose files (VistA, PG, imaging, etc.)
scripts/        Dev tooling, verification, installers
docs/           Runbooks, architecture, audits
```

## Key Concepts

### VistA RPC Communication

All VistA interactions go through `rpcBrokerClient.ts` using the XWB protocol:

```
Browser -> Next.js -> Fastify API -> XWB RPC -> VistA/YottaDB
```

Use `safeCallRpc()` from `rpc-resilience.ts` -- never call `callRpc` directly.
The circuit breaker prevents hammering a failing VistA.

### Authentication

- **Dev**: VistA RPC auth (PRO1234 / PRO1234!!)
- **Production**: OIDC (Keycloak) with VistA DUZ mapping
- **Sessions**: httpOnly cookies + CSRF synchronizer tokens

### Module System

14 modules controlled by `config/modules.json`. Each module can be enabled/disabled
per tenant and per SKU. The module guard middleware (onRequest hook) returns 403
for routes belonging to disabled modules.

### Multi-Tenancy

- Every PG table has `tenant_id`
- RLS policies enforced in rc/prod mode
- Session includes tenant context
- In-memory stores are tenant-scoped where needed

## Rules You Must Follow

1. **Read AGENTS.md** -- it has 190+ rules accumulated from 700+ phases
2. **Docker-First Verification** -- test against live VistA, not assumptions
3. **Use `safeCallRpc()`** -- never raw `callRpc`
4. **No PHI in logs** -- use the structured logger, never `console.log`
5. **VistA-first** -- use VistA RPCs before building custom logic
6. **No dead clicks** -- every button either works or shows "integration pending"
7. **Test with DFN=46** -- NOT DFN=1,2,3 (they don't exist in VEHU)

## Common Tasks

### Add a new API route

1. Create route file in `apps/api/src/routes/`
2. Register in `apps/api/src/server/register-routes.ts`
3. Add auth rule in `apps/api/src/auth/security.ts` AUTH_RULES
4. Test against live VistA Docker

### Add a new VistA RPC

1. Check if RPC exists: run `ZVEPROB.m` in VEHU
2. Register in `apps/api/src/vista/rpcRegistry.ts`
3. Call via `safeCallRpc(rpcName, params)`
4. Test with `curl.exe` against running API

### Add a new UI page

1. Create page in `apps/web/src/app/` (Next.js App Router)
2. Use `credentials: 'include'` for all fetch calls
3. Include CSRF token via `X-CSRF-Token` header for mutations

## Verification

```powershell
# Full verification suite
pnpm verify:all

# Just lint + typecheck
pnpm lint:ci && pnpm -C apps/api exec tsc --noEmit

# VistA connectivity
pnpm verify:vista

# QA gauntlet
pnpm qa:gauntlet:fast
```

## Getting Help

- `AGENTS.md` -- Comprehensive developer rules and gotchas
- `docs/BUG-TRACKER.md` -- 70+ documented bugs with root cause + fix
- `docs/runbooks/` -- 209 step-by-step runbooks
- `docs/ARCHITECTURE.md` -- System architecture overview
