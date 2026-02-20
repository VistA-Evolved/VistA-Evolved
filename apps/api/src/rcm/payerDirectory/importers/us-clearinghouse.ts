/**
 * Importer: US Clearinghouse Payer Directories
 *
 * Phase 44: File-drop importers for US clearinghouse/network payer rosters.
 *
 * Strategy: Do NOT enumerate every US payer manually.
 * The mechanism is: directory import + receiver IDs from clearinghouse rosters.
 *
 * Three import interfaces:
 * 1. Clearinghouse CSV/JSON file drop (generic)
 * 2. Availity directory import
 * 3. Office Ally directory import
 *
 * Also seeds "network entities" as payers:
 *   US-NETWORK-AVAILITY, US-CLEARINGHOUSE-OFFICEALLY
 */

import type { PayerImporter, ImportResult, DirectoryPayer, RegulatorySource } from '../types.js';

const NOW = () => new Date().toISOString();

/* ── Network Entity Seeds ───────────────────────────────────── */

function buildNetworkEntities(now: string): DirectoryPayer[] {
  return [
    {
      payerId: 'US-NETWORK-AVAILITY',
      displayName: 'Availity Health Information Network',
      country: 'US',
      payerType: 'NETWORK',
      channels: [{
        type: 'EDI_CLEARINGHOUSE',
        connectorId: 'availity',
        endpoint: 'https://apps.availity.com',
        notes: 'Availity EDI gateway — routes to 2000+ US payers',
      }],
      supportedTransactions: ['837P', '837I', '835', '270', '271', '276', '277', '278', '999'],
      payerIdsByNetwork: { availityPayerId: 'AVAILITY' },
      integrationMode: 'clearinghouse_edi',
      status: 'active',
      category: 'network',
      notes: 'Gateway for US EDI transactions. Individual payer IDs resolved via Availity payer directory.',
      createdAt: now,
      updatedAt: now,
    },
    {
      payerId: 'US-CLEARINGHOUSE-OFFICEALLY',
      displayName: 'Office Ally Clearinghouse',
      country: 'US',
      payerType: 'CLEARINGHOUSE',
      channels: [{
        type: 'EDI_CLEARINGHOUSE',
        connectorId: 'officeally',
        endpoint: 'https://pm.officeally.com',
        notes: 'Office Ally EDI — free-tier clearinghouse for small practices',
      }],
      supportedTransactions: ['837P', '837I', '835', '270', '271', '276', '277', '999'],
      payerIdsByNetwork: { officeAllyPayerId: 'OFFICEALLY' },
      integrationMode: 'clearinghouse_edi',
      status: 'active',
      category: 'clearinghouse',
      notes: 'Free-tier US clearinghouse. Supports 8000+ payers via receiver ID mapping.',
      createdAt: now,
      updatedAt: now,
    },
    {
      payerId: 'US-CLEARINGHOUSE-STEDI',
      displayName: 'Stedi EDI Platform',
      country: 'US',
      payerType: 'CLEARINGHOUSE',
      channels: [{
        type: 'EDI_CLEARINGHOUSE',
        connectorId: 'stedi',
        endpoint: 'https://api.stedi.com',
        notes: 'Stedi API-first EDI platform',
      }],
      supportedTransactions: ['837P', '837I', '835', '270', '271', '276', '277', '278', '999'],
      payerIdsByNetwork: { stediPayerId: 'STEDI' },
      integrationMode: 'clearinghouse_edi',
      status: 'active',
      category: 'clearinghouse',
      notes: 'API-first clearinghouse. Payer routing via Stedi directory.',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/* ── US Federal Payers ──────────────────────────────────────── */

function buildFederalPayers(now: string): DirectoryPayer[] {
  return [
    {
      payerId: 'US-MEDICARE-A',
      displayName: 'Medicare Part A (Hospital Insurance)',
      country: 'US',
      payerType: 'NATIONAL',
      channels: [{ type: 'EDI_CLEARINGHOUSE', receiverId: '00112', notes: 'CMS MAC' }],
      supportedTransactions: ['837I', '835', '270', '271', '276', '277', '999'],
      payerIdsByNetwork: { cmsPayerId: 'MEDICARE-A', naicCode: '00112' },
      integrationMode: 'clearinghouse_edi',
      status: 'active',
      category: 'government',
      createdAt: now,
      updatedAt: now,
    },
    {
      payerId: 'US-MEDICARE-B',
      displayName: 'Medicare Part B (Medical Insurance)',
      country: 'US',
      payerType: 'NATIONAL',
      channels: [{ type: 'EDI_CLEARINGHOUSE', receiverId: '00112', notes: 'CMS MAC' }],
      supportedTransactions: ['837P', '835', '270', '271', '276', '277', '999'],
      payerIdsByNetwork: { cmsPayerId: 'MEDICARE-B', naicCode: '00112' },
      integrationMode: 'clearinghouse_edi',
      status: 'active',
      category: 'government',
      createdAt: now,
      updatedAt: now,
    },
    {
      payerId: 'US-MEDICAID',
      displayName: 'Medicaid (State Programs)',
      country: 'US',
      payerType: 'NATIONAL',
      channels: [{ type: 'EDI_CLEARINGHOUSE', notes: 'Varies by state fiscal intermediary' }],
      supportedTransactions: ['837P', '837I', '835', '270', '271', '999'],
      payerIdsByNetwork: {},
      integrationMode: 'clearinghouse_edi',
      status: 'active',
      category: 'government',
      createdAt: now,
      updatedAt: now,
    },
    {
      payerId: 'US-TRICARE',
      displayName: 'TRICARE (Military Health System)',
      country: 'US',
      payerType: 'NATIONAL',
      channels: [{ type: 'EDI_CLEARINGHOUSE', receiverId: 'TRICARE', notes: 'Managed by DHA' }],
      supportedTransactions: ['837P', '837I', '835', '270', '271', '999'],
      payerIdsByNetwork: { naicCode: '99726' },
      integrationMode: 'clearinghouse_edi',
      status: 'active',
      category: 'government',
      createdAt: now,
      updatedAt: now,
    },
    {
      payerId: 'US-VA',
      displayName: 'Veterans Affairs Health (Community Care)',
      country: 'US',
      payerType: 'NATIONAL',
      channels: [{ type: 'EDI_CLEARINGHOUSE', receiverId: '84111', notes: 'VA community care' }],
      supportedTransactions: ['837P', '837I', '835', '999'],
      payerIdsByNetwork: {},
      integrationMode: 'clearinghouse_edi',
      status: 'active',
      category: 'government',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/* ── CSV/JSON File Drop Parser ──────────────────────────────── */

interface ClearinghousePayerRow {
  payerId?: string;
  payer_id?: string;
  name?: string;
  payer_name?: string;
  receiverId?: string;
  receiver_id?: string;
  network?: string;
  status?: string;
}

function parseCSV(csv: string): ClearinghousePayerRow[] {
  const lines = csv.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row as unknown as ClearinghousePayerRow;
  });
}

function rowToDirectoryPayer(row: ClearinghousePayerRow, networkId: string, now: string): DirectoryPayer | null {
  const id = row.payerId ?? row.payer_id;
  const name = row.name ?? row.payer_name;
  if (!id || !name) return null;

  const netIds: Record<string, string> = {};
  if (networkId === 'availity') netIds.availityPayerId = id;
  else if (networkId === 'officeally') netIds.officeAllyPayerId = id;
  else if (networkId === 'stedi') netIds.stediPayerId = id;

  return {
    payerId: `US-${id}`,
    displayName: name,
    country: 'US',
    payerType: 'PRIVATE',
    channels: [{
      type: 'EDI_CLEARINGHOUSE',
      connectorId: networkId,
      receiverId: row.receiverId ?? row.receiver_id,
    }],
    supportedTransactions: ['837P', '835', '270', '271', '999'],
    payerIdsByNetwork: netIds,
    integrationMode: 'clearinghouse_edi',
    status: 'active',
    category: 'commercial',
    createdAt: now,
    updatedAt: now,
  };
}

/* ── Generic Clearinghouse Importer ─────────────────────────── */

export const usClearinghouseImporter: PayerImporter = {
  id: 'US_Clearinghouse_Generic',
  name: 'US Clearinghouse Payer Directory (Generic)',
  country: 'US',

  importFromSnapshot(): ImportResult {
    const now = NOW();
    // Snapshot import returns network entities + federal payers
    return {
      importerId: this.id,
      country: 'US',
      payers: [...buildNetworkEntities(now), ...buildFederalPayers(now)],
      source: {
        authority: 'Multiple clearinghouses',
        documentTitle: 'Network entity seeds + federal payers',
      },
      importedAt: now,
      errors: [],
    };
  },

  importFromFile(data: string, format: 'csv' | 'json'): ImportResult {
    const now = NOW();
    const errors: string[] = [];
    let rows: ClearinghousePayerRow[] = [];

    if (format === 'csv') {
      rows = parseCSV(data);
    } else {
      try {
        const parsed = JSON.parse(data);
        rows = Array.isArray(parsed) ? parsed : (parsed.payers ?? []);
      } catch {
        errors.push('Invalid JSON format');
      }
    }

    const payers = rows
      .map(r => rowToDirectoryPayer(r, 'clearinghouse', now))
      .filter((p): p is DirectoryPayer => p !== null);

    return {
      importerId: this.id,
      country: 'US',
      payers: [...buildNetworkEntities(now), ...buildFederalPayers(now), ...payers],
      source: {
        authority: 'Clearinghouse file import',
        documentTitle: `Imported ${payers.length} payers from ${format.toUpperCase()} file`,
      },
      importedAt: now,
      errors,
    };
  },
};

/* ── Availity Importer ──────────────────────────────────────── */

export const usAvailityImporter: PayerImporter = {
  id: 'US_Availity_Directory',
  name: 'Availity Payer Directory Import',
  country: 'US',

  importFromSnapshot(): ImportResult {
    const now = NOW();
    return {
      importerId: this.id,
      country: 'US',
      payers: buildNetworkEntities(now).filter(p => p.payerId === 'US-NETWORK-AVAILITY'),
      source: { authority: 'Availity', documentTitle: 'Availity network entity seed' },
      importedAt: now,
      errors: [],
    };
  },

  importFromFile(data: string, format: 'csv' | 'json'): ImportResult {
    const now = NOW();
    const errors: string[] = [];
    let rows: ClearinghousePayerRow[] = [];

    if (format === 'csv') {
      rows = parseCSV(data);
    } else {
      try {
        const parsed = JSON.parse(data);
        rows = Array.isArray(parsed) ? parsed : (parsed.payers ?? []);
      } catch {
        errors.push('Invalid JSON format');
      }
    }

    const payers = rows
      .map(r => rowToDirectoryPayer(r, 'availity', now))
      .filter((p): p is DirectoryPayer => p !== null);

    return {
      importerId: this.id,
      country: 'US',
      payers,
      source: {
        authority: 'Availity',
        documentTitle: `Availity directory: ${payers.length} payers`,
        documentUrl: 'https://apps.availity.com/public/apps/home/#!/payerlist',
      },
      importedAt: now,
      errors,
    };
  },
};

/* ── Office Ally Importer ───────────────────────────────────── */

export const usOfficeAllyImporter: PayerImporter = {
  id: 'US_OfficeAlly_Directory',
  name: 'Office Ally Payer Directory Import',
  country: 'US',

  importFromSnapshot(): ImportResult {
    const now = NOW();
    return {
      importerId: this.id,
      country: 'US',
      payers: buildNetworkEntities(now).filter(p => p.payerId === 'US-CLEARINGHOUSE-OFFICEALLY'),
      source: { authority: 'Office Ally', documentTitle: 'Office Ally network entity seed' },
      importedAt: now,
      errors: [],
    };
  },

  importFromFile(data: string, format: 'csv' | 'json'): ImportResult {
    const now = NOW();
    const errors: string[] = [];
    let rows: ClearinghousePayerRow[] = [];

    if (format === 'csv') {
      rows = parseCSV(data);
    } else {
      try {
        const parsed = JSON.parse(data);
        rows = Array.isArray(parsed) ? parsed : (parsed.payers ?? []);
      } catch {
        errors.push('Invalid JSON format');
      }
    }

    const payers = rows
      .map(r => rowToDirectoryPayer(r, 'officeally', now))
      .filter((p): p is DirectoryPayer => p !== null);

    return {
      importerId: this.id,
      country: 'US',
      payers,
      source: {
        authority: 'Office Ally',
        documentTitle: `Office Ally directory: ${payers.length} payers`,
        documentUrl: 'https://pm.officeally.com',
      },
      importedAt: now,
      errors,
    };
  },
};
