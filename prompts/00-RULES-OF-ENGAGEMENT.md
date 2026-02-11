# Rules of Engagement (ROE) — for low-quality AI coders

These rules are required in every prompt:

1) CHECK FIRST:
   - Inventory files and current state before modifying anything.

2) MINIMAL CHANGE:
   - No refactors.
   - Only fix what is broken or missing.

3) NO SECRET LEAKS:
   - Never commit .env.local or credentials.
   - Always use .env.example for schema.

4) NO DUPLICATE DOCS:
   - If a README is duplicated, consolidate into one clean README.

5) WINDOWS-FIRST:
   - All commands must work in Windows PowerShell.

6) HARD STOP ON FAIL:
   - If an integration step fails, do not fake success.
   - Output exact failing step and next diagnostic command.

7) MUST SELF-VERIFY:
   - After changes, the agent must run (or instruct running) verification script.
