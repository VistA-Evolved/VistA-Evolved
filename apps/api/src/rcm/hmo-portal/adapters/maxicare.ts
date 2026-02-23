/**
 * Maxicare Portal Adapter — Phase 97
 *
 * Manual-assisted adapter for Maxicare (MaxiLink provider portal).
 * Portal: https://provider.maxicare.com.ph/
 *
 * Capabilities (from registry):
 *   LOA: portal | Claims: portal | Status: portal | Remittance: portal
 */

import { ManualAssistedAdapter } from "../portal-adapter.js";
import { registerPortalAdapter } from "../types.js";

const maxicareAdapter = new ManualAssistedAdapter({
  payerId: "PH-MAXICARE",
  adapterName: "Maxicare MaxiLink",
  portalBaseUrl: "https://provider.maxicare.com.ph/",
  loaDeepLink: "https://provider.maxicare.com.ph/",
  claimsDeepLink: "https://provider.maxicare.com.ph/",
  statusDeepLink: "https://provider.maxicare.com.ph/",
  remittanceDeepLink: "https://provider.maxicare.com.ph/",
  loaInstructions: [
    "Navigate to the LOA Request section in MaxiLink.",
    "Enter the patient's Maxicare card number and select the member.",
    "Fill in the diagnosis codes, procedures, and requested services from the downloaded packet.",
    "Upload any required attachments (clinical notes, lab results).",
    "Submit the LOA request and note the reference number.",
  ],
  claimInstructions: [
    "Navigate to the Claims Submission section in MaxiLink.",
    "Enter the approved LOA reference number.",
    "Fill in the charge details from the downloaded claim packet.",
    "Attach supporting documents (final bill, OR/DR, discharge summary).",
    "Review totals against the downloaded summary, then submit.",
  ],
  statusInstructions: [
    "Log in to MaxiLink and navigate to Claims Status / LOA Status.",
    "Search by LOA reference number or claim reference.",
    "Note the current status and update the submission record in VistA-Evolved.",
  ],
  remittanceInstructions: [
    "Navigate to the SOA/Remittance section in MaxiLink.",
    "Search by claim reference or SOA period.",
    "Download the SOA PDF and verify amounts against the claim record.",
  ],
});

registerPortalAdapter(maxicareAdapter);

export { maxicareAdapter };
