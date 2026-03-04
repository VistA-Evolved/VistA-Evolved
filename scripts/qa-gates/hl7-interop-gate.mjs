#!/usr/bin/env node
/**
 * HL7 Interop QA Gate — Phase 279 (Wave 9)
 *
 * Validates the HL7v2 engine production convergence:
 *   1. FHIR bridge module exports conversion functions
 *   2. Channel health module exports aggregation function
 *   3. Outbound builder module exports message builders
 *   4. Conformance profile is valid JSON with required structure
 *   5. All HL7 engine files exist and are registered
 *   6. No Mirth Connect references in implementation (per ADR)
 *
 * Usage: node scripts/qa-gates/hl7-interop-gate.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..', '..');
const HL7_DIR = join(ROOT, 'apps', 'api', 'src', 'hl7');

let pass = 0;
let fail = 0;

function gate(name, fn) {
  try {
    const result = fn();
    if (result) {
      console.log(`  PASS  ${name}`);
      pass++;
    } else {
      console.log(`  FAIL  ${name}`);
      fail++;
    }
  } catch (e) {
    console.log(`  FAIL  ${name} — ${e.message}`);
    fail++;
  }
}

console.log('=== HL7 Interop QA Gate (Phase 279) ===\n');

// Gate 1: FHIR bridge exists and has conversion functions
gate('FHIR bridge module exists', () => {
  return existsSync(join(HL7_DIR, 'fhir-bridge.ts'));
});

gate('FHIR bridge exports convertHl7ToFhir', () => {
  const src = readFileSync(join(HL7_DIR, 'fhir-bridge.ts'), 'utf-8');
  return (
    src.includes('export function convertHl7ToFhir') &&
    src.includes('export function convertAdtToFhir') &&
    src.includes('export function convertOruToFhir') &&
    src.includes('export function convertOrmToFhir') &&
    src.includes('export function convertSiuToFhir')
  );
});

gate('FHIR bridge covers all 4 message packs', () => {
  const src = readFileSync(join(HL7_DIR, 'fhir-bridge.ts'), 'utf-8');
  return ['ADT', 'ORU', 'ORM', 'SIU'].every((t) => src.includes(`case "${t}"`));
});

// Gate 2: Channel health module
gate('Channel health module exists', () => {
  return existsSync(join(HL7_DIR, 'channel-health.ts'));
});

gate('Channel health exports getChannelHealthSummary', () => {
  const src = readFileSync(join(HL7_DIR, 'channel-health.ts'), 'utf-8');
  return (
    src.includes('export function getChannelHealthSummary') &&
    src.includes('export function recordMessageProcessed')
  );
});

// Gate 3: Outbound builder module
gate('Outbound builder module exists', () => {
  return existsSync(join(HL7_DIR, 'outbound-builder.ts'));
});

gate('Outbound builder exports all message builders', () => {
  const src = readFileSync(join(HL7_DIR, 'outbound-builder.ts'), 'utf-8');
  return (
    src.includes('export function buildAdtMessage') &&
    src.includes('export function buildOruMessage') &&
    src.includes('export function buildOrmMessage') &&
    src.includes('export function buildSiuMessage')
  );
});

// Gate 4: Conformance profile
gate('Conformance profile exists', () => {
  return existsSync(join(ROOT, 'config', 'hl7-conformance.json'));
});

gate('Conformance profile is valid JSON', () => {
  const raw = readFileSync(join(ROOT, 'config', 'hl7-conformance.json'), 'utf-8');
  const profile = JSON.parse(raw);
  return typeof profile === 'object' && profile !== null;
});

gate('Conformance profile has required fields', () => {
  const raw = readFileSync(join(ROOT, 'config', 'hl7-conformance.json'), 'utf-8');
  const profile = JSON.parse(raw);
  return (
    profile.profileName &&
    profile.hl7Version &&
    Array.isArray(profile.supportedMessageTypes) &&
    profile.supportedMessageTypes.length >= 4 &&
    profile.transportProtocols &&
    profile.encodingRules &&
    profile.securityConsiderations
  );
});

gate('Conformance profile declares ADT, ORU, ORM, SIU, ACK', () => {
  const raw = readFileSync(join(ROOT, 'config', 'hl7-conformance.json'), 'utf-8');
  const profile = JSON.parse(raw);
  const codes = profile.supportedMessageTypes.map((t) => t.messageCode);
  return ['ADT', 'ORU', 'ORM', 'SIU', 'ACK'].every((c) => codes.includes(c));
});

// Gate 5: Existing engine files
gate('Core HL7 engine files exist', () => {
  const requiredFiles = [
    'index.ts',
    'types.ts',
    'parser.ts',
    'ack-generator.ts',
    'mllp-server.ts',
    'mllp-client.ts',
    'domain-mapper.ts',
    'message-event-store.ts',
    'dead-letter-enhanced.ts',
    'tenant-endpoints.ts',
  ];
  return requiredFiles.every((f) => existsSync(join(HL7_DIR, f)));
});

gate('Routing subsystem files exist', () => {
  const routingDir = join(HL7_DIR, 'routing');
  return (
    existsSync(join(routingDir, 'registry.ts')) &&
    existsSync(join(routingDir, 'matcher.ts')) &&
    existsSync(join(routingDir, 'transform.ts')) &&
    existsSync(join(routingDir, 'index.ts'))
  );
});

gate('Message pack files exist', () => {
  const packsDir = join(HL7_DIR, 'packs');
  return (
    existsSync(join(packsDir, 'adt-pack.ts')) &&
    existsSync(join(packsDir, 'oru-pack.ts')) &&
    existsSync(join(packsDir, 'orm-pack.ts')) &&
    existsSync(join(packsDir, 'siu-pack.ts'))
  );
});

// Gate 6: No Mirth Connect references in new code (per ADR)
gate('No Mirth Connect in fhir-bridge.ts', () => {
  const src = readFileSync(join(HL7_DIR, 'fhir-bridge.ts'), 'utf-8').toLowerCase();
  return !src.includes('mirth');
});

gate('No Mirth Connect in channel-health.ts', () => {
  const src = readFileSync(join(HL7_DIR, 'channel-health.ts'), 'utf-8').toLowerCase();
  return !src.includes('mirth');
});

gate('No Mirth Connect in outbound-builder.ts', () => {
  const src = readFileSync(join(HL7_DIR, 'outbound-builder.ts'), 'utf-8').toLowerCase();
  return !src.includes('mirth');
});

// Gate 7: FHIR bridge type safety
gate('FHIR bridge defines FhirBundle type', () => {
  const src = readFileSync(join(HL7_DIR, 'fhir-bridge.ts'), 'utf-8');
  return (
    src.includes('export interface FhirBundle') &&
    src.includes('export interface FhirConversionResult')
  );
});

gate('FHIR bridge lists all conversions', () => {
  const src = readFileSync(join(HL7_DIR, 'fhir-bridge.ts'), 'utf-8');
  return src.includes('export function listFhirConversions');
});

// Summary
console.log(`\n=== Results: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
