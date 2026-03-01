# Wave 23 — Longitudinal Interop + HIE + Multi-Country Exchange Packs

> Interoperability gateway, MPI/client registry, provider directory, document
> exchange (XDS.b/MHD posture), FHIR Bulk Data export/import, consent +
> purpose-of-use enforcement, US exchange pack (TEFCA-ready posture), global
> exchange packs (OpenHIE, EU-style), and an HIE certification runner.

## Phase Map

| Wave Phase | Resolved ID | Title | Prompt Folder |
|------------|-------------|-------|---------------|
| W23-P1 | 399 | Reservation + Manifest + Country/Exchange Map + ADRs | `399-W23-P1-MANIFEST-ADRS` |
| W23-P2 | 400 | Interop Gateway Layer (mediator/channels) | `400-W23-P2-INTEROP-GATEWAY` |
| W23-P3 | 401 | MPI / Client Registry Integration | `401-W23-P3-MPI-REGISTRY` |
| W23-P4 | 402 | Provider Directory + Facility Registry | `402-W23-P4-PROVIDER-DIRECTORY` |
| W23-P5 | 403 | Document Exchange Baseline (XDS.b/MHD posture) | `403-W23-P5-DOCUMENT-EXCHANGE` |
| W23-P6 | 404 | FHIR Bulk Data Export/Import | `404-W23-P6-BULK-DATA` |
| W23-P7 | 405 | Consent + Purpose-of-Use + Segmentation | `405-W23-P7-CONSENT-POU` |
| W23-P8 | 406 | US Exchange Pack (TEFCA-ready posture) | `406-W23-P8-US-EXCHANGE` |
| W23-P9 | 407 | Global Exchange Packs (OpenHIE, EU-style) | `407-W23-P9-GLOBAL-PACKS` |
| W23-P10 | 408 | HIE Certification Runner | `408-W23-P10-HIE-CERT` |

## ADR Index

| ADR | Path |
|-----|------|
| Interop Gateway | `docs/decisions/ADR-W23-INTEROP-GATEWAY.md` |
| MPI Strategy | `docs/decisions/ADR-W23-MPI.md` |
| Document Exchange | `docs/decisions/ADR-W23-DOCUMENT-EXCHANGE.md` |
| Bulk Data | `docs/decisions/ADR-W23-BULK-DATA.md` |
| TEFCA Pack | `docs/decisions/ADR-W23-TEFCA-PACK.md` |

## Dependencies & Run Order

```
P1 (manifest+ADRs) ─── P2 (interop gateway)
                   └── P3 (MPI/client registry)
                   └── P4 (provider directory)
       P2 ─── P5 (document exchange)
          └── P6 (bulk data)
       P3 ─── P7 (consent + POU)
       P5+P6+P7 ─── P8 (US exchange pack)
              └──── P9 (global exchange packs)
       ALL ──────── P10 (HIE certification runner)
```

P1 is foundational (ADRs + map). P2-P4 are independently buildable.
P5-P6 depend on the gateway. P7 depends on MPI. P8-P9 build on all
prior layers. P10 certifies everything end-to-end.

## Source Layout

```
apps/api/src/
  interop-gateway/
    types.ts              — Channel, Mediator, Transform, Transaction types
    gateway-store.ts      — In-memory channel + transaction stores
    gateway-routes.ts     — Gateway REST endpoints
    index.ts              — Barrel export

  mpi/
    types.ts              — PatientIdentity, MatchResult, MergeEvent types
    mpi-store.ts          — In-memory MPI identity + merge stores
    mpi-routes.ts         — MPI REST endpoints
    index.ts              — Barrel export

  provider-directory/
    types.ts              — Practitioner, Organization, Location types
    directory-store.ts    — In-memory provider directory stores
    directory-routes.ts   — Provider directory REST endpoints
    index.ts              — Barrel export

  document-exchange/
    types.ts              — DocumentReference, Exchange, Registry types
    exchange-store.ts     — In-memory document registry/repository
    exchange-routes.ts    — Document exchange REST endpoints
    index.ts              — Barrel export

  bulk-data/
    types.ts              — BulkExportJob, BulkImportJob types
    bulk-store.ts         — In-memory job + NDJSON stores
    bulk-routes.ts        — Bulk Data REST endpoints
    index.ts              — Barrel export

  consent-pou/
    types.ts              — ConsentDirective, PurposeOfUse, Disclosure types
    consent-store.ts      — In-memory consent + disclosure stores
    consent-routes.ts     — Consent REST endpoints
    index.ts              — Barrel export

  exchange-packs/
    types.ts              — ExchangePack, ConnectorConfig, TefcaPosture types
    pack-store.ts         — In-memory exchange pack stores
    pack-routes.ts        — Exchange pack REST endpoints
    connectors/
      types.ts            — ConnectorInterface + registry
      fhir-connector.ts   — REST FHIR connector
      hl7v2-connector.ts  — HL7 v2 connector
      sftp-connector.ts   — SFTP/file-drop connector
      s3-connector.ts     — S3/object-store connector
    index.ts              — Barrel export

docs/interop/
  country-exchange-map.md — Multi-country exchange strategy

evidence/wave-23/        — Certification evidence output
```
