# Phase 533 — Workflow State Switchboard

## Objective

Create a reusable, typed finite state machine (FSM) framework that unifies the
6+ independent state machine implementations across the codebase. Provide a
switchboard service that routes workflow state transitions, emits events, and
provides a single dashboard view of all active workflows.

## Context

The codebase has at least 6 independent FSM implementations all using the same
`Record<FromState, ToState[]>` pattern:

- Claim FSM (rcm/domain/claim.ts)
- Workflow Inbox tasks (workflow-inbox-service.ts)
- Data Plane sharding (data-plane-sharding.ts)
- Integration partners (integration-control-plane.ts)
- Marketplace listings (marketplace-service.ts)
- Release train (release-train-service.ts)
- Imaging worklist (imaging-worklist.ts)

Phase 533 extracts the common pattern into a typed, reusable framework.

## Implementation Steps

### Step 1: Create FSM framework

Create `apps/api/src/workflow/fsm.ts`:

- Generic `StateMachine<TState extends string>` class
- Constructor takes transition map `Record<TState, TState[]>`
- `canTransition(from, to): boolean`
- `transition(from, to): TState` (throws on invalid)
- `validNextStates(from): TState[]`
- `toMermaid(): string` (generates Mermaid state diagram)

### Step 2: Create switchboard service

Create `apps/api/src/workflow/switchboard.ts`:

- Registry of named workflow FSMs: `Map<string, WorkflowRegistration>`
- `registerWorkflow(name, fsm, options)` at startup
- `getWorkflowStatus(name)` returns live instance counts per state
- `getAllWorkflows()` returns summary of all registered workflows
- In-memory event log (ring buffer, max 10K events)
- Each transition emits `{ workflow, instanceId, from, to, actor, timestamp }`

### Step 3: Create routes

Create `apps/api/src/workflow/switchboard-routes.ts`:

- `GET /workflow/switchboard` — all registered workflows + summary
- `GET /workflow/switchboard/:name` — single workflow detail + state diagram
- `GET /workflow/switchboard/events` — recent transition events (admin)

### Step 4: Register existing FSMs

Wire the existing FSMs into the switchboard at startup. Don't refactor the
existing implementations — just register their transition maps so the
switchboard can report on them.

### Step 5: UI panel

Create or extend `apps/web/src/app/cprs/admin/workflows/page.tsx`:

- Switchboard tab showing all registered workflows
- State diagram visualization (Mermaid)
- Recent events stream

### Step 6: Evidence + verifier

## Files Changed/Created

- `apps/api/src/workflow/fsm.ts` (new)
- `apps/api/src/workflow/switchboard.ts` (new)
- `apps/api/src/workflow/switchboard-routes.ts` (new)
- `apps/api/src/workflow/index.ts` (new barrel)
- `apps/web/src/app/cprs/admin/workflows/page.tsx` (modify or create)
- `scripts/verify-phase533-workflow-switchboard.ps1` (new)
- `evidence/wave-39/533-W39-P3-WORKFLOW-SWITCHBOARD/` (new)
