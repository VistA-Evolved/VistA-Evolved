# Phase 192 -- Verify: K8s Autoscaling

## Verification Steps

1. HPA scales up under load
2. Scale-to-zero works in dev
3. Resource limits enforced
4. Scale-down is graceful

## Acceptance Criteria

- [ ] HPA scales up under load
- [ ] Scale-to-zero works in dev
- [ ] Resource limits enforced
- [ ] Scale-down is graceful

## Source

- Derived from wave playbook decomposition (Q213-Q215)
- Original phase specification in wave mega-document
- Corrected by audit fix (title alignment with folder name)

## Notes

- All verification steps require the relevant infrastructure to be running
- Run the corresponding phase verifier script if available
