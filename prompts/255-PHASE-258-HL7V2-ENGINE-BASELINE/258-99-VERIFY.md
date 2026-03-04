# Phase 258 — VERIFY — HL7v2 Integration Engine Baseline

## Verifier

```powershell
.\scripts\verify-phase258-hl7-engine-baseline.ps1
```

## Gates (22)

| Gate | Check                           | Target                           |
| ---- | ------------------------------- | -------------------------------- |
| G01  | MLLP server exists              | mllp-server.ts                   |
| G02  | MLLP client exists              | mllp-client.ts                   |
| G03  | Parser exists                   | parser.ts                        |
| G04  | ACK generator exists            | ack-generator.ts                 |
| G05  | Engine lifecycle exists         | index.ts                         |
| G06  | ADT pack exists                 | adt-pack.ts                      |
| G07  | ORU pack exists                 | oru-pack.ts                      |
| G08  | SIU pack exists                 | siu-pack.ts                      |
| G09  | ORM pack exists                 | orm-pack.ts                      |
| G10  | Dispatcher exists               | dispatcher.ts                    |
| G11  | Matcher exists                  | matcher.ts                       |
| G12  | Route registry exists           | registry.ts                      |
| G13  | Transform pipeline exists       | transform.ts                     |
| G14  | Routing types exists            | types.ts                         |
| G15  | Tenant endpoints module         | tenant-endpoints.ts              |
| G16  | Tenant endpoint routes          | hl7-tenant-endpoints.ts          |
| G17  | Platform admin route convention | /api/platform/integrations/hl7v2 |
| G18  | Inbound endpoint resolver       | resolveInboundEndpoint           |
| G19  | Docker compose for HL7          | services/hl7/docker-compose.yml  |
| G20  | MLLP test sender script         | send-test-message.sh             |
| G21  | Baseline test suite             | hl7-engine-baseline.test.ts      |
| G22  | Engine API routes               | hl7-engine.ts                    |

## Expected Result

22 PASS, 0 FAIL
