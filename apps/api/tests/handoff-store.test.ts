import { describe, expect, it } from 'vitest';

import {
  acceptHandoffReport,
  createHandoffReport,
  submitHandoffReport,
  type PatientHandoff,
} from '../src/routes/handoff/handoff-store.js';

function samplePatient(dfn: string): PatientHandoff {
  return {
    dfn,
    patientName: `PATIENT,${dfn}`,
    roomBed: '101-A',
    sbar: {
      situation: 'Stable for shift handoff.',
      background: 'Admitted for observation.',
      assessment: 'No acute distress.',
      recommendation: 'Continue routine monitoring.',
    },
    todos: [],
    riskFlags: [],
    nursingNotes: 'No overnight events.',
  };
}

function createSubmittedReport(createdBy: { duz: string; name: string }, dfn: string) {
  const report = createHandoffReport({
    ward: '6',
    shiftLabel: 'Night 1900-0700',
    shiftStart: '2026-03-11T19:00:00.000Z',
    shiftEnd: '2026-03-12T07:00:00.000Z',
    createdBy,
    patients: [samplePatient(dfn)],
    shiftNotes: 'Regression test handoff.',
  });

  const submitted = submitHandoffReport(report.id);
  expect(submitted?.status).toBe('submitted');
  return submitted!;
}

describe('handoff store accept semantics', () => {
  it('rejects self-acceptance by the report creator', () => {
    const submitted = createSubmittedReport({ duz: '1', name: 'PROGRAMMER,ONE' }, '900001');

    const accepted = acceptHandoffReport(submitted.id, {
      duz: '1',
      name: 'PROGRAMMER,ONE',
    });

    expect(accepted).toBeUndefined();
  });

  it('allows a different incoming staff member to accept', () => {
    const submitted = createSubmittedReport({ duz: '1', name: 'PROGRAMMER,ONE' }, '900002');

    const accepted = acceptHandoffReport(submitted.id, {
      duz: '42',
      name: 'TDNURSE,ONE',
    });

    expect(accepted?.status).toBe('accepted');
    expect(accepted?.acceptedBy).toEqual({ duz: '42', name: 'TDNURSE,ONE' });
  });
});