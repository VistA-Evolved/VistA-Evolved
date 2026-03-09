# Phase 708 - CPRS Lab Acknowledge Dialog Truth Recovery Verify

## Verification Steps
1. Confirm Docker, API, and VistA connectivity remain healthy enough for live CPRS lab route verification.
2. Reuse the existing authenticated proof for `POST /vista/cprs/labs/ack` showing real `ORWLRR ACK` success for DFN 46.
3. Confirm from code that the same route still returns `mode: "draft"` for its non-real fallback, meaning the dialog must describe a server-side draft rather than a local-only save.
4. Verify the dialog success copy now distinguishes `mode: "real"` from `mode: "draft"` without implying a local fallback for the draft case.
5. Run editor diagnostics for touched files and fix any relevant new errors.

## Acceptance Criteria
- The standalone CPRS lab acknowledge dialog no longer tells clinicians a draft acknowledgement was stored locally when the backend contract is server-side draft storage.
- Real VistA acknowledgement success messaging remains unchanged.
- The Labs truth contract documentation matches the UI wording and live route behavior.
- Ops artifacts record the change and its verification basis.