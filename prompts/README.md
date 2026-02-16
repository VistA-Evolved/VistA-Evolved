# VistA Evolved — Prompts Playbook

This folder stores the *exact prompts* used to build VistA Evolved with AI coders.
It exists so:
- new AI agents can pick up instantly
- new developers can repeat work without rediscovering problems
- prompts improve over time with lessons learned (Windows, Docker, RPC protocol)

## Ground rules (non-negotiable)
1) CHECK FIRST. Inventory before changes.
2) Minimal edits. No refactors unless required.
3) Never commit secrets (.env.local stays untracked).
4) Never duplicate README content. Consolidate.
5) Every phase has:
   - IMPLEMENT prompt
   - VERIFY prompt
6) Every phase must be reproducible on Windows PowerShell.

## Repo baseline (locked)
- OS: Windows 10/11
- Node: 24.x (current: v24.13.0)
- pnpm: 10.x (current: 10.29.2)
- Web: Next.js (current scaffold: 16.1.6)
- API: Fastify + TS
- Sandbox: Docker compose profile "dev"
- RPC Broker port: 9430
- SSH port: 2222

## Known “hard-won” fixes (do not re-learn)
### Windows / tooling
- PowerShell may block pnpm.ps1 → set execution policy:
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
- Corepack EPERM may fail → install pnpm via npm:
  npm install -g pnpm
- pnpm build scripts warning → use allowBuilds in pnpm-workspace.yaml

### Docker
- Large image pull may fail with "unexpected EOF":
  restart Docker Desktop, prune builder cache, retry pull
- Avoid fragile healthchecks in compose unless CMD-SHELL confirmed

### GitHub
- Branch protection rules may require org upgrade for private repos
- CodeQL must not fail when no JS/TS exists (skip logic)

### RPC Broker protocol (XWB)
These are required for working RPC calls:
- RPC 11302 framing requires bytes: `\x01` + `1` between 11302 and SPack(rpcName)
- Credentials/context must use CipherPad logic from XUSRB1.m (20 pads × 94 chars)
- Cipher indices placement +31 front/back; indices range 1–20 and must be different
- Spaces must be translated (not dropped) for context names like "OR CPRS GUI CHART"
- Response reads are EOT (`\x04`) framed

## How to use these prompts
1) Run phase IMPLEMENT prompt in AI coder tool
2) Run phase VERIFY prompt in AI coder tool
3) Run local scripts (if available) OR follow the runbook commands
4) Log results in Notion (Meeting Notes + Feature Stage update)

## Updating prompts safely
When a new discovery happens:
- update the relevant prompt file
- add a "Changelog" section at bottom with date + summary
- never delete older knowledge

## Phase 10 subphase mapping
Phase 10 (CPRS Extract) is the first phase with A/B/C/D subphases.
Each subphase gets an IMPLEMENT + VERIFY pair:

| File # | Subphase | Description |
|--------|----------|-------------|
| 12-01 | 10A IMPLEMENT | CPRS Inventory Extraction (scripts) |
| 12-02 | 10A VERIFY | Validate extraction scripts + output |
| 12-03 | 10B IMPLEMENT | CPRS Contract Generation (schemas) |
| 12-04 | 10B VERIFY | Validate contract schemas + cross-refs |
| 12-05 | 10C IMPLEMENT | CPRS Replica Shell (Web UI) |
| 12-06 | 10C VERIFY | Validate UI build + navigation |
| 12-07 | 10D IMPLEMENT | API Scaffold Generator |
| 12-08 | 10D VERIFY | Validate generated routes + build |
| 12-99 | FULL VERIFY | End-to-end Phase 10 verification |
