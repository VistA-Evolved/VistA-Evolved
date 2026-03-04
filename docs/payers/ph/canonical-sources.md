# PH HMO Canonical Sources

## Primary Authority

**Insurance Commission of the Philippines (IC)**

The Insurance Commission maintains the definitive registry of
Health Maintenance Organizations with Certificate of Authority
to operate in the Philippines.

- **URL**: https://www.insurance.gov.ph/list-of-hmos-with-certificate-of-authority-as-of-31-december-2025/
- **As of Date**: 31 December 2025
- **Authority**: Republic Act No. 7875 (National Health Insurance Act),
  as amended by RA 9241 and RA 11223 (Universal Health Care Act)

## Evidence Methodology

Each HMO in the registry has evidence sources collected using:

1. **IC License Check** -- Verify the HMO appears on the current
   Insurance Commission list with valid Certificate of Authority.

2. **Website Verification** -- Visit the HMO's official website to
   confirm it is operational and check for provider-facing resources.

3. **Provider Portal Discovery** -- Check if the HMO operates a
   provider portal for LOA requests, claims, and status tracking.
   Evidence is marked with the portal URL when found.

4. **Capability Classification** -- Based on publicly available
   information, classify each workflow capability:
   - `available` -- Publicly confirmed as available
   - `portal` -- Available through provider portal login
   - `manual` -- Requires manual process (phone/fax/email)
   - `unknown_publicly` -- No public evidence found; requires contracting
   - `unavailable` -- Confirmed as not available

## Evidence Standards

- **No fabricated URLs or APIs.** If a portal URL is not publicly
  verifiable, it is not included.
- **No assumed capabilities.** If a capability cannot be confirmed
  from public sources, it is marked `unknown_publicly`.
- **Contracting tasks are actionable.** Each HMO with unknown
  capabilities has specific contracting tasks to discover them.
- **Retrieved timestamps are honest.** Each evidence entry records
  when it was last verified.

## HMO Coverage

### Tier 1: Portal-Integrated (5 HMOs)

These HMOs have confirmed provider portals:

- **Maxicare** (PH-MAXICARE) -- MaxiLink portal
- **MediCard** (PH-MEDICARD) -- MediCard Provider Portal
- **Intellicare** (PH-INTELLICARE) -- Intellicare Provider Portal
- **PhilCare** (PH-PHILCARE) -- PhilCare Provider Portal
- **ValuCare** (PH-VALUCARE) -- ValuCare Provider Portal

### Tier 2: Website Confirmed (10 HMOs)

These HMOs have active websites but no confirmed provider portal:

- AsianLife, Avega, Caritas, Cocolife, EastWest, Forticare,
  Insular, Kaiser International, Pacific Cross, CareHealth Plus

### Tier 3: Contracting Needed (12 HMOs)

These HMOs need direct engagement to determine integration approach:

- Carewell, Health Maintenance, Health Plan Philippines, HealthFirst,
  i-Care, Life & Health, MediLink, Metrocare, PhilBritish, PHCP,
  PHP, Starcare

## Update Process

1. Check IC website quarterly for changes to the licensed HMO list
2. Re-verify provider portal URLs for Tier 1 HMOs
3. Update `data/payers/ph-hmo-registry.json` with new evidence
4. Run `scripts/vista-first-audit.ps1` to validate
5. Update `_meta.lastUpdated` timestamp
