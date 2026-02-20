/**
 * RCM — CARC / RARC Reference Tables (Phase 43)
 *
 * Common Claim Adjustment Reason Codes (CARC) and Remittance Advice
 * Remark Codes (RARC) used in 835 remittance and denial processing.
 *
 * These are NOT proprietary code sets — they are publicly maintained by
 * X12/ASC and CMS. We include the most commonly encountered codes for
 * workqueue item generation and recommended action text.
 *
 * Full code lists: https://x12.org/codes
 * CARC: maintained by Code Maintenance Committee
 * RARC: maintained by CMS
 */

/* ── CARC Group Codes ──────────────────────────────────────── */

export const CARC_GROUPS: Record<string, string> = {
  CO: 'Contractual Obligation',
  PR: 'Patient Responsibility',
  OA: 'Other Adjustment',
  PI: 'Payer Initiated Reduction',
  CR: 'Correction/Reversal',
};

/* ── Common CARC Reason Codes ──────────────────────────────── */

export interface CarcEntry {
  code: string;
  description: string;
  category: 'denial' | 'adjustment' | 'info';
  commonAction: string;
  fieldHint?: string;
}

export const CARC_CODES: Record<string, CarcEntry> = {
  '1':   { code: '1',   description: 'Deductible amount', category: 'adjustment', commonAction: 'Bill patient for deductible', fieldHint: 'patientResponsibility' },
  '2':   { code: '2',   description: 'Coinsurance amount', category: 'adjustment', commonAction: 'Bill patient for coinsurance', fieldHint: 'patientResponsibility' },
  '3':   { code: '3',   description: 'Co-payment amount', category: 'adjustment', commonAction: 'Bill patient for copay', fieldHint: 'patientResponsibility' },
  '4':   { code: '4',   description: 'Procedure code is inconsistent with modifier or quantity', category: 'denial', commonAction: 'Review procedure/modifier combination and resubmit', fieldHint: 'lines[].procedure.modifiers' },
  '5':   { code: '5',   description: 'Procedure code/bill type is inconsistent with place of service', category: 'denial', commonAction: 'Correct place of service code', fieldHint: 'lines[].placeOfService' },
  '16':  { code: '16',  description: 'Claim/service lacks information needed for adjudication', category: 'denial', commonAction: 'Submit missing information per remark codes', fieldHint: undefined },
  '18':  { code: '18',  description: 'Exact duplicate claim/service', category: 'denial', commonAction: 'Verify not a duplicate; if new, resubmit with frequency code 7', fieldHint: 'claimInfo.frequencyCode' },
  '22':  { code: '22',  description: 'This care may be covered by another payer per coordination of benefits', category: 'denial', commonAction: 'Submit to primary payer first', fieldHint: 'payerId' },
  '23':  { code: '23',  description: 'Payment adjusted because charges have been paid by another payer', category: 'adjustment', commonAction: 'Review COB; submit secondary claim', fieldHint: undefined },
  '27':  { code: '27',  description: 'Expenses incurred after coverage terminated', category: 'denial', commonAction: 'Verify patient eligibility dates', fieldHint: 'subscriber.memberId' },
  '29':  { code: '29',  description: 'The time limit for filing has expired', category: 'denial', commonAction: 'File appeal with proof of timely filing', fieldHint: undefined },
  '31':  { code: '31',  description: 'Patient cannot be identified as insured', category: 'denial', commonAction: 'Verify subscriber ID and resubmit', fieldHint: 'subscriberId' },
  '35':  { code: '35',  description: 'Lifetime benefit maximum reached', category: 'denial', commonAction: 'Notify patient; bill patient responsibility', fieldHint: undefined },
  '45':  { code: '45',  description: 'Charge exceeds fee schedule/maximum allowable', category: 'adjustment', commonAction: 'Informational -- write off or appeal with documentation', fieldHint: 'totalCharge' },
  '50':  { code: '50',  description: 'Non-covered service (not a contract benefit)', category: 'denial', commonAction: 'Verify benefit coverage; appeal if medically necessary', fieldHint: 'lines[].procedure.code' },
  '96':  { code: '96',  description: 'Non-covered charge(s)', category: 'denial', commonAction: 'Review coverage; submit ABN if applicable', fieldHint: 'lines[].procedure.code' },
  '97':  { code: '97',  description: 'Payment is included in the allowance for another service', category: 'adjustment', commonAction: 'Review bundling rules; unbundle if appropriate with modifier', fieldHint: 'lines[].procedure.modifiers' },
  '109': { code: '109', description: 'Claim/service not covered by this payer', category: 'denial', commonAction: 'Submit to correct payer', fieldHint: 'payerId' },
  '119': { code: '119', description: 'Benefit maximum for this time period has been reached', category: 'denial', commonAction: 'Notify patient; schedule after benefit reset', fieldHint: undefined },
  '140': { code: '140', description: 'Patient/insured health identification number and name do not match', category: 'denial', commonAction: 'Correct patient demographics and resubmit', fieldHint: 'subscriberId' },
  '151': { code: '151', description: 'Payment adjusted because prior authorization was not obtained', category: 'denial', commonAction: 'Obtain prior auth and resubmit or appeal', fieldHint: undefined },
  '167': { code: '167', description: 'Diagnosis is not consistent with procedure', category: 'denial', commonAction: 'Review diagnosis/procedure combination', fieldHint: 'diagnoses' },
  '181': { code: '181', description: 'Procedure code was invalid on date of service', category: 'denial', commonAction: 'Update to current procedure code', fieldHint: 'lines[].procedure.code' },
  '197': { code: '197', description: 'Precertification/authorization/notification absent', category: 'denial', commonAction: 'Submit authorization number and resubmit', fieldHint: undefined },
  '204': { code: '204', description: 'This service/equipment/drug is not covered under the benefit plan', category: 'denial', commonAction: 'Review benefit plan; appeal with medical necessity', fieldHint: 'lines[].procedure.code' },
  '219': { code: '219', description: 'Based on submitted charges, calculated payment plus expected patient liability exceeds charges', category: 'adjustment', commonAction: 'Informational adjustment', fieldHint: undefined },
  '236': { code: '236', description: 'This procedure/service is not paid separately', category: 'adjustment', commonAction: 'Review bundling; use modifier 59 if distinct', fieldHint: 'lines[].procedure.modifiers' },
  '242': { code: '242', description: 'Services not provided by network/primary care providers', category: 'denial', commonAction: 'Verify network status; refer to in-network provider', fieldHint: 'billingProviderNpi' },
  '252': { code: '252', description: 'Service not adjudicated -- requires medical records', category: 'denial', commonAction: 'Submit clinical documentation', fieldHint: undefined },
  'A1':  { code: 'A1',  description: 'Claim/service denied; MCO-enrolled patient', category: 'denial', commonAction: 'Submit to MCO', fieldHint: 'payerId' },
  'B1':  { code: 'B1',  description: 'Non-covered visit', category: 'denial', commonAction: 'Appeal with documentation', fieldHint: undefined },
};

/* ── Common RARC Remark Codes ──────────────────────────────── */

export interface RarcEntry {
  code: string;
  description: string;
  actionHint: string;
}

export const RARC_CODES: Record<string, RarcEntry> = {
  'N1':   { code: 'N1',   description: 'You may appeal this decision', actionHint: 'File appeal within payer-specified timeframe' },
  'N4':   { code: 'N4',   description: 'Missing/incomplete/invalid prior authorization number', actionHint: 'Submit prior authorization number' },
  'N17':  { code: 'N17',  description: 'Additional information is required from the ordering provider', actionHint: 'Obtain documentation from ordering provider' },
  'N30':  { code: 'N30',  description: 'Patient ineligible for this service', actionHint: 'Verify eligibility; bill patient if appropriate' },
  'N56':  { code: 'N56',  description: 'Procedure code billed is not correct/valid for the services billed', actionHint: 'Review and correct procedure code' },
  'N115': { code: 'N115', description: 'This decision was based on national coverage determination', actionHint: 'Review NCD; appeal with supporting documentation' },
  'N130': { code: 'N130', description: 'Appeal rights', actionHint: 'Patient/provider may appeal this determination' },
  'N211': { code: 'N211', description: 'Alert: You may not appeal this decision', actionHint: 'No appeal path -- review for corrected claim submission' },
  'N362': { code: 'N362', description: 'Missing/incomplete/invalid treatment number', actionHint: 'Submit treatment/authorization number' },
  'N386': { code: 'N386', description: 'Claim includes a service not on the fee schedule', actionHint: 'Verify fee schedule; appeal if applicable' },
  'N425': { code: 'N425', description: 'Resubmit missing/incomplete/invalid documentation', actionHint: 'Submit required documentation' },
  'N479': { code: 'N479', description: 'Missing/incomplete/invalid NPI', actionHint: 'Correct rendering/billing NPI' },
  'MA01': { code: 'MA01', description: 'Secondary payment cannot be considered without the identity of the primary payer', actionHint: 'Submit primary payer EOB' },
  'MA04': { code: 'MA04', description: 'Secondary payment cannot be considered without the primary payer remittance', actionHint: 'Include primary ERA/EOB' },
  'MA130':{ code: 'MA130', description: 'Your claim contains incomplete/invalid information', actionHint: 'Review and correct claim data' },
};

/* ── Lookup Helpers ────────────────────────────────────────── */

export function lookupCarc(code: string): CarcEntry | undefined {
  return CARC_CODES[code];
}

export function lookupRarc(code: string): RarcEntry | undefined {
  return RARC_CODES[code];
}

export function getCarcGroupDescription(groupCode: string): string {
  return CARC_GROUPS[groupCode] ?? `Unknown group (${groupCode})`;
}

/**
 * Build recommended action text from a CARC code + optional RARC codes.
 * Used to populate workqueue item `recommendedAction`.
 */
export function buildActionRecommendation(
  carcCode: string,
  rarcCodes?: string[],
): { action: string; fieldHint?: string } {
  const carc = lookupCarc(carcCode);
  const parts: string[] = [];

  if (carc) {
    parts.push(carc.commonAction);
  } else {
    parts.push(`Review denial reason code ${carcCode}`);
  }

  if (rarcCodes?.length) {
    for (const rc of rarcCodes) {
      const rarc = lookupRarc(rc);
      if (rarc) parts.push(rarc.actionHint);
    }
  }

  return {
    action: parts.join('. '),
    fieldHint: carc?.fieldHint,
  };
}
