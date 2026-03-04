# Phase 314 — Verify — Country Packs

## Gates (12)

| #   | Gate                  | Check                                                        |
| --- | --------------------- | ------------------------------------------------------------ |
| 1   | US pack exists        | `country-packs/US/values.json` exists                        |
| 2   | PH pack exists        | `country-packs/PH/values.json` exists                        |
| 3   | GH pack exists        | `country-packs/GH/values.json` exists                        |
| 4   | US pack valid JSON    | Parses without error, has countryCode=US                     |
| 5   | PH pack valid JSON    | Parses without error, has countryCode=PH                     |
| 6   | GH pack valid JSON    | Parses without error, has countryCode=GH                     |
| 7   | Loader exists         | `country-pack-loader.ts` with validatePack + loadCountryPack |
| 8   | Routes exist          | `country-pack-routes.ts` with 7 endpoints                    |
| 9   | Framework alignment   | US=HIPAA, PH=DPA_PH, GH=DPA_GH                               |
| 10  | Terminology alignment | US=ICD-10-CM, PH=ICD-10-WHO, GH=ICD-10-WHO                   |
| 11  | Prompts complete      | IMPLEMENT + VERIFY + NOTES exist                             |
| 12  | Evidence exists       | evidence file exists                                         |
