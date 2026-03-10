/**
 * rpcRegistry.ts -- Single authoritative mapping of every RPC used by VistA-Evolved.
 *
 * Every callRpc / safeCallRpc / callRpcWithList invocation in the codebase MUST
 * reference an RPC that is either:
 *   (a) present in the Vivian index (data/vista/vivian/rpc_index.json), OR
 *   (b) explicitly allowlisted in RPC_EXCEPTIONS below with a required explanation.
 *
 * The verify script (scripts/verify-phase41-rpc-catalog.ps1) enforces this as a
 * hard gate: unknown RPCs = build FAIL.
 *
 * Tags: "read" (no side effects), "write" (mutates VistA data), "auth" (broker protocol).
 */

export type RpcTag = 'read' | 'write' | 'auth' | 'custom';

export interface RpcDefinition {
  /** Canonical RPC name exactly as registered in File 8994 */
  name: string;
  /** Functional domain */
  domain: string;
  /** Side-effect classification */
  tag: RpcTag;
  /** Brief description */
  description: string;
}

/* ------------------------------------------------------------------ */
/*  MASTER REGISTRY                                                    */
/*  Keep sorted by domain, then name.                                 */
/* ------------------------------------------------------------------ */
export const RPC_REGISTRY: RpcDefinition[] = [
  // --- Auth / Broker Protocol ---
  {
    name: 'XUS SIGNON SETUP',
    domain: 'auth',
    tag: 'auth',
    description: 'Broker sign-on handshake',
  },
  {
    name: 'XUS AV CODE',
    domain: 'auth',
    tag: 'auth',
    description: 'Access/verify code authentication',
  },
  {
    name: 'XWB CREATE CONTEXT',
    domain: 'auth',
    tag: 'auth',
    description: 'Set application context',
  },
  {
    name: 'XUS GET USER INFO',
    domain: 'auth',
    tag: 'auth',
    description: 'Get authenticated user metadata',
  },

  // --- Allergies ---
  { name: 'ORQQAL LIST', domain: 'allergies', tag: 'read', description: 'List patient allergies' },
  {
    name: 'ORWDAL32 ALLERGY MATCH',
    domain: 'allergies',
    tag: 'read',
    description: 'Search allergy reactants',
  },
  {
    name: 'ORWDAL32 SAVE ALLERGY',
    domain: 'allergies',
    tag: 'write',
    description: 'Save new allergy',
  },

  // --- Billing / PCE ---
  {
    name: 'IBCN INSURANCE QUERY',
    domain: 'billing',
    tag: 'read',
    description: 'Query patient insurance',
  },
  {
    name: 'IBD GET ALL PCE DATA',
    domain: 'billing',
    tag: 'read',
    description: 'Get all PCE encounter data',
  },
  {
    name: 'IBD GET FORMSPEC',
    domain: 'billing',
    tag: 'read',
    description: 'Get encounter form specification',
  },
  {
    name: 'IBARXM QUERY ONLY',
    domain: 'billing',
    tag: 'read',
    description: 'Pharmacy billing query',
  },
  {
    name: 'IBO MT LTC COPAY QUERY',
    domain: 'billing',
    tag: 'read',
    description: 'Means Test / LTC copay query',
  },
  { name: 'ORWPCE VISIT', domain: 'billing', tag: 'read', description: 'Get PCE visit data' },
  { name: 'ORWPCE GET VISIT', domain: 'billing', tag: 'read', description: 'Get detailed visit' },
  { name: 'ORWPCE DIAG', domain: 'billing', tag: 'read', description: 'Get PCE diagnoses' },
  { name: 'ORWPCE PROC', domain: 'billing', tag: 'read', description: 'Get PCE procedures' },
  { name: 'ORWPCE PCE4NOTE', domain: 'billing', tag: 'read', description: 'Get PCE data for note' },
  { name: 'ORWPCE HASVISIT', domain: 'billing', tag: 'read', description: 'Check if visit exists' },
  {
    name: 'ORWPCE GETSVC',
    domain: 'billing',
    tag: 'read',
    description: 'Get service connected data',
  },
  { name: 'ORWPCE4 LEX', domain: 'billing', tag: 'read', description: 'Lexicon search (PCE)' },
  { name: 'ORWPCE LEXCODE', domain: 'billing', tag: 'read', description: 'Get lexicon code' },
  {
    name: 'ORWPCE ACTIVE CODE',
    domain: 'billing',
    tag: 'read',
    description: 'Check if code is active',
  },
  { name: 'ORWPCE SAVE', domain: 'billing', tag: 'write', description: 'Save PCE encounter' },

  // --- Consults ---
  {
    name: 'ORQQCN LIST',
    domain: 'consults',
    tag: 'read',
    description: 'List consults for patient',
  },
  { name: 'ORQQCN DETAIL', domain: 'consults', tag: 'read', description: 'Get consult detail' },
  {
    name: 'ORQQCN2 MED RESULTS',
    domain: 'consults',
    tag: 'write',
    description: 'Complete consult with results',
  },

  // --- Custom VE RPCs ---
  {
    name: 'VE LIST RPCS',
    domain: 'catalog',
    tag: 'custom',
    description: 'List all registered RPCs from File 8994',
  },
  {
    name: 'VE PROBLEM ADD',
    domain: 'problems',
    tag: 'custom',
    description: 'Add problem through native GMPL wrapper using lexicon-grounded fields',
  },
  {
    name: 'VE INTEROP HL7 LINKS',
    domain: 'interop',
    tag: 'custom',
    description: 'List HL7 logical links',
  },
  {
    name: 'VE INTEROP HL7 MSGS',
    domain: 'interop',
    tag: 'custom',
    description: 'List recent HL7 messages',
  },
  {
    name: 'VE INTEROP HLO STATUS',
    domain: 'interop',
    tag: 'custom',
    description: 'HLO application status',
  },
  {
    name: 'VE INTEROP QUEUE DEPTH',
    domain: 'interop',
    tag: 'custom',
    description: 'HL7 queue depths',
  },
  {
    name: 'VE INTEROP MSG LIST',
    domain: 'interop',
    tag: 'custom',
    description: 'List HL7 messages with filters',
  },
  {
    name: 'VE INTEROP MSG DETAIL',
    domain: 'interop',
    tag: 'custom',
    description: 'HL7 message metadata + segment summary',
  },

  // --- Imaging ---
  {
    name: 'MAG4 REMOTE PROCEDURE',
    domain: 'imaging',
    tag: 'read',
    description: 'Imaging remote procedure call',
  },
  {
    name: 'MAG4 PAT GET IMAGES',
    domain: 'imaging',
    tag: 'read',
    description: 'Get patient images list',
  },
  { name: 'MAGG PAT PHOTOS', domain: 'imaging', tag: 'read', description: 'Get patient photos' },
  {
    name: 'RA DETAILED REPORT',
    domain: 'imaging',
    tag: 'read',
    description: 'Radiology detailed report',
  },
  {
    name: 'MAG4 ADD IMAGE',
    domain: 'imaging',
    tag: 'write',
    description: 'Add image entry to VistA File 2005 (Phase 538: SIC capture)',
  },
  {
    name: 'MAG NEW SO ENTRY',
    domain: 'imaging',
    tag: 'write',
    description: 'Create new storage object entry for image capture',
  },
  {
    name: 'MAG4 IMAGE',
    domain: 'imaging',
    tag: 'read',
    description: 'Get image metadata from File 2005',
  },

  // --- Inbox ---
  {
    name: 'ORWORB UNSIG ORDERS',
    domain: 'inbox',
    tag: 'read',
    description: 'Get unsigned orders notifications',
  },
  {
    name: 'ORWORB FASTUSER',
    domain: 'inbox',
    tag: 'read',
    description: 'Get user notification info',
  },
  {
    name: 'ORB DELETE ALERT',
    domain: 'inbox',
    tag: 'write',
    description: 'Delete/acknowledge a VistA alert notification',
  },

  // --- Labs ---
  { name: 'ORWLRR INTERIM', domain: 'labs', tag: 'read', description: 'Interim lab results' },
  { name: 'ORWLRR ACK', domain: 'labs', tag: 'write', description: 'Acknowledge lab result' },
  { name: 'ORWLRR CHART', domain: 'labs', tag: 'read', description: 'Lab chart data' },
  { name: 'ORQQL DETAIL', domain: 'labs', tag: 'read', description: 'Lab order detail' },
  {
    name: 'ORWLR RECENTSIT',
    domain: 'labs',
    tag: 'read',
    description: 'Recent lab results by site',
  },
  { name: 'ORWLR CUMULATIVE', domain: 'labs', tag: 'read', description: 'Cumulative lab report' },
  { name: 'LR ORDER', domain: 'labs', tag: 'write', description: 'Place lab order' },
  {
    name: 'ORWLRR INTERIMG',
    domain: 'labs',
    tag: 'read',
    description: 'Interim lab results (imaging context)',
  },
  {
    name: 'ORWDLR32 ABBSPEC',
    domain: 'labs',
    tag: 'read',
    description: 'Lab order dialog abbrev specimen',
  },
  {
    name: 'ORWDLR32 ALLSAMP',
    domain: 'labs',
    tag: 'read',
    description: 'Lab order dialog all samples',
  },
  {
    name: 'ORWDLR32 ALLSPEC',
    domain: 'labs',
    tag: 'read',
    description: 'Lab order dialog all specimens',
  },
  { name: 'ORWDLR32 DEF', domain: 'labs', tag: 'read', description: 'Lab order dialog default' },
  {
    name: 'ORWDLR32 GET LAB TIMES',
    domain: 'labs',
    tag: 'read',
    description: 'Lab order dialog lab times',
  },
  {
    name: 'ORWDLR32 IC DEFAULT',
    domain: 'labs',
    tag: 'read',
    description: 'Lab order dialog IC default',
  },
  {
    name: 'ORWDLR32 IC VALID',
    domain: 'labs',
    tag: 'read',
    description: 'Lab order dialog IC valid',
  },
  {
    name: 'ORWDLR32 IMMED COLLECT',
    domain: 'labs',
    tag: 'read',
    description: 'Lab order dialog immediate collect',
  },
  {
    name: 'ORWDLR32 LAB COLL TIME',
    domain: 'labs',
    tag: 'read',
    description: 'Lab order dialog collection time',
  },
  { name: 'ORWDLR32 LOAD', domain: 'labs', tag: 'read', description: 'Lab order dialog load' },
  {
    name: 'ORWDLR32 MAXDAYS',
    domain: 'labs',
    tag: 'read',
    description: 'Lab order dialog max days',
  },
  {
    name: 'ORWDLR32 ONE SAMPLE',
    domain: 'labs',
    tag: 'read',
    description: 'Lab order dialog one sample',
  },
  {
    name: 'ORWDLR32 ONE SPECIMEN',
    domain: 'labs',
    tag: 'read',
    description: 'Lab order dialog one specimen',
  },
  { name: 'ORWDLR32 STOP', domain: 'labs', tag: 'read', description: 'Lab order dialog stop' },
  {
    name: 'ORWDLR33 FUTURE LAB COLLECTS',
    domain: 'labs',
    tag: 'read',
    description: 'Future lab collects',
  },
  {
    name: 'ORWDLR33 LASTTIME',
    domain: 'labs',
    tag: 'read',
    description: 'Lab last collection time',
  },
  { name: 'ORWDLR33 LC TO WC', domain: 'labs', tag: 'read', description: 'Lab collect to WC' },
  { name: 'ORWLRR ALLTESTS', domain: 'labs', tag: 'read', description: 'Lab all tests' },
  { name: 'ORWLRR ATESTS', domain: 'labs', tag: 'read', description: 'Lab atomic tests' },
  { name: 'ORWLRR ATG', domain: 'labs', tag: 'read', description: 'Lab atomic test group' },
  { name: 'ORWLRR ATOMICS', domain: 'labs', tag: 'read', description: 'Lab atomics' },
  { name: 'ORWLRR CHEMTEST', domain: 'labs', tag: 'read', description: 'Lab chem test' },
  { name: 'ORWLRR GRID', domain: 'labs', tag: 'read', description: 'Lab grid' },
  { name: 'ORWLRR INFO', domain: 'labs', tag: 'read', description: 'Lab info' },
  { name: 'ORWLRR INTERIMS', domain: 'labs', tag: 'read', description: 'Lab interims' },
  { name: 'ORWLRR NEWOLD', domain: 'labs', tag: 'read', description: 'Lab new/old' },
  { name: 'ORWLRR PARAM', domain: 'labs', tag: 'read', description: 'Lab param' },
  { name: 'ORWLRR SPEC', domain: 'labs', tag: 'read', description: 'Lab spec' },
  { name: 'ORWLRR TG', domain: 'labs', tag: 'read', description: 'Lab test group' },
  { name: 'ORWLRR USERS', domain: 'labs', tag: 'read', description: 'Lab users' },
  { name: 'ORWLRR UTGA', domain: 'labs', tag: 'read', description: 'Lab UTGA' },
  { name: 'ORWLRR UTGD', domain: 'labs', tag: 'read', description: 'Lab UTGD' },
  { name: 'ORWLRR UTGR', domain: 'labs', tag: 'read', description: 'Lab UTGR' },

  // --- Medications ---
  {
    name: 'ORWPS ACTIVE',
    domain: 'medications',
    tag: 'read',
    description: 'Active medications list',
  },
  {
    name: 'ORWPS COVER',
    domain: 'medications',
    tag: 'read',
    description: 'Medications cover sheet',
  },
  { name: 'ORWPS DETAIL', domain: 'medications', tag: 'read', description: 'Medication detail' },
  { name: 'ORWORR GETTXT', domain: 'medications', tag: 'read', description: 'Order result text' },
  {
    name: 'ORWDXM AUTOACK',
    domain: 'medications',
    tag: 'write',
    description: 'Quick-order medication auto-acknowledge',
  },
  // Phase 578: ORWDPS/ORWPS order dialog RPCs (CPRS Delphi)
  { name: 'ORWDPS ALLSCHD', domain: 'medications', tag: 'read', description: 'All schedule types' },
  { name: 'ORWDPS1 CHK94', domain: 'medications', tag: 'read', description: 'Check 94' },
  { name: 'ORWDPS1 DFLTSPLY', domain: 'medications', tag: 'read', description: 'Default supply' },
  { name: 'ORWDPS1 DOSEALT', domain: 'medications', tag: 'read', description: 'Dose alternatives' },
  {
    name: 'ORWDPS1 DOWSCH',
    domain: 'medications',
    tag: 'read',
    description: 'Days of week schedule',
  },
  { name: 'ORWDPS1 FAILDEA', domain: 'medications', tag: 'read', description: 'DEA failure check' },
  { name: 'ORWDPS1 FORMALT', domain: 'medications', tag: 'read', description: 'Form alternatives' },
  { name: 'ORWDPS1 HASOIPI', domain: 'medications', tag: 'read', description: 'Has OIPI' },
  { name: 'ORWDPS1 HASROUTE', domain: 'medications', tag: 'read', description: 'Has route' },
  { name: 'ORWDPS1 IVDEA', domain: 'medications', tag: 'read', description: 'IV DEA check' },
  { name: 'ORWDPS1 LOCPICK', domain: 'medications', tag: 'read', description: 'Location picker' },
  { name: 'ORWDPS1 MAXDS', domain: 'medications', tag: 'read', description: 'Max dose' },
  { name: 'ORWDPS1 ODSLCT', domain: 'medications', tag: 'read', description: 'Orderable select' },
  {
    name: 'ORWDPS1 QOMEDALT',
    domain: 'medications',
    tag: 'read',
    description: 'QO med alternatives',
  },
  { name: 'ORWDPS1 SCHALL', domain: 'medications', tag: 'read', description: 'Schedule all' },
  { name: 'ORWDPS2 ADMIN', domain: 'medications', tag: 'read', description: 'Admin schedule' },
  { name: 'ORWDPS2 CHKGRP', domain: 'medications', tag: 'read', description: 'Check group' },
  { name: 'ORWDPS2 CHKPI', domain: 'medications', tag: 'read', description: 'Check PI' },
  { name: 'ORWDPS2 DAY2QTY', domain: 'medications', tag: 'read', description: 'Days to quantity' },
  { name: 'ORWDPS2 MAXREF', domain: 'medications', tag: 'read', description: 'Max refills' },
  {
    name: 'ORWDPS2 OISLCT',
    domain: 'medications',
    tag: 'read',
    description: 'Orderable item select',
  },
  { name: 'ORWDPS2 QOGRP', domain: 'medications', tag: 'read', description: 'QO group' },
  { name: 'ORWDPS2 QTY2DAY', domain: 'medications', tag: 'read', description: 'Quantity to days' },
  { name: 'ORWDPS2 REQST', domain: 'medications', tag: 'read', description: 'Request' },
  { name: 'ORWDPS2 SCHREQ', domain: 'medications', tag: 'read', description: 'Schedule request' },
  { name: 'ORWDPS32 ALLIVRTE', domain: 'medications', tag: 'read', description: 'All IV routes' },
  { name: 'ORWDPS32 ALLROUTE', domain: 'medications', tag: 'read', description: 'All routes' },
  { name: 'ORWDPS32 AUTH', domain: 'medications', tag: 'read', description: 'Auth check' },
  { name: 'ORWDPS32 AUTHNVA', domain: 'medications', tag: 'read', description: 'Auth NVA' },
  { name: 'ORWDPS32 DLGSLCT', domain: 'medications', tag: 'read', description: 'Dialog select' },
  { name: 'ORWDPS32 DRUGMSG', domain: 'medications', tag: 'read', description: 'Drug message' },
  {
    name: 'ORWDPS32 FORMALT',
    domain: 'medications',
    tag: 'read',
    description: 'Form alternatives',
  },
  { name: 'ORWDPS32 ISSPLY', domain: 'medications', tag: 'read', description: 'Is supply' },
  { name: 'ORWDPS32 IVAMT', domain: 'medications', tag: 'read', description: 'IV amount' },
  { name: 'ORWDPS32 MEDISIV', domain: 'medications', tag: 'read', description: 'Med is IV' },
  {
    name: 'ORWDPS32 OISLCT',
    domain: 'medications',
    tag: 'read',
    description: 'Orderable item select',
  },
  { name: 'ORWDPS32 SCSTS', domain: 'medications', tag: 'read', description: 'Schedule status' },
  { name: 'ORWDPS32 VALQTY', domain: 'medications', tag: 'read', description: 'Validate quantity' },
  { name: 'ORWDPS32 VALRATE', domain: 'medications', tag: 'read', description: 'Validate rate' },
  { name: 'ORWDPS32 VALROUTE', domain: 'medications', tag: 'read', description: 'Validate route' },
  { name: 'ORWDPS32 VALSCH', domain: 'medications', tag: 'read', description: 'Validate schedule' },
  {
    name: 'ORWDPS33 COMPLOC',
    domain: 'medications',
    tag: 'read',
    description: 'Compound location',
  },
  { name: 'ORWDPS33 GETADDFR', domain: 'medications', tag: 'read', description: 'Get add form' },
  { name: 'ORWDPS33 IVDOSFRM', domain: 'medications', tag: 'read', description: 'IV dose form' },
  { name: 'ORWDPS4 CPINFO', domain: 'medications', tag: 'read', description: 'CP info' },
  { name: 'ORWDPS4 CPLST', domain: 'medications', tag: 'read', description: 'CP list' },
  { name: 'ORWDPS4 IPOD4OP', domain: 'medications', tag: 'read', description: 'IPOD for OP' },
  { name: 'ORWDPS4 ISUDIV', domain: 'medications', tag: 'read', description: 'IS UDIV' },
  { name: 'ORWDPS4 UPDTDG', domain: 'medications', tag: 'read', description: 'Update dialog' },
  { name: 'ORWDPS5 ISVTP', domain: 'medications', tag: 'read', description: 'Is VTP' },
  { name: 'ORWDPS5 LESAPI', domain: 'medications', tag: 'read', description: 'LES API' },
  { name: 'ORWDPS5 LESGRP', domain: 'medications', tag: 'read', description: 'LES group' },
  { name: 'ORWPS MEDHIST', domain: 'medications', tag: 'read', description: 'Medication history' },
  { name: 'ORWPS REASON', domain: 'medications', tag: 'read', description: 'Reason' },
  { name: 'ORWPS1 NEWDLG', domain: 'medications', tag: 'read', description: 'New dialog' },
  { name: 'ORWPS1 PICKUP', domain: 'medications', tag: 'read', description: 'Pickup' },
  { name: 'ORWPS1 REFILL', domain: 'medications', tag: 'read', description: 'Refill' },

  // --- Notes / DC Summaries ---
  {
    name: 'TIU DOCUMENTS BY CONTEXT',
    domain: 'notes',
    tag: 'read',
    description: 'List documents by context',
  },
  {
    name: 'TIU CREATE RECORD',
    domain: 'notes',
    tag: 'write',
    description: 'Create new TIU record',
  },
  {
    name: 'TIU SET DOCUMENT TEXT',
    domain: 'notes',
    tag: 'write',
    description: 'Set document text body',
  },
  {
    name: 'TIU SET RECORD TEXT',
    domain: 'notes',
    tag: 'write',
    description: 'Set record text body',
  },
  { name: 'TIU GET RECORD TEXT', domain: 'notes', tag: 'read', description: 'Get record text' },
  // Phase 60: TIU notes parity additions
  {
    name: 'TIU SIGN RECORD',
    domain: 'notes',
    tag: 'write',
    description: 'Electronically sign TIU document',
  },
  {
    name: 'TIU LOCK RECORD',
    domain: 'notes',
    tag: 'write',
    description: 'Lock TIU document for editing/signing',
  },
  { name: 'TIU UNLOCK RECORD', domain: 'notes', tag: 'write', description: 'Unlock TIU document' },
  {
    name: 'TIU CREATE ADDENDUM RECORD',
    domain: 'notes',
    tag: 'write',
    description: 'Create addendum to TIU document',
  },
  {
    name: 'TIU REQUIRES COSIGNATURE',
    domain: 'notes',
    tag: 'read',
    description: 'Check if document requires cosignature',
  },
  {
    name: 'TIU PERSONAL TITLE LIST',
    domain: 'notes',
    tag: 'read',
    description: 'Get user personal note title list',
  },

  // --- Orders ---
  { name: 'ORWDX LOCK', domain: 'orders', tag: 'write', description: 'Lock patient for ordering' },
  {
    name: 'ORWDX UNLOCK',
    domain: 'orders',
    tag: 'write',
    description: 'Unlock patient after ordering',
  },
  { name: 'ORWDX SAVE', domain: 'orders', tag: 'write', description: 'Save order' },
  { name: 'ORWDXA DC', domain: 'orders', tag: 'write', description: 'Discontinue order' },
  { name: 'ORWDXA FLAG', domain: 'orders', tag: 'write', description: 'Flag order' },
  {
    name: 'ORWDXA COMPLETE',
    domain: 'orders',
    tag: 'write',
    description: 'Complete order (IEN 396 in VEHU)',
  },
  {
    name: 'ORWDXA HOLD',
    domain: 'orders',
    tag: 'write',
    description: 'Hold order (IEN 388 in VEHU)',
  },
  { name: 'ORWDXA VERIFY', domain: 'orders', tag: 'write', description: 'Verify order' },
  // Phase 59: CPOE parity additions
  {
    name: 'ORWORR AGET',
    domain: 'orders',
    tag: 'read',
    description: 'Get active orders by display group',
  },
  {
    name: 'ORWORR GETBYIFN',
    domain: 'orders',
    tag: 'read',
    description: 'Get order detail by internal entry number',
  },
  {
    name: 'ORWOR1 SIG',
    domain: 'orders',
    tag: 'write',
    description: 'Electronically sign order(s)',
  },
  {
    name: 'ORWDXC ACCEPT',
    domain: 'orders',
    tag: 'read',
    description: 'Accept/get order check results',
  },
  {
    name: 'ORWDXC DISPLAY',
    domain: 'orders',
    tag: 'read',
    description: 'Display order check text',
  },
  {
    name: 'ORWDXC SAVECHK',
    domain: 'orders',
    tag: 'write',
    description: 'Save/acknowledge order checks',
  },
  {
    name: 'ORWDX WRLST',
    domain: 'orders',
    tag: 'read',
    description: 'Write/order list for patient',
  },

  // --- Patients ---
  {
    name: 'ORQPT DEFAULT PATIENT LIST',
    domain: 'patients',
    tag: 'read',
    description: 'Default patient list',
  },
  {
    name: 'ORQPT DEFAULT LIST SOURCE',
    domain: 'patients',
    tag: 'read',
    description: 'Default patient list source configuration',
  },
  { name: 'ORWPT LIST ALL', domain: 'patients', tag: 'read', description: 'Search all patients' },
  {
    name: 'ORWPT SELECT',
    domain: 'patients',
    tag: 'read',
    description: 'Select patient demographics',
  },
  {
    name: 'ORWPT ID INFO',
    domain: 'patients',
    tag: 'read',
    description: 'Patient ID info (SSN, DOB, etc.)',
  },
  {
    name: 'ORWPT16 ID INFO',
    domain: 'patients',
    tag: 'read',
    description: 'Extended patient ID info',
  },

  // --- Problems ---
  { name: 'ORQQPL PROBLEM LIST', domain: 'problems', tag: 'read', description: 'Get problem list' },
  { name: 'ORQQPL4 LEX', domain: 'problems', tag: 'read', description: 'ICD/Lexicon search' },
  { name: 'ORQQPL ADD SAVE', domain: 'problems', tag: 'write', description: 'Add problem' },
  {
    name: 'GMPL PROB LIST',
    domain: 'problems',
    tag: 'read',
    description: 'GMPL problem list by status',
  },
  {
    name: 'GMPL ADD SAVE',
    domain: 'problems',
    tag: 'write',
    description: 'GMPL add and save problem',
  },
  { name: 'ORQQPL EDIT SAVE', domain: 'problems', tag: 'write', description: 'Edit problem' },
  {
    name: 'ORWCH PROBLEM LIST',
    domain: 'problems',
    tag: 'read',
    description: 'Chart problem list',
  },

  // --- Remote Data ---
  {
    name: 'ORWCIRN FACILITIES',
    domain: 'remote',
    tag: 'read',
    description: 'Remote facility list',
  },

  // --- Reports ---
  {
    name: 'ORWRP REPORT LISTS',
    domain: 'reports',
    tag: 'read',
    description: 'Available report lists',
  },
  { name: 'ORWRP REPORT TEXT', domain: 'reports', tag: 'read', description: 'Get report text' },
  {
    name: 'ORWRP COLUMN HEADERS',
    domain: 'reports',
    tag: 'read',
    description: 'Report column headers',
  },
  {
    name: 'ORWRP GET DEFAULT PRINTER',
    domain: 'reports',
    tag: 'read',
    description: 'Get default printer',
  },
  {
    name: 'ORWRP LAB REPORT LISTS',
    domain: 'reports',
    tag: 'read',
    description: 'Lab report lists',
  },
  {
    name: 'ORWRP PRINT LAB REMOTE',
    domain: 'reports',
    tag: 'read',
    description: 'Print lab remote',
  },
  {
    name: 'ORWRP PRINT LAB REPORTS',
    domain: 'reports',
    tag: 'read',
    description: 'Print lab reports',
  },
  {
    name: 'ORWRP PRINT REMOTE REPORT',
    domain: 'reports',
    tag: 'read',
    description: 'Print remote report',
  },
  { name: 'ORWRP PRINT REPORT', domain: 'reports', tag: 'read', description: 'Print report' },
  { name: 'ORWRP PRINT V REPORT', domain: 'reports', tag: 'read', description: 'Print V report' },
  {
    name: 'ORWRP PRINT WINDOWS LAB REMOTE',
    domain: 'reports',
    tag: 'read',
    description: 'Print Windows lab remote',
  },
  {
    name: 'ORWRP PRINT WINDOWS REMOTE',
    domain: 'reports',
    tag: 'read',
    description: 'Print Windows remote',
  },
  {
    name: 'ORWRP PRINT WINDOWS REPORT',
    domain: 'reports',
    tag: 'read',
    description: 'Print Windows report',
  },
  {
    name: 'ORWRP SAVE DEFAULT PRINTER',
    domain: 'reports',
    tag: 'write',
    description: 'Save default printer',
  },
  {
    name: 'ORWRP WINPRINT DEFAULT',
    domain: 'reports',
    tag: 'read',
    description: 'Winprint default',
  },
  {
    name: 'ORWRP WINPRINT LAB REPORTS',
    domain: 'reports',
    tag: 'read',
    description: 'Winprint lab reports',
  },
  {
    name: 'ORWRP1 LISTNUTR',
    domain: 'reports',
    tag: 'read',
    description: 'List nutrition reports',
  },
  { name: 'ORWRP2 COMPABV', domain: 'reports', tag: 'read', description: 'Report comp above' },
  { name: 'ORWRP2 COMPDISP', domain: 'reports', tag: 'read', description: 'Report comp display' },
  { name: 'ORWRP2 GETLKUP', domain: 'reports', tag: 'read', description: 'Report lookup get' },
  {
    name: 'ORWRP2 HS COMP FILES',
    domain: 'reports',
    tag: 'read',
    description: 'HS component files',
  },
  {
    name: 'ORWRP2 HS COMPONENT SUBS',
    domain: 'reports',
    tag: 'read',
    description: 'HS component subs',
  },
  { name: 'ORWRP2 HS COMPONENTS', domain: 'reports', tag: 'read', description: 'HS components' },
  { name: 'ORWRP2 HS FILE LOOKUP', domain: 'reports', tag: 'read', description: 'HS file lookup' },
  { name: 'ORWRP2 HS REPORT TEXT', domain: 'reports', tag: 'read', description: 'HS report text' },
  { name: 'ORWRP2 HS SUBITEMS', domain: 'reports', tag: 'read', description: 'HS subitems' },
  { name: 'ORWRP2 SAVLKUP', domain: 'reports', tag: 'write', description: 'Report lookup save' },
  { name: 'ORWRP3 EXPAND COLUMNS', domain: 'reports', tag: 'read', description: 'Expand columns' },
  { name: 'ORWRP4 HDR MODIFY', domain: 'reports', tag: 'read', description: 'Header modify' },

  // --- Surgery ---
  { name: 'ORWSR LIST', domain: 'surgery', tag: 'read', description: 'Surgery case list' },
  { name: 'ORWSR RPTLIST', domain: 'surgery', tag: 'read', description: 'Surgery report list' },
  { name: 'ORWSR CASELIST', domain: 'surgery', tag: 'read', description: 'Surgery case list' },
  {
    name: 'ORWSR GET SURG CONTEXT',
    domain: 'surgery',
    tag: 'read',
    description: 'Get surgery context',
  },
  { name: 'ORWSR ONECASE', domain: 'surgery', tag: 'read', description: 'Surgery one case' },
  { name: 'ORWSR OPTOP', domain: 'surgery', tag: 'read', description: 'Surgery optop' },
  {
    name: 'ORWSR SAVE SURG CONTEXT',
    domain: 'surgery',
    tag: 'write',
    description: 'Save surgery context',
  },
  {
    name: 'ORWSR SHOW OPTOP WHEN SIGNING',
    domain: 'surgery',
    tag: 'read',
    description: 'Show optop when signing',
  },
  { name: 'ORWSR SHOW SURG TAB', domain: 'surgery', tag: 'read', description: 'Show surgery tab' },

  // --- Vitals ---
  {
    name: 'GMV V/M ALLDATA',
    domain: 'vitals',
    tag: 'read',
    description: 'All vitals/measurements data',
  },
  { name: 'GMV ADD VM', domain: 'vitals', tag: 'write', description: 'Add vital measurement' },
  { name: 'ORQQVI VITALS', domain: 'vitals', tag: 'read', description: 'Get patient vitals' },
  {
    name: 'ORQQVI VITALS FOR DATE RANGE',
    domain: 'vitals',
    tag: 'read',
    description: 'Vitals for date range (shift-based nursing view)',
  },

  // --- ADT / Inpatient (Phase 67: VistA-first ADT + inpatient lists) ---
  { name: 'ORQPT WARDS', domain: 'adt', tag: 'read', description: 'List all wards' },
  {
    name: 'ORQPT WARD PATIENTS',
    domain: 'adt',
    tag: 'read',
    description: 'Census: patients on a ward',
  },
  {
    name: 'ORQPT PROVIDER PATIENTS',
    domain: 'adt',
    tag: 'read',
    description: 'Provider inpatient list',
  },
  { name: 'ORQPT TEAMS', domain: 'adt', tag: 'read', description: 'List available teams' },
  { name: 'ORQPT TEAM PATIENTS', domain: 'adt', tag: 'read', description: 'Team patient list' },
  {
    name: 'ORQPT SPECIALTIES',
    domain: 'adt',
    tag: 'read',
    description: 'List treating specialties',
  },
  {
    name: 'ORQPT SPECIALTY PATIENTS',
    domain: 'adt',
    tag: 'read',
    description: 'Specialty patient list',
  },
  { name: 'ORWU1 NEWLOC', domain: 'adt', tag: 'read', description: 'Location search/lookup' },
  {
    name: 'ORWPT16 ADMITLST',
    domain: 'adt',
    tag: 'read',
    description: 'Patient admission history list',
  },

  // --- Phase 137: ZVEADT custom RPCs (expected missing until ZVEADT.m installed) ---
  {
    name: 'ZVEADT WARDS',
    domain: 'adt',
    tag: 'read',
    description: 'Ward census with bed counts (custom)',
  },
  {
    name: 'ZVEADT BEDS',
    domain: 'adt',
    tag: 'read',
    description: 'Bed-level occupancy for a ward (custom)',
  },
  {
    name: 'ZVEADT MVHIST',
    domain: 'adt',
    tag: 'read',
    description: 'Patient movement history from File 405 (custom)',
  },

  // --- Clinical Reminders (Phase 78: VistA-first reminder evaluation) ---
  {
    name: 'ORQQPX REMINDERS LIST',
    domain: 'reminders',
    tag: 'read',
    description: 'Evaluate clinical reminders for patient (due/applicable list)',
  },
  {
    name: 'ORQQPX REMINDER DETAIL',
    domain: 'reminders',
    tag: 'read',
    description: 'Detailed info for a single clinical reminder',
  },
  {
    name: 'PXRM REMINDER INQUIRY',
    domain: 'reminders',
    tag: 'read',
    description: 'Full reminder inquiry text from PXRM package',
  },

  // --- Immunizations (Phase 65: VistA-first immunization history) ---
  {
    name: 'ORQQPX IMMUN LIST',
    domain: 'immunizations',
    tag: 'read',
    description: 'Patient immunization history list',
  },
  {
    name: 'PXVIMM IMM SHORT LIST',
    domain: 'immunizations',
    tag: 'read',
    description: 'Immunization type picker (short list)',
  },
  {
    name: 'PX SAVE DATA',
    domain: 'immunizations',
    tag: 'write',
    description: 'Save PCE encounter/immunization data (IEN 3430 in VEHU)',
  },

  // --- PSB/BCMA RPCs confirmed in VEHU File 8994 ---
  {
    name: 'PSB ALLERGY',
    domain: 'nursing',
    tag: 'read',
    description: 'BCMA allergy check at med admin time (IEN 1278 in VEHU)',
  },
  {
    name: 'PSB VALIDATE ORDER',
    domain: 'nursing',
    tag: 'read',
    description: 'BCMA order validation at scan time (IEN 646 in VEHU)',
  },

  // --- Scheduling writes (confirmed in VEHU File 8994) ---
  {
    name: 'SDEC APPADD',
    domain: 'scheduling',
    tag: 'write',
    description: 'SDES appointment create (IEN 3676 in VEHU)',
  },

  // --- Messaging (Phase 70: ZVEMSGR.m MailMan RPC bridge) ---
  {
    name: 'ORQQXMB MAIL GROUPS',
    domain: 'messaging',
    tag: 'read',
    description: 'List MailMan mail groups for recipient selection',
  },
  {
    name: 'ZVE MAIL FOLDERS',
    domain: 'messaging',
    tag: 'read',
    description: 'List MailMan baskets/folders with counts (ZVEMSGR.m)',
  },
  {
    name: 'ZVE MAIL LIST',
    domain: 'messaging',
    tag: 'read',
    description: 'List messages in a MailMan basket (ZVEMSGR.m)',
  },
  {
    name: 'ZVE MAIL GET',
    domain: 'messaging',
    tag: 'read',
    description: 'Read MailMan message header+body+recipients (ZVEMSGR.m)',
  },
  {
    name: 'ZVE MAIL SEND',
    domain: 'messaging',
    tag: 'write',
    description: 'Send MailMan message via XMXSEND with inline delivery (ZVEMSGR.m)',
  },
  {
    name: 'ZVE MAIL MANAGE',
    domain: 'messaging',
    tag: 'write',
    description: 'Mark read/delete/move MailMan message (ZVEMSGR.m)',
  },
  {
    name: 'ORWPT CLINRNG',
    domain: 'messaging',
    tag: 'read',
    description: 'Clinician range lookup for message recipient search (File #200)',
  },
  {
    name: 'XM SEND MSG',
    domain: 'messaging',
    tag: 'write',
    description: 'Send VistA MailMan message via standard kernel API',
  },
  {
    name: 'XM GET MAIL',
    domain: 'messaging',
    tag: 'read',
    description: 'Get MailMan messages for current user via standard kernel API',
  },

  // --- Scheduling (Phase 37C: VistA scheduling adapter, enhanced Phase 123) ---
  {
    name: 'ORWCV VST',
    domain: 'scheduling',
    tag: 'read',
    description: 'Cover sheet visit list for patient (VISIT #9000010)',
  },
  {
    name: 'SDOE LIST ENCOUNTERS FOR PAT',
    domain: 'scheduling',
    tag: 'read',
    description: 'List encounters/appointments for patient',
  },
  {
    name: 'SD W/L RETRIVE HOSP LOC(#44)',
    domain: 'scheduling',
    tag: 'read',
    description: 'Retrieve hospital locations for scheduling',
  },
  {
    name: 'SD W/L RETRIVE PERSON(200)',
    domain: 'scheduling',
    tag: 'read',
    description: 'Retrieve person file entries for scheduling',
  },
  {
    name: 'SDOE LIST ENCOUNTERS FOR DATES',
    domain: 'scheduling',
    tag: 'read',
    description: 'List encounters for date range',
  },
  // Phase 123: SD* integration pack -- new RPCs
  {
    name: 'SDOE GET GENERAL DATA',
    domain: 'scheduling',
    tag: 'read',
    description: 'Get encounter general data fields (date, clinic, type)',
  },
  {
    name: 'SDOE GET PROVIDERS',
    domain: 'scheduling',
    tag: 'read',
    description: 'Get providers assigned to an encounter',
  },
  {
    name: 'SDOE GET DIAGNOSES',
    domain: 'scheduling',
    tag: 'read',
    description: 'Get diagnoses associated with an encounter',
  },
  {
    name: 'SD W/L CREATE FILE',
    domain: 'scheduling',
    tag: 'write',
    description: 'Create wait-list entry in VistA SD package',
  },
  {
    name: 'SD W/L RETRIVE FULL DATA',
    domain: 'scheduling',
    tag: 'read',
    description: 'Retrieve full wait-list data',
  },
  // Phase 131: CPRS + SDVW RPCs
  {
    name: 'ORWPT APPTLST',
    domain: 'scheduling',
    tag: 'read',
    description: 'CPRS cover sheet appointment list',
  },
  {
    name: 'SDVW MAKE APPT API APP',
    domain: 'scheduling',
    tag: 'write',
    description: 'Real appointment creation via SDVW HL7 messaging',
  },
  {
    name: 'SDVW SDAPI APP',
    domain: 'scheduling',
    tag: 'read',
    description: 'SDVW appointment list API',
  },
  // Phase 131: SD W/L reference data RPCs
  {
    name: 'SD W/L PRIORITY',
    domain: 'scheduling',
    tag: 'read',
    description: 'Wait-list priority reference data',
  },
  {
    name: 'SD W/L TYPE',
    domain: 'scheduling',
    tag: 'read',
    description: 'Wait-list type reference data',
  },
  {
    name: 'SD W/L CURRENT STATUS',
    domain: 'scheduling',
    tag: 'read',
    description: 'Wait-list current status reference data',
  },
  // Phase 147: SDES scheduling depth RPCs
  {
    name: 'SDES GET APPTS BY PATIENT DFN3',
    domain: 'scheduling',
    tag: 'read',
    description: 'SDES patient appointment list by DFN',
  },
  {
    name: 'SDES GET CLIN AVAILABILITY',
    domain: 'scheduling',
    tag: 'read',
    description: 'SDES clinic availability slots',
  },
  {
    name: 'SDES GET APPT TYPES',
    domain: 'scheduling',
    tag: 'read',
    description: 'SDES appointment types from File 409.1',
  },
  {
    name: 'SDES GET CANCEL REASONS',
    domain: 'scheduling',
    tag: 'read',
    description: 'SDES cancellation reasons',
  },
  {
    name: 'SDES GET RESOURCE BY CLINIC',
    domain: 'scheduling',
    tag: 'read',
    description: 'SDES clinic resource/schedule info',
  },
  {
    name: 'SDES GET CLINIC INFO2',
    domain: 'scheduling',
    tag: 'read',
    description: 'SDES detailed clinic info from File 44',
  },
  {
    name: 'SDES GET APPT BY APPT IEN',
    domain: 'scheduling',
    tag: 'read',
    description: 'SDES single appointment detail by IEN (truth gate)',
  },
  {
    name: 'SDES CREATE APPOINTMENTS',
    domain: 'scheduling',
    tag: 'write',
    description: 'SDES direct appointment booking',
  },
  {
    name: 'SDES CANCEL APPOINTMENT 2',
    domain: 'scheduling',
    tag: 'write',
    description: 'SDES appointment cancellation',
  },
  {
    name: 'SDES CHECKIN',
    domain: 'scheduling',
    tag: 'write',
    description: 'SDES patient check-in',
  },
  {
    name: 'SDES CHECKOUT',
    domain: 'scheduling',
    tag: 'write',
    description: 'SDES patient checkout',
  },

  // --- Scheduling Recall/Reminder (Phase 539: Scheduling Parity vs VSE) ---
  {
    name: 'SD RECALL LIST',
    domain: 'scheduling',
    tag: 'read',
    description: 'List recall reminders for patient from File 403.5',
  },
  {
    name: 'SD RECALL GET',
    domain: 'scheduling',
    tag: 'read',
    description: 'Get recall reminder detail from File 403.5',
  },
  {
    name: 'SDES GET RECALL ENTRIES',
    domain: 'scheduling',
    tag: 'read',
    description: 'SDES recall/reminder entries for patient',
  },
  {
    name: 'SD RECALL DATE CHECK',
    domain: 'scheduling',
    tag: 'read',
    description: 'Check recall compliance/overdue status',
  },

  // --- Mental Health Assessment (Phase 535: MHA v1 instrument engine) ---
  {
    name: 'YTT GET INSTRUMENT',
    domain: 'mental-health',
    tag: 'read',
    description: 'Fetch MH instrument definition (questions, scoring rules) from File 601.72',
  },
  {
    name: 'YTQZ LISTTESTS',
    domain: 'mental-health',
    tag: 'read',
    description: 'List available MH tests/instruments from File 601.71',
  },
  {
    name: 'YTT SAVE RESULTS',
    domain: 'mental-health',
    tag: 'write',
    description: 'Store completed instrument results to File 601.84',
  },
  {
    name: 'YTQZ RESULTLIST',
    domain: 'mental-health',
    tag: 'read',
    description: 'Get historical MH results for a patient from File 601.84',
  },
  {
    name: 'YTQZ DETAILLIST',
    domain: 'mental-health',
    tag: 'read',
    description: 'Get detailed results for a specific MH administration',
  },

  // --- Clinical Procedures / Medicine (Phase 537: CP/MD v1) ---
  {
    name: 'MD CLIO',
    domain: 'clinical-procedures',
    tag: 'read',
    description: 'Primary Clinical Procedures CliO engine RPC (File 702)',
  },
  {
    name: 'MD TMDPROCEDURE',
    domain: 'clinical-procedures',
    tag: 'read',
    description: 'Procedure management for CP studies',
  },
  {
    name: 'MD TMDPATIENT',
    domain: 'clinical-procedures',
    tag: 'read',
    description: 'Patient context for CP/Medicine data',
  },
  {
    name: 'MD TMDNOTE',
    domain: 'clinical-procedures',
    tag: 'write',
    description: 'TIU note linking for CP studies',
  },
  {
    name: 'MD TMDRECORDID',
    domain: 'clinical-procedures',
    tag: 'read',
    description: 'FileMan CRUD for CP records (File 702)',
  },
  {
    name: 'MD TMDOUTPUT',
    domain: 'clinical-procedures',
    tag: 'read',
    description: 'Report output for CP results',
  },
  {
    name: 'MD TMDCIDC',
    domain: 'clinical-procedures',
    tag: 'read',
    description: 'Procedures+diagnoses for CP clinics',
  },
  {
    name: 'MD TMDLEX',
    domain: 'clinical-procedures',
    tag: 'read',
    description: 'CPT/ICD lexicon search for CP',
  },
  {
    name: 'MD TMDWIDGET',
    domain: 'clinical-procedures',
    tag: 'read',
    description: 'Widget data for CP display',
  },
  {
    name: 'MD UTILITIES',
    domain: 'clinical-procedures',
    tag: 'read',
    description: 'MD package utility functions',
  },
  {
    name: 'ORQQCN ASSIGNABLE MED RESULTS',
    domain: 'clinical-procedures',
    tag: 'read',
    description: 'Medicine results attachable to consult',
  },
  {
    name: 'ORQQCN ATTACH MED RESULTS',
    domain: 'clinical-procedures',
    tag: 'write',
    description: 'Attach medicine result to consult',
  },
  {
    name: 'ORQQCN GET MED RESULT DETAILS',
    domain: 'clinical-procedures',
    tag: 'read',
    description: 'Detail of a medicine result',
  },
  {
    name: 'TIU IS THIS A CLINPROC?',
    domain: 'clinical-procedures',
    tag: 'read',
    description: 'Check if TIU title is under CP class',
  },
  {
    name: 'TIU IDENTIFY CLINPROC CLASS',
    domain: 'clinical-procedures',
    tag: 'read',
    description: 'Get CP class IEN from TIU',
  },

  // --- Admin: User Management (ZVEUSER.m) ---
  { name: 'VE USER LIST', domain: 'admin-users', tag: 'read', description: 'List users from File #200' },
  { name: 'VE USER DETAIL', domain: 'admin-users', tag: 'read', description: 'Get user detail from File #200' },
  { name: 'VE KEY LIST', domain: 'admin-users', tag: 'read', description: 'List security keys from File #19.1' },
  { name: 'VE MENU LIST', domain: 'admin-users', tag: 'read', description: 'List menu options from File #19' },

  // --- Admin: Facility Setup (ZVEFAC.m) ---
  { name: 'VE INST LIST', domain: 'admin-facility', tag: 'read', description: 'List institutions from File #4' },
  { name: 'VE DIV LIST', domain: 'admin-facility', tag: 'read', description: 'List divisions from File #40.8' },
  { name: 'VE SVC LIST', domain: 'admin-facility', tag: 'read', description: 'List services/sections from File #49' },
  { name: 'VE STOP LIST', domain: 'admin-facility', tag: 'read', description: 'List stop codes from File #40.7' },
  { name: 'VE SPEC LIST', domain: 'admin-facility', tag: 'read', description: 'List specialties from File #42.4' },
  { name: 'VE SITE PARM', domain: 'admin-facility', tag: 'read', description: 'Get kernel site parameters' },

  // --- Admin: Clinic Setup (ZVECLIN.m) ---
  { name: 'VE CLIN LIST', domain: 'admin-clinics', tag: 'read', description: 'List clinics from File #44' },
  { name: 'VE CLIN DETAIL', domain: 'admin-clinics', tag: 'read', description: 'Get clinic detail from File #44' },
  { name: 'VE APPT TYPES', domain: 'admin-clinics', tag: 'read', description: 'List appointment types from File #409.1' },

  // --- Admin: Ward/Bed (ZVEWARD.m) ---
  { name: 'VE WARD LIST', domain: 'admin-wards', tag: 'read', description: 'List wards from File #42' },
  { name: 'VE WARD DETAIL', domain: 'admin-wards', tag: 'read', description: 'Get ward detail from File #42' },
  { name: 'VE CENSUS', domain: 'admin-wards', tag: 'read', description: 'Get census counts by ward' },

  // --- Admin: Pharmacy (ZVEPHAR.m) ---
  { name: 'VE DRUG LIST', domain: 'admin-pharmacy', tag: 'read', description: 'List drugs from File #50' },
  { name: 'VE DRUG DETAIL', domain: 'admin-pharmacy', tag: 'read', description: 'Get drug detail from File #50' },
  { name: 'VE MED ROUTES', domain: 'admin-pharmacy', tag: 'read', description: 'List medication routes from File #51' },
  { name: 'VE MED SCHEDULES', domain: 'admin-pharmacy', tag: 'read', description: 'List medication schedules from File #51.1' },

  // --- Admin: Laboratory (ZVELAB.m) ---
  { name: 'VE LAB TEST LIST', domain: 'admin-lab', tag: 'read', description: 'List lab tests from File #60' },
  { name: 'VE LAB TEST DETAIL', domain: 'admin-lab', tag: 'read', description: 'Get lab test detail from File #60' },
  { name: 'VE LAB COLL SAMP', domain: 'admin-lab', tag: 'read', description: 'List collection samples from File #62' },
  { name: 'VE LAB URGENCY', domain: 'admin-lab', tag: 'read', description: 'List urgency types from File #62.05' },

  // --- Admin: Billing Config (ZVEBILL.m) ---
  { name: 'VE IB SITE', domain: 'admin-billing', tag: 'read', description: 'Get IB site parameters from File #350.9' },
  { name: 'VE INS LIST', domain: 'admin-billing', tag: 'read', description: 'List insurance companies from File #36' },
  { name: 'VE INS DETAIL', domain: 'admin-billing', tag: 'read', description: 'Get insurance company detail from File #36' },
  { name: 'VE CLAIM COUNT', domain: 'admin-billing', tag: 'read', description: 'Get claim counts from File #399' },

  // --- Admin: User Write RPCs (ZVEUSER.m) ---
  { name: 'VE USER EDIT', domain: 'admin-users', tag: 'write', description: 'Edit user fields in File #200' },
  { name: 'VE USER ADD KEY', domain: 'admin-users', tag: 'write', description: 'Add security key to user' },
  { name: 'VE USER REMOVE KEY', domain: 'admin-users', tag: 'write', description: 'Remove security key from user' },
  { name: 'VE USER DEACTIVATE', domain: 'admin-users', tag: 'write', description: 'Deactivate user account' },
  { name: 'VE USER REACTIVATE', domain: 'admin-users', tag: 'write', description: 'Reactivate user account' },

  // --- Admin: Clinic Write RPCs (ZVECLIN.m) ---
  { name: 'VE CLIN CREATE', domain: 'admin-clinics', tag: 'write', description: 'Create clinic in File #44' },
  { name: 'VE CLIN EDIT', domain: 'admin-clinics', tag: 'write', description: 'Edit clinic fields' },
  { name: 'VE CLIN TOGGLE', domain: 'admin-clinics', tag: 'write', description: 'Toggle clinic active/inactive' },

  // --- Admin: Ward Write RPCs (ZVEWARD.m) ---
  { name: 'VE WARD EDIT', domain: 'admin-wards', tag: 'write', description: 'Edit ward fields in File #42' },

  // --- Admin: Facility Write RPCs (ZVEFAC.m) ---
  { name: 'VE SVC CREATE', domain: 'admin-facility', tag: 'write', description: 'Create service/section in File #49' },
  { name: 'VE SVC EDIT', domain: 'admin-facility', tag: 'write', description: 'Edit service/section' },

  // --- Admin: Pharmacy Write RPCs (ZVEPHAR.m) ---
  { name: 'VE DRUG EDIT', domain: 'admin-pharmacy', tag: 'write', description: 'Edit drug fields in File #50' },

  // --- Admin: Lab Write RPCs (ZVELAB.m) ---
  { name: 'VE LAB TEST EDIT', domain: 'admin-lab', tag: 'write', description: 'Edit lab test fields in File #60' },

  // --- Admin: Billing Write RPCs (ZVEBILL.m) ---
  { name: 'VE INS CREATE', domain: 'admin-billing', tag: 'write', description: 'Create insurance company in File #36' },
  { name: 'VE INS EDIT', domain: 'admin-billing', tag: 'write', description: 'Edit insurance company' },

  // --- Admin: System Management RPCs ---
  { name: 'VE TASKMAN LIST', domain: 'admin-system', tag: 'read', description: 'List TaskMan tasks' },
  { name: 'VE ERROR TRAP', domain: 'admin-system', tag: 'read', description: 'List recent error trap entries' },
  { name: 'VE SYS STATUS', domain: 'admin-system', tag: 'read', description: 'System status information' },
  { name: 'VE PARAM LIST', domain: 'admin-system', tag: 'read', description: 'List parameters from File #8989.5' },
  { name: 'VE PARAM EDIT', domain: 'admin-system', tag: 'write', description: 'Edit parameter value' },

  // --- Admin: Radiology RPCs ---
  { name: 'VE RAD PROC LIST', domain: 'admin-radiology', tag: 'read', description: 'List radiology procedures' },
  { name: 'VE RAD PROC DETAIL', domain: 'admin-radiology', tag: 'read', description: 'Radiology procedure detail' },
  { name: 'VE RAD IMG LOCATIONS', domain: 'admin-radiology', tag: 'read', description: 'List imaging locations' },
  { name: 'VE RAD DIV PARAMS', domain: 'admin-radiology', tag: 'read', description: 'Radiology division parameters' },

  // --- Admin: Inventory RPCs ---
  { name: 'VE INV ITEM LIST', domain: 'admin-inventory', tag: 'read', description: 'List inventory items from File #441' },
  { name: 'VE INV ITEM DETAIL', domain: 'admin-inventory', tag: 'read', description: 'Inventory item detail' },
  { name: 'VE INV VENDOR LIST', domain: 'admin-inventory', tag: 'read', description: 'List vendors from File #445' },
  { name: 'VE INV PO LIST', domain: 'admin-inventory', tag: 'read', description: 'List purchase orders' },

  // --- Admin: Workforce/Credentialing RPCs ---
  { name: 'VE PROV LIST', domain: 'admin-workforce', tag: 'read', description: 'List providers with credentials' },
  { name: 'VE PROV DETAIL', domain: 'admin-workforce', tag: 'read', description: 'Provider credential detail' },
  { name: 'VE PERSON CLASS LIST', domain: 'admin-workforce', tag: 'read', description: 'List person classes' },

  // --- Admin: Quality Management RPCs ---
  { name: 'VE REMINDER LIST', domain: 'admin-quality', tag: 'read', description: 'List clinical reminders' },
  { name: 'VE REMINDER DETAIL', domain: 'admin-quality', tag: 'read', description: 'Reminder detail' },
  { name: 'VE QA SITE PARAMS', domain: 'admin-quality', tag: 'read', description: 'QA site parameters' },

  // --- Admin: Clinical Application Setup RPCs ---
  { name: 'VE ORDER SETS', domain: 'admin-clinical-app', tag: 'read', description: 'List order sets' },
  { name: 'VE CONSULT SERVICES', domain: 'admin-clinical-app', tag: 'read', description: 'List consult services' },
  { name: 'VE TIU DEFINITIONS', domain: 'admin-clinical-app', tag: 'read', description: 'List TIU document definitions' },
  { name: 'VE TIU TEMPLATES', domain: 'admin-clinical-app', tag: 'read', description: 'List TIU templates' },
  { name: 'VE HEALTH SUMMARY TYPES', domain: 'admin-clinical-app', tag: 'read', description: 'List health summary types' },

  // --- ADT Write RPCs (ZVEADTW.m) ---
  { name: 'VE ADT ADMIT', domain: 'adt', tag: 'write', description: 'Admit patient to ward via DGPM wrapper' },
  { name: 'VE ADT TRANSFER', domain: 'adt', tag: 'write', description: 'Transfer patient between wards' },
  { name: 'VE ADT DISCHARGE', domain: 'adt', tag: 'write', description: 'Discharge patient from ward' },
  { name: 'VE REGISTER PAT', domain: 'adt', tag: 'write', description: 'Register new patient in File #2' },

  // --- Nursing / eMAR RPCs (ZVENAS.m) ---
  { name: 'ZVENAS LIST', domain: 'nursing', tag: 'read', description: 'Nursing task list for patient' },
  { name: 'ZVENAS ASSESS', domain: 'nursing', tag: 'read', description: 'Nursing assessments from File #211' },
  { name: 'ZVENAS SAVE', domain: 'nursing', tag: 'write', description: 'Save nursing assessment' },
  { name: 'ZVENAS IOLIST', domain: 'nursing', tag: 'read', description: 'I/O summary from File #126' },
  { name: 'ZVENAS IOADD', domain: 'nursing', tag: 'write', description: 'Add I/O entry' },
  { name: 'ZVENAS MEDLOG', domain: 'nursing', tag: 'write', description: 'Record med administration to File #53.79 BCMA log' },
  { name: 'ZVENAS MEDLIST', domain: 'nursing', tag: 'read', description: 'Med admin history from File #53.79' },
  { name: 'ZVENAS BCSCAN', domain: 'nursing', tag: 'read', description: 'Barcode scan validation' },

  // --- Lab Write RPCs (ZVELABW.m) ---
  { name: 'VE LAB ORDER', domain: 'lab', tag: 'write', description: 'Place lab order in File #69' },
  { name: 'VE LAB VERIFY', domain: 'lab', tag: 'write', description: 'Verify lab result in File #63' },
  { name: 'VE LAB RESULT', domain: 'lab', tag: 'write', description: 'Enter lab result value in File #63' },
  { name: 'VE LAB COLLECT', domain: 'lab', tag: 'write', description: 'Log specimen collection event' },
  { name: 'VE LAB STATUS', domain: 'lab', tag: 'read', description: 'Lab order status query from File #100' },
  { name: 'VE LAB HISTORY', domain: 'lab', tag: 'read', description: 'Patient lab result history from File #63' },

  // --- Problem List Write RPCs (ZVEPLW.m) ---
  { name: 'VE PROBLEM ADD', domain: 'problems', tag: 'write', description: 'Add problem to File #9000011' },
  { name: 'VE PROBLEM EDIT', domain: 'problems', tag: 'write', description: 'Edit problem in File #9000011' },
  { name: 'VE PROBLEM REMOVE', domain: 'problems', tag: 'write', description: 'Inactivate problem in File #9000011' },
  { name: 'VE PROBLEM LIST', domain: 'problems', tag: 'read', description: 'Full problem list from File #9000011' },

  // --- Patient Registration RPCs (ZVEPATREG.m) ---
  { name: 'VE PAT REGISTER', domain: 'registration', tag: 'write', description: 'Create new patient in File #2' },
  { name: 'VE PAT DEMOG', domain: 'registration', tag: 'read', description: 'Get patient demographics from File #2' },
  { name: 'VE PAT UPDATE', domain: 'registration', tag: 'write', description: 'Update patient demographics in File #2' },
  { name: 'VE PAT SEARCH', domain: 'registration', tag: 'read', description: 'Search patients by name/SSN/DOB in File #2' },
  { name: 'VE PAT MERGE', domain: 'registration', tag: 'read', description: 'Duplicate detection for patient merge' },

  // --- Discharge Workflow RPCs (ZVEDISCH.m) ---
  { name: 'VE DISCHARGE FULL', domain: 'discharge', tag: 'write', description: 'Full discharge: ADT + summary + instructions' },
  { name: 'VE DISCHARGE INSTR', domain: 'discharge', tag: 'write', description: 'Discharge instructions via TIU note' },
  { name: 'VE DISCHARGE SUMM', domain: 'discharge', tag: 'write', description: 'Discharge summary TIU document' },
  { name: 'VE DISCHARGE FOLLOWUP', domain: 'discharge', tag: 'write', description: 'Schedule discharge follow-up' },

  // --- Medication Reconciliation RPCs (ZVEMEDREC.m) ---
  { name: 'VE MEDREC RECONCILE', domain: 'medrec', tag: 'write', description: 'Save medication reconciliation decision' },
  { name: 'VE MEDREC MEDLIST', domain: 'medrec', tag: 'read', description: 'Combined med list for reconciliation (File 100 + File 52)' },
  { name: 'VE MEDREC HISTORY', domain: 'medrec', tag: 'read', description: 'Reconciliation decision history' },
  { name: 'VE MEDREC OUTSRC', domain: 'medrec', tag: 'write', description: 'Record outside/community medication' },

  // --- E-Prescribing RPCs (ZVEERX.m) ---
  { name: 'VE ERX NEWRX', domain: 'pharmacy', tag: 'write', description: 'Create new outpatient prescription (File #52)' },
  { name: 'VE ERX RENEW', domain: 'pharmacy', tag: 'write', description: 'Renew existing prescription' },
  { name: 'VE ERX CANCEL', domain: 'pharmacy', tag: 'write', description: 'Cancel prescription' },
  { name: 'VE ERX DRUGSRCH', domain: 'pharmacy', tag: 'read', description: 'Drug formulary search (File #50)' },
  { name: 'VE ERX HISTORY', domain: 'pharmacy', tag: 'read', description: 'Prescription history (File #52)' },
  { name: 'VE ERX STATUS', domain: 'pharmacy', tag: 'read', description: 'Prescription status check' },

  // --- PCE/Encounter/Immunization RPCs (ZVEPCE.m) ---
  { name: 'VE PCE IMM GIVE', domain: 'immunizations', tag: 'write', description: 'Record immunization (File #9000010.11)' },
  { name: 'VE PCE IMM HIST', domain: 'immunizations', tag: 'read', description: 'Immunization history' },
  { name: 'VE PCE ENCOUNTER', domain: 'encounters', tag: 'write', description: 'Create encounter/visit (File #9000010)' },
  { name: 'VE PCE PROCEDURE', domain: 'encounters', tag: 'write', description: 'Record procedure (File #9000010.07)' },
  { name: 'VE PCE DIAGNOSIS', domain: 'encounters', tag: 'write', description: 'Record diagnosis (V POV)' },
  { name: 'VE PCE VISIT HIST', domain: 'encounters', tag: 'read', description: 'Visit history' },
];

/**
 * Exceptions: RPCs used in VistA-Evolved that are NOT in the Vivian index.
 * Each must have an explanation of why it exists outside the index.
 */
export const RPC_EXCEPTIONS: Array<{ name: string; reason: string }> = [
  {
    name: 'VE LIST RPCS',
    reason: 'Custom RPC installed by VistA-Evolved (ZVERPC.m) for File 8994 catalog listing',
  },
  {
    name: 'VE INTEROP HL7 LINKS',
    reason: 'Custom RPC installed by VistA-Evolved (ZVEMIOP.m) for HL7 telemetry',
  },
  {
    name: 'VE INTEROP HL7 MSGS',
    reason: 'Custom RPC installed by VistA-Evolved (ZVEMIOP.m) for HL7 telemetry',
  },
  {
    name: 'VE INTEROP HLO STATUS',
    reason: 'Custom RPC installed by VistA-Evolved (ZVEMIOP.m) for HLO status',
  },
  {
    name: 'VE INTEROP QUEUE DEPTH',
    reason: 'Custom RPC installed by VistA-Evolved (ZVEMIOP.m) for queue monitoring',
  },
  {
    name: 'VE INTEROP MSG LIST',
    reason: 'Custom RPC installed by VistA-Evolved (ZVEMIOP.m) for HL7 message listing (Phase 58)',
  },
  {
    name: 'VE INTEROP MSG DETAIL',
    reason: 'Custom RPC installed by VistA-Evolved (ZVEMIOP.m) for HL7 message detail (Phase 58)',
  },
  {
    name: 'ORWCH PROBLEM LIST',
    reason: 'Chart-specific problem list variant; may be absent from some Vivian snapshots',
  },
  {
    name: 'ORQQCN2 MED RESULTS',
    reason:
      'Consult med results RPC; present in CPRS source but absent from Vivian cross-reference',
  },
  {
    name: 'MAG4 REMOTE PROCEDURE',
    reason: 'VistA Imaging remote procedure; absent from Vivian (MAG4 package has 27 other RPCs)',
  },
  {
    name: 'RA DETAILED REPORT',
    reason: 'Radiology detailed report; absent from Vivian snapshot (RA package underrepresented)',
  },
  {
    name: 'ORWORB UNSIG ORDERS',
    reason:
      'Unsigned order notifications; Vivian has ORWORB UNSIG ORDERS FOLLOWUP but not this variant',
  },
  {
    name: 'ORB DELETE ALERT',
    reason: 'Alert acknowledgement/deletion; ORB package RPC for dismissing notifications',
  },
  {
    name: 'ORWLRR ACK',
    reason: 'Lab result acknowledgment; absent from Vivian (ORWLRR has 20 other RPCs)',
  },
  {
    name: 'TIU SET RECORD TEXT',
    reason:
      'TIU note text writer; absent from Vivian snapshot despite being core CPRS functionality',
  },
  {
    name: 'ORWCIRN FACILITIES',
    reason: 'Remote facility list; Vivian has ORWCIRN FACLIST but not this exact name variant',
  },
  {
    name: 'VE RCM PROVIDER INFO',
    reason:
      'Custom RPC installed by VistA-Evolved (ZVERCMP.m) for provider NPI + facility identifiers (Phase 42)',
  },
  {
    name: 'ZVE MAIL FOLDERS',
    reason:
      'Custom RPC installed by VistA-Evolved (ZVEMSGR.m) for MailMan basket listing (Phase 70)',
  },
  {
    name: 'ZVE MAIL LIST',
    reason:
      'Custom RPC installed by VistA-Evolved (ZVEMSGR.m) for MailMan message listing (Phase 70)',
  },
  {
    name: 'ZVE MAIL GET',
    reason:
      'Custom RPC installed by VistA-Evolved (ZVEMSGR.m) for MailMan message detail (Phase 70)',
  },
  {
    name: 'ZVE MAIL SEND',
    reason: 'Custom RPC installed by VistA-Evolved (ZVEMSGR.m) for MailMan message send (Phase 70)',
  },
  {
    name: 'ZVE MAIL MANAGE',
    reason:
      'Custom RPC installed by VistA-Evolved (ZVEMSGR.m) for MailMan message management (Phase 70)',
  },
  {
    name: 'ORWPT16 ADMITLST',
    reason:
      'Admission list RPC; present in CPRS Delphi source but absent from some Vivian snapshots',
  },
  {
    name: 'ORWLRR INTERIMG',
    reason:
      'Interim lab results imaging variant; absent from Vivian snapshot (ORWLRR has 20+ RPCs)',
  },
  {
    name: 'ORWPT ID INFO',
    reason: 'Patient ID info; present in CPRS source but absent from some Vivian snapshots',
  },
  {
    name: 'ORWPT16 ID INFO',
    reason: 'Extended patient ID info; present in CPRS source but absent from Vivian',
  },
  {
    name: 'SDOE LIST ENCOUNTERS FOR PAT',
    reason: 'Scheduling encounter list; SD package RPCs underrepresented in Vivian',
  },
  {
    name: 'SD W/L RETRIVE HOSP LOC(#44)',
    reason: 'Scheduling hospital location lookup; SD package RPCs underrepresented in Vivian',
  },
  {
    name: 'SD W/L RETRIVE PERSON(200)',
    reason: 'Scheduling person lookup; SD package RPCs underrepresented in Vivian',
  },
  {
    name: 'SDOE LIST ENCOUNTERS FOR DATES',
    reason: 'Scheduling encounter date range list; SD package RPCs underrepresented in Vivian',
  },
  // Phase 123: SD* integration pack -- new exception entries
  {
    name: 'SDOE GET GENERAL DATA',
    reason: 'SDOE encounter detail; SD package RPCs underrepresented in Vivian',
  },
  {
    name: 'SDOE GET PROVIDERS',
    reason: 'SDOE encounter providers; SD package RPCs underrepresented in Vivian',
  },
  {
    name: 'SDOE GET DIAGNOSES',
    reason: 'SDOE encounter diagnoses; SD package RPCs underrepresented in Vivian',
  },
  {
    name: 'SD W/L CREATE FILE',
    reason: 'SD wait-list write; SD package RPCs underrepresented in Vivian',
  },
  {
    name: 'SD W/L RETRIVE FULL DATA',
    reason: 'SD wait-list full data retrieval; SD package RPCs underrepresented in Vivian',
  },
  // Phase 131: CPRS + SDVW RPCs
  {
    name: 'ORWPT APPTLST',
    reason:
      'CPRS cover sheet apt list; present in CPRS but may be absent from some Vivian snapshots',
  },
  {
    name: 'SDVW MAKE APPT API APP',
    reason: 'SDVW appointment creation; SD package RPCs underrepresented in Vivian',
  },
  {
    name: 'SDVW SDAPI APP',
    reason: 'SDVW appointment API; SD package RPCs underrepresented in Vivian',
  },
  {
    name: 'SD W/L PRIORITY',
    reason: 'SD wait-list priority ref; SD package RPCs underrepresented in Vivian',
  },
  {
    name: 'SD W/L TYPE',
    reason: 'SD wait-list type ref; SD package RPCs underrepresented in Vivian',
  },
  {
    name: 'SD W/L CURRENT STATUS',
    reason: 'SD wait-list status ref; SD package RPCs underrepresented in Vivian',
  },
  // Phase 147: SDES scheduling depth RPCs
  {
    name: 'SDES GET APPTS BY PATIENT DFN3',
    reason: 'SDES patient appointments; SDES package not in Vivian index',
  },
  {
    name: 'SDES GET CLIN AVAILABILITY',
    reason: 'SDES clinic availability; SDES package not in Vivian index',
  },
  {
    name: 'SDES GET APPT TYPES',
    reason: 'SDES appointment types; SDES package not in Vivian index',
  },
  {
    name: 'SDES GET CANCEL REASONS',
    reason: 'SDES cancel reasons; SDES package not in Vivian index',
  },
  {
    name: 'SDES GET RESOURCE BY CLINIC',
    reason: 'SDES clinic resource; SDES package not in Vivian index',
  },
  {
    name: 'SDES GET CLINIC INFO2',
    reason: 'SDES clinic info v2; SDES package not in Vivian index',
  },
  {
    name: 'SDES GET APPT BY APPT IEN',
    reason: 'SDES single appointment; SDES package not in Vivian index',
  },
  {
    name: 'SDES CREATE APPOINTMENTS',
    reason: 'SDES appointment booking; SDES package not in Vivian index',
  },
  {
    name: 'SDES CANCEL APPOINTMENT 2',
    reason: 'SDES appointment cancel; SDES package not in Vivian index',
  },
  { name: 'SDES CHECKIN', reason: 'SDES check-in; SDES package not in Vivian index' },
  { name: 'SDES CHECKOUT', reason: 'SDES checkout; SDES package not in Vivian index' },
  // Phase 539: Recall/Reminder RPCs -- File 403.5 not populated in WorldVistA Docker
  {
    name: 'SD RECALL LIST',
    reason: 'SD Recall Reminders; File 403.5 namespace not populated in sandbox',
  },
  {
    name: 'SD RECALL GET',
    reason: 'SD Recall detail; File 403.5 namespace not populated in sandbox',
  },
  {
    name: 'SDES GET RECALL ENTRIES',
    reason: 'SDES recall entries; SDES package not in Vivian index',
  },
  {
    name: 'SD RECALL DATE CHECK',
    reason: 'SD Recall compliance check; File 403.5 not populated in sandbox',
  },
  // Phase 137: ZVEADT custom RPCs -- expected missing until ZVEADT.m installed
  {
    name: 'ZVEADT WARDS',
    reason:
      'Custom RPC installed by VistA-Evolved (ZVEADT.m) for ward census with bed counts (Phase 137)',
  },
  {
    name: 'ZVEADT BEDS',
    reason: 'Custom RPC installed by VistA-Evolved (ZVEADT.m) for bed-level occupancy (Phase 137)',
  },
  {
    name: 'ZVEADT MVHIST',
    reason:
      'Custom RPC installed by VistA-Evolved (ZVEADT.m) for patient movement history from File 405 (Phase 137)',
  },
  // Phase 138: BCMA/PSB RPCs -- target RPCs for nursing MAR + eMAR integration (not in WorldVistA sandbox)
  {
    name: 'PSB MED LOG',
    reason:
      'BCMA medication log read/write -- requires PSB package not available in WorldVistA Docker (Phase 138)',
  },
  // PSB ALLERGY moved to RPC_REGISTRY -- confirmed IEN 1278 in VEHU
  {
    name: 'PSJBCMA',
    reason:
      'Barcode-to-medication lookup via PSJ BCMA routines -- requires PSJ/PSB packages (Phase 138)',
  },
  {
    name: 'GMRIO RESULTS',
    reason: 'I&O results from GMR(126) -- RPC not exposed via OR CPRS GUI CHART context (Phase 138)',
  },
  {
    name: 'GMRIO ADD',
    reason: 'I&O entry add -- requires GMR IO package configuration (Phase 138)',
  },
  // Phase 431: DGPM ADT write RPCs -- target RPCs for admission/transfer/discharge (not exposed in OR CPRS GUI CHART context)
  {
    name: 'DGPM NEW ADMISSION',
    reason:
      'ADT admission write -- DGPM package RPCs not exposed in OR CPRS GUI CHART context in WorldVistA Docker (Phase 431)',
  },
  {
    name: 'DGPM NEW TRANSFER',
    reason:
      'ADT transfer write -- DGPM package RPCs not exposed in OR CPRS GUI CHART context in WorldVistA Docker (Phase 431)',
  },
  {
    name: 'DGPM NEW DISCHARGE',
    reason:
      'ADT discharge write -- DGPM package RPCs not exposed in OR CPRS GUI CHART context in WorldVistA Docker (Phase 431)',
  },
  // Phase 432: PSJ pharmacy verification RPCs -- target RPCs for inpatient pharmacy verification (not in WorldVistA sandbox)
  {
    name: 'PSJ VERIFY',
    reason:
      'Inpatient pharmacy order verification -- requires PSJ package not available in WorldVistA Docker (Phase 432)',
  },
  {
    name: 'PSJ ORDER STATUS',
    reason: 'Inpatient pharmacy order status lookup -- requires PSJ package (Phase 432)',
  },
  // PSB VALIDATE ORDER moved to RPC_REGISTRY -- confirmed IEN 646 in VEHU
  // Phase 433: Lab filing RPCs -- target RPCs for HL7 ORU^R01 inbound lab result filing (not available via RPC)
  {
    name: 'LRFZX',
    reason:
      'Lab result filing routine -- not an RPC, requires direct M call or custom ZVE wrapper (Phase 433)',
  },
  {
    name: 'LR VERIFY',
    reason:
      'Lab result verification -- LR package not exposed via OR CPRS GUI CHART context (Phase 433)',
  },
  // Phase 434: ORWDXC session RPCs -- referenced in CPRS Delphi but not yet called by VistA-Evolved
  {
    name: 'ORWDXC DELAY',
    reason:
      'Delay order checks for complex orders -- CPRS Delphi references but not yet wired (Phase 434)',
  },
  {
    name: 'ORWDXC DELORD',
    reason: 'Remove order from active check session -- CPRS Delphi references (Phase 434)',
  },
  {
    name: 'ORWDXC FILLID',
    reason: 'Get fill ID for duplicate therapy checks -- requires pharmacy context (Phase 434)',
  },
  {
    name: 'ORWDXC ON',
    reason: 'Check if order checking is enabled for site -- CPRS Delphi references (Phase 434)',
  },
  {
    name: 'ORWDXC SESSION',
    reason: 'Order check session management -- CPRS Delphi references (Phase 434)',
  },
  // Phase 568: Labs/Meds/Problems wiring -- RPCs present in CPRS Delphi but absent from some Vivian snapshots
  {
    name: 'ORQQL DETAIL',
    reason: 'Lab order detail -- ORQQL namespace absent from Vivian (Phase 568)',
  },
  {
    name: 'ORWLR RECENTSIT',
    reason: 'Recent lab results -- ORWLR namespace absent from Vivian (Phase 568)',
  },
  {
    name: 'ORWLR CUMULATIVE',
    reason: 'Cumulative lab report -- ORWLR namespace absent from Vivian (Phase 568)',
  },
  {
    name: 'LR ORDER',
    reason: 'Lab order entry -- LR package underrepresented in Vivian (Phase 568)',
  },
  {
    name: 'ORWPS COVER',
    reason: 'Medications cover sheet -- present in CPRS Delphi but absent from Vivian (Phase 568)',
  },
  {
    name: 'ORWPS DETAIL',
    reason: 'Medication detail -- present in CPRS Delphi but absent from Vivian (Phase 568)',
  },
  {
    name: 'GMPL PROB LIST',
    reason: 'GMPL problem list by status -- GMPL package underrepresented in Vivian (Phase 568)',
  },
  {
    name: 'GMPL ADD SAVE',
    reason: 'GMPL add/save problem -- GMPL package underrepresented in Vivian (Phase 568)',
  },
  // Phase 578: ORWDPS/ORWPS medication order dialog RPCs -- wired in meds.ts
  { name: 'ORWDPS ALLSCHD', reason: 'Medication order schedules -- ORWDPS package (Phase 578)' },
  { name: 'ORWDPS1 CHK94', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS1 DFLTSPLY', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS1 DOSEALT', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS1 DOWSCH', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS1 FAILDEA', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS1 FORMALT', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS1 HASOIPI', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS1 HASROUTE', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS1 IVDEA', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS1 LOCPICK', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS1 MAXDS', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS1 ODSLCT', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS1 QOMEDALT', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS1 SCHALL', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS2 ADMIN', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS2 CHKGRP', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS2 CHKPI', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS2 DAY2QTY', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS2 MAXREF', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS2 OISLCT', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS2 QOGRP', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS2 QTY2DAY', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS2 REQST', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS2 SCHREQ', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 ALLIVRTE', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 ALLROUTE', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 AUTH', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 AUTHNVA', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 DLGSLCT', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 DRUGMSG', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 FORMALT', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 ISSPLY', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 IVAMT', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 MEDISIV', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 OISLCT', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 SCSTS', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 VALQTY', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 VALRATE', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 VALROUTE', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS32 VALSCH', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS33 COMPLOC', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS33 GETADDFR', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS33 IVDOSFRM', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS4 CPINFO', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS4 CPLST', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS4 IPOD4OP', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS4 ISUDIV', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS4 UPDTDG', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS5 ISVTP', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS5 LESAPI', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWDPS5 LESGRP', reason: 'Medication order dialog helper (Phase 578)' },
  { name: 'ORWPS MEDHIST', reason: 'Medication history -- ORWPS package (Phase 578)' },
  { name: 'ORWPS REASON', reason: 'Medication reason -- ORWPS package (Phase 578)' },
  { name: 'ORWPS1 NEWDLG', reason: 'Medication new dialog -- ORWPS1 package (Phase 578)' },
  { name: 'ORWPS1 PICKUP', reason: 'Medication pickup -- ORWPS1 package (Phase 578)' },
  { name: 'ORWPS1 REFILL', reason: 'Medication refill -- ORWPS1 package (Phase 578)' },
  // Phase 580: Lab/report RPC stubs -- ORWDLR32/ORWDLR33/ORWLRR/ORWRP/ORWSR families underrepresented in Vivian
  {
    name: 'ORWDLR32 ABBSPEC',
    reason: 'Lab order dialog; ORWDLR32 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR32 ALLSAMP',
    reason: 'Lab order dialog; ORWDLR32 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR32 ALLSPEC',
    reason: 'Lab order dialog; ORWDLR32 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR32 DEF',
    reason: 'Lab order dialog; ORWDLR32 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR32 GET LAB TIMES',
    reason: 'Lab order dialog; ORWDLR32 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR32 IC DEFAULT',
    reason: 'Lab order dialog; ORWDLR32 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR32 IC VALID',
    reason: 'Lab order dialog; ORWDLR32 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR32 IMMED COLLECT',
    reason: 'Lab order dialog; ORWDLR32 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR32 LAB COLL TIME',
    reason: 'Lab order dialog; ORWDLR32 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR32 LOAD',
    reason: 'Lab order dialog; ORWDLR32 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR32 MAXDAYS',
    reason: 'Lab order dialog; ORWDLR32 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR32 ONE SAMPLE',
    reason: 'Lab order dialog; ORWDLR32 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR32 ONE SPECIMEN',
    reason: 'Lab order dialog; ORWDLR32 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR32 STOP',
    reason: 'Lab order dialog; ORWDLR32 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR33 FUTURE LAB COLLECTS',
    reason: 'Lab collects; ORWDLR33 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR33 LASTTIME',
    reason: 'Lab collects; ORWDLR33 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWDLR33 LC TO WC',
    reason: 'Lab collects; ORWDLR33 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR ALLTESTS',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR ATESTS',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR ATG',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR ATOMICS',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR CHEMTEST',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR GRID',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR INFO',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR INTERIMS',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR NEWOLD',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR PARAM',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR SPEC',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR TG',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR USERS',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR UTGA',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR UTGD',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWLRR UTGR',
    reason: 'Lab results; ORWLRR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP COLUMN HEADERS',
    reason: 'Reports; ORWRP family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP GET DEFAULT PRINTER',
    reason: 'Reports; ORWRP family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP LAB REPORT LISTS',
    reason: 'Reports; ORWRP family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP PRINT LAB REMOTE',
    reason: 'Reports; ORWRP family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP PRINT LAB REPORTS',
    reason: 'Reports; ORWRP family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP PRINT REMOTE REPORT',
    reason: 'Reports; ORWRP family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP PRINT REPORT',
    reason: 'Reports; ORWRP family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP PRINT V REPORT',
    reason: 'Reports; ORWRP family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP PRINT WINDOWS LAB REMOTE',
    reason: 'Reports; ORWRP family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP PRINT WINDOWS REMOTE',
    reason: 'Reports; ORWRP family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP PRINT WINDOWS REPORT',
    reason: 'Reports; ORWRP family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP SAVE DEFAULT PRINTER',
    reason: 'Reports; ORWRP family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP WINPRINT DEFAULT',
    reason: 'Reports; ORWRP family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP WINPRINT LAB REPORTS',
    reason: 'Reports; ORWRP family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP1 LISTNUTR',
    reason: 'Reports; ORWRP1 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP2 COMPABV',
    reason: 'Reports; ORWRP2 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP2 COMPDISP',
    reason: 'Reports; ORWRP2 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP2 GETLKUP',
    reason: 'Reports; ORWRP2 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP2 HS COMP FILES',
    reason: 'Reports; ORWRP2 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP2 HS COMPONENT SUBS',
    reason: 'Reports; ORWRP2 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP2 HS COMPONENTS',
    reason: 'Reports; ORWRP2 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP2 HS FILE LOOKUP',
    reason: 'Reports; ORWRP2 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP2 HS REPORT TEXT',
    reason: 'Reports; ORWRP2 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP2 HS SUBITEMS',
    reason: 'Reports; ORWRP2 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP2 SAVLKUP',
    reason: 'Reports; ORWRP2 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP3 EXPAND COLUMNS',
    reason: 'Reports; ORWRP3 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWRP4 HDR MODIFY',
    reason: 'Reports; ORWRP4 family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWSR CASELIST',
    reason: 'Surgery; ORWSR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWSR GET SURG CONTEXT',
    reason: 'Surgery; ORWSR family underrepresented in Vivian (Phase 580)',
  },
  { name: 'ORWSR ONECASE', reason: 'Surgery; ORWSR family underrepresented in Vivian (Phase 580)' },
  { name: 'ORWSR OPTOP', reason: 'Surgery; ORWSR family underrepresented in Vivian (Phase 580)' },
  {
    name: 'ORWSR SAVE SURG CONTEXT',
    reason: 'Surgery; ORWSR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWSR SHOW OPTOP WHEN SIGNING',
    reason: 'Surgery; ORWSR family underrepresented in Vivian (Phase 580)',
  },
  {
    name: 'ORWSR SHOW SURG TAB',
    reason: 'Surgery; ORWSR family underrepresented in Vivian (Phase 580)',
  },
  // Notes domain RPCs (routes/notes.ts) -- TIU/ORWTIU package underrepresented in Vivian
  { name: 'ORWTIU CANLINK', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU CHKTXT', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU GET DCSUMM CONTEXT', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU GET LISTBOX ITEM', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU GET SAVED CP FIELDS', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU GET TIU CONTEXT', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU GETPASTE', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU LDCPIDNT', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU POLL', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU SAVE DCSUMM CONTEXT', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU SAVE TIU CONTEXT', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU START', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU STOP', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU SVCOPY', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU SVCPIDNT', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU SVPASTE', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU VIEWCOPY', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'ORWTIU WINPRINT NOTE', reason: 'Notes; ORWTIU package (routes/notes.ts)' },
  { name: 'TIU ANCILLARY PACKAGE MESSAGE', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU AUTHORIZATION', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU DELETE RECORD', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU DETAILED DISPLAY', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU DIV AND CLASS INFO', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU FIELD CAN EDIT', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU FIELD CHECK', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU FIELD DELETE', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU FIELD DOLMTEXT', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU FIELD EXPORT', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU FIELD IMPORT', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU FIELD LIST', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU FIELD LIST ADD', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU FIELD LIST IMPORT', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU FIELD LOAD', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU FIELD LOAD BY IEN', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU FIELD LOCK', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU FIELD NAME IS UNIQUE', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU FIELD SAVE', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU FIELD UNLOCK', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU GET ADDITIONAL SIGNERS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU GET ALERT INFO', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU GET BOILERPLATE', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU GET DEFAULT PROVIDER', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU GET DOCUMENT PARAMETERS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU GET DOCUMENT TITLE', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU GET DS URGENCIES', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU GET LINKED PRF NOTES', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU GET LIST OF OBJECTS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU GET PERSONAL PREFERENCES', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU GET PRF ACTIONS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU GET PRF TITLE', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU GET PRINT NAME', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU GET REQUEST', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU GET SITE PARAMETERS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU ID ATTACH ENTRY', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU ID CAN ATTACH', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU ID CAN RECEIVE', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU ID DETACH ENTRY', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU IDENTIFY CONSULTS CLASS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU IDENTIFY SURGERY CLASS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU IS USER A USR PROVIDER', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU ISPRF', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU LINK TO FLAG', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU LOAD BOILERPLATE TEXT', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU LOAD RECORD FOR EDIT', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU LOAD RECORD TEXT', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU LONG LIST BOILERPLATED', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU LONG LIST CLINPROC TITLES', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU LONG LIST CONSULT TITLES', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU LONG LIST OF TITLES', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU LONG LIST SURGERY TITLES', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU PRINT RECORD', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU REM DLG OK AS TEMPLATE', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU REMINDER DIALOGS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU SUMMARIES', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE ACCESS LEVEL', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE ALL TITLES', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE CHECK BOILERPLATE', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE DELETE', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE GET DEFAULTS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE GET DESCRIPTION', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE GETBOIL', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE GETITEMS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE GETLINK', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE GETROOTS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE GETTEXT', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE ISEDITOR', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE LOCK', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE PERSONAL OBJECTS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE SET DEFAULTS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE SET ITEMS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU TEMPLATE UNLOCK', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU UPDATE ADDITIONAL SIGNERS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU UPDATE RECORD', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU USER CLASS LONG LIST', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU USER IS MEMBER OF CLASS', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU WHICH SIGNATURE ACTION', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIU_DOC', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIUADD', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIUERR', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'TIUID', reason: 'Notes; TIU package (routes/notes.ts)' },
  { name: 'VE USER LIST', reason: 'Custom admin RPC (ZVEUSER.m) for user management' },
  { name: 'VE USER DETAIL', reason: 'Custom admin RPC (ZVEUSER.m) for user detail' },
  { name: 'VE KEY LIST', reason: 'Custom admin RPC (ZVEUSER.m) for security key listing' },
  { name: 'VE MENU LIST', reason: 'Custom admin RPC (ZVEUSER.m) for menu option listing' },
  { name: 'VE INST LIST', reason: 'Custom admin RPC (ZVEFAC.m) for institution listing' },
  { name: 'VE DIV LIST', reason: 'Custom admin RPC (ZVEFAC.m) for division listing' },
  { name: 'VE SVC LIST', reason: 'Custom admin RPC (ZVEFAC.m) for service/section listing' },
  { name: 'VE STOP LIST', reason: 'Custom admin RPC (ZVEFAC.m) for stop code listing' },
  { name: 'VE SPEC LIST', reason: 'Custom admin RPC (ZVEFAC.m) for specialty listing' },
  { name: 'VE SITE PARM', reason: 'Custom admin RPC (ZVEFAC.m) for site parameter reading' },
  { name: 'VE CLIN LIST', reason: 'Custom admin RPC (ZVECLIN.m) for clinic listing' },
  { name: 'VE CLIN DETAIL', reason: 'Custom admin RPC (ZVECLIN.m) for clinic detail' },
  { name: 'VE APPT TYPES', reason: 'Custom admin RPC (ZVECLIN.m) for appointment type listing' },
  { name: 'VE WARD LIST', reason: 'Custom admin RPC (ZVEWARD.m) for ward listing' },
  { name: 'VE WARD DETAIL', reason: 'Custom admin RPC (ZVEWARD.m) for ward detail' },
  { name: 'VE CENSUS', reason: 'Custom admin RPC (ZVEWARD.m) for ward census' },
  { name: 'VE DRUG LIST', reason: 'Custom admin RPC (ZVEPHAR.m) for drug listing' },
  { name: 'VE DRUG DETAIL', reason: 'Custom admin RPC (ZVEPHAR.m) for drug detail' },
  { name: 'VE MED ROUTES', reason: 'Custom admin RPC (ZVEPHAR.m) for medication routes' },
  { name: 'VE MED SCHEDULES', reason: 'Custom admin RPC (ZVEPHAR.m) for medication schedules' },
  { name: 'VE LAB TEST LIST', reason: 'Custom admin RPC (ZVELAB.m) for lab test listing' },
  { name: 'VE LAB TEST DETAIL', reason: 'Custom admin RPC (ZVELAB.m) for lab test detail' },
  { name: 'VE LAB COLL SAMP', reason: 'Custom admin RPC (ZVELAB.m) for collection samples' },
  { name: 'VE LAB URGENCY', reason: 'Custom admin RPC (ZVELAB.m) for lab urgency types' },
  { name: 'VE IB SITE', reason: 'Custom admin RPC (ZVEBILL.m) for IB site parameters' },
  { name: 'VE INS LIST', reason: 'Custom admin RPC (ZVEBILL.m) for insurance company listing' },
  { name: 'VE INS DETAIL', reason: 'Custom admin RPC (ZVEBILL.m) for insurance company detail' },
  { name: 'VE CLAIM COUNT', reason: 'Custom admin RPC (ZVEBILL.m) for claim count' },
  // Admin write RPCs
  { name: 'VE USER EDIT', reason: 'Custom admin RPC (ZVEUSER.m) for user field editing' },
  { name: 'VE USER ADD KEY', reason: 'Custom admin RPC (ZVEUSER.m) for adding security keys' },
  { name: 'VE USER REMOVE KEY', reason: 'Custom admin RPC (ZVEUSER.m) for removing security keys' },
  { name: 'VE USER DEACTIVATE', reason: 'Custom admin RPC (ZVEUSER.m) for user deactivation' },
  { name: 'VE USER REACTIVATE', reason: 'Custom admin RPC (ZVEUSER.m) for user reactivation' },
  { name: 'VE CLIN CREATE', reason: 'Custom admin RPC (ZVECLIN.m) for clinic creation' },
  { name: 'VE CLIN EDIT', reason: 'Custom admin RPC (ZVECLIN.m) for clinic editing' },
  { name: 'VE CLIN TOGGLE', reason: 'Custom admin RPC (ZVECLIN.m) for clinic toggle active/inactive' },
  { name: 'VE WARD EDIT', reason: 'Custom admin RPC (ZVEWARD.m) for ward editing' },
  { name: 'VE SVC CREATE', reason: 'Custom admin RPC (ZVEFAC.m) for service/section creation' },
  { name: 'VE SVC EDIT', reason: 'Custom admin RPC (ZVEFAC.m) for service/section editing' },
  { name: 'VE DRUG EDIT', reason: 'Custom admin RPC (ZVEPHAR.m) for drug editing' },
  { name: 'VE LAB TEST EDIT', reason: 'Custom admin RPC (ZVELAB.m) for lab test editing' },
  { name: 'VE INS CREATE', reason: 'Custom admin RPC (ZVEBILL.m) for insurance company creation' },
  { name: 'VE INS EDIT', reason: 'Custom admin RPC (ZVEBILL.m) for insurance company editing' },
  // Admin system RPCs
  { name: 'VE TASKMAN LIST', reason: 'Custom admin RPC for TaskMan task listing' },
  { name: 'VE ERROR TRAP', reason: 'Custom admin RPC for error trap listing' },
  { name: 'VE SYS STATUS', reason: 'Custom admin RPC for system status' },
  { name: 'VE PARAM LIST', reason: 'Custom admin RPC for parameter listing' },
  { name: 'VE PARAM EDIT', reason: 'Custom admin RPC for parameter editing' },
  // Admin radiology RPCs
  { name: 'VE RAD PROC LIST', reason: 'Custom admin RPC for radiology procedure listing' },
  { name: 'VE RAD PROC DETAIL', reason: 'Custom admin RPC for radiology procedure detail' },
  { name: 'VE RAD IMG LOCATIONS', reason: 'Custom admin RPC for imaging location listing' },
  { name: 'VE RAD DIV PARAMS', reason: 'Custom admin RPC for radiology division parameters' },
  // Admin inventory RPCs
  { name: 'VE INV ITEM LIST', reason: 'Custom admin RPC for inventory item listing' },
  { name: 'VE INV ITEM DETAIL', reason: 'Custom admin RPC for inventory item detail' },
  { name: 'VE INV VENDOR LIST', reason: 'Custom admin RPC for vendor listing' },
  { name: 'VE INV PO LIST', reason: 'Custom admin RPC for purchase order listing' },
  // Admin workforce RPCs
  { name: 'VE PROV LIST', reason: 'Custom admin RPC for provider listing' },
  { name: 'VE PROV DETAIL', reason: 'Custom admin RPC for provider detail' },
  { name: 'VE PERSON CLASS LIST', reason: 'Custom admin RPC for person class listing' },
  // Admin quality RPCs
  { name: 'VE REMINDER LIST', reason: 'Custom admin RPC for clinical reminder listing' },
  { name: 'VE REMINDER DETAIL', reason: 'Custom admin RPC for reminder detail' },
  { name: 'VE QA SITE PARAMS', reason: 'Custom admin RPC for QA site parameters' },
  // Admin clinical app setup RPCs
  { name: 'VE ORDER SETS', reason: 'Custom admin RPC for order set listing' },
  { name: 'VE CONSULT SERVICES', reason: 'Custom admin RPC for consult service listing' },
  { name: 'VE TIU DEFINITIONS', reason: 'Custom admin RPC for TIU document definition listing' },
  { name: 'VE TIU TEMPLATES', reason: 'Custom admin RPC for TIU template listing' },
  { name: 'VE HEALTH SUMMARY TYPES', reason: 'Custom admin RPC for health summary type listing' },
  // ADT write RPCs (ZVEADTW.m)
  { name: 'VE ADT ADMIT', reason: 'Custom RPC (ZVEADTW.m) for patient admission via DGPM wrapper' },
  { name: 'VE ADT TRANSFER', reason: 'Custom RPC (ZVEADTW.m) for patient transfer between wards' },
  { name: 'VE ADT DISCHARGE', reason: 'Custom RPC (ZVEADTW.m) for patient discharge' },
  { name: 'VE REGISTER PAT', reason: 'Custom RPC (ZVEADTW.m) for patient registration in File #2' },
  // Nursing/eMAR RPCs (ZVENAS.m)
  { name: 'ZVENAS LIST', reason: 'Custom RPC (ZVENAS.m) for nursing task list' },
  { name: 'ZVENAS ASSESS', reason: 'Custom RPC (ZVENAS.m) for nursing assessments' },
  { name: 'ZVENAS SAVE', reason: 'Custom RPC (ZVENAS.m) for saving nursing assessment' },
  { name: 'ZVENAS IOLIST', reason: 'Custom RPC (ZVENAS.m) for I/O summary' },
  { name: 'ZVENAS IOADD', reason: 'Custom RPC (ZVENAS.m) for adding I/O entry' },
  { name: 'ZVENAS MEDLOG', reason: 'Custom RPC (ZVENAS.m) for recording med administration to ^PSB(53.79)' },
  { name: 'ZVENAS MEDLIST', reason: 'Custom RPC (ZVENAS.m) for reading med admin history from ^PSB(53.79)' },
  { name: 'ZVENAS BCSCAN', reason: 'Custom RPC (ZVENAS.m) for barcode scan validation' },
  // Lab write RPCs (ZVELABW.m)
  { name: 'VE LAB ORDER', reason: 'Custom RPC (ZVELABW.m) for placing lab orders in File #69' },
  { name: 'VE LAB VERIFY', reason: 'Custom RPC (ZVELABW.m) for lab result verification in File #63' },
  { name: 'VE LAB RESULT', reason: 'Custom RPC (ZVELABW.m) for entering lab result values in File #63' },
  { name: 'VE LAB COLLECT', reason: 'Custom RPC (ZVELABW.m) for specimen collection logging' },
  { name: 'VE LAB STATUS', reason: 'Custom RPC (ZVELABW.m) for lab order status from File #100' },
  { name: 'VE LAB HISTORY', reason: 'Custom RPC (ZVELABW.m) for patient lab history from File #63' },
  // Problem list write RPCs (ZVEPLW.m)
  { name: 'VE PROBLEM ADD', reason: 'Custom RPC (ZVEPLW.m) for adding problems via File #9000011 FileMan' },
  { name: 'VE PROBLEM EDIT', reason: 'Custom RPC (ZVEPLW.m) for editing problems in File #9000011' },
  { name: 'VE PROBLEM REMOVE', reason: 'Custom RPC (ZVEPLW.m) for inactivating problems in File #9000011' },
  { name: 'VE PROBLEM LIST', reason: 'Custom RPC (ZVEPLW.m) for reading problem list from File #9000011' },
  // Patient registration RPCs (ZVEPATREG.m)
  { name: 'VE PAT REGISTER', reason: 'Custom RPC (ZVEPATREG.m) for patient creation in File #2 via FileMan' },
  { name: 'VE PAT DEMOG', reason: 'Custom RPC (ZVEPATREG.m) for patient demographics from File #2' },
  { name: 'VE PAT UPDATE', reason: 'Custom RPC (ZVEPATREG.m) for updating patient demographics' },
  { name: 'VE PAT SEARCH', reason: 'Custom RPC (ZVEPATREG.m) for patient search by name/SSN/DOB' },
  { name: 'VE PAT MERGE', reason: 'Custom RPC (ZVEPATREG.m) for duplicate patient detection' },
  // Discharge workflow RPCs (ZVEDISCH.m)
  { name: 'VE DISCHARGE FULL', reason: 'Custom RPC (ZVEDISCH.m) for full discharge workflow' },
  { name: 'VE DISCHARGE INSTR', reason: 'Custom RPC (ZVEDISCH.m) for discharge instructions via TIU' },
  { name: 'VE DISCHARGE SUMM', reason: 'Custom RPC (ZVEDISCH.m) for discharge summary TIU document' },
  { name: 'VE DISCHARGE FOLLOWUP', reason: 'Custom RPC (ZVEDISCH.m) for scheduling discharge follow-ups' },
  // Medication reconciliation RPCs (ZVEMEDREC.m)
  { name: 'VE MEDREC RECONCILE', reason: 'Custom RPC (ZVEMEDREC.m) for medication reconciliation decisions' },
  { name: 'VE MEDREC MEDLIST', reason: 'Custom RPC (ZVEMEDREC.m) for combined med list (File 100 + File 52)' },
  { name: 'VE MEDREC HISTORY', reason: 'Custom RPC (ZVEMEDREC.m) for reconciliation history' },
  { name: 'VE MEDREC OUTSRC', reason: 'Custom RPC (ZVEMEDREC.m) for recording outside medications' },
  // E-Prescribing RPCs (ZVEERX.m)
  { name: 'VE ERX NEWRX', reason: 'Custom RPC (ZVEERX.m) for creating outpatient prescriptions in File #52' },
  { name: 'VE ERX RENEW', reason: 'Custom RPC (ZVEERX.m) for prescription renewal' },
  { name: 'VE ERX CANCEL', reason: 'Custom RPC (ZVEERX.m) for prescription cancellation' },
  { name: 'VE ERX DRUGSRCH', reason: 'Custom RPC (ZVEERX.m) for drug formulary search in File #50' },
  { name: 'VE ERX HISTORY', reason: 'Custom RPC (ZVEERX.m) for prescription history' },
  { name: 'VE ERX STATUS', reason: 'Custom RPC (ZVEERX.m) for prescription status check' },
  // PCE/Encounter/Immunization RPCs (ZVEPCE.m)
  { name: 'VE PCE IMM GIVE', reason: 'Custom RPC (ZVEPCE.m) for recording immunizations via PCE' },
  { name: 'VE PCE IMM HIST', reason: 'Custom RPC (ZVEPCE.m) for immunization history' },
  { name: 'VE PCE ENCOUNTER', reason: 'Custom RPC (ZVEPCE.m) for creating encounters in File #9000010' },
  { name: 'VE PCE PROCEDURE', reason: 'Custom RPC (ZVEPCE.m) for recording procedures' },
  { name: 'VE PCE DIAGNOSIS', reason: 'Custom RPC (ZVEPCE.m) for recording diagnoses' },
  { name: 'VE PCE VISIT HIST', reason: 'Custom RPC (ZVEPCE.m) for visit history' },
];

/* ------------------------------------------------------------------ */
/*  Lookup helpers                                                     */
/* ------------------------------------------------------------------ */

/** Set of all registered RPC names (uppercase for case-insensitive lookup) */
const REGISTRY_SET = new Set(RPC_REGISTRY.map((r) => r.name.toUpperCase()));

/** Set of exception RPC names (uppercase) */
const EXCEPTION_SET = new Set(RPC_EXCEPTIONS.map((e) => e.name.toUpperCase()));

/**
 * Look up an RPC definition by name.
 * Returns undefined if not in registry.
 */
export function lookupRpc(name: string): RpcDefinition | undefined {
  return RPC_REGISTRY.find((r) => r.name.toUpperCase() === name.toUpperCase());
}

/**
 * Assert an RPC name is known (in registry or exceptions).
 * Throws if unknown -- use this at build/test time.
 */
export function assertKnownRpc(name: string): RpcDefinition {
  const upper = name.toUpperCase();
  const def = RPC_REGISTRY.find((r) => r.name.toUpperCase() === upper);
  if (def) return def;
  if (EXCEPTION_SET.has(upper)) {
    return { name, domain: 'exception', tag: 'custom', description: 'Allowlisted exception' };
  }
  throw new Error(
    `UNKNOWN RPC: "${name}" is not in rpcRegistry.ts or RPC_EXCEPTIONS. ` +
      `Add it to the registry or allowlist it with an explanation.`
  );
}

/**
 * Check if an RPC is known (without throwing).
 */
export function isKnownRpc(name: string): boolean {
  const upper = name.toUpperCase();
  return REGISTRY_SET.has(upper) || EXCEPTION_SET.has(upper);
}

/**
 * Get all RPCs by domain.
 */
export function getRpcsByDomain(domain: string): RpcDefinition[] {
  return RPC_REGISTRY.filter((r) => r.domain === domain);
}

/**
 * Get all RPCs by tag.
 */
export function getRpcsByTag(tag: RpcTag): RpcDefinition[] {
  return RPC_REGISTRY.filter((r) => r.tag === tag);
}

/**
 * Get all registered RPC names as a sorted array.
 */
export function getAllRegisteredRpcNames(): string[] {
  return RPC_REGISTRY.map((r) => r.name).sort();
}

/**
 * Get the full registry + exceptions for verification.
 */
export function getFullRpcInventory(): {
  registry: RpcDefinition[];
  exceptions: typeof RPC_EXCEPTIONS;
} {
  return { registry: RPC_REGISTRY, exceptions: RPC_EXCEPTIONS };
}
