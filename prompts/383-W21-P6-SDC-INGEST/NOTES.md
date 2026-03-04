# Phase 383 — W21-P6 NOTES

## Design Decisions

- SDC is the only Python component in the stack — isolated in a sidecar
  container to avoid mixing Python/Node runtimes.
- network_mode: host required for WS-Discovery multicast (UDP 3702). Docker
  bridge mode won't forward multicast packets.
- Scaffold consumer.py logs discovery intent but returns empty device list.
  Real discovery uses sdc11073.wsdiscovery.WSDiscovery + SdcConsumer.
- Waveform downsampling is configurable because SDC waveform metrics can
  generate hundreds of samples per second. Without downsampling, the
  observation store would fill rapidly.
- MDC (Medical Device Communication) coding system is IEEE 11073-10101,
  the standard code set for SDC devices. Will be mapped to LOINC in P10.
