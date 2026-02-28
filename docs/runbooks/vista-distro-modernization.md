# VistA Distro Modernization Runbook

> Phase 288 -- Distro build pipeline improvements

## What Changed

### 1. Pinned Build References
The `build.env` file now pins `VISTA_ROUTINE_REF` to a specific commit hash
instead of `master`. This ensures:
- Reproducible builds across CI runs
- No surprise breakage from upstream pushes
- Auditable supply chain (commit hash in OCI labels)

To upgrade the pinned ref:
```powershell
# 1. Check latest commits
git ls-remote https://github.com/WorldVistA/VistA-M.git HEAD

# 2. Update build.env
# Edit VISTA_ROUTINE_REF=<new-hash>

# 3. Rebuild and test
cd services/vista-distro
docker compose --profile distro build
docker compose --profile distro up -d

# 4. Run compatibility check
.\scripts\verify-vista-compat.ps1
```

### 2. Synthea Patient Seeding
Synthetic patient generation via Synthea for realistic testing data.

```powershell
# Generate 20 patients (default)
.\services\vista-distro\synthea-seed\seed-synthea.ps1

# Generate larger population
.\services\vista-distro\synthea-seed\seed-synthea.ps1 -Population 100
```

Output goes to `services/vista-distro/synthea-seed/output/` (gitignored).
See `services/vista-distro/synthea-seed/README.md` for the full ingestion roadmap.

### 3. CI Build Validation
The `.github/workflows/ci-distro-build.yml` workflow runs on every push
to `services/vista-distro/**`:

| Job | What it does |
|-----|--------------|
| `lint` | Runs hadolint against the Dockerfile |
| `validate-build-env` | Verifies refs are pinned (not `master`/`main`) |
| `build` | Builds the Docker image (no push) with BuildKit cache |

### 4. Hadolint Configuration
`.hadolint.yaml` at repo root configures Dockerfile linting rules.
Currently ignores DL3008 (apt pin versions) since we pin via the base image.

## Verifying

```powershell
.\scripts\verify-phase288-distro-modernize.ps1
```

## Troubleshooting

### Synthea JAR download fails
- Check internet connectivity
- Try manual download: browse to the Synthea releases page
- Use `-SkipDownload` if JAR is already present

### CI build fails on hadolint
- Check `.hadolint.yaml` for ignored rules
- Run locally: `docker run --rm -i hadolint/hadolint < services/vista-distro/Dockerfile`

### Build.env ref validation fails
- Ensure `VISTA_ROUTINE_REF` is a commit hash (7-40 hex chars), not a branch name
