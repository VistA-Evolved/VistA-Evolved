# Payer Integration Evidence Template

> **Phase 112 -- Evidence Pipeline + No-Fake-Integrations Gate**
>
> Use this template when researching a payer's integration capabilities.
> Each entry backs a specific integration claim with a verifiable source.

## Template

Copy the JSON block below and fill in each field:

```json
{
  "payerId": "US-XXXXX",
  "method": "edi",
  "channel": "sftp",
  "source": "https://example-payer.com/provider-portal/edi-guide",
  "sourceType": "url",
  "contactInfo": "EDI Support: 1-800-XXX-XXXX, edi-support@payer.com",
  "submissionRequirements": "Requires enrollment via clearinghouse. Payer ID: XXXXX. Accepts 837P/I via SFTP.",
  "supportedChannelsJson": ["sftp", "https"],
  "lastVerifiedAt": "2026-02-24T00:00:00Z",
  "verifiedBy": "Researcher Name or DUZ",
  "status": "verified",
  "confidence": "confirmed",
  "notes": "Verified via payer website on 2026-02-24. EDI enrollment requires 2 weeks lead time."
}
```

## Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `payerId` | Yes | Must match a payer ID from `data/payers/*.json` or the DB payer registry |
| `method` | Yes | One of: `api`, `portal`, `manual`, `edi`, `fhir` |
| `channel` | No | Transport: `sftp`, `https`, `soap`, `rest`, `portal_upload`, `manual_mail` |
| `source` | Yes | URL or document reference proving this capability exists |
| `sourceType` | No | One of: `url`, `document`, `screenshot`, `contact`, `manual`. Default: `url` |
| `contactInfo` | No | Payer contact for integration support (phone, email) |
| `submissionRequirements` | No | What the payer requires for submissions |
| `supportedChannelsJson` | No | JSON array of supported channels |
| `lastVerifiedAt` | No | ISO 8601 date when this was last verified |
| `verifiedBy` | No | Name or DUZ of person who verified |
| `status` | No | `unverified` (default), `verified`, `stale`, `archived` |
| `confidence` | No | `confirmed`, `inferred`, `unknown` |
| `notes` | No | Freeform notes about the research |

## Method Guidelines

| Method | When to Use | Evidence Source Examples |
|--------|-------------|------------------------|
| `edi` | Payer accepts X12 837/835 via clearinghouse or direct | Clearinghouse payer list, payer EDI companion guide |
| `api` | Payer exposes a REST/SOAP API for submissions | API documentation URL, developer portal |
| `portal` | Payer has a web portal for manual/batch upload | Portal login page, submission guide |
| `fhir` | Payer supports FHIR-based workflows (Da Vinci, etc.) | FHIR endpoint URL, conformance statement |
| `manual` | Paper/fax/mail only | Payer website confirming no electronic option |

## Confidence Levels

- **confirmed**: Directly verified via official payer documentation or API call
- **inferred**: Derived from clearinghouse directory, third-party source, or industry knowledge
- **unknown**: Claim exists but verification pending

## Status Lifecycle

```
unverified -> verified -> stale -> (re-verify) -> verified
                                -> archived (if payer no longer supports)
```

Evidence entries should be re-verified at least annually. Entries older than
12 months without re-verification are automatically flagged as `stale`.

## API Endpoints

Once evidence is researched, submit via the API:

```bash
# Create evidence entry
curl -X POST http://localhost:3001/rcm/evidence \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d @evidence-entry.json

# View coverage gaps
curl http://localhost:3001/rcm/evidence/gaps -b cookies.txt

# View all evidence for a payer
curl http://localhost:3001/rcm/evidence/by-payer/US-CMS-MEDICARE-A -b cookies.txt
```

## Bulk Import

Place JSON files in `data/evidence/` following this format:

```json
{
  "_meta": {
    "description": "Evidence entries for US Medicare payers",
    "generatedAt": "2026-02-24T00:00:00Z"
  },
  "evidence": [
    { "payerId": "US-CMS-MEDICARE-A", "method": "edi", "source": "...", ... },
    { "payerId": "US-CMS-MEDICARE-B", "method": "edi", "source": "...", ... }
  ]
}
```

The CI gate (`scripts/qa-gates/evidence-gate.mjs`) reads these files to
validate coverage without requiring a running API server.

## Future: Live Scraping (NOT IMPLEMENTED)

A future optional module could automate evidence gathering by scraping payer
websites and clearinghouse directories. This is intentionally deferred and
requires explicit approval before implementation due to:

- Legal considerations (terms of service for payer websites)
- Rate limiting and IP blocking risks
- Data freshness vs. staleness trade-offs
- Need for human verification of scraped data
