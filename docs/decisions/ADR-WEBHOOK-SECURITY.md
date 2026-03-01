# ADR: Webhook Security

## Status
Accepted

## Context
External systems need to receive real-time notifications from VistA-Evolved
without polling. Webhook delivery must be:
- Authenticated (receiver can verify the sender)
- Replay-protected (captured payloads cannot be re-submitted)
- Reliable (retries with backoff, DLQ for persistent failures)
- Tenant-isolated (webhooks scoped to tenant, no cross-tenant data)

Options considered:
1. **Bearer token in header** -- simple but token can be stolen
2. **HMAC signature with timestamp** -- industry standard (Stripe, GitHub)
3. **mTLS** -- strongest but complex certificate management
4. **JWT per delivery** -- flexible but heavyweight

## Decision
- **HMAC-SHA256 signature with timestamp and nonce.**
- Each webhook subscription has a `secret` (generated, never stored in plaintext in logs).
- Signature header: `X-VE-Signature-256` = HMAC-SHA256(secret, `${timestamp}.${nonce}.${body}`)
- Timestamp header: `X-VE-Timestamp` (Unix seconds)
- Nonce header: `X-VE-Nonce` (UUID v4)
- Replay protection: receiver should reject if `|now - timestamp| > 300s`.
- Retry policy: 3 attempts, exponential backoff (5s, 30s, 120s).
- DLQ: failed deliveries after all retries are stored for manual replay.
- Test endpoint: `POST /webhooks/test` sends a test event to verify delivery.

## Consequences
- Receivers must implement HMAC verification (code samples provided).
- Secrets are per-subscription, per-tenant.
- No mTLS complexity for initial implementation.
- Future: add mTLS option for high-security installations.
