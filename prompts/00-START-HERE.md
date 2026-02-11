# START HERE — VistA Evolved Prompt System

This folder is an executable playbook to rebuild the VistA Evolved project from scratch using AI prompts.

## The only rule
Do not proceed to the next step until the VERIFY step passes.

## How to use
For each step:
1) Run the IMPLEMENT prompt in your AI coding agent.
2) Immediately run the VERIFY prompt in the same agent.
3) If VERIFY fails: fix only what failed, rerun VERIFY, then proceed.

## Where this is run
- Repo path: C:\Users\kmoul\OneDrive\Documents\GitHub\VistA-Evolved
- OS: Windows PowerShell
- Node: 24.x
- pnpm: 10.x
- Docker Desktop: installed and running

## Sequence (must follow)
00 — Read system rules and verify tools:
- 00-PLAYBOOK.md
- 00-RULES-OF-ENGAGEMENT.md
- 00-VERIFY-TOOLS.md

01 — Bootstrap:
- 01-BOOTSTRAP/01-01-repo-bootstrap-IMPLEMENT.md
- 01-BOOTSTRAP/01-02-notion-bootstrap-IMPLEMENT.md
- 01-BOOTSTRAP/01-03-github-bootstrap-IMPLEMENT.md
- 01-BOOTSTRAP/01-99-bootstrap-VERIFY.md

02 — Phase 1 Hello System:
- 02-PHASE-1-HELLO-SYSTEM/02-01-hello-system-IMPLEMENT.md
- 02-PHASE-1-HELLO-SYSTEM/02-99-hello-system-VERIFY.md

03 — Phase 2 VistA Sandbox:
- 03-PHASE-2-VISTA-SANDBOX/03-01-vista-sandbox-IMPLEMENT.md
- 03-PHASE-2-VISTA-SANDBOX/03-99-vista-sandbox-VERIFY.md

04 — Phase 3 /vista/ping:
- 04-PHASE-3-VISTA-PING/04-01-vista-ping-IMPLEMENT.md
- 04-PHASE-3-VISTA-PING/04-99-vista-ping-VERIFY.md

05 — Phase 4A Default Patient List RPC:
- 05-PHASE-4A-DEFAULT-PATIENT-LIST/05-01-default-patient-list-IMPLEMENT.md
- 05-PHASE-4A-DEFAULT-PATIENT-LIST/05-02-rpc-protocol-fix-IMPLEMENT.md
- 05-PHASE-4A-DEFAULT-PATIENT-LIST/05-99-default-patient-list-VERIFY.md

06 — Phase 4B Patient Search RPC:
- 06-PHASE-4B-PATIENT-SEARCH/06-01-patient-search-IMPLEMENT.md
- 06-PHASE-4B-PATIENT-SEARCH/06-99-patient-search-VERIFY.md

If you need a full end-to-end agent run:
- full-audit-fix-verify-phase1-to-phase4b.md
