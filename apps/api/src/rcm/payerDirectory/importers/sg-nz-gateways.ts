/**
 * Importer: SG / NZ National Gateway Payers
 *
 * Phase 44: National rails for Singapore and New Zealand.
 * These are not "payer lists" — they are national gateway entries.
 *
 * SG: NPHC (MediSave/MediShield claims platform)
 * NZ: ACC (Accident Compensation Corporation Claim API)
 */

import type { PayerImporter, ImportResult, DirectoryPayer } from '../types.js';

const NOW = () => new Date().toISOString();

function buildSgPayers(now: string): DirectoryPayer[] {
  return [
    {
      payerId: 'SG-NPHC',
      displayName: 'National Platform for Healthcare Claims (NPHC)',
      country: 'SG',
      payerType: 'NATIONAL',
      channels: [{
        type: 'NATIONAL_GATEWAY',
        connectorId: 'nphc-sg',
        endpoint: 'https://www.nphc.gov.sg',
        notes: 'MediSave/MediShield Life claims submission',
      }],
      supportedTransactions: [],
      payerIdsByNetwork: {},
      regulatorySource: {
        authority: 'Ministry of Health Singapore',
        documentTitle: 'NPHC Access Process',
        documentUrl: 'https://www.moh.gov.sg/nphc',
      },
      integrationMode: 'government_portal',
      status: 'active',
      category: 'government',
      notes: 'National claims platform for MediSave/MediShield Life. All Singapore providers must submit via NPHC.',
      createdAt: now,
      updatedAt: now,
    },
    {
      payerId: 'SG-MEDISAVE',
      displayName: 'MediSave (CPF Board)',
      country: 'SG',
      payerType: 'NATIONAL',
      channels: [{
        type: 'NATIONAL_GATEWAY',
        connectorId: 'nphc-sg',
        notes: 'Claims via NPHC for MediSave drawdown',
      }],
      supportedTransactions: [],
      payerIdsByNetwork: {},
      integrationMode: 'government_portal',
      status: 'active',
      category: 'government',
      notes: 'Individual medical savings account. Claims processed via NPHC.',
      createdAt: now,
      updatedAt: now,
    },
    {
      payerId: 'SG-MEDISHIELD',
      displayName: 'MediShield Life (CPF Board)',
      country: 'SG',
      payerType: 'NATIONAL',
      channels: [{
        type: 'NATIONAL_GATEWAY',
        connectorId: 'nphc-sg',
        notes: 'Claims via NPHC for MediShield Life',
      }],
      supportedTransactions: [],
      payerIdsByNetwork: {},
      integrationMode: 'government_portal',
      status: 'active',
      category: 'government',
      notes: 'Universal catastrophic health insurance. Claims via NPHC.',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function buildNzPayers(now: string): DirectoryPayer[] {
  return [
    {
      payerId: 'NZ-ACC',
      displayName: 'Accident Compensation Corporation (ACC)',
      country: 'NZ',
      payerType: 'NATIONAL',
      channels: [{
        type: 'DIRECT_API',
        connectorId: 'acc-nz',
        endpoint: 'https://api.acc.co.nz',
        notes: 'ACC Claim API for injury claims',
      }],
      supportedTransactions: ['ACC_CLAIM', 'ACC_STATUS'],
      payerIdsByNetwork: {},
      regulatorySource: {
        authority: 'ACC New Zealand',
        documentTitle: 'ACC Claim API Documentation',
        documentUrl: 'https://www.acc.co.nz/for-providers/lodging-claims/',
      },
      integrationMode: 'direct_api',
      status: 'active',
      category: 'government',
      notes: 'No-fault accident insurance. All injury claims go through ACC regardless of private insurance.',
      createdAt: now,
      updatedAt: now,
    },
    {
      payerId: 'NZ-SOUTHERNCROSS',
      displayName: 'Southern Cross Health Insurance',
      country: 'NZ',
      payerType: 'PRIVATE',
      channels: [{ type: 'PORTAL_BATCH', notes: 'Southern Cross provider portal' }],
      supportedTransactions: [],
      payerIdsByNetwork: {},
      integrationMode: 'portal_batch',
      status: 'active',
      category: 'commercial',
      notes: 'Largest private health insurer in NZ.',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export const sgNzGatewayImporter: PayerImporter = {
  id: 'SG_NZ_NationalGateways',
  name: 'Singapore & New Zealand National Gateway Payers',
  country: 'SG', // primary; also covers NZ

  importFromSnapshot(): ImportResult {
    const now = NOW();
    const sgPayers = buildSgPayers(now);
    const nzPayers = buildNzPayers(now);

    return {
      importerId: this.id,
      country: 'SG',
      payers: [...sgPayers, ...nzPayers],
      source: {
        authority: 'MOH Singapore / ACC New Zealand',
        documentTitle: 'National gateway entity seeds',
      },
      importedAt: now,
      errors: [],
    };
  },
};
