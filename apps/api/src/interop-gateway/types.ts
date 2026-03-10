/**
 * Phase 400 (W23-P2): Interop Gateway Layer -- Types
 *
 * Channels, mediators, transformers, and transaction audit for routing
 * and transforming health data between internal systems and external
 * exchange partners.
 */

// --- Channel Configuration ---------------------------------

export type ChannelDirection = 'inbound' | 'outbound' | 'bidirectional';
export type ChannelProtocol =
  | 'fhir-rest'
  | 'hl7v2-mllp'
  | 'hl7v2-http'
  | 'xds-soap'
  | 'sftp'
  | 's3'
  | 'webhook'
  | 'openhim';
export type ChannelStatus = 'active' | 'paused' | 'error' | 'disabled';

export interface ChannelEndpoint {
  url: string;
  protocol: ChannelProtocol;
  authType: 'none' | 'basic' | 'bearer' | 'mtls' | 'apikey';
  headers?: Record<string, string>;
  tlsCertId?: string | null;
}

export interface GatewayChannel {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  direction: ChannelDirection;
  source: ChannelEndpoint;
  destination: ChannelEndpoint;
  transformPipelineId: string | null;
  status: ChannelStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// --- Transform Pipeline ------------------------------------

export type TransformType =
  | 'hl7v2-to-fhir'
  | 'fhir-to-hl7v2'
  | 'csv-to-fhir'
  | 'fhir-to-cda'
  | 'cda-to-fhir'
  | 'fhir-to-xds'
  | 'xds-to-fhir'
  | 'passthrough'
  | 'custom';

export interface TransformStep {
  order: number;
  type: TransformType;
  config: Record<string, unknown>;
}

export interface TransformPipeline {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  steps: TransformStep[];
  createdAt: string;
  updatedAt: string;
}

// --- Transaction Audit -------------------------------------

export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';

export interface GatewayTransaction {
  id: string;
  tenantId: string;
  channelId: string;
  direction: ChannelDirection;
  status: TransactionStatus;
  sourceMessageId: string | null;
  transformPipelineId: string | null;
  requestSummary: string;
  responseSummary: string | null;
  errorDetail: string | null;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

// --- Mediator ----------------------------------------------

export type MediatorType = 'internal' | 'openhim';

export interface MediatorConfig {
  id: string;
  tenantId: string;
  type: MediatorType;
  name: string;
  description: string;
  openhimUrl: string | null;
  openhimClientId: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Dashboard Stats ---------------------------------------

export interface GatewayDashboardStats {
  totalChannels: number;
  activeChannels: number;
  totalPipelines: number;
  totalTransactions: number;
  failedTransactions: number;
  avgDurationMs: number;
}
