/**
 * VistaRpcBridge -- Class-based facade over the existing XWB RPC Broker client.
 *
 * This wraps the battle-tested rpcBrokerClient.ts (768 lines) and
 * rpc-resilience.ts (499 lines) into a clean OOP interface that can be
 * instantiated with explicit connection parameters.
 *
 * The underlying client implements the full XWB protocol from scratch:
 *   TCPConnect -> XUS SIGNON SETUP -> XUS AV CODE -> XWB CREATE CONTEXT
 * with cipher pad encryption, async mutex, circuit breaker, and more.
 *
 * Phase P1-1: VistA RPC Bridge -- Verified Live Connection
 */

import {
  connect as brokerConnect,
  disconnect as brokerDisconnect,
  callRpc as brokerCallRpc,
  getDuz,
  withBrokerLock,
} from '../vista/rpcBrokerClient.js';
import { safeCallRpc, getCircuitBreakerStats } from '../lib/rpc-resilience.js';
import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface VistaRpcBridgeConfig {
  host: string;
  port: number;
  accessCode: string;
  verifyCode: string;
  division?: string;
}

export interface RpcCallResult {
  rpcName: string;
  params: string[];
  response: string;
  responseLines: string[];
  durationMs: number;
  success: boolean;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 5_000;

/* ------------------------------------------------------------------ */
/* VistaRpcBridge                                                      */
/* ------------------------------------------------------------------ */

export class VistaRpcBridge {
  private _config: VistaRpcBridgeConfig;
  private _connected = false;
  private _duz = '';

  constructor(config: VistaRpcBridgeConfig) {
    this._config = { ...config };
  }

  /** Whether the bridge has an active authenticated session. */
  get isConnected(): boolean {
    return this._connected;
  }

  /** The DUZ (internal user ID) of the authenticated session. */
  get duz(): string {
    return this._duz;
  }

  /* ---------------------------------------------------------------- */
  /* connect                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Authenticate to VistA using the configured credentials.
   *
   * Sets VISTA_* env vars to match the config (the underlying client
   * reads from process.env) and delegates to `connect()` which performs
   * the full XWB handshake: TCPConnect -> SIGNON SETUP -> AV CODE -> CREATE CONTEXT.
   *
   * Auto-reconnect: retries up to 3 times with 5 s delay on failure.
   */
  async connect(): Promise<void> {
    // Inject config into process.env so the singleton broker picks it up
    this.applyEnv();

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RECONNECT_ATTEMPTS; attempt++) {
      try {
        const start = Date.now();
        await brokerConnect();
        const elapsed = Date.now() - start;

        this._connected = true;
        this._duz = getDuz();

        log.info('VistaRpcBridge connected', {
          host: this._config.host,
          port: this._config.port,
          duz: this._duz,
          durationMs: elapsed,
          attempt,
        });
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        log.warn('VistaRpcBridge connect failed', {
          attempt,
          maxAttempts: MAX_RECONNECT_ATTEMPTS,
          error: lastError.message,
        });

        if (attempt < MAX_RECONNECT_ATTEMPTS) {
          await this.sleep(RECONNECT_DELAY_MS);
        }
      }
    }

    this._connected = false;
    throw new Error(
      `VistA connection failed after ${MAX_RECONNECT_ATTEMPTS} attempts: ${lastError?.message ?? 'unknown'}`
    );
  }

  /* ---------------------------------------------------------------- */
  /* disconnect                                                        */
  /* ---------------------------------------------------------------- */

  /** Gracefully disconnect from the VistA broker. */
  async disconnect(): Promise<void> {
    try {
      brokerDisconnect();
      log.info('VistaRpcBridge disconnected');
    } finally {
      this._connected = false;
      this._duz = '';
    }
  }

  /* ---------------------------------------------------------------- */
  /* call                                                              */
  /* ---------------------------------------------------------------- */

  /**
   * Call a named RPC with string parameters.
   *
   * Uses the resilient wrapper (`safeCallRpc`) which adds:
   *   - async mutex (serialized socket access)
   *   - auto-reconnect (re-authenticates if socket is stale)
   *   - circuit breaker (5 failures -> open, 30 s half-open)
   *   - timeout (default 15 s)
   *   - retry with exponential backoff (2 retries)
   *
   * Falls back to raw `callRpc` via `withBrokerLock` if the resilience
   * layer is not needed (direct mode).
   *
   * Every call is logged with name, params, duration, and success/fail.
   *
   * @throws Error if not connected or RPC fails after retries
   */
  async call(rpcName: string, params: string[] = []): Promise<string> {
    if (!this._connected) {
      throw new Error(`Not connected -- call connect() before calling RPCs`);
    }

    const start = Date.now();
    let responseLines: string[] = [];
    let success = false;
    let errorMsg: string | undefined;

    try {
      // Use the resilient path (mutex + reconnect + circuit breaker + retry)
      responseLines = await safeCallRpc(rpcName, params);
      success = true;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      errorMsg = e.message;

      // If circuit breaker opened or connection died, mark disconnected
      const cbStats = getCircuitBreakerStats();
      if (cbStats.state === 'open') {
        this._connected = false;
      }

      throw new Error(`RPC "${rpcName}" failed: ${e.message}`);
    } finally {
      const durationMs = Date.now() - start;
      const response = responseLines.join('\n');

      log.info('VistaRpcBridge RPC call', {
        rpcName,
        paramCount: params.length,
        durationMs,
        success,
        responseLength: response.length,
        ...(errorMsg ? { error: errorMsg } : {}),
      });
    }

    return responseLines.join('\n');
  }

  /* ---------------------------------------------------------------- */
  /* callDirect -- raw call without resilience layer                    */
  /* ---------------------------------------------------------------- */

  /**
   * Call an RPC directly through the broker lock without circuit breaker
   * or retry. Useful for write operations that must not be retried.
   */
  async callDirect(rpcName: string, params: string[] = []): Promise<string> {
    if (!this._connected) {
      throw new Error(`Not connected -- call connect() before calling RPCs`);
    }

    const start = Date.now();
    let responseLines: string[] = [];

    try {
      responseLines = await withBrokerLock(async () => {
        return brokerCallRpc(rpcName, params);
      });

      log.info('VistaRpcBridge RPC callDirect', {
        rpcName,
        paramCount: params.length,
        durationMs: Date.now() - start,
        success: true,
        responseLength: responseLines.join('\n').length,
      });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      log.warn('VistaRpcBridge RPC callDirect failed', {
        rpcName,
        durationMs: Date.now() - start,
        error: e.message,
      });
      throw new Error(`RPC "${rpcName}" failed: ${e.message}`);
    }

    return responseLines.join('\n');
  }

  /* ---------------------------------------------------------------- */
  /* Helpers                                                           */
  /* ---------------------------------------------------------------- */

  /** Push config into process.env for the singleton broker. */
  private applyEnv(): void {
    process.env.VISTA_HOST = this._config.host;
    process.env.VISTA_PORT = String(this._config.port);
    process.env.VISTA_ACCESS_CODE = this._config.accessCode;
    process.env.VISTA_VERIFY_CODE = this._config.verifyCode;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
