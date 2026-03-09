# Phase 633 — VERIFY: CPRS AI Lab Education Contract Recovery

## Verification Steps

1. Confirm runtime health:
   - `curl.exe -s http://127.0.0.1:3001/ready`
2. Log in with a clinician session.
3. Submit a governed lab-education request:
   - `POST /ai/request` with `promptId: lab-education-v1`
4. Open `http://127.0.0.1:3000/cprs/chart/46/aiassist`.
5. In `Lab Education`, enter a sample result and click `Explain for Patient`.
6. Switch to `AI Audit`, load audit data, and confirm the event count/log updated.

## Expected Outcomes

- The lab-education request no longer fails with prompt-validation 422.
- The browser shows a generated education response.
- AI audit endpoints and the audit tab reflect the new request.