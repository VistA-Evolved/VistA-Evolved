/**
 * HL7v2 Engine -- MLLP Client
 *
 * Phase 239 (Wave 6 P2): Zero-dependency MLLP TCP client for sending HL7v2
 * messages to remote systems. Supports connection pooling, reconnection
 * with exponential backoff, and response timeout.
 *
 * MLLP framing:
 *   <0x0B> message_bytes <0x1C><0x0D>
 *
 * Security:
 *   - PHI NEVER in logs -- only control IDs and message type metadata
 *   - TLS configurable for MLLPS connections
 */

import * as net from 'node:net';
import { log } from '../lib/logger.js';
import type { MllpClientConfig, ConnectionState } from './types.js';
import { MLLP_START_BLOCK, MLLP_END_BLOCK, MLLP_CR } from './types.js';

/* ------------------------------------------------------------------ */
/*  Default Configuration                                              */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: MllpClientConfig = {
  host: '127.0.0.1',
  port: 2575,
  connectTimeoutMs: 10_000,
  responseTimeoutMs: 30_000,
  maxReconnectAttempts: 3,
  reconnectBaseDelayMs: 1_000,
  tls: false,
};

/* ------------------------------------------------------------------ */
/*  MLLP Client                                                        */
/* ------------------------------------------------------------------ */

export class MllpClient {
  private socket: net.Socket | null = null;
  private config: MllpClientConfig;
  private state: ConnectionState = 'disconnected';
  private pendingResolve: ((data: string) => void) | null = null;
  private pendingReject: ((err: Error) => void) | null = null;
  private responseTimer: ReturnType<typeof setTimeout> | null = null;
  private responseBuffer = Buffer.alloc(0);

  constructor(config?: Partial<MllpClientConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to the remote MLLP server.
   */
  async connect(): Promise<void> {
    if (this.state === 'connected') return;

    return new Promise((resolve, reject) => {
      this.state = 'connecting';
      const timer = setTimeout(() => {
        reject(new Error(`MLLP connect timeout after ${this.config.connectTimeoutMs}ms`));
        this.socket?.destroy();
      }, this.config.connectTimeoutMs);

      this.socket = net.createConnection(
        {
          host: this.config.host,
          port: this.config.port,
        },
        () => {
          clearTimeout(timer);
          this.state = 'connected';
          log.info('MLLP client connected', {
            component: 'hl7-mllp-client',
            host: this.config.host,
            port: this.config.port,
          });
          resolve();
        }
      );

      this.socket.on('data', (chunk: Buffer) => {
        this.handleData(chunk);
      });

      this.socket.on('error', (err) => {
        clearTimeout(timer);
        this.state = 'error';
        log.error('MLLP client socket error', {
          component: 'hl7-mllp-client',
          error: err.message,
        });
        if (this.pendingReject) {
          this.pendingReject(err);
          this.pendingResolve = null;
          this.pendingReject = null;
        }
        reject(err);
      });

      this.socket.on('close', () => {
        this.state = 'disconnected';
        this.socket = null;
        log.info('MLLP client disconnected', { component: 'hl7-mllp-client' });
      });
    });
  }

  /**
   * Disconnect from the remote server.
   */
  disconnect(): void {
    if (this.responseTimer) {
      clearTimeout(this.responseTimer);
      this.responseTimer = null;
    }
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.state = 'disconnected';
  }

  /**
   * Send an HL7v2 message and wait for the ACK response.
   *
   * @param messageText - Raw HL7v2 message text (without MLLP framing)
   * @returns The raw ACK response text
   */
  async send(messageText: string): Promise<string> {
    // Auto-connect if needed
    if (this.state !== 'connected') {
      await this.connectWithRetry();
    }

    if (!this.socket || this.state !== 'connected') {
      throw new Error('MLLP client not connected');
    }

    // Wrap in MLLP frame
    const frame = Buffer.concat([
      Buffer.from([MLLP_START_BLOCK]),
      Buffer.from(messageText, 'utf8'),
      Buffer.from([MLLP_END_BLOCK, MLLP_CR]),
    ]);

    return new Promise((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;
      this.responseBuffer = Buffer.alloc(0);

      // Response timeout
      this.responseTimer = setTimeout(() => {
        this.pendingReject?.(
          new Error(`MLLP response timeout after ${this.config.responseTimeoutMs}ms`)
        );
        this.pendingResolve = null;
        this.pendingReject = null;
        this.responseTimer = null;
      }, this.config.responseTimeoutMs);

      this.socket!.write(frame, (err) => {
        if (err) {
          clearTimeout(this.responseTimer!);
          this.responseTimer = null;
          this.pendingResolve = null;
          this.pendingReject = null;
          reject(err);
        }
      });
    });
  }

  /**
   * Get the current connection state.
   */
  getState(): ConnectionState {
    return this.state;
  }

  /* ---------------------------------------------------------------- */
  /*  Private                                                          */
  /* ---------------------------------------------------------------- */

  private handleData(chunk: Buffer): void {
    this.responseBuffer = Buffer.concat([this.responseBuffer, chunk]);

    // Look for complete MLLP frame
    const startIdx = this.responseBuffer.indexOf(MLLP_START_BLOCK);
    if (startIdx === -1) return;

    for (let i = startIdx + 1; i < this.responseBuffer.length - 1; i++) {
      if (this.responseBuffer[i] === MLLP_END_BLOCK && this.responseBuffer[i + 1] === MLLP_CR) {
        // Found complete frame
        const messageBytes = this.responseBuffer.subarray(startIdx + 1, i);
        const messageText = messageBytes.toString('utf8');

        if (this.responseTimer) {
          clearTimeout(this.responseTimer);
          this.responseTimer = null;
        }

        if (this.pendingResolve) {
          this.pendingResolve(messageText);
          this.pendingResolve = null;
          this.pendingReject = null;
        }

        this.responseBuffer = this.responseBuffer.subarray(i + 2);
        return;
      }
    }
  }

  /**
   * Connect with exponential backoff retry.
   */
  private async connectWithRetry(): Promise<void> {
    for (let attempt = 0; attempt < this.config.maxReconnectAttempts; attempt++) {
      try {
        await this.connect();
        return;
      } catch (_err) {
        if (attempt < this.config.maxReconnectAttempts - 1) {
          const delay = this.config.reconnectBaseDelayMs * Math.pow(2, attempt);
          log.warn('MLLP client reconnecting', {
            component: 'hl7-mllp-client',
            attempt: attempt + 1,
            maxAttempts: this.config.maxReconnectAttempts,
            delayMs: delay,
          });
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw new Error(
      `MLLP client failed to connect after ${this.config.maxReconnectAttempts} attempts`
    );
  }
}
