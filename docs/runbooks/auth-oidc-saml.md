# Authentication: OIDC + SAML Broker Runbook (Phase 66)

## Overview

Phase 66 adds a pluggable Identity Provider (IdP) abstraction with three
provider types:

| Type | Protocol | Use Case |
|------|----------|----------|
| `vista` | XUS AV CODE RPC | Direct VistA login (default, existing) |
| `oidc` | Authorization Code + PKCE | Enterprise SSO via OIDC provider |
| `saml-broker` | OIDC-to-Keycloak-to-SAML | SAML IdPs brokered through Keycloak |

VistA RPC login remains the primary clinical authentication path.
OIDC/SAML are additive for enterprise identity federation.

## Architecture

```
Browser --> /auth/idp/authorize/:type  (redirect to IdP)
        <-- IdP redirects to /auth/idp/callback/:type
        --> API validates code, creates session (httpOnly cookie)
        --> Optional: POST /auth/idp/vista-bind (link VistA DUZ)
        --> Clinical routes check requireVistaBinding()
```

Key design decisions:
- **No tokens in localStorage** -- httpOnly cookies only (`ehr_session`)
- **SAML handled by broker** -- app speaks OIDC to Keycloak; Keycloak speaks SAML upstream
- **VistA binding is separate** -- OIDC/SAML authenticates identity; VistA binding grants clinical access
- **CSRF protection** -- double-submit cookie pattern on all state-changing endpoints

## Configuration

### OIDC Provider

```env
IDP_OIDC_ENABLED=true
IDP_OIDC_ISSUER=https://keycloak.example.com/realms/vista-evolved
IDP_OIDC_CLIENT_ID=vista-evolved-api
IDP_OIDC_CLIENT_SECRET=<secret>
IDP_OIDC_SCOPES=openid profile email    # optional, defaults shown
IDP_OIDC_CALLBACK_URL=http://localhost:3001/auth/idp/callback/oidc
```

### SAML Broker Provider

```env
IDP_SAML_BROKER_ENABLED=true
IDP_SAML_BROKER_ISSUER=https://keycloak.example.com/realms/vista-evolved
IDP_SAML_BROKER_CLIENT_ID=vista-evolved-saml
IDP_SAML_BROKER_CLIENT_SECRET=<secret>
IDP_SAML_BROKER_IDP_ALIAS=saml-upstream   # Keycloak IdP alias
IDP_SAML_BROKER_CALLBACK_URL=http://localhost:3001/auth/idp/callback/saml-broker
```

### Local Development (No External IdP)

Leave all `IDP_*` env vars unset. The system defaults to VistA-only login
via `/auth/login` (existing route). The `/auth/idp/providers` endpoint
will return an empty list.

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/auth/idp/providers` | none | List enabled IdP types |
| GET | `/auth/idp/authorize/:type` | none | Start auth flow (redirect) |
| GET | `/auth/idp/callback/:type` | none | Handle IdP callback |
| POST | `/auth/idp/vista-bind` | session | Bind VistA credentials to session |
| GET | `/auth/idp/vista-status` | session | Check VistA binding status |
| GET | `/auth/idp/health` | none | IdP health check |

## VistA Session Binding

After OIDC/SAML login, users have an application session but cannot
access VistA clinical data. To enable clinical access:

```
POST /auth/idp/vista-bind
Content-Type: application/json
Cookie: ehr_session=<token>

{
  "accessCode": "PROV123",
  "verifyCode": "PROV123!!"
}
```

The binding calls `XUS AV CODE` and `XWB CREATE CONTEXT` via the RPC
broker. Once bound, all `/vista/*` routes work normally.

Check binding status:
```
GET /auth/idp/vista-status
Cookie: ehr_session=<token>

Response: { "bound": true, "duz": "87", "userName": "PROVIDER,CLYDE WV" }
```

## Keycloak Setup (SAML Broker)

1. Import the realm from `infra/keycloak/realm-export.json`
2. Add a SAML Identity Provider in Keycloak admin console pointing to
   the upstream SAML IdP (e.g., AD FS, Okta SAML)
3. Set the alias to match `IDP_SAML_BROKER_IDP_ALIAS`
4. Map SAML attributes to OIDC claims (name, email, preferred_username)
5. The app receives standard OIDC tokens -- no SAML XML parsing needed

## Security Notes

- Auth state (nonce + CSRF) stored server-side with 5-min TTL
- All logins audited to both standard and immutable audit trails
- VistA binding audited separately
- Rate limited: 10 req/60s on login endpoints (existing)
- `CLAIM_SUBMISSION_ENABLED` and other safety guards remain unchanged

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `/providers` returns empty | No `IDP_*` env vars set | Set OIDC or SAML broker env vars |
| Callback fails with state mismatch | Auth state expired (>5 min) | Retry auth flow |
| Vista-bind returns 401 | No session cookie | Complete OIDC/SAML login first |
| Vista-bind returns 500 | VistA not running or bad creds | Check Docker + credentials |
| `requireVistaBinding()` blocks route | Session not bound to VistA | POST `/auth/idp/vista-bind` |
