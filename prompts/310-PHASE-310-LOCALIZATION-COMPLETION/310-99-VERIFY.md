# Phase 310 — VERIFY: Localization Completion

> Wave 13-P2 verification gates

## Gates

| #   | Gate                         | Check                                                     |
| --- | ---------------------------- | --------------------------------------------------------- |
| 1   | Package exists               | `packages/locale-utils/package.json` exists               |
| 2   | Exports formatting functions | index.ts exports formatDate, formatNumber, formatCurrency |
| 3   | RTL detection                | index.ts exports isRtlLocale, getTextDirection            |
| 4   | Null safety                  | All format functions handle null/undefined                |
| 5   | Contract tests exist         | `tests/locale-utils.test.ts` exists                       |
| 6   | Audit script exists          | `src/audit-keys.ts` exists                                |
| 7   | Workspace includes packages  | `pnpm-workspace.yaml` has `packages/*`                    |
| 8   | No Intl polyfill needed      | Uses built-in Intl APIs only                              |
| 9   | Locale parity                | All 3 locales have same key count in portal and web       |
| 10  | Prompts complete             | IMPLEMENT + VERIFY + NOTES exist                          |
| 11  | Evidence exists              | evidence file exists                                      |

## Run

```powershell
.\scripts\verify-phase310-localization-completion.ps1
```
