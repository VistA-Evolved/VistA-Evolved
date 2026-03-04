# Phase 7A — Notes List (IMPLEMENT)

Goal:
GET /vista/notes?dfn=<dfn> returns notes list and UI displays it.

Rules:

- Do NOT modify rpcBrokerClient.ts unless Phase 4A breaks.
- Use existing broker client.
- Handle VistA error patterns: -1^message => ok:false.
- Handle FileMan dates if returned (YYY + 1700).
- Never commit secrets.

API:
GET /vista/notes?dfn=1
Return:
{ ok:true, count:N, results:[{ id, title, date, author }, ...] }
If no notes: ok:true count=0 results=[]

UI:

- Add Notes section/tab in patient workspace
- Fetch notes when patient selected
- Render list with title + date + author

Docs:

- docs/runbooks/vista-rpc-notes.md
- Add BUG tracker entry if wire format differs from docs

Deliverables:

- file list
- curl test example
- expected JSON example
