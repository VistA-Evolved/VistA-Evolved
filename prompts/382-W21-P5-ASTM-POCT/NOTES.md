# Phase 382 — W21-P5 NOTES

## Design Decisions
- ASTM frame parser operates on string data, not raw byte buffers, because
  the edge gateway handles serial/TCP framing and forwards text via HTTP.
- Checksum validation is lax: invalid checksum is flagged but doesn't reject
  the message outright. This matches real-world ASTM behavior where some
  analyzers produce non-standard checksums.
- POCT1-A uses regex XML extraction (extractElement, extractAttribute,
  extractBlocks) rather than a DOM parser. The POCT1-A schema is well-defined
  with flat/shallow nesting, making regex sufficient and adding zero deps.
- Both parsers normalize results to DeviceObservation through the shared
  gateway-store storeObservation function.
- The multi-patient ASTM fixture (glucose) tests the case where a single
  ASTM session contains results for multiple patients — common in POC testing.
- Fixture files use synthetic patient IDs (SYN-PAT-xxx) and synthetic serial
  numbers. No real PHI in any fixture.
