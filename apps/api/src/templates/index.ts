/**
 * Phase 158: Template Engine — Barrel export
 */
export { default as templateRoutes } from "./template-routes.js";
export {
  createTemplate,
  updateTemplate,
  publishTemplate,
  archiveTemplate,
  getTemplate,
  listTemplates,
  getVersionHistory,
  createQuickText,
  listQuickTexts,
  updateQuickText,
  deleteQuickText,
  generateDraftNote,
  seedSpecialtyPack,
  getTemplateStats,
  setTemplateDbRepo,
  resetTemplateStore,
} from "./template-engine.js";
export { getAllSpecialtyPacks } from "./specialty-packs.js";
export { SPECIALTY_TAGS } from "./types.js";
export {
  generateCoverageReport,
  resetCoverageCache,
  scoreSpecialty,
  scoreToGrade,
} from "./coverage-scorer.js";
export type {
  CoverageReport,
  SpecialtyScore,
  LetterGrade,
} from "./coverage-scorer.js";
export { runSpecialtyCoverageGate } from "./qa-ladder-ext.js";
export type {
  QaLadderResult,
  QaSpecialtyCheck,
  QaCheckStatus,
} from "./qa-ladder-ext.js";
export type {
  ClinicalTemplate,
  TemplateSection,
  TemplateField,
  TemplateVersionEvent,
  QuickText,
  NoteBuilderInput,
  NoteBuilderOutput,
  SpecialtyPack,
  SpecialtyTag,
  TemplateSetting,
  TemplateStatus,
  MappingTarget,
} from "./types.js";
