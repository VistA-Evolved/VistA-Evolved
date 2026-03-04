/**
 * Clearinghouse EDI Connector
 *
 * Handles X12 837/835/270/271/276/277 via an ANSI X12 clearinghouse
 * (e.g., Change Healthcare, Availity, Trizetto, WayStar).
 *
 * In sandbox mode, this connector serializes to the outbound queue
 * and returns simulated acknowledgments.
 *
 * Phase 38 — RCM + Payer Connectivity
 */

import type { X12TransactionSet } from '../edi/types.js';
import type { RcmConnector, ConnectorResult } from './types.js';
import { randomBytes } from 'node:crypto';

export class ClearinghouseConnector implements RcmConnector {
  readonly id = 'clearinghouse-edi';
  readonly name = 'EDI Clearinghouse (X12 5010)';
  readonly supportedModes = ['clearinghouse_edi'];
  readonly supportedTransactions: X12TransactionSet[] = [
    '837P',
    '837I',
    '835',
    '270',
    '271',
    '276',
    '277',
    '275',
    '278',
    '999',
    '997',
    'TA1',
  ];

  private config: {
    sftpHost?: string;
    sftpPort?: number;
    sftpUser?: string;
    apiEndpoint?: string;
    apiKey?: string;
    senderId?: string;
    receiverId?: string;
  } = {};

  private outboundQueue: Array<{
    id: string;
    transactionSet: X12TransactionSet;
    payload: string;
    metadata: Record<string, string>;
    submittedAt: string;
    status: 'queued' | 'sent' | 'ack' | 'error';
  }> = [];

  private inboundQueue: Array<{
    transactionSet: X12TransactionSet;
    payload: string;
    receivedAt: string;
  }> = [];

  async initialize(): Promise<void> {
    // Load clearinghouse config from environment
    this.config = {
      sftpHost: process.env.RCM_CH_SFTP_HOST,
      sftpPort: Number(process.env.RCM_CH_SFTP_PORT ?? '22'),
      sftpUser: process.env.RCM_CH_SFTP_USER,
      apiEndpoint: process.env.RCM_CH_API_ENDPOINT,
      apiKey: process.env.RCM_CH_API_KEY,
      senderId: process.env.RCM_CH_SENDER_ID ?? 'VISTAEVOLVED',
      receiverId: process.env.RCM_CH_RECEIVER_ID ?? 'CLEARINGHOUSE',
    };
    // In production: test SFTP connectivity or API auth
  }

  async submit(
    transactionSet: X12TransactionSet,
    payload: string,
    metadata: Record<string, string>
  ): Promise<ConnectorResult> {
    const txId = `ch-${Date.now()}-${randomBytes(4).toString('hex')}`;

    // Queue the transaction
    this.outboundQueue.push({
      id: txId,
      transactionSet,
      payload,
      metadata,
      submittedAt: new Date().toISOString(),
      status: 'queued',
    });

    // In production: send via SFTP batch or real-time API
    // For now, simulate successful queueing
    return {
      success: true,
      transactionId: txId,
      errors: [],
      metadata: {
        connector: this.id,
        queuePosition: String(this.outboundQueue.length),
      },
    };
  }

  async checkStatus(transactionId: string): Promise<ConnectorResult> {
    const entry = this.outboundQueue.find((e) => e.id === transactionId);
    if (!entry) {
      return {
        success: false,
        errors: [{ code: 'NOT_FOUND', description: 'Transaction not found', severity: 'error' }],
      };
    }
    return {
      success: true,
      transactionId,
      errors: [],
      metadata: { status: entry.status, submittedAt: entry.submittedAt },
    };
  }

  async fetchResponses(since?: string): Promise<
    Array<{
      transactionSet: X12TransactionSet;
      payload: string;
      receivedAt: string;
    }>
  > {
    // In production: poll SFTP inbox or API for 835s, 271s, 277s, 999s
    // For now, return any queued inbound responses
    if (since) {
      return this.inboundQueue.filter((r) => r.receivedAt >= since);
    }
    return [...this.inboundQueue];
  }

  async healthCheck(): Promise<{ healthy: boolean; details?: string }> {
    // In production: test SFTP connectivity or API endpoint
    const hasConfig = !!(this.config.sftpHost || this.config.apiEndpoint);
    return {
      healthy: hasConfig,
      details: hasConfig
        ? `Clearinghouse configured (${this.config.sftpHost || this.config.apiEndpoint})`
        : 'No clearinghouse endpoint configured — operating in queue-only mode',
    };
  }

  async shutdown(): Promise<void> {
    // In production: close SFTP connections, flush queues
    this.outboundQueue = [];
    this.inboundQueue = [];
  }

  /* ─── Test helpers ─────────────────────────────────────────────── */

  getOutboundQueueSize(): number {
    return this.outboundQueue.length;
  }

  simulateInboundResponse(transactionSet: X12TransactionSet, payload: string): void {
    this.inboundQueue.push({
      transactionSet,
      payload,
      receivedAt: new Date().toISOString(),
    });
  }
}
