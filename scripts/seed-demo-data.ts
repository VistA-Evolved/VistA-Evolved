/**
 * Demo Seed Script -- DEMO-1
 *
 * Seeds platform PG database with realistic demo data for hospital presentations.
 * Does NOT create fake clinical data (VistA VEHU has real synthetic patients).
 *
 * Creates:
 *   - 1 tenant:  Metro General Hospital (slug: metro-general)
 *   - Updates default tenant facility name
 *   - 10 claim_draft records:  3 PhilHealth, 4 AR aging spread, 3 extra statuses
 *   - Lifecycle events for each claim
 *
 * Usage:
 *   pnpm seed:demo                              (uses PLATFORM_PG_URL from .env.local)
 *   PLATFORM_PG_URL=postgresql://... tsx scripts/seed-demo-data.ts
 *
 * Idempotent: uses ON CONFLICT DO NOTHING for tenant_config and
 *             idempotency_key uniqueness for claim_draft.
 */

import pg from 'pg';
import { randomUUID } from 'node:crypto';

const PG_URL =
  process.env.PLATFORM_PG_URL ??
  'postgresql://ve_api:ve_dev_only_change_in_prod@127.0.0.1:5433/ve_platform';

const TENANT_ID = 'default';
const NOW = new Date().toISOString();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function auditJson(actor: string, status: string): string {
  return JSON.stringify([
    {
      timestamp: NOW,
      action: `draft.${status}`,
      actor,
      toStatus: status,
      detail: `Seeded by demo script`,
    },
  ]);
}

/* ------------------------------------------------------------------ */
/* Claim definitions                                                   */
/* ------------------------------------------------------------------ */

interface ClaimSeed {
  idempotencyKey: string;
  status: string;
  claimType: string;
  patientId: string;
  patientName: string;
  providerId: string;
  payerId: string;
  payerName: string;
  dateOfService: string;
  totalChargeCents: number;
  paidAmountCents: number | null;
  denialCode: string | null;
  denialReason: string | null;
  deniedAt: string | null;
  paidAt: string | null;
  submittedAt: string | null;
  diagnosesJson: string;
  linesJson: string;
}

const DEMO_CLAIMS: ClaimSeed[] = [
  // -- PhilHealth claims --------------------------------------
  {
    idempotencyKey: 'demo-ph-approved-001',
    status: 'paid',
    claimType: 'institutional',
    patientId: '3',
    patientName: 'EIGHT,PATIENT',
    providerId: '1',
    payerId: 'PHIC-001',
    payerName: 'PhilHealth',
    dateOfService: daysAgo(14),
    totalChargeCents: 125000,
    paidAmountCents: 112500,
    denialCode: null,
    denialReason: null,
    deniedAt: null,
    paidAt: daysAgo(3),
    submittedAt: daysAgo(10),
    diagnosesJson: JSON.stringify([{ code: 'J18.9', description: 'Pneumonia, unspecified' }]),
    linesJson: JSON.stringify([
      { procedure: { code: '99213', description: 'Office visit, est. patient', charge: 75000 } },
      { procedure: { code: '71046', description: 'Chest X-ray, 2 views', charge: 50000 } },
    ]),
  },
  {
    idempotencyKey: 'demo-ph-pending-001',
    status: 'submitted',
    claimType: 'professional',
    patientId: '149',
    patientName: 'EIGHTEEN,PATIENT',
    providerId: '1',
    payerId: 'PHIC-001',
    payerName: 'PhilHealth',
    dateOfService: daysAgo(5),
    totalChargeCents: 85000,
    paidAmountCents: null,
    denialCode: null,
    denialReason: null,
    deniedAt: null,
    paidAt: null,
    submittedAt: daysAgo(3),
    diagnosesJson: JSON.stringify([{ code: 'E11.9', description: 'Type 2 diabetes mellitus' }]),
    linesJson: JSON.stringify([
      { procedure: { code: '99214', description: 'Office visit, detailed', charge: 85000 } },
    ]),
  },
  {
    idempotencyKey: 'demo-ph-denied-001',
    status: 'denied',
    claimType: 'professional',
    patientId: '224',
    patientName: 'ELEVEN,PATIENT',
    providerId: '1',
    payerId: 'PHIC-001',
    payerName: 'PhilHealth',
    dateOfService: daysAgo(21),
    totalChargeCents: 95000,
    paidAmountCents: null,
    denialCode: 'CO-4',
    denialReason: 'Procedure code inconsistent with modifier or missing modifier',
    deniedAt: daysAgo(7),
    paidAt: null,
    submittedAt: daysAgo(18),
    diagnosesJson: JSON.stringify([{ code: 'M54.5', description: 'Low back pain' }]),
    linesJson: JSON.stringify([
      { procedure: { code: '99215', description: 'Office visit, comprehensive', charge: 95000 } },
    ]),
  },

  // -- AR Aging: 0-30 day bucket ------------------------------
  {
    idempotencyKey: 'demo-ar-0-30-001',
    status: 'submitted',
    claimType: 'professional',
    patientId: '433',
    patientName: 'EIGHTY,PATIENT',
    providerId: '1',
    payerId: 'BCBS-001',
    payerName: 'Blue Cross Blue Shield',
    dateOfService: daysAgo(10),
    totalChargeCents: 180000,
    paidAmountCents: null,
    denialCode: null,
    denialReason: null,
    deniedAt: null,
    paidAt: null,
    submittedAt: daysAgo(8),
    diagnosesJson: JSON.stringify([{ code: 'I10', description: 'Essential hypertension' }]),
    linesJson: JSON.stringify([
      { procedure: { code: '99213', description: 'Office visit', charge: 75000 } },
      { procedure: { code: '80053', description: 'Comprehensive metabolic panel', charge: 45000 } },
      { procedure: { code: '93000', description: 'Electrocardiogram, 12-lead', charge: 60000 } },
    ]),
  },

  // -- AR Aging: 31-60 day bucket -----------------------------
  {
    idempotencyKey: 'demo-ar-31-60-001',
    status: 'submitted',
    claimType: 'institutional',
    patientId: '775',
    patientName: 'EIGHTYONE,PATIENT',
    providerId: '1',
    payerId: 'AETNA-001',
    payerName: 'Aetna',
    dateOfService: daysAgo(50),
    totalChargeCents: 350000,
    paidAmountCents: null,
    denialCode: null,
    denialReason: null,
    deniedAt: null,
    paidAt: null,
    submittedAt: daysAgo(45),
    diagnosesJson: JSON.stringify([
      { code: 'K80.20', description: 'Calculus of gallbladder w/o obstruction' },
    ]),
    linesJson: JSON.stringify([
      { procedure: { code: '47562', description: 'Lap cholecystectomy', charge: 350000 } },
    ]),
  },

  // -- AR Aging: 61-90 day bucket -----------------------------
  {
    idempotencyKey: 'demo-ar-61-90-001',
    status: 'submitted',
    claimType: 'professional',
    patientId: '776',
    patientName: 'EIGHTYTWO,PATIENT',
    providerId: '1',
    payerId: 'UHC-001',
    payerName: 'UnitedHealthcare',
    dateOfService: daysAgo(80),
    totalChargeCents: 220000,
    paidAmountCents: null,
    denialCode: null,
    denialReason: null,
    deniedAt: null,
    paidAt: null,
    submittedAt: daysAgo(75),
    diagnosesJson: JSON.stringify([{ code: 'J45.20', description: 'Mild intermittent asthma' }]),
    linesJson: JSON.stringify([
      { procedure: { code: '94010', description: 'Spirometry', charge: 120000 } },
      { procedure: { code: '99214', description: 'Office visit, detailed', charge: 100000 } },
    ]),
  },

  // -- AR Aging: 90+ day bucket -------------------------------
  {
    idempotencyKey: 'demo-ar-90plus-001',
    status: 'submitted',
    claimType: 'institutional',
    patientId: '777',
    patientName: 'EIGHTYTHREE,PATIENT',
    providerId: '1',
    payerId: 'CIGNA-001',
    payerName: 'Cigna',
    dateOfService: daysAgo(120),
    totalChargeCents: 480000,
    paidAmountCents: null,
    denialCode: null,
    denialReason: null,
    deniedAt: null,
    paidAt: null,
    submittedAt: daysAgo(110),
    diagnosesJson: JSON.stringify([
      { code: 'S72.001A', description: 'Fracture of unspecified part of neck of right femur' },
    ]),
    linesJson: JSON.stringify([
      {
        procedure: {
          code: '27236',
          description: 'Open treatment, femoral fracture',
          charge: 480000,
        },
      },
    ]),
  },

  // -- Extra paid claims for revenue metrics ------------------
  {
    idempotencyKey: 'demo-paid-bcbs-001',
    status: 'paid',
    claimType: 'professional',
    patientId: '778',
    patientName: 'EIGHTYFOUR,PATIENT',
    providerId: '1',
    payerId: 'BCBS-001',
    payerName: 'Blue Cross Blue Shield',
    dateOfService: daysAgo(25),
    totalChargeCents: 150000,
    paidAmountCents: 135000,
    denialCode: null,
    denialReason: null,
    deniedAt: null,
    paidAt: daysAgo(5),
    submittedAt: daysAgo(20),
    diagnosesJson: JSON.stringify([
      { code: 'J06.9', description: 'Acute upper respiratory infection' },
    ]),
    linesJson: JSON.stringify([
      { procedure: { code: '99213', description: 'Office visit', charge: 75000 } },
      { procedure: { code: '87804', description: 'Influenza test, rapid', charge: 35000 } },
      { procedure: { code: '87880', description: 'Strep test, rapid', charge: 40000 } },
    ]),
  },
  {
    idempotencyKey: 'demo-paid-uhc-001',
    status: 'paid',
    claimType: 'professional',
    patientId: '779',
    patientName: 'EIGHTYFIVE,PATIENT',
    providerId: '1',
    payerId: 'UHC-001',
    payerName: 'UnitedHealthcare',
    dateOfService: daysAgo(18),
    totalChargeCents: 95000,
    paidAmountCents: 80000,
    denialCode: null,
    denialReason: null,
    deniedAt: null,
    paidAt: daysAgo(2),
    submittedAt: daysAgo(14),
    diagnosesJson: JSON.stringify([{ code: 'R10.9', description: 'Unspecified abdominal pain' }]),
    linesJson: JSON.stringify([
      { procedure: { code: '99214', description: 'Office visit, detailed', charge: 95000 } },
    ]),
  },

  // -- Denied claim for denial rate metric --------------------
  {
    idempotencyKey: 'demo-denied-aetna-001',
    status: 'denied',
    claimType: 'professional',
    patientId: '780',
    patientName: 'EIGHTYSIX,PATIENT',
    providerId: '1',
    payerId: 'AETNA-001',
    payerName: 'Aetna',
    dateOfService: daysAgo(30),
    totalChargeCents: 110000,
    paidAmountCents: null,
    denialCode: 'CO-197',
    denialReason: 'Precertification/authorization/notification absent',
    deniedAt: daysAgo(4),
    paidAt: null,
    submittedAt: daysAgo(25),
    diagnosesJson: JSON.stringify([{ code: 'M79.3', description: 'Panniculitis, unspecified' }]),
    linesJson: JSON.stringify([
      { procedure: { code: '99215', description: 'Office visit, comprehensive', charge: 110000 } },
    ]),
  },
];

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  console.log('=== Demo Data Seeder (DEMO-1) ===\n');
  console.log(`PG URL: ${PG_URL.replace(/\/\/.*@/, '//***@')}`);

  const pool = new pg.Pool({ connectionString: PG_URL, max: 3 });

  try {
    // -- Step 1: Update default tenant facility name ------------
    console.log('\n[1/3] Updating tenant facility name...');
    const tenantResult = await pool.query(
      `UPDATE tenant_config
         SET facility_name = $1, updated_at = $2
       WHERE tenant_id = $3`,
      ['Metro General Hospital', NOW, TENANT_ID]
    );
    if (tenantResult.rowCount === 0) {
      // tenant_config may not exist yet -- insert
      await pool.query(
        `INSERT INTO tenant_config (id, tenant_id, facility_name, facility_station, vista_host, vista_port, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (tenant_id) DO UPDATE SET facility_name = EXCLUDED.facility_name, updated_at = EXCLUDED.updated_at`,
        [randomUUID(), TENANT_ID, 'Metro General Hospital', '500', '127.0.0.1', 9431, NOW, NOW]
      );
    }
    console.log('  -> Tenant "default" -> Metro General Hospital');

    // -- Step 2: Seed claim_draft records -----------------------
    console.log('\n[2/3] Seeding claim_draft records...');
    let inserted = 0;
    let skipped = 0;

    for (const c of DEMO_CLAIMS) {
      const id = randomUUID();

      // Check idempotency -- skip if already exists
      const existing = await pool.query(
        `SELECT id FROM claim_draft WHERE tenant_id = $1 AND idempotency_key = $2`,
        [TENANT_ID, c.idempotencyKey]
      );
      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      await pool.query(
        `INSERT INTO claim_draft (
           id, tenant_id, idempotency_key, status, claim_type,
           patient_id, patient_name, provider_id, payer_id, payer_name,
           date_of_service, total_charge_cents, paid_amount_cents,
           denial_code, denial_reason, denied_at, paid_at, submitted_at,
           diagnoses_json, lines_json, attachments_json, metadata_json, audit_json,
           created_at, updated_at, created_by
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8, $9, $10,
           $11, $12, $13,
           $14, $15, $16, $17, $18,
           $19, $20, '[]', '{}', $21,
           $22, $23, $24
         )`,
        [
          id,
          TENANT_ID,
          c.idempotencyKey,
          c.status,
          c.claimType,
          c.patientId,
          c.patientName,
          c.providerId,
          c.payerId,
          c.payerName,
          c.dateOfService,
          c.totalChargeCents,
          c.paidAmountCents,
          c.denialCode,
          c.denialReason,
          c.deniedAt,
          c.paidAt,
          c.submittedAt,
          c.diagnosesJson,
          c.linesJson,
          auditJson('demo-seeder', c.status),
          NOW,
          NOW,
          'demo-seeder',
        ]
      );

      // Record lifecycle event
      await pool.query(
        `INSERT INTO claim_lifecycle_event (
           id, tenant_id, claim_draft_id, from_status, to_status, actor, reason, occurred_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [randomUUID(), TENANT_ID, id, null, c.status, 'demo-seeder', 'Seeded by demo script', NOW]
      );

      inserted++;
      console.log(
        `  -> ${c.idempotencyKey}: ${c.status} (${c.payerName}, $${(c.totalChargeCents / 100).toFixed(2)})`
      );
    }
    console.log(`  Total: ${inserted} inserted, ${skipped} skipped (already exist)`);

    // -- Step 3: Summary ----------------------------------------
    console.log('\n[3/3] Verification...');
    const countResult = await pool.query(
      `SELECT status, COUNT(*) as cnt FROM claim_draft WHERE tenant_id = $1 GROUP BY status ORDER BY status`,
      [TENANT_ID]
    );
    console.log('  claim_draft by status:');
    for (const row of countResult.rows) {
      console.log(`    ${row.status}: ${row.cnt}`);
    }

    const totalResult = await pool.query(
      `SELECT COUNT(*) as total, SUM(total_charge_cents) as charges, SUM(paid_amount_cents) as paid
       FROM claim_draft WHERE tenant_id = $1`,
      [TENANT_ID]
    );
    const r = totalResult.rows[0];
    console.log(`  Total claims: ${r.total}`);
    console.log(`  Total charges: $${((r.charges || 0) / 100).toFixed(2)}`);
    console.log(`  Total paid:    $${((r.paid || 0) / 100).toFixed(2)}`);

    console.log('\n=== Demo seed complete ===');
    console.log('\nDemo patients (from VistA VEHU):');
    console.log('  EIGHT,PATIENT       (DFN 3)    -- PhilHealth paid claim');
    console.log('  EIGHTEEN,PATIENT    (DFN 149)  -- PhilHealth pending claim');
    console.log('  ELEVEN,PATIENT      (DFN 224)  -- PhilHealth denied claim');
    console.log('  EIGHTY* patients    (DFN 433+) -- AR aging + payer mix data');
    console.log('\nLogin: PRO1234 / PRO1234!!  (DUZ 1, PROGRAMMER,ONE)');
    console.log('Web:   http://localhost:3000');
    console.log('API:   http://localhost:3001');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
