# Phase 20 — VistA-First Grounding (VERIFY)

> Verify all Phase 20 artifacts exist, are non-empty, and correctly ground
> the platform to VistA's data model.

---

## Section 1: Grounding Documents

- [ ] `docs/vista-capability-matrix.md` exists and has ≥ 15 VistA package sections
- [ ] `docs/interop-grounding.md` exists and references HL7 files #870, #772, #773, #776, #779.x
- [ ] `docs/imaging-grounding.md` exists and references IMAGE #2005, #2005.1, #2005.2
- [ ] `docs/reporting-grounding.md` exists and separates clinical vs platform reporting
- [ ] `docs/fhir-posture.md` exists and states "VistA is the system of record"
- [ ] `docs/octo-analytics-plan.md` exists and explicitly excludes clinical data
- [ ] `docs/ai-gateway-plan.md` exists and states "human-in-the-loop" requirement

## Section 2: Capability Matrix Completeness

- [ ] Matrix covers: Auth/Session, Patient Selection, Cover Sheet, Problem List, Medications, Orders, Notes/TIU, Consults, Surgery, DC Summaries, Labs, Reports, Allergies, Vitals, Imaging, Inbox, HL7/HLO, FHIR, Platform
- [ ] Each feature row has: VistA Package, RPC(s), FileMan Files, State, Next Step
- [ ] States are: wired, stub, gap, mock, or platform
- [ ] Summary statistics table exists

## Section 3: Phase 18/19 Enforcement Prompts

- [ ] `prompts/20-PHASE-18-INTEROP-IMAGING/20-02-Phase18B-VistaFirst-Enforcement-IMPLEMENT.md` exists
- [ ] `prompts/20-PHASE-18-INTEROP-IMAGING/20-90-Phase18B-VistaFirst-Enforcement-VERIFY.md` exists
- [ ] `prompts/21-PHASE-19-REPORTING-GOVERNANCE/21-02-Phase19B-VistaFirst-Enforcement-IMPLEMENT.md` exists
- [ ] `prompts/21-PHASE-19-REPORTING-GOVERNANCE/21-90-Phase19B-VistaFirst-Enforcement-VERIFY.md` exists

## Section 4: Prompts Ordering

- [ ] Folder numbering is contiguous: 00-ARCHIVE, 00-PLAYBOOKS, 01-22
- [ ] Each phase folder has at least one `-01-*-IMPLEMENT.md` and one `-99-*-VERIFY.md`
- [ ] Phase 20 folder is `22-PHASE-20-VISTA-FIRST-GROUNDING`
- [ ] File prefixes match folder numbers (folder 22 → files start with `22-`)

## Section 5: Code Corrections (if applied)

- [ ] Interop routes header comment references VistA HL7 files
- [ ] Imaging service header references VistA Imaging files
- [ ] Reporting routes header distinguishes platform vs clinical reporting
- [ ] No regressions: `scripts/verify-latest.ps1` passes

## Section 6: Runbook Links

- [ ] `docs/runbooks/README.md` has Phase 20 entry (if updated)
