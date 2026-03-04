/**
 * Importer: PH Insurance Commission HMO List
 *
 * Phase 44: Authoritative importer for Philippines payers.
 *
 * Source: Insurance Commission "List of HMOs with Certificates of Authority"
 * Snapshot stored in: reference/payer-sources/philippines/ic-hmo-list.json
 *
 * Also adds PhilHealth as the NATIONAL payer:
 *   payerId=PH-PHILHEALTH, channel=NATIONAL_GATEWAY, program=eClaims3.0
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import type { PayerImporter, ImportResult, DirectoryPayer, RegulatorySource } from '../types.js';

const __dirname_resolved =
  typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname_resolved, '..', '..', '..', '..', '..', '..');
const SNAPSHOT_PATH = 'reference/payer-sources/philippines/ic-hmo-list.json';

interface ICHmoEntry {
  name: string;
  code?: string;
  certificateNumber?: string;
  address?: string;
  status?: string;
}

function loadSnapshot(): { entries: ICHmoEntry[]; hash: string } {
  const fullPath = join(REPO_ROOT, SNAPSHOT_PATH);
  if (!existsSync(fullPath)) {
    return { entries: [], hash: '' };
  }
  const raw = readFileSync(fullPath, 'utf-8');
  const hash = createHash('sha256').update(raw).digest('hex');
  const data = JSON.parse(raw);
  return { entries: Array.isArray(data.hmos) ? data.hmos : [], hash };
}

function hmoToDirectoryPayer(hmo: ICHmoEntry, now: string): DirectoryPayer {
  const code =
    hmo.code ??
    hmo.name
      .replace(/[^A-Za-z0-9]/g, '')
      .substring(0, 20)
      .toUpperCase();
  return {
    payerId: `PH-${code}`,
    displayName: hmo.name,
    country: 'PH',
    payerType: 'PRIVATE',
    channels: [
      {
        type: 'PORTAL_BATCH',
        notes: 'HMO portal/batch upload',
      },
    ],
    supportedTransactions: ['CF1', 'CF2'],
    payerIdsByNetwork: {},
    regulatorySource: {
      authority: 'Insurance Commission',
      documentTitle: 'List of HMOs with Certificates of Authority',
      snapshotPath: SNAPSHOT_PATH,
    },
    integrationMode: 'portal_batch',
    status: 'active',
    category: 'hmo',
    notes: hmo.certificateNumber ? `Certificate: ${hmo.certificateNumber}` : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function buildPhilHealth(now: string): DirectoryPayer {
  return {
    payerId: 'PH-PHILHEALTH',
    displayName: 'Philippine Health Insurance Corporation (PhilHealth)',
    country: 'PH',
    payerType: 'NATIONAL',
    channels: [
      {
        type: 'NATIONAL_GATEWAY',
        connectorId: 'philhealth',
        endpoint: 'https://eclaims.philhealth.gov.ph',
        notes: 'eClaims 3.0 (mandatory Apr 1 2026)',
      },
    ],
    supportedTransactions: ['CF1', 'CF2', 'CF3', 'CF4'],
    payerIdsByNetwork: {
      philhealthCode: 'PHIC',
    },
    regulatorySource: {
      authority: 'PhilHealth',
      documentTitle: 'eClaims 3.0 API Specification',
      documentUrl: 'https://www.philhealth.gov.ph/partners/providers/eclaims/',
    },
    integrationMode: 'government_portal',
    status: 'active',
    category: 'government',
    notes: 'National health insurer. eClaims 3.0 mandatory for all providers Apr 1 2026.',
    createdAt: now,
    updatedAt: now,
  };
}

export const phInsuranceCommissionImporter: PayerImporter = {
  id: 'PH_InsuranceCommission_HMO',
  name: 'Philippines Insurance Commission HMO List',
  country: 'PH',

  importFromSnapshot(): ImportResult {
    const now = new Date().toISOString();
    const { entries, hash } = loadSnapshot();

    const payers: DirectoryPayer[] = [
      buildPhilHealth(now),
      ...entries.map((e) => hmoToDirectoryPayer(e, now)),
    ];

    const source: RegulatorySource = {
      authority: 'Insurance Commission of the Philippines',
      documentTitle: 'List of HMOs with Certificates of Authority',
      documentDate: '2025-12-01',
      documentUrl: 'https://www.insurance.gov.ph/list-of-hmos/',
      snapshotHash: hash || undefined,
      snapshotPath: SNAPSHOT_PATH,
    };

    return {
      importerId: this.id,
      country: 'PH',
      payers,
      source,
      importedAt: now,
      errors: entries.length === 0 ? ['No HMO entries found in snapshot file'] : [],
    };
  },
};
