# ADR: X12 Library Strategy

**Status:** Accepted  
**Date:** 2026-03-01  
**Phase:** W14-P1 (Phase 317)

## Context

VistA-Evolved needs X12 5010 parsing and generation for revenue cycle operations: eligibility (270/271), claims (837P/837I), and remittance (835).

## Options Evaluated

### Option A: node-x12 (npm)
- **License:** MIT
- **Pros:** TypeScript/JavaScript native, npm install, actively maintained, supports 837/835/270/271/276/277, loop-level parsing
- **Cons:** Limited validation depth, no built-in encryption, we still own the domain mapping

### Option B: pyx12 (Python)
- **License:** MIT
- **Pros:** Mature, full X12 grammar support, used by CMS
- **Cons:** Python sidecar, cross-process serialization, separate deployment

### Option C: imsweb x12-parser (Java)
- **License:** Apache 2.0
- **Pros:** ASC X12 grammar-driven, very thorough
- **Cons:** Java sidecar, same operational overhead as pyx12

### Option D: Custom Serializer (Current)
- **License:** Project-owned (MIT)
- **Pros:** Already exists (`x12-serializer.ts`, `remit-processor.ts`, `ack-status-processor.ts`), in-process, TypeScript-native
- **Cons:** Scaffold-level — generates structural X12 but lacks full loop/element validation, no round-trip parsing

### Option E: Hybrid — Extend Custom + Adopt node-x12 for Parsing
- **License:** MIT (node-x12) + project-owned
- **Pros:** Best of both — use node-x12 for parsing received X12 (835, 271, 277CA), keep custom serializer for generation (837P/I, 270), all in-process
- **Cons:** Two code paths to maintain

## Decision

**Extend the existing custom engine and evaluate node-x12 for parse-side adoption (Option D + partial E).**

Rationale:
1. The custom serializer (`x12-serializer.ts`) and processors (`remit-processor.ts`, `ack-status-processor.ts`) already handle 837 generation and 835/999/277CA parsing.
2. Adding a Java/Python sidecar (Options B/C) contradicts our zero-dependency, in-process architecture.
3. For W14-P5, we will harden the existing engine with deterministic tests and structural validation. If parse-side gaps emerge (e.g., complex 835 loop structures), we will adopt `node-x12` as a parse-only dependency behind a facade.

## Integration Plan

1. Add deterministic test fixtures for 270/271, 837P/I, 835 (W14-P5)
2. Add structural validation for generated X12 (ISA/GS/ST envelope correctness)
3. Implement partner trading config (ISA/GS IDs, delimiters, version) via Integration Control Plane (W14-P2)
4. If round-trip parsing gaps found: `npm install node-x12` behind `X12_PARSE_ENGINE=node-x12` flag

## Rollback Plan

The custom serializer is the primary path. If `node-x12` is adopted and later proves problematic (breaking changes, unmaintained), revert to custom parsing — the facade pattern ensures single-point swap.

## License Note

`node-x12` is MIT licensed. No proprietary code set tables (CPT, ICD-10) are bundled — code values pass through as-is per existing convention (see AGENTS.md #97).
