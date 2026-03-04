# RCM PHI Handling & Data Security

> Phase 38 — RCM + Payer Connectivity

## PHI Risk Profile

RCM data inherently contains Protected Health Information (PHI):

- Patient identifiers (name, DOB, SSN, member ID)
- Diagnosis codes (clinical condition disclosure)
- Procedure codes (treatment disclosure)
- Financial data (charge amounts, payment info)

## PHI Safeguards

### 1. Audit Trail Sanitization

The RCM audit module (`rcm-audit.ts`) automatically sanitizes PHI
before storing in the hash-chained audit log:

| Pattern                                        | Action                       |
| ---------------------------------------------- | ---------------------------- |
| SSN (`\d{3}-\d{2}-\d{4}`)                      | → `[REDACTED]`               |
| DOB-like dates                                 | → `[REDACTED]`               |
| "Last, First" name patterns                    | → `[REDACTED]`               |
| Fields containing `ssn`, `dob`, `patient_name` | → `[REDACTED-SSN/DOB/NAME]`  |
| Patient DFN                                    | → `[DFN]` (never stored raw) |

### 2. Claim Store Isolation

- Claims are stored in-memory (reset on API restart)
- No persistent storage of PHI outside VistA
- Claim data flows through VistA → API → browser, not stored at rest
- When VistA IB/AR integration is available, claim data stays in VistA

### 3. EDI Payload Handling

- Outbound EDI payloads are stored in pipeline entries for audit
- Payloads should be purged after reconciliation (configurable TTL)
- In production: encrypt payloads at rest
- Never log full EDI payloads at INFO level

### 4. Connector Security

| Connector     | PHI Exposure                  | Mitigation                         |
| ------------- | ----------------------------- | ---------------------------------- |
| Clearinghouse | Full claim data in transit    | TLS (SFTP/HTTPS), sender ID auth   |
| PhilHealth    | Patient + clinical data       | API token auth, TLS                |
| Portal/Batch  | Batch files with patient data | Encrypt batch files, secure upload |
| Sandbox       | Simulated data only           | No real PHI                        |

### 5. API Access Control

- All `/rcm/` routes require session auth (AUTH_RULES in security.ts)
- Module guard blocks access when RCM module is disabled
- Admin-level operations (payer creation) checked in handlers
- No PHI in URL query params (use POST body for sensitive data)

### 6. UI Data Flow

- Payer registry data is non-PHI (safe to display)
- Claim data contains PHI — only displayed to authenticated users
- Audit entries have sanitized details — safe to display
- No PHI stored in browser localStorage or sessionStorage

## HIPAA Compliance Considerations

### Minimum Necessary Standard

- Eligibility checks send only required identifiers (member ID, DOB)
- Claim submissions include only clinically necessary data
- Remittance data limited to payment/adjustment amounts

### Transmission Security

- All API calls over HTTPS (enforced by reverse proxy)
- Clearinghouse SFTP uses SSH key authentication
- PhilHealth API uses OAuth/token-based auth

### Audit Requirements

- Every claim lifecycle event is audit-logged
- Audit chain is hash-verified for tamper detection
- Audit entries are append-only (no modification or deletion)
- Chain verification available via `GET /rcm/audit/verify`

## Production Hardening Checklist

- [ ] Enable TLS for all clearinghouse connections
- [ ] Implement EDI payload encryption at rest
- [ ] Set up audit log rotation and archival
- [ ] Configure PHI field-level encryption for claim store
- [ ] Enable IP-based access restrictions for admin endpoints
- [ ] Implement role-based access for claim data (billing staff only)
- [ ] Set up automated audit chain verification (cron job)
- [ ] Document BAA requirements for clearinghouse partners
