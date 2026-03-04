# Phase 317 — W14-P1: NOTES

## Edge Cases

- Phase numbering collision: if another wave creates phases concurrently, prefix collisions possible. The manifest is the source of truth for W14.
- The interop inventory is a point-in-time snapshot. It will drift as W14 phases add code.

## Follow-ups

- W14-P2 will create the Integration Control Plane DB schema
- W14-P3 will formalize the message pack spec (currently packs are code-only, not versioned artifacts)
- W14-P5 will determine whether node-x12 is needed for parse-side (per ADR-X12-LIBRARY)
- W14-P6 will add ssh2 SFTP dependency (per ADR-CLEARINGHOUSE-TRANSPORT)

## ADR Summary

| ADR                     | Decision                      | Rationale                                              |
| ----------------------- | ----------------------------- | ------------------------------------------------------ |
| HL7 Engine              | Keep custom (25+ files)       | Already built, zero-dep, TypeScript-native, in-process |
| X12 Library             | Extend custom, eval node-x12  | Custom serializer exists, add validation + tests first |
| Clearinghouse Transport | SFTP (ssh2) + HTTPS, stub AS2 | SFTP is most common, AS2 is declining                  |
