# Phase 440 — VERIFY: Compliance Attestation Store (W28 P2)

## Gates

1. `attestation-store.ts` exists in `apps/api/src/regulatory/`
2. Exports: createAttestation, getAttestation, listAttestations, revokeAttestation,
   checkExpiredAttestations, getAttestationSummary, verifyAttestationChain
3. Hash-chained (SHA-256) with prevHash linkage
4. FIFO eviction at MAX_STORE_SIZE=5000
5. Store-policy entry registered as `compliance-attestation-store`
6. Barrel re-export from `regulatory/index.ts`
7. QA lint: 0 FAIL
