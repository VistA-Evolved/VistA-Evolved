/**
 * Phase 403 (W23-P5): Document Exchange — Store
 */

import { randomBytes, createHash } from 'crypto';
import type {
  DocumentReference,
  DocumentSubmissionSet,
  DocumentExchangeDashboardStats,
} from './types.js';

const MAX_DOCUMENTS = 100_000;
const MAX_SUBMISSIONS = 10_000;

const documentStore = new Map<string, DocumentReference>();
const submissionStore = new Map<string, DocumentSubmissionSet>();

function enforceMax<T>(store: Map<string, T>, max: number): void {
  if (store.size >= max) {
    const k = store.keys().next().value;
    if (k) store.delete(k);
  }
}

function genId(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString('hex')}`;
}

// ─── Document CRUD ─────────────────────────────────────────

export function createDocument(
  input: Omit<DocumentReference, 'id' | 'createdAt' | 'updatedAt' | 'hash'>
): DocumentReference {
  enforceMax(documentStore, MAX_DOCUMENTS);
  const now = new Date().toISOString();
  const hash = input.content
    ? createHash('sha256').update(input.content).digest('hex').slice(0, 16)
    : undefined;
  const rec: DocumentReference = {
    ...input,
    id: genId('doc'),
    hash,
    createdAt: now,
    updatedAt: now,
  };
  documentStore.set(rec.id, rec);
  return rec;
}

export function getDocument(id: string): DocumentReference | undefined {
  return documentStore.get(id);
}

export function listDocuments(
  tenantId: string,
  opts?: { dfn?: string; category?: string; status?: string }
): DocumentReference[] {
  let results = Array.from(documentStore.values()).filter((d) => d.tenantId === tenantId);
  if (opts?.dfn) results = results.filter((d) => d.subject.dfn === opts.dfn);
  if (opts?.category) results = results.filter((d) => d.category === opts.category);
  if (opts?.status) results = results.filter((d) => d.status === opts.status);
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

export function updateDocument(
  id: string,
  patch: Partial<DocumentReference>
): DocumentReference | undefined {
  const rec = documentStore.get(id);
  if (!rec) return undefined;
  const updated = {
    ...rec,
    ...patch,
    id: rec.id,
    createdAt: rec.createdAt,
    updatedAt: new Date().toISOString(),
  };
  documentStore.set(id, updated);
  return updated;
}

export function searchDocuments(tenantId: string, query: string): DocumentReference[] {
  const q = query.toLowerCase();
  return Array.from(documentStore.values()).filter(
    (d) =>
      d.tenantId === tenantId &&
      ((d.description && d.description.toLowerCase().includes(q)) ||
        d.category.includes(q) ||
        (d.type && d.type.toLowerCase().includes(q)) ||
        d.author.name.toLowerCase().includes(q))
  );
}

// ─── Submission Sets ───────────────────────────────────────

export function createSubmissionSet(
  input: Omit<DocumentSubmissionSet, 'id' | 'createdAt'>
): DocumentSubmissionSet {
  enforceMax(submissionStore, MAX_SUBMISSIONS);
  const rec: DocumentSubmissionSet = {
    ...input,
    id: genId('sub'),
    createdAt: new Date().toISOString(),
  };
  submissionStore.set(rec.id, rec);
  return rec;
}

export function getSubmissionSet(id: string): DocumentSubmissionSet | undefined {
  return submissionStore.get(id);
}

export function listSubmissionSets(tenantId: string): DocumentSubmissionSet[] {
  return Array.from(submissionStore.values())
    .filter((s) => s.tenantId === tenantId)
    .sort((a, b) => b.submissionTime.localeCompare(a.submissionTime));
}

// ─── Dashboard ─────────────────────────────────────────────

export function getDocumentExchangeDashboardStats(
  tenantId: string
): DocumentExchangeDashboardStats {
  const docs = Array.from(documentStore.values()).filter((d) => d.tenantId === tenantId);
  const byCategory: Record<string, number> = {};
  for (const d of docs) {
    byCategory[d.category] = (byCategory[d.category] || 0) + 1;
  }
  return {
    totalDocuments: docs.length,
    currentDocuments: docs.filter((d) => d.status === 'current').length,
    totalSubmissionSets: Array.from(submissionStore.values()).filter((s) => s.tenantId === tenantId)
      .length,
    documentsByCategory: byCategory,
  };
}
