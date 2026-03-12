/**
 * Centralised API base URL for the patient portal.
 *
 * Every component that talks to the Fastify API MUST import from here
 * instead of inlining an environment fallback.
 *
 * The portal runs on a separate Next origin in dev. Derive the default API
 * host from the current browser hostname so session cookies stay on the same
 * host family (`localhost` or `127.0.0.1`) as the page that initiated login.
 */

function resolveDefaultApiBase(): string {
	if (typeof window !== 'undefined') {
		return `${window.location.protocol}//${window.location.hostname}:3001`;
	}
	return 'http://127.0.0.1:3001';
}

export const API_BASE: string = process.env.NEXT_PUBLIC_API_URL || resolveDefaultApiBase();
