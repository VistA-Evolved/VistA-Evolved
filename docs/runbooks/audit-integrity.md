# Audit Trail Integrity -- Runbook (Phase 62)

> How to verify, troubleshoot, and recover audit hash chains.

## Architecture

VistA-Evolved has **5 audit subsystems**, 3 of which use SHA-256 hash chains:

| Subsystem | Hash Chain | Max Entries | Persistence | Verify Endpoint |
|-----------|-----------|-------------|-------------|-----------------|
| General (audit.ts) | No | 5,000 | Memory | -- |
| **Immutable (immutable-audit.ts)** | **Yes** | 10,000 | Memory + JSONL | `GET /iam/audit/verify` |
| Portal (portal-audit.ts) | No | 5,000 | Memory | -- |
| **Imaging (imaging-audit.ts)** | **Yes** | 10,000 | Memory + JSONL | `GET /imaging/audit/verify` |
| **RCM (rcm-audit.ts)** | **Yes** | 20,000 | Memory | `GET /rcm/audit/verify` |

### How the Hash Chain Works

Each entry contains:
- `seq` -- monotonically increasing sequence number
- `prevHash` -- SHA-256 hash of the previous entry (empty string for first)
- `hash` -- SHA-256(`seq + prevHash + timestamp + action + outcome + actorId + ...`)

This makes the chain **tamper-evident**: modifying any entry invalidates it
and every subsequent entry.

## Verification

### Automated (recommended)

```bash
# Via standalone script (no session required for file mode)
npx tsx scripts/security/verify-audit-chain.ts

# File mode -- verify JSONL directly
npx tsx scripts/security/verify-audit-chain.ts --file logs/immutable-audit.jsonl
```

### Manual via API

```bash
# Immutable audit
curl -s http://127.0.0.1:3001/iam/audit/verify | jq .

# Imaging audit
curl -s http://127.0.0.1:3001/imaging/audit/verify | jq .

# RCM audit
curl -s http://127.0.0.1:3001/rcm/audit/verify | jq .
```

Expected response:
```json
{ "valid": true, "totalEntries": 42 }
```

Broken chain response:
```json
{ "valid": false, "totalEntries": 42, "brokenAt": 15, "error": "Hash mismatch at seq 15" }
```

### Phase 62 Verifier

```powershell
.\scripts\verify-phase62-hardening.ps1
```

Runs all audit chain checks as part of the full hardening verification.

## Troubleshooting

### Chain reports `valid: false, brokenAt: N`

**Root cause:** An entry was modified after creation, or entries were inserted
out of order.

1. **Check if the API was restarted.** In-memory chains reset on restart.
   The JSONL file chain persists across restarts. If only the memory chain
   is broken but the file chain is valid, this is expected.

2. **Check for concurrent writes.** All audit functions are synchronous
   within Node's event loop, so this shouldn't happen. But if a bug
   introduces async audit writes, ordering violations are possible.

3. **Check for manual tampering.** If the JSONL file was edited, the chain
   will break. This is by design--the chain detects tampering.

### Recovery

Audit chains cannot be "fixed" without invalidating the tamper evidence.
The correct response to a broken chain is:

1. **Preserve the broken file** as evidence: `cp logs/immutable-audit.jsonl logs/immutable-audit.broken.$(date +%s).jsonl`
2. **Investigate the cause** (restart? bug? tampering?)
3. **The API will start a new chain** on next restart (first entry has empty `prevHash`)
4. **Document the gap** in the incident log

### File not found

The JSONL file is created on first audit event. If no events have been
recorded since startup, the file may not exist.

```bash
ls -la logs/*.jsonl
```

## Compliance Notes

- HIPAA requires audit trail integrity (§164.312(b))
- Hash-chained logs provide tamper evidence (not tamper-proof--the file can
  be deleted, but deletion is detectable by the verify endpoint)
- Production deployments should use a database-backed audit store with
  INSERT-only permissions and row-level hash verification
- Audit files should be backed up to immutable storage (S3 Object Lock,
  Azure Immutable Blob) for regulatory retention

## Related Files

- `apps/api/src/lib/immutable-audit.ts` -- Hash-chained audit store
- `apps/api/src/services/imaging-audit.ts` -- Imaging audit store
- `apps/api/src/rcm/audit/rcm-audit.ts` -- RCM audit store
- `apps/api/src/routes/iam-routes.ts` -- `/iam/audit/verify` endpoint
- `scripts/security/verify-audit-chain.ts` -- Standalone verifier
