/**
 * Onboarding State Store
 *
 * Phase 243 (Wave 6 P6): Tracks multi-step facility onboarding wizard state.
 * In-memory store (matches project pattern).
 *
 * Steps:
 *   1. tenant      — Create/configure tenant (facility name, station, VistA host/port)
 *   2. vista-probe  — Verify VistA connectivity (TCP probe + optional auth)
 *   3. modules      — Select enabled modules from SKU profile
 *   4. users        — Invite initial users / configure roles
 *   5. complete     — Review + finalize
 */

import * as crypto from 'node:crypto';
import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type OnboardingStep = 'tenant' | 'vista-probe' | 'modules' | 'users' | 'complete';

export const STEP_ORDER: OnboardingStep[] = [
  'tenant',
  'vista-probe',
  'modules',
  'users',
  'complete',
];

export interface OnboardingStepData {
  step: OnboardingStep;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  data?: Record<string, unknown>;
  completedAt?: string;
}

export interface OnboardingSession {
  id: string;
  tenantId: string;
  currentStep: OnboardingStep;
  steps: OnboardingStepData[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  completedAt?: string;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

const sessions = new Map<string, OnboardingSession>();

function genId(): string {
  return `onb-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function createOnboarding(tenantId: string, createdBy: string): OnboardingSession {
  const now = new Date().toISOString();
  const session: OnboardingSession = {
    id: genId(),
    tenantId,
    currentStep: 'tenant',
    steps: STEP_ORDER.map((step) => ({
      step,
      status: step === 'tenant' ? 'in-progress' : 'pending',
    })),
    createdAt: now,
    updatedAt: now,
    createdBy,
  };
  sessions.set(session.id, session);
  log.info('Onboarding session created', { sessionId: session.id, tenantId });
  return session;
}

export function getOnboarding(id: string): OnboardingSession | undefined {
  return sessions.get(id);
}

export function listOnboardingSessions(tenantId?: string): OnboardingSession[] {
  const all = Array.from(sessions.values());
  if (tenantId) return all.filter((s) => s.tenantId === tenantId);
  return all;
}

export function advanceStep(
  id: string,
  stepData?: Record<string, unknown>
): OnboardingSession | null {
  const session = sessions.get(id);
  if (!session) return null;

  const now = new Date().toISOString();
  const currentIdx = STEP_ORDER.indexOf(session.currentStep);

  // Mark current step completed
  const currentStepObj = session.steps.find((s) => s.step === session.currentStep);
  if (currentStepObj) {
    currentStepObj.status = 'completed';
    currentStepObj.completedAt = now;
    if (stepData) currentStepObj.data = stepData;
  }

  // Advance to next step
  if (currentIdx < STEP_ORDER.length - 1) {
    const nextStep = STEP_ORDER[currentIdx + 1];
    session.currentStep = nextStep;
    const nextStepObj = session.steps.find((s) => s.step === nextStep);
    if (nextStepObj) nextStepObj.status = 'in-progress';
  } else {
    // Final step completed
    session.completedAt = now;
  }

  session.updatedAt = now;
  log.info('Onboarding step advanced', { sessionId: id, currentStep: session.currentStep });
  return session;
}

export function updateStepData(
  id: string,
  step: OnboardingStep,
  data: Record<string, unknown>
): OnboardingSession | null {
  const session = sessions.get(id);
  if (!session) return null;

  const stepObj = session.steps.find((s) => s.step === step);
  if (!stepObj) return null;

  stepObj.data = { ...stepObj.data, ...data };
  session.updatedAt = new Date().toISOString();
  return session;
}

export function deleteOnboarding(id: string): boolean {
  return sessions.delete(id);
}
