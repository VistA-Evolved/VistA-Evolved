# ADR: TEFCA Pack — Engineering Readiness Without Overclaiming

- **Status**: Accepted
- **Date**: 2026-03-01
- **Phase**: 399 (W23-P1)

## Context

TEFCA (Trusted Exchange Framework and Common Agreement) defines how health
information networks exchange data in the US. Participation requires
contractual agreements with a QHIN (Qualified Health Information Network).

VistA-Evolved is a software platform, not a QHIN. We can provide engineering
readiness — the technical capabilities needed for TEFCA participation — but
cannot claim QHIN status or regulatory compliance.

## Decision

**Provide "TEFCA-ready participant posture"** — engineering scaffolding that
demonstrates technical alignment with TEFCA requirements, documented as
evidence artifacts, without claiming regulatory status.

### What We Provide

1. **Identity resolution hooks** — MPI integration points for TEFCA IAS
2. **Audit/export requirements** — transaction logging per TEFCA SOP
3. **Performance evidence** — latency and throughput metrics
4. **Connector interfaces** — pluggable endpoint adapters for exchange partners
5. **Evidence harness** — generates required logs/metrics for simulated exchange

### What We Do NOT Claim

- QHIN status or certification
- Regulatory compliance with any specific TEFCA SOP version
- Contractual readiness (that's the deploying organization's responsibility)

## Alternatives Considered

| Option                         | Pros                         | Cons                          |
| ------------------------------ | ---------------------------- | ----------------------------- |
| No TEFCA support               | Avoids all claims            | Misses US market requirement  |
| Full QHIN claim                | Marketing advantage          | Legally dangerous, inaccurate |
| **Readiness posture (chosen)** | Honest, useful, demonstrable | Must be careful with language |

## Consequences

**Positive:**

- Deploying organizations can use VistA-Evolved as their TEFCA-ready platform
- Evidence harness supports real certification processes
- No legal risk from overclaiming

**Negative:**

- Marketing must be carefully worded
- Actual TEFCA participation still requires org-level agreements
