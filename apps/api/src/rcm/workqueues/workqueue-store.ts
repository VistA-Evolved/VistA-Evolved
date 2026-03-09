/**
 * RCM -- Workqueue Store (Phase 43, durability Phase 114)
 *
 * DB-backed durable workqueue items for Rejections, Denials, and Missing Info.
 * Each workqueue item is a normalized representation of a claim issue
 * that needs human attention: why it failed, recommended fix, which
 * field to correct, and which payer rule triggered it.
 *
 * Classification: Durable Domain State (per docs/architecture/store-policy.md)
 * Survives API restart via rcm_work_item + rcm_work_item_event tables.
 *
 * Public API unchanged from Phase 43.
 */

/* ── Workqueue Types (unchanged) ───────────────────────────── */

export type WorkqueueType = 'rejection' | 'denial' | 'missing_info';

export type WorkqueueItemStatus = 'open' | 'in_progress' | 'resolved' | 'escalated' | 'dismissed';

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
  reasonCode: string;
  reasonDescription: string;
  reasonCategory?: string;

  /** Remediation */
  recommendedAction: string;
  fieldToFix?: string;
  triggeringRule?: string;

  /** Source */
  sourceType: 'ack_999' | 'ack_277ca' | 'status_277' | 'remit_835' | 'validation' | 'manual';
  sourceId?: string;
  sourceTimestamp?: string;

  /** Assignment */
  assignedTo?: string;
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

/* ── DB repo -- lazy-wired after initPlatformDb() ──────────── */

/**
 * WorkqueueRepoLike: accepts both sync (SQLite) and async (PG) repos.
 * Every method may return T or Promise<T>. The store `await`s all calls
 * (no-op for sync repos).
 */
export interface WorkqueueRepoLike {
  createWorkItem(params: any): any;
  findWorkItemById(tenantId: string, id: string): any;
  findWorkItemsForClaim(tenantId: string, claimId: string): any;
  updateWorkItem(tenantId: string, id: string, updates: any): any;
  listWorkItems(filters?: any): any;
  getWorkItemStats(tenantId?: string): any;
  appendEvent?(params: any): any;
  getEventsForWorkItem?(workItemId: string): any;
  resetWorkItems(): any;
}

let _repo: WorkqueueRepoLike | null = null;

/**
 * Wire the workqueue repo after DB init.
 * Called from index.ts once initPlatformDb() succeeds.
 * Accepts both sync (SQLite) and async (PG) repo implementations.
 */
export function initWorkqueueRepo(repo: WorkqueueRepoLike): void {
  _repo = repo;
}

/* ── Row → WorkqueueItem mapper ────────────────────────────── */

function rowToItem(row: any): WorkqueueItem {
  return {
    id: row.id,
    type: row.type as WorkqueueType,
    status: row.status as WorkqueueItemStatus,
    claimId: row.claimId,
    payerId: row.payerId ?? undefined,
    payerName: row.payerName ?? undefined,
    patientDfn: row.patientDfn ?? undefined,
    reasonCode: row.reasonCode,
    reasonDescription: row.reasonDescription,
    reasonCategory: row.reasonCategory ?? undefined,
    recommendedAction: row.recommendedAction,
    fieldToFix: row.fieldToFix ?? undefined,
    triggeringRule: row.triggeringRule ?? undefined,
    sourceType: row.sourceType as WorkqueueItem['sourceType'],
    sourceId: row.sourceId ?? undefined,
    sourceTimestamp: row.sourceTimestamp ?? undefined,
    assignedTo: row.assignedTo ?? undefined,
    priority: row.priority as WorkqueueItem['priority'],
    dueDate: row.dueDate ?? undefined,
    resolvedAt: row.resolvedAt ?? undefined,
    resolvedBy: row.resolvedBy ?? undefined,
    resolutionNote: row.resolutionNote ?? undefined,
    tenantId: row.tenantId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/* ── CRUD (same signatures as Phase 43, now async for PG) ──── */

export async function createWorkqueueItem(params: {
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
}): Promise<WorkqueueItem> {
  if (_repo) {
    const row = await _repo.createWorkItem({
      type: params.type,
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
      priority: params.priority,
      tenantId: params.tenantId,
    });
    return rowToItem(row);
  }
  throw new Error('Workqueue store not initialized (DB not ready)');
}

export async function getWorkqueueItem(
  tenantId: string,
  id: string
): Promise<WorkqueueItem | undefined> {
  if (_repo) {
    const row = await _repo.findWorkItemById(tenantId, id);
    return row ? rowToItem(row) : undefined;
  }
  return undefined;
}

export async function updateWorkqueueItem(
  tenantId: string,
  id: string,
  updates: Partial<WorkqueueItem>
): Promise<WorkqueueItem | undefined> {
  if (_repo) {
    const row = await _repo.updateWorkItem(tenantId, id, updates as any);
    return row ? rowToItem(row) : undefined;
  }
  return undefined;
}

export async function listWorkqueueItems(filters?: {
  type?: WorkqueueType;
  status?: WorkqueueItemStatus;
  claimId?: string;
  payerId?: string;
  priority?: WorkqueueItem['priority'];
  tenantId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: WorkqueueItem[]; total: number }> {
  if (_repo) {
    const result = await _repo.listWorkItems(filters);
    return { items: result.items.map(rowToItem), total: result.total };
  }
  return { items: [], total: 0 };
}

export async function getWorkqueueItemsForClaim(
  tenantId: string,
  claimId: string
): Promise<WorkqueueItem[]> {
  if (_repo) {
    const rows = await _repo.findWorkItemsForClaim(tenantId, claimId);
    return rows.map(rowToItem);
  }
  return [];
}

export async function getWorkqueueStats(tenantId?: string): Promise<{
  total: number;
  byType: Record<WorkqueueType, number>;
  byStatus: Record<WorkqueueItemStatus, number>;
  byPriority: Record<string, number>;
}> {
  if (_repo) {
    const stats = await _repo.getWorkItemStats(tenantId);
    return {
      total: stats.total,
      byType: stats.byType as Record<WorkqueueType, number>,
      byStatus: stats.byStatus as Record<WorkqueueItemStatus, number>,
      byPriority: stats.byPriority,
    };
  }
  return {
    total: 0,
    byType: { rejection: 0, denial: 0, missing_info: 0 },
    byStatus: { open: 0, in_progress: 0, resolved: 0, escalated: 0, dismissed: 0 },
    byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
  };
}

/**
 * Count work items by sourceType and sourceId (for dedup in background jobs).
 * Returns the number of non-resolved items matching the criteria.
 */
export async function countWorkqueueItemsBySource(
  sourceType: WorkqueueItem['sourceType'],
  sourceId: string
): Promise<number> {
  if (_repo) {
    const result = await _repo.listWorkItems({
      sourceType,
      sourceId,
      limit: 1,
    });
    return result.total;
  }
  return 0;
}

export async function resetWorkqueueStore(): Promise<void> {
  if (_repo) {
    await _repo.resetWorkItems();
  }
}
