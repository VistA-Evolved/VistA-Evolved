/**
 * Intellicare Portal Adapter — Phase 97
 *
 * Manual-assisted adapter for Intellicare.
 * Portal: https://provider.intellicare.com.ph/
 *
 * Capabilities (from registry):
 *   LOA: portal | Claims: portal | Status: portal | Remittance: unknown
 */

import { ManualAssistedAdapter } from '../portal-adapter.js';
import { registerPortalAdapter } from '../types.js';

const intellicareAdapter = new ManualAssistedAdapter({
  payerId: 'PH-INTELLICARE',
  adapterName: 'Intellicare Provider Portal',
  portalBaseUrl: 'https://provider.intellicare.com.ph/',
  loaDeepLink: 'https://provider.intellicare.com.ph/',
  claimsDeepLink: 'https://provider.intellicare.com.ph/',
  statusDeepLink: 'https://provider.intellicare.com.ph/',
  remittanceDeepLink: 'https://provider.intellicare.com.ph/',
  loaInstructions: [
    'Navigate to the LOA section in the Intellicare provider portal.',
    "Enter the patient's Intellicare member ID.",
    'Select admission type (outpatient, inpatient, daycare, emergency).',
    'Fill in diagnosis and procedure codes from the downloaded packet.',
    'Upload any supporting documents and submit the LOA request.',
  ],
  claimInstructions: [
    'Navigate to Claims Filing in the Intellicare provider portal.',
    'Enter the approved LOA reference number.',
    'Enter charge line items from the downloaded claim packet.',
    'Attach discharge summary, final bill, and OR/DR.',
    'Verify totals against the text summary and submit.',
  ],
  statusInstructions: [
    'Log in to Intellicare provider portal.',
    'Navigate to Claims/LOA Status and search by reference number.',
    'Note current status and update the submission record in VistA-Evolved.',
  ],
  remittanceInstructions: [
    'Remittance/SOA download capability is not yet confirmed for Intellicare portal.',
    'Contact your Intellicare liaison for SOA documents.',
    'When received, reconcile against the claim record.',
  ],
});

registerPortalAdapter(intellicareAdapter);

export { intellicareAdapter };
