/**
 * Workflow State Switchboard -- centralized registry of all FSMs
 * Phase 533 (Wave 39 P3)
 *
 * Routes workflow state transitions, emits events, provides a single
 * dashboard view of all active workflows across the system.
 */

import { StateMachine, type TransitionEvent } from './fsm.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowRegistration {
  name: string;
  description: string;
  domain: string;
  fsm: StateMachine<string>;
  phase?: number;
  /** Callback invoked on each transition (optional) */
  onTransition?: (event: TransitionEvent) => void;
}

export interface WorkflowSummary {
  name: string;
  description: string;
  domain: string;
  phase?: number;
  stateCount: number;
  transitionCount: number;
  initialState: string;
  terminalStates: string[];
}

export interface SwitchboardStatus {
  registeredWorkflows: number;
  totalEvents: number;
  workflows: WorkflowSummary[];
}

// ---------------------------------------------------------------------------
// Event ring buffer
// ---------------------------------------------------------------------------

const MAX_EVENTS = 10_000;
const eventLog: TransitionEvent[] = [];

function pushEvent(event: TransitionEvent): void {
  eventLog.push(event);
  if (eventLog.length > MAX_EVENTS) {
    eventLog.splice(0, eventLog.length - MAX_EVENTS);
  }
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const registry = new Map<string, WorkflowRegistration>();

/**
 * Register a workflow FSM in the switchboard.
 * Idempotent -- re-registration with same name overwrites.
 */
export function registerWorkflow(reg: WorkflowRegistration): void {
  registry.set(reg.name, reg);
}

/** Unregister a workflow (for tests) */
export function unregisterWorkflow(name: string): void {
  registry.delete(name);
}

/** Get a single workflow registration */
export function getWorkflow(name: string): WorkflowRegistration | undefined {
  return registry.get(name);
}

/** Get status of all registered workflows */
export function getAllWorkflows(): SwitchboardStatus {
  const workflows: WorkflowSummary[] = [];
  for (const reg of registry.values()) {
    const states = reg.fsm.getStates();
    let transitionCount = 0;
    for (const s of states) {
      transitionCount += reg.fsm.validNextStates(s).length;
    }
    workflows.push({
      name: reg.name,
      description: reg.description,
      domain: reg.domain,
      phase: reg.phase,
      stateCount: states.length,
      transitionCount,
      initialState: reg.fsm.initialState,
      terminalStates: [...reg.fsm.terminalStates],
    });
  }
  return {
    registeredWorkflows: registry.size,
    totalEvents: eventLog.length,
    workflows,
  };
}

/**
 * Record a state transition event.
 * Validates the transition against the FSM, pushes to event log,
 * and calls the optional onTransition callback.
 */
export function recordTransition(
  workflowName: string,
  instanceId: string,
  from: string,
  to: string,
  actor: string,
  detail?: string
): TransitionEvent {
  const reg = registry.get(workflowName);
  if (!reg) {
    throw new Error(`Workflow "${workflowName}" not registered in switchboard`);
  }
  // Validate transition
  reg.fsm.transition(from, to);

  const event: TransitionEvent = {
    workflow: workflowName,
    instanceId,
    from,
    to,
    actor,
    timestamp: new Date().toISOString(),
    detail,
  };
  pushEvent(event);
  reg.onTransition?.(event);
  return event;
}

/**
 * Get recent transition events, optionally filtered by workflow name.
 */
export function getRecentEvents(
  opts: { workflow?: string; limit?: number } = {}
): TransitionEvent[] {
  const limit = opts.limit ?? 100;
  let events = eventLog;
  if (opts.workflow) {
    events = events.filter((e) => e.workflow === opts.workflow);
  }
  return events.slice(-limit);
}

/** Get count of registered workflows */
export function getRegisteredCount(): number {
  return registry.size;
}

/** Clear all registrations and events (for tests) */
export function resetSwitchboard(): void {
  registry.clear();
  eventLog.length = 0;
}
