# Phase 636 - VERIFY - CPRS Orders Checks Truthfulness Recovery

## Live Verification

1. Verify Docker/API health before testing:
   - `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
   - `curl.exe -s http://127.0.0.1:3001/ready`
2. Log in as clinician and open `/cprs/chart/46/orders`.
3. Select the existing active VistA order.
4. Verify the detail pane no longer offers `Run Order Checks` for that active order.
5. Verify the pane instead explains that order checks require a new/unsigned order workflow context.
6. Confirm no raw VistA M error text is surfaced in the panel.

## API Verification

1. Call `POST /vista/cprs/order-checks` only with supported workflow inputs.
2. If the sandbox/order context is unsupported, verify the response is truthful and structured:
   - `ok: false`
   - pending/integration note present
   - no raw `%YDB` or `M ERROR=` payload surfaced as a normal success result

## Regression

1. Existing VistA order list still loads on Orders tab.
2. Verify/flag/discontinue controls still render for active VistA orders.
3. Orders panel compiles cleanly.