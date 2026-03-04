# Phase 533 — VERIFY: Workflow State Switchboard

## Gates (12)

| Gate | Check                                                                         |
| ---- | ----------------------------------------------------------------------------- |
| G1   | `apps/api/src/workflow/fsm.ts` exists with `StateMachine` class               |
| G2   | `canTransition`, `transition`, `validNextStates`, `toMermaid` methods present |
| G3   | `apps/api/src/workflow/switchboard.ts` exists                                 |
| G4   | `registerWorkflow`, `getAllWorkflows`, `getWorkflowStatus` functions present  |
| G5   | `apps/api/src/workflow/switchboard-routes.ts` exists                          |
| G6   | Routes registered for `/workflow/switchboard`                                 |
| G7   | At least 3 existing FSMs registered in switchboard                            |
| G8   | Mermaid state diagram generation works (contains `stateDiagram-v2`)           |
| G9   | Admin workflows page exists in web app                                        |
| G10  | TypeScript compiles without errors in workflow files                          |
| G11  | No PHI in workflow events or switchboard responses                            |
| G12  | Evidence directory exists                                                     |
