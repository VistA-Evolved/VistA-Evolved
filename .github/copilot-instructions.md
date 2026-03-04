# VistA-Evolved — Copilot Build Protocol (MANDATORY)

## Primary rule

Never fragment the system. Always inventory first, reuse existing patterns, then verify.

## Step 0 — Prompt capture (always first)

Before coding, create a new prompt file under /prompts that contains:

- the user request
- the implementation steps
- the verification steps
- links to files touched

Use the existing ordering rules in prompts/00-ORDERING-RULES.md.

## Step 1 — Inventory-first

Before editing, list:

- files inspected
- existing routes/endpoints involved
- existing UI pages/components involved
- exact files to change

## Step 2 — Implement

- Minimal edits
- Reuse existing rpcBrokerClient + route conventions
- Keep API + web consistent
- Don’t invent new UI patterns (use the established layout conventions)

## Step 3 — Verify (required)

- Run scripts/verify-latest.ps1 (or the correct phase/bundle verifier)
- If failures: fix and rerun until clean

## Step 4 — Docs + Logging artifacts (required)

- Update docs/runbooks/<relevant>.md
- Create ops/summary.md:
  - what changed
  - how to test manually
  - verifier output
  - follow-ups
- Create ops/notion-update.json:
  - feature title
  - stage/status
  - prompt ref path
  - runbook path
  - verify script used
  - commit SHA

## Step 5 — Commit

One coherent commit including:

- code
- prompt file(s)
- runbook
- ops artifacts
