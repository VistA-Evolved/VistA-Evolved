/**
 * Telehealth Hardening — Contract Tests
 *
 * Phase 307 (W12-P9): Tests for encounter linkage, consent posture,
 * and session hardening modules.
 *
 * All tests are pure unit tests — no VistA connection required.
 * No PHI anywhere in test fixtures.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Encounter Linkage ──────────────────────────────────────────────

import {
  createEncounterLink,
  getEncounterLink,
  updateLinkStatus,
  listEncounterLinks,
  getEncounterLinkStats,
  hashPatientRef,
  clearEncounterLinks,
} from '../../telehealth/encounter-link.js';

describe('encounter-link', () => {
  beforeEach(() => {
    clearEncounterLinks();
  });

  it('createEncounterLink returns pending link', () => {
    const link = createEncounterLink('room-1', 'appt-1', 'hash-abc', '87');
    expect(link.roomId).toBe('room-1');
    expect(link.appointmentId).toBe('appt-1');
    expect(link.status).toBe('pending');
    expect(link.patientRefHash).toBe('hash-abc');
    expect(link.providerDuz).toBe('87');
    expect(link.createdAt).toBeTruthy();
  });

  it('getEncounterLink retrieves by roomId', () => {
    createEncounterLink('room-2', 'appt-2', 'hash-def', '87');
    const link = getEncounterLink('room-2');
    expect(link).toBeDefined();
    expect(link!.appointmentId).toBe('appt-2');
  });

  it('updateLinkStatus transitions to linked', () => {
    createEncounterLink('room-3', 'appt-3', 'hash-ghi', '87');
    const updated = updateLinkStatus('room-3', 'linked', '12345', '3250101');
    expect(updated).toBeDefined();
    expect(updated!.status).toBe('linked');
    expect(updated!.encounterIen).toBe('12345');
    expect(updated!.visitDate).toBe('3250101');
  });

  it('updateLinkStatus to integration_pending includes vistaGrounding', () => {
    createEncounterLink('room-4', 'appt-4', 'hash-jkl', '87');
    const updated = updateLinkStatus(
      'room-4',
      'integration_pending',
      undefined,
      undefined,
      'ORWPCE SAVE not available in sandbox',
      {
        targetRpc: 'ORWPCE SAVE',
        vistaFiles: ['9000010'],
        migrationPath: 'Enable ORWPCE SAVE when PCE data is available',
        sandboxNote: 'WorldVistA Docker lacks PCE encounter creation support',
      }
    );
    expect(updated!.status).toBe('integration_pending');
    expect(updated!.vistaGrounding?.targetRpc).toBe('ORWPCE SAVE');
  });

  it('listEncounterLinks returns all links', () => {
    createEncounterLink('room-a', 'appt-a', 'hash-1', '87');
    createEncounterLink('room-b', 'appt-b', 'hash-2', '87');
    const all = listEncounterLinks();
    expect(all.length).toBe(2);
  });

  it('getEncounterLinkStats aggregates by status', () => {
    createEncounterLink('room-s1', 'appt-s1', 'hash-s1', '87');
    createEncounterLink('room-s2', 'appt-s2', 'hash-s2', '87');
    updateLinkStatus('room-s2', 'linked', '999');
    const stats = getEncounterLinkStats();
    expect(stats.total).toBe(2);
    expect(stats.byStatus.pending).toBe(1);
    expect(stats.byStatus.linked).toBe(1);
  });

  it('hashPatientRef returns 16-char hash (no raw DFN)', () => {
    const hash = hashPatientRef('3');
    expect(hash.length).toBe(16);
    expect(hash).not.toContain('3');
  });

  it('returns undefined for nonexistent room', () => {
    expect(getEncounterLink('nonexistent')).toBeUndefined();
  });

  it('updateLinkStatus returns undefined for nonexistent room', () => {
    expect(updateLinkStatus('nonexistent', 'linked')).toBeUndefined();
  });
});

// ─── Consent Posture ────────────────────────────────────────────────

import {
  recordConsent,
  evaluateConsentPosture,
  getConsentRecords,
  withdrawConsent,
  getConsentStats,
  hashParticipant,
  clearConsentStore,
  DEFAULT_CONSENT_REQUIREMENTS,
} from '../../telehealth/consent-posture.js';

describe('consent-posture', () => {
  beforeEach(() => {
    clearConsentStore();
  });

  it('recordConsent creates a consent record', () => {
    const record = recordConsent(
      'room-c1',
      'patient-hash',
      'patient',
      'telehealth_video',
      'granted',
      'ui_click'
    );
    expect(record.id).toMatch(/^csnt-/);
    expect(record.roomId).toBe('room-c1');
    expect(record.category).toBe('telehealth_video');
    expect(record.decision).toBe('granted');
    expect(record.participantRole).toBe('patient');
  });

  it('recordConsent is idempotent (updates existing)', () => {
    recordConsent('room-c2', 'patient-hash', 'patient', 'telehealth_video', 'pending');
    const updated = recordConsent(
      'room-c2',
      'patient-hash',
      'patient',
      'telehealth_video',
      'granted'
    );
    expect(updated.decision).toBe('granted');
    const records = getConsentRecords('room-c2');
    expect(records.length).toBe(1); // Not duplicated
  });

  it('evaluateConsentPosture: videoReady when patient grants video consent', () => {
    recordConsent('room-c3', 'patient-hash', 'patient', 'telehealth_video', 'granted');
    const posture = evaluateConsentPosture('room-c3');
    expect(posture.videoReady).toBe(true);
    expect(posture.missingConsents.length).toBe(0);
  });

  it('evaluateConsentPosture: NOT videoReady when patient video consent missing', () => {
    const posture = evaluateConsentPosture('room-c4');
    expect(posture.videoReady).toBe(false);
    expect(posture.missingConsents.length).toBeGreaterThan(0);
    expect(posture.missingConsents[0].category).toBe('telehealth_video');
  });

  it('evaluateConsentPosture: recordingAllowed only if all parties granted', () => {
    recordConsent('room-c5', 'patient-hash', 'patient', 'telehealth_recording', 'granted');
    const posture1 = evaluateConsentPosture('room-c5');
    expect(posture1.recordingAllowed).toBe(true); // Only patient recorded

    recordConsent('room-c5', 'provider-hash', 'provider', 'telehealth_recording', 'denied');
    const posture2 = evaluateConsentPosture('room-c5');
    expect(posture2.recordingAllowed).toBe(false); // Provider denied
  });

  it('withdrawConsent changes decision to withdrawn', () => {
    recordConsent('room-c6', 'patient-hash', 'patient', 'telehealth_video', 'granted');
    const withdrawn = withdrawConsent('room-c6', 'patient-hash', 'telehealth_video');
    expect(withdrawn).toBeDefined();
    expect(withdrawn!.decision).toBe('withdrawn');

    const posture = evaluateConsentPosture('room-c6');
    expect(posture.videoReady).toBe(false); // No longer granted
  });

  it('getConsentStats aggregates decisions', () => {
    recordConsent('room-c7', 'p1', 'patient', 'telehealth_video', 'granted');
    recordConsent('room-c7', 'p2', 'provider', 'telehealth_recording', 'denied');
    const stats = getConsentStats();
    expect(stats.trackedRooms).toBe(1);
    expect(stats.totalRecords).toBe(2);
    expect(stats.byDecision.granted).toBe(1);
    expect(stats.byDecision.denied).toBe(1);
  });

  it('hashParticipant returns 16-char hash (no raw identity)', () => {
    const hash = hashParticipant('patient@example.com');
    expect(hash.length).toBe(16);
  });

  it('DEFAULT_CONSENT_REQUIREMENTS has video as required', () => {
    const videoReq = DEFAULT_CONSENT_REQUIREMENTS.find((r) => r.category === 'telehealth_video');
    expect(videoReq).toBeDefined();
    expect(videoReq!.required).toBe(true);
    expect(videoReq!.requiredRoles).toContain('patient');
  });

  it('DEFAULT_CONSENT_REQUIREMENTS has recording as NOT required', () => {
    const recReq = DEFAULT_CONSENT_REQUIREMENTS.find((r) => r.category === 'telehealth_recording');
    expect(recReq).toBeDefined();
    expect(recReq!.required).toBe(false);
    expect(recReq!.defaultDecision).toBe('denied'); // Recording OFF by default
  });
});

// ─── Session Hardening ──────────────────────────────────────────────

import {
  recordHeartbeat,
  markParticipantEnded,
  getRoomHeartbeats,
  getSessionMetrics,
  sweepStaleSessions,
  getHardeningConfig,
  clearHeartbeats,
  setAutoEndCallback,
} from '../../telehealth/session-hardening.js';

describe('session-hardening', () => {
  beforeEach(() => {
    clearHeartbeats();
    setAutoEndCallback(null as any);
  });

  it('recordHeartbeat creates connected participant', () => {
    const hb = recordHeartbeat('room-h1', 'p1', 'provider', 'good');
    expect(hb.roomId).toBe('room-h1');
    expect(hb.state).toBe('connected');
    expect(hb.networkQuality).toBe('good');
    expect(hb.reconnectionCount).toBe(0);
  });

  it('recordHeartbeat updates existing participant', () => {
    recordHeartbeat('room-h2', 'p1', 'provider', 'good');
    const hb = recordHeartbeat('room-h2', 'p1', 'provider', 'fair');
    expect(hb.networkQuality).toBe('fair');
  });

  it('markParticipantEnded sets state to ended', () => {
    recordHeartbeat('room-h3', 'p1', 'provider');
    const ended = markParticipantEnded('room-h3', 'p1');
    expect(ended).toBeDefined();
    expect(ended!.state).toBe('ended');
    expect(ended!.disconnectedAt).toBeTruthy();
  });

  it('getRoomHeartbeats returns all participants', () => {
    recordHeartbeat('room-h4', 'p1', 'provider');
    recordHeartbeat('room-h4', 'p2', 'patient');
    const hbs = getRoomHeartbeats('room-h4');
    expect(hbs.length).toBe(2);
  });

  it('getSessionMetrics computes duration and reconnections', () => {
    recordHeartbeat('room-h5', 'p1', 'provider', 'good');
    recordHeartbeat('room-h5', 'p2', 'patient', 'fair');
    const metrics = getSessionMetrics('room-h5');
    expect(metrics.roomId).toBe('room-h5');
    expect(metrics.participantCount).toBe(2);
    expect(metrics.totalReconnections).toBe(0);
    expect(metrics.durationSeconds).toBeGreaterThanOrEqual(0);
    expect(metrics.avgNetworkQuality).toBeDefined();
  });

  it('sweepStaleSessions returns empty for active rooms', () => {
    recordHeartbeat('room-h6', 'p1', 'provider');
    const candidates = sweepStaleSessions();
    expect(candidates.length).toBe(0);
  });

  it('getHardeningConfig returns valid configuration', () => {
    const config = getHardeningConfig();
    expect(config.heartbeatIntervalMs).toBeGreaterThan(0);
    expect(config.reconnectionWindowMs).toBeGreaterThan(0);
    expect(config.autoEndTimeoutMs).toBeGreaterThan(0);
    expect(config.sweepIntervalMs).toBeGreaterThan(0);
    expect(typeof config.trackedRooms).toBe('number');
    expect(typeof config.totalParticipants).toBe('number');
  });

  it('markParticipantEnded returns undefined for nonexistent room', () => {
    expect(markParticipantEnded('nonexistent', 'p1')).toBeUndefined();
  });

  it('getRoomHeartbeats returns empty for nonexistent room', () => {
    expect(getRoomHeartbeats('nonexistent')).toEqual([]);
  });
});
