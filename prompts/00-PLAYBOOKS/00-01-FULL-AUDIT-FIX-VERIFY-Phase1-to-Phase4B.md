# 00-01 FULL AUDIT + FIX + VERIFY (Phase 1 → Phase 4B)

## Purpose
This playbook lets a brand-new AI coding agent (even low-quality) audit, fix, and verify the VistA-Evolved repo end-to-end without breaking working parts.

This is a **safe repair playbook**:
- inventory first
- minimal edits only
- run verification
- no secrets
- no refactors
- no duplication

---

## Repo + Environment (fixed facts)
Repo path:
- C:\Users\kmoul\OneDrive\Documents\GitHub\VistA-Evolved

Windows:
- PowerShell
- Node v24.x (current known-good: v24.13.0)
- pnpm v10.x (current known-good: 10.29.2)

Docker:
- Docker Desktop running
- VistA sandbox container name: `wv`
- RPC Broker port: 9430
- SSH port: 2222

---

## Non-negotiable Rules
1) **INVENTORY FIRST**. Do not edit anything until inventory is printed.
2) **MINIMAL CHANGES ONLY**. No refactors. Fix only what is wrong.
3) **DO NOT TOUCH apps/web** unless homepage text is missing.
4) **DO NOT TOUCH RPC protocol logic** if Phase 4A already passes, unless verify script fails at Phase 4A.
5) **NO SECRETS**:
   - `.env.local` must remain untracked
   - never print access/verify codes in logs
6) **NO DUPLICATE DOCS**:
   - consolidate READMEs if duplicated
7) **MUST SELF-VERIFY**:
   - run scripts/verify-latest.ps1 (or verify-phase1-to-phase4a.ps1)
   - Phase must be PASS before marking done

---

## Allowed files to change (only if needed)
- `.github/workflows/*` (CI + CodeQL)
- `docs/runbooks/*`
- `scripts/*` (verification scripts)
- `services/vista/docker-compose.yml`
- `pnpm-workspace.yaml`
- `apps/api/*` (API routes, broker client)
- `AGENTS.md`
- `prompts/*` (only if prompt files themselves are wrong)

## Forbidden changes (do not change)
- `apps/web` structure and dependencies
- repo history rewriting
- any attempt to add paid GitHub-only features as requirements
- any dependency bloat

---

# STEP 0 — INVENTORY (must print first)
Print a table with columns: Component | Expected | Found | Status

## Inventory checklist
A) Tool versions
- node -v
- pnpm -v

B) Repo structure exists
- apps/
- apps/web/
- apps/api/
- services/vista/
- docs/runbooks/
- scripts/
- prompts/

C) Key files exist
- root package.json
- pnpm-workspace.yaml
- apps/api/.env.example exists
- apps/api/.env.local exists locally BUT must be untracked
- services/vista/docker-compose.yml exists
- scripts/verify-phase1-to-phase4a.ps1 exists
- scripts/verify-latest.ps1 exists and points to newest verify script

D) Runbooks exist
- docs/runbooks/local-vista-docker.md
- docs/runbooks/phase2-docker-fix.md
- docs/runbooks/vista-connectivity.md
- docs/runbooks/vista-rpc-default-patient-list.md
- docs/runbooks/vista-rpc-patient-search.md (may be stub)

E) API routes exist
- /health
- /vista/ping
- /vista/default-patient-list
- /vista/patient-search (may be stub)

F) Docker compose sanity
- service name = wv
- image = worldvista/worldvista-ehr:latest
- ports include 9430 and 2222
- profiles: ["dev"]
- avoid fragile healthchecks with pipes unless CMD-SHELL

G) Prompts ordering
- check folders exist: 01-BOOTSTRAP…06-PHASE-4B
- ensure each phase has 01 IMPLEMENT and 99 VERIFY

---

# STEP 1 — FIX ONLY FAILURES (no improvements)
For each FAIL item from inventory:
- explain root cause (1 sentence)
- apply minimal patch
- list file changed

## Common failure fixes (allowed)
### If PowerShell blocks scripts
- Use RemoteSigned for CurrentUser:
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

### If pnpm warns ignored build scripts
- Ensure pnpm-workspace.yaml contains:
  allowBuilds:
    esbuild: true
    sharp: true
    unrs-resolver: true

### If Docker image pull fails (unexpected EOF)
- Add/verify runbook instructions:
  restart Docker Desktop
  docker builder prune -f
  docker pull worldvista/worldvista-ehr:latest (retry)

### If docker compose fails YAML parsing
- Replace compose with minimal valid mapping (no healthcheck):
  services:
    wv:
      image: worldvista/worldvista-ehr:latest
      container_name: wv
      profiles: ["dev"]
      ports: ["2222:22","9430:9430","8001:8001","8080:8080","9080:9080"]
      stdin_open: true
      tty: true
      restart: unless-stopped

### If API fails to start due to port 3001 in use
- Do NOT change default port.
- Document runbook:
  - kill PID owning 3001 OR set PORT=3002 temporarily.

---

# STEP 2 — RUN VERIFICATION (must do)
Run:
- scripts/verify-latest.ps1

If verify-latest does not exist, run:
- scripts/verify-phase1-to-phase4a.ps1

You must capture output and summarize:
- PASSED count
- FAILED count
- list failing checks

If Phase 4A fails:
- enable VISTA_DEBUG=true (do not log credentials)
- provide the last debug step and response

---

# STEP 3 — PHASE 4B STATUS (patient search)
Phase 4B is complete ONLY if:
- /vista/patient-search?q=SMI returns ok:true with results
- and Phase 4A still passes

If Phase 4B endpoint exists but returns stub:
- mark Phase 4B as "pending RPC mapping"
- do NOT claim completion

---

# STEP 4 — OUTPUT REQUIRED
Return:

1) Inventory table (Component | Expected | Found | Status)
2) Files modified list (if any)
3) Commands run
4) Verification output summary
5) Clear final statement:
   - FULL PASS ✅
   - or FAIL ❌ with top 3 exact fixes

---

# STOP CONDITION
Do not proceed beyond this prompt.
Do not start new features.
This is audit/fix/verify only.
