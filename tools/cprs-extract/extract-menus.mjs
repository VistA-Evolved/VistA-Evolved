/**
 * extract-menus.mjs -- Extract menu labels/items from Delphi forms.
 *
 * Sources:
 *   - fFrame.dfm: mnuFrame TMainMenu and all nested TMenuItem objects
 *   - *.dfm: all TPopupMenu, TMainMenu, TMenuItem instances
 *
 * Output: design/contracts/cprs/v1/menus.json
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { globDfmFiles, CPRS_CHART_DIR, OUTPUT_DIR } from './lib/paths.mjs';

/**
 * Parse a DFM file and extract all menu structures.
 * Returns an array of menu trees.
 */
function parseMenusFromDfm(src, relPath) {
  const menus = [];

  // Find TMainMenu and TPopupMenu objects
  const menuRe = /object\s+(\w+)\s*:\s*T(MainMenu|PopupMenu)/g;
  let mm;
  while ((mm = menuRe.exec(src)) !== null) {
    const menuName = mm[1];
    const menuType = `T${mm[2]}`;
    const startIdx = mm.index;

    // Parse menu items hierarchically
    const items = parseMenuItems(src, startIdx);

    menus.push({
      file: relPath,
      name: menuName,
      type: menuType,
      items,
    });
  }

  return menus;
}

/**
 * Parse TMenuItem objects within a menu block.
 * Handles nested sub-menus.
 */
function parseMenuItems(src, startOffset) {
  const items = [];
  // Find all TMenuItem objects after the menu declaration
  const block = src.slice(startOffset);

  // We look for 'object <name>: TMenuItem' patterns and track indentation
  // to determine hierarchy. Simple approach: collect all items linearly
  // then use indentation to build tree.
  const itemRe = /^(\s*)object\s+(\w+)\s*:\s*TMenuItem/gm;
  const captionRe = /Caption\s*=\s*'([^']*(?:''[^']*)*)'/;
  const shortcutRe = /ShortCut\s*=\s*(\d+)/;
  const tagRe = /Tag\s*=\s*(\d+)/;
  const onClickRe = /OnClick\s*=\s*(\w+)/;
  const visibleRe = /Visible\s*=\s*(True|False)/;
  const enabledRe = /Enabled\s*=\s*(True|False)/;

  let m;
  // We stop when we hit the 'end' that closes the menu object itself
  // For simplicity, we'll parse all TMenuItems in the block up to the next
  // non-menu object or the end of a major block

  // Find the extent of this menu block
  const endRe = /^\s{2}end\b/gm;
  let blockEnd = block.length;

  // Find items
  const lineItems = [];
  while ((m = itemRe.exec(block)) !== null) {
    const indent = m[1].length;
    const name = m[2];
    // Extract properties from the next few lines until 'end'
    const afterItem = block.slice(m.index, m.index + 800);
    const endMatch = afterItem.match(/\n\s{2,}end\b/);
    const itemBlock = endMatch ? afterItem.slice(0, endMatch.index) : afterItem;

    const captionMatch = itemBlock.match(captionRe);
    const shortcutMatch = itemBlock.match(shortcutRe);
    const tagMatch = itemBlock.match(tagRe);
    const onClickMatch = itemBlock.match(onClickRe);
    const visibleMatch = itemBlock.match(visibleRe);
    const enabledMatch = itemBlock.match(enabledRe);

    const caption = captionMatch
      ? captionMatch[1]
          .replace(/''/g, "'")
          .replace(/#(\d+)/g, (_, code) => String.fromCharCode(parseInt(code)))
      : '';

    lineItems.push({
      name,
      caption: caption || name,
      isSeparator: caption === '-',
      shortcut: shortcutMatch ? decodeShortcut(parseInt(shortcutMatch[1])) : null,
      tag: tagMatch ? parseInt(tagMatch[1]) : null,
      onClick: onClickMatch ? onClickMatch[1] : null,
      visible: visibleMatch ? visibleMatch[1] === 'True' : true,
      enabled: enabledMatch ? enabledMatch[1] === 'True' : true,
      indent,
      children: [],
    });
  }

  // Build hierarchy from indentation
  return buildMenuTree(lineItems);
}

/**
 * Build a tree from flat indented menu items.
 */
function buildMenuTree(items) {
  if (items.length === 0) return [];

  const root = [];
  const stack = [{ indent: -1, children: root }];

  for (const item of items) {
    // Pop stack until we find a parent with less indent
    while (stack.length > 1 && stack[stack.length - 1].indent >= item.indent) {
      stack.pop();
    }

    const node = {
      name: item.name,
      caption: item.caption,
      isSeparator: item.isSeparator,
      shortcut: item.shortcut,
      tag: item.tag,
      onClick: item.onClick,
      visible: item.visible,
      enabled: item.enabled,
      children: [],
    };

    stack[stack.length - 1].children.push(node);
    stack.push({ indent: item.indent, children: node.children });
  }

  return root;
}

/**
 * Decode a Delphi VK shortcut integer to a human-readable string.
 */
function decodeShortcut(value) {
  if (!value) return null;
  const parts = [];
  if (value & 0x2000) parts.push('Ctrl');
  if (value & 0x4000) parts.push('Shift');
  if (value & 0x8000) parts.push('Alt');
  const key = value & 0xff;
  // Map common VK codes
  if (key >= 65 && key <= 90) parts.push(String.fromCharCode(key));
  else if (key >= 112 && key <= 123) parts.push(`F${key - 111}`);
  else if (key >= 48 && key <= 57) parts.push(String.fromCharCode(key));
  else parts.push(`VK_${key}`);
  return parts.join('+');
}

export async function extractMenus() {
  const dfmFiles = await globDfmFiles();
  const allMenus = [];

  for (const filePath of dfmFiles) {
    const src = await readFile(filePath, 'latin1');
    const relPath = filePath.replace(/\\/g, '/').split('CPRS-Chart/')[1] || filePath;
    const menus = parseMenusFromDfm(src, relPath);
    allMenus.push(...menus);
  }

  // Separate main menus from popup menus
  const mainMenus = allMenus.filter((m) => m.type === 'TMainMenu');
  const popupMenus = allMenus.filter((m) => m.type === 'TPopupMenu');

  // Count total items
  function countItems(items) {
    let count = 0;
    for (const item of items) {
      count++;
      if (item.children) count += countItems(item.children);
    }
    return count;
  }

  const result = {
    _meta: {
      source: 'reference/cprs/Packages/Order Entry Results Reporting/CPRS/CPRS-Chart/',
      extractedAt: new Date().toISOString(),
      description: 'CPRS menu structures extracted from Delphi .dfm files',
    },
    mainMenus,
    popupMenus,
    summary: {
      mainMenuCount: mainMenus.length,
      popupMenuCount: popupMenus.length,
      totalMenuItemCount: allMenus.reduce((sum, m) => sum + countItems(m.items), 0),
    },
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(join(OUTPUT_DIR, 'menus.json'), JSON.stringify(result, null, 2));
  console.log(
    `  ✓ menus.json -- ${result.summary.mainMenuCount} main menus, ${result.summary.popupMenuCount} popup menus, ${result.summary.totalMenuItemCount} total items`
  );
  return result;
}

if (
  import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('extract-menus.mjs')
) {
  extractMenus().catch(console.error);
}
