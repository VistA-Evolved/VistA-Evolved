# Phase 592-99: VERIFY — Queue / Workflow Durability and Truthfulness

## Verification Steps

1. Confirm Docker and API health before testing:
   `docker ps --format "table {{.Names}}\t{{.Status}}"`
   `curl.exe -s http://127.0.0.1:3001/health`
2. Log in as clinician and verify the broken workflow definitions path is fixed:
   `GET /admin/workflows/definitions`
3. Verify workflow pack summaries and stats return the shapes the page expects:
   `GET /admin/workflows/packs`
   `GET /admin/workflows/stats`
4. Create a queue ticket through the API and verify it appears immediately in the
   department queue and display board.
5. Advance queue lifecycle through call, serve, and complete, then verify ticket
   events and department stats are durable.
6. Re-run TypeScript checks for touched apps and the full repo verifier.

## Acceptance Criteria

- Queue tickets and workflow definitions/instances survive process restart because
  PG is the source of truth when configured.
- `/admin/workflows/definitions` no longer collides with `/:id` and the workflow
  admin page can load definitions without a false 404 payload.
- Workflow pack summaries include `name`, `description`, `stepCount`, `tags`, and
  `vistaReferences`.
- Workflow stats include `totalDefinitions`, `activeDefinitions`, `totalInstances`,
  `byDepartment`, and `byStatus`.
- Queue admin supports creating a ticket from the page and managing its lifecycle.
- `scripts/verify-latest.ps1` remains green after the change.