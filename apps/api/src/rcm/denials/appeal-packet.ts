/**
 * Appeal Packet Builder -- Phase 98
 *
 * Generates HTML appeal packets for denied claims.
 * PDF export deferred -- use browser "Print to PDF" for now.
 *
 * IMPORTANT: Credentials not stored; portal submission is manual
 * unless automation is installed via credential vault.
 */

import type { DenialCase, DenialAction, DenialAttachment, AppealPacketMeta } from './types.js';
import { CARC_CODES, RARC_CODES } from '../reference/carc-rarc.js';

/* -- Cover Letter Template ------------------------------------ */

function buildCoverLetterHtml(denial: DenialCase, payerName: string): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const billedDollars = (denial.financials.billedAmountCents / 100).toFixed(2);
  const codes = denial.denialCodes.map((c) => `${c.type} ${c.code}`).join(', ');

  return `
<div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="text-align: right; margin-bottom: 30px;">
    <p style="margin: 0;">${date}</p>
  </div>

  <div style="margin-bottom: 20px;">
    <p style="margin: 0; font-weight: bold;">${payerName}</p>
    <p style="margin: 0;">Claims Department / Appeals Unit</p>
    <p style="margin: 0; color: #666; font-style: italic;">[Address -- integration pending]</p>
  </div>

  <p><strong>RE: Appeal of Claim Denial</strong></p>
  <p><strong>Claim Reference:</strong> ${denial.claimRef}</p>
  <p><strong>Denial Codes:</strong> ${codes || 'N/A'}</p>
  <p><strong>Billed Amount:</strong> $${billedDollars}</p>
  <p><strong>Date of Denial:</strong> ${denial.receivedDate.split('T')[0]}</p>

  <p>Dear Claims Department,</p>

  <p>We are writing to formally appeal the denial of the above-referenced claim.
  We believe this claim was denied in error and respectfully request a
  reconsideration of the determination.</p>

  ${denial.denialNarrative ? `<p><strong>Provider Statement:</strong> ${escapeHtml(denial.denialNarrative)}</p>` : ''}

  <p>Please find the supporting documentation attached to this appeal packet.
  We request that this appeal be processed within the applicable timeframe
  per our provider agreement.</p>

  <p>Should you require additional information, please contact our billing department.</p>

  <div style="margin-top: 40px;">
    <p style="margin: 0;">Sincerely,</p>
    <p style="margin: 0; margin-top: 20px;">[Provider Name -- integration pending]</p>
    <p style="margin: 0;">[Facility Name -- integration pending]</p>
  </div>

  <div style="margin-top: 20px; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
    <small><strong>Note:</strong> Portal/payer credentials are not stored in this system.
    Portal submission is manual unless automation is installed via credential vault integration.</small>
  </div>
</div>`;
}

/* -- Full Packet HTML ----------------------------------------- */

export function generateAppealPacket(
  denial: DenialCase,
  actions: DenialAction[],
  attachments: DenialAttachment[],
  payerName: string
): AppealPacketMeta {
  const coverLetterHtml = buildCoverLetterHtml(denial, payerName);

  // Build attachment checklist
  const requiredDocs = [
    'Cover letter',
    'Original claim',
    'Denial notice / EOB',
    'Clinical documentation',
    'Prior authorization (if applicable)',
  ];

  const attachmentChecklist = requiredDocs.map((label) => ({
    label,
    present:
      label === 'Cover letter'
        ? true
        : attachments.some((a) =>
            a.label.toLowerCase().includes(label.toLowerCase().split(' ')[0])
          ),
  }));

  // Enrich denial codes with reference data
  const enrichedCodes = denial.denialCodes.map((c) => {
    if (c.type === 'CARC' && CARC_CODES[c.code]) {
      return { ...c, description: c.description || CARC_CODES[c.code].description };
    }
    if (c.type === 'RARC' && RARC_CODES[c.code]) {
      return { ...c, description: c.description || RARC_CODES[c.code].description };
    }
    return c;
  });

  return {
    denialId: denial.id,
    generatedAt: new Date().toISOString(),
    coverLetterHtml,
    claimSummary: {
      claimRef: denial.claimRef,
      vistaClaimIen: denial.vistaClaimIen,
      payerId: denial.payerId,
      billedAmountCents: denial.financials.billedAmountCents,
      paidAmountCents: denial.financials.paidAmountCents,
    },
    denialSummary: {
      codes: enrichedCodes,
      narrative: denial.denialNarrative,
      receivedDate: denial.receivedDate,
      deadlineDate: denial.deadlineDate,
    },
    attachmentChecklist,
    timeline: actions,
    note: 'Credentials not stored; portal submission manual unless automation installed',
  };
}

/* -- Full printable HTML page --------------------------------- */

export function generateAppealPacketHtml(
  denial: DenialCase,
  actions: DenialAction[],
  attachments: DenialAttachment[],
  payerName: string
): string {
  const packet = generateAppealPacket(denial, actions, attachments, payerName);
  const billedDollars = (denial.financials.billedAmountCents / 100).toFixed(2);
  const paidDollars =
    denial.financials.paidAmountCents !== undefined
      ? (denial.financials.paidAmountCents / 100).toFixed(2)
      : 'N/A';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Appeal Packet -- ${denial.claimRef}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
    h1, h2, h3 { color: #1a3e5c; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .section { margin: 20px 0; page-break-inside: avoid; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .badge-present { background: #d4edda; color: #155724; }
    .badge-missing { background: #f8d7da; color: #721c24; }
    .timeline-item { padding: 8px 0; border-left: 2px solid #007bff; padding-left: 12px; margin-left: 8px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="background: #e3f2fd; padding: 10px; border-radius: 4px; margin-bottom: 20px;">
    <strong>Appeal Packet Preview</strong> -- Use File -> Print -> Save as PDF to export.
  </div>

  <h1>Appeal Packet</h1>
  <p>Claim: <strong>${denial.claimRef}</strong> | Generated: ${packet.generatedAt.split('T')[0]}</p>

  <div class="section">
    <h2>1. Cover Letter</h2>
    ${packet.coverLetterHtml}
  </div>

  <div class="section">
    <h2>2. Claim Summary</h2>
    <table>
      <tr><th>Field</th><th>Value</th></tr>
      <tr><td>Claim Reference</td><td>${denial.claimRef}</td></tr>
      <tr><td>VistA Claim IEN</td><td>${denial.vistaClaimIen ?? 'N/A'}</td></tr>
      <tr><td>Payer</td><td>${payerName} (${denial.payerId})</td></tr>
      <tr><td>Billed Amount</td><td>$${billedDollars}</td></tr>
      <tr><td>Paid Amount</td><td>$${paidDollars}</td></tr>
      <tr><td>Status</td><td>${denial.denialStatus}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>3. Denial Details</h2>
    <table>
      <tr><th>Type</th><th>Code</th><th>Description</th></tr>
      ${packet.denialSummary.codes.map((c) => `<tr><td>${c.type}</td><td>${c.code}</td><td>${escapeHtml(c.description ?? '')}</td></tr>`).join('\n      ')}
    </table>
    ${denial.denialNarrative ? `<p><strong>Narrative:</strong> ${escapeHtml(denial.denialNarrative)}</p>` : ''}
    <p><strong>Received:</strong> ${denial.receivedDate.split('T')[0]}
    ${denial.deadlineDate ? ` | <strong>Deadline:</strong> ${denial.deadlineDate.split('T')[0]}` : ''}</p>
  </div>

  <div class="section">
    <h2>4. Attachment Checklist</h2>
    <table>
      <tr><th>Document</th><th>Status</th></tr>
      ${packet.attachmentChecklist
        .map(
          (a) =>
            `<tr><td>${a.label}</td><td><span class="badge ${a.present ? 'badge-present' : 'badge-missing'}">${a.present ? 'Present' : 'Missing'}</span></td></tr>`
        )
        .join('\n      ')}
    </table>
  </div>

  <div class="section">
    <h2>5. Timeline</h2>
    ${actions.length === 0 ? '<p>No actions recorded yet.</p>' : ''}
    ${actions
      .map(
        (a) => `
    <div class="timeline-item">
      <strong>${a.timestamp.split('T')[0]}</strong> -- ${a.actionType}
      ${a.actor ? ` by ${a.actor}` : ''}
      ${a.previousStatus && a.newStatus && a.previousStatus !== a.newStatus ? ` (${a.previousStatus} -> ${a.newStatus})` : ''}
    </div>`
      )
      .join('')}
  </div>

  <div class="section" style="background: #fff3cd; padding: 10px; border-radius: 4px;">
    <small>${packet.note}</small>
  </div>
</body>
</html>`;
}

/* -- Utility -------------------------------------------------- */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
