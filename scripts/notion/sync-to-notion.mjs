#!/usr/bin/env node

/**
 * Notion Documentation Sync Script
 *
 * Pushes VistA Evolved documentation to a Notion workspace.
 * Requires: NOTION_TOKEN and NOTION_ROOT_PAGE_ID environment variables.
 *
 * Usage:
 *   node scripts/notion/sync-to-notion.mjs
 *   node scripts/notion/sync-to-notion.mjs --dry-run
 *   node scripts/notion/sync-to-notion.mjs --section architecture
 */

import { readFileSync, readdirSync, statSync, mkdirSync, appendFileSync } from 'fs';
import { join, basename, extname, relative } from 'path';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const ROOT_PAGE_ID = process.env.NOTION_ROOT_PAGE_ID;
const DRY_RUN = process.argv.includes('--dry-run');
const SECTION_FILTER = process.argv.find(a => a.startsWith('--section='))?.split('=')[1] ?? null;

const API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const RATE_LIMIT_MS = 350;

const DOCS_ROOT = join(process.cwd(), 'docs');
const LOG_PATH = join(process.cwd(), 'artifacts', 'notion-sync.log');

const DOC_SECTIONS = [
  { dir: 'architecture', notionTitle: 'Architecture' },
  { dir: 'audits', notionTitle: 'Audit Reports' },
  { dir: 'runbooks', notionTitle: 'Runbook Catalog' },
  { dir: 'decisions', notionTitle: 'Decision Log' },
  { dir: 'security', notionTitle: 'Security' },
  { dir: 'vista', notionTitle: 'VistA Reference' },
  { dir: 'analytics', notionTitle: 'Analytics' },
];

function logSync(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    mkdirSync(join(process.cwd(), 'artifacts'), { recursive: true });
    appendFileSync(LOG_PATH, line + '\n');
  } catch { /* ignore */ }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function notionRequest(path, method = 'GET', body = undefined) {
  if (!NOTION_TOKEN) throw new Error('NOTION_TOKEN not set');

  const headers = {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API ${res.status}: ${text}`);
  }

  await sleep(RATE_LIMIT_MS);
  return res.json();
}

function markdownToNotionBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      blocks.push({
        type: 'heading_1',
        heading_1: { rich_text: [{ text: { content: line.slice(2).trim() } }] },
      });
    } else if (line.startsWith('## ')) {
      blocks.push({
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: line.slice(3).trim() } }] },
      });
    } else if (line.startsWith('### ')) {
      blocks.push({
        type: 'heading_3',
        heading_3: { rich_text: [{ text: { content: line.slice(4).trim() } }] },
      });
    } else if (line.startsWith('```')) {
      blocks.push({
        type: 'code',
        code: {
          rich_text: [{ text: { content: line } }],
          language: 'plain text',
        },
      });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ text: { content: line.slice(2).trim() } }] },
      });
    } else if (/^\d+\.\s/.test(line)) {
      blocks.push({
        type: 'numbered_list_item',
        numbered_list_item: { rich_text: [{ text: { content: line.replace(/^\d+\.\s/, '').trim() } }] },
      });
    } else if (line.startsWith('> ')) {
      blocks.push({
        type: 'quote',
        quote: { rich_text: [{ text: { content: line.slice(2).trim() } }] },
      });
    } else if (line.startsWith('---')) {
      blocks.push({ type: 'divider', divider: {} });
    } else if (line.trim()) {
      blocks.push({
        type: 'paragraph',
        paragraph: { rich_text: [{ text: { content: line } }] },
      });
    }
  }

  // Notion API limits to 100 blocks per request
  return blocks.slice(0, 100);
}

function collectMarkdownFiles(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isFile() && extname(entry) === '.md') {
        files.push(full);
      }
    }
  } catch { /* dir doesn't exist */ }
  return files;
}

async function createPage(parentId, title, blocks) {
  return notionRequest('/pages', 'POST', {
    parent: { page_id: parentId },
    properties: {
      title: { title: [{ text: { content: title } }] },
    },
    children: blocks,
  });
}

async function createSectionPage(parentId, title) {
  return notionRequest('/pages', 'POST', {
    parent: { page_id: parentId },
    properties: {
      title: { title: [{ text: { content: title } }] },
    },
    children: [
      {
        type: 'callout',
        callout: {
          rich_text: [{ text: { content: `Auto-synced from VistA Evolved repository docs/${title.toLowerCase()}/` } }],
          icon: { emoji: '🔄' },
        },
      },
    ],
  });
}

async function syncTopLevelDocs(rootId) {
  const topDocs = ['ARCHITECTURE.md', 'ONBOARDING.md', 'POLICY.md'];

  for (const docName of topDocs) {
    const path = join(DOCS_ROOT, docName);
    try {
      const content = readFileSync(path, 'utf-8');
      const blocks = markdownToNotionBlocks(content);
      const title = basename(docName, '.md');

      if (DRY_RUN) {
        logSync(`[DRY-RUN] Would create page: ${title} (${blocks.length} blocks)`);
      } else {
        await createPage(rootId, title, blocks);
        logSync(`Created page: ${title}`);
      }
    } catch (e) {
      logSync(`Skipping ${docName}: ${e.message}`);
    }
  }
}

async function syncSection(rootId, section) {
  const dir = join(DOCS_ROOT, section.dir);
  const files = collectMarkdownFiles(dir);

  if (files.length === 0) {
    logSync(`No markdown files in ${section.dir}/`);
    return;
  }

  let sectionPageId = rootId;
  if (!DRY_RUN) {
    const sectionPage = await createSectionPage(rootId, section.notionTitle);
    sectionPageId = sectionPage.id;
    logSync(`Created section: ${section.notionTitle}`);
  } else {
    logSync(`[DRY-RUN] Would create section: ${section.notionTitle}`);
  }

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const blocks = markdownToNotionBlocks(content);
    const title = basename(file, '.md');
    const relPath = relative(process.cwd(), file);

    if (DRY_RUN) {
      logSync(`[DRY-RUN] Would create: ${section.notionTitle}/${title} (${blocks.length} blocks) [${relPath}]`);
    } else {
      try {
        await createPage(sectionPageId, title, blocks);
        logSync(`Created: ${section.notionTitle}/${title}`);
      } catch (e) {
        logSync(`Failed: ${section.notionTitle}/${title}: ${e.message}`);
      }
    }
  }
}

async function syncPhaseIndex(rootId) {
  const indexPath = join(process.cwd(), 'docs', 'qa', 'phase-index.json');
  try {
    let raw = readFileSync(indexPath, 'utf-8');
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const index = JSON.parse(raw);
    const phases = index.phases ?? [];

    logSync(`Phase index: ${phases.length} phases found`);

    if (DRY_RUN) {
      logSync(`[DRY-RUN] Would create Phase Tracking page with ${phases.length} phases`);
      return;
    }

    const blocks = [
      {
        type: 'callout',
        callout: {
          rich_text: [{ text: { content: `Auto-synced from docs/qa/phase-index.json (${phases.length} phases)` } }],
          icon: { emoji: '📋' },
        },
      },
    ];

    for (const phase of phases.slice(0, 95)) {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{
            text: {
              content: `Phase ${phase.phase}: ${phase.title ?? phase.folder ?? 'untitled'} [${phase.status ?? 'unknown'}]`,
            },
          }],
        },
      });
    }

    await createPage(rootId, 'Phase Tracking', blocks);
    logSync('Created Phase Tracking page');
  } catch (e) {
    logSync(`Phase index sync failed: ${e.message}`);
  }
}

async function syncCapabilities(rootId) {
  const capPath = join(process.cwd(), 'config', 'capabilities.json');
  try {
    let raw = readFileSync(capPath, 'utf-8');
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const caps = JSON.parse(raw);
    const capsObj = caps.capabilities ?? {};
    const items = Object.entries(capsObj).map(([id, val]) => ({ id, ...val }));

    logSync(`Capabilities: ${items.length} capabilities found`);

    if (DRY_RUN) {
      logSync(`[DRY-RUN] Would create Feature Status page with ${items.length} capabilities`);
      return;
    }

    const blocks = [
      {
        type: 'callout',
        callout: {
          rich_text: [{ text: { content: `Auto-synced from config/capabilities.json (${items.length} capabilities)` } }],
          icon: { emoji: '⚙️' },
        },
      },
    ];

    for (const cap of items.slice(0, 95)) {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{
            text: {
              content: `${cap.id}: ${cap.name ?? cap.description ?? ''} [${cap.status ?? 'unknown'}]`,
            },
          }],
        },
      });
    }

    await createPage(rootId, 'Feature Status', blocks);
    logSync('Created Feature Status page');
  } catch (e) {
    logSync(`Capabilities sync failed: ${e.message}`);
  }
}

async function main() {
  logSync('=== Notion Sync Started ===');
  logSync(`Dry run: ${DRY_RUN}`);
  logSync(`Section filter: ${SECTION_FILTER ?? 'all'}`);

  if (!NOTION_TOKEN || !ROOT_PAGE_ID) {
    logSync('ERROR: NOTION_TOKEN and NOTION_ROOT_PAGE_ID must be set.');
    logSync('See docs/runbooks/notion-mcp-integration.md for setup instructions.');

    if (DRY_RUN) {
      logSync('Continuing in dry-run mode to show what would be synced...');
    } else {
      process.exit(1);
    }
  }

  const sections = SECTION_FILTER
    ? DOC_SECTIONS.filter(s => s.dir === SECTION_FILTER)
    : DOC_SECTIONS;

  if (!SECTION_FILTER) {
    await syncTopLevelDocs(ROOT_PAGE_ID);
    await syncPhaseIndex(ROOT_PAGE_ID);
    await syncCapabilities(ROOT_PAGE_ID);
  }

  for (const section of sections) {
    await syncSection(ROOT_PAGE_ID, section);
  }

  logSync('=== Notion Sync Complete ===');
}

main().catch(e => {
  logSync(`FATAL: ${e.message}`);
  process.exit(1);
});
