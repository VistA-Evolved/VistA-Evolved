# Phase 212 -- Repair Prompts Tree to Match Policy

## Context
Q212 from Wave 4. The prompts directory has accumulated structural debt:
orphan flat files, split IMPLEMENT/VERIFY across folders, missing VERIFYs,
duplicate phase numbers, file prefix mismatches, and a wave mega-phase
folder that should be a playbook.

## Implementation Steps

1. Move orphan `197-01-IMPLEMENT.md` to `00-PLAYBOOKS/wave3-gitops-release-compliance.md`
2. Move `100-PHASE-179-WAVE2-K8S-DR-PERF-FHIR/` to `00-PLAYBOOKS/wave2-k8s-dr-perf-fhir/`
3. Fix Phase 43 split: merge IMPLEMENT+VERIFY into one folder, fix file prefixes
4. Fix Phase 131/132 orphan VERIFY: move to correct folder, delete orphan
5. Add missing VERIFY files for Phases 127, 132, 173-178, 95B
6. Resolve duplicate phase numbers (87, 120, 132) with B-suffixes
7. Regenerate phase-index.json and test specs

## Files Touched
- prompts/197-01-IMPLEMENT.md (moved)
- prompts/100-PHASE-179-WAVE2-K8S-DR-PERF-FHIR/ (moved)
- prompts/47-PHASE-43-RCM-LOOP/ (merged, file renamed)
- prompts/48-PHASE-43-VERIFY/ (deleted)
- prompts/99-PHASE-131-132-VERIFY/ (deleted)
- prompts/131-PHASE-127-PORTAL-TELEHEALTH-PG/ (VERIFY added)
- prompts/135-PHASE-131-SCHEDULING-DEPTH/ (VERIFY moved in)
- prompts/136-PHASE-132-CSRF-SYNC-TOKEN/ (VERIFY added)
- prompts/178-PHASE-173-178-PROD-CONVERGENCE/ (VERIFY added)
- prompts/99-PHASE-95B-PLATFORM-PERSISTENCE/ (VERIFY added)
- prompts/93-PHASE-87-PH-RCM/ (renamed to 93-PHASE-87B-PH-RCM)
- prompts/124-PHASE-120-FULL-SYSTEM-AUDIT/ (renamed to 124-PHASE-120B-FULL-SYSTEM-AUDIT)
- prompts/137-PHASE-132-I18N/ (renamed to 137-PHASE-132B-I18N)
- docs/qa/phase-index.json (regenerated)
