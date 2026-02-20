#!/usr/bin/env node
/**
 * Phase 55 -- Extract RPC names from Delphi CPRS source
 *
 * Scans reference/cprs/ .pas files for broker call patterns:
 *   sCallV('RPC_NAME', ...)
 *   CallV('RPC_NAME', ...)
 *   tCallV('RPC_NAME', ...)
 *   RPCBrokerV.RemoteProcedure := 'RPC_NAME'
 *   Broker.RemoteProcedure := 'RPC_NAME'
 *
 * Output: /artifacts/cprs/delphi-rpcs.json
 *
 * Usage: npx tsx scripts/cprs/extractDelphiRpcs.ts
 */

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, relative, extname, basename } from "path";

const ROOT = process.cwd();
const DELPHI_ROOT = join(ROOT, "reference", "cprs");
const OUT_DIR = join(ROOT, "artifacts", "cprs");

interface RpcRef {
  rpcName: string;
  sourceFile: string;
  line: number;
  pattern: string; // which regex matched
}

interface RpcSummary {
  name: string;
  refCount: number;
  files: string[];
}

const SKIP_DIRS = new Set([".git", "node_modules", "dcu", "__history"]);

function collectPasFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    try {
      const stat = statSync(full);
      if (stat.isDirectory()) {
        results.push(...collectPasFiles(full));
      } else if (stat.isFile() && extname(entry).toLowerCase() === ".pas") {
        results.push(full);
      }
    } catch {
      // skip permission errors
    }
  }
  return results;
}

// Patterns that extract RPC names from Delphi source
const RPC_PATTERNS: { re: RegExp; name: string }[] = [
  // sCallV('RPC NAME', [...])  / CallV / tCallV
  { re: /(?:sCallV|CallV|tCallV)\s*\(\s*'([^']+)'/gi, name: "sCallV" },
  // RPCBrokerV.RemoteProcedure := 'RPC NAME'
  { re: /RemoteProcedure\s*:=\s*'([^']+)'/gi, name: "RemoteProcedure" },
  // SetParams('RPC NAME', ...) -- some variants
  { re: /SetParams\s*\(\s*'([^']+)'/gi, name: "SetParams" },
  // Broker.Param[0].Value := 'RPC NAME' after RemoteProcedure -- handled by RemoteProcedure pattern
  // String constants like PARAM_RPC = 'RPC NAME'
  { re: /=\s*'(OR[A-Z][A-Z0-9 ]{3,50})'/g, name: "ORConstant" },
  { re: /=\s*'(TIU [A-Z0-9 ]{3,50})'/g, name: "TIUConstant" },
  { re: /=\s*'(GMV [A-Z0-9 ]{3,50})'/g, name: "GMVConstant" },
  { re: /=\s*'(XUS [A-Z0-9 ]{3,50})'/g, name: "XUSConstant" },
  { re: /=\s*'(XWB [A-Z0-9 ]{3,50})'/g, name: "XWBConstant" },
  { re: /=\s*'(MAG[A-Z0-9]? [A-Z0-9 ]{3,50})'/g, name: "MAGConstant" },
  { re: /=\s*'(GMRA[A-Z0-9 ]{3,50})'/g, name: "GMRAConstant" },
];

// Filter out things that clearly aren't RPC names
function isLikelyRpc(name: string): boolean {
  if (name.length < 4 || name.length > 60) return false;
  // Must contain a space (all VistA RPCs have spaces)
  if (!name.includes(" ")) return false;
  // Must start with an alpha char
  if (!/^[A-Z]/i.test(name)) return false;
  // Filter out common false positives
  if (/^(or |and |not |the |for |set |get )/i.test(name)) return false;
  return true;
}

function main() {
  if (!existsSync(DELPHI_ROOT)) {
    console.log("WARNING: reference/cprs/ not found -- generating empty extraction");
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(
      join(OUT_DIR, "delphi-rpcs.json"),
      JSON.stringify({ _meta: { source: "reference/cprs/", status: "directory-not-found" }, rpcs: [], refs: [] }, null, 2),
    );
    console.log("Output: artifacts/cprs/delphi-rpcs.json (empty)");
    return;
  }

  console.log("Scanning Delphi .pas files...");
  const files = collectPasFiles(DELPHI_ROOT);
  console.log(`  Found ${files.length} .pas files`);

  const allRefs: RpcRef[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      // binary or encoding issue
      try {
        content = readFileSync(file, "latin1");
      } catch {
        continue;
      }
    }

    const rel = relative(DELPHI_ROOT, file).replace(/\\/g, "/");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      for (const pat of RPC_PATTERNS) {
        pat.re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pat.re.exec(lines[i])) !== null) {
          const rpcName = m[1].trim();
          if (isLikelyRpc(rpcName)) {
            allRefs.push({
              rpcName: rpcName.toUpperCase(),
              sourceFile: rel,
              line: i + 1,
              pattern: pat.name,
            });
          }
        }
      }
    }
  }

  // Deduplicate and summarize
  const rpcMap = new Map<string, { files: Set<string>; count: number }>();
  for (const ref of allRefs) {
    if (!rpcMap.has(ref.rpcName)) {
      rpcMap.set(ref.rpcName, { files: new Set(), count: 0 });
    }
    const entry = rpcMap.get(ref.rpcName)!;
    entry.files.add(ref.sourceFile);
    entry.count++;
  }

  const rpcs: RpcSummary[] = [...rpcMap.entries()]
    .map(([name, data]) => ({
      name,
      refCount: data.count,
      files: [...data.files].sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  mkdirSync(OUT_DIR, { recursive: true });

  const output = {
    _meta: {
      source: "reference/cprs/",
      extractedAt: new Date().toISOString(),
      pasFilesScanned: files.length,
      totalReferences: allRefs.length,
      uniqueRpcs: rpcs.length,
    },
    rpcs,
    refs: allRefs,
  };

  writeFileSync(join(OUT_DIR, "delphi-rpcs.json"), JSON.stringify(output, null, 2));
  console.log(`\nExtracted ${rpcs.length} unique RPCs from ${allRefs.length} references`);
  console.log(`Output: artifacts/cprs/delphi-rpcs.json`);
}

main();
