# Phase 512 -- Notes

> Wave 36 A3: VistA Baseline Lane

## Summary

Documents three VistA baseline lanes (legacy, VEHU, distro) in a runbook and
adds a PowerShell probe script that identifies which VistA baseline is running,
checks port reachability, and writes JSON evidence.

## VistA Baselines

1. **worldvista/worldvista-ehr** -- Legacy dev sandbox (port 9430)
2. **worldvista/vehu** -- VEHU recommended baseline (port 9431)
3. **services/vista-distro** -- Build-your-own distro lane (port 9431)
