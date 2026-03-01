/**
 * Phase 411 (W24-P3): Customer Integration Intake -- Store
 */

import type {
  IntegrationIntake, IntakeStatus, IntakeConfigArtifact, IntakeDashboardStats,
  PartnerType,
} from "./types.js";
import { randomUUID } from "node:crypto";

const MAX_INTAKES = 5_000;
const intakeStore = new Map<string, IntegrationIntake>();
const configStore = new Map<string, IntakeConfigArtifact>();

function enforceMax(store: Map<string, unknown>, max: number): void {
  if (store.size >= max) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
}

// --- CRUD ---

export function createIntake(data: Omit<IntegrationIntake, "id" | "createdAt" | "updatedAt">): IntegrationIntake {
  enforceMax(intakeStore, MAX_INTAKES);
  const now = new Date().toISOString();
  const rec: IntegrationIntake = {
    ...data,
    id: randomUUID(),
    status: data.status || "draft",
    createdAt: now,
    updatedAt: now,
  };
  intakeStore.set(rec.id, rec);
  return rec;
}

export function getIntake(id: string): IntegrationIntake | undefined {
  return intakeStore.get(id);
}

export function listIntakes(tenantId: string, filters?: { status?: string; partnerType?: string }): IntegrationIntake[] {
  const results: IntegrationIntake[] = [];
  for (const rec of intakeStore.values()) {
    if (rec.tenantId !== tenantId) continue;
    if (filters?.status && rec.status !== filters.status) continue;
    if (filters?.partnerType && rec.partnerType !== filters.partnerType) continue;
    results.push(rec);
  }
  return results;
}

export function updateIntake(id: string, data: Partial<IntegrationIntake>): IntegrationIntake | undefined {
  const rec = intakeStore.get(id);
  if (!rec) return undefined;
  Object.assign(rec, data, { id: rec.id, createdAt: rec.createdAt, updatedAt: new Date().toISOString() });
  intakeStore.set(id, rec);
  return rec;
}

export function transitionIntake(id: string, newStatus: IntakeStatus): IntegrationIntake | undefined {
  const rec = intakeStore.get(id);
  if (!rec) return undefined;
  rec.status = newStatus;
  rec.updatedAt = new Date().toISOString();
  intakeStore.set(id, rec);
  return rec;
}

// --- Config artifacts ---

export function getConfigArtifact(intakeId: string): IntakeConfigArtifact | undefined {
  return configStore.get(intakeId);
}

export function storeConfigArtifact(artifact: IntakeConfigArtifact): void {
  configStore.set(artifact.intakeId, artifact);
}

// --- Dashboard ---

export function getIntakeDashboard(tenantId: string): IntakeDashboardStats {
  const byStatus: Record<string, number> = {};
  const byPartnerType: Record<string, number> = {};
  let total = 0;
  for (const rec of intakeStore.values()) {
    if (rec.tenantId !== tenantId) continue;
    total++;
    byStatus[rec.status] = (byStatus[rec.status] || 0) + 1;
    byPartnerType[rec.partnerType] = (byPartnerType[rec.partnerType] || 0) + 1;
  }
  return { total, byStatus: byStatus as any, byPartnerType: byPartnerType as any };
}
