# RCM X12 Translator -- Local vs External

> Phase 45 Runbook -- VistA-Evolved

## Overview

The Transaction Correctness Engine supports two translator strategies
for converting canonical claim/eligibility/status data into ASC X12
wire format. This runbook explains when to use each and how to configure
the external translator.

## Local Scaffold Translator

**ID**: `local-scaffold`
**Status**: Always available
**Configuration**: None required

The local scaffold translator is the default, built-in translator that:

1. **Validates** canonical payloads against required field maps
2. **Delegates** to existing serializers:
   - 837P/837I: `serialize837()` from `x12-serializer.ts`
   - 270: `serialize270()` from `x12-serializer.ts`
3. **Scaffolds** custom formats for:
   - 276 (Claim Status Inquiry)
   - Generic fallback for other transaction types
4. **Parses** inbound responses:
   - 999: AK9/IK5 acceptance/rejection
   - 271: INS/EB eligibility response
   - 277: STC claim status
   - 835: BPR/CLP remittance

### When to Use

- Development and sandbox environments
- Clearinghouses that accept 5010-compatible X12
- Testing and verification

### Limitations

- No level 4/5 SNIP validation
- No code set validation (CPT/ICD membership)
- No real-time syntax checking beyond field presence

## External Translator Adapter

**ID**: `external`
**Status**: Requires configuration
**Configuration**: 3 environment variables

### Environment Variables

```bash
EXTERNAL_TRANSLATOR_ENABLED=true
EXTERNAL_TRANSLATOR_ENDPOINT=https://translator.example.com/api/v1
EXTERNAL_TRANSLATOR_API_KEY=your-api-key-here
```

### When to Use

- Production clearinghouse submission
- When SNIP level 3-7 validation is required
- When payer-specific companion guides must be enforced
- When X12 syntax must be certified

### How It Works

When all 3 env vars are set:

1. The external adapter reports `isAvailable() === true`
2. The translator registry prefers it over local-scaffold
3. Build/parse/validate calls are proxied to the external API

### Failover

If the external translator fails:

- Currently: returns scaffold placeholder
- Future: automatic fallback to local-scaffold

### Adding a New Translator

1. Implement the `Translator` interface:
   ```typescript
   interface Translator {
     id: string;
     name: string;
     isAvailable(): boolean;
     buildX12(txnSet, canonical, envelope): TranslatorResult;
     parseX12(txnSet, raw): ParsedResponse;
     validate(txnSet, canonical): string[];
   }
   ```
2. Register in `transactions/index.ts`:
   ```typescript
   registerTranslator(myTranslator);
   ```
3. The registry will select it if `isAvailable()` returns true
   and it's the preferred translator.

## API Endpoints

| Endpoint                       | Description                     |
| ------------------------------ | ------------------------------- |
| `GET /rcm/translators`         | List all registered translators |
| `POST /rcm/transactions/build` | Build uses active translator    |

## Verification

```bash
# Check which translator is active
curl http://localhost:3001/rcm/translators

# Build a test transaction (local scaffold)
curl -X POST http://localhost:3001/rcm/transactions/build \
  -H "Content-Type: application/json" \
  -d '{"transactionSet":"270","senderId":"SENDER","receiverId":"RECV"}'
```

## Determinism Test

The local scaffold translator is deterministic: given the same canonical
payload and envelope, it produces identical X12 output. This is verified
in `tests/transaction-correctness.test.ts` under "builds deterministic
X12 for same input".
