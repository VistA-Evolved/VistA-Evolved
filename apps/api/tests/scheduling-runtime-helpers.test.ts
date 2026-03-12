import { describe, expect, it } from 'vitest';

import {
  hasVistaRuntimeError,
  parseReferenceLookupLines,
  parseWaitListEntries,
} from '../src/adapters/scheduling/vista-adapter.js';
import { parseRecallEntries } from '../src/routes/scheduling/index.js';

describe('scheduling runtime helpers', () => {
  it('drops runtime-error payloads from wait-list parsing', () => {
    const entries = parseWaitListEntries(
      "\u0018M  ERROR=S4+12^DICL2, Global variable undefined:^DIC(4'215'0),150372994,-%YDB-E-GVUNDEF"
    );
    expect(entries).toEqual([]);
  });

  it('keeps valid wait-list entries', () => {
    const entries = parseWaitListEntries(
      '123^46^PRIMARY CARE^3240311.09^routine^pending^3240310.12^Follow up'
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.vistaWaitListIen).toBe('123');
    expect(entries[0]?.clinicName).toBe('PRIMARY CARE');
  });

  it('suppresses reference-data runtime error lines', () => {
    const entries = parseReferenceLookupLines([
      '\u0018M  ERROR=OUTPUT+33',
      'SDWLRP1, $DATA() failed because Null subscripts are not allowed for database file: /home/vehu/g/vehu.dat',
    ]);
    expect(entries).toEqual([]);
    expect(
      hasVistaRuntimeError([
        '\u0018M  ERROR=OUTPUT+33',
        'SDWLRP1, $DATA() failed because Null subscripts are not allowed',
      ])
    ).toBe(true);
  });

  it('parses patient-scoped recall JSON payloads into structured entries', () => {
    const entries = parseRecallEntries([
      '{"recalls":[{"RecallIEN":42,"RecallName":"Primary Care Recall","RecallType":"FOLLOWUP"}]}'
    ]);
    expect(entries).toEqual([
      {
        ien: '42',
        description: 'Primary Care Recall',
        recallType: 'FOLLOWUP',
        detail:
          '{"RecallIEN":42,"RecallName":"Primary Care Recall","RecallType":"FOLLOWUP"}',
      },
    ]);
  });

  it('suppresses the sandbox recall empty sentinel', () => {
    const entries = parseRecallEntries(['1^RECALL LIST EMPTY']);
    expect(entries).toEqual([]);
  });
});
