# 495-99-VERIFY — Data Residency + Region Locks

## Gates
1. `data-residency.ts` exports `enforcePackResidency()` and `PackResidencyPolicy`.
2. `/residency/enforce-pack-transfer` resolves pack from `request.countryPolicy`.
3. US pack (crossBorderTransferAllowed: false) blocks all cross-border.
4. PH pack (crossBorderTransferAllowed: true, requiresConsentForTransfer: true) requires consent.
5. Same-region transfers always succeed.
6. TypeScript compiles clean.
