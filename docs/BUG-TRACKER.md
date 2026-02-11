# Bug Tracker & Lessons Learned — VistA-Evolved (Phase 1 → Phase 5D)

> **Purpose**: A single-source log of every significant bug, challenge, and
> hard-won fix from the project's inception through Phase 5D. Share this with
> new developers and AI agents so they don't repeat the same mistakes.
>
> **Last updated**: 2026-02-11 (Phase 5D complete)

---

## Table of Contents

1. [Phase 1 — Repo Scaffolding](#phase-1--repo-scaffolding)
2. [Phase 2 — Docker Sandbox](#phase-2--docker-sandbox)
3. [Phase 3 — VistA Connectivity](#phase-3--vista-connectivity)
4. [Phase 4A — RPC Default Patient List](#phase-4a--rpc-default-patient-list)
5. [Phase 4B — Patient Search](#phase-4b--patient-search)
6. [Phase 5A — Patient Search UI](#phase-5a--patient-search-ui)
7. [Phase 5B — Patient Demographics](#phase-5b--patient-demographics)
8. [Phase 5C — Allergies Display](#phase-5c--allergies-display)
9. [Phase 5D — Add Allergy (First Write/CRUD)](#phase-5d--add-allergy-first-writecrud)
10. [Cross-Cutting Lessons](#cross-cutting-lessons)

---

## Phase 1 — Repo Scaffolding

### BUG-001: pnpm `allowBuilds` for native packages

| Field | Detail |
|-------|--------|
| **What we tried** | `pnpm install` in the monorepo |
| **Error** | esbuild, sharp, and unrs-resolver failed to build because pnpm v10 sandboxes lifecycle scripts by default |
| **Root cause** | pnpm v10 changed default `onlyBuiltDependencies` behavior — native addons won't compile unless explicitly allowed |
| **Fix** | Added `onlyBuiltDependenciesFile` or `allowBuilds` in `pnpm-workspace.yaml` for esbuild, sharp, unrs-resolver |
| **Preventive** | Always check pnpm version. If v10+, native packages need explicit build permission in workspace config |

### BUG-002: `.env.*` files tracked by git

| Field | Detail |
|-------|--------|
| **What we tried** | Initial commit with `.env.example` present |
| **Risk** | `.env.local` could be accidentally committed with real credentials |
| **Fix** | Added `.env.*` to `.gitignore` (excludes everything), then force-added `.env.example` back. Verified with `git ls-files -- "*.env*"` |
| **Preventive** | Always verify no secrets are tracked: `git ls-files -- "*.env*" "*secret*" "*.pem" "*.key"` |

---

## Phase 2 — Docker Sandbox

### BUG-003: Port 9430 not ready after `docker compose up`

| Field | Detail |
|-------|--------|
| **What we tried** | Immediately connecting to VistA after starting Docker |
| **Error** | `ECONNREFUSED` on port 9430 |
| **Root cause** | WorldVistA container takes ~15–30 seconds to start the MUMPS listener after the container is "running" |
| **Fix** | Added retry loop with 500ms intervals, up to 30 attempts (15 seconds total) in verification scripts |
| **Preventive** | Never assume VistA is ready just because Docker reports the container as running. Always probe port 9430 with retries |

### BUG-004: Windows port conflict on 3001

| Field | Detail |
|-------|--------|
| **What we tried** | Starting Fastify API on port 3001 |
| **Error** | `EADDRINUSE` — port 3001 already in use |
| **Root cause** | Previous API process didn't clean up, or another service occupies the port |
| **Fix** | Created `docs/runbooks/windows-port-3001-fix.md` with `Get-NetTCPConnection -LocalPort 3001 \| Stop-Process` pattern |
| **Preventive** | Verification scripts now kill any existing process on port 3001 before starting the API |

---

## Phase 3 — VistA Connectivity

### BUG-005: TCP probe vs. RPC Broker confusion

| Field | Detail |
|-------|--------|
| **What we tried** | Simple TCP connect to verify VistA is up |
| **Risk** | TCP connect succeeds even if the RPC Broker listener isn't accepting XWB protocol |
| **Fix** | Created two separate modules: `rpcBroker.ts` (simple TCP probe for `/vista/ping`) and `rpcBrokerClient.ts` (full XWB RPC client with auth) |
| **Preventive** | Keep probe and full-auth client separate. Probe is lightweight, client is stateful |

---

## Phase 4A — RPC Default Patient List

### BUG-006: XWB message framing — missing `\x01` + `1` bytes

| Field | Detail |
|-------|--------|
| **What we tried** | `[XWB]11302` + SPack(rpcName) + params + `\x04` |
| **Error** | Server silently disconnected ("608 Job ended") with no error message |
| **Root cause** | Every `11302` RPC call message requires `\x01` + `1` (two literal bytes) between the prefix and the SPacked RPC name. Without these, the server's `EN^XWBTCPL` routine rejects the message |
| **How we found it** | Compared byte-by-byte with Python reference implementation `vavista-rpc3/brokerRPC3.py` (`buildRpcGreeting`) |
| **Fix** | `msg = PREFIX + "11302" + "\x01" + "1" + sPack(rpcName)` |
| **Preventive** | Never guess XWB protocol bytes. Use `VISTA_DEBUG=true` hex dumps and compare against known-working implementations. The protocol has ZERO tolerance for missing bytes |

### BUG-007: Cipher pads — fabricated vs. real XUSRB1.m Z-tag pads

| Field | Detail |
|-------|--------|
| **What we tried** | Generated random cipher pads for the sign-on obfuscation |
| **Error** | `XUS AV CODE` returned DUZ=0 (authentication failure) even with correct credentials |
| **Root cause** | The 20 cipher pads must match exactly what's in `XUSRB1.m` at the `Z` label. The server uses the same pads to decrypt. Random pads produce garbage |
| **How we found it** | Extracted real pads directly from the Docker container: `docker exec -it wv su - wv -c "mumps -r %XCMD 'F I=1:1:20 W \"PAD \"_I_...'` |
| **Fix** | Hardcoded the 20 real pads (94 chars each) from XUSRB1.m into `rpcBrokerClient.ts` |
| **Preventive** | Cipher pads are NOT random. They're a shared secret between client and server. If you ever change VistA versions, re-extract with the command above |

### BUG-008: Cipher algorithm — spaces must be translated

| Field | Detail |
|-------|--------|
| **What we tried** | `$TR` substitution that skipped space characters |
| **Error** | `XWB CREATE CONTEXT` failed for `"OR CPRS GUI CHART"` — context name contains spaces |
| **Root cause** | MUMPS `$TR(text, idStr, assocStr)` translates ALL characters including spaces. Our initial implementation skipped spaces, which broke multi-word context names |
| **Fix** | Changed cipher loop: every character (including space) goes through `idStr.indexOf(ch)` → `assocStr.charAt(pos)` substitution |
| **Preventive** | The cipher must translate spaces. Test with a context name that contains spaces (like `OR CPRS GUI CHART`) |

### BUG-009: Cipher index collision

| Field | Detail |
|-------|--------|
| **What we tried** | Random IDIX and ASSOCIX both in range 1–20 |
| **Error** | Intermittent auth failures (~5% of attempts) |
| **Root cause** | IDIX and ASSOCIX must be DIFFERENT. If they're the same, `$TR(text, pad, pad)` is an identity function — the text isn't obfuscated at all, causing the server to misparse |
| **Fix** | `if (idIdx === assocIdx) { idIdx = (idIdx % 20) + 1; }` |
| **Preventive** | Always ensure the two random cipher indices differ |

---

## Phase 4B — Patient Search

### BUG-010: `pnpm -C apps/api dev` doesn't load `.env.local`

| Field | Detail |
|-------|--------|
| **What we tried** | `pnpm -C apps/api dev` which runs `tsx watch src/index.ts` |
| **Error** | API started but returned "Missing VistA credentials" on every RPC endpoint |
| **Root cause** | `tsx` doesn't auto-load `.env.local`. The env vars are read at module import time by `config.ts` |
| **Fix** | Use `node --env-file=.env.local --import tsx src/index.ts` instead, or set env vars in the shell before running |
| **Preventive** | Always verify credentials are loaded: `curl /vista/default-patient-list` — if it says "Missing VistA credentials", env vars aren't set |

---

## Phase 5A — Patient Search UI

### BUG-011: Next.js 16 + React 19 hydration mismatch

| Field | Detail |
|-------|--------|
| **What we tried** | Client-side `useState` with SSR |
| **Risk** | React 19 strict mode causes hydration warnings if initial state differs between server and client |
| **Fix** | Added `"use client"` directive at top of interactive pages. Default search value set consistently |
| **Preventive** | All pages with `useState`, `useEffect`, `useCallback` must be `"use client"` in Next.js App Router |

---

## Phase 5B — Patient Demographics

### BUG-012: FileMan date YYYMMDD format confusion

| Field | Detail |
|-------|--------|
| **What we tried** | Parsing VistA date as standard YYYYMMDD |
| **Error** | Dates showed as year 326 instead of 2026 |
| **Root cause** | FileMan stores dates as YYYMMDD where YYY = year − 1700. So 2026 = `326`, stored as `3260211` for Feb 11, 2026 |
| **Fix** | `parseInt(dateStr.substring(0, 3), 10) + 1700` to convert back to calendar year |
| **Preventive** | FileMan dates are ALWAYS YYY = year − 1700. This applies everywhere: DOB, event dates, GMRAORDT, etc. |

### BUG-013: ORWPT SELECT returns "-1" for unknown DFN

| Field | Detail |
|-------|--------|
| **What we tried** | Calling ORWPT SELECT with a non-existent DFN |
| **Error** | Returned raw line with `-1` in first piece rather than a clean error |
| **Fix** | Added check: `if (parts[0] === "-1") return { ok: false, error: "Patient not found" }` |
| **Preventive** | Always handle the `-1` error pattern. Many VistA RPCs return `-1^error message` on failure |

---

## Phase 5C — Allergies Display

### BUG-014: "No Allergy Assessment" line parsing

| Field | Detail |
|-------|--------|
| **What we tried** | Parsing all lines from `ORQQAL LIST` as allergy entries |
| **Error** | When a patient has no allergies, VistA returns `^No Allergy Assessment` which has an empty first field |
| **Fix** | Filter: `if (!id) return null` — skip lines where the ID field (piece 1) is empty |
| **Preventive** | VistA RPCs often return informational lines mixed with data. Always check for empty/missing key fields |

---

## Phase 5D — Add Allergy (First Write / CRUD)

### BUG-015: XWB LIST param keys — bare identifiers vs. MUMPS quoted strings

| Field | Detail |
|-------|--------|
| **What we tried** | Sending LIST param keys as bare strings: `LPack("GMRAGNT")` |
| **Error** | `Undefined local variable: GMRAGNT` at `LINST+3^XWBPRS` |
| **Root cause** | `LINST^XWBPRS` uses MUMPS indirection: `S @XESSION@(key)=value`. If the key is `GMRAGNT` (no quotes), MUMPS tries to evaluate it as a variable. It needs to be `"GMRAGNT"` (with double-quotes) so it's treated as a string literal |
| **How we found it** | Read the full XWBPRS.m source (PRS5, LREAD, LINST routines) inside the Docker container |
| **Fix** | `const quotedKey = '"' + key + '"';` in `buildRpcMessageEx()` |
| **Preventive** | ALL XWB LIST parameter keys must be wrapped in MUMPS double-quotes. This is a protocol requirement, not optional |

### BUG-016: LIST param continuation bytes — extra "f" corrupting stream

| Field | Detail |
|-------|--------|
| **What we tried** | Appending `"t"` after every entry, then `"f"` at the end |
| **Error** | Stream corruption — VistA parsed the wrong bytes as the next parameter's type |
| **Root cause** | XWB PRS5 reads one continuation byte after each key-value pair. `"t"` = more entries coming, `"f"` = this is the last entry (end of this parameter). Original code sent `...key+val+"t"+key+val+"t"+"f"` — the extra `"f"` was consumed as part of the next `LPack` length read, corrupting everything after |
| **How we found it** | Read `PRS5^XWBPRS` which has `I CONESSION="t"` (continue loop) vs. `"f"` (stop reading entries) |
| **Fix** | Last entry uses `"f"` directly; all prior entries use `"t"`: `msg += idx < entries.length - 1 ? "t" : "f"` |
| **Preventive** | The continuation byte is read AFTER each LPack pair, not at the end. Never add an extra terminator |

### BUG-017: GVUNDEF — missing GMRAORDT field

| Field | Detail |
|-------|--------|
| **What we tried** | Sending 5 of the 6 required OREDITED fields (omitted GMRAORDT) |
| **Error** | `Global variable undefined: ^TMP("GMRA",$J,"GMRAORDT")` at `UPDATE+19^GMRAGUI1` |
| **Root cause** | `UPDATE^GMRAGUI1` iterates over 6 fields in a `FOR` loop using `@GMRARRAY@(fieldname)` WITHOUT `$G()` protection: `F SUB="GMRAGNT;.02","GMRATYPE;3.1","GMRANATR;17","GMRAORIG;5","GMRAORDT;4","GMRAOBHX;6"`. If ANY field is missing, it crashes with GVUNDEF |
| **How we found it** | Read the MUMPS source: `sed -n '1,50p' /home/wv/r/GMRAGUI1.m` inside Docker. Also ran direct MUMPS test confirming the error reproduces |
| **Fix** | Added `"GMRAORDT": fmDate` where `fmDate` is FileMan format YYYMMDD.HHMMSS |
| **Preventive** | All 6 OREDITED fields are MANDATORY: GMRAGNT, GMRATYPE, GMRANATR, GMRAORIG, GMRAORDT, GMRAOBHX. Never omit any |

### BUG-018: GMRAGNT format — IEN^root vs. NAME^IEN;root

| Field | Detail |
|-------|--------|
| **What we tried** | `GMRAGNT = "49^GMRD(120.82,"` (IEN followed by file root) |
| **Error** | Allergy saved but the list showed IEN numbers (like `49`) instead of names (like `PENICILLIN`) |
| **Root cause** | `UPDATE^GMRAGUI1` splits GMRAGNT on `^`. Piece 1 goes into the `.02` field (REACTANT = display name). Piece 2 goes into the cross-reference source (IEN;root format using semicolon). We had the IEN in piece 1 |
| **How we found it** | Compared the zero-node of our new record vs. a known-good existing record: `W $G(^GMR(120.8,1,0))` showed `1^PEANUT OIL^106;GMRD(120.82,^...` — NAME in piece 2, IEN;root in piece 3 |
| **Fix** | `const gmragnt = matchEntry.name + "^" + matchEntry.ien + ";" + sourceGlobal;` |
| **Preventive** | GMRAGNT format is `NAME^IEN;file_root` — name first (displayed to users), then `IEN;root` (internal pointer). The semicolon between IEN and root is required |

### BUG-019: sourceGlobal trailing comma stripped incorrectly

| Field | Detail |
|-------|--------|
| **What we tried** | `.replace(/,$/, "")` to "clean up" the source global reference |
| **Error** | GMRAGNT had `GMRD(120.82` (no trailing comma) instead of `GMRD(120.82,` |
| **Root cause** | CPRS/VistA requires the trailing comma. It's part of the open-reference format used by FileMan/MUMPS: `^GMRD(120.82,IEN)` — the comma is the subscript delimiter |
| **Fix** | Removed the `.replace(/,$/, "")` — keep the trailing comma intact |
| **Preventive** | MUMPS global references always need their trailing comma. Never strip it. `GMRD(120.82,` means "file 120.82 with subscript to follow" |

### BUG-020: ALLERGY MATCH response parsing — header lines

| Field | Detail |
|-------|--------|
| **What we tried** | Taking the first line of ALLERGY MATCH response as the allergen |
| **Error** | First line is a header: `1^VA Allergies File^^^TOP^+` — empty source field |
| **Fix** | Skip lines where `source` (piece 3) is empty. These are category headers, not match entries |
| **Preventive** | Many VistA array-return RPCs include header/category lines. Always filter by checking that key fields are populated |

---

## Cross-Cutting Lessons

### Lesson 1: VistA XWB Protocol Is Byte-Exact

The XWB protocol has ZERO tolerance for:
- Missing framing bytes (`\x01`, `1`, `\x04`)
- Wrong parameter type codes (`0` = literal, `2` = list, `4` = no params)
- Missing continuation bytes (`t`/`f`)
- Unquoted string keys in LIST params

**Always use `VISTA_DEBUG=true`** to see hex dumps. Compare them character by character against known-working implementations.

### Lesson 2: VistA MUMPS Code Has Minimal Error Handling

Many VistA routines (especially older ones like `GMRAGUI1`) access variables
and globals WITHOUT `$G()` protective wrappers. This means:
- Missing fields cause **hard crashes** (GVUNDEF, LVUNDEF)
- There's no helpful error message — just a MUMPS error and stack trace
- You must provide ALL expected fields in EXACTLY the expected format

### Lesson 3: Always Read the MUMPS Source

When an RPC doesn't work, don't guess. Read the actual MUMPS routine:
```bash
docker exec wv bash -c "cat /home/wv/r/ROUTINENAME.m"
docker exec wv bash -c "sed -n '10,30p' /home/wv/r/ROUTINENAME.m"
```
The source is the authoritative reference. Documentation may be outdated.

### Lesson 4: FileMan Dates Are Not Standard

- Format: `YYYMMDD.HHMMSS`
- `YYY = year - 1700` (so 2026 = `326`, 1955 = `255`)
- Must be calculated, not hardcoded
- Used by: DOB, GMRAORDT, event dates, everywhere in VistA

### Lesson 5: Test With Direct MUMPS Before the API

When debugging complex RPCs, write a temporary `.sh` script that calls
MUMPS directly. This isolates whether the problem is in your TypeScript
encoding or in the MUMPS routine itself:
```bash
su - wv -c 'mumps -r %XCMD '"'"'<MUMPS code here>'"'"'
```
If the direct MUMPS test works but the API doesn't, the bug is in your
XWB encoding. If it fails in MUMPS too, the bug is in your RPC parameters.

### Lesson 6: PowerShell Escaping Is a Minefield

Running MUMPS commands from PowerShell through Docker through bash through
`su` through MUMPS requires 4+ layers of escaping. Prefer:
1. Write a `.sh` script with MUMPS code
2. `docker cp` it into the container
3. `docker exec wv bash /tmp/script.sh`

This avoids PowerShell `$`, backtick, and quote escaping nightmares.

### Lesson 7: VistA Duplicate Detection Is a Feature

`ORWDAL32 SAVE ALLERGY` returns `-1^Patient already has a NAME reaction
entered.  No duplicates allowed.` when you try to add an existing allergy.
This is correct behavior — our API returns it as `ok: false` with the
VistA error message.

### Lesson 8: CPRS Is Your Reference Implementation

When in doubt about how an RPC should be called, look at how CPRS does it.
The MUMPS source in `ORWDAL32.m`, `GMRAGUI1.m`, etc. always matches what
CPRS sends. If your code disagrees with CPRS, your code is wrong.

---

## Quick Reference: Error → Fix Lookup

| Error Message / Symptom | Bug # | One-Line Fix |
|---|---|---|
| "608 Job ended" / silent disconnect | BUG-006 | Add `\x01` + `1` after `11302` prefix |
| DUZ=0 after XUS AV CODE | BUG-007 | Use real cipher pads from XUSRB1.m |
| Context creation fails for "OR CPRS GUI CHART" | BUG-008 | Translate spaces in cipher, don't skip |
| Intermittent auth failures (~5%) | BUG-009 | Ensure IDIX ≠ ASSOCIX |
| "Missing VistA credentials" | BUG-010 | Load `.env.local` via `--env-file` flag |
| "Undefined local variable: GMRAGNT" | BUG-015 | Quote LIST keys: `'"GMRAGNT"'` |
| Stream corruption / wrong param parsed | BUG-016 | Last entry `"f"`, prior entries `"t"` |
| "Global variable undefined: ^TMP(GMRA..." | BUG-017 | Include all 6 OREDITED fields |
| Allergy shows IEN instead of name | BUG-018 | GMRAGNT = `NAME^IEN;root` not `IEN^root` |
| MUMPS reference missing trailing comma | BUG-019 | Keep `GMRD(120.82,` — don't strip comma |
| First match is a header, not an allergy | BUG-020 | Skip lines where source (piece 3) is empty |
