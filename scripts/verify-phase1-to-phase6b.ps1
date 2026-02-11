Create scripts/verify-phase1-to-phase6b.ps1 by extending scripts/verify-phase1-to-phase4b.ps1.

Rules:
- Do not break existing checks.
- Keep Phase 4A and 4B tests the same.
- Add Phase 6A test:
  curl http://127.0.0.1:3001/vista/vitals?dfn=1
  PASS if ok:true (count may be 0 but should not error)
- Add Phase 6B test:
  POST a safe vitals value (e.g., P=70) for DFN=1, then GET vitals again.
  PASS if POST ok:true OR ok:false with clear VistA error (no crashes).
- Add a WARN if vitals count did not change (since duplicate prevention or test data may vary).

Then update scripts/verify-latest.ps1 to point to verify-phase1-to-phase6b.ps1.

Deliverable:
- Provide full script content for verify-phase1-to-phase6b.ps1
- Confirm it runs with 0 FAIL on this environment.
