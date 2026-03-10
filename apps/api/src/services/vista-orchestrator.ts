/**
 * VistA Container Orchestrator -- Docker lifecycle for per-tenant VistA instances.
 *
 * Uses `docker` CLI via child_process.execFile (no shell injection, cross-platform).
 * Each tenant gets a dedicated VistA container from the VEHU base image.
 *
 * Lifecycle: create -> start -> healthCheck -> installRoutines -> ready
 *
 * Phase C1 (PromptFolder: SaaS-Orchestration)
 */

import { execFile } from 'node:child_process';
import { createConnection as netConnect } from 'node:net';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from '../lib/logger.js';
import { safeErr } from '../lib/safe-error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VEHU_IMAGE = process.env.VISTA_ORCHESTRATOR_IMAGE || 'worldvista/vehu:latest';
const BASE_PORT = parseInt(process.env.VISTA_ORCHESTRATOR_BASE_PORT || '9440', 10);
const HEALTH_TIMEOUT_MS = parseInt(process.env.VISTA_ORCHESTRATOR_HEALTH_TIMEOUT || '120000', 10);
const ROUTINES_DIR = join(__dirname, '..', '..', '..', '..', 'services', 'vista');

export interface VistaContainerSpec {
  containerName: string;
  hostPort: number;
  tenantId: string;
  timezone?: string;
}

export interface VistaContainerStatus {
  containerName: string;
  status: 'running' | 'stopped' | 'not-found' | 'error';
  hostPort?: number;
  healthy?: boolean;
  uptimeSeconds?: number;
  image?: string;
}

export type OrchestrationResult = { ok: true; containerName: string; hostPort: number }
  | { ok: false; error: string };

// -- Docker CLI wrapper --------------------------------------------

function dockerExec(args: string[], timeoutMs = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = execFile('docker', args, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const msg = stderr?.trim() || err.message;
        reject(new Error(msg));
        return;
      }
      resolve(stdout.trim());
    });
    proc.on('error', reject);
  });
}

// -- Container lifecycle -------------------------------------------

export async function createVistaContainer(spec: VistaContainerSpec): Promise<OrchestrationResult> {
  const { containerName, hostPort, tenantId, timezone } = spec;

  // Check if container already exists
  try {
    const existing = await dockerExec(['inspect', '--format', '{{.State.Status}}', containerName], 10_000);
    if (existing === 'running') {
      log.info('VistA container already running', { containerName, hostPort });
      return { ok: true, containerName, hostPort };
    }
    if (existing === 'exited' || existing === 'created') {
      await dockerExec(['start', containerName]);
      log.info('VistA container restarted', { containerName });
      return { ok: true, containerName, hostPort };
    }
  } catch {
    // Container doesn't exist -- proceed to create
  }

  const args = [
    'run', '-d',
    '--name', containerName,
    '-p', `${hostPort}:9430`,
    '-e', `TZ=${timezone || 'America/New_York'}`,
    '-l', `ve.tenantId=${tenantId}`,
    '-l', 've.managed=true',
    '--restart', 'unless-stopped',
    '--memory', '512m',
    '--cpus', '0.5',
    VEHU_IMAGE,
  ];

  try {
    const containerId = await dockerExec(args, 60_000);
    log.info('VistA container created', { containerName, hostPort, containerId: containerId.slice(0, 12) });
    return { ok: true, containerName, hostPort };
  } catch (err: any) {
    log.error('Failed to create VistA container', { containerName, err: err.message });
    return { ok: false, error: safeErr(err) };
  }
}

export async function stopVistaContainer(containerName: string): Promise<OrchestrationResult> {
  try {
    await dockerExec(['stop', containerName], 30_000);
    log.info('VistA container stopped', { containerName });
    return { ok: true, containerName, hostPort: 0 };
  } catch (err: any) {
    return { ok: false, error: safeErr(err) };
  }
}

export async function removeVistaContainer(containerName: string): Promise<OrchestrationResult> {
  try {
    await dockerExec(['rm', '-f', containerName], 15_000);
    log.info('VistA container removed', { containerName });
    return { ok: true, containerName, hostPort: 0 };
  } catch (err: any) {
    return { ok: false, error: safeErr(err) };
  }
}

export async function restartVistaContainer(containerName: string): Promise<OrchestrationResult> {
  try {
    await dockerExec(['restart', containerName], 30_000);
    log.info('VistA container restarted', { containerName });
    return { ok: true, containerName, hostPort: 0 };
  } catch (err: any) {
    return { ok: false, error: safeErr(err) };
  }
}

export async function getContainerStatus(containerName: string): Promise<VistaContainerStatus> {
  try {
    const json = await dockerExec([
      'inspect', '--format',
      '{{.State.Status}}|{{.State.StartedAt}}|{{.Config.Image}}',
      containerName,
    ], 10_000);
    const [status, startedAt, image] = json.split('|');
    const uptimeSeconds = status === 'running'
      ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      : 0;

    // Find the published port
    let hostPort: number | undefined;
    try {
      const portStr = await dockerExec([
        'inspect', '--format',
        '{{(index (index .NetworkSettings.Ports "9430/tcp") 0).HostPort}}',
        containerName,
      ], 10_000);
      hostPort = parseInt(portStr, 10) || undefined;
    } catch { /* port not mapped */ }

    return {
      containerName,
      status: status === 'running' ? 'running' : 'stopped',
      hostPort,
      image,
      uptimeSeconds,
    };
  } catch {
    return { containerName, status: 'not-found' };
  }
}

export async function listManagedContainers(): Promise<VistaContainerStatus[]> {
  try {
    const output = await dockerExec([
      'ps', '-a', '--filter', 'label=ve.managed=true',
      '--format', '{{.Names}}|{{.Status}}|{{.Ports}}|{{.Image}}',
    ]);
    if (!output) return [];
    return output.split('\n').filter(Boolean).map(line => {
      const [name, statusStr, ports, image] = line.split('|');
      const running = statusStr?.startsWith('Up');
      const portMatch = ports?.match(/:(\d+)->9430/);
      return {
        containerName: name,
        status: running ? 'running' as const : 'stopped' as const,
        hostPort: portMatch ? parseInt(portMatch[1], 10) : undefined,
        image,
      };
    });
  } catch (err: any) {
    log.error('Failed to list managed containers', { err: err.message });
    return [];
  }
}

// -- Health check: wait for VistA broker to be reachable -----------

export function probePort(host: string, port: number, timeoutMs = 5000): Promise<boolean> {
  return new Promise(resolve => {
    const sock = netConnect({ host, port, timeout: timeoutMs });
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => { sock.destroy(); resolve(false); });
    sock.once('timeout', () => { sock.destroy(); resolve(false); });
  });
}

export async function waitForHealthy(
  host: string,
  port: number,
  timeoutMs = HEALTH_TIMEOUT_MS,
): Promise<boolean> {
  const start = Date.now();
  const interval = 3000;
  while (Date.now() - start < timeoutMs) {
    if (await probePort(host, port)) {
      log.info('VistA broker healthy', { host, port, elapsedMs: Date.now() - start });
      return true;
    }
    await new Promise(r => setTimeout(r, interval));
  }
  log.warn('VistA broker health check timed out', { host, port, timeoutMs });
  return false;
}

// -- Routine installer for new containers --------------------------

const PRODUCTION_ROUTINES = [
  'ZVECLIN.m', 'ZVEUSER.m', 'ZVEWARD.m', 'ZVEPHAR.m', 'ZVELAB.m',
  'ZVEBILL.m', 'ZVEFAC.m', 'ZVESYS.m', 'ZVEMIOP.m', 'ZVEMSGR.m',
  'VEMCTX3.m', 'ZVESDSEED.m', 'ZVEMINS.m', 'ZVEMSIN.m', 'ZVECTX.m',
  'ZVERPC.m', 'ZVERCMP.m', 'ZVEADT.m', 'ZVEPROBADD.m',
  'ZVERAD.m', 'ZVEINV.m', 'ZVEWRKF.m', 'ZVEQUAL.m', 'ZVECAPP.m',
  'ZVETNSEED.m',
];

export async function installRoutines(containerName: string, vistaUser = 'vehu'): Promise<{ installed: string[]; failed: string[] }> {
  const installed: string[] = [];
  const failed: string[] = [];

  for (const routine of PRODUCTION_ROUTINES) {
    const srcPath = join(ROUTINES_DIR, routine);
    try {
      readFileSync(srcPath); // verify file exists
    } catch {
      continue; // skip if routine source doesn't exist
    }

    try {
      await dockerExec(['cp', srcPath, `${containerName}:/tmp/${routine}`], 10_000);
      await dockerExec([
        'exec', containerName, 'bash', '-c',
        `cp /tmp/${routine} /home/${vistaUser}/r/${routine} && chown ${vistaUser}:${vistaUser} /home/${vistaUser}/r/${routine}`,
      ], 10_000);
      installed.push(routine);
    } catch (err: any) {
      log.error('Failed to install routine', { containerName, routine, err: err.message });
      failed.push(routine);
    }
  }

  // Run INSTALL tags for routines that have them
  const installableRoutines = [
    'ZVEUSER', 'ZVECLIN', 'ZVEWARD', 'ZVEPHAR', 'ZVELAB', 'ZVEBILL', 'ZVEFAC',
    'ZVESYS', 'ZVERAD', 'ZVEINV', 'ZVEWRKF', 'ZVEQUAL', 'ZVECAPP', 'ZVERPC', 'ZVERCMP', 'ZVEADT', 'ZVEPROBADD',
  ];
  for (const rtn of installableRoutines) {
    if (!installed.includes(`${rtn}.m`)) continue;
    try {
      await dockerExec([
        'exec', containerName, 'su', '-', vistaUser, '-c',
        `mumps -r INSTALL^${rtn}`,
      ], 30_000);
    } catch (err: any) {
      log.warn('Routine INSTALL tag failed (non-fatal)', { containerName, routine: rtn, err: err.message });
    }
  }

  // Register context (all admin RPCs + interop + mailman)
  if (installed.includes('VEMCTX3.m')) {
    try {
      await dockerExec([
        'exec', containerName, 'su', '-', vistaUser, '-c',
        'mumps -r ADDALL^VEMCTX3',
      ], 30_000);
    } catch (err: any) {
      log.warn('VEMCTX3 context registration failed (non-fatal)', { containerName, err: err.message });
    }
  }

  // Register admin context (ZVECTX adds all VE admin RPCs)
  if (installed.includes('ZVECTX.m')) {
    try {
      await dockerExec([
        'exec', containerName, 'su', '-', vistaUser, '-c',
        'mumps -r EN^ZVECTX',
      ], 30_000);
    } catch (err: any) {
      log.warn('ZVECTX context registration failed (non-fatal)', { containerName, err: err.message });
    }
  }

  // Install interop RPCs
  if (installed.includes('ZVEMIOP.m') && installed.includes('ZVEMINS.m')) {
    try {
      await dockerExec([
        'exec', containerName, 'su', '-', vistaUser, '-c',
        'mumps -r RUN^ZVEMINS',
      ], 30_000);
    } catch (err: any) {
      log.warn('Interop RPC install failed (non-fatal)', { containerName, err: err.message });
    }
  }

  // Install mailman RPCs
  if (installed.includes('ZVEMSGR.m') && installed.includes('ZVEMSIN.m')) {
    try {
      await dockerExec([
        'exec', containerName, 'su', '-', vistaUser, '-c',
        'mumps -r EN^ZVEMSIN',
      ], 30_000);
    } catch (err: any) {
      log.warn('Mailman RPC install failed (non-fatal)', { containerName, err: err.message });
    }
  }

  log.info('Routine installation complete', { containerName, installed: installed.length, failed: failed.length });
  return { installed, failed };
}

// -- Tenant config seeder ------------------------------------------

export interface TenantSeedConfig {
  facilityName: string;
  stationNumber?: string;
  divisionName?: string;
}

export async function seedTenantConfig(
  containerName: string,
  config: TenantSeedConfig,
  vistaUser = 'vehu',
): Promise<{ ok: boolean; output?: string; error?: string }> {
  // Sanitize inputs: only allow alphanumeric, space, hyphen, and period
  const sanitize = (s: string) => s.replace(/[^A-Za-z0-9 .\-]/g, '');
  const facName = sanitize(config.facilityName || 'NEW FACILITY');
  const station = sanitize(config.stationNumber || '500');
  const divName = sanitize(config.divisionName || facName);

  // Write a temporary .m wrapper to avoid shell quoting issues (gotcha #11)
  const wrapperContent = [
    'ZVESERUN ;VE - Auto-generated seed runner',
    ` D SEED^ZVETNSEED("${facName}","${station}","${divName}")`,
    ' Q',
    '',
  ].join('\n');

  const tmpFile = join(tmpdir(), 'ZVESERUN.m');
  try {
    writeFileSync(tmpFile, wrapperContent, 'ascii');

    // Copy wrapper into container
    await dockerExec(['cp', tmpFile, `${containerName}:/tmp/ZVESERUN.m`], 10_000);
    await dockerExec([
      'exec', containerName, 'bash', '-c',
      `cp /tmp/ZVESERUN.m /home/${vistaUser}/r/ZVESERUN.m && chown ${vistaUser}:${vistaUser} /home/${vistaUser}/r/ZVESERUN.m && rm -f /home/${vistaUser}/r/r2.02_x86_64/ZVESERUN.o`,
    ], 10_000);

    // Execute the seed
    const output = await dockerExec([
      'exec', containerName, 'su', '-', vistaUser, '-c',
      'mumps -r ZVESERUN',
    ], 60_000);

    log.info('Tenant config seeded', { containerName, facilityName: facName, output: output.slice(0, 500) });
    return { ok: true, output };
  } catch (err: any) {
    log.error('Tenant config seed failed', { containerName, err: err.message });
    return { ok: false, error: safeErr(err) };
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore cleanup errors */ }
  }
}

// -- Full provisioning pipeline ------------------------------------

export async function provisionVistaInstance(spec: VistaContainerSpec, seedConfig?: TenantSeedConfig): Promise<{
  ok: boolean;
  containerName: string;
  hostPort: number;
  healthy: boolean;
  routinesInstalled: number;
  seeded: boolean;
  error?: string;
}> {
  const createResult = await createVistaContainer(spec);
  if (!createResult.ok) {
    return { ok: false, containerName: spec.containerName, hostPort: spec.hostPort, healthy: false, routinesInstalled: 0, seeded: false, error: createResult.error };
  }

  const healthy = await waitForHealthy('127.0.0.1', spec.hostPort);
  if (!healthy) {
    return { ok: false, containerName: spec.containerName, hostPort: spec.hostPort, healthy: false, routinesInstalled: 0, seeded: false, error: 'VistA broker did not become healthy within timeout' };
  }

  const routineResult = await installRoutines(spec.containerName);

  // Seed tenant config if provided
  let seeded = false;
  if (seedConfig) {
    const seedResult = await seedTenantConfig(spec.containerName, seedConfig);
    seeded = seedResult.ok;
    if (!seedResult.ok) {
      log.warn('Tenant seed failed (non-fatal)', { containerName: spec.containerName, error: seedResult.error });
    }
  }

  return {
    ok: true,
    containerName: spec.containerName,
    hostPort: spec.hostPort,
    healthy: true,
    routinesInstalled: routineResult.installed.length,
    seeded,
  };
}

// -- Port allocation -----------------------------------------------

const allocatedPorts = new Set<number>();

export async function allocatePort(tenantId: string): Promise<number> {
  // Start from BASE_PORT, find first available
  const managed = await listManagedContainers();
  const usedPorts = new Set(managed.map(c => c.hostPort).filter(Boolean));

  // Also include ports from our local tracking
  for (const p of allocatedPorts) usedPorts.add(p);

  let port = BASE_PORT;
  while (usedPorts.has(port) && port < BASE_PORT + 1000) {
    port++;
  }
  if (port >= BASE_PORT + 1000) {
    throw new Error('No available ports in range');
  }
  allocatedPorts.add(port);
  return port;
}
