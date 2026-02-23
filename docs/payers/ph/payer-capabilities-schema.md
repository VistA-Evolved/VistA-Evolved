# PH HMO Registry — Payer Capabilities Schema

## Overview

The PH HMO registry (`data/payers/ph-hmo-registry.json`) uses a
structured schema to describe each HMO's integration capabilities.
This document defines the schema for agent and developer reference.

## Top-Level Structure

```json
{
  "_meta": { ... },
  "hmos": [ ... ]
}
```

### `_meta` Block

| Field | Type | Description |
|-------|------|-------------|
| schema | string | Schema version identifier |
| description | string | Human-readable description |
| canonicalSource | object | IC source reference |
| canonicalSource.url | string | URL to IC HMO list |
| canonicalSource.title | string | Page title |
| canonicalSource.authority | string | Issuing authority |
| canonicalSource.asOfDate | string | Date the IC list was published (YYYY-MM-DD) |
| canonicalSource.retrievedAt | string | ISO 8601 timestamp when retrieved |
| count | number | Expected number of HMOs in the array |
| lastUpdated | string | Date of last registry update (YYYY-MM-DD) |
| maintainer | string | Phase or team responsible |
| notes | string | General notes |

### HMO Entry

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| payerId | string | Yes | Unique ID, format: `PH-{CODE}` |
| legalName | string | Yes | Full legal name from IC registry |
| brandNames | string[] | Yes | Common brand/trade names |
| type | "HMO" | Yes | Always "HMO" |
| country | "PH" | Yes | Always "PH" |
| canonicalSource | object | Yes | IC source reference for this entry |
| capabilities | object | Yes | Capability status map (see below) |
| integrationMode | string | Yes | One of: manual, portal, api, email |
| evidence | array | Yes | Array of evidence sources (may be empty) |
| status | string | Yes | One of: in_progress, contracting_needed, active, suspended |
| contractingTasks | string[] | No | Actionable tasks to complete integration |

## Capability Status Values

Each capability field in the `capabilities` object uses one of:

| Value | Meaning | Action Required |
|-------|---------|-----------------|
| `available` | Publicly confirmed as available | Can be used immediately |
| `portal` | Available via provider portal login | Need portal credentials |
| `manual` | Requires manual process (phone/fax/email) | Generate packet, follow manual workflow |
| `unknown_publicly` | No public evidence found | Initiate contracting to discover |
| `unavailable` | Confirmed as not available | Not supported by this HMO |

## Capabilities Map

| Capability | Description |
|------------|-------------|
| loa | Letter of Authorization request |
| eligibility | Member eligibility verification |
| claimsSubmission | Claims submission to HMO |
| claimStatus | Claim status inquiry |
| remittance | Remittance/SOA download |
| memberPortal | HMO member-facing portal |
| providerPortal | HMO provider-facing portal |

## Integration Mode Values

| Mode | Description | Adapter Strategy |
|------|-------------|------------------|
| `manual` | All interactions via phone/fax/email/courier | ManualAdapter: generates print-ready packets |
| `portal` | Provider portal available for key workflows | PortalAdapter: deep links + checklists |
| `api` | Direct API available (rare for PH HMOs) | ApiAdapter: automated calls |
| `email` | Email-based workflow with templates | EmailAdapter: generates email templates |

## Evidence Entry

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| kind | string | Yes | One of: website, provider_portal, loa_instructions, api_docs, contract, other |
| url | string | Yes | URL to the evidence source |
| title | string | Yes | Human-readable title |
| retrievedAt | string | Yes | ISO 8601 timestamp when verified |
| notes | string | No | Additional context |

## Validation Rules

The registry loader (`ph-hmo-registry.ts`) enforces:

1. `_meta` block must be present
2. `hmos` must be an array
3. `_meta.count` should match array length (warning if mismatch)
4. All `payerId` values must be unique
5. Each entry must have: payerId, legalName, type="HMO", country="PH", canonicalSource.url, capabilities
6. Warning emitted if all capabilities are `unknown_publicly`

## TypeScript Types

All types are defined in `apps/api/src/rcm/payers/ph-hmo-registry.ts`:

- `PhHmo` -- Single HMO entry
- `HmoCapabilities` -- Capability status map
- `HmoCapabilityStatus` -- Enum of capability values
- `HmoIntegrationMode` -- Integration mode type
- `HmoStatus` -- HMO onboarding status
- `HmoEvidence` -- Evidence source entry
- `PhHmoRegistryData` -- Full registry structure
- `RegistryValidationResult` -- Validation output
