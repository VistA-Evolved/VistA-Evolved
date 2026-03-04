/**
 * Centralised API base URL for the patient portal.
 *
 * Every component that talks to the Fastify API MUST import from here
 * instead of inlining `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'`.
 *
 * The lint gate `scripts/qa-gates/no-hardcoded-localhost.mjs` enforces this.
 */

export const API_BASE: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
