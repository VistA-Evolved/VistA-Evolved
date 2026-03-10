/**
 * Messaging Adapter Interface -- Phase 37C.
 *
 * Abstracts HL7v2 / HLO / FHIR messaging for interop module.
 * VistA adapter uses existing ZVEMIOP.m entry points.
 */

import type { BaseAdapter, AdapterResult } from '../types.js';

export interface HL7Message {
  id: string;
  type: string; // ADT^A01, ORM^O01, etc.
  direction: 'inbound' | 'outbound';
  status: 'queued' | 'sent' | 'acked' | 'error';
  timestamp: string;
  body?: string;
}

export interface HL7Stats {
  totalInbound: number;
  totalOutbound: number;
  errorCount: number;
  lastActivity: string | null;
}

export interface MessagingAdapter extends BaseAdapter {
  readonly adapterType: 'messaging';

  /** Get recent HL7 messages for telemetry. */
  getMessages(limit?: number): Promise<AdapterResult<HL7Message[]>>;

  /** Get aggregate messaging statistics. */
  getStats(): Promise<AdapterResult<HL7Stats>>;

  /** Send an outbound HL7 message. */
  sendMessage(messageType: string, body: string): Promise<AdapterResult<{ messageId: string }>>;

  /** Get link status for configured HL7 links. */
  getLinkStatus(): Promise<
    AdapterResult<
      Array<{
        linkName: string;
        status: 'active' | 'inactive' | 'error';
        lastActivity: string | null;
      }>
    >
  >;
}
