/**
 * Evidence Ingest Pipeline — Phase 95B
 *
 * Three ingest modes:
 *   Mode 1 (required): ingest committed JSON snapshot
 *   Mode 2 (optional): admin upload of PDF evidence
 *   Mode 3 (optional, OFF by default): fetch URL to download evidence
 *
 * Rules:
 *   - Always store sha256, as_of_date, ingested_at, parser_version
 *   - Generate structured diff vs prior snapshot
 *   - Promote changes into payer table only via explicit "promote" step
 *   - Record audit events for ingest + promote
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  insertEvidence,
  findEvidenceById,
  findEvidenceByIdForTenant,
  updateEvidenceStatus,
} from '../pg/repo/evidence-repo.js';
import {
  findPayerById,
  insertPayer,
  updatePayer,
  listPayers,
  type PayerRow,
} from '../pg/repo/payer-repo.js';
import { bulkSetCapabilities } from '../pg/repo/capability-repo.js';

const __dirname_resolved =
  typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname_resolved, '..', '..', '..', '..', '..');
const EVIDENCE_DIR = join(REPO_ROOT, 'data', 'evidence');

/* ══════════════════════════════════════════════════════════════ */
/* Mode 1: Ingest from committed JSON snapshot                    */
/* ══════════════════════════════════════════════════════════════ */

interface SnapshotPayer {
  payerId: string;
  name: string;
  country?: string;
  integrationMode?: string;
  category?: string;
  aliases?: string[];
  capabilities?: Record<string, string>;
  [key: string]: unknown;
}

export interface IngestResult {
  ok: boolean;
  snapshotId: string;
  payerCount: number;
  sha256: string;
  diff: SnapshotDiff | null;
  error?: string;
}

export interface SnapshotDiff {
  added: string[];
  removed: string[];
  modified: Array<{ payerId: string; changes: string[] }>;
  unchanged: number;
}

/**
 * Ingest a JSON snapshot from a committed file or raw JSON string.
 * Creates an evidence_snapshot record and computes diff vs current DB state.
 * Does NOT modify payer table — use promoteSnapshot() for that.
 */
export async function ingestJsonSnapshot(params: {
  jsonContent: string;
  sourceUrl?: string;
  asOfDate: string;
  actor?: string;
  tenantId?: string;
}): Promise<IngestResult> {
  try {
    let raw = params.jsonContent;
    // Strip BOM (BUG-064)
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

    const data = JSON.parse(raw);
    const payerList: SnapshotPayer[] = Array.isArray(data.payers)
      ? data.payers
      : Array.isArray(data)
        ? data
        : [];

    if (payerList.length === 0) {
      return {
        ok: false,
        snapshotId: '',
        payerCount: 0,
        sha256: '',
        diff: null,
        error: 'No payers found in snapshot',
      };
    }

    // Compute SHA-256 of the raw content
    const sha256 = createHash('sha256').update(raw).digest('hex');

    // Store the snapshot file locally
    if (!existsSync(EVIDENCE_DIR)) {
      mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
    const snapshotFilename = `snapshot_${Date.now()}_${sha256.slice(0, 8)}.json`;
    const storedPath = join(EVIDENCE_DIR, snapshotFilename);
    writeFileSync(storedPath, raw, 'utf-8');

    // Create evidence record
    const evidence = await insertEvidence({
      sourceType: 'json_snapshot',
      sourceUrl: params.sourceUrl ?? undefined,
      asOfDate: params.asOfDate,
      sha256,
      storedPath: `data/evidence/${snapshotFilename}`,
      parserVersion: '1.0.0',
      payerCount: payerList.length,
      tenantId: params.tenantId ?? null,
    });

    // Compute diff vs current DB state
    const diff = await computeSnapshotDiff(payerList);

    return {
      ok: true,
      snapshotId: evidence.id,
      payerCount: payerList.length,
      sha256,
      diff,
    };
  } catch (err) {
    return {
      ok: false,
      snapshotId: '',
      payerCount: 0,
      sha256: '',
      diff: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/* ══════════════════════════════════════════════════════════════ */
/* Mode 2: Ingest uploaded PDF evidence                           */
/* ══════════════════════════════════════════════════════════════ */

export interface PdfIngestResult {
  ok: boolean;
  snapshotId: string;
  sha256: string;
  storedPath: string;
  message: string;
}

/**
 * Store a PDF evidence artifact. Does NOT parse PDF content —
 * that's a future enhancement. The PDF is stored and hashed.
 */
export async function ingestPdfEvidence(params: {
  buffer: Buffer;
  filename: string;
  asOfDate: string;
  actor?: string;
  tenantId?: string;
}): Promise<PdfIngestResult> {
  try {
    if (!existsSync(EVIDENCE_DIR)) {
      mkdirSync(EVIDENCE_DIR, { recursive: true });
    }

    const sha256 = createHash('sha256').update(params.buffer).digest('hex');
    const storedFilename = `evidence_${Date.now()}_${sha256.slice(0, 8)}_${params.filename}`;
    const storedPath = join(EVIDENCE_DIR, storedFilename);
    writeFileSync(storedPath, params.buffer);

    const evidence = await insertEvidence({
      sourceType: 'pdf_upload',
      asOfDate: params.asOfDate,
      sha256,
      storedPath: `data/evidence/${storedFilename}`,
      parserVersion: '1.0.0',
      tenantId: params.tenantId ?? null,
    });

    return {
      ok: true,
      snapshotId: evidence.id,
      sha256,
      storedPath: `data/evidence/${storedFilename}`,
      message: 'PDF evidence stored. Parsing not implemented — evidence stored for manual review.',
    };
  } catch (err) {
    return {
      ok: false,
      snapshotId: '',
      sha256: '',
      storedPath: '',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/* ══════════════════════════════════════════════════════════════ */
/* Diff computation                                               */
/* ══════════════════════════════════════════════════════════════ */

/**
 * Compute structured diff between a snapshot's payer list and
 * the current DB state.
 */
export async function computeSnapshotDiff(snapshotPayers: SnapshotPayer[]): Promise<SnapshotDiff> {
  const { rows: dbPayers } = await listPayers({ limit: 10000 });
  const dbPayerIds = new Set(dbPayers.map((p: PayerRow) => p.id));
  const snapshotPayerIds = new Set(snapshotPayers.map((p: SnapshotPayer) => p.payerId));

  const added: string[] = [];
  const removed: string[] = [];
  const modified: Array<{ payerId: string; changes: string[] }> = [];
  let unchanged = 0;

  // Check for added or modified payers
  for (const sp of snapshotPayers) {
    if (!dbPayerIds.has(sp.payerId)) {
      added.push(sp.payerId);
    } else {
      const dbPayer = dbPayers.find((p: PayerRow) => p.id === sp.payerId);
      if (dbPayer) {
        const changes: string[] = [];
        if (dbPayer.canonicalName !== sp.name)
          changes.push(`name: "${dbPayer.canonicalName}" → "${sp.name}"`);
        if (dbPayer.integrationMode !== (sp.integrationMode ?? null))
          changes.push(`integrationMode: "${dbPayer.integrationMode}" → "${sp.integrationMode}"`);
        if (dbPayer.category !== (sp.category ?? null))
          changes.push(`category: "${dbPayer.category}" → "${sp.category}"`);
        if (changes.length > 0) {
          modified.push({ payerId: sp.payerId, changes });
        } else {
          unchanged++;
        }
      }
    }
  }

  // Check for removed payers (in DB but not in snapshot)
  for (const dbId of dbPayerIds) {
    if (!snapshotPayerIds.has(dbId)) {
      removed.push(dbId);
    }
  }

  return { added, removed, modified, unchanged };
}

/* ══════════════════════════════════════════════════════════════ */
/* Promote: apply snapshot changes to payer table                 */
/* ══════════════════════════════════════════════════════════════ */

export interface PromoteResult {
  ok: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  error?: string;
}

/**
 * Promote a pending evidence snapshot into the payer table.
 * Reads the stored JSON file, applies adds/updates to payer table,
 * then marks the snapshot as "promoted".
 */
export async function promoteSnapshot(
  snapshotId: string,
  actor?: string,
  tenantId?: string
): Promise<PromoteResult> {
  try {
    const evidence = tenantId
      ? await findEvidenceByIdForTenant(tenantId, snapshotId)
      : await findEvidenceById(snapshotId);
    if (!evidence) {
      return { ok: false, inserted: 0, updated: 0, skipped: 0, error: 'Snapshot not found' };
    }
    if (evidence.status !== 'pending') {
      return {
        ok: false,
        inserted: 0,
        updated: 0,
        skipped: 0,
        error: `Snapshot status is '${evidence.status}', expected 'pending'`,
      };
    }
    if (!evidence.storedPath) {
      return { ok: false, inserted: 0, updated: 0, skipped: 0, error: 'No stored file path' };
    }

    // Read the stored JSON
    const fullPath = join(REPO_ROOT, evidence.storedPath);
    if (!existsSync(fullPath)) {
      return {
        ok: false,
        inserted: 0,
        updated: 0,
        skipped: 0,
        error: `Stored file not found: ${evidence.storedPath}`,
      };
    }

    let raw = readFileSync(fullPath, 'utf-8');
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const data = JSON.parse(raw);
    const payerList: SnapshotPayer[] = Array.isArray(data.payers)
      ? data.payers
      : Array.isArray(data)
        ? data
        : [];

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const sp of payerList) {
      if (!sp.payerId || !sp.name) {
        skipped++;
        continue;
      }

      const existing = await findPayerById(sp.payerId);
      if (!existing) {
        await insertPayer(
          {
            id: sp.payerId,
            canonicalName: sp.name,
            aliases: JSON.stringify(sp.aliases ?? []),
            countryCode: sp.country ?? 'PH',
            category: (sp.category ?? null) as string,
            integrationMode: (sp.integrationMode ?? null) as string,
            active: true,
          },
          `Promoted from evidence snapshot ${snapshotId}`,
          actor
        );
        inserted++;
      } else {
        // Only update if something changed
        const changes: Record<string, unknown> = {};
        if (existing.canonicalName !== sp.name) changes.canonicalName = sp.name;
        if (sp.integrationMode && existing.integrationMode !== sp.integrationMode) {
          changes.integrationMode = sp.integrationMode;
        }
        if (sp.category && existing.category !== sp.category) {
          changes.category = sp.category;
        }
        if (sp.aliases) {
          const newAliases = JSON.stringify(sp.aliases);
          if (existing.aliases !== newAliases) changes.aliases = sp.aliases;
        }

        if (Object.keys(changes).length > 0) {
          await updatePayer(
            existing.id,
            changes as any,
            `Promoted from evidence snapshot ${snapshotId}`,
            actor
          );
          updated++;
        } else {
          skipped++;
        }
      }

      // If snapshot includes capabilities, set them
      if (sp.capabilities && typeof sp.capabilities === 'object') {
        const caps = Object.entries(sp.capabilities).map(([key, value]) => ({
          key,
          value: String(value),
          confidence: 'inferred' as const,
        }));
        if (caps.length > 0) {
          await bulkSetCapabilities(
            sp.payerId,
            caps,
            snapshotId,
            `Promoted from evidence snapshot ${snapshotId}`,
            actor
          );
        }
      }
    }

    // Mark snapshot as promoted
    await updateEvidenceStatus(
      snapshotId,
      'promoted',
      `Promoted by ${actor ?? 'system'}: ${inserted} inserted, ${updated} updated`,
      actor
    );

    return { ok: true, inserted, updated, skipped };
  } catch (err) {
    return {
      ok: false,
      inserted: 0,
      updated: 0,
      skipped: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
