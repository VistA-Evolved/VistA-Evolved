/**
 * Phases 406-407 (W23-P8/P9): Exchange Packs — Store
 */

import { randomBytes } from "crypto";
import type {
  ExchangePackProfile,
  ExchangeConnector,
  ExchangeTransaction,
  ExchangePackDashboardStats,
  ExchangePackId,
} from "./types.js";

const MAX_CONNECTORS = 1_000;
const MAX_TRANSACTIONS = 50_000;

const connectorStore = new Map<string, ExchangeConnector>();
const transactionStore = new Map<string, ExchangeTransaction>();

function enforceMax<T>(store: Map<string, T>, max: number): void {
  if (store.size >= max) {
    const k = store.keys().next().value;
    if (k) store.delete(k);
  }
}

function genId(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString("hex")}`;
}

// ─── Built-In Pack Profiles ────────────────────────────────

const PACK_PROFILES: ExchangePackProfile[] = [
  {
    id: "us-tefca",
    name: "US TEFCA Exchange Pack",
    description: "Trusted Exchange Framework and Common Agreement readiness pack",
    country: "US",
    region: "North America",
    standards: ["FHIR R4", "USCDI v3", "C-CDA 2.1", "SMART on FHIR"],
    requiredCapabilities: ["fhir-r4", "patient-match", "bulk-data-export", "consent-management"],
    optionalCapabilities: ["cds-hooks", "hl7v2-adt", "direct-messaging"],
  },
  {
    id: "us-smart",
    name: "US SMART Health Links",
    description: "SMART Health Links for portable clinical data sharing",
    country: "US",
    region: "North America",
    standards: ["SMART on FHIR", "FHIR R4", "SMART Health Cards"],
    requiredCapabilities: ["fhir-r4", "oauth2"],
    optionalCapabilities: ["bulk-data-export"],
  },
  {
    id: "eu-xds",
    name: "EU XDS.b Exchange Pack",
    description: "IHE XDS.b cross-enterprise document sharing for European deployments",
    country: "EU",
    region: "Europe",
    standards: ["IHE XDS.b", "IHE XCA", "HL7 CDA R2", "GDPR"],
    requiredCapabilities: ["document-registry", "document-repository", "patient-identity-feed"],
    optionalCapabilities: ["xca-gateway", "atna-audit"],
  },
  {
    id: "eu-mhd",
    name: "EU MHD Exchange Pack",
    description: "IHE MHD (Mobile Health Documents) FHIR-native variant for European markets",
    country: "EU",
    region: "Europe",
    standards: ["IHE MHD", "FHIR R4", "GDPR"],
    requiredCapabilities: ["fhir-r4", "document-exchange", "consent-management"],
    optionalCapabilities: ["bulk-data-export", "mpi"],
  },
  {
    id: "openhie-shrx",
    name: "OpenHIE SHR Exchange Pack",
    description: "OpenHIE Shared Health Record exchange for LMIC deployments",
    country: "GLOBAL",
    region: "LMIC",
    standards: ["OpenHIE", "FHIR R4", "IHE profiles"],
    requiredCapabilities: ["fhir-r4", "mpi", "interop-gateway"],
    optionalCapabilities: ["bulk-data-export", "terminology-service"],
  },
  {
    id: "openhie-shr",
    name: "OpenHIE SHR Minimal",
    description: "Minimal OpenHIE shared health record profile",
    country: "GLOBAL",
    region: "LMIC",
    standards: ["OpenHIE", "FHIR R4"],
    requiredCapabilities: ["fhir-r4", "mpi"],
    optionalCapabilities: ["consent-management"],
  },
];

export function getPackProfiles(): ExchangePackProfile[] {
  return PACK_PROFILES;
}

export function getPackProfile(id: ExchangePackId): ExchangePackProfile | undefined {
  return PACK_PROFILES.find((p) => p.id === id);
}

// ─── Connector CRUD ────────────────────────────────────────

export function createConnector(input: Omit<ExchangeConnector, "id" | "createdAt" | "updatedAt">): ExchangeConnector {
  enforceMax(connectorStore, MAX_CONNECTORS);
  const now = new Date().toISOString();
  const rec: ExchangeConnector = { ...input, id: genId("conn"), createdAt: now, updatedAt: now };
  connectorStore.set(rec.id, rec);
  return rec;
}

export function getConnector(id: string): ExchangeConnector | undefined {
  return connectorStore.get(id);
}

export function listConnectors(tenantId: string, opts?: { packId?: string; status?: string }): ExchangeConnector[] {
  let results = Array.from(connectorStore.values()).filter((c) => c.tenantId === tenantId);
  if (opts?.packId) results = results.filter((c) => c.packId === opts.packId);
  if (opts?.status) results = results.filter((c) => c.status === opts.status);
  return results;
}

export function updateConnector(id: string, patch: Partial<ExchangeConnector>): ExchangeConnector | undefined {
  const rec = connectorStore.get(id);
  if (!rec) return undefined;
  const updated = { ...rec, ...patch, id: rec.id, createdAt: rec.createdAt, updatedAt: new Date().toISOString() };
  connectorStore.set(id, updated);
  return updated;
}

export function deleteConnector(id: string): boolean {
  return connectorStore.delete(id);
}

// ─── Exchange Transactions ─────────────────────────────────

export function createExchangeTransaction(input: Omit<ExchangeTransaction, "id" | "createdAt">): ExchangeTransaction {
  enforceMax(transactionStore, MAX_TRANSACTIONS);
  const rec: ExchangeTransaction = { ...input, id: genId("etx"), createdAt: new Date().toISOString() };
  transactionStore.set(rec.id, rec);
  return rec;
}

export function getExchangeTransaction(id: string): ExchangeTransaction | undefined {
  return transactionStore.get(id);
}

export function listExchangeTransactions(tenantId: string, opts?: { connectorId?: string; packId?: string; status?: string; limit?: number }): ExchangeTransaction[] {
  let results = Array.from(transactionStore.values()).filter((t) => t.tenantId === tenantId);
  if (opts?.connectorId) results = results.filter((t) => t.connectorId === opts.connectorId);
  if (opts?.packId) results = results.filter((t) => t.packId === opts.packId);
  if (opts?.status) results = results.filter((t) => t.status === opts.status);
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, opts?.limit || 200);
}

export function updateExchangeTransaction(id: string, patch: Partial<ExchangeTransaction>): ExchangeTransaction | undefined {
  const rec = transactionStore.get(id);
  if (!rec) return undefined;
  const updated = { ...rec, ...patch, id: rec.id, createdAt: rec.createdAt };
  transactionStore.set(id, updated);
  return updated;
}

/**
 * Simulate sending a transaction through a connector.
 * In production, this would make real HTTP calls to the external endpoint.
 */
export function simulateExchange(tenantId: string, connectorId: string, payload: string): ExchangeTransaction | { error: string } {
  const conn = getConnector(connectorId);
  if (!conn || conn.tenantId !== tenantId) return { error: "Connector not found" };
  if (conn.status !== "active") return { error: "Connector not active" };

  const tx = createExchangeTransaction({
    tenantId,
    connectorId,
    packId: conn.packId,
    direction: "outbound",
    transactionType: "document-exchange",
    status: "completed",
    requestPayload: payload.slice(0, 1000),
    responsePayload: JSON.stringify({ ack: true, timestamp: new Date().toISOString() }),
    durationMs: Math.floor(Math.random() * 500) + 50,
    completedAt: new Date().toISOString(),
  });

  return tx;
}

// ─── Dashboard ─────────────────────────────────────────────

export function getExchangePackDashboardStats(tenantId: string): ExchangePackDashboardStats {
  const conns = Array.from(connectorStore.values()).filter((c) => c.tenantId === tenantId);
  const txs = Array.from(transactionStore.values()).filter((t) => t.tenantId === tenantId);

  const byPack: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const t of txs) { byPack[t.packId] = (byPack[t.packId] || 0) + 1; }
  for (const c of conns) { byStatus[c.status] = (byStatus[c.status] || 0) + 1; }

  return {
    totalConnectors: conns.length,
    activeConnectors: conns.filter((c) => c.status === "active").length,
    totalTransactions: txs.length,
    successfulTransactions: txs.filter((t) => t.status === "completed").length,
    failedTransactions: txs.filter((t) => t.status === "failed").length,
    transactionsByPack: byPack,
    connectorsByStatus: byStatus,
  };
}
