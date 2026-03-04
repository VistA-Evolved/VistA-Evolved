/**
 * Reusable typed Finite State Machine framework
 * Phase 533 (Wave 39 P3)
 *
 * Extracts the common Record<From, To[]> pattern used across 6+ FSM
 * implementations into a single generic, validated class.
 */

export interface TransitionEvent<TState extends string = string> {
  workflow: string;
  instanceId: string;
  from: TState;
  to: TState;
  actor: string;
  timestamp: string;
  detail?: string;
}

export interface StateMachineOptions<TState extends string> {
  /** Human-readable name for this state machine */
  name: string;
  /** Initial state for new instances */
  initialState: TState;
  /** Terminal states (no outgoing transitions) */
  terminalStates?: TState[];
}

/**
 * Generic typed state machine.
 * TState must be a string union type (e.g., ClaimStatus).
 */
export class StateMachine<TState extends string> {
  readonly name: string;
  readonly initialState: TState;
  readonly terminalStates: ReadonlySet<TState>;
  private readonly transitions: Readonly<Record<TState, readonly TState[]>>;
  private readonly allStates: ReadonlySet<TState>;

  constructor(transitions: Record<TState, TState[]>, options: StateMachineOptions<TState>) {
    this.transitions = transitions;
    this.name = options.name;
    this.initialState = options.initialState;

    // Collect all states from both keys and values
    const states = new Set<TState>();
    for (const [from, tos] of Object.entries(transitions) as [TState, TState[]][]) {
      states.add(from);
      for (const to of tos) states.add(to);
    }
    this.allStates = states;

    this.terminalStates = new Set(
      options.terminalStates ??
        ([...states].filter((s) => !transitions[s] || transitions[s].length === 0) as TState[])
    );
  }

  /** Check if transition from -> to is allowed */
  canTransition(from: TState, to: TState): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }

  /** Execute transition, throws if invalid */
  transition(from: TState, to: TState): TState {
    if (!this.canTransition(from, to)) {
      throw new Error(
        `Invalid transition: ${this.name} cannot go from "${from}" to "${to}". ` +
          `Valid: [${this.validNextStates(from).join(', ')}]`
      );
    }
    return to;
  }

  /** Get all valid next states from a given state */
  validNextStates(from: TState): TState[] {
    return [...(this.transitions[from] ?? [])];
  }

  /** Get all states in this machine */
  getStates(): TState[] {
    return [...this.allStates];
  }

  /** Check if a state is terminal (no outgoing transitions) */
  isTerminal(state: TState): boolean {
    return this.terminalStates.has(state);
  }

  /** Generate Mermaid state diagram */
  toMermaid(): string {
    const lines: string[] = ['stateDiagram-v2'];
    lines.push(`  [*] --> ${this.initialState}`);

    for (const [from, tos] of Object.entries(this.transitions) as [TState, TState[]][]) {
      for (const to of tos) {
        lines.push(`  ${from} --> ${to}`);
      }
    }

    for (const t of this.terminalStates) {
      lines.push(`  ${t} --> [*]`);
    }

    return lines.join('\n');
  }

  /** Serialize to plain object for JSON responses */
  toJSON(): {
    name: string;
    initialState: TState;
    terminalStates: TState[];
    states: TState[];
    transitions: Record<string, string[]>;
  } {
    return {
      name: this.name,
      initialState: this.initialState,
      terminalStates: [...this.terminalStates],
      states: this.getStates(),
      transitions: { ...this.transitions } as unknown as Record<string, string[]>,
    };
  }
}
