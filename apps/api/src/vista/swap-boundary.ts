/**
 * VistA Swap Boundary Contract -- Phase 148
 *
 * Defines the typed interface that ANY VistA backend instance must satisfy
 * to be compatible with the VistA-Evolved API layer. This enables swapping
 * between:
 *   - WorldVistA demo Docker sandbox (services/vista/)
 *   - VistA Distro Lane production image (services/vista-distro/)
 *   - Any future VistA instance (VA, IHS, DoD, etc.)
 *
 * The swap boundary is NOT an adapter -- it's a compatibility contract.
 * The actual RPC calls go through rpcBrokerClient.ts which implements
 * the XWB protocol. This contract describes what the target must support.
 *
 * Swap procedure:
 *   1. Point VISTA_HOST + VISTA_PORT to the new instance
 *   2. Provide valid VISTA_ACCESS_CODE + VISTA_VERIFY_CODE
 *   3. Run scripts/verify-vista-compat.ps1 to confirm boundary
 *   4. Restart the API
 */

// ---- Probe Contract ----

/** TCP connectivity probe result */
export interface VistaPingResult {
  /** Whether TCP connection to broker port succeeded */
  ok: boolean;
  /** Host that was probed */
  host: string;
  /** Port that was probed */
  port: number;
  /** Response time in milliseconds */
  latencyMs?: number;
  /** Error message if probe failed */
  error?: string;
}

// ---- Auth Contract ----

/** Authentication result shape */
export interface VistaAuthResult {
  /** Whether authentication succeeded */
  ok: boolean;
  /** DUZ (internal user number) if authenticated */
  duz?: string;
  /** User display name if available */
  userName?: string;
  /** Error message if auth failed */
  error?: string;
}

// ---- RPC Contract ----

/** Minimum RPC call contract */
export interface VistaRpcCallResult {
  /** RPC name that was called */
  rpcName: string;
  /** Whether the call succeeded (got a response, even if empty) */
  ok: boolean;
  /** Raw response lines from VistA */
  lines?: string[];
  /** Error if call failed */
  error?: string;
}

// ---- RPC Catalog Entry ----

/** Single RPC in the catalog snapshot */
export interface RpcCatalogEntry {
  /** RPC name as registered in VistA File 8994 */
  name: string;
  /** Whether this RPC is expected to be available */
  required: boolean;
  /** Domain category */
  domain?: string;
  /** Notes about sandbox behavior */
  note?: string;
}

// ---- Swap Boundary Contract ----

/**
 * The full swap boundary contract. Any VistA instance must satisfy ALL
 * of these capabilities to be a valid swap target.
 */
export interface VistaSwapBoundary {
  /** Unique identifier for this VistA instance */
  instanceId: string;

  /** Human-readable label (e.g., "WorldVistA Docker Sandbox", "VistA Distro Lane") */
  label: string;

  /** Version of the swap boundary contract */
  contractVersion: "1.0.0";

  /** Connection parameters */
  connection: {
    host: string;
    port: number;
    /** Protocol: always "xwb" for XWB RPC Broker */
    protocol: "xwb";
  };

  /** Required capabilities */
  capabilities: {
    /** TCP probe must succeed */
    tcpProbe: boolean;
    /** XUS SIGNON SETUP + XUS AV CODE must work */
    rpcAuth: boolean;
    /** XWB CREATE CONTEXT for "OR CPRS GUI CHART" must succeed */
    cprsContext: boolean;
    /** Basic RPC calls (read operations) must return data */
    rpcRead: boolean;
  };

  /** Security posture */
  security: {
    /** Credentials source: "env" (environment variables) or "secrets" (Docker/K8s secrets) */
    credentialSource: "env" | "secrets";
    /** Whether default/demo credentials are present (should be false in prod) */
    hasDefaultCredentials: boolean;
    /** Whether SSH is exposed (should be false in prod) */
    sshExposed: boolean;
    /** Network interfaces the broker listens on */
    brokerBind: string;
  };

  /** Health probes */
  probes: {
    /** TCP probe endpoint (for Docker HEALTHCHECK / K8s readiness) */
    readiness: { type: "tcp"; port: number };
    /** More thorough health check (optional: RPC-based) */
    liveness?: { type: "rpc"; rpcName: string };
  };
}

// ---- Helpers ----

/** Parse VISTA_PORT with NaN defence (F1 audit fix) */
function parsePort(fallback: number): number {
  const raw = process.env.VISTA_PORT;
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? fallback : n;
}

// ---- Factory Functions ----

/** Build a swap boundary descriptor for the dev sandbox */
export function devSandboxBoundary(): VistaSwapBoundary {
  return {
    instanceId: "worldvista-docker-sandbox",
    label: "WorldVistA Docker Sandbox",
    contractVersion: "1.0.0",
    connection: {
      host: process.env.VISTA_HOST || "127.0.0.1",
      port: parsePort(9430),
      protocol: "xwb",
    },
    capabilities: {
      tcpProbe: true,
      rpcAuth: true,
      cprsContext: true,
      rpcRead: true,
    },
    security: {
      credentialSource: "env",
      hasDefaultCredentials: true, // WorldVistA ships with PROV123/etc.
      sshExposed: true,           // WorldVistA exposes port 22
      brokerBind: "0.0.0.0",
    },
    probes: {
      readiness: { type: "tcp", port: parsePort(9430) },
      liveness: { type: "rpc", rpcName: "XUS SIGNON SETUP" },
    },
  };
}

/** Build a swap boundary descriptor for the distro lane */
export function distroLaneBoundary(): VistaSwapBoundary {
  return {
    instanceId: "vista-distro-lane",
    label: "VistA Distro Lane (Production)",
    contractVersion: "1.0.0",
    connection: {
      host: process.env.VISTA_HOST || "127.0.0.1",
      port: parsePort(9431),
      protocol: "xwb",
    },
    capabilities: {
      tcpProbe: true,
      rpcAuth: true,
      cprsContext: true,
      rpcRead: true,
    },
    security: {
      credentialSource: "env",
      hasDefaultCredentials: false, // No baked-in credentials
      sshExposed: false,           // SSH disabled
      brokerBind: "0.0.0.0",
    },
    probes: {
      readiness: { type: "tcp", port: parsePort(9431) },
      liveness: { type: "rpc", rpcName: "XUS SIGNON SETUP" },
    },
  };
}

/** Get the active swap boundary based on current env config */
export function activeSwapBoundary(): VistaSwapBoundary {
  const port = parsePort(9430);
  // Heuristic: port 9431 = distro lane, 9430 = dev sandbox
  // In practice, the VISTA_INSTANCE_ID env var is more reliable
  const instanceId = process.env.VISTA_INSTANCE_ID || (port === 9431 ? "vista-distro-lane" : "worldvista-docker-sandbox");

  if (instanceId === "vista-distro-lane") {
    return distroLaneBoundary();
  }
  return devSandboxBoundary();
}

/**
 * Validate that a VistA instance satisfies the swap boundary contract.
 * Returns a list of failures (empty = all good).
 */
export function validateSwapBoundary(
  boundary: VistaSwapBoundary,
  probeResults: {
    tcpOk: boolean;
    authOk: boolean;
    contextOk: boolean;
    rpcReadOk: boolean;
  }
): string[] {
  const failures: string[] = [];

  if (boundary.capabilities.tcpProbe && !probeResults.tcpOk) {
    failures.push(`TCP probe failed on ${boundary.connection.host}:${boundary.connection.port}`);
  }
  if (boundary.capabilities.rpcAuth && !probeResults.authOk) {
    failures.push("RPC authentication failed (XUS SIGNON SETUP + XUS AV CODE)");
  }
  if (boundary.capabilities.cprsContext && !probeResults.contextOk) {
    failures.push('CPRS context failed (XWB CREATE CONTEXT for "OR CPRS GUI CHART")');
  }
  if (boundary.capabilities.rpcRead && !probeResults.rpcReadOk) {
    failures.push("Basic RPC read failed (could not call any read RPC)");
  }

  return failures;
}
