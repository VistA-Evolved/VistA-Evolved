# ADR: ASTM / POCT1-A Parser Strategy

- **Status**: Accepted
- **Date**: 2026-03-01
- **Phase**: 378 (W21-P1)

## Context

Point-of-Care Testing (POCT) devices commonly use two communication
standards:

1. **ASTM E1381/E1394** (also known as LIS2-A2 / LIS1-A) — serial/TCP
   protocol with STX/ETX framing, used by most chemistry analyzers and
   legacy POCT devices.

2. **POCT1-A (IEEE/CLSI)** — XML-based observation reporting standard
   that can run over TCP, HTTP, or serial. Used by modern glucose meters,
   blood gas analyzers, and some coagulation devices.

We need to decide how to parse these protocols in the device integration
pipeline.

## Decision

**Build lightweight, fixture-tested parsers in TypeScript** for both
ASTM and POCT1-A, running inside the edge gateway or as API-side ingest
middleware.

### Rationale

1. **ASTM is structurally simple**: The protocol uses fixed field
   separators (`|`), frame delimiters (STX/ETX/EOT/ENQ), and a small set
   of record types (H, P, O, R, C, L). A parser is ~200 lines of TypeScript.

2. **POCT1-A is XML**: The observation format is well-defined XML with
   `<Observation>`, `<Device>`, `<Patient>`, `<Result>` elements. Node.js
   built-in XML parsing (or a lightweight dependency) handles this.

3. **No python-astm dependency needed**: The `python-astm` library is
   useful but introduces a Python dependency. Since our edge gateway is
   Node.js/TypeScript, a native parser avoids cross-language complexity.

4. **Contract testing is the priority**: Both parsers must be validated
   against real device fixture files (anonymized). If the parser handles
   all fixture variations correctly, it's production-ready.

### Parser Architecture

```
[Device] --ASTM/serial--> [Gateway ASTM Adapter]
                                |
                           parse frames
                           extract records (H,P,O,R,C,L)
                           normalize to DeviceObservation
                                |
                           POST /devices/ingest
                                v
                           [API server]

[POCT Device] --POCT1-A/TCP--> [Gateway POCT1-A Adapter]
                                     |
                                parse XML
                                extract observations
                                normalize to DeviceObservation
                                     |
                                POST /devices/ingest
                                     v
                                [API server]
```

### ASTM Frame Protocol

```
ENQ → wait ACK
STX <frame#> <data> ETX <checksum> CR LF → wait ACK
...repeat for each frame...
EOT
```

Record types:

- **H** (Header): sender, receiver, timestamp
- **P** (Patient): patient ID, name (anonymize!)
- **O** (Order): specimen ID, test codes
- **R** (Result): analyte, value, units, flags, reference range
- **C** (Comment): free-text annotation
- **L** (Terminator): end of message

### POCT1-A XML Structure

```xml
<Observation>
  <Device><Manufacturer/><Model/><SerialNumber/></Device>
  <Patient><PatientId/></Patient>
  <Result>
    <Analyte code="GLU"/><Value>120</Value><Unit>mg/dL</Unit>
    <Flag>N</Flag><ReferenceRange>70-140</ReferenceRange>
  </Result>
  <Timestamp>2026-01-15T10:30:00Z</Timestamp>
</Observation>
```

### Trade-offs

- **Pro**: Zero external dependencies for ASTM parsing
- **Pro**: Full control over error handling and edge cases
- **Pro**: Fixture-based testing ensures correctness
- **Con**: Must handle device-specific ASTM quirks (field ordering,
  optional fields, encoding variations) ourselves
- **Con**: POCT1-A XML schema versions may vary by vendor

## Consequences

- Both parsers are TypeScript modules in the gateway/API codebase
- Each parser must have ≥5 fixture files covering common device outputs
- Checksum validation is mandatory for ASTM (catches serial line noise)
- Patient identifiers in ASTM P records must be mapped, never stored raw
