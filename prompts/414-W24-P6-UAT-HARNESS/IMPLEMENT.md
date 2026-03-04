# Phase 414 — W24-P6: Clinical Safety & UAT Harness — IMPLEMENT

## Objective

Create structured UAT scenario packs for both pilot archetypes with
clinical safety signoff templates.

## Deliverables

1. `docs/pilots/uat/clinic-uat.md` — 10 scenarios for Archetype A
2. `docs/pilots/uat/hospital-uat.md` — 15 scenarios for Archetype B

## Clinic Scenarios (Archetype A)

Patient Lookup, Allergy Review, Medications, Labs, CPOE, TIU Notes,
RCM Claims, Scheduling, Login/Logout, Error Handling

## Hospital Scenarios (Archetype B)

All clinic scenarios plus: Imaging, Imaging Audit + Break-Glass,
HL7 Interop, HIE Document Exchange, Telehealth, Patient Portal,
Hospital Billing, Admin Telemetry, Error & Resilience

## Pattern

Each scenario has: Actor, Steps, Expected, Signoff checkbox, Tester/Date.
Summary table with overall UAT verdict and clinical safety lead signoff.
