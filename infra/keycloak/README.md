# Keycloak Local Setup — VistA Evolved

## Quick Start

```bash
cd services/keycloak
docker compose up -d
```

Keycloak will be available at **http://localhost:8180**.

## Admin Console

- URL: http://localhost:8180/admin
- Username: `admin`
- Password: `admin`

## Realm: vista-evolved

The realm is auto-imported on first start from `infra/keycloak/realm-export.json`.

### Pre-configured Clients

| Client ID | Type | Purpose |
|-----------|------|---------|
| `vista-evolved-web` | Confidential | CPRS Web App (OIDC Authorization Code) |
| `vista-evolved-api` | Bearer-only | API Resource Server (JWT validation) |
| `vista-evolved-portal` | Confidential | Patient Portal (OIDC Authorization Code) |

### Pre-configured Roles

| Role | Description |
|------|-------------|
| `provider` | Clinical provider - full clinical access |
| `nurse` | Nurse - vitals, notes, read access |
| `pharmacist` | Pharmacist - medication management |
| `clerk` | Limited read access |
| `admin` | System administrator - full access |
| `patient` | Patient portal - own data only |
| `support` | Support staff - audit read, no clinical writes |

### Dev Users

| Username | Password | Roles | DUZ |
|----------|----------|-------|-----|
| `provider.clyde` | `DevProvider123!` | provider, admin | 87 |
| `nurse.helen` | `DevNurse123!` | nurse | 88 |
| `pharmacist.linda` | `DevPharm123!` | pharmacist | 89 |
| `support.user` | `DevSupport123!` | support | 90 |
| `patient.test` | `DevPatient123!` | patient | - |

### Custom Token Claims

Tokens include:
- `realm_roles` — array of role names
- `duz` — VistA DUZ (user number)
- `facility_station` — VistA facility station number
- `tenant_id` — multi-tenant identifier

## WebAuthn / Passkeys

The realm has WebAuthn Passwordless configured as a required action.
To enable passkey registration for a user:

1. Go to Admin Console > Users > select user
2. Required Actions > Add "Webauthn Register Passwordless"
3. User will be prompted on next login

No biometric data is transmitted to the server — only WebAuthn assertions
(public key + challenge response).

## OIDC Endpoints

| Endpoint | URL |
|----------|-----|
| Authorization | `http://localhost:8180/realms/vista-evolved/protocol/openid-connect/auth` |
| Token | `http://localhost:8180/realms/vista-evolved/protocol/openid-connect/token` |
| UserInfo | `http://localhost:8180/realms/vista-evolved/protocol/openid-connect/userinfo` |
| JWKS | `http://localhost:8180/realms/vista-evolved/protocol/openid-connect/certs` |
| Well-Known | `http://localhost:8180/realms/vista-evolved/.well-known/openid-configuration` |

## Environment Variables (API)

```env
OIDC_ISSUER=http://localhost:8180/realms/vista-evolved
OIDC_CLIENT_ID=vista-evolved-api
OIDC_JWKS_URI=http://localhost:8180/realms/vista-evolved/protocol/openid-connect/certs
OIDC_AUDIENCE=vista-evolved-api
```

## Tear Down

```bash
cd services/keycloak
docker compose down       # Keep data
docker compose down -v    # Remove all data
```
