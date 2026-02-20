/**
 * RCM — Workqueue Store (Phase 43)
 *
 * In-memory workqueue items for Rejections, Denials, and Missing Info.
 * Each workqueue item is a normalized representation of a claim issue
 * that needs human attention: why it failed, recommended fix, which
 * field to correct, and which payer rule triggered it.
 *
 * Resets on API restart — matches imaging-worklist pattern (Phase 23).
 */

import { randomUUID } from 'node:crypto';

/* ── Workqueue Types ───────────────────────────────────────── */

export type WorkqueueType = 'rejection' | 'denial' | 'missing_info';

export type WorkqueueItemStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'escalated'
  | 'dismissed';

export interface WorkqueueItem {
  id: string;
  type: WorkqueueType;
  status: WorkqueueItemStatus;

  /** Linked claim */
  claimId: string;
  payerId?: string;
  payerName?: string;
  patientDfn?: string;

  /** Issue details */
  reasonCode: string;       // CARC, payer-specific code, or internal code
  reasonDescription: string; // Human-readable reason
  reasonCategory?: string;   // CO/PR/OA/PI/CR for denials; internal category for rejections

  /** Remediation */
  recommendedAction: string;  // e.g "Correct NPI in billing provider segment"
  fieldToFix?: string;        // e.g. "billingProviderNpi", "diagnosisCodes[0]"
  triggeringRule?: string;    // Which payer rule or validation rule triggered this

  /** Source */
  sourceType: 'ack_999' | 'ack_277ca' | 'status_277' | 'remit_835' | 'validation' | 'manual';
  sourceId?: string;          // ID of the ack/status/remit that created this item
  sourceTimestamp?: string;

  /** Assignment */
  assignedTo?: string;       // User DUZ
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueDate?: string;

  /** Resolution */
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;

  /** Metadata */
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

/* ── In-Memory Store ───────────────────────────────────────── */

const items = new Map<string, WorkqueueItem>();
const claimIndex = new Map<string, Set<string>>(); // claimId → item IDs

/* ── CRUD ──────────────────────────────────────────────────── */

export function createWorkqueueItem(params: {
  type: WorkqueueType;
  claimId: string;
  payerId?: string;
  payerName?: string;
  patientDfn?: string;
  reasonCode: string;
  reasonDescription: string;
  reasonCategory?: string;
  recommendedAction: string;
  fieldToFix?: string;
  triggeringRule?: string;
  sourceType: WorkqueueItem['sourceType'];
  sourceId?: string;
  sourceTimestamp?: string;
  priority?: WorkqueueItem['priority'];
  tenantId?: string;
}): WorkqueueItem {
  const now = new Date().toISOString();
  const item: WorkqueueItem = {
    id: randomUUID(),
    type: params.type,
    status: 'open',
    claimId: params.claimId,
    payerId: params.payerId,
    payerName: params.payerName,
    patientDfn: params.patientDfn,
    reasonCode: params.reasonCode,
    reasonDescription: params.reasonDescription,
    reasonCategory: params.reasonCategory,
    recommendedAction: params.recommendedAction,
    fieldToFix: params.fieldToFix,
    triggeringRule: params.triggeringRule,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    sourceTimestamp: params.sourceTimestamp,
    priority: params.priority ?? 'medium',
    tenantId: params.tenantId ?? 'default',
    createdAt: now,
    updatedAt: now,
  };

  items.set(item.id, item);
  if (!claimIndex.has(params.claimId)) {
    claimIndex.set(params.claimId, new Set());
  }
  claimIndex.get(params.claimId)!.add(item.id);

  return item;
}

export function getWorkqueueItem(id: string): WorkqueueItem | undefined {
  return items.get(id);
}

export function updateWorkqueueItem(id: string, updates: Partial<WorkqueueItem>): WorkqueueItem | undefined {
  const item = items.get(id);
  if (!item) return undefined;
  const updated: WorkqueueItem = {
    ...item,
    ...updates,
    id: item.id, // immutable
    updatedAt: new Date().toISOString(),
  };
  items.set(id, updated);
  return updated;
}

export function listWorkqueueItems(filters?: {
  type?: WorkqueueType;
  status?: WorkqueueItemStatus;
  claimId?: string;
  payerId?: string;
  priority?: WorkqueueItem['priority'];
  tenantId?: string;
  limit?: number;
  offset?: number;
}): { items: WorkqueueItem[]; total: number } {
  let result = Array.from(items.values());

  if (filters?.type) result = result.filter(i => i.type === filters.type);
  if (filters?.status) result = result.filter(i => i.status === filters.status);
  if (filters?.claimId) result = result.filter(i => i.claimId === filters.claimId);
  if (filters?.payerId) result = result.filter(i => i.payerId === filters.payerId);
  if (filters?.priority) result = result.filter(i => i.priority === filters.priority);
  if (filters?.tenantId) result = result.filter(i => i.tenantId === filters.tenantId);

  // Sort by priority (critical first), then by createdAt desc
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  result.sort((a, b) =>
    (priorityOrder[a.priority] - priorityOrder[b.priority]) ||
    b.createdAt.localeCompare(a.createdAt),
  );

  const total = result.length;
  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? 50;

  return { items: result.slice(offset, offset + limit), total };
}

export function getWorkqueueItemsForClaim(claimId: string): WorkqueueItem[] {
  const ids = claimIndex.get(claimId);
  if (!ids) return [];
  return Array.from(ids).map(id => items.get(id)!).filter(Boolean);
}

export function getWorkqueueStats(tenantId?: string): {
  total: number;
  byType: Record<WorkqueueType, number>;
  byStatus: Record<WorkqueueItemStatus, number>;
  byPriority: Record<string, number>;
} {
  let all = Array.from(items.values());
  if (tenantId) all = all.filter(i => i.tenantId === tenantId);

  const byType: Record<string, number> = { rejection: 0, denial: 0, missing_info: 0 };
  const byStatus: Record<string, number> = { open: 0, in_progress: 0, resolved: 0, escalated: 0, dismissed: 0 };
  const byPriority: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };

  for (const item of all) {
    byType[item.type] = (byType[item.type] ?? 0) + 1;
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    byPriority[item.priority] = (byPriority[item.priority] ?? 0) + 1;
  }

  return {
    total: all.length,
    byType: byType as Record<WorkqueueType, number>,
    byStatus: byStatus as Record<WorkqueueItemStatus, number>,
    byPriority,
  };
}

export function resetWorkqueueStore(): void {
  items.clear();
  claimIndex.clear();
}
