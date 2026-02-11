# Phase 1 — Hello System (IMPLEMENT)

Goal:
apps/web and apps/api run locally.

Requirements:
- Web: Next.js + TS; homepage shows "VistA Evolved" and "Hello System is running"
- API: Fastify + TS; GET /health returns {"ok":true}
- Keep dependencies minimal
- Windows-first instructions

Known gotchas:
- create-next-app conflicts with placeholder apps/web/README.md → remove conflicting file before generator
- PowerShell scripts disabled → RemoteSigned or use pnpm.cmd

Deliverable:
- commands:
  pnpm -r install
  pnpm -C apps/web dev
  pnpm -C apps/api dev
- expected outputs and URLs
