/**
 * Workflow module barrel + switchboard initialization
 * Phase 533 (Wave 39 P3)
 */

export { StateMachine, type TransitionEvent } from "./fsm.js";
export {
  registerWorkflow,
  getAllWorkflows,
  getWorkflow,
  getRecentEvents,
  recordTransition,
  getRegisteredCount,
  resetSwitchboard,
} from "./switchboard.js";
export { switchboardRoutes } from "./switchboard-routes.js";

import { StateMachine } from "./fsm.js";
import { registerWorkflow } from "./switchboard.js";
import { CLAIM_TRANSITIONS } from "../rcm/domain/claim.js";

/**
 * Register all known FSMs into the switchboard.
 * Called once at server startup.
 */
export function initSwitchboard(): void {
  // --- 1. RCM Claim FSM (Phase 38) ---
  registerWorkflow({
    name: "rcm-claim",
    description:
      "Revenue cycle claim lifecycle: draft through payment/denial/appeal",
    domain: "rcm",
    phase: 38,
    fsm: new StateMachine(CLAIM_TRANSITIONS, {
      name: "RCM Claim",
      initialState: "draft",
      terminalStates: ["closed"],
    }),
  });

  // --- 2. Workflow Inbox Tasks (Phase 350) ---
  // Transition map derived from VALID_TRANSITION_SOURCES (not exported)
  const TASK_TRANSITIONS: Record<string, string[]> = {
    pending: ["assigned", "cancelled", "escalated"],
    assigned: ["in_progress", "cancelled", "escalated", "deferred"],
    in_progress: ["completed", "cancelled", "escalated", "deferred"],
    completed: [],
    cancelled: [],
    escalated: ["assigned", "in_progress"],
    deferred: ["assigned", "in_progress", "cancelled"],
  };
  registerWorkflow({
    name: "workflow-task",
    description: "Workflow inbox task lifecycle: pending through completion",
    domain: "clinical",
    phase: 350,
    fsm: new StateMachine(TASK_TRANSITIONS, {
      name: "Workflow Task",
      initialState: "pending",
      terminalStates: ["completed", "cancelled"],
    }),
  });

  // --- 3. Imaging Worklist (Phase 23) ---
  // No formal transition map in original — defining logical progression
  const WORKLIST_TRANSITIONS: Record<string, string[]> = {
    ordered: ["scheduled", "in-progress", "cancelled", "discontinued"],
    scheduled: ["in-progress", "cancelled", "discontinued"],
    "in-progress": ["completed", "cancelled", "discontinued"],
    completed: [],
    cancelled: [],
    discontinued: [],
  };
  registerWorkflow({
    name: "imaging-worklist",
    description: "Imaging order lifecycle: ordered through completion",
    domain: "imaging",
    phase: 23,
    fsm: new StateMachine(WORKLIST_TRANSITIONS, {
      name: "Imaging Worklist",
      initialState: "ordered",
      terminalStates: ["completed", "cancelled", "discontinued"],
    }),
  });

  // --- 4. Department Workflow Instance (Phase 160) ---
  const INSTANCE_TRANSITIONS: Record<string, string[]> = {
    not_started: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };
  registerWorkflow({
    name: "department-workflow",
    description:
      "Department workflow instance lifecycle: start through completion",
    domain: "clinical",
    phase: 160,
    fsm: new StateMachine(INSTANCE_TRANSITIONS, {
      name: "Department Workflow",
      initialState: "not_started",
      terminalStates: ["completed", "cancelled"],
    }),
  });

  // --- 5. EDI Pipeline (Phase 38) ---
  const EDI_TRANSITIONS: Record<string, string[]> = {
    created: ["validated", "closed"],
    validated: ["transformed", "closed"],
    transformed: ["enqueued", "closed"],
    enqueued: ["transmitted", "closed"],
    transmitted: ["acknowledged", "closed"],
    acknowledged: ["accepted", "rejected", "closed"],
    accepted: ["adjudicated", "closed"],
    rejected: ["created", "closed"],
    adjudicated: ["posted", "closed"],
    posted: ["reconciled", "closed"],
    reconciled: [],
    closed: [],
  };
  registerWorkflow({
    name: "edi-pipeline",
    description: "EDI claim pipeline: 10-stage from creation to reconciliation",
    domain: "rcm",
    phase: 38,
    fsm: new StateMachine(EDI_TRANSITIONS, {
      name: "EDI Pipeline",
      initialState: "created",
      terminalStates: ["reconciled", "closed"],
    }),
  });
}
