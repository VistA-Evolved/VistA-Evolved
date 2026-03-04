/**
 * HL7v2 Engine — MLLP Server
 *
 * Phase 239 (Wave 6 P2): Zero-dependency MLLP (Minimum Lower Layer Protocol)
 * TCP server. Handles connection lifecycle, MLLP frame delineation, and
 * message dispatch.
 *
 * MLLP framing:
 *   <0x0B> message_bytes <0x1C><0x0D>
 *
 * Start Block = 0x0B (vertical tab)
 * End Block   = 0x1C (file separator) followed by 0x0D (carriage return)
 *
 * Security:
 *   - PHI NEVER appears in logs — only message type, control ID, segment counts
 *   - Connection metadata logged via structured logger
 *   - TLS configurable for MLLPS (production)
 */

import * as net from 'node:net';
import * as crypto from 'node:crypto';
import { log } from '../lib/logger.js';
import type { MllpServerConfig, MllpConnection, MessageHandler, Hl7EngineStatus } from './types.js';
import { MLLP_START_BLOCK, MLLP_END_BLOCK, MLLP_CR, MLLP_DEFAULT_PORT } from './types.js';
import { parseMessage, messageSummary } from './parser.js';
import { ackReject } from './ack-generator.js';

/* ------------------------------------------------------------------ */
/*  Default Configuration                                              */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: MllpServerConfig = {
  port: MLLP_DEFAULT_PORT,
  host: '0.0.0.0',
  maxConnections: 100,
  idleTimeoutMs: 300_000, // 5 minutes
  maxMessageSize: 1_048_576, // 1 MB
  tls: false,
};

/* ------------------------------------------------------------------ */
/*  MLLP Server                                                        */
/* ------------------------------------------------------------------ */

export class MllpServer {
  private server: net.Server | null = null;
  private connections = new Map<string, MllpConnection>();
  private sockets = new Map<string, net.Socket>();
  private config: MllpServerConfig;
  private handler: MessageHandler | null = null;
  private startedAt = 0;
  private totalReceived = 0;
  private totalSent = 0;
  private totalErrors = 0;

  constructor(config?: Partial<MllpServerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a message handler. Called for each complete HL7v2 message received.
   */
  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  /**
   * Start the MLLP server.
   */
  async start(): Promise<void> {
    if (this.server) {
      log.warn('MLLP server already running', { component: 'hl7-mllp' });
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => this.handleConnection(socket));

      this.server.maxConnections = this.config.maxConnections;

      this.server.on('error', (err) => {
        log.error('MLLP server error', { component: 'hl7-mllp', error: (err as Error).message });
        this.totalErrors++;
        reject(err);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        this.startedAt = Date.now();
        log.info('MLLP server listening', {
          component: 'hl7-mllp',
          port: this.config.port,
          host: this.config.host,
          maxConnections: this.config.maxConnections,
          tls: this.config.tls,
        });
        resolve();
      });
    });
  }

  /**
   * Stop the MLLP server and close all connections.
   */
  async stop(): Promise<void> {
    if (!this.server) return;

    // Close all active connections
    for (const [id, socket] of this.sockets) {
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      this.connections.delete(id);
    }
    this.sockets.clear();

    return new Promise((resolve) => {
      this.server!.close(() => {
        log.info('MLLP server stopped', { component: 'hl7-mllp' });
        this.server = null;
        resolve();
      });
    });
  }

  /**
   * Get current engine status.
   */
  getStatus(): Hl7EngineStatus {
    return {
      running: this.server !== null,
      listening: this.server?.listening ?? false,
      port: this.config.port,
      activeConnections: this.connections.size,
      totalMessagesReceived: this.totalReceived,
      totalMessagesSent: this.totalSent,
      totalErrors: this.totalErrors,
      uptimeMs: this.startedAt > 0 ? Date.now() - this.startedAt : 0,
    };
  }

  /**
   * Get active connections.
   */
  getConnections(): MllpConnection[] {
    return Array.from(this.connections.values());
  }

  /* ---------------------------------------------------------------- */
  /*  Private — Connection Handling                                    */
  /* ---------------------------------------------------------------- */

  private handleConnection(socket: net.Socket): void {
    const connId = crypto.randomBytes(8).toString('hex');
    const remoteHost = socket.remoteAddress || 'unknown';
    const remotePort = socket.remotePort || 0;

    const conn: MllpConnection = {
      id: connId,
      remoteHost,
      remotePort,
      state: 'connected',
      connectedAt: Date.now(),
      lastActivityAt: Date.now(),
      messagesReceived: 0,
      messagesSent: 0,
      errors: 0,
    };

    this.connections.set(connId, conn);
    this.sockets.set(connId, socket);

    log.info('MLLP connection opened', {
      component: 'hl7-mllp',
      connectionId: connId,
      remoteHost,
      remotePort,
    });

    // Idle timeout
    socket.setTimeout(this.config.idleTimeoutMs);

    // Buffer for accumulating MLLP frames
    let buffer: Buffer = Buffer.alloc(0);

    socket.on('data', (chunk: Buffer) => {
      conn.lastActivityAt = Date.now();
      buffer = Buffer.concat([buffer, chunk]);

      // Check max message size
      if (buffer.length > this.config.maxMessageSize) {
        log.warn('MLLP message too large, closing connection', {
          component: 'hl7-mllp',
          connectionId: connId,
          bufferSize: buffer.length,
          maxSize: this.config.maxMessageSize,
        });
        this.totalErrors++;
        conn.errors++;
        socket.destroy();
        return;
      }

      // Process complete MLLP frames
      this.processBuffer(connId, socket, conn, buffer)
        .then((remaining) => {
          buffer = remaining;
        })
        .catch((err) => {
          log.error('MLLP frame processing error', {
            component: 'hl7-mllp',
            connectionId: connId,
            error: (err as Error).message,
          });
          this.totalErrors++;
          conn.errors++;
        });
    });

    socket.on('timeout', () => {
      log.info('MLLP connection idle timeout', {
        component: 'hl7-mllp',
        connectionId: connId,
      });
      conn.state = 'idle';
      socket.destroy();
    });

    socket.on('close', () => {
      conn.state = 'disconnected';
      this.connections.delete(connId);
      this.sockets.delete(connId);
      log.info('MLLP connection closed', {
        component: 'hl7-mllp',
        connectionId: connId,
        messagesReceived: conn.messagesReceived,
        messagesSent: conn.messagesSent,
      });
    });

    socket.on('error', (err) => {
      conn.state = 'error';
      conn.errors++;
      this.totalErrors++;
      log.error('MLLP connection error', {
        component: 'hl7-mllp',
        connectionId: connId,
        error: err.message,
      });
    });
  }

  /**
   * Process buffered data looking for complete MLLP frames.
   * Returns remaining unprocessed buffer.
   */
  private async processBuffer(
    connId: string,
    socket: net.Socket,
    conn: MllpConnection,
    buffer: Buffer
  ): Promise<Buffer> {
    let remaining = buffer;

    while (remaining.length > 0) {
      // Look for start block (0x0B)
      const startIdx = remaining.indexOf(MLLP_START_BLOCK);
      if (startIdx === -1) {
        // No start block — discard non-MLLP data
        return Buffer.alloc(0);
      }

      // Skip anything before start block
      if (startIdx > 0) {
        remaining = remaining.subarray(startIdx);
      }

      // Look for end block (0x1C 0x0D)
      let endIdx = -1;
      for (let i = 1; i < remaining.length - 1; i++) {
        if (remaining[i] === MLLP_END_BLOCK && remaining[i + 1] === MLLP_CR) {
          endIdx = i;
          break;
        }
      }

      if (endIdx === -1) {
        // Incomplete frame — wait for more data
        return remaining;
      }

      // Extract message (between 0x0B and 0x1C)
      const messageBytes = remaining.subarray(1, endIdx);
      const messageText = messageBytes.toString('utf8');

      // Advance past 0x1C 0x0D
      remaining = remaining.subarray(endIdx + 2);

      // Parse and dispatch
      await this.dispatchMessage(connId, socket, conn, messageText);
    }

    return Buffer.alloc(0);
  }

  /**
   * Parse a raw message, dispatch to handler, send ACK response.
   */
  private async dispatchMessage(
    connId: string,
    socket: net.Socket,
    conn: MllpConnection,
    messageText: string
  ): Promise<void> {
    this.totalReceived++;
    conn.messagesReceived++;

    const parsed = parseMessage(messageText);
    if (!parsed) {
      log.warn('MLLP received unparseable message', {
        component: 'hl7-mllp',
        connectionId: connId,
        messageLength: messageText.length,
      });
      this.totalErrors++;
      conn.errors++;
      return;
    }

    // Log only safe metadata (NO PHI)
    log.info('MLLP message received', {
      component: 'hl7-mllp',
      connectionId: connId,
      ...messageSummary(parsed),
    });

    // Dispatch to handler
    let ack;
    if (this.handler) {
      try {
        ack = await this.handler(parsed, conn);
      } catch (err) {
        log.error('MLLP message handler error', {
          component: 'hl7-mllp',
          connectionId: connId,
          messageControlId: parsed.messageControlId,
          error: (err as Error).message,
        });
        this.totalErrors++;
        conn.errors++;
        ack = ackReject(parsed, 'Internal processing error');
      }
    } else {
      // No handler registered — auto-reject
      ack = ackReject(parsed, 'No message handler configured');
    }

    // Send ACK wrapped in MLLP frame
    const ackFrame = Buffer.concat([
      Buffer.from([MLLP_START_BLOCK]),
      Buffer.from(ack.message, 'utf8'),
      Buffer.from([MLLP_END_BLOCK, MLLP_CR]),
    ]);

    try {
      socket.write(ackFrame);
      this.totalSent++;
      conn.messagesSent++;
    } catch (err) {
      log.error('MLLP ACK send failed', {
        component: 'hl7-mllp',
        connectionId: connId,
        error: (err as Error).message,
      });
      this.totalErrors++;
      conn.errors++;
    }
  }
}
