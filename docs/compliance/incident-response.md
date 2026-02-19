# Incident Response Plan — VistA-Evolved

> **Owner**: Engineering / Security  
> **Last updated**: Phase 34 — Regulated SDLC  
> **Review cadence**: Every 180 days or after any incident

---

## 1. Purpose

Define the process for identifying, containing, investigating, and recovering
from security incidents affecting VistA-Evolved. Implements HIPAA Security Rule
requirements for security incident procedures (45 CFR 164.308(a)(6)(ii)).

## 2. Scope

This plan covers:
- Unauthorized access to ePHI
- PHI data breach (exposure outside authorized systems)
- Credential compromise
- VistA RPC broker exploitation
- API vulnerability exploitation
- Imaging data unauthorized access
- Audit trail tampering

## 3. Incident Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **SEV-1 (Critical)** | Confirmed PHI breach or active exploitation | Immediate (< 1 hour) | Patient data exposed externally, credential dump, audit chain broken |
| **SEV-2 (High)** | Probable breach or vulnerability being exploited | < 4 hours | Unauthorized imaging access, break-glass abuse, RPC injection attempt |
| **SEV-3 (Medium)** | Security control failure, no confirmed breach | < 24 hours | Rate limiter bypass, session fixation attempt, PHI detected in logs |
| **SEV-4 (Low)** | Security observation, no impact | < 72 hours | Failed login spike, deprecated cipher usage, scan detection |

## 4. Roles & Responsibilities

| Role | Responsibilities |
|------|-----------------|
| **Incident Commander (IC)** | Overall coordination, severity assessment, stakeholder communication |
| **Security Lead** | Technical investigation, forensic evidence collection, containment |
| **Engineering Lead** | Fix development, deployment, system recovery |
| **Compliance Officer** | HIPAA breach notification assessment, documentation, regulatory reporting |
| **Communications** | Internal + external notification (if required by breach determination) |

## 5. Incident Response Phases

### Phase 1 — Detection & Triage

**Detection sources:**
- Automated: PHI leak scanner (CI), audit chain verification, rate limit alerts
- Manual: User report, security researcher disclosure, internal review
- External: Regulatory inquiry, vulnerability database (CVE)

**Triage steps:**
1. Verify the incident is real (not false positive)
2. Assign severity level
3. Designate Incident Commander
4. Create incident record (timestamp, reporter, initial description)

### Phase 2 — Containment

**Immediate containment (SEV-1/SEV-2):**

| Scenario | Action |
|----------|--------|
| Compromised session | Invalidate all sessions (`session-store.ts` flush) |
| RPC broker exploitation | Disconnect broker (`disconnectRpcBroker()`) |
| PHI in logs | Rotate/purge affected log files |
| Imaging data exposure | Revoke all break-glass sessions, disable DICOMweb proxy |
| Credential compromise | Disable affected VistA user (via MUMPS), revoke sessions |
| Audit tampering | Take offline, preserve evidence |

**Short-term containment:**
- Deploy hotfix if available
- Enable enhanced logging (`LOG_LEVEL=debug`)
- Increase rate limiting
- Notify affected users

### Phase 3 — Investigation

**Evidence collection:**
1. Preserve all structured logs for affected timeframe
2. Export audit trail (general + imaging hash chain)
3. Verify imaging audit chain integrity: `GET /imaging/audit/verify`
4. Collect evidence bundle: `node scripts/generate-evidence-bundle.mjs --build-id incident-YYYYMMDD`
5. Document timeline of events

**Root cause analysis:**
- Identify attack vector
- Determine data exposure scope
- Assess whether PHI was accessed/exfiltrated
- Check if redaction controls were bypassed

### Phase 4 — Eradication & Recovery

1. Apply permanent fix (code change, config change, infrastructure change)
2. Run full verification: `scripts/verify-latest.ps1`
3. Run PHI leak scan: `node scripts/phi-leak-scan.mjs`
4. Run unit tests: `npx tsx --test apps/api/src/ai/redaction.test.ts apps/api/src/lib/logger.test.ts`
5. Generate post-fix evidence bundle
6. Restore normal operations

### Phase 5 — Post-Incident Review

Within 5 business days of resolution:

1. Complete incident report:
   - Timeline
   - Root cause
   - Data exposure scope
   - Containment actions
   - Fix applied
   - Evidence bundle reference

2. Update documentation:
   - `docs/BUG-TRACKER.md` — new bug entry
   - `AGENTS.md` — new gotcha if applicable
   - Compliance docs — policy updates if needed

3. Determine if HIPAA breach notification is required:
   - Was unsecured PHI accessed?
   - Does the "low probability of compromise" exception apply?
   - If breach: notify individuals within 60 days, HHS per scale

## 6. HIPAA Breach Notification Requirements

| Scale | Notification | Timeline |
|-------|-------------|----------|
| < 500 individuals | Annual log to HHS | Within 60 days of calendar year end |
| >= 500 individuals | HHS + media + individuals | Within 60 days of discovery |
| Any | Affected individuals | Within 60 days of discovery |

**Exceptions (not a breach):**
- Unintentional access by authorized workforce, in good faith
- Inadvertent disclosure between authorized persons
- Recipient unable to retain the information

## 7. Detection Controls in VistA-Evolved

| Control | Location | What it detects |
|---------|----------|----------------|
| PHI leak scanner | `scripts/phi-leak-scan.mjs` | PHI patterns in server code |
| Secret scanner | `scripts/secret-scan.mjs` | Hardcoded credentials |
| Audit hash chain | `imaging-audit.ts` | Audit trail tampering |
| Rate limiter | `security.ts` | Brute force / abuse |
| RPC blocklist | `ws-console.ts` | Credential theft via WebSocket |
| Circuit breaker | `rpc-resilience.ts` | VistA broker failures |
| Session timeout | `session-store.ts` | Stale session usage |

## 8. Compliance Mapping

| Requirement | Reference | Implementation |
|-------------|-----------|----------------|
| Security incident procedures | 45 CFR 164.308(a)(6)(ii) | This plan |
| Breach notification | 45 CFR 164.408-414 | Section 6 |
| Audit controls | 45 CFR 164.312(b) | Detection controls |
| Integrity controls | 45 CFR 164.312(c)(1) | Hash-chained audit |

## 9. Plan Testing

This plan must be tested:
- **Tabletop exercise**: Every 180 days
- **Technical drill** (simulated incident): Every 365 days
- **Post-incident update**: After every real incident

## 10. References

- [Data Classification Policy](data-classification.md)
- [Logging & Audit Policy](logging-policy.md)
- [HIPAA Breach Notification Rule — 45 CFR 164.400-414](https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html)
- [NIST SP 800-61r2 — Computer Security Incident Handling Guide](https://csrc.nist.gov/pubs/sp/800/61/r2/final)
