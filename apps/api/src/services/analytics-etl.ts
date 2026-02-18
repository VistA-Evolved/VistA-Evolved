/**
 * Analytics ETL Writer — Phase 25.
 *
 * Syncs aggregated MetricBuckets from the in-memory analytics engine
 * to the Octo/ROcto SQL layer for BI tool consumption.
 *
 * Uses a minimal PostgreSQL Simple Query protocol client over TCP.
 * Non-blocking: failures are logged but never crash the API.
 *
 * Architecture:
 *   - Registers a callback with the analytics aggregator
 *   - After each aggregation cycle, new buckets are INSERTed into Octo
 *   - Duplicate IDs are silently skipped (idempotent)
 *   - Connection is lazy and auto-reconnects on failure
 */

import { createConnection, type Socket } from "net";
import { createHash } from "crypto";
import { log } from "../lib/logger.js";
import { ANALYTICS_SQL_CONFIG } from "../config/analytics-config.js";
import { setOnBucketsCreated, type MetricBucket } from "./analytics-aggregator.js";

/* ================================================================== */
/* Minimal PostgreSQL Wire Protocol Client                              */
/* ================================================================== */

interface PgMessage {
  type: string;
  body: Buffer;
}

/**
 * Minimal PostgreSQL Simple Query protocol client.
 * Supports: StartupMessage, MD5/trust auth, Simple Query.
 * Good enough for INSERT/SELECT against ROcto.
 */
class PgSimpleClient {
  private sock: Socket | null = null;
  private _connected = false;
  private buf = Buffer.alloc(0);
  private msgQueue: PgMessage[] = [];
  private dataResolve: (() => void) | null = null;
  private msgReject: ((err: Error) => void) | null = null;

  get connected(): boolean {
    return this._connected;
  }

  constructor(
    private host: string,
    private port: number,
    private user: string,
    private password: string,
    private database: string,
  ) {}

  async connect(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const deadline = setTimeout(() => {
        this.disconnect();
        resolve(false);
      }, 10_000);

      try {
        this.sock = createConnection(
          { host: this.host, port: this.port },
          async () => {
            try {
              this.sendStartup();
              const ok = await this.handleAuth();
              clearTimeout(deadline);
              this._connected = ok;
              resolve(ok);
            } catch {
              clearTimeout(deadline);
              this.disconnect();
              resolve(false);
            }
          },
        );

        this.sock.on("data", (chunk) => {
          this.buf = Buffer.concat([this.buf, chunk]);
          this.parseMessages();
          if (this.dataResolve) {
            const r = this.dataResolve;
            this.dataResolve = null;
            r();
          }
        });

        this.sock.on("error", () => {
          clearTimeout(deadline);
          this._connected = false;
          if (this.msgReject) {
            this.msgReject(new Error("Socket error"));
            this.msgReject = null;
          }
          resolve(false);
        });

        this.sock.on("close", () => {
          this._connected = false;
          if (this.msgReject) {
            this.msgReject(new Error("Connection closed"));
            this.msgReject = null;
          }
        });
      } catch {
        clearTimeout(deadline);
        resolve(false);
      }
    });
  }

  /** Parse complete PG messages from the read buffer. */
  private parseMessages(): void {
    while (this.buf.length >= 5) {
      const type = String.fromCharCode(this.buf[0]);
      const len = this.buf.readInt32BE(1);
      if (this.buf.length < 1 + len) break;
      this.msgQueue.push({
        type,
        body: Buffer.from(this.buf.subarray(5, 1 + len)),
      });
      this.buf = this.buf.subarray(1 + len);
    }
  }

  /** Read next complete PG message (awaits data if needed). */
  private nextMessage(): Promise<PgMessage> {
    if (this.msgQueue.length > 0) {
      return Promise.resolve(this.msgQueue.shift()!);
    }
    return new Promise<PgMessage>((resolve, reject) => {
      this.msgReject = reject;
      const onData = () => {
        if (this.msgQueue.length > 0) {
          this.msgReject = null;
          resolve(this.msgQueue.shift()!);
        } else {
          this.dataResolve = onData;
        }
      };
      this.dataResolve = onData;
    });
  }

  /** Wait until ReadyForQuery ('Z') message. */
  private async waitForReady(): Promise<void> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const msg = await this.nextMessage();
      if (msg.type === "Z") return;
      if (msg.type === "E") throw new Error(this.parseError(msg.body));
      // Skip ParameterStatus ('S'), BackendKeyData ('K'), etc.
    }
  }

  /** Handle authentication handshake. */
  private async handleAuth(): Promise<boolean> {
    const msg = await this.nextMessage();
    if (msg.type !== "R") return false;

    const authType = msg.body.readInt32BE(0);
    if (authType === 0) {
      // AuthenticationOk (trust mode)
      await this.waitForReady();
      return true;
    }
    if (authType === 5) {
      // MD5 password
      const salt = msg.body.subarray(4, 8);
      this.sendMd5Password(salt);
      const okMsg = await this.nextMessage();
      if (okMsg.type !== "R" || okMsg.body.readInt32BE(0) !== 0) return false;
      await this.waitForReady();
      return true;
    }
    return false; // Unsupported auth method
  }

  /** Send StartupMessage (PG protocol v3.0). */
  private sendStartup(): void {
    const params = `user\0${this.user}\0database\0${this.database}\0\0`;
    const len = 4 + 4 + Buffer.byteLength(params);
    const msg = Buffer.alloc(len);
    msg.writeInt32BE(len, 0);
    msg.writeInt32BE(196608, 4); // Protocol version 3.0
    Buffer.from(params).copy(msg, 8);
    this.sock!.write(msg);
  }

  /** Send MD5-hashed password response. */
  private sendMd5Password(salt: Buffer): void {
    const inner = createHash("md5")
      .update(this.password + this.user)
      .digest("hex");
    const hash =
      "md5" +
      createHash("md5")
        .update(Buffer.concat([Buffer.from(inner), salt]))
        .digest("hex");
    const payload = Buffer.from(hash + "\0");
    const msg = Buffer.alloc(1 + 4 + payload.length);
    msg[0] = 0x70; // 'p' PasswordMessage
    msg.writeInt32BE(4 + payload.length, 1);
    payload.copy(msg, 5);
    this.sock!.write(msg);
  }

  /** Execute a SQL query via Simple Query protocol. */
  async query(
    sql: string,
  ): Promise<{ ok: boolean; error?: string; tag?: string }> {
    if (!this._connected || !this.sock) {
      return { ok: false, error: "Not connected" };
    }

    const payload = Buffer.from(sql + "\0");
    const msg = Buffer.alloc(1 + 4 + payload.length);
    msg[0] = 0x51; // 'Q' Query
    msg.writeInt32BE(4 + payload.length, 1);
    payload.copy(msg, 5);
    this.sock.write(msg);

    let error: string | undefined;
    let tag: string | undefined;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const resp = await this.nextMessage();
      if (resp.type === "C") {
        // CommandComplete
        tag = resp.body.subarray(0, resp.body.indexOf(0)).toString();
      } else if (resp.type === "E") {
        error = this.parseError(resp.body);
      } else if (resp.type === "Z") {
        // ReadyForQuery — end of response
        return error ? { ok: false, error } : { ok: true, tag };
      }
      // Skip RowDescription ('T'), DataRow ('D'), NoticeResponse ('N'), etc.
    }
  }

  /** Parse ErrorResponse fields (extract 'M' = message). */
  private parseError(body: Buffer): string {
    const parts: string[] = [];
    let i = 0;
    while (i < body.length && body[i] !== 0) {
      const field = String.fromCharCode(body[i++]);
      const end = body.indexOf(0, i);
      if (end < 0) break;
      if (field === "M") parts.push(body.subarray(i, end).toString());
      i = end + 1;
    }
    return parts.join("; ") || "Unknown PG error";
  }

  /** Disconnect and clean up. */
  disconnect(): void {
    this._connected = false;
    if (this.sock) {
      try {
        const term = Buffer.alloc(5);
        term[0] = 0x58; // 'X' Terminate
        term.writeInt32BE(4, 1);
        this.sock.write(term);
      } catch {
        /* ignore */
      }
      try {
        this.sock.destroy();
      } catch {
        /* ignore */
      }
      this.sock = null;
    }
    this.buf = Buffer.alloc(0);
    this.msgQueue = [];
    if (this.msgReject) {
      this.msgReject(new Error("Disconnected"));
      this.msgReject = null;
    }
  }
}

/* ================================================================== */
/* ETL Sync Logic                                                       */
/* ================================================================== */

const ETL_PASSWORD =
  process.env.ANALYTICS_ETL_PASSWORD ||
  ANALYTICS_SQL_CONFIG.etlWriterPassword;

let client: PgSimpleClient | null = null;
let totalSynced = { hourly: 0, daily: 0, errors: 0 };
let lastSyncTime: string | null = null;

/** Escape single quotes for SQL string literals. */
function escSql(s: string): string {
  return s.replace(/'/g, "''");
}

/** Convert ISO 8601 timestamp to readable SQL string (VARCHAR). */
function isoToSql(iso: string): string {
  return iso.replace("T", " ").replace("Z", "").replace(/\.\d{3}$/, "");
}

/** Build an INSERT statement for a MetricBucket. */
function bucketToInsert(table: string, b: MetricBucket): string {
  return [
    `INSERT INTO ${table}`,
    `(id, period_start, period_end, metric, category, tenant_id,`,
    `event_count, sum_value, avg_value, min_value, max_value,`,
    `p50_value, p95_value, p99_value, unit, aggregated_at)`,
    `VALUES`,
    `('${escSql(b.id)}',`,
    `'${isoToSql(b.periodStart)}',`,
    `'${isoToSql(b.periodEnd)}',`,
    `'${escSql(b.metric)}',`,
    `'${escSql(b.category)}',`,
    `'${escSql(b.tenantId)}',`,
    `${b.count},`,
    `${b.sum.toFixed(4)},`,
    `${(b.avg || 0).toFixed(4)},`,
    `${(b.min || 0).toFixed(4)},`,
    `${(b.max || 0).toFixed(4)},`,
    `${(b.p50 || 0).toFixed(4)},`,
    `${(b.p95 || 0).toFixed(4)},`,
    `${(b.p99 || 0).toFixed(4)},`,
    `'${escSql(b.unit)}',`,
    `'${isoToSql(b.aggregatedAt)}')`,
  ].join(" ");
}

/** Lazily connect to ROcto, reconnecting if needed. */
async function ensureConnected(): Promise<boolean> {
  if (client?.connected) return true;
  client?.disconnect();
  client = new PgSimpleClient(
    ANALYTICS_SQL_CONFIG.roctoHost,
    ANALYTICS_SQL_CONFIG.roctoPort,
    ANALYTICS_SQL_CONFIG.etlWriterUser,
    ETL_PASSWORD,
    "analytics",
  );
  const ok = await client.connect();
  if (!ok) {
    client = null;
    return false;
  }
  return true;
}

/** Sync newly created buckets to Octo SQL tables. */
async function syncBuckets(
  hourly: MetricBucket[],
  daily: MetricBucket[],
): Promise<{ syncedH: number; syncedD: number; errors: number }> {
  if (hourly.length === 0 && daily.length === 0) {
    return { syncedH: 0, syncedD: 0, errors: 0 };
  }

  if (!(await ensureConnected())) {
    log.debug("ETL: ROcto not available, skipping sync", {
      hourly: hourly.length,
      daily: daily.length,
    });
    return { syncedH: 0, syncedD: 0, errors: 0 };
  }

  let syncedH = 0;
  let syncedD = 0;
  let errors = 0;

  for (const b of hourly) {
    const sql = bucketToInsert("analytics_hourly", b);
    const result = await client!.query(sql);
    if (result.ok) {
      syncedH++;
    } else {
      errors++;
      // Suppress duplicate key errors (idempotent retries)
      if (!result.error?.toLowerCase().includes("duplicate")) {
        log.debug("ETL: INSERT hourly failed", { id: b.id, error: result.error });
      }
    }
  }

  for (const b of daily) {
    const sql = bucketToInsert("analytics_daily", b);
    const result = await client!.query(sql);
    if (result.ok) {
      syncedD++;
    } else {
      errors++;
      if (!result.error?.toLowerCase().includes("duplicate")) {
        log.debug("ETL: INSERT daily failed", { id: b.id, error: result.error });
      }
    }
  }

  totalSynced.hourly += syncedH;
  totalSynced.daily += syncedD;
  totalSynced.errors += errors;
  lastSyncTime = new Date().toISOString();

  if (syncedH + syncedD > 0) {
    log.info("ETL: Synced buckets to ROcto", {
      hourly: syncedH,
      daily: syncedD,
      errors,
    });
  }

  return { syncedH, syncedD, errors };
}

/* ================================================================== */
/* Public API                                                           */
/* ================================================================== */

/**
 * Initialize the ETL writer.
 * Registers a callback with the aggregator and tries to connect to ROcto.
 * Non-blocking: if ROcto is unavailable, sync is skipped until next cycle.
 */
export async function initEtl(): Promise<void> {
  // Register callback with the aggregation engine
  setOnBucketsCreated((hourly, daily) => {
    syncBuckets(hourly, daily).catch((err) => {
      log.warn("ETL: sync failed", { error: String(err) });
    });
  });

  // Try initial connection (non-blocking — don't block server startup)
  ensureConnected().then((ok) => {
    if (ok) {
      log.info("ETL: Connected to ROcto", {
        host: ANALYTICS_SQL_CONFIG.roctoHost,
        port: ANALYTICS_SQL_CONFIG.roctoPort,
      });
    } else {
      log.info("ETL: ROcto not available, will retry on next aggregation cycle");
    }
  });
}

/**
 * Manually trigger ETL sync.
 * Forces re-sync of all current buckets.
 */
export { syncBuckets as syncBucketsToOcto };

/**
 * Stop the ETL writer. Called during graceful shutdown.
 */
export function stopEtl(): void {
  client?.disconnect();
  client = null;
}

/**
 * Get ETL status for health/admin endpoints.
 */
export function getEtlStatus(): {
  connected: boolean;
  totalSynced: { hourly: number; daily: number; errors: number };
  lastSyncTime: string | null;
  config: { host: string; port: number; user: string; database: string };
} {
  return {
    connected: client?.connected || false,
    totalSynced: { ...totalSynced },
    lastSyncTime,
    config: {
      host: ANALYTICS_SQL_CONFIG.roctoHost,
      port: ANALYTICS_SQL_CONFIG.roctoPort,
      user: ANALYTICS_SQL_CONFIG.etlWriterUser,
      database: "analytics",
    },
  };
}
