#!/usr/bin/env node
/**
 * Extract R&S workflow specs from VistA schema data + RPC catalog
 * into data/vista/admin-specs/{domain}.json
 * 
 * Each domain spec maps:
 *   - FileMan files used (File#, fields, global)
 *   - RPCs available for GUI access
 *   - R&S menu options (from menu-flat.json)
 *   - Prompt-to-field mappings where inferrable
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SCHEMA_DIR = join(ROOT, 'data', 'vista', 'schema');
const RPC_FILE = join(ROOT, 'data', 'vista', 'rpcs', 'rpc-catalog.json');
const MENU_FILE = join(ROOT, 'data', 'vista', 'menus', 'menu-flat.json');
const OUT_DIR = join(ROOT, 'data', 'vista', 'admin-specs');

mkdirSync(OUT_DIR, { recursive: true });

// VistA admin domains with their file numbers and RPC namespaces
const DOMAINS = [
  {
    id: 'user-security',
    name: 'User & Security Management',
    description: 'User accounts, access codes, security keys, menu assignments',
    files: [200, 3.1, 19, 19.1, 8989.3, 8989.5],
    rpcNamespaces: ['XUS', 'XU'],
    menuPrefixes: ['XU', 'XUSER', 'XUACCESSS'],
    vdlManual: 'kernel-technical-manual.pdf',
  },
  {
    id: 'patient-registration',
    name: 'Patient Registration',
    description: 'Patient demographics, insurance, eligibility, means test',
    files: [2, 2.98, 355.3, 391.91, 408.12, 408.13],
    rpcNamespaces: ['DG', 'DGWPT', 'DGRR'],
    menuPrefixes: ['DG'],
    vdlManual: 'pims-registration-scheduling-tm.pdf',
  },
  {
    id: 'scheduling',
    name: 'Appointment Scheduling',
    description: 'Clinic setup, appointment types, scheduling, check-in/out',
    files: [44, 409.84, 409.85, 44.003, 409.68],
    rpcNamespaces: ['SD', 'SDEC', 'SDES', 'SDVW', 'SDOE'],
    menuPrefixes: ['SD', 'SDEC', 'SDES'],
    vdlManual: 'pims-registration-scheduling-tm.pdf',
  },
  {
    id: 'fileman',
    name: 'VA FileMan',
    description: 'Data dictionary, file editing, inquire, search, print',
    files: [0, 0.4, 1, 1.1, 1.2, 1.5, 1.6],
    rpcNamespaces: ['DI', 'DINZ', 'DDR'],
    menuPrefixes: ['DI', 'DINU', 'DINQ'],
    vdlManual: 'fileman-technical-manual.pdf',
  },
  {
    id: 'order-entry',
    name: 'Order Entry / CPRS',
    description: 'Clinical orders, quick orders, order checks, order sets',
    files: [100, 100.01, 100.02, 100.98, 101, 101.41],
    rpcNamespaces: ['OR', 'ORQ', 'ORW', 'ORB'],
    menuPrefixes: ['OR'],
    vdlManual: null,
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    description: 'Outpatient prescriptions, inpatient meds, drug file, formulary',
    files: [50, 52, 52.6, 52.7, 55, 59.7],
    rpcNamespaces: ['PSO', 'PSJ', 'PSB', 'PSN', 'PSD', 'PSA'],
    menuPrefixes: ['PSO', 'PSJ', 'PSB'],
    vdlManual: null,
  },
  {
    id: 'laboratory',
    name: 'Laboratory',
    description: 'Lab orders, results, specimen collection, accession',
    files: [60, 63, 65, 65.1, 68, 69],
    rpcNamespaces: ['LR', 'ORWLR'],
    menuPrefixes: ['LR'],
    vdlManual: null,
  },
  {
    id: 'clinical-notes',
    name: 'Clinical Notes (TIU)',
    description: 'Progress notes, discharge summaries, document definitions',
    files: [8925, 8925.1, 8926],
    rpcNamespaces: ['TIU'],
    menuPrefixes: ['TIU'],
    vdlManual: null,
  },
  {
    id: 'allergies',
    name: 'Allergy/Adverse Reactions',
    description: 'Patient allergies, reactions, causative agents',
    files: [120.8, 120.82, 120.83, 120.84],
    rpcNamespaces: ['GMRA', 'ORQQAL'],
    menuPrefixes: ['GMRA'],
    vdlManual: null,
  },
  {
    id: 'vitals',
    name: 'Vitals/Measurements',
    description: 'Temperature, BP, pulse, respiration, height, weight, pain',
    files: [120.5, 120.51],
    rpcNamespaces: ['GMV', 'ORQQVI'],
    menuPrefixes: ['GMV'],
    vdlManual: null,
  },
  {
    id: 'problem-list',
    name: 'Problem List',
    description: 'Patient problems, conditions, ICD coding',
    files: [9000011, 9000011.12],
    rpcNamespaces: ['GMPL', 'ORQQPL'],
    menuPrefixes: ['GMPL'],
    vdlManual: null,
  },
  {
    id: 'billing',
    name: 'Integrated Billing',
    description: 'Charges, claims, insurance, means test, copay',
    files: [350, 399, 361, 361.1, 355.3],
    rpcNamespaces: ['IB', 'IBD', 'IBCN'],
    menuPrefixes: ['IB'],
    vdlManual: 'integrated-billing-user-guide.pdf',
  },
  {
    id: 'radiology',
    name: 'Radiology/Nuclear Medicine',
    description: 'Imaging orders, exam tracking, results, reports',
    files: [70, 71, 72, 73, 74, 75, 75.1],
    rpcNamespaces: ['RA', 'RAMAG'],
    menuPrefixes: ['RA'],
    vdlManual: null,
  },
  {
    id: 'surgery',
    name: 'Surgery',
    description: 'Surgical cases, anesthesia, operative reports',
    files: [130, 131, 136, 137],
    rpcNamespaces: ['SR'],
    menuPrefixes: ['SR'],
    vdlManual: null,
  },
  {
    id: 'rpc-broker',
    name: 'RPC Broker',
    description: 'Remote procedure call infrastructure, context management',
    files: [8994, 8994.5],
    rpcNamespaces: ['XWB'],
    menuPrefixes: ['XWB'],
    vdlManual: 'rpc-broker-developer-guide.pdf',
  },
];

// Load extracted schemas (handles malformed JSON from M extractor)
function fixMalformedJson(raw) {
  // Fix bare decimals: .01 -> 0.01 (after : or , or [ or in arrays)
  let fixed = raw.replace(/([:,\[]\s*)(\.[0-9])/g, '$10$2');
  // Fix values like "255a" that aren't quoted: 255a -> "255a"
  fixed = fixed.replace(/:\s*([0-9]+[a-zA-Z][a-zA-Z0-9]*)\s*([,}\]\n])/g, ': "$1"$2');
  // Fix bare word values that aren't true/false/null: foo -> "foo"
  fixed = fixed.replace(/:\s*([a-zA-Z][a-zA-Z0-9_]*)\s*([,}\]\n])/g, (match, val, end) => {
    if (val === 'true' || val === 'false' || val === 'null') return match;
    return `: "${val}"${end}`;
  });
  return fixed;
}

function loadSchemas() {
  if (!existsSync(SCHEMA_DIR)) return {};
  const schemas = {};
  const files = readdirSync(SCHEMA_DIR).filter(f => f.endsWith('.json') && f !== 'file-index.json');
  for (const f of files) {
    try {
      const raw = readFileSync(join(SCHEMA_DIR, f), 'utf-8');
      const fixed = fixMalformedJson(raw);
      const data = JSON.parse(fixed);
      if (data.fileNumber != null) {
        schemas[data.fileNumber] = data;
      }
    } catch { /* skip malformed files */ }
  }
  return schemas;
}

// Load RPC catalog
function loadRpcs() {
  if (!existsSync(RPC_FILE)) return [];
  try {
    const data = JSON.parse(readFileSync(RPC_FILE, 'utf-8'));
    return data.rpcs || [];
  } catch { return []; }
}

// Load menu options
function loadMenus() {
  if (!existsSync(MENU_FILE)) return [];
  try {
    const data = JSON.parse(readFileSync(MENU_FILE, 'utf-8'));
    return data.options || [];
  } catch { return []; }
}

const allSchemas = loadSchemas();
const allRpcs = loadRpcs();
const allMenus = loadMenus();

console.log(`Loaded: ${Object.keys(allSchemas).length} schemas, ${allRpcs.length} RPCs, ${allMenus.length} menus`);

for (const domain of DOMAINS) {
  console.log(`\nProcessing: ${domain.name} (${domain.id})`);
  
  // Collect files for this domain
  const files = [];
  for (const fileNum of domain.files) {
    const schema = allSchemas[fileNum] || allSchemas[String(fileNum)];
    if (schema) {
      files.push({
        fileNumber: schema.fileNumber,
        fileName: schema.fileName,
        fieldCount: schema.fieldCount || (schema.fields || []).length,
        globalRoot: schema.globalRoot,
        fields: (schema.fields || []).slice(0, 50).map(f => ({
          fieldNumber: f.fieldNumber,
          fieldName: f.fieldName,
          dataType: f.dataType,
          required: f.required || false,
          description: f.description || '',
          pointer: f.pointer || null,
        })),
      });
    } else {
      files.push({ fileNumber: fileNum, fileName: `File #${fileNum}`, fieldCount: 0, fields: [] });
    }
  }
  
  // Collect RPCs for this domain
  const rpcs = [];
  for (const ns of domain.rpcNamespaces) {
    const matching = allRpcs.filter(r => {
      const rpcNs = r.namespace || r.name.split(' ')[0];
      return rpcNs === ns || r.name.startsWith(ns + ' ') || r.name.startsWith(ns);
    });
    for (const rpc of matching.slice(0, 50)) {
      rpcs.push({
        name: rpc.name,
        tag: rpc.tag,
        routine: rpc.routine,
        returnType: rpc.returnType,
        paramCount: rpc.paramCount,
        params: (rpc.params || []).map(p => ({
          name: p.name,
          type: p.type,
          required: p.required,
        })),
        description: rpc.description || '',
      });
    }
  }
  
  // Collect menu options
  const menus = [];
  for (const prefix of domain.menuPrefixes) {
    const matching = allMenus.filter(o => {
      const name = o.name || '';
      return name.startsWith(prefix + ' ') || name === prefix;
    });
    for (const m of matching.slice(0, 30)) {
      menus.push({
        name: m.name,
        type: m.type || '',
        securityKey: m.securityKey || null,
        displayText: m.displayText || '',
      });
    }
  }
  
  // Build R&S prompt mappings from RPC parameter data + file data
  const promptMappings = [];
  for (const file of files) {
    for (const field of (file.fields || [])) {
      if (field.fieldName) {
        promptMappings.push({
          prompt: `${field.fieldName}:`,
          fileNumber: file.fileNumber,
          fieldNumber: field.fieldNumber,
          fieldName: field.fieldName,
          dataType: field.dataType,
          required: field.required,
          description: field.description,
          source: 'schema',
        });
      }
    }
  }
  // Also derive prompts from RPC parameters
  for (const rpc of rpcs) {
    for (const param of (rpc.params || [])) {
      if (param.name) {
        promptMappings.push({
          prompt: `${param.name}:`,
          rpcName: rpc.name,
          paramName: param.name,
          paramType: param.type,
          required: param.required,
          source: 'rpc',
        });
      }
    }
  }
  
  const spec = {
    id: domain.id,
    name: domain.name,
    description: domain.description,
    vdlManual: domain.vdlManual,
    generatedAt: new Date().toISOString(),
    files: {
      count: files.length,
      items: files,
    },
    rpcs: {
      count: rpcs.length,
      items: rpcs,
    },
    menus: {
      count: menus.length,
      items: menus,
    },
    promptMappings: {
      count: promptMappings.length,
      items: promptMappings,
    },
  };
  
  const outPath = join(OUT_DIR, `${domain.id}.json`);
  writeFileSync(outPath, JSON.stringify(spec, null, 2), 'utf-8');
  console.log(`  Files: ${files.length}, RPCs: ${rpcs.length}, Menus: ${menus.length}, Prompts: ${promptMappings.length}`);
  console.log(`  Written: ${outPath}`);
}

console.log('\n=== Admin specs extraction complete ===');
