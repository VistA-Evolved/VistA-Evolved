/**
 * MediCard Portal Adapter — Phase 97
 *
 * Manual-assisted adapter for MediCard.
 * Portal: https://provider.medicard.com.ph/
 *
 * Capabilities (from registry):
 *   LOA: portal | Claims: portal | Status: portal | Remittance: unknown
 */

import { ManualAssistedAdapter } from '../portal-adapter.js';
import { registerPortalAdapter } from '../types.js';

const medicardAdapter = new ManualAssistedAdapter({
  payerId: 'PH-MEDICARD',
  adapterName: 'MediCard Provider Portal',
  portalBaseUrl: 'https://provider.medicard.com.ph/',
  loaDeepLink: 'https://provider.medicard.com.ph/',
  claimsDeepLink: 'https://provider.medicard.com.ph/',
  statusDeepLink: 'https://provider.medicard.com.ph/',
  remittanceDeepLink: 'https://provider.medicard.com.ph/',
  loaInstructions: [
    'Navigate to the LOA Request section in the MediCard provider portal.',
    "Enter the patient's MediCard card number.",
    'Select the diagnosis and procedure codes from the downloaded LOA packet.',
    'Upload required attachments (clinical notes, lab results, imaging reports).',
    'Submit and note the MediCard LOA reference number.',
  ],
  claimInstructions: [
    'Navigate to Claims Submission in the MediCard provider portal.',
    'Reference the approved LOA number.',
    'Enter charges per line item from the downloaded claim packet.',
    'Attach final billing statement and supporting documents.',
    'Review totals and submit the claim.',
  ],
  statusInstructions: [
    'Log in to MediCard provider portal.',
    'Navigate to Claims Status and search by reference number.',
    'Update the VistA-Evolved submission record with the current portal status.',
  ],
  remittanceInstructions: [
    'Remittance download capability is not yet confirmed for MediCard portal.',
    'Check with your MediCard account officer for SOA/remittance availability.',
    'If available, download and reconcile against the claim record.',
  ],
});

registerPortalAdapter(medicardAdapter);

export { medicardAdapter };
