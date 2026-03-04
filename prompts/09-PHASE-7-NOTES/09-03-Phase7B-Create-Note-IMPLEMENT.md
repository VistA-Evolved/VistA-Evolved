# Phase 7B — Create Note (Write/CRUD) (IMPLEMENT)

Goal:
POST /vista/notes creates a new note for a patient, then list updates.

Rules (from lessons):

- Handle FileMan date format correctly (YYY=year-1700).
- Handle -1^ errors cleanly.
- Do NOT invent RPC: discover correct note-create RPC or document what blocks it.
- Use VISTA_DEBUG=true to inspect wire format without printing credentials.

API:
POST /vista/notes
Body:
{ "dfn":"1", "title":"TEST NOTE", "text":"hello world" }

Return:
{ ok:true, id:"<note id>", message:"Created" }
If failure:
{ ok:false, error:"...", hint:"..." }

UI:

- Add “Create Note” form (title + textarea + save)
- On success: refresh /vista/notes list

Docs:

- docs/runbooks/vista-rpc-add-note.md
- include curl POST example
