#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const csv = readFileSync(join(ROOT, 'data', 'vista', 'Packages.csv'), 'utf-8');
const csvLines = csv.split('\n').slice(1).filter(l => l.trim());

const tiers = { 1: [], 2: [], 3: [], 4: [], 5: [] };
let totalRpcs = 0;

for (const line of csvLines) {
  const cols = line.split(',');
  const name = (cols[0] || '').replace(/"/g, '').trim();
  const prefix = (cols[1] || '').trim();
  const tier = parseInt(cols[2]) || 5;
  const rpcFile = join(ROOT, 'apps', 'api', 'src', 'routes', 'vista', prefix.toLowerCase() + '.ts');
  let rpcCount = 0;
  if (existsSync(rpcFile)) {
    const content = readFileSync(rpcFile, 'utf-8');
    rpcCount = (content.match(/safeCallRpc/g) || []).length;
  }
  totalRpcs += rpcCount;
  if (!tiers[tier]) tiers[tier] = [];
  tiers[tier].push({ name, prefix, tier, rpcCount });
}

const tierNames = {
  1: 'Core Clinical',
  2: 'Hospital Operations',
  3: 'Administrative',
  4: 'Infrastructure & Interop',
  5: 'Specialized & Extended',
};

// Build INDEX.md
const indexLines = [
  '# VistA-Evolved Module Documentation',
  '',
  `> ${csvLines.length} packages | ${totalRpcs} RPC-wired routes | Generated from VA VistA Roll & Scroll + FileMan + RPC Catalog`,
  '',
];

for (const [tier, pkgs] of Object.entries(tiers)) {
  if (pkgs.length === 0) continue;
  indexLines.push(`## Tier ${tier}: ${tierNames[tier]} (${pkgs.length} packages)`, '');
  indexLines.push('| Prefix | Name | RPCs | Status |');
  indexLines.push('|--------|------|------|--------|');
  for (const p of pkgs.sort((a, b) => a.prefix.localeCompare(b.prefix))) {
    const status = p.rpcCount > 0 ? 'Live' : 'Terminal';
    indexLines.push(`| [${p.prefix}](./${p.prefix.toLowerCase()}/README.md) | ${p.name} | ${p.rpcCount} | ${status} |`);
  }
  indexLines.push('');
}

writeFileSync(join(ROOT, 'docs', 'modules', 'INDEX.md'), indexLines.join('\n'));
console.log('Wrote INDEX.md');

// Build the HTML documentation site
const allPkgs = Object.entries(tiers).flatMap(([tier, pkgs]) =>
  pkgs.map(p => ({ ...p, tier: parseInt(tier) }))
).sort((a, b) => a.prefix.localeCompare(b.prefix));

const pkgListHtml = Object.entries(tiers).map(([tier, pkgs]) => {
  if (pkgs.length === 0) return '';
  const items = pkgs.sort((a, b) => a.prefix.localeCompare(b.prefix)).map(p => {
    const badge = p.rpcCount > 0 ? `<span class="badge live">${p.rpcCount} RPCs</span>` : '<span class="badge terminal">Terminal</span>';
    return `<a href="#" class="pkg-link" data-ns="${p.prefix.toLowerCase()}" data-name="${p.name}" data-tier="${tier}">
      <span class="pkg-prefix">${p.prefix}</span>
      <span class="pkg-name">${p.name}</span>
      ${badge}
    </a>`;
  }).join('\n');
  return `<div class="tier-group">
    <h3 class="tier-header" data-tier="${tier}">Tier ${tier}: ${tierNames[tier]} <span class="tier-count">${pkgs.length}</span></h3>
    <div class="tier-packages">${items}</div>
  </div>`;
}).join('\n');

const tierStats = Object.entries(tiers).map(([t, p]) =>
  `<div class="stat"><span class="stat-num">${p.length}</span><span class="stat-label">Tier ${t}</span></div>`
).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VistA-Evolved Module Documentation</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
<style>
:root {
  --va-blue: #003f72;
  --va-blue-light: #0071bc;
  --va-white: #ffffff;
  --va-gray-light: #f1f1f1;
  --va-gray: #5b616b;
  --va-gold: #fdb81e;
  --va-green: #2e8540;
  --va-red: #e31c3d;
  --sidebar-w: 340px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--va-gray-light); color: #212121; }
header { background: var(--va-blue); color: white; padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1rem; position: fixed; top: 0; left: 0; right: 0; z-index: 100; height: 64px; }
header h1 { font-size: 1.3rem; font-weight: 700; white-space: nowrap; }
header .subtitle { font-size: 0.8rem; opacity: 0.8; }
.stats-bar { display: flex; gap: 1rem; margin-left: auto; }
.stat { text-align: center; padding: 0 0.5rem; }
.stat-num { font-size: 1.4rem; font-weight: 700; display: block; }
.stat-label { font-size: 0.65rem; opacity: 0.7; text-transform: uppercase; }
.layout { display: flex; margin-top: 64px; min-height: calc(100vh - 64px); }
.sidebar { width: var(--sidebar-w); background: white; border-right: 1px solid #ddd; overflow-y: auto; position: fixed; top: 64px; bottom: 0; left: 0; }
.search-box { padding: 0.75rem; border-bottom: 1px solid #ddd; position: sticky; top: 0; background: white; z-index: 10; }
.search-box input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem; }
.search-box input:focus { outline: 2px solid var(--va-blue-light); border-color: var(--va-blue-light); }
.tier-group { border-bottom: 1px solid #eee; }
.tier-header { padding: 0.6rem 0.75rem; background: var(--va-gray-light); font-size: 0.75rem; font-weight: 700; color: var(--va-gray); text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
.tier-count { background: var(--va-blue); color: white; border-radius: 10px; padding: 0.1rem 0.5rem; font-size: 0.7rem; }
.pkg-link { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; text-decoration: none; color: inherit; border-bottom: 1px solid #f5f5f5; transition: background 0.15s; }
.pkg-link:hover { background: #e8f0fe; }
.pkg-link.active { background: #d0e3f7; border-left: 3px solid var(--va-blue); }
.pkg-prefix { font-weight: 700; font-size: 0.8rem; color: var(--va-blue); min-width: 50px; }
.pkg-name { flex: 1; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge { font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 3px; white-space: nowrap; }
.badge.live { background: #d4edda; color: var(--va-green); }
.badge.terminal { background: #fff3cd; color: #856404; }
.main { margin-left: var(--sidebar-w); flex: 1; padding: 2rem; max-width: 900px; }
.main h1 { color: var(--va-blue); border-bottom: 2px solid var(--va-blue); padding-bottom: 0.5rem; margin-bottom: 1rem; }
.main h2 { color: var(--va-blue); margin-top: 1.5rem; margin-bottom: 0.75rem; }
.main h3 { color: #333; margin-top: 1rem; margin-bottom: 0.5rem; }
.main table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; }
.main th, .main td { border: 1px solid #ddd; padding: 0.4rem 0.6rem; text-align: left; font-size: 0.85rem; }
.main th { background: var(--va-gray-light); font-weight: 600; }
.main tr:nth-child(even) { background: #fafafa; }
.main code { background: #e8e8e8; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.85rem; }
.main pre { background: #263238; color: #eee; padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 0.75rem 0; }
.main pre code { background: none; color: inherit; }
.main hr { border: none; border-top: 1px solid #ddd; margin: 1rem 0; }
.main p { line-height: 1.6; margin-bottom: 0.75rem; }
.main ul, .main ol { margin-left: 1.5rem; margin-bottom: 0.75rem; }
.welcome { text-align: center; padding: 3rem 1rem; }
.welcome h2 { font-size: 2rem; color: var(--va-blue); margin-bottom: 1rem; }
.welcome p { color: var(--va-gray); font-size: 1.1rem; max-width: 600px; margin: 0 auto 1.5rem; }
.welcome .big-stat { display: flex; justify-content: center; gap: 2rem; margin: 2rem 0; }
.welcome .big-stat div { text-align: center; }
.welcome .big-stat .num { font-size: 2.5rem; font-weight: 700; color: var(--va-blue); display: block; }
.welcome .big-stat .lbl { font-size: 0.85rem; color: var(--va-gray); }
@media (max-width: 768px) {
  .sidebar { display: none; }
  .main { margin-left: 0; }
}
</style>
</head>
<body>
<header>
  <div>
    <h1>VistA-Evolved</h1>
    <div class="subtitle">Complete VistA Module Documentation</div>
  </div>
  <div class="stats-bar">
    <div class="stat"><span class="stat-num">${csvLines.length}</span><span class="stat-label">Packages</span></div>
    <div class="stat"><span class="stat-num">${totalRpcs}</span><span class="stat-label">RPC Routes</span></div>
    ${tierStats}
  </div>
</header>
<div class="layout">
  <aside class="sidebar">
    <div class="search-box"><input type="text" id="search" placeholder="Search packages..." autocomplete="off" /></div>
    <div id="pkg-list">${pkgListHtml}</div>
  </aside>
  <main class="main" id="content">
    <div class="welcome">
      <h2>VistA Module Documentation</h2>
      <p>Complete reference for all ${csvLines.length} VistA packages. Generated from VA Roll &amp; Scroll documentation, FileMan data dictionary, and RPC catalog (File #8994).</p>
      <div class="big-stat">
        <div><span class="num">${csvLines.length}</span><span class="lbl">Total Packages</span></div>
        <div><span class="num">${totalRpcs}</span><span class="lbl">RPC-Wired Routes</span></div>
        <div><span class="num">2,915</span><span class="lbl">FileMan Schemas</span></div>
        <div><span class="num">4,517</span><span class="lbl">RPCs in Catalog</span></div>
      </div>
      <p>Select a package from the sidebar to view its documentation including FileMan files, RPCs, menu options, and API endpoints.</p>
    </div>
  </main>
</div>
<script>
const search = document.getElementById('search');
const content = document.getElementById('content');
const links = document.querySelectorAll('.pkg-link');

search.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  links.forEach(link => {
    const name = link.dataset.name.toLowerCase();
    const ns = link.dataset.ns.toLowerCase();
    link.style.display = (name.includes(q) || ns.includes(q)) ? '' : 'none';
  });
});

links.forEach(link => {
  link.addEventListener('click', async (e) => {
    e.preventDefault();
    links.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    const ns = link.dataset.ns;
    try {
      const basePath = window.location.pathname.replace(/\\/docs\\/site\\/.*$/, '');
      const paths = [
        basePath + '/docs/modules/' + ns + '/README.md',
        '../modules/' + ns + '/README.md',
        '../../docs/modules/' + ns + '/README.md',
      ];
      let md = null;
      for (const p of paths) {
        try {
          const res = await fetch(p);
          if (res.ok) { md = await res.text(); break; }
        } catch {}
      }
      if (md) {
        content.innerHTML = marked.parse(md);
      } else {
        content.innerHTML = '<h1>' + link.dataset.name + ' (' + ns.toUpperCase() + ')</h1><p>Documentation file not found. Run <code>node tools/vista-module-gen/cli.mjs --package ' + ns.toUpperCase() + '</code> to generate.</p>';
      }
    } catch (err) {
      content.innerHTML = '<h1>Error</h1><p>' + err.message + '</p>';
    }
  });
});
<\/script>
</body>
</html>`;

mkdirSync(join(ROOT, 'docs', 'site'), { recursive: true });
writeFileSync(join(ROOT, 'docs', 'site', 'index.html'), html);
console.log('Wrote docs/site/index.html (' + Math.round(html.length / 1024) + ' KB)');
console.log(`Stats: ${csvLines.length} packages, ${totalRpcs} RPC routes`);
for (const [t, pkgs] of Object.entries(tiers)) {
  console.log(`  Tier ${t}: ${pkgs.length} packages`);
}
