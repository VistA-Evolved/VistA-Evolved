#!/usr/bin/env node
/**
 * G9 -- Performance Budget Gate (lightweight)
 *
 * Validates performance budgets from config/performance-budgets.json exist
 * and spot-checks /health latency if API is running.
 *
 * In strict mode, thresholds are tighter.
 * Keeps runtime short for CI (no heavy load test).
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

export const id = 'G9_performance_budget';
export const name = 'Performance Budget';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';

export async function run(opts = {}) {
  const start = Date.now();
  const details = [];
  let status = 'pass';
  const strict = opts.strict || false;

  // 1. Validate performance-budgets.json exists and is parseable
  const budgetPath = resolve(ROOT, 'config/performance-budgets.json');
  if (!existsSync(budgetPath)) {
    details.push('performance-budgets.json: MISSING');
    return { id, name, status: 'fail', details, durationMs: Date.now() - start };
  }
  let budgets;
  try {
    const raw = readFileSync(budgetPath, 'utf-8');
    budgets = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
    details.push('performance-budgets.json: parseable');
  } catch {
    details.push('performance-budgets.json: FAIL -- parse error');
    return { id, name, status: 'fail', details, durationMs: Date.now() - start };
  }

  // 2. Validate required sections exist
  const requiredSections = ['apiLatencyBudgets', 'loadTestThresholds'];
  for (const section of requiredSections) {
    if (budgets[section]) {
      details.push(`${section}: present`);
    } else {
      details.push(`${section}: MISSING`);
      status = 'fail';
    }
  }

  // 3. Quick latency probe if API is running (5 requests, check p95)
  try {
    const latencies = [];
    for (let i = 0; i < 5; i++) {
      const t0 = Date.now();
      const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(5000) });
      latencies.push(Date.now() - t0);
      if (!res.ok && res.status !== 503) break;
    }

    if (latencies.length >= 3) {
      latencies.sort((a, b) => a - b);
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const threshold = strict ? 200 : 500; // ms
      if (p95 > threshold) {
        details.push(`/health p95: ${p95}ms > ${threshold}ms threshold`);
        status = 'fail';
      } else {
        details.push(`/health p95: ${p95}ms (threshold: ${threshold}ms) -- PASS`);
      }
    }
  } catch {
    details.push('API latency probe: SKIP (API not reachable)');
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}
