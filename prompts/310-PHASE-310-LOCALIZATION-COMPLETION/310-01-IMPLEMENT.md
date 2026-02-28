# Phase 310 — IMPLEMENT: Localization Completion

> Wave 13-P2 (Regulatory/Compliance + Multi-Country Packaging)

## Objective

Complete localization infrastructure with centralized formatting utilities,
RTL readiness, and locale key parity auditing.

## Deliverables

### 1. Centralized Formatting Package
- **Package:** `packages/locale-utils/`
- `formatDate()`, `formatTime()`, `formatDateTime()` — locale-aware date formatting
- `formatNumber()`, `formatCurrency()` — locale-aware number/currency
- `formatRelativeTime()` — relative time (e.g., "3 days ago")
- `isRtlLocale()`, `getTextDirection()` — RTL detection infrastructure
- `SUPPORTED_LOCALES` — canonical list of supported locales
- Zero external dependencies — uses Intl.* APIs only

### 2. Locale Key Parity Audit
- **Script:** `packages/locale-utils/src/audit-keys.ts`
- Scans en.json, fil.json, es.json for portal and web apps
- Reports missing keys (fil/es vs en baseline)
- Reports extra keys (not in en)
- JSON output for CI consumption

### 3. Contract Tests
- **File:** `packages/locale-utils/tests/locale-utils.test.ts`
- Tests for all formatting functions
- RTL detection tests
- Null/undefined safety tests

### 4. Workspace Integration
- `pnpm-workspace.yaml` updated to include `packages/*`

## Acceptance Criteria

- [ ] `packages/locale-utils/src/index.ts` exports all formatting functions
- [ ] Contract tests cover date, number, currency, RTL
- [ ] Audit script can scan locale files and report parity
- [ ] `pnpm-workspace.yaml` includes `packages/*`
- [ ] RTL readiness markers present (isRtlLocale, getTextDirection)
- [ ] No hardcoded date formats in new code

## Dependencies

- Phase 309: Country pack standard defines uiDefaults (dateFormat, etc.)
