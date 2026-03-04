/**
 * extract-forms.mjs — Enumerate .dfm files and extract form caption/title.
 *
 * Sources:
 *   - All .dfm files under CPRS-Chart
 *   - First line declares the form: 'object <name>: <type>' or 'inherited <name>: <type>'
 *   - Caption property (if present) provides the window/form title
 *
 * Output: design/contracts/cprs/v1/forms.json
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, basename, dirname } from 'node:path';
import { globDfmFiles, CPRS_CHART_DIR, OUTPUT_DIR } from './lib/paths.mjs';

/**
 * Parse a single .dfm file to extract form-level metadata.
 */
function parseFormFromDfm(src, relPath) {
  // First non-blank line: `object frmFrame: TfrmFrame` or `inherited frmFrame: TfrmFrame`
  const headerRe = /^(object|inherited)\s+(\w+)\s*:\s*(\w+)/m;
  const headerMatch = src.match(headerRe);
  if (!headerMatch) return null;

  const declaration = headerMatch[1]; // 'object' or 'inherited'
  const formName = headerMatch[2];
  const formClass = headerMatch[3];

  // Find the form-level Caption (not deeply nested child captions)
  // We look for Caption near the top of the file before any child 'object'
  let caption = null;
  const lines = src.split('\n');
  let insideTopLevel = true;
  let depth = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('object ') || trimmed.startsWith('inherited ')) {
      if (depth === 0 && !trimmed.startsWith(declaration)) {
        // First child object — stop looking for top-level properties
        break;
      }
      if (depth > 0) break; // encountered nested object
      depth++;
      continue;
    }
    const captionMatch = trimmed.match(/^Caption\s*=\s*'([^']*(?:''[^']*)*)'/);
    if (captionMatch) {
      caption = captionMatch[1].replace(/''/g, "'");
      break;
    }
  }

  // Count child objects (components on the form)
  const childRe = /\bobject\s+\w+\s*:\s*T\w+/g;
  let childCount = 0;
  let cm;
  while ((cm = childRe.exec(src)) !== null) childCount++;

  // Detect key component types
  const hasGrid = /TStringGrid|TDrawGrid|TDBGrid|TListView/.test(src);
  const hasTree = /TTreeView|TTreeNode|TORTreeView/.test(src);
  const hasMemo = /TMemo|TRichEdit/.test(src);
  const hasListBox = /TListBox|TORListBox|TCheckListBox/.test(src);
  const hasPageControl = /TPageControl|TTabControl/.test(src);

  return {
    file: relPath,
    formName,
    formClass,
    declaration,
    caption,
    childComponentCount: childCount,
    features: {
      hasGrid,
      hasTree,
      hasMemo,
      hasListBox,
      hasPageControl,
    },
  };
}

export async function extractForms() {
  const dfmFiles = await globDfmFiles();
  const forms = [];

  for (const filePath of dfmFiles) {
    const src = await readFile(filePath, 'latin1');
    const relPath = filePath.replace(/\\/g, '/').split('CPRS-Chart/')[1] || filePath;
    const form = parseFormFromDfm(src, relPath);
    if (form) forms.push(form);
  }

  // Group by subfolder
  const byFolder = {};
  for (const form of forms) {
    const folder = form.file.includes('/') ? form.file.split('/')[0] : '(root)';
    if (!byFolder[folder]) byFolder[folder] = [];
    byFolder[folder].push(form.formName);
  }

  const result = {
    _meta: {
      source: 'reference/cprs/Packages/Order Entry Results Reporting/CPRS/CPRS-Chart/',
      extractedAt: new Date().toISOString(),
      description: 'CPRS form inventory extracted from Delphi .dfm files',
    },
    forms,
    byFolder,
    summary: {
      totalForms: forms.length,
      withCaption: forms.filter((f) => f.caption).length,
      withoutCaption: forms.filter((f) => !f.caption).length,
      inheritedForms: forms.filter((f) => f.declaration === 'inherited').length,
      objectForms: forms.filter((f) => f.declaration === 'object').length,
      folderCount: Object.keys(byFolder).length,
    },
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(join(OUTPUT_DIR, 'forms.json'), JSON.stringify(result, null, 2));
  console.log(
    `  ✓ forms.json — ${result.summary.totalForms} forms (${result.summary.withCaption} with captions)`
  );
  return result;
}

if (
  import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('extract-forms.mjs')
) {
  extractForms().catch(console.error);
}
