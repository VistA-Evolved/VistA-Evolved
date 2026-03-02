# Phase 448 — Notes

- Sync script uses git clone --depth 1 for speed, records HEAD SHA
- LOCK.json is the source of truth for what upstream code we track
- License snapshot hashes license file content for change detection
- No upstream code is copied into our source tree — vendor/ is gitignored except LOCK.json
