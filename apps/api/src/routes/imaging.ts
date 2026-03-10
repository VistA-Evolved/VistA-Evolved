/**
 * Imaging Viewer Integration - Phase 14D.
 *
 * Provides a clean integration interface for VistA Imaging (MAG4) and
 * Radiology (RA) report access. Detects whether imaging APIs are available
 * at runtime and exposes viewer enabled/disabled state.
 *
 * GET /vista/imaging/status    - viewer enabled/disabled + capabilities
 * GET /vista/imaging/report    - radiology report text (if available)
 *
 * This is a plugin interface: a future imaging viewer can be registered
 * by implementing the ImagingViewerPlugin interface and registering it
 * at application startup.
 */

import type { FastifyInstance } from 'fastify';
import { validateCredentials } from '../vista/config.js';
import { connect, disconnect, callRpc } from '../vista/rpcBrokerClient.js';
import { optionalRpc } from '../vista/rpcCapabilities.js';
import { safeErr } from '../lib/safe-error.js';

/* ------------------------------------------------------------------ */
/* Plugin interface for future viewer                                   */
/* ------------------------------------------------------------------ */

export interface ImagingViewerPlugin {
	name: string;
	version: string;
	/** Whether the plugin can render images (vs just text reports) */
	supportsImageDisplay: boolean;
	/** Initialize the plugin (called once on server start) */
	initialize(): Promise<void>;
	/** Get image URLs for a patient */
	getImages(dfn: string, caseId?: string): Promise<{ url: string; description: string }[]>;
}

/** Registered plugins (future extensibility) */
const plugins: ImagingViewerPlugin[] = [];

export function registerImagingPlugin(plugin: ImagingViewerPlugin): void {
	plugins.push(plugin);
	// Plugin registration logged via structured logger at startup
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

export default async function imagingRoutes(server: FastifyInstance): Promise<void> {
	/**
	 * GET /vista/imaging/status
	 *
	 * Returns imaging system availability and capabilities.
	 */
	server.get('/vista/imaging/status', async () => {
		const mag4Check = optionalRpc('MAG4 REMOTE PROCEDURE');
		const raCheck = optionalRpc('RA DETAILED REPORT');

		return {
			ok: true,
			viewerEnabled: mag4Check.available || raCheck.available || plugins.length > 0,
			capabilities: {
				vistaImaging: {
					available: mag4Check.available,
					rpc: 'MAG4 REMOTE PROCEDURE',
					status: mag4Check.available ? 'active' : 'not-available-on-distro',
				},
				radiology: {
					available: raCheck.available,
					rpc: 'RA DETAILED REPORT',
					status: raCheck.available ? 'active' : 'not-available-on-distro',
				},
				plugins: plugins.map((p) => ({
					name: p.name,
					version: p.version,
					supportsImageDisplay: p.supportsImageDisplay,
				})),
			},
			integrationReady: true,
			message:
				mag4Check.available || raCheck.available
					? 'Imaging APIs detected. Viewer integration active.'
					: 'Imaging APIs not available on this distro. Plugin interface ready for external viewer.',
		};
	});

	/**
	 * GET /vista/imaging/report?dfn=1&caseId=123
	 *
	 * Returns radiology report text if RA DETAILED REPORT is available.
	 */
	server.get('/vista/imaging/report', async (request, reply) => {
		const { dfn, caseId } = request.query as any;
		if (!dfn) {
			return reply.code(400).send({ ok: false, error: 'Missing dfn' });
		}

		const raCheck = optionalRpc('RA DETAILED REPORT');
		if (!raCheck.available) {
			return {
				ok: true,
				available: false,
				message:
					'RA DETAILED REPORT not available on this distro. Radiology reports require VistA Imaging integration.',
			};
		}

		try {
			validateCredentials();
			await connect();
			const resp = await callRpc('RA DETAILED REPORT', [String(dfn), String(caseId || '')]);
			disconnect();
			return { ok: true, available: true, text: resp.join('\n'), rpcUsed: 'RA DETAILED REPORT' };
		} catch (err: any) {
			disconnect();
			return { ok: false, error: safeErr(err) };
		}
	});
}
