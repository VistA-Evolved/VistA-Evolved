# Verification Tools

Primary:
- scripts/verify-phase1-to-phase4a.ps1 (Phase 1 → 4A)
- scripts/verify-phase1-to-phase4b.ps1 (if created later)

Manual checks:
- Web:
  pnpm -C apps/web dev
  http://localhost:3000

- API:
  pnpm -C apps/api dev
  curl http://127.0.0.1:3001/health

- Docker sandbox:
  cd services/vista
  docker compose --profile dev up -d
  docker ps
  Test-NetConnection 127.0.0.1 -Port 9430

Known Windows gotchas:
- Execution policy blocks pnpm.ps1:
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

- pnpm allowBuilds in pnpm-workspace.yaml:
  allowBuilds:
    esbuild: true
    sharp: true
    unrs-resolver: true

- Docker pull “unexpected EOF” recovery:
  restart Docker Desktop, prune builder cache, retry pull
