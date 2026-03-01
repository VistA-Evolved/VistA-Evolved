/**
 * LOINC / UCUM Normalization — Mapping Tables & Engine
 *
 * Phase 387 (W21-P10): Terminology normalization for device observations.
 * Maps proprietary/local codes (MDC, ASTM, vendor-specific) to LOINC codes
 * and converts units to UCUM standard representations.
 *
 * This is a static mapping engine — no external terminology server required.
 * Tables are curated subsets covering vitals + common lab analytes.
 */

// ---------------------------------------------------------------------------
// LOINC Mapping
// ---------------------------------------------------------------------------

export interface LoincMapping {
  /** Source coding system (MDC, ASTM, POCT1A, local, vendor) */
  sourceSystem: string;
  /** Source code */
  sourceCode: string;
  /** Source display name */
  sourceDisplay: string;
  /** Target LOINC code */
  loincCode: string;
  /** LOINC short name */
  loincShortName: string;
  /** LOINC long common name */
  loincLongName: string;
  /** Component (e.g., "Glucose") */
  component: string;
  /** Property (e.g., "MCnc" = Mass concentration) */
  property?: string;
  /** System (e.g., "Bld" = Blood) */
  system?: string;
}

/**
 * MDC (ISO 11073) to LOINC mapping table.
 * Covers vital signs and common bedside monitor parameters.
 */
export const MDC_TO_LOINC: LoincMapping[] = [
  // Vital Signs
  { sourceSystem: "MDC", sourceCode: "MDC_PULS_OXIM_SAT_O2", sourceDisplay: "SpO2", loincCode: "59408-5", loincShortName: "SpO2", loincLongName: "Oxygen saturation in Arterial blood by Pulse oximetry", component: "Oxygen saturation", property: "MFr", system: "BldA" },
  { sourceSystem: "MDC", sourceCode: "MDC_PULS_OXIM_PULS_RATE", sourceDisplay: "Pulse Rate (SpO2)", loincCode: "8889-8", loincShortName: "Heart rate Device", loincLongName: "Heart rate by Pulse oximetry", component: "Heart rate", property: "NRat", system: "XXX" },
  { sourceSystem: "MDC", sourceCode: "MDC_PULS_RATE_NON_INV", sourceDisplay: "Pulse Rate", loincCode: "8867-4", loincShortName: "Heart rate", loincLongName: "Heart rate", component: "Heart rate", property: "NRat", system: "XXX" },
  { sourceSystem: "MDC", sourceCode: "MDC_ECG_HEART_RATE", sourceDisplay: "ECG Heart Rate", loincCode: "76282-3", loincShortName: "HR ECG", loincLongName: "Heart rate by Electrocardiogram", component: "Heart rate", property: "NRat", system: "XXX" },
  { sourceSystem: "MDC", sourceCode: "MDC_PRESS_BLD_NONINV_SYS", sourceDisplay: "NIBP Systolic", loincCode: "8480-6", loincShortName: "BP sys", loincLongName: "Systolic blood pressure", component: "Systolic blood pressure", property: "Pres", system: "Arterial" },
  { sourceSystem: "MDC", sourceCode: "MDC_PRESS_BLD_NONINV_DIA", sourceDisplay: "NIBP Diastolic", loincCode: "8462-4", loincShortName: "BP dias", loincLongName: "Diastolic blood pressure", component: "Diastolic blood pressure", property: "Pres", system: "Arterial" },
  { sourceSystem: "MDC", sourceCode: "MDC_PRESS_BLD_NONINV_MEAN", sourceDisplay: "NIBP Mean", loincCode: "8478-0", loincShortName: "BP mean", loincLongName: "Mean blood pressure", component: "Mean blood pressure", property: "Pres", system: "Arterial" },
  { sourceSystem: "MDC", sourceCode: "MDC_TEMP", sourceDisplay: "Temperature", loincCode: "8310-5", loincShortName: "Body temp", loincLongName: "Body temperature", component: "Body temperature", property: "Temp", system: "XXX" },
  { sourceSystem: "MDC", sourceCode: "MDC_RESP_RATE", sourceDisplay: "Respiratory Rate", loincCode: "9279-1", loincShortName: "Resp rate", loincLongName: "Respiratory rate", component: "Respiratory rate", property: "NRat", system: "XXX" },
  { sourceSystem: "MDC", sourceCode: "MDC_AWAY_CO2_ET", sourceDisplay: "EtCO2", loincCode: "19889-5", loincShortName: "CO2 ExG", loincLongName: "Carbon dioxide [Partial pressure] in Exhaled gas", component: "Carbon dioxide", property: "PPres", system: "ExhGas" },
  // Invasive pressures
  { sourceSystem: "MDC", sourceCode: "MDC_PRESS_BLD_ART_SYS", sourceDisplay: "ABP Systolic", loincCode: "76215-3", loincShortName: "ABP sys", loincLongName: "Invasive Systolic blood pressure by Intravascular", component: "Systolic blood pressure", property: "Pres", system: "BldA" },
  { sourceSystem: "MDC", sourceCode: "MDC_PRESS_BLD_ART_DIA", sourceDisplay: "ABP Diastolic", loincCode: "76213-8", loincShortName: "ABP dias", loincLongName: "Invasive Diastolic blood pressure by Intravascular", component: "Diastolic blood pressure", property: "Pres", system: "BldA" },
  { sourceSystem: "MDC", sourceCode: "MDC_PRESS_BLD_ART_MEAN", sourceDisplay: "ABP Mean", loincCode: "76214-6", loincShortName: "ABP mean", loincLongName: "Invasive Mean blood pressure by Intravascular", component: "Mean blood pressure", property: "Pres", system: "BldA" },
];

/**
 * Common lab analyte mapping (used by ASTM/POCT1-A analyzers).
 * Source codes are typical ASTM Test ID values.
 */
export const LAB_TO_LOINC: LoincMapping[] = [
  // Chemistry
  { sourceSystem: "ASTM", sourceCode: "GLU", sourceDisplay: "Glucose", loincCode: "2345-7", loincShortName: "Glucose SerPl", loincLongName: "Glucose [Mass/volume] in Serum or Plasma", component: "Glucose", property: "MCnc", system: "SerPl" },
  { sourceSystem: "ASTM", sourceCode: "BUN", sourceDisplay: "Blood Urea Nitrogen", loincCode: "3094-0", loincShortName: "BUN SerPl", loincLongName: "Urea nitrogen [Mass/volume] in Serum or Plasma", component: "Urea nitrogen", property: "MCnc", system: "SerPl" },
  { sourceSystem: "ASTM", sourceCode: "CREA", sourceDisplay: "Creatinine", loincCode: "2160-0", loincShortName: "Creat SerPl", loincLongName: "Creatinine [Mass/volume] in Serum or Plasma", component: "Creatinine", property: "MCnc", system: "SerPl" },
  { sourceSystem: "ASTM", sourceCode: "NA", sourceDisplay: "Sodium", loincCode: "2951-2", loincShortName: "Sodium SerPl", loincLongName: "Sodium [Moles/volume] in Serum or Plasma", component: "Sodium", property: "SCnc", system: "SerPl" },
  { sourceSystem: "ASTM", sourceCode: "K", sourceDisplay: "Potassium", loincCode: "2823-3", loincShortName: "Potassium SerPl", loincLongName: "Potassium [Moles/volume] in Serum or Plasma", component: "Potassium", property: "SCnc", system: "SerPl" },
  { sourceSystem: "ASTM", sourceCode: "CL", sourceDisplay: "Chloride", loincCode: "2075-0", loincShortName: "Chloride SerPl", loincLongName: "Chloride [Moles/volume] in Serum or Plasma", component: "Chloride", property: "SCnc", system: "SerPl" },
  { sourceSystem: "ASTM", sourceCode: "CO2", sourceDisplay: "Total CO2", loincCode: "2028-9", loincShortName: "CO2 SerPl", loincLongName: "Carbon dioxide, total [Moles/volume] in Serum or Plasma", component: "Carbon dioxide", property: "SCnc", system: "SerPl" },
  { sourceSystem: "ASTM", sourceCode: "CA", sourceDisplay: "Calcium", loincCode: "17861-6", loincShortName: "Calcium SerPl", loincLongName: "Calcium [Mass/volume] in Serum or Plasma", component: "Calcium", property: "MCnc", system: "SerPl" },
  { sourceSystem: "ASTM", sourceCode: "iCA", sourceDisplay: "Ionized Calcium", loincCode: "1994-3", loincShortName: "Calcium.ionized SerPl", loincLongName: "Calcium.ionized [Moles/volume] in Serum or Plasma", component: "Calcium.ionized", property: "SCnc", system: "SerPl" },
  // Blood Gases
  { sourceSystem: "ASTM", sourceCode: "PH", sourceDisplay: "pH", loincCode: "2744-1", loincShortName: "pH BldA", loincLongName: "pH of Arterial blood", component: "Hydrogen ion concentration", property: "LsCnc", system: "BldA" },
  { sourceSystem: "ASTM", sourceCode: "PCO2", sourceDisplay: "pCO2", loincCode: "2019-8", loincShortName: "pCO2 BldA", loincLongName: "Carbon dioxide [Partial pressure] in Arterial blood", component: "Carbon dioxide", property: "PPres", system: "BldA" },
  { sourceSystem: "ASTM", sourceCode: "PO2", sourceDisplay: "pO2", loincCode: "2703-7", loincShortName: "pO2 BldA", loincLongName: "Oxygen [Partial pressure] in Arterial blood", component: "Oxygen", property: "PPres", system: "BldA" },
  { sourceSystem: "ASTM", sourceCode: "HCO3", sourceDisplay: "Bicarbonate", loincCode: "1960-4", loincShortName: "HCO3 BldA", loincLongName: "Bicarbonate [Moles/volume] in Arterial blood", component: "Bicarbonate", property: "SCnc", system: "BldA" },
  { sourceSystem: "ASTM", sourceCode: "BE", sourceDisplay: "Base Excess", loincCode: "1925-7", loincShortName: "Base excess BldA", loincLongName: "Base excess in Arterial blood by calculation", component: "Base excess", property: "SCnc", system: "BldA" },
  // Hematology
  { sourceSystem: "ASTM", sourceCode: "HGB", sourceDisplay: "Hemoglobin", loincCode: "718-7", loincShortName: "Hgb Bld", loincLongName: "Hemoglobin [Mass/volume] in Blood", component: "Hemoglobin", property: "MCnc", system: "Bld" },
  { sourceSystem: "ASTM", sourceCode: "HCT", sourceDisplay: "Hematocrit", loincCode: "4544-3", loincShortName: "Hct VFr Bld", loincLongName: "Hematocrit [Volume Fraction] of Blood", component: "Hematocrit", property: "VFr", system: "Bld" },
  { sourceSystem: "ASTM", sourceCode: "WBC", sourceDisplay: "White Blood Cells", loincCode: "6690-2", loincShortName: "Leukocytes Bld", loincLongName: "Leukocytes [#/volume] in Blood by Automated count", component: "Leukocytes", property: "NCnc", system: "Bld" },
  { sourceSystem: "ASTM", sourceCode: "PLT", sourceDisplay: "Platelets", loincCode: "777-3", loincShortName: "Platelets Bld", loincLongName: "Platelets [#/volume] in Blood by Automated count", component: "Platelets", property: "NCnc", system: "Bld" },
  { sourceSystem: "ASTM", sourceCode: "RBC", sourceDisplay: "Red Blood Cells", loincCode: "789-8", loincShortName: "Erythrocytes Bld", loincLongName: "Erythrocytes [#/volume] in Blood by Automated count", component: "Erythrocytes", property: "NCnc", system: "Bld" },
  // Coagulation
  { sourceSystem: "ASTM", sourceCode: "PT", sourceDisplay: "Prothrombin Time", loincCode: "5902-2", loincShortName: "PT PPP", loincLongName: "Prothrombin time (PT)", component: "Coagulation tissue factor induced", property: "Time", system: "PPP" },
  { sourceSystem: "ASTM", sourceCode: "INR", sourceDisplay: "INR", loincCode: "6301-6", loincShortName: "INR PPP", loincLongName: "INR in Platelet poor plasma by Coagulation assay", component: "Coagulation tissue factor induced.INR", property: "Rto", system: "PPP" },
  { sourceSystem: "ASTM", sourceCode: "APTT", sourceDisplay: "aPTT", loincCode: "3173-2", loincShortName: "aPTT PPP", loincLongName: "Activated partial thromboplastin time (aPTT)", component: "Coagulation surface induced", property: "Time", system: "PPP" },
  // POCT Glucose
  { sourceSystem: "POCT1A", sourceCode: "GLUCOSE", sourceDisplay: "Glucose", loincCode: "2345-7", loincShortName: "Glucose SerPl", loincLongName: "Glucose [Mass/volume] in Serum or Plasma", component: "Glucose", property: "MCnc", system: "SerPl" },
  { sourceSystem: "POCT1A", sourceCode: "LACTATE", sourceDisplay: "Lactate", loincCode: "2524-7", loincShortName: "Lactate SerPl", loincLongName: "Lactate [Moles/volume] in Serum or Plasma", component: "Lactate", property: "SCnc", system: "SerPl" },
];

// ---------------------------------------------------------------------------
// UCUM Unit Mapping
// ---------------------------------------------------------------------------

export interface UcumMapping {
  /** Source unit string (as received from device) */
  sourceUnit: string;
  /** Normalized UCUM code */
  ucumCode: string;
  /** UCUM display name */
  ucumDisplay: string;
  /** Conversion factor (multiply source value by this) */
  conversionFactor: number;
  /** Conversion offset (add after multiplication) */
  conversionOffset: number;
}

/**
 * Common device unit to UCUM mapping table.
 * Handles both standard and non-standard unit representations.
 */
export const UNIT_TO_UCUM: UcumMapping[] = [
  // Identity mappings (already UCUM-compliant)
  { sourceUnit: "%", ucumCode: "%", ucumDisplay: "percent", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "bpm", ucumCode: "/min", ucumDisplay: "per minute", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "/min", ucumCode: "/min", ucumDisplay: "per minute", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "mmHg", ucumCode: "mm[Hg]", ucumDisplay: "millimeter of mercury", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "mm[Hg]", ucumCode: "mm[Hg]", ucumDisplay: "millimeter of mercury", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "breaths/min", ucumCode: "/min", ucumDisplay: "per minute", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "mg/dL", ucumCode: "mg/dL", ucumDisplay: "milligram per deciliter", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "g/dL", ucumCode: "g/dL", ucumDisplay: "gram per deciliter", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "mEq/L", ucumCode: "meq/L", ucumDisplay: "milliequivalent per liter", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "mmol/L", ucumCode: "mmol/L", ucumDisplay: "millimole per liter", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "sec", ucumCode: "s", ucumDisplay: "second", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "s", ucumCode: "s", ucumDisplay: "second", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "mL", ucumCode: "mL", ucumDisplay: "milliliter", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "mL/hr", ucumCode: "mL/h", ucumDisplay: "milliliter per hour", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "mL/h", ucumCode: "mL/h", ucumDisplay: "milliliter per hour", conversionFactor: 1, conversionOffset: 0 },

  // Temperature conversions
  { sourceUnit: "degC", ucumCode: "Cel", ucumDisplay: "degree Celsius", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "Cel", ucumCode: "Cel", ucumDisplay: "degree Celsius", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "C", ucumCode: "Cel", ucumDisplay: "degree Celsius", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "degF", ucumCode: "Cel", ucumDisplay: "degree Celsius", conversionFactor: 5 / 9, conversionOffset: -32 * 5 / 9 },
  { sourceUnit: "F", ucumCode: "Cel", ucumDisplay: "degree Celsius", conversionFactor: 5 / 9, conversionOffset: -32 * 5 / 9 },

  // Glucose unit conversions
  { sourceUnit: "mg/dl", ucumCode: "mg/dL", ucumDisplay: "milligram per deciliter", conversionFactor: 1, conversionOffset: 0 },

  // Hematology
  { sourceUnit: "10^3/uL", ucumCode: "10*3/uL", ucumDisplay: "thousand per microliter", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "10*3/uL", ucumCode: "10*3/uL", ucumDisplay: "thousand per microliter", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "10^6/uL", ucumCode: "10*6/uL", ucumDisplay: "million per microliter", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "10*6/uL", ucumCode: "10*6/uL", ucumDisplay: "million per microliter", conversionFactor: 1, conversionOffset: 0 },

  // Blood gas
  { sourceUnit: "pH", ucumCode: "[pH]", ucumDisplay: "pH", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "[pH]", ucumCode: "[pH]", ucumDisplay: "pH", conversionFactor: 1, conversionOffset: 0 },

  // Dose
  { sourceUnit: "mGy", ucumCode: "mGy", ucumDisplay: "milligray", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "mGy.cm", ucumCode: "mGy.cm", ucumDisplay: "milligray centimeter", conversionFactor: 1, conversionOffset: 0 },
  { sourceUnit: "dGy.cm2", ucumCode: "dGy.cm2", ucumDisplay: "decigray square centimeter", conversionFactor: 1, conversionOffset: 0 },
];

// ---------------------------------------------------------------------------
// Normalization Engine
// ---------------------------------------------------------------------------

/** Result of normalizing an observation */
export interface NormalizationResult {
  /** Whether LOINC mapping was found */
  loincMapped: boolean;
  /** LOINC code (if mapped) */
  loincCode?: string;
  /** LOINC short name */
  loincShortName?: string;
  /** LOINC long common name */
  loincLongName?: string;
  /** Whether unit was converted */
  ucumMapped: boolean;
  /** UCUM code (if mapped) */
  ucumCode?: string;
  /** UCUM display */
  ucumDisplay?: string;
  /** Converted value (if unit conversion applied) */
  convertedValue?: number;
  /** Original source system */
  sourceSystem?: string;
  /** Original source code */
  sourceCode?: string;
  /** Original unit */
  sourceUnit?: string;
  /** QA warnings */
  warnings: string[];
}

/** Quick index for LOINC lookups */
const loincIndex = new Map<string, LoincMapping>();
for (const m of [...MDC_TO_LOINC, ...LAB_TO_LOINC]) {
  loincIndex.set(`${m.sourceSystem}|${m.sourceCode}`, m);
  // Also index by code alone (case-insensitive)
  loincIndex.set(`*|${m.sourceCode.toUpperCase()}`, m);
}

/** Quick index for UCUM lookups */
const ucumIndex = new Map<string, UcumMapping>();
for (const u of UNIT_TO_UCUM) {
  ucumIndex.set(u.sourceUnit.toLowerCase(), u);
}

/**
 * Normalize a device observation code + unit to LOINC + UCUM.
 */
export function normalizeObservation(
  sourceSystem: string,
  sourceCode: string,
  sourceUnit: string,
  value?: number,
): NormalizationResult {
  const warnings: string[] = [];

  // --- LOINC lookup ---
  let loincMatch = loincIndex.get(`${sourceSystem}|${sourceCode}`);
  if (!loincMatch) {
    loincMatch = loincIndex.get(`*|${sourceCode.toUpperCase()}`);
  }

  const loincMapped = !!loincMatch;
  if (!loincMapped) {
    warnings.push(`No LOINC mapping for ${sourceSystem}|${sourceCode}`);
  }

  // --- UCUM lookup ---
  const ucumMatch = ucumIndex.get(sourceUnit.toLowerCase());
  const ucumMapped = !!ucumMatch;
  if (!ucumMapped && sourceUnit) {
    warnings.push(`No UCUM mapping for unit "${sourceUnit}"`);
  }

  // --- Value conversion ---
  let convertedValue = value;
  if (ucumMatch && value !== undefined) {
    convertedValue = value * ucumMatch.conversionFactor + ucumMatch.conversionOffset;
  }

  return {
    loincMapped,
    loincCode: loincMatch?.loincCode,
    loincShortName: loincMatch?.loincShortName,
    loincLongName: loincMatch?.loincLongName,
    ucumMapped,
    ucumCode: ucumMatch?.ucumCode,
    ucumDisplay: ucumMatch?.ucumDisplay,
    convertedValue,
    sourceSystem,
    sourceCode,
    sourceUnit,
    warnings,
  };
}

/**
 * Batch normalize multiple observations.
 */
export function normalizeObservationBatch(
  observations: Array<{
    sourceSystem: string;
    sourceCode: string;
    sourceUnit: string;
    value?: number;
  }>,
): NormalizationResult[] {
  return observations.map((obs) =>
    normalizeObservation(obs.sourceSystem, obs.sourceCode, obs.sourceUnit, obs.value),
  );
}

/**
 * Get coverage statistics for the mapping tables.
 */
export function getMappingStats(): {
  loincMappings: number;
  ucumMappings: number;
  mdcMappings: number;
  labMappings: number;
  systems: string[];
} {
  const systems = new Set<string>();
  for (const m of [...MDC_TO_LOINC, ...LAB_TO_LOINC]) systems.add(m.sourceSystem);
  return {
    loincMappings: MDC_TO_LOINC.length + LAB_TO_LOINC.length,
    ucumMappings: UNIT_TO_UCUM.length,
    mdcMappings: MDC_TO_LOINC.length,
    labMappings: LAB_TO_LOINC.length,
    systems: [...systems],
  };
}
