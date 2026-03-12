/**
 * Phase 158: Template Engine -- Core logic for template CRUD, versioning,
 * and note generation. VistA TIU alignment with local-draft fallback.
 *
 * Templates are orchestration metadata, NOT clinical truth.
 * Clinical truth lives in VistA via TIU RPCs.
 */

import { randomUUID } from 'node:crypto';
import { log } from '../lib/logger.js';
import type {
  ClinicalTemplate,
  TemplateVersionEvent,
  QuickText,
  NoteBuilderInput,
  NoteBuilderOutput,
  TemplateSection,
  TemplateStatus,
} from './types.js';
import { getAllSpecialtyPacks } from './specialty-packs.js';

// --- In-Memory Store (pg_backed via repo injection) ----------------

let templateStore = new Map<string, ClinicalTemplate>();
let versionEventStore: TemplateVersionEvent[] = [];
const MAX_VERSION_EVENTS = 10000;
const MAX_TEMPLATES = 10000;
const MAX_QUICK_TEXTS = 10000;
let quickTextStore = new Map<string, QuickText>();

// DB repo interface for Postgres backing
export interface TemplateDbRepo {
  listTemplates(tenantId: string): Promise<ClinicalTemplate[]>;
  getTemplate(tenantId: string, id: string): Promise<ClinicalTemplate | null>;
  upsertTemplate(t: ClinicalTemplate): Promise<void>;
  deleteTemplate(tenantId: string, id: string): Promise<void>;
  insertVersionEvent(e: TemplateVersionEvent): Promise<void>;
  listVersionEvents(tenantId: string, templateId: string): Promise<TemplateVersionEvent[]>;
  listQuickTexts(tenantId: string): Promise<QuickText[]>;
  upsertQuickText(q: QuickText): Promise<void>;
  deleteQuickText(tenantId: string, id: string): Promise<void>;
}

let dbRepo: TemplateDbRepo | null = null;

export interface NoteBuilderTemplateOption {
  id: string;
  name: string;
  specialty: string;
  setting: ClinicalTemplate['setting'];
  source: 'tenant-published' | 'builtin-pack';
}

interface ResolvedNoteTemplate extends ClinicalTemplate {
  source: 'tenant-published' | 'builtin-pack';
}

export function setTemplateDbRepo(repo: TemplateDbRepo): void {
  dbRepo = repo;
}

function slugifyTemplateName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildBuiltinTemplateId(specialty: string, name: string): string {
  return `builtin:${specialty}:${slugifyTemplateName(name)}`;
}

function buildBuiltinTemplateCatalog(): NoteBuilderTemplateOption[] {
  return getAllSpecialtyPacks()
    .flatMap((pack) =>
      pack.templates.map((template) => ({
        id: buildBuiltinTemplateId(pack.specialty, template.name),
        name: template.name,
        specialty: template.specialty,
        setting: template.setting,
        source: 'builtin-pack' as const,
      }))
    )
    .sort((left, right) => left.name.localeCompare(right.name));
}

function buildBuiltinTemplateMap(): Map<string, ResolvedNoteTemplate> {
  const defaultTimestamp = new Date(0).toISOString();
  const builtinTemplates = new Map<string, ResolvedNoteTemplate>();
  for (const pack of getAllSpecialtyPacks()) {
    for (const template of pack.templates) {
      const id = buildBuiltinTemplateId(pack.specialty, template.name);
      builtinTemplates.set(id, {
        ...template,
        id,
        tenantId: 'builtin-pack',
        createdAt: defaultTimestamp,
        updatedAt: defaultTimestamp,
        source: 'builtin-pack',
      });
    }
  }
  return builtinTemplates;
}

async function hydrateTemplatesFromDb(tenantId: string): Promise<void> {
  if (!dbRepo) return;
  const templates = await dbRepo.listTemplates(tenantId);
  for (const template of templates) {
    templateStore.set(template.id, template);
  }
}

async function resolveNoteTemplate(
  tenantId: string | undefined,
  templateId: string
): Promise<ResolvedNoteTemplate | null> {
  if (tenantId) {
    const tenantTemplate = await getTemplate(tenantId, templateId);
    if (tenantTemplate) {
      return { ...tenantTemplate, source: 'tenant-published' };
    }
  }

  const builtinTemplates = buildBuiltinTemplateMap();
  return builtinTemplates.get(templateId) || null;
}

export async function listNoteBuilderTemplates(
  tenantId: string | undefined
): Promise<NoteBuilderTemplateOption[]> {
  if (tenantId) {
    const publishedTemplates = await listTemplates(tenantId, { status: 'published' });
    if (publishedTemplates.length > 0) {
      return publishedTemplates.map((template) => ({
        id: template.id,
        name: template.name,
        specialty: template.specialty,
        setting: template.setting,
        source: 'tenant-published',
      }));
    }
  }

  return buildBuiltinTemplateCatalog();
}

export async function getNoteBuilderTemplate(
  tenantId: string | undefined,
  templateId: string
): Promise<ResolvedNoteTemplate | null> {
  return resolveNoteTemplate(tenantId, templateId);
}

// --- Template CRUD -------------------------------------------------

export async function createTemplate(
  tenantId: string,
  input: Omit<
    ClinicalTemplate,
    'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'version' | 'status'
  >,
  actor: string
): Promise<ClinicalTemplate> {
  const now = new Date().toISOString();
  const template: ClinicalTemplate = {
    ...input,
    // Pin system fields after spread -- cannot be overwritten by input
    id: randomUUID(),
    tenantId,
    version: 1,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };

  if (templateStore.size >= MAX_TEMPLATES && !templateStore.has(template.id)) {
    const oldest = templateStore.keys().next().value;
    if (oldest) templateStore.delete(oldest);
  }
  templateStore.set(template.id, template);
  if (dbRepo) {
    void dbRepo.upsertTemplate(template).catch((e: unknown) => log.warn('[template-engine] DB upsertTemplate failed', { err: (e as any)?.message ?? e }));
  }

  const event = buildVersionEvent(template, 'created', actor);
  versionEventStore.push(event);
  if (versionEventStore.length > MAX_VERSION_EVENTS) versionEventStore = versionEventStore.slice(-MAX_VERSION_EVENTS);
  if (dbRepo) void dbRepo.insertVersionEvent(event).catch((e: unknown) => log.warn('[template-engine] DB insertVersionEvent failed', { err: (e as any)?.message ?? e }));

  return template;
}

export async function updateTemplate(
  tenantId: string,
  id: string,
  updates: Partial<
    Pick<
      ClinicalTemplate,
      | 'name'
      | 'description'
      | 'specialty'
      | 'setting'
      | 'tags'
      | 'sections'
      | 'quickInsertSections'
      | 'autoExpandRules'
    >
  >,
  actor: string
): Promise<ClinicalTemplate | null> {
  const existing = templateStore.get(id);
  if (!existing || existing.tenantId !== tenantId) return null;
  if (existing.status === 'archived') return null;

  const updated: ClinicalTemplate = {
    ...existing,
    ...updates,
    version: existing.version + 1,
    updatedAt: new Date().toISOString(),
  };

  templateStore.set(id, updated);
  if (dbRepo) void dbRepo.upsertTemplate(updated).catch((e: unknown) => log.warn('[template-engine] DB upsertTemplate failed', { err: (e as any)?.message ?? e }));

  const event = buildVersionEvent(updated, 'updated', actor);
  versionEventStore.push(event);
  if (versionEventStore.length > MAX_VERSION_EVENTS) versionEventStore = versionEventStore.slice(-MAX_VERSION_EVENTS);
  if (dbRepo) void dbRepo.insertVersionEvent(event).catch((e: unknown) => log.warn('[template-engine] DB insertVersionEvent failed', { err: (e as any)?.message ?? e }));

  return updated;
}

export async function publishTemplate(
  tenantId: string,
  id: string,
  actor: string
): Promise<ClinicalTemplate | null> {
  const existing = templateStore.get(id);
  if (!existing || existing.tenantId !== tenantId) return null;

  const published: ClinicalTemplate = {
    ...existing,
    status: 'published',
    updatedAt: new Date().toISOString(),
  };

  templateStore.set(id, published);
  if (dbRepo) void dbRepo.upsertTemplate(published).catch((e: unknown) => log.warn('[template-engine] DB upsertTemplate failed', { err: (e as any)?.message ?? e }));

  const event = buildVersionEvent(published, 'published', actor);
  versionEventStore.push(event);
  if (versionEventStore.length > MAX_VERSION_EVENTS) versionEventStore = versionEventStore.slice(-MAX_VERSION_EVENTS);
  if (dbRepo) void dbRepo.insertVersionEvent(event).catch((e: unknown) => log.warn('[template-engine] DB insertVersionEvent failed', { err: (e as any)?.message ?? e }));

  return published;
}

export async function archiveTemplate(
  tenantId: string,
  id: string,
  actor: string
): Promise<ClinicalTemplate | null> {
  const existing = templateStore.get(id);
  if (!existing || existing.tenantId !== tenantId) return null;

  const archived: ClinicalTemplate = {
    ...existing,
    status: 'archived',
    updatedAt: new Date().toISOString(),
  };

  templateStore.set(id, archived);
  if (dbRepo) void dbRepo.upsertTemplate(archived).catch((e: unknown) => log.warn('[template-engine] DB upsertTemplate failed', { err: (e as any)?.message ?? e }));

  const event = buildVersionEvent(archived, 'archived', actor);
  versionEventStore.push(event);
  if (versionEventStore.length > MAX_VERSION_EVENTS) versionEventStore = versionEventStore.slice(-MAX_VERSION_EVENTS);
  if (dbRepo) void dbRepo.insertVersionEvent(event).catch((e: unknown) => log.warn('[template-engine] DB insertVersionEvent failed', { err: (e as any)?.message ?? e }));

  return archived;
}

export async function getTemplate(tenantId: string, id: string): Promise<ClinicalTemplate | null> {
  const cached = templateStore.get(id);
  if (cached && cached.tenantId === tenantId) return cached;
  if (dbRepo) {
    const fromDb = await dbRepo.getTemplate(tenantId, id);
    if (fromDb) templateStore.set(fromDb.id, fromDb);
    return fromDb;
  }
  return null;
}

export async function listTemplates(
  tenantId: string,
  filters?: { specialty?: string; setting?: string; status?: TemplateStatus; search?: string }
): Promise<ClinicalTemplate[]> {
  await hydrateTemplatesFromDb(tenantId);
  let results = Array.from(templateStore.values()).filter((t) => t.tenantId === tenantId);

  if (filters?.specialty) {
    results = results.filter((t) => t.specialty === filters.specialty);
  }
  if (filters?.setting) {
    results = results.filter((t) => t.setting === filters.setting || t.setting === 'any');
  }
  if (filters?.status) {
    results = results.filter((t) => t.status === filters.status);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (t) => t.name.toLowerCase().includes(q) || t.specialty.toLowerCase().includes(q)
    );
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getVersionHistory(
  tenantId: string,
  templateId: string
): Promise<TemplateVersionEvent[]> {
  return versionEventStore
    .filter((e) => e.tenantId === tenantId && e.templateId === templateId)
    .sort((a, b) => b.version - a.version);
}

// --- Quick Text CRUD -----------------------------------------------

export async function createQuickText(
  tenantId: string,
  input: Omit<QuickText, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'version'>
): Promise<QuickText> {
  const now = new Date().toISOString();
  const qt: QuickText = {
    ...input,
    // Pin system fields after spread -- cannot be overwritten by input
    id: randomUUID(),
    tenantId,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  if (quickTextStore.size >= MAX_QUICK_TEXTS && !quickTextStore.has(qt.id)) {
    const oldest = quickTextStore.keys().next().value;
    if (oldest) quickTextStore.delete(oldest);
  }
  quickTextStore.set(qt.id, qt);
  if (dbRepo) void dbRepo.upsertQuickText(qt).catch((e: unknown) => log.warn('[template-engine] DB upsertQuickText failed', { err: (e as any)?.message ?? e }));
  return qt;
}

export async function listQuickTexts(
  tenantId: string,
  filters?: { tag?: string; specialty?: string; search?: string }
): Promise<QuickText[]> {
  let results = Array.from(quickTextStore.values()).filter((q) => q.tenantId === tenantId);
  if (filters?.tag) results = results.filter((q) => q.tags.includes(filters.tag!));
  if (filters?.specialty) results = results.filter((q) => q.specialty === filters.specialty);
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    results = results.filter(
      (q) => q.key.toLowerCase().includes(s) || q.text.toLowerCase().includes(s)
    );
  }
  return results.sort((a, b) => a.key.localeCompare(b.key));
}

export async function updateQuickText(
  tenantId: string,
  id: string,
  updates: Partial<Pick<QuickText, 'text' | 'tags' | 'specialty'>>
): Promise<QuickText | null> {
  const existing = quickTextStore.get(id);
  if (!existing || existing.tenantId !== tenantId) return null;
  const updated: QuickText = {
    ...existing,
    ...updates,
    version: existing.version + 1,
    updatedAt: new Date().toISOString(),
  };
  quickTextStore.set(id, updated);
  if (dbRepo) void dbRepo.upsertQuickText(updated).catch((e: unknown) => log.warn('[template-engine] DB upsertQuickText failed', { err: (e as any)?.message ?? e }));
  return updated;
}

export async function deleteQuickText(tenantId: string, id: string): Promise<boolean> {
  const existing = quickTextStore.get(id);
  if (!existing || existing.tenantId !== tenantId) return false;
  quickTextStore.delete(id);
  if (dbRepo) void dbRepo.deleteQuickText(tenantId, id).catch((e: unknown) => log.warn('[template-engine] DB deleteQuickText failed', { err: (e as any)?.message ?? e }));
  return true;
}

// --- Note Builder (core rendering) --------------------------------

export async function generateDraftNote(input: NoteBuilderInput): Promise<NoteBuilderOutput> {
  const template = await resolveNoteTemplate(input.tenantId, input.templateId);
  if (!template) {
    return {
      draftText: '',
      mode: 'local_draft',
      templateId: input.templateId,
      templateVersion: 0,
      sectionsRendered: 0,
    };
  }

  const lines: string[] = [];
  let sectionsRendered = 0;

  for (const section of template.sections.sort((a, b) => a.order - b.order)) {
    const sectionText = renderSection(section, input.fieldValues);
    if (sectionText.trim()) {
      lines.push(sectionText);
      sectionsRendered++;
    }
  }

  const draftText = lines.join('\n\n');

  // TIU draft posture: if TIU RPCs are available, this would call
  // TIU CREATE RECORD. For now, always local_draft with explicit migration target.
  return {
    draftText,
    mode: 'local_draft',
    templateId: template.id,
    templateVersion: template.version,
    templateName: template.name,
    specialty: template.specialty,
    templateSource: template.source,
    sectionsRendered,
    migrationTarget: 'TIU CREATE RECORD + TIU SET DOCUMENT TEXT',
  };
}

function renderSection(
  section: TemplateSection,
  values: Record<string, string | string[] | boolean>
): string {
  const lines: string[] = [];

  if (section.type === 'header') {
    lines.push(`=== ${section.title} ===`);
    return lines.join('\n');
  }

  lines.push(`--- ${section.title} ---`);

  for (const field of section.fields.sort((a, b) => a.order - b.order)) {
    const val = values[field.key];
    if (val !== undefined && val !== '' && val !== false) {
      if (Array.isArray(val)) {
        lines.push(`${field.label}: ${val.join(', ')}`);
      } else if (typeof val === 'boolean') {
        lines.push(`${field.label}: Yes`);
      } else {
        lines.push(`${field.label}: ${val}`);
      }
    } else if (field.defaults) {
      lines.push(`${field.label}: ${field.defaults}`);
    }
  }

  return lines.join('\n');
}

// --- Seed from Specialty Packs -------------------------------------

export async function seedSpecialtyPack(
  tenantId: string,
  pack: {
    templates: Array<Omit<ClinicalTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>;
  }
): Promise<number> {
  let count = 0;
  const now = new Date().toISOString();
  for (const tpl of pack.templates) {
    const id = randomUUID();
    const template: ClinicalTemplate = {
      id,
      tenantId,
      createdAt: now,
      updatedAt: now,
      ...tpl,
    };
    templateStore.set(id, template);
    if (dbRepo) void dbRepo.upsertTemplate(template).catch((e: unknown) => log.warn('[template-engine] DB upsertTemplate failed', { err: (e as any)?.message ?? e }));
    count++;
  }
  return count;
}

export function getTemplateStats(tenantId: string): {
  totalTemplates: number;
  bySpecialty: Record<string, number>;
  byStatus: Record<string, number>;
  bySetting: Record<string, number>;
  uniqueSpecialties: number;
} {
  const templates = Array.from(templateStore.values()).filter((t) => t.tenantId === tenantId);
  const bySpecialty: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const bySetting: Record<string, number> = {};

  for (const t of templates) {
    bySpecialty[t.specialty] = (bySpecialty[t.specialty] || 0) + 1;
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    bySetting[t.setting] = (bySetting[t.setting] || 0) + 1;
  }

  return {
    totalTemplates: templates.length,
    bySpecialty,
    byStatus,
    bySetting,
    uniqueSpecialties: Object.keys(bySpecialty).length,
  };
}

// --- Reset (for testing) ------------------------------------------

export function resetTemplateStore(): void {
  templateStore = new Map();
  versionEventStore = [];
  quickTextStore = new Map();
}

// --- Helpers ------------------------------------------------------

function buildVersionEvent(
  template: ClinicalTemplate,
  action: TemplateVersionEvent['action'],
  actor: string
): TemplateVersionEvent {
  return {
    id: randomUUID(),
    templateId: template.id,
    tenantId: template.tenantId,
    version: template.version,
    action,
    actor,
    createdAt: new Date().toISOString(),
  };
}
