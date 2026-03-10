/**
 * Pack Loader -- registers all built-in packs at import time
 *
 * Import this module once at server startup to populate the pack registry.
 * Total: 23 packs (1 core + 15 complaint + 5 specialty + 2 department)
 */

import { registerPack } from '../pack-registry.js';

// Core
import coreEnterprisePack from './core-enterprise.js';

// Complaint packs -- individual
import chestPainPack from './complaint-chest-pain.js';
import headachePack from './complaint-headache.js';
import abdominalPainPack from './complaint-abdominal-pain.js';

// Complaint packs -- batch 1
import {
  backPainPack,
  coughPack,
  feverPack,
  fatiguePack,
  dizzinessPack,
} from './complaint-batch-1.js';

// Complaint packs -- batch 2
import {
  sobPack,
  soreThroatPack,
  nauseaPack,
  skinRashPack,
  jointPainPack,
} from './complaint-batch-2.js';

// Complaint packs -- behavioral health
import { anxietyPack, depressionPack } from './complaint-behavioral-health.js';

// Specialty packs
import {
  primaryCarePack,
  pediatricsPack,
  obgynPack,
  cardiologyPack,
  behavioralHealthPack,
} from './specialty-packs.js';

// Department packs
import { edTriagePack, outpatientClinicPack } from './department-packs.js';

/* ------------------------------------------------------------------ */
/* Register all packs                                                   */
/* ------------------------------------------------------------------ */

const allPacks = [
  // Core (always loaded, priority 100)
  coreEnterprisePack,

  // Complaint packs (priority 10)
  chestPainPack,
  headachePack,
  abdominalPainPack,
  backPainPack,
  coughPack,
  feverPack,
  fatiguePack,
  dizzinessPack,
  sobPack,
  soreThroatPack,
  nauseaPack,
  skinRashPack,
  jointPainPack,
  anxietyPack,
  depressionPack,

  // Specialty packs (priority 50)
  primaryCarePack,
  pediatricsPack,
  obgynPack,
  cardiologyPack,
  behavioralHealthPack,

  // Department packs (priority 70-90)
  edTriagePack,
  outpatientClinicPack,
];

for (const pack of allPacks) {
  registerPack(pack);
}

export const PACK_COUNT = allPacks.length; // 23
export const PACK_IDS = allPacks.map((p) => p.packId);
