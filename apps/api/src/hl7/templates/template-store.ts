/**
 * HL7v2 Message Template Library — Template Store
 *
 * Phase 319 (W14-P3): CRUD for versioned message templates.
 * In-memory store with migration target: pg integration_template table.
 */

import { randomUUID } from 'crypto';
import type {
  MessageTemplate,
  TemplateStatus,
  TemplateScope,
  SegmentTemplate,
  ConformanceProfile,
} from './types.js';

/* ------------------------------------------------------------------ */
/*  In-memory store                                                    */
/* ------------------------------------------------------------------ */

const templates = new Map<string, MessageTemplate>();

/* ------------------------------------------------------------------ */
/*  CRUD                                                               */
/* ------------------------------------------------------------------ */

export interface CreateTemplateInput {
  name: string;
  description: string;
  messageType: string;
  hl7Version?: string;
  templateVersion?: string;
  profiles?: ConformanceProfile[];
  segments?: SegmentTemplate[];
  packId?: string;
  tags?: string[];
}

/** Create a new template */
export function createTemplate(
  tenantId: string,
  input: CreateTemplateInput,
  createdBy: string,
  scope: TemplateScope = 'tenant'
): MessageTemplate {
  const now = new Date().toISOString();
  const template: MessageTemplate = {
    id: randomUUID(),
    name: input.name,
    description: input.description,
    messageType: input.messageType,
    hl7Version: input.hl7Version || '2.5.1',
    templateVersion: input.templateVersion || '1.0.0',
    status: 'draft',
    scope,
    tenantId: scope === 'system' ? null : tenantId,
    profiles: input.profiles || [],
    segments: input.segments || [],
    packId: input.packId,
    createdAt: now,
    updatedAt: now,
    createdBy,
    tags: input.tags || [],
  };
  templates.set(template.id, template);
  return template;
}

/** Get a template by ID */
export function getTemplate(tenantId: string, id: string): MessageTemplate | undefined {
  const t = templates.get(id);
  if (!t) return undefined;
  // Tenant can see system templates or their own
  if (t.scope === 'system' || t.tenantId === tenantId) return t;
  return undefined;
}

/** List templates visible to a tenant */
export function listTemplates(
  tenantId: string,
  filters?: {
    messageType?: string;
    status?: TemplateStatus;
    scope?: TemplateScope;
    packId?: string;
    tag?: string;
  }
): MessageTemplate[] {
  const result: MessageTemplate[] = [];
  for (const t of templates.values()) {
    // Visibility: system templates + own tenant templates
    if (t.scope !== 'system' && t.tenantId !== tenantId) continue;
    if (filters?.messageType && t.messageType !== filters.messageType) continue;
    if (filters?.status && t.status !== filters.status) continue;
    if (filters?.scope && t.scope !== filters.scope) continue;
    if (filters?.packId && t.packId !== filters.packId) continue;
    if (filters?.tag && !t.tags.includes(filters.tag)) continue;
    result.push(t);
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/** Update template status */
export function updateTemplateStatus(
  tenantId: string,
  id: string,
  status: TemplateStatus
): { ok: boolean; error?: string; template?: MessageTemplate } {
  const t = templates.get(id);
  if (!t || (t.scope !== 'system' && t.tenantId !== tenantId)) {
    return { ok: false, error: 'template_not_found' };
  }
  // Valid transitions
  const validTransitions: Record<TemplateStatus, TemplateStatus[]> = {
    draft: ['active'],
    active: ['deprecated'],
    deprecated: ['archived', 'active'],
    archived: [],
  };
  if (!validTransitions[t.status]?.includes(status)) {
    return { ok: false, error: `invalid_transition: ${t.status} -> ${status}` };
  }
  t.status = status;
  t.updatedAt = new Date().toISOString();
  return { ok: true, template: t };
}

/** Update template segments */
export function updateTemplateSegments(
  tenantId: string,
  id: string,
  segments: SegmentTemplate[]
): { ok: boolean; error?: string; template?: MessageTemplate } {
  const t = templates.get(id);
  if (!t || (t.scope !== 'system' && t.tenantId !== tenantId)) {
    return { ok: false, error: 'template_not_found' };
  }
  if (t.status !== 'draft') {
    return { ok: false, error: 'only_draft_templates_can_be_edited' };
  }
  t.segments = segments;
  t.updatedAt = new Date().toISOString();
  return { ok: true, template: t };
}

/** Update template profiles */
export function updateTemplateProfiles(
  tenantId: string,
  id: string,
  profiles: ConformanceProfile[]
): { ok: boolean; error?: string; template?: MessageTemplate } {
  const t = templates.get(id);
  if (!t || (t.scope !== 'system' && t.tenantId !== tenantId)) {
    return { ok: false, error: 'template_not_found' };
  }
  if (t.status !== 'draft') {
    return { ok: false, error: 'only_draft_templates_can_be_edited' };
  }
  t.profiles = profiles;
  t.updatedAt = new Date().toISOString();
  return { ok: true, template: t };
}

/** Clone a template (creates new draft copy) */
export function cloneTemplate(
  tenantId: string,
  sourceId: string,
  newName: string,
  createdBy: string
): MessageTemplate | undefined {
  const source = getTemplate(tenantId, sourceId);
  if (!source) return undefined;
  return createTemplate(
    tenantId,
    {
      name: newName,
      description: `Cloned from ${source.name}`,
      messageType: source.messageType,
      hl7Version: source.hl7Version,
      templateVersion: '1.0.0',
      profiles: [...source.profiles],
      segments: JSON.parse(JSON.stringify(source.segments)),
      packId: source.packId,
      tags: [...source.tags, 'cloned'],
    },
    createdBy
  );
}

/** Delete a template (draft only) */
export function deleteTemplate(tenantId: string, id: string): boolean {
  const t = templates.get(id);
  if (!t || (t.scope !== 'system' && t.tenantId !== tenantId)) return false;
  if (t.status !== 'draft') return false;
  return templates.delete(id);
}

/** Get template store stats */
export function getTemplateStoreStats(tenantId: string): {
  total: number;
  byStatus: Record<string, number>;
  byScope: Record<string, number>;
} {
  const byStatus: Record<string, number> = {};
  const byScope: Record<string, number> = {};
  let total = 0;
  for (const t of templates.values()) {
    if (t.scope !== 'system' && t.tenantId !== tenantId) continue;
    total++;
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byScope[t.scope] = (byScope[t.scope] || 0) + 1;
  }
  return { total, byStatus, byScope };
}
