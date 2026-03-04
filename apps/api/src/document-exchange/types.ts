/**
 * Phase 403 (W23-P5): Document Exchange — Types
 */

export type DocumentStatus = 'current' | 'superseded' | 'entered-in-error';
export type DocumentCategory =
  | 'clinical-note'
  | 'discharge-summary'
  | 'laboratory'
  | 'imaging'
  | 'referral'
  | 'consent'
  | 'administrative'
  | 'other';
export type DocumentFormat =
  | 'urn:ihe:iti:xds:2017:mimeTypeSufficient'
  | 'urn:ihe:pcc:xphr:2007'
  | 'urn:hl7-org:sdwg:ccda-structuredBody:2.1'
  | 'application/fhir+json'
  | 'text/plain'
  | 'application/pdf';

export interface DocumentAuthor {
  duz?: string;
  name: string;
  role?: string;
  organizationId?: string;
}

export interface DocumentReference {
  id: string;
  tenantId: string;
  masterIdentifier?: string;
  status: DocumentStatus;
  category: DocumentCategory;
  type?: string;
  subject: { dfn: string; display?: string };
  author: DocumentAuthor;
  date: string;
  description?: string;
  format: string;
  mimeType: string;
  size?: number;
  hash?: string;
  url?: string;
  content?: string;
  securityLabel?: string[];
  relatesTo?: Array<{ code: 'replaces' | 'transforms' | 'appends' | 'signs'; targetId: string }>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSubmissionSet {
  id: string;
  tenantId: string;
  sourceId: string;
  submissionTime: string;
  author: DocumentAuthor;
  documentIds: string[];
  status: 'submitted' | 'accepted' | 'rejected';
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DocumentExchangeDashboardStats {
  totalDocuments: number;
  currentDocuments: number;
  totalSubmissionSets: number;
  documentsByCategory: Record<string, number>;
}
