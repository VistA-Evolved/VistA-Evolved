/**
 * types.ts -- VistA + CPRS Alignment Verification Pack (Phase 161)
 *
 * Data structures for golden traces, RPC tripwires, alignment scoring,
 * and verification snapshots.
 */

/* ------------------------------------------------------------------ */
/*  Golden Trace: snapshot of RPC behavior at a point in time          */
/* ------------------------------------------------------------------ */
export interface GoldenTraceEntry {
  rpcName: string;
  domain: string;
  tag: string;
  /** Expected response shape (JSON schema fragment or sample) */
  expectedShape: string;
  /** Timestamp when this trace was captured */
  capturedAt: string;
  /** Whether the RPC returned data successfully */
  success: boolean;
  /** Response size in bytes (approximate) */
  responseBytes: number;
  /** Elapsed time in ms */
  elapsedMs: number;
  /** Error message if failed */
  error?: string;
}

export interface GoldenSnapshot {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  /** ISO 8601 */
  capturedAt: string;
  capturedBy: string;
  traces: GoldenTraceEntry[];
  /** Registry size at capture time */
  registrySize: number;
  /** Exception count at capture time */
  exceptionCount: number;
  /** Overall pass rate (0-100) */
  passRate: number;
}

export interface SnapshotComparison {
  baselineId: string;
  currentId: string;
  /** RPCs that were passing in baseline but failing now */
  regressions: GoldenTraceEntry[];
  /** RPCs that were failing in baseline but passing now */
  improvements: GoldenTraceEntry[];
  /** RPCs added since baseline */
  newRpcs: string[];
  /** RPCs removed since baseline */
  removedRpcs: string[];
  /** Overall alignment delta (positive = improvement) */
  alignmentDelta: number;
}

/* ------------------------------------------------------------------ */
/*  RPC Tripwire: detect unexpected behavior changes                   */
/* ------------------------------------------------------------------ */
export type TripwireCondition =
  | 'response_empty'
  | 'response_error'
  | 'timeout'
  | 'schema_mismatch'
  | 'new_rpc_unregistered'
  | 'registry_drift';

export interface RpcTripwire {
  id: string;
  rpcName: string;
  condition: TripwireCondition;
  /** Whether this tripwire is currently active */
  enabled: boolean;
  /** How many times this tripwire has fired */
  fireCount: number;
  /** Last time this tripwire fired */
  lastFiredAt?: string;
  /** Custom threshold (e.g., timeout ms) */
  threshold?: number;
  /** Description of what this tripwire catches */
  description: string;
  createdAt: string;
}

export interface TripwireEvent {
  id: string;
  tripwireId: string;
  rpcName: string;
  condition: TripwireCondition;
  detail: string;
  firedAt: string;
  /** Whether this was auto-resolved */
  resolved: boolean;
  resolvedAt?: string;
}

/* ------------------------------------------------------------------ */
/*  Alignment Scoring                                                  */
/* ------------------------------------------------------------------ */
export interface PanelAlignmentScore {
  panel: string;
  /** 0-100 */
  score: number;
  totalRpcs: number;
  wiredRpcs: number;
  pendingRpcs: string[];
  /** Are all routes functional? */
  routesHealthy: boolean;
  /** VistA integration depth: "full" | "partial" | "stub" | "none" */
  depth: 'full' | 'partial' | 'stub' | 'none';
  /** List of VistA files referenced */
  vistaFiles: string[];
  /** Tags from the wiring metadata */
  tags: string[];
}

export interface AlignmentScore {
  /** Overall system alignment 0-100 */
  globalScore: number;
  /** Per-panel breakdown */
  panels: PanelAlignmentScore[];
  /** Registry health summary */
  registry: {
    totalRegistered: number;
    totalExceptions: number;
    liveWired: number;
    registeredOnly: number;
    stubs: number;
    cprsGap: number;
  };
  /** Scoring timestamp */
  scoredAt: string;
  /** Number of panels with full VistA wiring */
  fullyWiredPanels: number;
  /** Number of panels with partial wiring */
  partiallyWiredPanels: number;
  /** Number of panels with no VistA RPCs */
  noVistaPanels: number;
}

/* ------------------------------------------------------------------ */
/*  Alignment Verification Gate                                        */
/* ------------------------------------------------------------------ */
export type GateStatus = 'pass' | 'fail' | 'warn' | 'skip';

export interface AlignmentGate {
  id: string;
  name: string;
  description: string;
  status: GateStatus;
  detail: string;
  checkedAt: string;
}

export interface AlignmentReport {
  id: string;
  tenantId: string;
  gates: AlignmentGate[];
  passCount: number;
  failCount: number;
  warnCount: number;
  overallStatus: GateStatus;
  generatedAt: string;
}
