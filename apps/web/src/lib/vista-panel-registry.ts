/**
 * VistA Panel Registry -- maps package namespace IDs to panel component paths.
 * Used by the VistA Workspace page to dynamically load module panels.
 */

export interface VistaPanelEntry {
  id: string;
  name: string;
  component: string;
  tier: number;
  category: string;
}

export const VISTA_PANEL_REGISTRY: VistaPanelEntry[] = [
  // Tier 1: Core Clinical (15 packages)
  { id: 'xu', name: 'Kernel', component: 'KernelPanel', tier: 1, category: 'Infrastructure' },
  { id: 'di', name: 'VA FileMan', component: 'VaFilemanPanel', tier: 1, category: 'Infrastructure' },
  { id: 'dg', name: 'Registration', component: 'RegistrationPanel', tier: 1, category: 'Clinical' },
  { id: 'sd', name: 'Scheduling', component: 'SchedulingPanel', tier: 1, category: 'Clinical' },
  { id: 'or', name: 'Order Entry', component: 'OrderEntryPanel', tier: 1, category: 'Clinical' },
  { id: 'pso', name: 'Outpatient Pharmacy', component: 'OutpatientPharmacyPanel', tier: 1, category: 'Pharmacy' },
  { id: 'psj', name: 'Inpatient Medications', component: 'InpatientMedicationsPanel', tier: 1, category: 'Pharmacy' },
  { id: 'lr', name: 'Lab Service', component: 'LabServicePanel', tier: 1, category: 'Ancillary' },
  { id: 'ra', name: 'Radiology', component: 'RadiologyPanel', tier: 1, category: 'Ancillary' },
  { id: 'tiu', name: 'Text Integration Utility', component: 'TextIntegrationUtilityPanel', tier: 1, category: 'Clinical' },
  { id: 'gmpl', name: 'Problem List', component: 'ProblemListPanel', tier: 1, category: 'Clinical' },
  { id: 'gmv', name: 'Vitals', component: 'VitalsPanel', tier: 1, category: 'Clinical' },
  { id: 'gmra', name: 'Adverse Reaction Tracking', component: 'AdverseReactionTrackingPanel', tier: 1, category: 'Clinical' },
  { id: 'ib', name: 'Integrated Billing', component: 'IntegratedBillingPanel', tier: 1, category: 'Financial' },
  { id: 'prca', name: 'Accounts Receivable', component: 'AccountsReceivablePanel', tier: 1, category: 'Financial' },

  // Tier 2: Hospital Operations (22 packages)
  { id: 'sr', name: 'Surgery', component: 'SurgeryPanel', tier: 2, category: 'Clinical' },
  { id: 'gmrc', name: 'Consult/Request Tracking', component: 'ConsultRequestTrackingPanel', tier: 2, category: 'Clinical' },
  { id: 'fh', name: 'Dietetics', component: 'DieteticsPanel', tier: 2, category: 'Ancillary' },
  { id: 'nur', name: 'Nursing', component: 'NursingPanel', tier: 2, category: 'Clinical' },
  { id: 'psb', name: 'Bar Code Med Admin', component: 'BarCodeMedAdminPanel', tier: 2, category: 'Pharmacy' },
  { id: 'px', name: 'PCE Patient Care Encounter', component: 'PcePatientCareEncounterPanel', tier: 2, category: 'Clinical' },
  { id: 'ys', name: 'Mental Health', component: 'MentalHealthPanel', tier: 2, category: 'Clinical' },
  { id: 'an', name: 'Anesthesiology', component: 'AnesthesiologyPanel', tier: 2, category: 'Clinical' },
  { id: 'den', name: 'Dental', component: 'DentalPanel', tier: 2, category: 'Clinical' },
  { id: 'onc', name: 'Oncology', component: 'OncologyPanel', tier: 2, category: 'Clinical' },
  { id: 'rm', name: 'Record Tracking', component: 'RecordTrackingPanel', tier: 2, category: 'Administrative' },
  { id: 'rt', name: 'Record Tracking (RT)', component: 'RecordTrackingPanel', tier: 2, category: 'Administrative' },
  { id: 'bch', name: 'Blood Bank', component: 'BloodBankPanel', tier: 2, category: 'Ancillary' },
  { id: 'wv', name: 'Women Veterans Health', component: 'WomenVeteransHealthPanel', tier: 2, category: 'Clinical' },
  { id: 'hd', name: 'Health Data Informatics', component: 'HealthDataInformaticsPanel', tier: 2, category: 'Infrastructure' },
  { id: 'imm', name: 'Immunology Case Registry', component: 'ImmunologyCaseRegistryPanel', tier: 2, category: 'Clinical' },
  { id: 'psx', name: 'CMOP', component: 'CmopPanel', tier: 2, category: 'Pharmacy' },
  { id: 'psa', name: 'Drug Accountability', component: 'DrugAccountabilityPanel', tier: 2, category: 'Pharmacy' },
  { id: 'psn', name: 'National Drug File', component: 'NationalDrugFilePanel', tier: 2, category: 'Pharmacy' },
  { id: 'psd', name: 'Controlled Substances', component: 'ControlledSubstancesPanel', tier: 2, category: 'Pharmacy' },
  { id: 'iv', name: 'IV Pharmacy', component: 'IvPharmacyPanel', tier: 2, category: 'Pharmacy' },
  { id: 'ppp', name: 'Patient Representative', component: 'PatientRepresentativePanel', tier: 2, category: 'Administrative' },

  // Tier 3: Administrative (18 packages)
  { id: 'prc', name: 'IFCAP Procurement', component: 'IfcapProcurementPanel', tier: 3, category: 'Administrative' },
  { id: 'en', name: 'Engineering', component: 'EngineeringPanel', tier: 3, category: 'Administrative' },
  { id: 'prs', name: 'PAID', component: 'PaidPanel', tier: 3, category: 'Administrative' },
  { id: 'ec', name: 'Event Capture', component: 'EventCapturePanel', tier: 3, category: 'Administrative' },
  { id: 'dpt', name: 'Patient File Manager', component: 'PatientFileManagerPanel', tier: 3, category: 'Administrative' },
  { id: 'dss', name: 'DSS Extracts', component: 'DssExtractsPanel', tier: 3, category: 'Administrative' },
  { id: 'qa', name: 'Quality Assurance', component: 'QualityAssurancePanel', tier: 3, category: 'Administrative' },
  { id: 'fb', name: 'Fee Basis', component: 'FeeBasisPanel', tier: 3, category: 'Financial' },
  { id: 'icd', name: 'DRG Grouper', component: 'DrgGrouperPanel', tier: 3, category: 'Financial' },
  { id: 'mcar', name: 'Medicine', component: 'MedicinePanel', tier: 3, category: 'Clinical' },
  { id: 'ic', name: 'Infection Control', component: 'InfectionControlPanel', tier: 3, category: 'Clinical' },
  { id: 'dvb', name: 'Automated Med Info Exchange', component: 'AutomatedMedInfoExchangePanel', tier: 3, category: 'Administrative' },
  { id: 'ibd', name: 'Integrated Billing (DX)', component: 'IntegratedBillingDxPanel', tier: 3, category: 'Financial' },
  { id: 'ibcn', name: 'Insurance Verification', component: 'InsuranceVerificationPanel', tier: 3, category: 'Financial' },
  { id: 'mp', name: 'Master Patient Index', component: 'MasterPatientIndexPanel', tier: 3, category: 'Administrative' },
  { id: 'vic', name: 'Veterans ID Card', component: 'VeteransIdCardPanel', tier: 3, category: 'Administrative' },
  { id: 'arj', name: 'Journal-AR', component: 'JournalArPanel', tier: 3, category: 'Financial' },
  { id: 'arc', name: 'Accounts Receivable Claims', component: 'AccountsReceivableClaimsPanel', tier: 3, category: 'Financial' },

  // Tier 4: Infrastructure/Interop (20 packages)
  { id: 'hl', name: 'Health Level Seven', component: 'HealthLevelSevenPanel', tier: 4, category: 'Infrastructure' },
  { id: 'xm', name: 'MailMan', component: 'MailmanPanel', tier: 4, category: 'Infrastructure' },
  { id: 'xt', name: 'Toolkit', component: 'ToolkitPanel', tier: 4, category: 'Infrastructure' },
  { id: 'xwb', name: 'RPC Broker', component: 'RpcBrokerPanel', tier: 4, category: 'Infrastructure' },
  { id: 'kmp', name: 'Kernel Perf Monitor', component: 'KernelPerfMonitorPanel', tier: 4, category: 'Infrastructure' },
  { id: 'xob', name: 'Web Services Client', component: 'WebServicesClientPanel', tier: 4, category: 'Infrastructure' },
  { id: 'xobw', name: 'Web Server', component: 'WebServerPanel', tier: 4, category: 'Infrastructure' },
  { id: 'xhd', name: 'Health Data Repository', component: 'HealthDataRepositoryPanel', tier: 4, category: 'Infrastructure' },
  { id: 'xus', name: 'Kernel Security', component: 'KernelSecurityPanel', tier: 4, category: 'Infrastructure' },
  { id: 'xpar', name: 'Parameter Tools', component: 'ParameterToolsPanel', tier: 4, category: 'Infrastructure' },
  { id: 'xpd', name: 'KIDS', component: 'KidsPanel', tier: 4, category: 'Infrastructure' },
  { id: 'zis', name: 'Device Handler', component: 'DeviceHandlerPanel', tier: 4, category: 'Infrastructure' },
  { id: 'fm', name: 'FileMan', component: 'FilemanPanel', tier: 4, category: 'Infrastructure' },
  { id: 'dinz', name: 'FileMan DBS', component: 'FilemanDbsPanel', tier: 4, category: 'Infrastructure' },
  { id: 'xq', name: 'Menu Manager', component: 'MenuManagerPanel', tier: 4, category: 'Infrastructure' },
  { id: 'kmps', name: 'Capacity Management', component: 'CapacityManagementPanel', tier: 4, category: 'Infrastructure' },
  { id: 'vfd', name: 'VistALink', component: 'VistalinkPanel', tier: 4, category: 'Infrastructure' },
  { id: 'hmp', name: 'Health Management Platform', component: 'HealthManagementPlatformPanel', tier: 4, category: 'Infrastructure' },
  { id: 'vdef', name: 'VistA Data Extract Framework', component: 'VistaDataExtractFrameworkPanel', tier: 4, category: 'Infrastructure' },
  { id: 'tmp', name: 'Text Integration', component: 'TextIntegrationPanel', tier: 4, category: 'Infrastructure' },

  // Tier 5: Specialized
  { id: 'mag', name: 'VistA Imaging', component: 'VistaImagingPanel', tier: 5, category: 'Ancillary' },
];

export const CATEGORIES = [
  'Clinical',
  'Pharmacy',
  'Ancillary',
  'Financial',
  'Administrative',
  'Infrastructure',
] as const;

export type PanelCategory = (typeof CATEGORIES)[number];

export function getPanelsByCategory(category: PanelCategory): VistaPanelEntry[] {
  return VISTA_PANEL_REGISTRY.filter(p => p.category === category);
}

export function getPanelsByTier(tier: number): VistaPanelEntry[] {
  return VISTA_PANEL_REGISTRY.filter(p => p.tier === tier);
}

export function getPanelById(id: string): VistaPanelEntry | undefined {
  return VISTA_PANEL_REGISTRY.find(p => p.id === id);
}
