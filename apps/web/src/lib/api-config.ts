/**
 * Centralised API base URL for the EHR web app.
 *
 * Every component/store that talks to the Fastify API MUST import from here
 * instead of inlining environment defaults. In browser-driven dev, the web app
 * may be opened on either 127.0.0.1 or localhost; deriving the API host from
 * the active page avoids cross-host cookie failures that break auth and patient
 * context hydration.
 *
 * The lint gate `scripts/qa-gates/no-hardcoded-localhost.mjs` enforces this.
 */

function inferApiBase(): string {
	if (process.env.NEXT_PUBLIC_API_URL) {
		return process.env.NEXT_PUBLIC_API_URL;
	}

	if (typeof window !== 'undefined' && window.location?.hostname) {
		const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
		return `${protocol}//${window.location.hostname}:3001`;
	}

	return 'http://127.0.0.1:3001';
}

export const API_BASE: string = inferApiBase();

/**
 * WebSocket base URL derived from API_BASE.
 * Used by BrowserTerminal and any future WS consumers.
 */
export const WS_BASE: string = API_BASE.replace(/^http/, 'ws');
