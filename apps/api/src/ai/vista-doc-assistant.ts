/**
 * VistA Documentation Assistant (Phase VII)
 *
 * Indexes all 157 module README.md files and the RPC catalog to provide
 * an in-app help assistant that answers questions about VistA packages,
 * RPCs, FileMan files, menu options, and API endpoints.
 *
 * Uses keyword-based retrieval (BM25-style scoring) over the document
 * corpus. When an external LLM is configured, results can be passed
 * through the AI Gateway for natural language synthesis.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface DocChunk {
  packagePrefix: string;
  packageName: string;
  section: string;
  content: string;
  score?: number;
}

export interface DocSearchResult {
  query: string;
  results: DocChunk[];
  totalChunks: number;
  packagesSearched: number;
}

interface IndexEntry {
  packagePrefix: string;
  packageName: string;
  section: string;
  content: string;
  tokens: string[];
}

let index: IndexEntry[] = [];
let initialized = false;

export function initDocAssistant(rootDir: string): void {
  if (initialized) return;

  const modulesDir = join(rootDir, 'docs', 'modules');
  if (!existsSync(modulesDir)) return;

  const dirs = readdirSync(modulesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const ns of dirs) {
    const readmePath = join(modulesDir, ns, 'README.md');
    if (!existsSync(readmePath)) continue;

    const content = readFileSync(readmePath, 'utf-8');
    const pkgName = extractPackageName(content, ns);
    const sections = splitIntoSections(content);

    for (const section of sections) {
      index.push({
        packagePrefix: ns.toUpperCase(),
        packageName: pkgName,
        section: section.heading,
        content: section.body,
        tokens: tokenize(section.heading + ' ' + section.body + ' ' + ns + ' ' + pkgName),
      });
    }
  }

  // Also index the RPC catalog
  const rpcCatalogPath = join(rootDir, 'data', 'vista', 'rpcs', 'rpc-catalog.json');
  if (existsSync(rpcCatalogPath)) {
    try {
      const catalog = JSON.parse(readFileSync(rpcCatalogPath, 'utf-8'));
      const rpcs = catalog.rpcs || [];
      for (const rpc of rpcs) {
        index.push({
          packagePrefix: (rpc.namespace || '').toUpperCase(),
          packageName: rpc.name,
          section: 'RPC Catalog Entry',
          content: `RPC: ${rpc.name}\nTag: ${rpc.tag || 'N/A'}\nRoutine: ${rpc.routine || 'N/A'}\nReturn Type: ${rpc.returnType || 'N/A'}\nParams: ${rpc.paramCount || 0}\n${rpc.description || ''}`,
          tokens: tokenize(rpc.name + ' ' + (rpc.tag || '') + ' ' + (rpc.routine || '') + ' ' + (rpc.description || '')),
        });
      }
    } catch { /* skip if invalid */ }
  }

  initialized = true;
  // Log count is intentional at init time for diagnostics; kept minimal
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    process.stdout.write(`[DocAssistant] Indexed ${index.length} chunks from ${dirs.length} modules\n`);
  }
}

export function searchDocs(query: string, limit = 10): DocSearchResult {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return { query, results: [], totalChunks: index.length, packagesSearched: 0 };
  }

  const scored = index.map(entry => {
    let score = 0;
    for (const qt of queryTokens) {
      for (const et of entry.tokens) {
        if (et === qt) score += 3;
        else if (et.includes(qt)) score += 1;
        else if (qt.includes(et) && et.length > 2) score += 0.5;
      }
      if (entry.packagePrefix.toLowerCase() === qt) score += 5;
      if (entry.packageName.toLowerCase().includes(qt)) score += 2;
    }
    return { ...entry, score };
  }).filter(e => e.score > 0);

  scored.sort((a, b) => b.score - a.score);

  const results = scored.slice(0, limit).map(e => ({
    packagePrefix: e.packagePrefix,
    packageName: e.packageName,
    section: e.section,
    content: truncate(e.content, 500),
    score: Math.round(e.score * 100) / 100,
  }));

  const packages = new Set(scored.map(s => s.packagePrefix));

  return {
    query,
    results,
    totalChunks: index.length,
    packagesSearched: packages.size,
  };
}

export function getPackageDoc(prefix: string): DocChunk[] {
  const upper = prefix.toUpperCase();
  return index
    .filter(e => e.packagePrefix === upper && e.section !== 'RPC Catalog Entry')
    .map(e => ({
      packagePrefix: e.packagePrefix,
      packageName: e.packageName,
      section: e.section,
      content: e.content,
    }));
}

export function getDocStats() {
  const packages = new Set(index.map(e => e.packagePrefix));
  const rpcEntries = index.filter(e => e.section === 'RPC Catalog Entry').length;
  return {
    totalChunks: index.length,
    totalPackages: packages.size,
    rpcEntries,
    docSections: index.length - rpcEntries,
    initialized,
  };
}

function extractPackageName(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+?)(?:\s*\(|$)/m);
  if (match) return match[1].trim();
  return fallback.toUpperCase();
}

function splitIntoSections(md: string): { heading: string; body: string }[] {
  const sections: { heading: string; body: string }[] = [];
  const lines = md.split('\n');
  let currentHeading = 'Overview';
  let currentBody: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      if (currentBody.length > 0) {
        sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() });
      }
      currentHeading = headingMatch[1].trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  if (currentBody.length > 0) {
    sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() });
  }

  return sections;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}
