/**
 * Intake OS - Summary Provider (Phase 28)
 *
 * Generates DraftClinicianSummary from completed intake.
 * Default: deterministic template-based rendering.
 * Optional: LLM-constrained summarizer (behind flag).
 */

import type {
  IntakeSession,
  QuestionnaireResponse,
  IntakeContext,
  DraftClinicianSummary,
  SummaryProvider,
  ROSFinding,
  RedFlagResult,
  Citation,
  QRItem,
  QuestionnaireItem,
} from './types.js';
import { resolvePacks, mergePackItems } from './pack-registry.js';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function extractAnswer(item: QRItem): string {
  if (!item.answer?.length) return '';
  const a = item.answer[0];
  if (a.valueCoding?.display) return a.valueCoding.display;
  if (a.valueString) return a.valueString;
  if (a.valueInteger !== undefined) return a.valueInteger.toString();
  if (a.valueDecimal !== undefined) return a.valueDecimal.toString();
  if (a.valueBoolean !== undefined) return a.valueBoolean ? 'Yes' : 'No';
  if (a.valueDate) return a.valueDate;
  if (a.valueDateTime) return a.valueDateTime;
  return '';
}

function flattenQRItems(items: QRItem[]): QRItem[] {
  const flat: QRItem[] = [];
  for (const item of items) {
    flat.push(item);
    if (item.item) flat.push(...flattenQRItems(item.item));
  }
  return flat;
}

function findItemDef(allItems: QuestionnaireItem[], linkId: string): QuestionnaireItem | undefined {
  for (const item of allItems) {
    if (item.linkId === linkId) return item;
    if (item.item) {
      const found = findItemDef(item.item, linkId);
      if (found) return found;
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* ROS Section Names                                                    */
/* ------------------------------------------------------------------ */

const ROS_SYSTEMS = [
  'constitutional',
  'eyes',
  'ears_nose_throat',
  'cardiovascular',
  'respiratory',
  'gastrointestinal',
  'genitourinary',
  'musculoskeletal',
  'integumentary',
  'neurological',
  'psychiatric',
  'endocrine',
  'hematologic',
  'allergic_immunologic',
];

/* ------------------------------------------------------------------ */
/* Template Summary Provider                                            */
/* ------------------------------------------------------------------ */

export class TemplateSummaryProvider implements SummaryProvider {
  async generate(
    session: IntakeSession,
    qr: QuestionnaireResponse,
    context: IntakeContext
  ): Promise<DraftClinicianSummary> {
    const packs = resolvePacks(context);
    const allItems = mergePackItems(packs);
    const flat = flattenQRItems(qr.item);
    const answerMap = new Map<string, QRItem>();
    for (const item of flat) {
      if (item.answer?.length) answerMap.set(item.linkId, item);
    }

    // Build HPI narrative
    const hpiItems = flat.filter((i) => {
      const def = findItemDef(allItems, i.linkId);
      return def?.section === 'hpi' || def?.section === 'chief_complaint';
    });
    const hpiParts: string[] = [];
    const hpiCitations: Citation[] = [];
    for (const item of hpiItems) {
      const val = extractAnswer(item);
      if (val) {
        const label = item.text ?? item.linkId;
        hpiParts.push(`${label}: ${val}`);
        hpiCitations.push({ statement: `${label}: ${val}`, answerIds: [item.linkId] });
      }
    }
    const hpiNarrative = hpiParts.join('. ') + (hpiParts.length ? '.' : 'No HPI data collected.');

    // Build ROS
    const rosFindings: ROSFinding[] = ROS_SYSTEMS.map((sys) => {
      const sysItems = flat.filter((i) => {
        const def = findItemDef(allItems, i.linkId);
        return def?.section === 'ros' && i.linkId.includes(sys);
      });
      if (sysItems.length === 0) {
        return { system: sys, findings: '', status: 'not_asked' as const };
      }
      const findings = sysItems
        .map((i) => extractAnswer(i))
        .filter(Boolean)
        .join(', ');
      const hasPositive = sysItems.some((i) => {
        const val = extractAnswer(i);
        return (
          val &&
          val.toLowerCase() !== 'no' &&
          val.toLowerCase() !== 'none' &&
          val.toLowerCase() !== 'denied'
        );
      });
      return {
        system: sys,
        findings,
        status: hasPositive ? ('positive' as const) : ('negative' as const),
      };
    });

    // Detect red flags
    const redFlags: RedFlagResult[] = [];
    for (const item of flat) {
      const def = findItemDef(allItems, item.linkId);
      if (def?.redFlag) {
        const val = extractAnswer(item);
        if (val === def.redFlag.condition || (def.redFlag.condition === '*' && val)) {
          redFlags.push({
            flag: def.redFlag.message,
            severity: def.redFlag.severity,
            triggerQuestionId: item.linkId,
            triggerAnswerId: item.linkId,
          });
        }
      }
    }

    // Medications delta (from medications section answers)
    const medItems = flat.filter((i) => {
      const def = findItemDef(allItems, i.linkId);
      return def?.section === 'medications';
    });
    const newMeds: string[] = [];
    const discMeds: string[] = [];
    const changedMeds: string[] = [];
    for (const item of medItems) {
      const val = extractAnswer(item);
      if (val && item.linkId.includes('new_med')) newMeds.push(val);
      else if (val && item.linkId.includes('disc_med')) discMeds.push(val);
      else if (val && item.linkId.includes('changed_med')) changedMeds.push(val);
    }

    // Allergies delta
    const allergyItems = flat.filter((i) => {
      const def = findItemDef(allItems, i.linkId);
      return def?.section === 'allergies';
    });
    const newAllergies: string[] = [];
    const resolvedAllergies: string[] = [];
    for (const item of allergyItems) {
      const val = extractAnswer(item);
      if (val && item.linkId.includes('new_allergy')) newAllergies.push(val);
      else if (val && item.linkId.includes('resolved_allergy')) resolvedAllergies.push(val);
    }

    // Contradiction detection (simple: mutually exclusive answers)
    const contradictions: { questionIdA: string; questionIdB: string; description: string }[] = [];
    // Example: if patient says "no pain" in one question and rates pain > 5 in another
    // This is pack-specific logic; for now we do basic detection
    const painDenied = flat.find(
      (i) => i.linkId.includes('pain') && extractAnswer(i).toLowerCase() === 'no'
    );
    const painRated = flat.find(
      (i) => i.linkId.includes('pain_scale') && parseInt(extractAnswer(i), 10) > 0
    );
    if (painDenied && painRated) {
      contradictions.push({
        questionIdA: painDenied.linkId,
        questionIdB: painRated.linkId,
        description: 'Patient denied pain but rated pain scale > 0',
      });
    }

    // Build draft note
    const noteLines: string[] = [
      'PATIENT-REPORTED INTAKE (DRAFT - PENDING CLINICIAN REVIEW)',
      '='.repeat(55),
      '',
      'HISTORY OF PRESENT ILLNESS:',
      hpiNarrative,
      '',
      'REVIEW OF SYSTEMS:',
      ...rosFindings
        .filter((r) => r.status !== 'not_asked')
        .map((r) => `  ${r.system}: ${r.status === 'negative' ? 'Negative' : r.findings}`),
      '',
    ];

    if (redFlags.length) {
      noteLines.push('** RED FLAGS **:');
      for (const rf of redFlags) {
        noteLines.push(`  [${rf.severity.toUpperCase()}] ${rf.flag}`);
      }
      noteLines.push('');
    }

    if (newMeds.length || discMeds.length || changedMeds.length) {
      noteLines.push('MEDICATION CHANGES (patient-reported):');
      for (const m of newMeds) noteLines.push(`  NEW: ${m}`);
      for (const m of discMeds) noteLines.push(`  DISCONTINUED: ${m}`);
      for (const m of changedMeds) noteLines.push(`  CHANGED: ${m}`);
      noteLines.push('');
    }

    if (newAllergies.length || resolvedAllergies.length) {
      noteLines.push('ALLERGY CHANGES (patient-reported):');
      for (const a of newAllergies) noteLines.push(`  NEW: ${a}`);
      for (const a of resolvedAllergies) noteLines.push(`  RESOLVED: ${a}`);
      noteLines.push('');
    }

    if (contradictions.length) {
      noteLines.push('CONTRADICTIONS DETECTED:');
      for (const c of contradictions) noteLines.push(`  - ${c.description}`);
      noteLines.push('');
    }

    noteLines.push('---');
    noteLines.push('Generated by VistA-Evolved Intake OS (template provider)');
    noteLines.push(`Session: ${session.id}`);

    return {
      sessionId: session.id,
      version: session.questionnaireResponseVersion,
      generatedAt: new Date().toISOString(),
      generatedBy: 'template',
      sections: {
        hpiNarrative,
        reviewOfSystems: rosFindings,
        redFlags,
        medicationsDelta: {
          newMedications: newMeds,
          discontinuedMedications: discMeds,
          changedMedications: changedMeds,
        },
        allergiesDelta: {
          newAllergies,
          resolvedAllergies,
        },
        contradictions,
      },
      draftNoteText: noteLines.join('\n'),
      citations: hpiCitations,
    };
  }
}

/* ------------------------------------------------------------------ */
/* LLM Summary Provider (STUB)                                          */
/* ------------------------------------------------------------------ */

export class LLMSummaryProvider implements SummaryProvider {
  private fallback = new TemplateSummaryProvider();

  async generate(
    session: IntakeSession,
    qr: QuestionnaireResponse,
    context: IntakeContext
  ): Promise<DraftClinicianSummary> {
    const enabled = process.env.INTAKE_LLM_SUMMARY_ENABLED === 'true';
    const apiKey = process.env.INTAKE_LLM_API_KEY;

    if (!enabled || !apiKey) {
      return this.fallback.generate(session, qr, context);
    }

    // STUB: In production, this would:
    // 1. Build a grounded prompt from QR answers
    // 2. Ask LLM to summarize (grounded, no hallucination)
    // 3. LLM must output citations to source answer IDs
    // 4. Must never add facts not present in QR
    // 5. Falls back to template on failure
    // 6. All interactions logged (PHI-redacted)

    return this.fallback.generate(session, qr, context);
  }
}

/* ------------------------------------------------------------------ */
/* Factory                                                              */
/* ------------------------------------------------------------------ */

export function createSummaryProvider(useLLM?: boolean): SummaryProvider {
  if (useLLM) return new LLMSummaryProvider();
  return new TemplateSummaryProvider();
}
