/**
 * Phase 411 (W24-P3): Customer Integration Intake -- Config Generator
 *
 * Generates config artifacts from an intake record:
 *  - HL7 pack selection
 *  - X12 partner config
 *  - Device gateway config
 *  - HIE pack selection
 */

import type { IntegrationIntake, IntakeConfigArtifact } from './types.js';

export function generateConfigFromIntake(intake: IntegrationIntake): IntakeConfigArtifact {
  const artifacts: IntakeConfigArtifact['artifacts'] = [];

  switch (intake.partnerType) {
    case 'hl7':
      artifacts.push(generateHl7Config(intake));
      break;
    case 'x12':
      artifacts.push(generateX12Config(intake));
      break;
    case 'device':
      artifacts.push(generateDeviceConfig(intake));
      break;
    case 'hie':
      artifacts.push(generateHieConfig(intake));
      break;
    case 'fhir':
      artifacts.push(generateFhirConfig(intake));
      break;
  }

  // Always add a transport config
  artifacts.push(generateTransportConfig(intake));

  return {
    intakeId: intake.id,
    tenantId: intake.tenantId,
    facilityId: intake.facilityId,
    partnerType: intake.partnerType,
    generatedAt: new Date().toISOString(),
    artifacts,
  };
}

function generateHl7Config(intake: IntegrationIntake): IntakeConfigArtifact['artifacts'][0] {
  return {
    type: 'hl7-pack',
    name: `hl7-${intake.facilityId}-${intake.partnerName.replace(/\s+/g, '-').toLowerCase()}`,
    content: {
      version: intake.hl7Version || '2.5.1',
      sendingFacility: intake.hl7SendingFacility || intake.facilityId,
      receivingFacility: intake.hl7ReceivingFacility || 'PARTNER',
      messageTypes: intake.hl7MessageTypes || ['ADT', 'ORM', 'ORU'],
      transport: intake.transport,
      security: intake.securityPosture,
      environment: intake.environment,
    },
  };
}

function generateX12Config(intake: IntegrationIntake): IntakeConfigArtifact['artifacts'][0] {
  return {
    type: 'x12-partner',
    name: `x12-${intake.facilityId}-${intake.partnerName.replace(/\s+/g, '-').toLowerCase()}`,
    content: {
      transactionSets: intake.x12TransactionSets || ['837P'],
      senderId: intake.x12SenderId || intake.facilityId,
      receiverId: intake.x12ReceiverId || 'PARTNER',
      testIndicator: intake.x12TestIndicator !== false,
      transport: intake.transport,
      security: intake.securityPosture,
      environment: intake.environment,
    },
  };
}

function generateDeviceConfig(intake: IntegrationIntake): IntakeConfigArtifact['artifacts'][0] {
  return {
    type: 'device-gateway',
    name: `device-${intake.facilityId}-${intake.partnerName.replace(/\s+/g, '-').toLowerCase()}`,
    content: {
      deviceTypes: intake.deviceTypes || [],
      protocol: intake.deviceProtocol || 'astm',
      transport: intake.transport,
      security: intake.securityPosture,
      environment: intake.environment,
    },
  };
}

function generateHieConfig(intake: IntegrationIntake): IntakeConfigArtifact['artifacts'][0] {
  return {
    type: 'hie-pack',
    name: `hie-${intake.facilityId}-${intake.partnerName.replace(/\s+/g, '-').toLowerCase()}`,
    content: {
      packId: intake.hiePackId || 'ihe-mhd',
      documentTypes: intake.hieDocumentTypes || ['CCD', 'CDA'],
      transport: intake.transport,
      security: intake.securityPosture,
      environment: intake.environment,
    },
  };
}

function generateFhirConfig(intake: IntegrationIntake): IntakeConfigArtifact['artifacts'][0] {
  return {
    type: 'fhir-endpoint',
    name: `fhir-${intake.facilityId}-${intake.partnerName.replace(/\s+/g, '-').toLowerCase()}`,
    content: {
      version: 'R4',
      transport: intake.transport,
      security: intake.securityPosture,
      environment: intake.environment,
    },
  };
}

function generateTransportConfig(intake: IntegrationIntake): IntakeConfigArtifact['artifacts'][0] {
  return {
    type: 'transport',
    name: `transport-${intake.facilityId}-${intake.partnerName.replace(/\s+/g, '-').toLowerCase()}`,
    content: {
      transport: intake.transport,
      security: intake.securityPosture,
      environment: intake.environment,
      tls: intake.securityPosture === 'tls_mutual' || intake.securityPosture === 'tls_server',
      mutualTls: intake.securityPosture === 'tls_mutual',
    },
  };
}

/** Validate an intake has the minimum required fields for config generation */
export function validateIntakeForConfig(intake: IntegrationIntake): string[] {
  const errors: string[] = [];
  if (!intake.tenantId) errors.push('tenantId required');
  if (!intake.facilityId) errors.push('facilityId required');
  if (!intake.partnerName) errors.push('partnerName required');
  if (!intake.partnerType) errors.push('partnerType required');
  if (!intake.transport) errors.push('transport required');
  if (!intake.securityPosture) errors.push('securityPosture required');
  if (intake.contacts.length === 0) errors.push('at least one contact required');

  // Type-specific validation
  if (
    intake.partnerType === 'hl7' &&
    (!intake.hl7MessageTypes || intake.hl7MessageTypes.length === 0)
  ) {
    errors.push('hl7MessageTypes required for HL7 partner');
  }
  if (
    intake.partnerType === 'x12' &&
    (!intake.x12TransactionSets || intake.x12TransactionSets.length === 0)
  ) {
    errors.push('x12TransactionSets required for X12 partner');
  }

  return errors;
}
