# Wave 16 Manifest -- Enterprise Security + Governance Expansion

> SSO hardening, SCIM provisioning, ABAC authorization, secrets management,
> tenant security posture, privacy segmentation, SIEM export, certification runner.

## Phase Map

| Wave Phase | Resolved ID | Title                               | Prompt Folder                        |
| ---------- | ----------- | ----------------------------------- | ------------------------------------ |
| W16-P1     | 337         | Range Reservation + Manifest + ADRs | `337-W16-P1-MANIFEST-ADRS`           |
| W16-P2     | 338         | Enterprise Identity Hardening       | `338-W16-P2-IDENTITY-HARDENING`      |
| W16-P3     | 339         | SCIM Provisioning (Users/Groups)    | `339-W16-P3-SCIM-PROVISIONING`       |
| W16-P4     | 340         | Fine-Grained Authorization (ABAC)   | `340-W16-P4-ABAC-AUTHORIZATION`      |
| W16-P5     | 341         | Secrets & Key Management            | `341-W16-P5-SECRETS-KEY-MGMT`        |
| W16-P6     | 342         | Tenant Security Posture Controls    | `342-W16-P6-TENANT-SECURITY-POSTURE` |
| W16-P7     | 343         | Privacy Segmentation                | `343-W16-P7-PRIVACY-SEGMENTATION`    |
| W16-P8     | 344         | Security Monitoring + SIEM Export   | `344-W16-P8-SIEM-EXPORT`             |
| W16-P9     | 345         | Security Certification Runner       | `345-W16-P9-SECURITY-CERT-RUNNER`    |

## ADR Index (Phase 337)

| ADR                         | Path                                   |
| --------------------------- | -------------------------------------- |
| Authorization Policy Engine | `docs/adrs/ADR-AUTHZ-POLICY-ENGINE.md` |
| SCIM Support                | `docs/adrs/ADR-SCIM-SUPPORT.md`        |
| Secrets Rotation            | `docs/adrs/ADR-SECRETS-ROTATION.md`    |
| SIEM Export                 | `docs/adrs/ADR-SIEM-EXPORT.md`         |

## Dependencies & Run Order

```
W16-P1 (manifest)
  └─> W16-P2 (identity) ─> W16-P3 (SCIM) ─> W16-P4 (ABAC)
  └─> W16-P5 (secrets)
  └─> W16-P6 (tenant posture) -- depends on P2, P4
  └─> W16-P7 (privacy) -- depends on P4
  └─> W16-P8 (SIEM) -- depends on P2, P6
  └─> W16-P9 (cert runner) -- depends on all above
```

## Scope

Wave 16 takes the existing auth/policy infrastructure and adds:

1. **Identity hardening** -- step-up auth, MFA enforcement, session/device policies
2. **SCIM provisioning** -- automated user/group sync from enterprise IdPs
3. **ABAC authorization** -- attribute-based policies beyond roles (dept, facility, patient)
4. **Secrets management** -- envelope encryption, rotation workflows, key lifecycle
5. **Tenant security** -- per-tenant IP allowlists, export restrictions, session policies
6. **Privacy segmentation** -- sensitive note types, break-glass enforcement, access reasons
7. **SIEM export** -- audit streaming, security alerts, anomaly detection
8. **Certification runner** -- one-command security readiness verdict with evidence
