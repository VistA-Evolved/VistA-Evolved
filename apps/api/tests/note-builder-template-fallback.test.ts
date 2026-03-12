import { describe, expect, it, beforeEach } from 'vitest';

import {
  generateDraftNote,
  listNoteBuilderTemplates,
  resetTemplateStore,
} from '../src/templates/template-engine.js';

describe('note builder template fallback', () => {
  beforeEach(() => {
    resetTemplateStore();
  });

  it('returns built-in starter templates when tenant store is empty', async () => {
    const templates = await listNoteBuilderTemplates('tenant-test');
    expect(templates.length).toBeGreaterThan(0);
    expect(templates[0]?.source).toBe('builtin-pack');
    expect(templates.some((template) => template.id.startsWith('builtin:'))).toBe(true);
  });

  it('generates a local draft from a built-in starter template id', async () => {
    const templates = await listNoteBuilderTemplates('tenant-test');
    const primaryCareTemplate = templates.find((template) => template.name === 'Primary Care Office Visit');

    expect(primaryCareTemplate).toBeTruthy();

    const result = await generateDraftNote({
      tenantId: 'tenant-test',
      templateId: primaryCareTemplate!.id,
      dfn: '46',
      fieldValues: {
        hpi_cc: 'Audit chief complaint',
      },
    });

    expect(result.templateSource).toBe('builtin-pack');
    expect(result.templateName).toBe('Primary Care Office Visit');
    expect(result.sectionsRendered).toBeGreaterThan(0);
    expect(result.draftText).toContain('Chief Complaint: Audit chief complaint');
  });
});