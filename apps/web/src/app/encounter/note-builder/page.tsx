'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_BASE as API } from '@/lib/api-config';

/**
 * Phase 158: Encounter Note Builder Page
 * Select a published template, fill in fields, generate draft note.
 * Renders TIU-ready output with VistA integration-pending posture.
 */

interface TemplateOption {
  id: string;
  name: string;
  specialty: string;
  setting: string;
}

interface TemplateDetail {
  id: string;
  name: string;
  specialty: string;
  sections: SectionDef[];
}

interface SectionDef {
  id: string;
  title: string;
  type: string;
  fields: FieldDef[];
}

interface FieldDef {
  id: string;
  label: string;
  type: string;
  options?: string[];
  defaultValue?: string;
  required?: boolean;
}

interface NoteOutput {
  ok: boolean;
  note?: {
    text: string;
    mode: string;
    migrationTarget: string;
    metadata: {
      templateId: string;
      templateName: string;
      specialty: string;
      generatedAt: string;
    };
  };
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  });
  return res.json();
}

export default function NoteBuilderPage() {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [generatedNote, setGeneratedNote] = useState<NoteOutput | null>(null);
  const [generating, setGenerating] = useState(false);
  const [patientDfn, setPatientDfn] = useState('3');

  // Load published templates
  const loadTemplates = useCallback(async () => {
    const data = await apiFetch('/admin/templates?status=published');
    if (data.ok) {
      setTemplates(
        (data.templates || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          specialty: t.specialty,
          setting: t.setting,
        }))
      );
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Load template detail when selected
  useEffect(() => {
    if (!selectedId) {
      setTemplate(null);
      setFieldValues({});
      setGeneratedNote(null);
      return;
    }
    (async () => {
      const data = await apiFetch(`/admin/templates/${selectedId}`);
      if (data.ok && data.template) {
        setTemplate(data.template);
        // Initialize field values with defaults
        const defaults: Record<string, string> = {};
        for (const sec of data.template.sections || []) {
          for (const f of sec.fields || []) {
            defaults[f.id] = f.defaultValue || '';
          }
        }
        setFieldValues(defaults);
        setGeneratedNote(null);
      }
    })();
  }, [selectedId]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleGenerate = async () => {
    if (!template) return;
    setGenerating(true);
    const data: NoteOutput = await apiFetch('/encounter/note-builder/generate', {
      method: 'POST',
      body: JSON.stringify({
        templateId: template.id,
        patientDfn,
        fieldValues,
      }),
    });
    setGeneratedNote(data);
    setGenerating(false);
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Note Builder</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Select a template, fill in clinical fields, and generate a draft note.
        <span
          style={{
            marginLeft: 8,
            background: '#fff3e0',
            padding: '2px 8px',
            borderRadius: 12,
            fontSize: 12,
          }}
        >
          integration-pending: TIU CREATE RECORD
        </span>
      </p>

      {/* Template Selector */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ fontWeight: 600 }}>Template:</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ padding: 6, border: '1px solid #ccc', borderRadius: 4, minWidth: 300 }}
        >
          <option value="">-- Select a template --</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.specialty}, {t.setting})
            </option>
          ))}
        </select>

        <label style={{ fontWeight: 600, marginLeft: 16 }}>Patient DFN:</label>
        <input
          value={patientDfn}
          onChange={(e) => setPatientDfn(e.target.value)}
          style={{ padding: 6, border: '1px solid #ccc', borderRadius: 4, width: 80 }}
        />
      </div>

      {/* Template Fields */}
      {template && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>{template.name}</h2>
          {template.sections.map((sec) => (
            <div key={sec.id} style={{ marginBottom: 16 }}>
              <h3
                style={{
                  fontSize: 14,
                  color: '#333',
                  borderBottom: '1px solid #eee',
                  paddingBottom: 4,
                }}
              >
                {sec.title}
              </h3>
              {sec.fields.map((field) => (
                <div
                  key={field.id}
                  style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}
                >
                  <label style={{ width: 180, fontSize: 13, paddingTop: 6 }}>
                    {field.label}
                    {field.required && <span style={{ color: 'red' }}>*</span>}
                  </label>
                  {field.type === 'text' || field.type === 'smart-field' ? (
                    <input
                      value={fieldValues[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder={field.label}
                      style={{ flex: 1, padding: 6, border: '1px solid #ccc', borderRadius: 4 }}
                    />
                  ) : field.type === 'multi-select' && field.options ? (
                    <select
                      value={fieldValues[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      style={{ flex: 1, padding: 6, border: '1px solid #ccc', borderRadius: 4 }}
                    >
                      <option value="">-- select --</option>
                      {field.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      checked={fieldValues[field.id] === 'true'}
                      onChange={(e) => handleFieldChange(field.id, String(e.target.checked))}
                    />
                  ) : (
                    <textarea
                      value={fieldValues[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      rows={3}
                      style={{ flex: 1, padding: 6, border: '1px solid #ccc', borderRadius: 4 }}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '8px 20px',
              background: '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: generating ? 'wait' : 'pointer',
            }}
          >
            {generating ? 'Generating...' : 'Generate Draft Note'}
          </button>
        </div>
      )}

      {/* Generated Note Output */}
      {generatedNote && (
        <div
          style={{
            border: '1px solid #4caf50',
            borderRadius: 8,
            padding: 16,
            background: '#f1f8e9',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Generated Note</h3>
          {generatedNote.ok && generatedNote.note ? (
            <>
              <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
                Mode: {generatedNote.note.mode} | Template:{' '}
                {generatedNote.note.metadata.templateName} | Specialty:{' '}
                {generatedNote.note.metadata.specialty} | Generated:{' '}
                {generatedNote.note.metadata.generatedAt}
              </div>
              <div
                style={{
                  marginBottom: 8,
                  fontSize: 12,
                  color: '#e65100',
                  background: '#fff3e0',
                  padding: '4px 8px',
                  borderRadius: 4,
                  display: 'inline-block',
                }}
              >
                VistA Migration: {generatedNote.note.migrationTarget}
              </div>
              <pre
                style={{
                  background: '#fff',
                  border: '1px solid #ddd',
                  padding: 12,
                  borderRadius: 4,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Consolas, monospace',
                  fontSize: 13,
                  maxHeight: 500,
                  overflow: 'auto',
                }}
              >
                {generatedNote.note.text}
              </pre>
            </>
          ) : (
            <p style={{ color: 'red' }}>Failed to generate note.</p>
          )}
        </div>
      )}
    </div>
  );
}
