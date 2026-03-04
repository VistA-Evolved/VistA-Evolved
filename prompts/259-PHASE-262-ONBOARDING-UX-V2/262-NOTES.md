# Phase 262 — Onboarding UX v2 — NOTES

## Design: Extension, Not Modification

The base onboarding wizard (Phase 243) with its 5 steps is untouched.
Phase 262 adds a **parallel** `OnboardingIntegrationSession` that links
to the base session via `onboardingSessionId`. This keeps the core wizard
working for tenants that don't need integration setup while making
integration configuration available for those that do.

## Integration Kinds

| Kind    | Label                    | Use Case                        |
| ------- | ------------------------ | ------------------------------- |
| hl7v2   | HL7v2 / MLLP             | ADT/ORM/ORU/SIU message routing |
| fhir    | FHIR R4                  | REST interoperability           |
| payer   | Payer / Clearinghouse    | RCM claim submission            |
| imaging | Imaging / DICOM          | Orthanc/OHIF connectivity       |
| oidc    | OIDC / Identity Provider | SSO via Keycloak/Azure AD/Okta  |

## Preflight Checks

The integration preflight runs 6 categories of checks:

1. **endpoints-configured** — at least one endpoint exists
2. **endpoints-reachable** — all probed successfully
3. **hl7-message-types** — HL7v2 endpoints have message type config
4. **payer-adapters** — payer endpoints have adapter assignments
5. **tls-coverage** — non-imaging endpoints use TLS
6. **onboarding-linked** — session is linked to base onboarding

## Future Work

- Wire real TCP/HTTP probes (currently placeholder responses)
- Add HL7 test message send during connectivity step
- Add FHIR $metadata probe during connectivity step
- Integrate with Phase 246 pilot preflight engine for combined checks
