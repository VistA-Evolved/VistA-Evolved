# Phase 434 — Notes

## Why Types-First?

The existing order-check endpoint (`POST /vista/cprs/order-checks`) uses
inline ad-hoc objects. This phase extracts structured types so that:

- The UI can display checks by category with appropriate severity badges
- The pre-sign gate can enforce "acknowledge before sign" rules
- Future ORWDXC DISPLAY and SAVECHK integration has typed contracts

## CPRS Delphi Order-Check Session Lifecycle

In CPRS Delphi, the order-check workflow is:

1. `ORWDXC SESSION` — open check session
2. `ORWDXC ACCEPT` — get check findings for order IEN list
3. `ORWDXC DISPLAY` — get formatted text for each finding
4. Clinician reviews and acknowledges
5. `ORWDXC SAVECHK` — save acknowledgments
6. `ORWOR1 SIG` — sign orders (only after all checks acknowledged)

Our types model this lifecycle with `OrderCheckSession` state machine.

## Category Detection

The `detectCategory()` function uses 10 regex patterns against
the check message text. This handles both formatted VistA output
and free-text check messages. The patterns are ordered by
specificity (e.g., "duplicate therapy" before "duplicate order").
