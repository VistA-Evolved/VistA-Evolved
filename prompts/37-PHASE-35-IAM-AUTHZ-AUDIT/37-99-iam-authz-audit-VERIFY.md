# Phase 35 VERIFY — Enterprise IAM, Policy Authorization & Immutable Audit

## Verification Gates

### Infrastructure (5 gates)
1. `services/keycloak/docker-compose.yml` exists and is valid YAML
2. `infra/keycloak/realm-export.json` exists with realm, clients, roles
3. `infra/opa/policy/authz.rego` exists with default-deny policy
4. Keycloak realm has roles: provider, nurse, admin, patient, support
5. WebAuthn passwordless policy configured in realm export

### OIDC/JWT Auth (8 gates)
6. `oidc-provider.ts` exports OIDC config loader
7. `jwt-validator.ts` exports JWT validation function
8. JWT validation rejects expired tokens
9. JWT validation rejects wrong audience
10. JWT validation rejects tampered signatures
11. Auth gateway accepts both cookie AND JWT Bearer
12. JWKS endpoint configurable via env var
13. Backward compatible: existing cookie auth still works

### Policy Authorization (10 gates)
14. `policy-engine.ts` exports evaluatePolicy function
15. Policy engine has default-deny behavior
16. Policy maps action strings to required roles
17. Provider role can access clinical routes
18. Nurse role can access vitals, notes
19. Admin role can access all routes
20. Patient role denied clinical write routes
21. Support role can read audit, denied writes
22. Break-glass flag scaffold present
23. Tenant/site attribute in policy context

### Immutable Audit (10 gates)
24. `immutable-audit.ts` exports append-only store
25. Each audit entry has SHA-256 hash of previous
26. Hash chain verification function exported
27. Audit events include: login, logout, session-create
28. Audit events include: patient-context-change
29. Audit events include: RPC call categories (no PHI payloads)
30. Audit events include: write attempts
31. No PHI patterns in audit event payloads
32. Audit sink supports file + memory
33. Audit rotation/retention configurable

### Biometrics (8 gates)
34. `BiometricAuthProvider` interface exported
35. `PasskeysProvider` implements interface
36. `FaceVerificationProvider` implements interface
37. Face provider disabled by default
38. No image blobs stored in audit events
39. No image blobs logged
40. Passkey registration types defined
41. Liveness check scaffold in face provider

### Audit Viewer (4 gates)
42. Admin audit viewer page exists
43. Page requires admin role
44. Events displayed without raw PHI
45. Filtering by action/actor/time supported

### Integration (8 gates)
46. Existing Phase 33 routes still accessible
47. No console.log added (structured logger only)
48. AGENTS.md updated with Phase 35 notes
49. Runbook created at docs/runbooks/
50. Security headers still present
51. Rate limiting still enforced
52. CORS still configured correctly
53. Graceful shutdown still works

### Verification Script
54. `scripts/verify-phase35-iam-authz-audit.ps1` exists
55. `scripts/verify-latest.ps1` delegates to Phase 35
56. All file existence checks pass
57. Pattern-based code quality checks pass
58. No secret leakage patterns detected

## Run
```powershell
.\scripts\verify-phase35-iam-authz-audit.ps1
```
