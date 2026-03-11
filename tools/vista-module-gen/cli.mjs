#!/usr/bin/env node
// =============================================================================
// VistA Module Generator CLI
// =============================================================================
// Reads extracted VistA metadata (schema, menus, RPCs) and generates
// complete module code for each VistA package:
//   - M Routine (ZVE{NS}.m) -- custom RPCs wrapping FileMan APIs
//   - API Routes (apps/api/src/routes/vista/{package}.ts)
//   - TypeScript Types (apps/api/src/types/vista/{package}.ts)
//   - React Components (apps/web/src/components/vista/{package}/)
//   - Documentation (docs/modules/{package}/)
//   - Test Specs (apps/api/tests/vista/{package}.test.ts)
//
// Usage:
//   node cli.mjs --all                    # Generate all packages
//   node cli.mjs --package XU             # Generate single package
//   node cli.mjs --package SD --dry-run   # Preview without writing
//   node cli.mjs --list                   # List available packages
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// --- CLI argument parsing ---
const args = process.argv.slice(2);
const flags = {
  all: args.includes('--all'),
  list: args.includes('--list'),
  dryRun: args.includes('--dry-run'),
  package: args[args.indexOf('--package') + 1] || null,
  schemaDir: getArg('--schema-dir') || join(ROOT, 'data', 'vista', 'schema'),
  menuFile: getArg('--menu-file') || join(ROOT, 'data', 'vista', 'menus', 'menu-flat.json'),
  rpcFile: getArg('--rpc-file') || join(ROOT, 'data', 'vista', 'rpcs', 'rpc-catalog.json'),
};

function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : null;
}

// --- Package definitions (196 packages from Packages.csv) ---
const PACKAGE_MAP = loadPackageMap();

function loadPackageMap() {
  const csvPath = join(ROOT, 'data', 'vista', 'Packages.csv');
  if (!existsSync(csvPath)) {
    // Fallback to hardcoded core packages
    return new Map([
      ['XU', { name: 'Kernel', prefix: 'XU', tier: 1 }],
      ['DI', { name: 'VA FileMan', prefix: 'DI', tier: 1 }],
      ['DG', { name: 'Registration', prefix: 'DG', tier: 1 }],
      ['SD', { name: 'Scheduling', prefix: 'SD', tier: 1 }],
      ['OR', { name: 'Order Entry', prefix: 'OR', tier: 1 }],
      ['PSO', { name: 'Outpatient Pharmacy', prefix: 'PSO', tier: 1 }],
      ['PSJ', { name: 'Inpatient Medications', prefix: 'PSJ', tier: 1 }],
      ['LR', { name: 'Lab Service', prefix: 'LR', tier: 1 }],
      ['RA', { name: 'Radiology', prefix: 'RA', tier: 1 }],
      ['TIU', { name: 'Text Integration Utility', prefix: 'TIU', tier: 1 }],
      ['GMPL', { name: 'Problem List', prefix: 'GMPL', tier: 1 }],
      ['GMV', { name: 'Vitals', prefix: 'GMV', tier: 1 }],
      ['GMRA', { name: 'Adverse Reaction Tracking', prefix: 'GMRA', tier: 1 }],
      ['IB', { name: 'Integrated Billing', prefix: 'IB', tier: 1 }],
      ['PRCA', { name: 'Accounts Receivable', prefix: 'PRCA', tier: 1 }],
      // --- Tier 2: Hospital Operations (22 packages) ---
      ['SR', { name: 'Surgery', prefix: 'SR', tier: 2 }],
      ['GMRC', { name: 'Consult/Request Tracking', prefix: 'GMRC', tier: 2 }],
      ['FH', { name: 'Dietetics', prefix: 'FH', tier: 2 }],
      ['NUR', { name: 'Nursing', prefix: 'NUR', tier: 2 }],
      ['PSB', { name: 'Bar Code Med Admin', prefix: 'PSB', tier: 2 }],
      ['PX', { name: 'PCE Patient Care Encounter', prefix: 'PX', tier: 2 }],
      ['YS', { name: 'Mental Health', prefix: 'YS', tier: 2 }],
      ['AN', { name: 'Anesthesiology', prefix: 'AN', tier: 2 }],
      ['DEN', { name: 'Dental', prefix: 'DEN', tier: 2 }],
      ['ONC', { name: 'Oncology', prefix: 'ONC', tier: 2 }],
      ['RM', { name: 'Record Tracking', prefix: 'RM', tier: 2 }],
      ['RT', { name: 'Record Tracking', prefix: 'RT', tier: 2 }],
      ['BCH', { name: 'Blood Bank', prefix: 'BCH', tier: 2 }],
      ['WV', { name: 'Women Veterans Health', prefix: 'WV', tier: 2 }],
      ['HD', { name: 'Health Data Informatics', prefix: 'HD', tier: 2 }],
      ['IMM', { name: 'Immunology Case Registry', prefix: 'IMM', tier: 2 }],
      ['PSX', { name: 'CMOP', prefix: 'PSX', tier: 2 }],
      ['PSA', { name: 'Drug Accountability', prefix: 'PSA', tier: 2 }],
      ['PSN', { name: 'National Drug File', prefix: 'PSN', tier: 2 }],
      ['PSD', { name: 'Controlled Substances', prefix: 'PSD', tier: 2 }],
      ['IV', { name: 'IV Pharmacy', prefix: 'IV', tier: 2 }],
      ['PPP', { name: 'Patient Representative', prefix: 'PPP', tier: 2 }],
      ['GMTS', { name: 'Health Summary', prefix: 'GMTS', tier: 2 }],
      ['PXRM', { name: 'Clinical Reminders', prefix: 'PXRM', tier: 2 }],
      ['EDP', { name: 'Emergency Department', prefix: 'EDP', tier: 2 }],
      ['MD', { name: 'Clinical Procedures', prefix: 'MD', tier: 2 }],
      ['RMPR', { name: 'Prosthetics', prefix: 'RMPR', tier: 2 }],
      ['DENT', { name: 'Dental', prefix: 'DENT', tier: 2 }],
      ['SPN', { name: 'Spinal Cord Dysfunction', prefix: 'SPN', tier: 2 }],
      ['MC', { name: 'Medicine', prefix: 'MC', tier: 2 }],
      ['PSS', { name: 'Pharmacy Data Management', prefix: 'PSS', tier: 2 }],
      ['SOW', { name: 'Social Work', prefix: 'SOW', tier: 2 }],
      // --- Tier 3: Administrative (18 packages) ---
      ['PRC', { name: 'IFCAP Procurement', prefix: 'PRC', tier: 3 }],
      ['EN', { name: 'Engineering', prefix: 'EN', tier: 3 }],
      ['PRS', { name: 'PAID', prefix: 'PRS', tier: 3 }],
      ['EC', { name: 'Event Capture', prefix: 'EC', tier: 3 }],
      ['DPT', { name: 'Patient File Manager', prefix: 'DPT', tier: 3 }],
      ['DSS', { name: 'DSS Extracts', prefix: 'DSS', tier: 3 }],
      ['QA', { name: 'Quality Assurance', prefix: 'QA', tier: 3 }],
      ['FB', { name: 'Fee Basis', prefix: 'FB', tier: 3 }],
      ['ICD', { name: 'DRG Grouper', prefix: 'ICD', tier: 3 }],
      ['MCAR', { name: 'Medicine', prefix: 'MCAR', tier: 3 }],
      ['IC', { name: 'Infection Control', prefix: 'IC', tier: 3 }],
      ['DVB', { name: 'Automated Med Info Exchange', prefix: 'DVB', tier: 3 }],
      ['IBD', { name: 'Integrated Billing (DX)', prefix: 'IBD', tier: 3 }],
      ['IBCN', { name: 'Insurance Verification', prefix: 'IBCN', tier: 3 }],
      ['MP', { name: 'Master Patient Index', prefix: 'MP', tier: 3 }],
      ['VIC', { name: 'Veterans ID Card', prefix: 'VIC', tier: 3 }],
      ['ARJ', { name: 'Journal-AR', prefix: 'ARJ', tier: 3 }],
      ['ARC', { name: 'Accounts Receivable Claims', prefix: 'ARC', tier: 3 }],
      // --- Tier 4: Infrastructure/Interop (20 packages) ---
      ['HL', { name: 'Health Level Seven', prefix: 'HL', tier: 4 }],
      ['XM', { name: 'MailMan', prefix: 'XM', tier: 4 }],
      ['XT', { name: 'Toolkit', prefix: 'XT', tier: 4 }],
      ['XWB', { name: 'RPC Broker', prefix: 'XWB', tier: 4 }],
      ['KMP', { name: 'Kernel Perf Monitor', prefix: 'KMP', tier: 4 }],
      ['XOB', { name: 'Web Services Client', prefix: 'XOB', tier: 4 }],
      ['XOBW', { name: 'Web Server', prefix: 'XOBW', tier: 4 }],
      ['XHD', { name: 'Health Data Repository', prefix: 'XHD', tier: 4 }],
      ['XUS', { name: 'Kernel Security', prefix: 'XUS', tier: 4 }],
      ['XPAR', { name: 'Parameter Tools', prefix: 'XPAR', tier: 4 }],
      ['XPD', { name: 'KIDS', prefix: 'XPD', tier: 4 }],
      ['ZIS', { name: 'Device Handler', prefix: 'ZIS', tier: 4 }],
      ['FM', { name: 'FileMan', prefix: 'FM', tier: 4 }],
      ['DINZ', { name: 'FileMan DBS', prefix: 'DINZ', tier: 4 }],
      ['XQ', { name: 'Menu Manager', prefix: 'XQ', tier: 4 }],
      ['KMPS', { name: 'Capacity Management', prefix: 'KMPS', tier: 4 }],
      ['VFD', { name: 'VistALink', prefix: 'VFD', tier: 4 }],
      ['HMP', { name: 'Health Management Platform', prefix: 'HMP', tier: 4 }],
      ['VDEF', { name: 'VistA Data Extract Framework', prefix: 'VDEF', tier: 4 }],
      ['TMP', { name: 'Text Integration', prefix: 'TMP', tier: 4 }],
      // --- Tier 5: Specialized (selected active packages) ---
      ['MAG', { name: 'VistA Imaging', prefix: 'MAG', tier: 5 }],
    ]);
  }
  const csv = readFileSync(csvPath, 'utf-8');
  const map = new Map();
  const lines = csv.split('\n').slice(1); // skip header
  for (const line of lines) {
    const cols = line.split(',');
    if (cols.length < 2) continue;
    const name = cols[0]?.trim().replace(/"/g, '');
    const prefix = cols[1]?.trim().replace(/"/g, '');
    if (!name || !prefix) continue;
    map.set(prefix, { name, prefix, tier: 5 }); // default tier 5
  }
  return map;
}

// --- Load extracted metadata ---
function loadSchema(ns) {
  const dir = flags.schemaDir;
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'file-index.json');
  const schemas = [];
  for (const f of files) {
    try {
      const data = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
      if (data.namespace === ns || data.globalRoot?.includes(ns)) {
        schemas.push(data);
      }
    } catch { /* skip invalid */ }
  }
  return schemas;
}

function loadRpcs(ns) {
  if (!existsSync(flags.rpcFile)) return [];
  try {
    const data = JSON.parse(readFileSync(flags.rpcFile, 'utf-8'));
    let results = (data.rpcs || []).filter(r => r.namespace === ns);
    if (results.length === 0) {
      results = (data.rpcs || []).filter(r => (r.name || '').startsWith(ns + ' ') || (r.name || '').startsWith(ns));
    }
    return results;
  } catch { return []; }
}

function loadMenus(ns) {
  if (!existsSync(flags.menuFile)) return [];
  try {
    const data = JSON.parse(readFileSync(flags.menuFile, 'utf-8'));
    return (data.options || []).filter(o => {
      const name = o.name || '';
      return name.startsWith(ns + ' ') || name.startsWith(ns.toLowerCase() + ' ');
    });
  } catch { return []; }
}

// --- Code Generators ---

function generateTypes(pkg, schemas, rpcs) {
  const lines = [
    `// Auto-generated by vista-module-gen for ${pkg.name} (${pkg.prefix})`,
    `// Do NOT edit manually -- regenerate with: node tools/vista-module-gen/cli.mjs --package ${pkg.prefix}`,
    '',
    `export const PACKAGE_NS = '${pkg.prefix}';`,
    `export const PACKAGE_NAME = '${pkg.name}';`,
    '',
  ];

  // Generate types from schemas
  for (const schema of schemas) {
    const typeName = pascalCase(schema.fileName || `File${schema.fileNumber}`);
    lines.push(`/** FileMan File #${schema.fileNumber}: ${schema.fileName} */`);
    lines.push(`export interface ${typeName} {`);

    for (const field of (schema.fields || [])) {
      const tsType = fieldToTsType(field);
      const required = field.required ? '' : '?';
      lines.push(`  /** Field ${field.fieldNumber}: ${field.fieldName} */`);
      lines.push(`  ${camelCase(field.fieldName)}${required}: ${tsType};`);
    }

    lines.push('}');
    lines.push('');
  }

  // Generate RPC type constants
  if (rpcs.length > 0) {
    lines.push('/** RPCs available for this package */');
    lines.push(`export const ${pkg.prefix.toUpperCase()}_RPCS = {`);
    for (const rpc of rpcs) {
      const constName = rpc.name.replace(/[^A-Z0-9]/gi, '_').toUpperCase();
      lines.push(`  ${constName}: '${rpc.name}',`);
    }
    lines.push('} as const;');
    lines.push('');
    lines.push(`export type ${pascalCase(pkg.prefix)}RpcName = typeof ${pkg.prefix.toUpperCase()}_RPCS[keyof typeof ${pkg.prefix.toUpperCase()}_RPCS];`);
  }

  return lines.join('\n');
}

function generateRoutes(pkg, schemas, rpcs) {
  const routePrefix = pkg.prefix.toLowerCase();
  const lines = [
    `// Auto-generated by vista-module-gen for ${pkg.name} (${pkg.prefix})`,
    `// Do NOT edit manually -- regenerate with: node tools/vista-module-gen/cli.mjs --package ${pkg.prefix}`,
    `import type { FastifyInstance } from 'fastify';`,
    `import { requireSession } from '../../auth/auth-routes.js';`,
    `import { safeCallRpc } from '../../lib/rpc-resilience.js';`,
    '',
    `export async function ${camelCase(pkg.prefix)}Routes(server: FastifyInstance) {`,
  ];

  const DFN_PARAM_NAMES = new Set([
    'DFN', 'PATIENT ID', 'PATIENT', 'RADFN', 'ORVP', 'PT', 'PTIEN',
  ]);
  const WRITE_RPC_PATTERNS = [
    /\bSAVE\b/, /\bADD\b/, /\bSET\b/, /\bCREATE\b/, /\bDELETE\b/, /\bSIGN\b/,
    /\bDC\b/, /\bLOCK\b/, /\bUNLOCK\b/, /\bFLAG\b/, /\bHOLD\b/, /\bCOMPLETE\b/,
    /\bUPDATE\b/, /\bCANCEL\b/, /\bRENEW\b/, /\bVERIFY\b/, /\bDISCONTINUE\b/,
  ];

  function isDfnParam(paramName) {
    return DFN_PARAM_NAMES.has((paramName || '').toUpperCase());
  }

  function isWriteRpc(rpcName) {
    const upper = (rpcName || '').toUpperCase();
    return WRITE_RPC_PATTERNS.some(p => p.test(upper));
  }

  for (const rpc of rpcs) {
    const routeName = kebabCase(rpc.name);
    const paramCount = rpc.paramCount || 0;
    const params = rpc.params || [];
    const httpMethod = isWriteRpc(rpc.name) ? 'post' : 'get';

    lines.push('');
    lines.push(`  /** RPC: ${rpc.name} (${rpc.returnType || 'SINGLE VALUE'}) — ${paramCount} param(s) */`);
    lines.push(`  server.${httpMethod}('/vista/${routePrefix}/rpc/${routeName}', async (request, reply) => {`);
    lines.push(`    const session = await requireSession(request, reply);`);
    lines.push(`    if (!session) return;`);

    if (paramCount === 0 || params.length === 0) {
      lines.push(`    const result = await safeCallRpc('${escapeStr(rpc.name)}', []);`);
    } else if (paramCount === 1 && isDfnParam(params[0]?.name)) {
      lines.push(`    const q = (request.query || request.body || {}) as Record<string, string>;`);
      lines.push(`    if (!q.dfn) return { ok: false, error: 'dfn query parameter is required' };`);
      lines.push(`    const result = await safeCallRpc('${escapeStr(rpc.name)}', [q.dfn]);`);
    } else {
      lines.push(`    const q = (request.query || request.body || {}) as Record<string, string>;`);
      const paramLines = [];
      for (let pi = 0; pi < params.length; pi++) {
        const p = params[pi];
        let qName = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '');
        if (!qName) qName = `param${pi + 1}`;
        if (/^\d/.test(qName)) qName = `p_${qName}`;
        const jsName = isDfnParam(p.name) ? 'dfn' : qName;
        paramLines.push(jsName);
        if (p.required !== false && isDfnParam(p.name)) {
          lines.push(`    if (!q.${jsName}) return { ok: false, error: '${jsName} query parameter is required' };`);
        }
      }
      const paramExpr = paramLines.map(n => /^\d/.test(n) ? `q['${n}'] || ''` : `q.${n} || ''`).join(', ');
      lines.push(`    const result = await safeCallRpc('${escapeStr(rpc.name)}', [${paramExpr}]);`);
    }

    lines.push(`    return { ok: true, source: 'vista', rpcUsed: ['${escapeStr(rpc.name)}'], data: result };`);
    lines.push(`  });`);
  }

  lines.push('}');
  return lines.join('\n');
}

function generateComponent(pkg, schemas, rpcs) {
  const compName = pascalCase(pkg.name) + 'Panel';
  const ns = pkg.prefix.toLowerCase();
  const rpcList = (rpcs || []).map(r => {
    const slug = r.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return { name: r.name, slug, tag: r.tag || '' };
  });
  const rpcJsonStr = JSON.stringify(rpcList.map(r => ({ name: r.name, slug: r.slug })));
  const lines = [
    `// Auto-generated by vista-module-gen for ${pkg.name} (${pkg.prefix})`,
    `// Do NOT edit manually`,
    `'use client';`,
    '',
    `import { useState, useCallback } from 'react';`,
    '',
    `const API_BASE = typeof window !== 'undefined'`,
    `  ? \`\${window.location.protocol}//\${window.location.hostname}:3001\``,
    `  : 'http://127.0.0.1:3001';`,
    '',
    `const RPCS: { name: string; slug: string }[] = ${rpcJsonStr};`,
    '',
    `interface RpcResult { ok: boolean; rpcUsed?: string[]; data?: string[]; error?: string; }`,
    '',
    `export default function ${compName}({ dfn: propDfn = '46' }: { dfn?: string }) {`,
    `  const [selectedRpc, setSelectedRpc] = useState<string | null>(null);`,
    `  const [dfn, setDfn] = useState(propDfn);`,
    `  const [result, setResult] = useState<RpcResult | null>(null);`,
    `  const [loading, setLoading] = useState(false);`,
    '',
    `  const callRpc = useCallback(async (slug: string) => {`,
    `    setLoading(true);`,
    `    setSelectedRpc(slug);`,
    `    try {`,
    `      const res = await fetch(\`\${API_BASE}/vista/${ns}/rpc/\${slug}?dfn=\${dfn}\`, { credentials: 'include' });`,
    `      const json = await res.json();`,
    `      setResult(json);`,
    `    } catch (e: unknown) {`,
    `      setResult({ ok: false, error: (e as Error).message });`,
    `    }`,
    `    setLoading(false);`,
    `  }, [dfn]);`,
    '',
    `  return (`,
    `    <div className="space-y-4">`,
    `      <div className="flex items-center gap-3">`,
    `        <label className="text-sm font-medium">Patient DFN:</label>`,
    `        <input`,
    `          className="px-2 py-1 border rounded text-sm w-24"`,
    `          value={dfn}`,
    `          onChange={e => setDfn(e.target.value)}`,
    `        />`,
    `        <span className="text-xs text-muted-foreground">${rpcList.length} RPCs available</span>`,
    `      </div>`,
    '',
    `      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">`,
    `        <div className="md:col-span-1 border rounded-lg p-3 max-h-96 overflow-y-auto">`,
    `          <h3 className="font-semibold text-sm mb-2">RPCs</h3>`,
    `          {RPCS.length === 0 ? (`,
    `            <p className="text-xs text-muted-foreground">No RPCs registered for ${pkg.prefix}.</p>`,
    `          ) : (`,
    `            <div className="space-y-1">`,
    `              {RPCS.map(r => (`,
    `                <button`,
    `                  key={r.slug}`,
    `                  onClick={() => callRpc(r.slug)}`,
    `                  className={\`w-full text-left text-xs px-2 py-1.5 rounded transition-colors \${`,
    `                    selectedRpc === r.slug ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'`,
    `                  }\`}`,
    `                >`,
    `                  {r.name}`,
    `                </button>`,
    `              ))}`,
    `            </div>`,
    `          )}`,
    `        </div>`,
    '',
    `        <div className="md:col-span-2 border rounded-lg p-3">`,
    `          <h3 className="font-semibold text-sm mb-2">`,
    `            {selectedRpc ? \`Result: \${selectedRpc}\` : 'Select an RPC to call'}`,
    `          </h3>`,
    `          {loading && <div className="animate-pulse text-sm">Calling VistA...</div>}`,
    `          {result && !loading && (`,
    `            <div className="space-y-2">`,
    `              <div className="flex gap-2 text-xs">`,
    `                <span className={\`px-1.5 py-0.5 rounded \${result.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}\`}>`,
    `                  {result.ok ? 'OK' : 'ERROR'}`,
    `                </span>`,
    `                {result.rpcUsed?.map(r => (`,
    `                  <span key={r} className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">{r}</span>`,
    `                ))}`,
    `              </div>`,
    `              {result.error && <p className="text-red-500 text-sm">{result.error}</p>}`,
    `              {result.data && result.data.length > 0 ? (`,
    `                <pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-y-auto whitespace-pre-wrap">`,
    `                  {result.data.join('\\n')}`,
    `                </pre>`,
    `              ) : (`,
    `                <p className="text-muted-foreground text-sm">No data returned.</p>`,
    `              )}`,
    `            </div>`,
    `          )}`,
    `          {!result && !loading && (`,
    `            <p className="text-muted-foreground text-sm">Click an RPC on the left to call it against VistA.</p>`,
    `          )}`,
    `        </div>`,
    `      </div>`,
    '',
    `      <div className="text-xs text-muted-foreground">`,
    `        API: <code>\${API_BASE}/vista/${ns}/rpc/&lt;slug&gt;?dfn=&lt;n&gt;</code>`,
    `      </div>`,
    `    </div>`,
    `  );`,
    `}`,
  ];
  return lines.join('\n');
}

function generateMRoutine(pkg, schemas, rpcs) {
  const rtnName = `ZVE${pkg.prefix.substring(0, 4).toUpperCase()}`;
  const lines = [
    `${rtnName} ;VE/AUTO - ${pkg.name} Custom RPCs (Auto-generated);${new Date().toISOString().slice(0, 10)}`,
    ` ;;1.0;VistA-Evolved;**AUTO**;;`,
    ` ;`,
    ` ; Auto-generated by vista-module-gen for ${pkg.name} (${pkg.prefix})`,
    ` ; Provides custom RPCs wrapping FileMan APIs for package ${pkg.prefix}.`,
    ` ;`,
    ` ; Entry points:`,
    ` ;   INSTALL^${rtnName}  - Register RPCs in File #8994`,
    ` ;   VERIFY^${rtnName}   - Verify registration`,
    ` ;`,
    ` Q`,
    ` ;`,
    `INSTALL ; Register custom RPCs`,
    ` W !,"=== Installing ${pkg.name} RPCs ==="`,
  ];

  // Generate RPC registration for each schema
  for (const schema of schemas.slice(0, 5)) {
    const rpcName = `VE ${pkg.prefix} ${(schema.fileName || '').replace(/ /g, ' ').substring(0, 30).trim()}`;
    lines.push(` D REGONE("${rpcName}","LIST","${rtnName}","List ${schema.fileName || 'file ' + schema.fileNumber}")`);
  }

  lines.push(` W !,"=== Installation Complete ==="`, ` Q`, ` ;`);

  // Generate LIST tag for each schema
  for (const schema of schemas.slice(0, 5)) {
    const tag = `LIST${schema.fileNumber || ''}`.replace(/\./g, '');
    lines.push(
      `${tag}(RES,PARAMS) ; List records from File #${schema.fileNumber}`,
      ` N IEN,CNT,DATA`,
      ` S CNT=0`,
      ` ; Walk the global and return first 100 records`,
      ` S IEN=0`,
      ` F  S IEN=$O(${schema.globalRoot || '^UNKNOWN('}IEN)) Q:IEN'>0  Q:CNT>99  D`,
      ` . N NAME S NAME=$$GET1^DIQ(${schema.fileNumber},IEN,.01)`,
      ` . I NAME="" Q`,
      ` . S CNT=CNT+1`,
      ` . S RES(CNT)=IEN_"^"_NAME`,
      ` Q`,
      ` ;`,
    );
  }

  // REGONE helper
  lines.push(
    `REGONE(NAME,TAG,RTN,DESC) ; Register one RPC`,
    ` N IEN S IEN=$$FIND1^DIC(8994,,"BX",NAME)`,
    ` I IEN>0 W !,"  "_NAME_" already registered" Q`,
    ` N FDA,ERR`,
    ` S FDA(8994,"+1,",.01)=NAME`,
    ` S FDA(8994,"+1,",.02)=TAG`,
    ` S FDA(8994,"+1,",.03)=RTN`,
    ` S FDA(8994,"+1,",.04)=2`,
    ` D UPDATE^DIE("E","FDA","","ERR")`,
    ` I $D(ERR) W !,"  ERROR: "_$G(ERR("DIERR",1,"TEXT",1)) Q`,
    ` W !,"  Registered: "_NAME`,
    ` Q`,
    ` ;`,
    `VERIFY ; Verify registration`,
    ` W !,"=== ${pkg.name} RPC Verification ==="`,
    ` N IEN,CNT S CNT=0,IEN=0`,
    ` F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  D`,
    ` . N NAME S NAME=$P($G(^XWB(8994,IEN,0)),"^",1)`,
    ` . I $E(NAME,1,${3 + pkg.prefix.length})="VE ${pkg.prefix}" D`,
    ` . . S CNT=CNT+1`,
    ` . . W !,"  "_NAME`,
    ` W !,"Total VE ${pkg.prefix} RPCs: "_CNT`,
    ` Q`,
    ` ;`,
  );

  return lines.join('\n');
}

function loadAdminSpec(ns) {
  const specDir = join(ROOT, 'data', 'vista', 'admin-specs');
  if (!existsSync(specDir)) return null;
  const NS_TO_DOMAIN = {
    XU: 'user-security', XUS: 'user-security',
    DG: 'patient-registration', DGWPT: 'patient-registration',
    SD: 'scheduling', SDEC: 'scheduling', SDES: 'scheduling',
    DI: 'fileman', DINZ: 'fileman', FM: 'fileman',
    OR: 'order-entry', ORQ: 'order-entry', ORW: 'order-entry', ORB: 'order-entry',
    PSO: 'pharmacy', PSJ: 'pharmacy', PSB: 'pharmacy', PSN: 'pharmacy', PSD: 'pharmacy', PSA: 'pharmacy',
    LR: 'laboratory',
    TIU: 'clinical-notes',
    GMRA: 'allergies', ORQQAL: 'allergies',
    GMV: 'vitals', ORQQVI: 'vitals',
    GMPL: 'problem-list', ORQQPL: 'problem-list',
    IB: 'billing', IBD: 'billing', IBCN: 'billing',
    RA: 'radiology', RAMAG: 'radiology',
    SR: 'surgery',
    XWB: 'rpc-broker',
  };
  const domainId = NS_TO_DOMAIN[ns];
  if (!domainId) return null;
  const specPath = join(specDir, `${domainId}.json`);
  if (!existsSync(specPath)) return null;
  try {
    return JSON.parse(readFileSync(specPath, 'utf-8'));
  } catch { return null; }
}

function generateDocs(pkg, schemas, rpcs, menus, adminSpec) {
  const effectiveRpcs = rpcs.length > 0 ? rpcs
    : (adminSpec && adminSpec.rpcs && adminSpec.rpcs.items ? adminSpec.rpcs.items : []);
  const effectiveSchemas = schemas.length > 0 ? schemas
    : (adminSpec && adminSpec.files && adminSpec.files.items ? adminSpec.files.items : []);

  const lines = [
    `# ${pkg.name} (${pkg.prefix})`,
    '',
    `> Auto-generated module documentation by vista-module-gen`,
    `> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary`,
    '',
  ];

  // Overview
  lines.push('## Overview', '');
  if (adminSpec) {
    lines.push(adminSpec.description || `Package namespace: \`${pkg.prefix}\``);
    lines.push('');
  }
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| Namespace | \`${pkg.prefix}\` |`);
  lines.push(`| Tier | ${pkg.tier} |`);
  lines.push(`| FileMan Files | ${effectiveSchemas.length} |`);
  lines.push(`| RPCs | ${effectiveRpcs.length} |`);
  lines.push(`| Menu Options | ${menus.length} |`);
  if (adminSpec && adminSpec.vdlManual) {
    lines.push(`| VDL Manual | \`${adminSpec.vdlManual}\` |`);
  }
  lines.push('');

  // FileMan Files
  lines.push('## FileMan Files', '');
  if (effectiveSchemas.length > 0) {
    lines.push('| File # | Name | Fields | Global |');
    lines.push('|--------|------|--------|--------|');
    for (const s of effectiveSchemas) {
      lines.push(`| ${s.fileNumber} | ${s.fileName || '?'} | ${s.fieldCount || '?'} | ${s.globalRoot || '?'} |`);
    }
  } else {
    lines.push('No FileMan file metadata available for this package.');
  }
  lines.push('');

  // RPCs - detailed
  lines.push('## Remote Procedure Calls (RPCs)', '');
  if (effectiveRpcs.length > 0) {
    for (const r of effectiveRpcs) {
      lines.push(`### \`${r.name}\``, '');
      lines.push(`| Property | Value |`);
      lines.push(`|----------|-------|`);
      lines.push(`| Tag | \`${r.tag || 'N/A'}\` |`);
      lines.push(`| Routine | \`${r.routine || 'N/A'}\` |`);
      lines.push(`| Return Type | ${r.returnType || 'N/A'} |`);
      lines.push(`| Parameter Count | ${r.paramCount || 0} |`);
      if (r.inactive) lines.push(`| Status | Inactive (may still be callable) |`);
      lines.push('');
      if (r.description) {
        lines.push(`**Description:** ${r.description.trim()}`, '');
      }
      if (r.params && r.params.length > 0) {
        lines.push('**Parameters:**', '');
        lines.push('| # | Name | Type | Required |');
        lines.push('|---|------|------|----------|');
        r.params.forEach((p, i) => {
          lines.push(`| ${i + 1} | ${p.name} | ${p.type || 'LITERAL'} | ${p.required ? 'Yes' : 'No'} |`);
        });
        lines.push('');
      }
      const nsLower = pkg.prefix.toLowerCase();
      const rpcSlug = r.name.toLowerCase().replace(/\s+/g, '-');
      const httpMethod = inferHttpMethod(r);
      lines.push(`**API Endpoint:** \`${httpMethod} /vista/${nsLower}/rpc/${rpcSlug}\``, '');
      lines.push('---', '');
    }
  } else {
    lines.push('No RPCs found for this package namespace.');
  }
  lines.push('');

  // R&S Prompt Mappings
  if (adminSpec && adminSpec.promptMappings && adminSpec.promptMappings.items.length > 0) {
    lines.push('## Roll & Scroll Prompt Mappings', '');
    lines.push('These mappings show how traditional R&S terminal prompts correspond to RPC parameters and API fields.', '');
    lines.push('| R&S Prompt | RPC | Parameter | Type | Source |');
    lines.push('|------------|-----|-----------|------|--------|');
    for (const pm of adminSpec.promptMappings.items) {
      lines.push(`| ${pm.prompt} | ${pm.rpcName} | ${pm.paramName} | ${pm.paramType || 'LITERAL'} | ${pm.source || 'rpc'} |`);
    }
    lines.push('');
  }

  // Menu Options - categorized
  lines.push('## Menu Options', '');
  if (menus.length > 0) {
    const menusByType = {};
    for (const m of menus) {
      const type = m.type || 'other';
      if (!menusByType[type]) menusByType[type] = [];
      menusByType[type].push(m);
    }
    for (const [type, items] of Object.entries(menusByType)) {
      lines.push(`### ${type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ')}`, '');
      lines.push('| Name | Security Key |');
      lines.push('|------|-------------|');
      for (const m of items) {
        lines.push(`| ${m.name} | ${m.securityKey || '—'} |`);
      }
      lines.push('');
    }
  } else {
    lines.push('No menu options found for this package namespace.', '');
  }

  // Security Keys
  lines.push('## Security Keys', '');
  const keys = new Set(menus.filter(m => m.securityKey).map(m => m.securityKey));
  if (keys.size > 0) {
    lines.push('These VistA security keys control access to specific functions within this module:', '');
    for (const key of keys) {
      lines.push(`- \`${key}\``);
    }
  } else {
    lines.push('No security keys defined for this package.');
  }
  lines.push('');

  // API Route Summary
  lines.push('## API Route Summary', '');
  lines.push(`All routes are prefixed with \`/vista/${pkg.prefix.toLowerCase()}/\`.`, '');
  if (effectiveRpcs.length > 0) {
    lines.push('| Method | Endpoint | RPC | Return Type |');
    lines.push('|--------|----------|-----|-------------|');
    for (const r of effectiveRpcs) {
      const nsLower = pkg.prefix.toLowerCase();
      const rpcSlug = r.name.toLowerCase().replace(/\s+/g, '-');
      const method = inferHttpMethod(r);
      lines.push(`| ${method} | \`/vista/${nsLower}/rpc/${rpcSlug}\` | ${r.name} | ${r.returnType || 'N/A'} |`);
    }
    lines.push('');
  }

  // VDL Manual Reference
  if (adminSpec && adminSpec.vdlManual) {
    lines.push('## VDL Documentation Reference', '');
    lines.push(`Source manual: \`data/vista/vdl-manuals/${adminSpec.vdlManual}\``, '');
    lines.push('Refer to the official VA VistA Documentation Library (VDL) manual for:', '');
    lines.push('- Roll & Scroll terminal operation procedures');
    lines.push('- Security key assignments and menu management');
    lines.push('- FileMan file relationships and data entry rules');
    lines.push('- MUMPS routine reference and entry points');
    lines.push('');
  }

  return lines.join('\n');
}

function inferHttpMethod(rpc) {
  const name = (rpc.name || '').toUpperCase();
  const writePatterns = [
    /\bSAVE\b/, /\bADD\b/, /\bSET\b/, /\bCREATE\b/, /\bDELETE\b/, /\bSIGN\b/,
    /\bDC\b/, /\bLOCK\b/, /\bUNLOCK\b/, /\bFLAG\b/, /\bHOLD\b/, /\bCOMPLETE\b/,
    /\bUPDATE\b/, /\bCANCEL\b/, /\bRENEW\b/, /\bVERIFY\b/, /\bDISCONTINUE\b/,
  ];
  if (writePatterns.some(p => p.test(name))) return 'POST';
  return 'GET';
}

function generateTestSpec(pkg, schemas, rpcs) {
  const lines = [
    `// Auto-generated test spec for ${pkg.name} (${pkg.prefix})`,
    `import { describe, it, expect } from 'vitest';`,
    '',
    `describe('${pkg.name} (${pkg.prefix}) routes', () => {`,
  ];

  for (const schema of schemas.slice(0, 5)) {
    const routeName = kebabCase(schema.fileName || `file-${schema.fileNumber}`);
    lines.push(`  it('GET /vista/${pkg.prefix.toLowerCase()}/${routeName} returns valid response', async () => {`);
    lines.push(`    // Schema contract: File #${schema.fileNumber} should return { ok: true }`);
    lines.push(`    const res = await fetch('http://127.0.0.1:3001/vista/${pkg.prefix.toLowerCase()}/${routeName}', {`);
    lines.push(`      credentials: 'include',`);
    lines.push(`    });`);
    lines.push(`    expect(res.status).toBeLessThan(500);`);
    lines.push(`  });`);
    lines.push('');
  }

  lines.push('});');
  return lines.join('\n');
}

// --- Helpers ---

function pascalCase(str) {
  return str.replace(/[^a-zA-Z0-9]+/g, ' ').split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function camelCase(str) {
  const pc = pascalCase(str);
  return pc.charAt(0).toLowerCase() + pc.slice(1);
}

function kebabCase(str) {
  return str.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().replace(/^-|-$/g, '');
}

function escapeStr(s) {
  return (s || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
}

function fieldToTsType(field) {
  switch (field.dataType) {
    case 'DATE': return 'string';
    case 'NUMERIC': return 'number';
    case 'BOOLEAN': return 'boolean';
    case 'SET': return 'string';
    case 'POINTER': return 'number';
    case 'WORD-PROCESSING': return 'string[]';
    case 'SUBFILE': return 'unknown[]';
    default: return 'string';
  }
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// --- Main ---

function generatePackage(ns) {
  const pkg = PACKAGE_MAP.get(ns);
  if (!pkg) {
    console.error(`Unknown package namespace: ${ns}`);
    return null;
  }

  console.log(`\n=== Generating ${pkg.name} (${pkg.prefix}) ===`);

  const schemas = loadSchema(ns);
  const rpcs = loadRpcs(ns);
  const menus = loadMenus(ns);
  const adminSpec = loadAdminSpec(ns);

  console.log(`  Schemas: ${schemas.length}, RPCs: ${rpcs.length}, Menus: ${menus.length}, AdminSpec: ${adminSpec ? 'loaded' : 'none'}`);

  const outputs = {
    types: {
      path: join(ROOT, 'apps', 'api', 'src', 'types', 'vista', `${ns.toLowerCase()}.ts`),
      content: generateTypes(pkg, schemas, rpcs),
    },
    routes: {
      path: join(ROOT, 'apps', 'api', 'src', 'routes', 'vista', `${ns.toLowerCase()}.ts`),
      content: generateRoutes(pkg, schemas, rpcs),
    },
    component: {
      path: join(ROOT, 'apps', 'web', 'src', 'components', 'vista', ns.toLowerCase(), `${pascalCase(pkg.name)}Panel.tsx`),
      content: generateComponent(pkg, schemas, rpcs),
    },
    mRoutine: {
      path: join(ROOT, 'services', 'vista', `ZVE${ns.substring(0, 4).toUpperCase()}.m`),
      content: generateMRoutine(pkg, schemas, rpcs),
    },
    docs: {
      path: join(ROOT, 'docs', 'modules', ns.toLowerCase(), 'README.md'),
      content: generateDocs(pkg, schemas, rpcs, menus, adminSpec),
    },
    tests: {
      path: join(ROOT, 'apps', 'api', 'tests', 'vista', `${ns.toLowerCase()}.test.ts`),
      content: generateTestSpec(pkg, schemas, rpcs),
    },
  };

  if (flags.dryRun) {
    console.log('  [DRY RUN] Would write:');
    for (const [key, { path }] of Object.entries(outputs)) {
      console.log(`    ${key}: ${path}`);
    }
  } else {
    for (const [key, { path, content }] of Object.entries(outputs)) {
      // Skip overwriting files that already exist and are hand-maintained
      if (existsSync(path) && !isAutoGenerated(path)) {
        console.log(`  SKIP (hand-maintained): ${path}`);
        continue;
      }
      ensureDir(dirname(path));
      writeFileSync(path, content, 'utf-8');
      console.log(`  WROTE: ${key} -> ${path}`);
    }
  }

  return outputs;
}

function isAutoGenerated(path) {
  try {
    const content = readFileSync(path, 'utf-8');
    return content.includes('Auto-generated') && content.includes('vista-module-gen');
  } catch {
    return false;
  }
}

// --- Entry Point ---

if (flags.list) {
  console.log('Available packages:');
  for (const [ns, pkg] of PACKAGE_MAP) {
    console.log(`  ${ns.padEnd(8)} ${pkg.name}`);
  }
  process.exit(0);
}

if (flags.all) {
  console.log(`Generating all ${PACKAGE_MAP.size} packages...`);
  let count = 0;
  for (const ns of PACKAGE_MAP.keys()) {
    generatePackage(ns);
    count++;
  }
  console.log(`\n=== Generated ${count} packages ===`);
} else if (flags.package) {
  generatePackage(flags.package.toUpperCase());
} else {
  console.log('VistA Module Generator');
  console.log('Usage:');
  console.log('  node cli.mjs --all                  Generate all packages');
  console.log('  node cli.mjs --package XU            Generate single package');
  console.log('  node cli.mjs --package SD --dry-run  Preview without writing');
  console.log('  node cli.mjs --list                  List available packages');
}
