# Phase 5D — Add Allergy (First Write/CRUD) (IMPLEMENT)

Goal:
Add an allergy via RPC and refresh allergy list.

This is the most fragile phase; enforce ALL lessons learned:

Protocol / RPC encoding lessons:

- XWB protocol is byte-exact (Lesson 1).
- LIST parameter keys MUST be MUMPS-quoted strings (BUG-015):
  keys must be "\"GMRAGNT\"" etc.
- LIST continuation byte rules (BUG-016):
  after each entry: "t" except final entry: "f"
  do NOT add extra terminator.
- GMRAORDT is mandatory (BUG-017): include all 6 fields.
- FileMan date format (BUG-012): YYYMMDD.HHMMSS, year-1700.
- GMRAGNT format (BUG-018): NAME^IEN;file_root (name first)
- Do NOT strip trailing comma in file root (BUG-019)
- Skip header lines in match results (BUG-020)
- Duplicate allergy returns -1^... and is expected (Lesson 7)

Preconditions:

- Phase 5C allergies view works
- Broker client stable
- You can search for allergen match entries (if required)

Implementation:
A) API endpoint:
POST /vista/allergies
Body JSON:
{ "dfn":"1", "allergyText":"PENICILLIN" }

Steps:

1. Validate inputs:
   - dfn numeric
   - allergyText length >= 2
2. Use an allergy match RPC to get:
   - allergen IEN
   - allergen name
   - source global (keep trailing comma)
     Filter out header/category lines where source field is empty.
3. Build the OREDITED list param with ALL required fields:
   GMRAGNT, GMRATYPE, GMRANATR, GMRAORIG, GMRAORDT, GMRAOBHX
   - Keys must be quoted
   - Values in correct formats
4. Call the save/update allergy RPC.
5. If response is -1^duplicate, return ok:false with that error message.

B) UI:

- Add "Add Allergy" form
- submit calls POST
- on success refresh list by calling GET allergies

C) Docs:

- docs/runbooks/vista-rpc-add-allergy.md
- include example curl POST + expected outputs
- include duplicate behavior note

Deliverables:

- file list
- curl POST test
- expected output JSON
