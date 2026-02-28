# E2E Certification Matrix

> Phase 278 — Maps certification scenarios to regulatory requirements and
> implementation status.

## Scenario Overview

| ID | Scenario | Domain | Regulatory Refs | Status |
|----|----------|--------|-----------------|--------|
| cert-001 | Outpatient Visit Complete Flow | Clinical | ONC 170.315(a)(1), (a)(2) | Ready |
| cert-002 | Patient Portal Session | Portal | ONC 170.315(e)(1), HIPAA 164.312(d) | Ready |
| cert-003 | Imaging Study Lifecycle | Imaging | ONC 170.315(a)(11) | Ready |
| cert-004 | RCM Claim Submission | RCM | HIPAA 837 | Ready |
| cert-005 | Pharmacy Medication Management | Pharmacy | ONC 170.315(a)(4), (a)(8) | Ready |
| cert-006 | Lab Order and Results | Lab | ONC 170.315(a)(3) | Ready |
| cert-007 | Scheduling Appointment | Scheduling | ONC 170.315(a)(14) | Ready |
| cert-008 | Telehealth Visit | Telehealth | — | Ready |
| cert-009 | Nursing Documentation | Nursing | ONC 170.315(a)(1) | Ready |
| cert-010 | ADT Admission-Discharge-Transfer | ADT | ONC 170.315(a)(1) | Ready |
| cert-011 | Interop HL7 Message Flow | Interop | ONC 170.315(f)(5) | Ready |
| cert-012 | Admin Security & Audit | Admin | HIPAA 164.312(b), (c)(1) | Ready |

## Regulatory Reference Map

### ONC Health IT Certification (170.315)

| Criterion | Description | Covered By |
|-----------|-------------|------------|
| (a)(1) | CPRS — Computerized Provider Order Entry | cert-001, cert-009, cert-010 |
| (a)(2) | CPRS — Drug-drug, Drug-allergy Interaction Checks | cert-001 |
| (a)(3) | CPRS — Clinical Lab Results | cert-006 |
| (a)(4) | Drug Formulary and Preferred Drug List | cert-005 |
| (a)(8) | Medication Allergy List | cert-005 |
| (a)(11) | Smoking Status / Imaging | cert-003 |
| (a)(14) | Patient-Specific Education Resources / Scheduling | cert-007 |
| (e)(1) | View, Download, Transmit | cert-002 |
| (f)(5) | Transmission to Public Health — Electronic Case Reporting | cert-011 |

### HIPAA Security Rule

| Section | Description | Covered By |
|---------|-------------|------------|
| 164.312(b) | Audit Controls | cert-012 |
| 164.312(c)(1) | Integrity Controls | cert-012 |
| 164.312(d) | Person/Entity Authentication | cert-002 |
| 837P/I | Electronic Claim Submission | cert-004 |

## Running the Certification Gate

```bash
node scripts/qa-gates/certification-runner.mjs
```

Output: `artifacts/certification-report.json`
