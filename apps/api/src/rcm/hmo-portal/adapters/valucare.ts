/**
 * ValuCare Portal Adapter — Phase 97
 *
 * Manual-assisted adapter for ValuCare (Value Care Health Systems).
 * Portal: https://provider.valucare.com.ph/
 *
 * Capabilities (from registry):
 *   LOA: portal | Claims: portal | Status: unknown | Remittance: unknown
 */

import { ManualAssistedAdapter } from '../portal-adapter.js';
import { registerPortalAdapter } from '../types.js';

const valucareAdapter = new ManualAssistedAdapter({
  payerId: 'PH-VALUCARE',
  adapterName: 'ValuCare Provider Portal',
  portalBaseUrl: 'https://provider.valucare.com.ph/',
  loaDeepLink: 'https://provider.valucare.com.ph/',
  claimsDeepLink: 'https://provider.valucare.com.ph/',
  statusDeepLink: 'https://provider.valucare.com.ph/',
  remittanceDeepLink: 'https://provider.valucare.com.ph/',
  loaInstructions: [
    'Navigate to the LOA Request section in the ValuCare provider portal.',
    "Enter the patient's ValuCare member ID from the downloaded packet.",
    'Select admission type, specialty, and enter diagnosis/procedure codes.',
    'Upload supporting attachments (clinical notes, lab results).',
    'Submit the LOA request and note the ValuCare reference number.',
  ],
  claimInstructions: [
    'Navigate to Claims Submission in the ValuCare provider portal.',
    'Enter the approved LOA reference number.',
    'Input charge line items from the downloaded claim packet.',
    'Attach final billing statement, OR/DR, and discharge summary.',
    'Verify totals and submit the claim.',
  ],
  statusInstructions: [
    'Claim status tracking capability is not yet confirmed for ValuCare portal.',
    'Contact your ValuCare account officer for current status.',
    'Update the VistA-Evolved submission record with the latest status.',
  ],
  remittanceInstructions: [
    'Remittance/SOA download capability is not yet confirmed for ValuCare.',
    'Request SOA from your ValuCare account representative.',
    'When received, reconcile against the claim record.',
  ],
});

registerPortalAdapter(valucareAdapter);

export { valucareAdapter };
