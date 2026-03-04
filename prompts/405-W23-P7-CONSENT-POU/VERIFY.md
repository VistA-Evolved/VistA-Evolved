# 405-99-VERIFY — Consent + Purpose of Use

## Verification Gates

1. Types export ConsentDirective, PurposeOfUse (9 standard codes), DisclosureLog
2. ETREAT (emergency) always permits regardless of consent
3. Evaluate auto-logs disclosure decisions
4. Revoke transitions active→revoked with actor/timestamp metadata
5. Routes registered, AUTH_RULES for `/consent-pou/`
6. 2 STORE_INVENTORY entries (directives=phi, disclosures=phi)
7. `tsc --noEmit` clean
