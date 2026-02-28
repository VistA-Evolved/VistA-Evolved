# Phase 288 -- VistA Distro Modernization (VERIFY)

## Verification Gates

### Gate 1: build.env has pinned commit hash
```powershell
(Get-Content services/vista-distro/build.env -Raw) -match 'VISTA_ROUTINE_REF=[a-f0-9]{7,40}'
```

### Gate 2: Synthea seed script exists
```powershell
Test-Path services/vista-distro/synthea-seed/seed-synthea.ps1
```

### Gate 3: CI distro build workflow exists
```powershell
Test-Path .github/workflows/ci-distro-build.yml
```

### Gate 4: hadolint config exists
```powershell
Test-Path .hadolint.yaml
```

### Gate 5: Dockerfile has OCI labels
```powershell
(Get-Content services/vista-distro/Dockerfile -Raw) -match 'org.opencontainers.image'
```

### Gate 6: Runbook exists
```powershell
Test-Path docs/runbooks/vista-distro-modernization.md
```

### Gate 7: Synthea README documents the seeding workflow
```powershell
Test-Path services/vista-distro/synthea-seed/README.md
```

## Results
- All gates: PASS (see evidence/wave-11/288/)
