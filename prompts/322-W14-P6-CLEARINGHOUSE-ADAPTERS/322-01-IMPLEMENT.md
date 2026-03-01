# Phase 322 — W14-P6: Clearinghouse Adapters v2

## User Request
Build unified clearinghouse transport abstraction: pluggable transport providers
(SFTP, AS2, HTTPS-REST), credential vault abstraction with env-var and in-memory
backends, connection testing with structured diagnostics, token-bucket rate
limiting per connector, and transport profiles connecting it all together.

## Implementation Steps
1. Created `apps/api/src/rcm/connectors/clearinghouse-transport.ts` (~530 lines):
   - **TransportConfig** discriminated union: SftpTransportConfig, As2TransportConfig,
     HttpsRestTransportConfig, HttpsSoapTransportConfig
   - **CredentialVaultProvider** interface + 2 built-in implementations:
     - EnvVarVaultProvider (reads from process.env)
     - InMemoryVaultProvider (for testing)
   - Vault registry: registerVaultProvider, setActiveVault, getActiveVault, listVaultProviders
   - **TransportProvider** interface: configure, send, receive, testConnection, shutdown
   - 3 built-in transports:
     - SftpTransport (scaffold — real ops need ssh2)
     - HttpsRestTransport (live — uses native fetch with vault credential auth)
     - As2Transport (scaffold — needs S/MIME implementation)
   - Transport registry: registerTransport, getTransport, listTransports, getTransportForType
   - **Token bucket rate limiter**: configureRateLimit, tryAcquireToken, getRateLimitStatus,
     listRateLimits. Refill-on-check pattern, per-connector buckets.
   - **TransportProfile**: connects connectorId to TransportConfig + vault + rate limit.
     CRUD: createTransportProfile, getTransportProfile, listTransportProfiles,
     deleteTransportProfile, getTransportProfileForConnector.

2. Created `apps/api/src/routes/clearinghouse-transport.ts` (14 REST endpoints):
   - GET  /clearinghouse/transports
   - POST /clearinghouse/transports/test/:id
   - POST/GET/GET/:id/DELETE /clearinghouse/profiles
   - GET  /clearinghouse/vault/status
   - POST /clearinghouse/vault/credentials
   - DELETE /clearinghouse/vault/credentials/:key
   - GET/POST/GET/:id /clearinghouse/rate-limits
   - GET  /clearinghouse/health

3. Wired into register-routes.ts, security.ts (admin auth), store-policy.ts (4 stores)

## Verification
- `npx tsc --noEmit` — clean (0 errors)
- All routes admin-gated
- 4 store-policy entries (3 registry + 1 cache)

## Files Touched
- apps/api/src/rcm/connectors/clearinghouse-transport.ts (NEW)
- apps/api/src/routes/clearinghouse-transport.ts (NEW)
- apps/api/src/server/register-routes.ts (import + register)
- apps/api/src/middleware/security.ts (AUTH_RULES)
- apps/api/src/platform/store-policy.ts (4 store entries)
