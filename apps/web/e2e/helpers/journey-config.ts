/**
 * Clinical Journey Configuration -- Phase 252
 *
 * Defines evidence-mode clinical journeys for pilot go-live verification.
 * Each journey is a named sequence of steps with expected outcomes.
 */

export interface JourneyStep {
  /** Step name for evidence labeling */
  name: string;
  /** Route to navigate to (relative to base URL) */
  route?: string;
  /** Action description */
  action: string;
  /** Expected text or selector to verify step completed */
  expectText?: string | RegExp;
  /** Expected selector to be visible */
  expectSelector?: string;
  /** Whether to capture a screenshot at this step */
  screenshot: boolean;
}

export interface ClinicalJourney {
  /** Journey identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Which clinical domain this covers */
  domain: string;
  /** Ordered steps */
  steps: JourneyStep[];
}

const TEST_DFN = process.env.VISTA_TEST_DFN ?? '46';
const chartRoute = (slug: string) => `/cprs/chart/${TEST_DFN}/${slug}`;

/**
 * Journey: Clinician Login -> Patient Selection -> Chart Review
 *
 * The canonical "morning workflow" -- provider logs in, picks a patient,
 * reviews the cover sheet, checks allergies, reviews meds.
 */
export const CHART_REVIEW_JOURNEY: ClinicalJourney = {
  id: 'chart-review',
  name: 'Clinician Chart Review',
  domain: 'clinical',
  steps: [
    {
      name: 'login-page',
      route: '/',
      action: 'Navigate to login page',
      expectSelector: 'input',
      screenshot: true,
    },
    {
      name: 'post-login',
      action: 'Login with provider credentials',
      expectText: /patient|search|dashboard/i,
      screenshot: true,
    },
    {
      name: 'patient-search',
      route: '/patient-search',
      action: 'Open patient search',
      expectText: /search|patient/i,
      screenshot: true,
    },
    {
      name: 'cover-sheet',
      route: chartRoute('cover'),
      action: 'Open cover sheet for patient DFN=46',
      expectText: /cover|sheet|allerg|problem|med|pending/i,
      screenshot: true,
    },
    {
      name: 'problems-tab',
      route: chartRoute('problems'),
      action: 'Navigate to problems tab',
      expectText: /problem|condition|pending/i,
      screenshot: true,
    },
    {
      name: 'meds-tab',
      route: chartRoute('meds'),
      action: 'Navigate to medications tab',
      expectText: /med|prescription|pending/i,
      screenshot: true,
    },
    {
      name: 'notes-tab',
      route: chartRoute('notes'),
      action: 'Navigate to notes tab',
      expectText: /note|document|tiu|pending/i,
      screenshot: true,
    },
  ],
};

/**
 * Journey: Admin -> Integration Console -> Posture Check
 */
export const ADMIN_POSTURE_JOURNEY: ClinicalJourney = {
  id: 'admin-posture',
  name: 'Admin Posture Check',
  domain: 'admin',
  steps: [
    {
      name: 'admin-landing',
      route: '/cprs/admin',
      action: 'Navigate to admin area',
      screenshot: true,
    },
    {
      name: 'integrations-tab',
      route: '/cprs/admin/integrations',
      action: 'Check integration console',
      screenshot: true,
    },
    {
      name: 'analytics-tab',
      route: '/cprs/admin/analytics',
      action: 'Check analytics dashboard',
      screenshot: true,
    },
  ],
};

/**
 * Journey: FHIR Metadata -> API endpoint smoke
 * (API-only, no UI navigation)
 */
export const FHIR_SMOKE_JOURNEY: ClinicalJourney = {
  id: 'fhir-smoke',
  name: 'FHIR R4 Endpoint Smoke',
  domain: 'fhir',
  steps: [
    {
      name: 'metadata',
      action: 'GET /fhir/metadata -- CapabilityStatement',
      expectText: /CapabilityStatement/,
      screenshot: false,
    },
    {
      name: 'smart-config',
      action: 'GET /.well-known/smart-configuration',
      expectText: /authorization_endpoint/,
      screenshot: false,
    },
  ],
};

/**
 * All journeys for Phase 252 evidence capture
 */
export const ALL_JOURNEYS: ClinicalJourney[] = [
  CHART_REVIEW_JOURNEY,
  ADMIN_POSTURE_JOURNEY,
  FHIR_SMOKE_JOURNEY,
];
