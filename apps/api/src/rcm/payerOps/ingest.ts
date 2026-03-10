/**
 * Payer Registry Ingestion Service -- Phase 88
 *
 * Repeatable, deterministic ingestion of Philippine regulatory payer lists:
 *   1. Insurance Commission "List of HMOs with CA" (as of 31 Dec 2025)
 *   2. Insurance Commission "List of HMO Brokers with CA" (as of 31 Dec 2025)
 *
 * Stores raw artifacts in /artifacts/regulator/<date>/ (gitignored).
 * Parses into normalized payer records.
 * Upserts into registry-store (idempotent, versioned, diff-tracked).
 *
 * NOTE: The Insurance Commission PDFs are not programmatically fetchable
 * in a deterministic way (they change URLs, use .xlsx/.pdf formats, etc.).
 * This module works from curated snapshots stored as JSON in
 * data/regulator-snapshots/ (committed to repo).
 * A future enhancement can add HTTP fetching + PDF/XLSX parsing.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSource,
  upsertRegistryPayer,
  listRegistryPayers,
  recordSnapshot,
  type PayerSourceType,
  type RegistryDiffEntry,
} from './registry-store.js';
import { initPayerCapabilities } from './capability-matrix.js';

const __dirname_resolved =
  typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname_resolved, '..', '..', '..', '..', '..');

/* -- Snapshot Data Paths --------------------------------------- */

const HMO_SNAPSHOT_PATH = 'data/regulator-snapshots/ph-ic-hmo-list.json';
const BROKER_SNAPSHOT_PATH = 'data/regulator-snapshots/ph-ic-hmo-broker-list.json';

/* -- Snapshot Entry Types -------------------------------------- */

interface HMOEntry {
  name: string;
  licenseNo?: string;
  caNumber?: string; // Certificate of Authority number
  address?: string;
  status?: string;
}

interface BrokerEntry {
  name: string;
  licenseNo?: string;
  caNumber?: string;
  address?: string;
  status?: string;
  associatedHmos?: string[]; // names of HMOs they broker for
}

interface SnapshotFile<T> {
  source: string;
  sourceUrl: string;
  asOfDate: string;
  description: string;
  entries: T[];
}

/* -- Load Snapshot --------------------------------------------- */

function loadSnapshotFile<T>(relativePath: string): SnapshotFile<T> | null {
  const fullPath = join(REPO_ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    const raw = readFileSync(fullPath, 'utf-8');
    // Strip BOM (PowerShell UTF8 BOM issue - BUG-064)
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

/* -- Artifact Storage ------------------------------------------ */

function storeArtifact(content: string, filename: string): string {
  const date = new Date().toISOString().split('T')[0];
  const dir = join(REPO_ROOT, 'artifacts', 'regulator', date);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, filename);
  writeFileSync(path, content, 'utf-8');
  return `artifacts/regulator/${date}/${filename}`;
}

/* -- Ingest HMO List ------------------------------------------- */

export interface IngestResult {
  ok: boolean;
  sourceType: PayerSourceType;
  sourceId: string;
  version: number;
  payersIngested: number;
  newPayers: number;
  updatedPayers: number;
  diff: RegistryDiffEntry[];
  errors: string[];
}

export function ingestHMOList(): IngestResult {
  const snapshot = loadSnapshotFile<HMOEntry>(HMO_SNAPSHOT_PATH);
  const errors: string[] = [];

  if (!snapshot) {
    return {
      ok: false,
      sourceType: 'ic_hmo_list',
      sourceId: '',
      version: 0,
      payersIngested: 0,
      newPayers: 0,
      updatedPayers: 0,
      diff: [],
      errors: [`Snapshot file not found: ${HMO_SNAPSHOT_PATH}`],
    };
  }

  const rawContent = JSON.stringify(snapshot);
  const artifactPath = storeArtifact(rawContent, 'ph-ic-hmo-list.json');

  // Get previous payers for diff
  const prevPayers = listRegistryPayers({ type: 'hmo', country: 'PH' });
  const prevNames = new Set(prevPayers.map((p) => p.canonicalName.toLowerCase()));

  // Create source record
  const source = createSource({
    name: snapshot.source || 'Insurance Commission - List of HMOs with CA',
    sourceType: 'ic_hmo_list',
    url: snapshot.sourceUrl || 'https://www.insurance.gov.ph/list-of-hmos/',
    asOfDate: snapshot.asOfDate || new Date().toISOString().split('T')[0],
    content: rawContent,
    recordCount: snapshot.entries.length,
    rawArtifactPath: artifactPath,
  });

  // Always add PhilHealth as government payer
  const { payer: philhealthPayer, isNew: philhealthNew } = upsertRegistryPayer({
    canonicalName: 'Philippine Health Insurance Corporation (PhilHealth)',
    type: 'government',
    regulatorRef: 'RA 7875',
    status: 'active',
    country: 'PH',
    sourceId: source.id,
    aliases: ['PhilHealth', 'PHIC'],
  });

  // Initialize capability matrix for PhilHealth when newly created
  if (philhealthNew) {
    initPayerCapabilities(philhealthPayer.id, philhealthPayer.canonicalName, 'system:ingest');
  }

  let newCount = philhealthNew ? 1 : 0;
  let updatedCount = philhealthNew ? 0 : 1;
  const newNames = new Set<string>();
  const diff: RegistryDiffEntry[] = [];

  // Upsert each HMO
  for (const entry of snapshot.entries) {
    if (!entry.name?.trim()) {
      errors.push('Skipped entry with empty name');
      continue;
    }

    const { payer, isNew } = upsertRegistryPayer({
      canonicalName: entry.name.trim(),
      type: 'hmo',
      regulatorRef: entry.caNumber || entry.licenseNo,
      status: entry.status === 'inactive' ? 'inactive' : 'active',
      country: 'PH',
      sourceId: source.id,
    });

    // Initialize capability matrix for new payers
    if (isNew) {
      initPayerCapabilities(payer.id, payer.canonicalName, 'system:ingest');
    }

    newNames.add(payer.canonicalName.toLowerCase());
    if (isNew) {
      newCount++;
      diff.push({ payerName: payer.canonicalName, change: 'added' });
    } else {
      updatedCount++;
    }
  }

  // Detect removed payers (in prev but not in new)
  for (const prevName of prevNames) {
    if (!newNames.has(prevName)) {
      diff.push({
        payerName:
          prevPayers.find((p) => p.canonicalName.toLowerCase() === prevName)?.canonicalName ??
          prevName,
        change: 'removed',
      });
    }
  }

  // Record snapshot
  recordSnapshot({
    sourceId: source.id,
    sourceType: 'ic_hmo_list',
    version: source.version,
    asOfDate: source.asOfDate,
    fetchedAt: source.fetchedAt,
    payerCount: snapshot.entries.length + 1, // +1 for PhilHealth
    diff,
  });

  return {
    ok: true,
    sourceType: 'ic_hmo_list',
    sourceId: source.id,
    version: source.version,
    payersIngested: snapshot.entries.length + 1,
    newPayers: newCount,
    updatedPayers: updatedCount,
    diff,
    errors,
  };
}

/* -- Ingest HMO Broker List ------------------------------------ */

export function ingestHMOBrokerList(): IngestResult {
  const snapshot = loadSnapshotFile<BrokerEntry>(BROKER_SNAPSHOT_PATH);
  const errors: string[] = [];

  if (!snapshot) {
    return {
      ok: false,
      sourceType: 'ic_hmo_broker_list',
      sourceId: '',
      version: 0,
      payersIngested: 0,
      newPayers: 0,
      updatedPayers: 0,
      diff: [],
      errors: [`Snapshot file not found: ${BROKER_SNAPSHOT_PATH}`],
    };
  }

  const rawContent = JSON.stringify(snapshot);
  const artifactPath = storeArtifact(rawContent, 'ph-ic-hmo-broker-list.json');

  const prevBrokers = listRegistryPayers({ type: 'hmo_broker', country: 'PH' });
  const prevNames = new Set(prevBrokers.map((p) => p.canonicalName.toLowerCase()));

  const source = createSource({
    name: snapshot.source || 'Insurance Commission - List of HMO Brokers with CA',
    sourceType: 'ic_hmo_broker_list',
    url: snapshot.sourceUrl || 'https://www.insurance.gov.ph/list-of-hmo-brokers/',
    asOfDate: snapshot.asOfDate || new Date().toISOString().split('T')[0],
    content: rawContent,
    recordCount: snapshot.entries.length,
    rawArtifactPath: artifactPath,
  });

  let newCount = 0;
  let updatedCount = 0;
  const newNames = new Set<string>();
  const diff: RegistryDiffEntry[] = [];

  for (const entry of snapshot.entries) {
    if (!entry.name?.trim()) {
      errors.push('Skipped broker entry with empty name');
      continue;
    }

    const { payer, isNew } = upsertRegistryPayer({
      canonicalName: entry.name.trim(),
      type: 'hmo_broker',
      regulatorRef: entry.caNumber || entry.licenseNo,
      status: entry.status === 'inactive' ? 'inactive' : 'active',
      country: 'PH',
      sourceId: source.id,
    });

    // Initialize capability matrix for new brokers
    if (isNew) {
      initPayerCapabilities(payer.id, payer.canonicalName, 'system:ingest');
    }

    newNames.add(payer.canonicalName.toLowerCase());
    if (isNew) {
      newCount++;
      diff.push({ payerName: payer.canonicalName, change: 'added' });
    } else {
      updatedCount++;
    }
  }

  // Detect removed
  for (const prevName of prevNames) {
    if (!newNames.has(prevName)) {
      diff.push({
        payerName:
          prevBrokers.find((p) => p.canonicalName.toLowerCase() === prevName)?.canonicalName ??
          prevName,
        change: 'removed',
      });
    }
  }

  recordSnapshot({
    sourceId: source.id,
    sourceType: 'ic_hmo_broker_list',
    version: source.version,
    asOfDate: source.asOfDate,
    fetchedAt: source.fetchedAt,
    payerCount: snapshot.entries.length,
    diff,
  });

  return {
    ok: true,
    sourceType: 'ic_hmo_broker_list',
    sourceId: source.id,
    version: source.version,
    payersIngested: snapshot.entries.length,
    newPayers: newCount,
    updatedPayers: updatedCount,
    diff,
    errors,
  };
}

/* -- Full Ingest (both sources) -------------------------------- */

export interface FullIngestResult {
  ok: boolean;
  hmo: IngestResult;
  broker: IngestResult;
  totalPayers: number;
  totalNew: number;
  timestamp: string;
}

export function runFullIngest(): FullIngestResult {
  const hmo = ingestHMOList();
  const broker = ingestHMOBrokerList();

  return {
    ok: hmo.ok || broker.ok,
    hmo,
    broker,
    totalPayers: hmo.payersIngested + broker.payersIngested,
    totalNew: hmo.newPayers + broker.newPayers,
    timestamp: new Date().toISOString(),
  };
}
