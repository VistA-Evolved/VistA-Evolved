/**
 * HL7v2 Message Template Library — Barrel Export
 *
 * Phase 319 (W14-P3)
 */

export * from './types.js';
export {
  createTemplate,
  getTemplate,
  listTemplates,
  updateTemplateStatus,
  updateTemplateSegments,
  updateTemplateProfiles,
  cloneTemplate,
  deleteTemplate,
  getTemplateStoreStats,
} from './template-store.js';
export { validateAgainstTemplate, getConformanceSummary } from './template-validator.js';
