/**
 * buildPortabilityPlan.ts -- Phase 80
 *
 * Generates /artifacts/phase80/portability-plan.json describing
 * which VistA RPCs are used for patient record portability and
 * which are integration-pending with GMTS/ORWRP prereqs.
 *
 * Run: npx tsx scripts/portability/buildPortabilityPlan.ts
 *
 * Does NOT require a running VistA instance -- generates a static
 * capability map based on known VistA Health Summary infrastructure.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

/* ------------------------------------------------------------------ */
/* VistA Health Summary / Report RPC Inventory                          */
/* ------------------------------------------------------------------ */

interface RpcCapability {
  rpc: string;
  purpose: string;
  status: 'available' | 'integration-pending';
  vistaFile?: string;
  notes?: string;
}

interface PortabilityPlanSection {
  section: string;
  label: string;
  rpcUsed: RpcCapability[];
  pendingTargets: RpcCapability[];
  exportFormats: string[];
}

interface PortabilityPlan {
  version: string;
  phase: number;
  generatedAt: string;
  description: string;
  summaryGeneration: {
    primaryRpc: string;
    fallbackRpc: string;
    healthSummaryTypes: string[];
    notes: string;
  };
  sections: PortabilityPlanSection[];
  shareFeatures: {
    tokenBased: boolean;
    ttlDefault: string;
    ttlMax: string;
    accessCodeRequired: boolean;
    dobVerification: boolean;
    revocable: boolean;
    auditTrail: boolean;
  };
  encryptionPosture: {
    atRest: string;
    algorithm: string;
    keyManagement: string;
    notes: string;
  };
}

/* ------------------------------------------------------------------ */
/* Build the plan                                                       */
/* ------------------------------------------------------------------ */

const plan: PortabilityPlan = {
  version: '1.0.0',
  phase: 80,
  generatedAt: new Date().toISOString(),
  description:
    'Patient Record Portability capability map. VistA Health Summary RPCs ' +
    'are the primary mechanism for generating patient summaries. Sections ' +
    'that lack sandbox data use integration-pending status with explicit ' +
    'target RPCs documented for production migration.',

  summaryGeneration: {
    primaryRpc: 'ORWRP REPORT TEXT',
    fallbackRpc: 'ORWRP REPORT LISTS',
    healthSummaryTypes: [
      'GMTS HS ABBREVIATED PROFILE',
      'GMTS HS CLINICAL PROFILE',
      'GMTS HS COMPLETE PROFILE',
      'GMTS HS OUTPATIENT PROFILE',
      'GMTS HS INPATIENT PROFILE',
    ],
    notes:
      'ORWRP REPORT TEXT returns formatted Health Summary text for a given ' +
      'patient + HS type. ORWRP REPORT LISTS enumerates available report ' +
      'types including Health Summary types from the GMTS namespace. ' +
      'The WorldVistA sandbox has these RPCs callable; data availability ' +
      'varies by patient and configuration.',
  },

  sections: [
    {
      section: 'allergies',
      label: 'Allergies / Adverse Reactions',
      rpcUsed: [{ rpc: 'ORQQAL LIST', purpose: 'List patient allergies', status: 'available' }],
      pendingTargets: [],
      exportFormats: ['pdf', 'html', 'json'],
    },
    {
      section: 'medications',
      label: 'Active Medications',
      rpcUsed: [{ rpc: 'ORWPS ACTIVE', purpose: 'Active medication list', status: 'available' }],
      pendingTargets: [],
      exportFormats: ['pdf', 'html', 'json'],
    },
    {
      section: 'problems',
      label: 'Active Problems',
      rpcUsed: [{ rpc: 'ORQQPL LIST', purpose: 'Problem list', status: 'available' }],
      pendingTargets: [],
      exportFormats: ['pdf', 'html', 'json'],
    },
    {
      section: 'vitals',
      label: 'Vitals / Measurements',
      rpcUsed: [
        { rpc: 'GMV VITALS/CAT/QUAL', purpose: 'Vital categories', status: 'available' },
        { rpc: 'ORQQVI VITALS', purpose: 'Patient vitals', status: 'available' },
      ],
      pendingTargets: [],
      exportFormats: ['pdf', 'html', 'json'],
    },
    {
      section: 'labs',
      label: 'Laboratory Results',
      rpcUsed: [{ rpc: 'ORWLRR INTERIMG', purpose: 'Interim lab results', status: 'available' }],
      pendingTargets: [
        {
          rpc: 'ORWLRR CHART',
          purpose: 'Lab chart data for trending',
          status: 'integration-pending',
          notes: 'Requires lab data populated in sandbox',
        },
      ],
      exportFormats: ['pdf', 'html', 'json'],
    },
    {
      section: 'immunizations',
      label: 'Immunizations',
      rpcUsed: [],
      pendingTargets: [
        {
          rpc: 'ORQQPX IMMUN LIST',
          purpose: 'Patient immunization records',
          status: 'integration-pending',
          vistaFile: '^AUPNVIMM',
          notes: 'RPC callable but returns empty in WorldVistA sandbox',
        },
      ],
      exportFormats: ['pdf', 'html', 'json'],
    },
    {
      section: 'notes',
      label: 'Clinical Notes (TIU)',
      rpcUsed: [
        { rpc: 'TIU DOCUMENTS BY CONTEXT', purpose: 'Signed notes list', status: 'available' },
        { rpc: 'TIU GET RECORD TEXT', purpose: 'Note text content', status: 'available' },
      ],
      pendingTargets: [],
      exportFormats: ['pdf', 'html'],
    },
    {
      section: 'healthSummary',
      label: 'VistA Health Summary (GMTS)',
      rpcUsed: [
        { rpc: 'ORWRP REPORT LISTS', purpose: 'Enumerate available HS types', status: 'available' },
        { rpc: 'ORWRP REPORT TEXT', purpose: 'Generate HS text', status: 'available' },
      ],
      pendingTargets: [
        {
          rpc: 'GMTS HS ABBREVIATED PROFILE',
          purpose: 'Direct GMTS abbreviated profile',
          status: 'integration-pending',
          notes: 'Accessible via ORWRP REPORT TEXT with appropriate HS type ID',
        },
      ],
      exportFormats: ['pdf', 'html'],
    },
    {
      section: 'demographics',
      label: 'Patient Demographics',
      rpcUsed: [{ rpc: 'ORWPT ID INFO', purpose: 'Patient identifiers', status: 'available' }],
      pendingTargets: [],
      exportFormats: ['pdf', 'html', 'json'],
    },
  ],

  shareFeatures: {
    tokenBased: true,
    ttlDefault: '60 minutes',
    ttlMax: '24 hours',
    accessCodeRequired: true,
    dobVerification: true,
    revocable: true,
    auditTrail: true,
  },

  encryptionPosture: {
    atRest: 'AES-256-GCM',
    algorithm: 'aes-256-gcm',
    keyManagement:
      'Per-export random 256-bit key stored in-memory alongside token. ' +
      'Key is destroyed when export expires or is revoked. ' +
      'Production should use HSM/KMS for key wrapping.',
    notes:
      'Export artifacts (PDF/HTML buffers) are encrypted before storage. ' +
      'Decryption happens only at download time after token validation.',
  },
};

/* ------------------------------------------------------------------ */
/* Write output                                                         */
/* ------------------------------------------------------------------ */

const outPath = resolve(process.cwd(), 'artifacts', 'phase80', 'portability-plan.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(plan, null, 2) + '\n', 'utf-8');

// Summary stats
const totalRpcs = plan.sections.reduce(
  (sum, s) => sum + s.rpcUsed.length + s.pendingTargets.length,
  0
);
const availableRpcs = plan.sections.reduce(
  (sum, s) => sum + s.rpcUsed.filter((r) => r.status === 'available').length,
  0
);
const pendingRpcs = plan.sections.reduce((sum, s) => sum + s.pendingTargets.length, 0);

console.log(`\nPortability Plan Generated`);
console.log(`  Output: ${outPath}`);
console.log(`  Sections: ${plan.sections.length}`);
console.log(`  RPCs total: ${totalRpcs}`);
console.log(`  RPCs available: ${availableRpcs}`);
console.log(`  RPCs pending: ${pendingRpcs}`);
console.log(
  `  Share features: TTL ${plan.shareFeatures.ttlDefault} (max ${plan.shareFeatures.ttlMax})`
);
console.log(`  Encryption: ${plan.encryptionPosture.atRest}`);
