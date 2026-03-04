/**
 * Importer: AU APRA Private Health Insurers
 *
 * Phase 44: Authoritative importer for Australia payers.
 *
 * Source: APRA "List of registered private health insurers"
 * Snapshot: reference/payer-sources/australia/apra-insurers.json
 *
 * Also adds Medicare Australia (ECLIPSE rail) and DVA as NATIONAL payers.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import type { PayerImporter, ImportResult, DirectoryPayer, RegulatorySource } from '../types.js';

const __dirname_resolved =
  typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname_resolved, '..', '..', '..', '..', '..', '..');
const SNAPSHOT_PATH = 'reference/payer-sources/australia/apra-insurers.json';

interface ApraInsurerEntry {
  name: string;
  code?: string;
  abn?: string;
  registrationNumber?: string;
  status?: string;
}

function loadSnapshot(): { entries: ApraInsurerEntry[]; hash: string } {
  const fullPath = join(REPO_ROOT, SNAPSHOT_PATH);
  if (!existsSync(fullPath)) {
    return { entries: [], hash: '' };
  }
  const raw = readFileSync(fullPath, 'utf-8');
  const hash = createHash('sha256').update(raw).digest('hex');
  const data = JSON.parse(raw);
  return { entries: Array.isArray(data.insurers) ? data.insurers : [], hash };
}

function insurerToDirectoryPayer(entry: ApraInsurerEntry, now: string): DirectoryPayer {
  const code =
    entry.code ??
    entry.name
      .replace(/[^A-Za-z0-9]/g, '')
      .substring(0, 20)
      .toUpperCase();
  return {
    payerId: `AU-${code}`,
    displayName: entry.name,
    country: 'AU',
    payerType: 'PRIVATE',
    channels: [
      {
        type: 'PORTAL_BATCH',
        notes: 'Private health insurer portal/batch',
      },
    ],
    supportedTransactions: ['ECLIPSE_CLAIM', 'ECLIPSE_REMIT'],
    payerIdsByNetwork: {
      apraCode: entry.registrationNumber,
    },
    regulatorySource: {
      authority: 'APRA',
      documentTitle: 'List of registered private health insurers',
      snapshotPath: SNAPSHOT_PATH,
    },
    integrationMode: 'portal_batch',
    status: 'active',
    category: 'commercial',
    notes: entry.abn ? `ABN: ${entry.abn}` : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function buildMedicareAU(now: string): DirectoryPayer {
  return {
    payerId: 'AU-MEDICARE',
    displayName: 'Medicare Australia (Services Australia)',
    country: 'AU',
    payerType: 'NATIONAL',
    channels: [
      {
        type: 'NATIONAL_GATEWAY',
        connectorId: 'eclipse-au',
        notes: 'ECLIPSE (Electronic Claiming for Practitioner Services)',
      },
    ],
    supportedTransactions: ['ECLIPSE_CLAIM', 'ECLIPSE_REMIT'],
    payerIdsByNetwork: {},
    regulatorySource: {
      authority: 'Services Australia',
      documentTitle: 'ECLIPSE Online Claiming',
      documentUrl: 'https://www.servicesaustralia.gov.au/eclipse-online-claiming',
    },
    integrationMode: 'government_portal',
    status: 'active',
    category: 'government',
    notes: 'National Medicare bulk billing and patient claiming via ECLIPSE rail.',
    createdAt: now,
    updatedAt: now,
  };
}

function buildDVA(now: string): DirectoryPayer {
  return {
    payerId: 'AU-DVA',
    displayName: "Department of Veterans' Affairs (DVA)",
    country: 'AU',
    payerType: 'NATIONAL',
    channels: [
      {
        type: 'NATIONAL_GATEWAY',
        connectorId: 'eclipse-au',
        notes: 'DVA claims via ECLIPSE rail',
      },
    ],
    supportedTransactions: ['ECLIPSE_CLAIM', 'ECLIPSE_REMIT'],
    payerIdsByNetwork: {},
    integrationMode: 'government_portal',
    status: 'active',
    category: 'government',
    notes: 'Veterans health benefits.',
    createdAt: now,
    updatedAt: now,
  };
}

export const auApraImporter: PayerImporter = {
  id: 'AU_APRA_PrivateHealthInsurers',
  name: 'Australia APRA Private Health Insurers',
  country: 'AU',

  importFromSnapshot(): ImportResult {
    const now = new Date().toISOString();
    const { entries, hash } = loadSnapshot();

    const payers: DirectoryPayer[] = [
      buildMedicareAU(now),
      buildDVA(now),
      ...entries.map((e) => insurerToDirectoryPayer(e, now)),
    ];

    const source: RegulatorySource = {
      authority: 'Australian Prudential Regulation Authority (APRA)',
      documentTitle: 'List of registered private health insurers',
      documentDate: '2025-09-30',
      documentUrl: 'https://www.apra.gov.au/register-of-private-health-insurers',
      snapshotHash: hash || undefined,
      snapshotPath: SNAPSHOT_PATH,
    };

    return {
      importerId: this.id,
      country: 'AU',
      payers,
      source,
      importedAt: now,
      errors: entries.length === 0 ? ['No APRA insurer entries found in snapshot file'] : [],
    };
  },
};
