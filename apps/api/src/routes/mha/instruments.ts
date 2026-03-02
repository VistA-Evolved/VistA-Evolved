/**
 * MHA Instrument Loader — Phase 535
 *
 * Loads FHIR R4 Questionnaire definitions from data/instruments/.
 * Each .questionnaire.json file is a standard FHIR Questionnaire resource.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { log } from "../../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export interface FhirCoding {
  system?: string;
  code: string;
  display: string;
}

export interface FhirAnswerOption {
  valueCoding: FhirCoding;
}

export interface FhirQuestionnaireItem {
  linkId: string;
  text: string;
  type: string;
  required?: boolean;
  answerOption?: FhirAnswerOption[];
  item?: FhirQuestionnaireItem[];  // nested groups
}

export interface FhirQuestionnaire {
  resourceType: "Questionnaire";
  id: string;
  url?: string;
  name: string;
  title: string;
  status: string;
  description?: string;
  code?: FhirCoding[];
  item: FhirQuestionnaireItem[];
}

/* ------------------------------------------------------------------ */
/* Catalog                                                              */
/* ------------------------------------------------------------------ */

const instrumentCatalog = new Map<string, FhirQuestionnaire>();

/**
 * Load all .questionnaire.json files from the data/instruments directory.
 * Called once at startup.
 */
export function loadInstruments(): void {
  const dataDir = resolve(
    process.cwd(),
    "data",
    "instruments",
  );

  let files: string[];
  try {
    files = readdirSync(dataDir).filter((f) =>
      f.endsWith(".questionnaire.json"),
    );
  } catch {
    // Try relative from project root (monorepo)
    const altDir = resolve(
      process.cwd(),
      "..",
      "..",
      "data",
      "instruments",
    );
    try {
      files = readdirSync(altDir).filter((f) =>
        f.endsWith(".questionnaire.json"),
      );
      loadFilesFromDir(altDir, files);
      return;
    } catch {
      log.warn("MHA: No instruments directory found. Instrument catalog empty.");
      return;
    }
  }

  loadFilesFromDir(dataDir, files);
}

function loadFilesFromDir(dir: string, files: string[]): void {
  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), "utf-8");
      const q: FhirQuestionnaire = JSON.parse(raw);
      if (q.resourceType !== "Questionnaire" || !q.id) {
        log.warn(`MHA: Skipping ${file} — not a valid FHIR Questionnaire`);
        continue;
      }
      instrumentCatalog.set(q.id, q);
    } catch (err: any) {
      log.warn(`MHA: Failed to load ${file}: ${err.message}`);
    }
  }
  log.info(`MHA: Loaded ${instrumentCatalog.size} instruments`);
}

/**
 * Get all loaded instruments (summary).
 */
export function listInstruments(): Array<{
  id: string;
  name: string;
  title: string;
  itemCount: number;
  status: string;
}> {
  return Array.from(instrumentCatalog.values()).map((q) => ({
    id: q.id,
    name: q.name,
    title: q.title,
    itemCount: q.item?.length ?? 0,
    status: q.status,
  }));
}

/**
 * Get a single instrument by ID.
 */
export function getInstrument(id: string): FhirQuestionnaire | undefined {
  return instrumentCatalog.get(id);
}

/**
 * Get instrument count (for health checks).
 */
export function getInstrumentCount(): number {
  return instrumentCatalog.size;
}
