/**
 * PhilCare Portal Adapter -- Phase 97
 *
 * Manual-assisted adapter for PhilCare.
 * Portal: https://www.philcare.com.ph/for-providers
 *
 * Capabilities (from registry):
 *   LOA: portal | Claims: portal | Status: unknown | Remittance: unknown
 */

import { ManualAssistedAdapter } from '../portal-adapter.js';
import { registerPortalAdapter } from '../types.js';

const philcareAdapter = new ManualAssistedAdapter({
  payerId: 'PH-PHILCARE',
  adapterName: 'PhilCare Provider Portal',
  portalBaseUrl: 'https://www.philcare.com.ph/for-providers',
  loaDeepLink: 'https://www.philcare.com.ph/for-providers',
  claimsDeepLink: 'https://www.philcare.com.ph/for-providers',
  statusDeepLink: 'https://www.philcare.com.ph/for-providers',
  remittanceDeepLink: 'https://www.philcare.com.ph/for-providers',
  loaInstructions: [
    'Navigate to the LOA Request section in the PhilCare provider portal.',
    "Enter the patient's PhilCare member ID from the downloaded packet.",
    'Select the specialty, diagnosis codes, and procedures.',
    'Upload required clinical documentation.',
    'Submit the LOA and note the PhilCare reference number.',
  ],
  claimInstructions: [
    'Navigate to Claims Filing in the PhilCare provider portal.',
    'Reference the approved LOA number.',
    'Enter charge details from the downloaded claim packet.',
    'Attach supporting documents (final bill, clinical notes).',
    'Review and submit. Note the claim reference number.',
  ],
  statusInstructions: [
    'Claim status tracking capability is not yet confirmed for PhilCare portal.',
    'Contact your PhilCare account representative for status updates.',
    'Update the VistA-Evolved submission record manually.',
  ],
  remittanceInstructions: [
    'Remittance/SOA download capability is not yet confirmed for PhilCare.',
    'Request SOA from your PhilCare account representative.',
    'When received, reconcile against the claim record.',
  ],
});

registerPortalAdapter(philcareAdapter);

export { philcareAdapter };
