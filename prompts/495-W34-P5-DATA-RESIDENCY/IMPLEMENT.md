# 495-01-IMPLEMENT — Data Residency + Region Locks

## Objective

Wire data residency enforcement to the tenant's country pack. Add
`enforcePackResidency()` to the data-residency platform module. Add a
`/residency/enforce-pack-transfer` endpoint that auto-resolves the tenant's
pack dataResidency config and enforces cross-border transfer rules.

## Files Changed

| File                                           | Change                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `apps/api/src/platform/data-residency.ts`      | Add `PackResidencyPolicy` type + `enforcePackResidency()` function                                |
| `apps/api/src/routes/data-residency-routes.ts` | Import enforcePackResidency + getEffectivePolicy. Add `/residency/enforce-pack-transfer` endpoint |

## Policy Decisions

1. Pack's `dataResidency.crossBorderTransferAllowed` is the primary gate — if false, all cross-border transfers are blocked regardless of consent/agreements.
2. Pack's `requiresConsentForTransfer` gates whether patient consent is checked before allowing the transfer.
3. Transfer agreements are always required for cross-border (defense in depth).
4. Same-region operations always pass.
