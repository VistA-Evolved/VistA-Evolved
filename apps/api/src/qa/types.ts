/**
 * QA/Audit OS -- Type Definitions
 *
 * Phase 96B: QA/Audit OS v1.1
 */

/* -- RPC Trace ---------------------------------------------- */

export interface RpcTraceEntry {
  /** Unique trace entry ID */
  id: string;
  /** Request ID from AsyncLocalStorage */
  requestId: string;
  /** OTel trace ID (if available) */
  traceId?: string;
  /** RPC name called */
  rpcName: string;
  /** Parameters (PHI-redacted) */
  params: string[];
  /** Duration in ms */
  durationMs: number;
  /** Whether the call succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Response line count */
  responseLines: number;
  /** DUZ of the calling user (hashed) */
  duzHash: string;
  /** Timestamp ISO 8601 */
  timestamp: string;
  /** HTTP route that triggered this RPC */
  httpRoute?: string;
  /** HTTP method */
  httpMethod?: string;
}

export interface RpcTraceStats {
  totalCalls: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  p95DurationMs: number;
  topRpcs: Array<{ rpcName: string; count: number; avgMs: number }>;
  errorRate: number;
  bufferSize: number;
  maxBufferSize: number;
  oldestEntry?: string;
  newestEntry?: string;
}

/* -- QA Flow ------------------------------------------------ */

export interface QaFlowStep {
  /** Step number (1-based) */
  step: number;
  /** Human description */
  description?: string;
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** API path (may contain {{variables}}) */
  path: string;
  /** Request body template (may contain {{variables}}) */
  body?: Record<string, unknown>;
  /** Additional request headers */
  headers?: Record<string, string>;
  /** Expected HTTP status (omit for any-status-passes) */
  expectedStatus?: number;
  /** Fields to extract from response for later steps */
  extract?: Record<string, string>;
  /** Assertions on response body (JSONPath -> expected) */
  assertions?: Record<string, unknown>;
  /** RPCs expected to fire during this specific step */
  expectedRpcs?: string[];
  /** Whether this step can fail without failing the flow */
  optional?: boolean;
  /** Delay in ms before executing this step */
  delayMs?: number;
}

export interface QaFlow {
  /** Unique flow ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Which clinical domain this flow covers */
  domain: string;
  /** Priority: smoke (always run), regression (CI), deep (manual) */
  priority: 'smoke' | 'regression' | 'deep';
  /** Description of what the flow tests */
  description?: string;
  /** Steps to execute in order */
  steps: QaFlowStep[];
  /** Variables that must be provided (e.g. patientDfn) */
  requiredVariables?: string[];
  /** Tags for filtering */
  tags?: string[];
  /** VistA RPC names expected during flow execution */
  expectedRpcs?: string[];
  /** Primary web UI route the flow exercises */
  uiRoute?: string | null;
}

export interface QaFlowResult {
  flowId: string;
  flowName: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  status: 'passed' | 'failed' | 'partial';
  stepResults: QaStepResult[];
  variables: Record<string, string>;
}

export interface QaStepResult {
  step: number;
  description?: string;
  path: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  httpStatus?: number;
  error?: string;
  extracted?: Record<string, string>;
}

/* -- Dead Click --------------------------------------------- */

export interface DeadClickEntry {
  /** Page URL/path where the dead click was found */
  page: string;
  /** CSS selector of the element */
  selector: string;
  /** Element text content (truncated) */
  text: string;
  /** Element tag + type */
  elementType: string;
  /** Whether it has an onClick handler */
  hasOnClick: boolean;
  /** Whether the click produced any navigation or network request */
  producedEffect: boolean;
  /** Whether the element is visually disabled */
  visuallyDisabled: boolean;
  /** Timestamp */
  detectedAt: string;
}
