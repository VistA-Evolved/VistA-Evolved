/**
 * VistA Binding: ERA / Remittance → VistA AR
 *
 * Posts remittance (835/ERA) data back to VistA Accounts Receivable.
 * In production, this would call RPCs like:
 *   RCDPE PAYMENT POST   — Post ERA payment to AR
 *   PRCA POST PAYMENT    — AR payment posting
 *
 * Target VistA files:
 *   ^PRCA(430,IEN)   — AR Transaction file
 *   ^PRCA(433,IEN)   — AR Activity file
 *   ^RC(344,IEN)     — ERA file (if PRCA ERA module is active)
 *
 * VistA-first: in sandbox mode returns integration-pending with
 * exact file/routine targets for production migration.
 *
 * Phase 40 (Superseding) — VistA-first binding points
 */

import type { Remittance } from '../domain/remit.js';

/* ─── Types ──────────────────────────────────────────────────── */

export interface EraPostResult {
  ok: boolean;
  posted: boolean;
  vistaArIen?: string;
  integrationPending?: boolean;
  vistaGrounding?: {
    vistaFiles: string[];
    targetRoutines: string[];
    migrationPath: string;
    sandboxNote: string;
  };
  errors?: string[];
}

/* ─── ERA → VistA AR posting ─────────────────────────────────── */

/**
 * Post an ERA/835 remittance to VistA Accounts Receivable.
 *
 * Currently returns integration-pending because VistA AR (^PRCA(430))
 * is empty in the WorldVistA sandbox. The grounding metadata provides
 * the exact target files and routines for production integration.
 */
export async function postEraToVista(
  remittance: Remittance,
): Promise<EraPostResult> {
  return {
    ok: false,
    posted: false,
    integrationPending: true,
    vistaGrounding: {
      vistaFiles: [
        '^PRCA(430) -- AR Transaction file',
        '^PRCA(433) -- AR Activity file',
        '^RC(344) -- ERA file (PRCA ERA module)',
      ],
      targetRoutines: [
        'RCDPE PAYMENT POST -- automated ERA payment posting',
        'PRCA POST PAYMENT -- manual AR payment posting',
        'RCDPE MATCH EOB -- EOB line matching to charges',
      ],
      migrationPath: [
        '1. Parse ERA/835 remittance into claim-level line items',
        '2. Match each CLP segment to VistA AR transaction (^PRCA(430))',
        '3. Call PRCA POST PAYMENT RPC with matched amounts',
        '4. Record payment in AR Activity (^PRCA(433))',
        '5. Update claim status in RCM store from payment result',
      ].join('\n'),
      sandboxNote: 'WorldVistA Docker AR (^PRCA(430)) is empty. ' +
        'Production VistA with active AR module will accept ERA postings.',
    },
    errors: [
      `Remittance ${remittance.id}: ERA-to-AR posting not available in sandbox. ` +
      'AR transaction file (^PRCA(430)) is empty in WorldVistA Docker.',
    ],
  };
}

/**
 * Check if a VistA AR transaction exists for a given IEN.
 */
export async function checkVistaArTransaction(
  arIen: string,
): Promise<{
  exists: boolean;
  integrationPending: boolean;
  detail?: string;
}> {
  return {
    exists: false,
    integrationPending: true,
    detail: `AR IEN ${arIen}: ^PRCA(430) is empty in sandbox. ` +
      'Production VistA with IB/AR module will have transaction data.',
  };
}
