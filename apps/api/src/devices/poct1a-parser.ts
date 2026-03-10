/**
 * POCT1-A (IEEE/CLSI) XML Parser
 *
 * Phase 382 (W21-P5): XML-based observation parser for Point-of-Care
 * Testing devices. Handles POCT1-A observation messages with Device,
 * Patient, and Result elements.
 *
 * No external XML dependencies -- uses regex-based lightweight extraction
 * for the well-defined POCT1-A schema elements.
 *
 * Reference: CLSI POCT1-A (IEEE 11073-10472)
 */

import { safeErr } from '../lib/safe-error.js';

// ---------------------------------------------------------------------------
// POCT1-A Types
// ---------------------------------------------------------------------------

export interface Poct1aDevice {
  manufacturer: string;
  model: string;
  serialNumber: string;
  softwareVersion: string;
}

export interface Poct1aPatient {
  patientId: string;
  lastName: string;
  firstName: string;
  dateOfBirth: string;
  gender: string;
}

export interface Poct1aResult {
  /** Analyte code (e.g., GLU, Na, K) */
  analyteCode: string;
  /** Analyte display name */
  analyteName: string;
  /** Observed value */
  value: string;
  /** Units (e.g., mg/dL, mmol/L) */
  unit: string;
  /** Abnormal flag (N=normal, H=high, L=low, HH=critical high, LL=critical low) */
  flag: string;
  /** Reference range string */
  referenceRange: string;
  /** Result timestamp */
  timestamp: string;
}

export interface Poct1aObservation {
  /** Observation ID */
  observationId: string;
  /** Device info */
  device: Poct1aDevice;
  /** Patient info */
  patient: Poct1aPatient;
  /** Results (one or more analytes) */
  results: Poct1aResult[];
  /** Operator ID */
  operatorId: string;
  /** Overall observation timestamp */
  timestamp: string;
}

export interface Poct1aParseResult {
  ok: boolean;
  observations: Poct1aObservation[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Lightweight XML Element Extraction
// ---------------------------------------------------------------------------

/**
 * Extract the text content of a single XML element.
 * Returns empty string if not found.
 */
function extractElement(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = xml.match(re);
  return match ? match[1].trim() : '';
}

/**
 * Extract an XML attribute value.
 */
function extractAttribute(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}\\s*=\\s*"([^"]*)"`, 'i');
  const match = xml.match(re);
  return match ? match[1].trim() : '';
}

/**
 * Extract all occurrences of a block element (e.g., all <Result>...</Result>).
 */
function extractBlocks(xml: string, tag: string): string[] {
  const blocks: string[] = [];
  const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, 'gi');
  let match;
  while ((match = re.exec(xml)) !== null) {
    blocks.push(match[0]);
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Device Parser
// ---------------------------------------------------------------------------

function parseDevice(xml: string): Poct1aDevice {
  const deviceBlocks = extractBlocks(xml, 'Device');
  const deviceXml = deviceBlocks[0] || xml;

  return {
    manufacturer: extractElement(deviceXml, 'Manufacturer'),
    model: extractElement(deviceXml, 'Model'),
    serialNumber: extractElement(deviceXml, 'SerialNumber'),
    softwareVersion: extractElement(deviceXml, 'SoftwareVersion'),
  };
}

// ---------------------------------------------------------------------------
// Patient Parser
// ---------------------------------------------------------------------------

function parsePatient(xml: string): Poct1aPatient {
  const patientBlocks = extractBlocks(xml, 'Patient');
  const patientXml = patientBlocks[0] || xml;

  return {
    patientId: extractElement(patientXml, 'PatientId'),
    lastName: extractElement(patientXml, 'LastName'),
    firstName: extractElement(patientXml, 'FirstName'),
    dateOfBirth: extractElement(patientXml, 'DateOfBirth'),
    gender: extractElement(patientXml, 'Gender'),
  };
}

// ---------------------------------------------------------------------------
// Result Parser
// ---------------------------------------------------------------------------

function parseResult(resultXml: string): Poct1aResult {
  // Try attribute-based analyte: <Analyte code="GLU" name="Glucose"/>
  let analyteCode = extractAttribute(resultXml, 'Analyte', 'code');
  let analyteName = extractAttribute(resultXml, 'Analyte', 'name');

  // Fallback to element-based: <AnalyteCode>GLU</AnalyteCode>
  if (!analyteCode) analyteCode = extractElement(resultXml, 'AnalyteCode');
  if (!analyteName) analyteName = extractElement(resultXml, 'AnalyteName');
  // Also try just <Analyte>CODE</Analyte> as simple element
  if (!analyteCode) analyteCode = extractElement(resultXml, 'Analyte');

  return {
    analyteCode,
    analyteName,
    value: extractElement(resultXml, 'Value'),
    unit: extractElement(resultXml, 'Unit'),
    flag: extractElement(resultXml, 'Flag'),
    referenceRange: extractElement(resultXml, 'ReferenceRange'),
    timestamp:
      extractElement(resultXml, 'Timestamp') || extractElement(resultXml, 'ResultTimestamp'),
  };
}

// ---------------------------------------------------------------------------
// Observation Parser
// ---------------------------------------------------------------------------

function parseObservation(obsXml: string): Poct1aObservation {
  const device = parseDevice(obsXml);
  const patient = parsePatient(obsXml);

  const resultBlocks = extractBlocks(obsXml, 'Result');
  const results = resultBlocks.map(parseResult);

  return {
    observationId:
      extractElement(obsXml, 'ObservationId') ||
      extractAttribute(obsXml, 'Observation', 'id') ||
      '',
    device,
    patient,
    results,
    operatorId: extractElement(obsXml, 'OperatorId'),
    timestamp: extractElement(obsXml, 'Timestamp') || new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Full Parse Pipeline
// ---------------------------------------------------------------------------

/**
 * Parse a POCT1-A XML document. The document may contain:
 * - A single <Observation>...</Observation>
 * - Multiple <Observation> elements inside a <POCT1A> or <Observations> wrapper
 * - A <DeviceMessage> wrapper
 */
export function parsePoct1a(xml: string): Poct1aParseResult {
  try {
    const trimmedXml = xml.trim();
    if (!trimmedXml) {
      return { ok: false, observations: [], error: 'Empty XML input' };
    }

    // Extract all <Observation> blocks
    let obsBlocks = extractBlocks(trimmedXml, 'Observation');

    // If no <Observation> blocks found, try treating the whole thing
    // as a single observation (some devices wrap differently)
    if (obsBlocks.length === 0) {
      // Check if there are <Result> elements at all
      const resultBlocks = extractBlocks(trimmedXml, 'Result');
      if (resultBlocks.length > 0) {
        obsBlocks = [trimmedXml];
      } else {
        return { ok: false, observations: [], error: 'No Observation or Result elements found' };
      }
    }

    const observations = obsBlocks.map(parseObservation);

    return {
      ok: true,
      observations,
    };
  } catch (err: any) {
    return {
      ok: false,
      observations: [],
      error: safeErr(err),
    };
  }
}
