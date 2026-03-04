/**
 * Core Enterprise Intake Pack — universal demographics + consent + chief complaint
 *
 * Every intake session loads this pack. It covers the minimum items required
 * regardless of department, specialty, or chief complaint.
 *
 * Pack ID: core-enterprise-v1
 * Languages: en (Tagalog keys scaffolded)
 */

import type { IntakePack } from '../types.js';

const coreEnterprisePack: IntakePack = {
  packId: 'core-enterprise-v1',
  version: '1.0.0',
  title: 'Core Enterprise Intake',
  description: 'Universal demographics, consent, and chief complaint',
  languages: ['en'],
  applicableContexts: {
    departments: ['*'],
    specialties: ['*'],
    visitTypes: ['*'],
  },
  requiredCoverage: ['demographics', 'consent', 'chief_complaint'],
  items: [
    // --- Demographics confirmation ---
    {
      linkId: 'core-demo-name',
      type: 'display',
      text: 'Please confirm your name and date of birth.',
      section: 'demographics',
      required: false,
      order: 1,
    },
    {
      linkId: 'core-demo-address-confirm',
      type: 'boolean',
      text: 'Is your address on file still current?',
      section: 'demographics',
      required: true,
      order: 2,
    },
    {
      linkId: 'core-demo-address-new',
      type: 'string',
      text: 'What is your current address?',
      section: 'demographics',
      required: false,
      order: 3,
      enableWhen: [{ question: 'core-demo-address-confirm', operator: '=', answer: false }],
    },
    {
      linkId: 'core-demo-phone-confirm',
      type: 'boolean',
      text: 'Is your phone number on file still current?',
      section: 'demographics',
      required: true,
      order: 4,
    },
    {
      linkId: 'core-demo-phone-new',
      type: 'string',
      text: 'What is your current phone number?',
      section: 'demographics',
      required: false,
      order: 5,
      enableWhen: [{ question: 'core-demo-phone-confirm', operator: '=', answer: false }],
    },
    {
      linkId: 'core-demo-emergency-contact',
      type: 'string',
      text: 'Emergency contact name and phone number:',
      section: 'demographics',
      required: true,
      order: 6,
    },
    // --- Consent ---
    {
      linkId: 'core-consent-treatment',
      type: 'boolean',
      text: 'I consent to treatment as recommended by my healthcare provider.',
      section: 'consent',
      required: true,
      order: 10,
    },
    {
      linkId: 'core-consent-privacy',
      type: 'boolean',
      text: 'I acknowledge receipt of the Notice of Privacy Practices.',
      section: 'consent',
      required: true,
      order: 11,
    },
    // --- Chief complaint ---
    {
      linkId: 'core-cc-reason',
      type: 'string',
      text: 'What is the main reason for your visit today?',
      section: 'chief_complaint',
      required: true,
      order: 20,
    },
    {
      linkId: 'core-cc-duration',
      type: 'choice',
      text: 'How long have you had this concern?',
      section: 'chief_complaint',
      required: true,
      order: 21,
      answerOption: [
        { value: 'today', display: 'Started today' },
        { value: 'days', display: 'A few days' },
        { value: 'weeks', display: '1-4 weeks' },
        { value: 'months', display: '1-6 months' },
        { value: 'over6months', display: 'Over 6 months' },
      ],
    },
    {
      linkId: 'core-cc-severity',
      type: 'integer',
      text: 'On a scale of 0-10, how severe is your concern? (0 = none, 10 = worst)',
      section: 'chief_complaint',
      required: true,
      order: 22,
    },
  ],
  complaintClusters: [],
  specialtyTags: [],
  departmentTags: [],
  priority: 100, // Always loaded first
  outputTemplates: {
    hpiTemplate:
      'Patient presents for: {{core-cc-reason}}. Duration: {{core-cc-duration}}. Severity: {{core-cc-severity}}/10.',
    rosTemplate: '',
    noteTemplate:
      'DEMOGRAPHICS: Address confirmed: {{core-demo-address-confirm}}. Phone confirmed: {{core-demo-phone-confirm}}.\nCONSENT: Treatment consent: {{core-consent-treatment}}. Privacy acknowledged: {{core-consent-privacy}}.\nCHIEF COMPLAINT: {{core-cc-reason}}. Duration: {{core-cc-duration}}. Severity: {{core-cc-severity}}/10.',
  },
  scoringThresholds: [],
};

export default coreEnterprisePack;
