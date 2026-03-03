/**
 * Centralised API base URL for the EHR web app.
 *
 * Every component/store that talks to the Fastify API MUST import from here
 * instead of inlining `process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'`.
 *
 * The lint gate `scripts/qa-gates/no-hardcoded-localhost.mjs` enforces this.
 */

export const API_BASE: string =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * WebSocket base URL derived from API_BASE.
 * Used by BrowserTerminal and any future WS consumers.
 */
export const WS_BASE: string = API_BASE.replace(/^http/, "ws");
