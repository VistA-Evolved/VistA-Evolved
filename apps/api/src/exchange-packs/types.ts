/**
 * Phases 406-407 (W23-P8/P9): Exchange Packs — Types
 */

export type ExchangePackId =
  | 'us-tefca'
  | 'us-smart'
  | 'eu-xds'
  | 'eu-mhd'
  | 'openhie-shrx'
  | 'openhie-shr'
  | 'custom';
export type ConnectorStatus = 'active' | 'inactive' | 'testing' | 'error';
export type ExchangeDirection = 'send' | 'receive' | 'bidirectional';

export interface ExchangePackProfile {
  id: ExchangePackId;
  name: string;
  description: string;
  country: string;
  region: string;
  standards: string[];
  requiredCapabilities: string[];
  optionalCapabilities: string[];
}

export interface ExchangeConnector {
  id: string;
  tenantId: string;
  packId: ExchangePackId;
  name: string;
  description?: string;
  status: ConnectorStatus;
  direction: ExchangeDirection;
  endpoint: string;
  authType: 'none' | 'basic' | 'bearer' | 'mtls' | 'oauth2' | 'saml';
  authConfig?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeoutMs: number;
  retryAttempts: number;
  lastHealthCheck?: string;
  lastHealthStatus?: 'healthy' | 'unhealthy' | 'unknown';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeTransaction {
  id: string;
  tenantId: string;
  connectorId: string;
  packId: ExchangePackId;
  direction: 'outbound' | 'inbound';
  transactionType: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'timeout';
  requestPayload?: string;
  responsePayload?: string;
  errorMessage?: string;
  durationMs?: number;
  createdAt: string;
  completedAt?: string;
}

export interface ExchangePackDashboardStats {
  totalConnectors: number;
  activeConnectors: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  transactionsByPack: Record<string, number>;
  connectorsByStatus: Record<string, number>;
}
