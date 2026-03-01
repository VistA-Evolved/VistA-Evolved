/**
 * Phase 411 (W24-P3): Customer Integration Intake -- Types
 */

/** Partner integration type */
export type PartnerType = "hl7" | "x12" | "device" | "hie" | "fhir";

/** Transport mechanism */
export type TransportType = "mllp" | "https" | "sftp" | "tcp" | "websocket" | "direct";

/** Security posture level */
export type SecurityPosture = "tls_mutual" | "tls_server" | "vpn" | "cleartext_dev";

/** Intake status */
export type IntakeStatus = "draft" | "submitted" | "config_generated" | "cert_pending" | "cert_passed" | "cert_failed" | "live";

/** Message type for HL7 */
export type Hl7MessageType = "ADT" | "ORM" | "ORU" | "RDS" | "OMP" | "SIU" | "MDM" | "DFT";

/** Message type for X12 */
export type X12TransactionSet = "837P" | "837I" | "835" | "270" | "271" | "276" | "277" | "278" | "999" | "TA1";

/** Integration intake record */
export interface IntegrationIntake {
  id: string;
  tenantId: string;
  facilityId: string;
  partnerName: string;
  partnerType: PartnerType;
  environment: "test" | "prod";
  transport: TransportType;
  securityPosture: SecurityPosture;

  // HL7-specific
  hl7MessageTypes?: Hl7MessageType[];
  hl7Version?: string;
  hl7SendingFacility?: string;
  hl7ReceivingFacility?: string;

  // X12-specific
  x12TransactionSets?: X12TransactionSet[];
  x12SenderId?: string;
  x12ReceiverId?: string;
  x12TestIndicator?: boolean;

  // Device-specific
  deviceTypes?: string[];
  deviceProtocol?: string;

  // HIE-specific
  hiePackId?: string;
  hieDocumentTypes?: string[];

  // Contacts
  contacts: IntakeContact[];

  // Scheduling
  testWindowStart?: string;
  testWindowEnd?: string;
  goLiveDate?: string;

  // Metadata
  status: IntakeStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Contact person on the partner side */
export interface IntakeContact {
  name: string;
  role: string;
  email: string;
  phone?: string;
}

/** Generated config artifact from an intake */
export interface IntakeConfigArtifact {
  intakeId: string;
  tenantId: string;
  facilityId: string;
  partnerType: PartnerType;
  generatedAt: string;
  artifacts: {
    type: string;
    name: string;
    content: Record<string, unknown>;
  }[];
}

/** Dashboard stats for intake tracking */
export interface IntakeDashboardStats {
  total: number;
  byStatus: Record<IntakeStatus, number>;
  byPartnerType: Record<PartnerType, number>;
}
