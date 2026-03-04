# Phase 5A — Patient Search UI (IMPLEMENT)

Goal:
Create a Next.js UI page that calls the working API endpoint:
GET /vista/patient-search?q=SMI

Strict rules (from lessons learned):

- Next.js App Router interactive pages MUST start with "use client" (React 19 hydration).
- Do NOT refactor folder structure.
- Keep UI minimal: input + results + selected DFN/name.
- Do not add new UI libraries.

Preconditions (must check first):

- scripts/verify-latest.ps1 passes (Phase 1–4B)
- curl "http://127.0.0.1:3001/vista/patient-search?q=SMI" returns ok:true with results

Implementation steps:

1. Create page:
   apps/web/src/app/patient-search/page.tsx
   Must include:
   - "use client"
   - input box (default "SMI")
   - debounce 400ms
   - fetch API endpoint
   - show loading + error
   - display results list
   - click item sets Selected DFN + Selected Name

2. Add navigation:
   apps/web/src/app/page.tsx must include link to /patient-search

3. Update docs:
   apps/web/README.md must mention:
   - API must be running
   - how to start web
   - where to open /patient-search

Deliverables:

- list files changed
- how to run: pnpm -C apps/web dev
- expected behavior checklist
