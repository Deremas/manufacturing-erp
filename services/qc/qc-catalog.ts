export interface QcCatalogEntry {
  slug: string;
  resource: string;
  prefix: string;
  name: string;
  category: string;
  formCode: string;
  formTitle: string;
  requiresShift?: boolean;
  requiresItem?: boolean;
  requiresSupplier?: boolean;
  requiresSamplePoint?: boolean;
  requiresLocation?: boolean;
  allowsMultipleReadings?: boolean;
  allowsMultipleSamples?: boolean;
  minRows?: number;
  minTableWidth: number;
}

export const QC_TEST_CATALOG: QcCatalogEntry[] = [
  { slug: "raw-water", resource: "water", prefix: "QC-WAT", name: "Raw Water Test", category: "LABORATORY", formCode: "OF/MM/QC/01", formTitle: "Raw Water Test Recording Form", requiresShift: false, requiresSamplePoint: false, requiresLocation: false, allowsMultipleReadings: true, allowsMultipleSamples: false, minRows: 3, minTableWidth: 1200 },
  { slug: "chlorine-residual", resource: "chlorine", prefix: "QC-CLR", name: "Chlorine Residual", category: "LABORATORY", formCode: "OF/MM/QC/12", formTitle: "Chlorine Residual Check List for Active Carbon", requiresShift: true, requiresLocation: true, allowsMultipleReadings: true, allowsMultipleSamples: false, minRows: 4, minTableWidth: 900 },
  { slug: "treatment-monitoring", resource: "treatment", prefix: "QC-TRT", name: "Treatment Monitoring", category: "LABORATORY", formCode: "OF/QC/011", formTitle: "Raw & Process Water Treatment Process Check Points", requiresShift: true, requiresLocation: true, allowsMultipleReadings: true, allowsMultipleSamples: false, minRows: 3, minTableWidth: 1100 },
  { slug: "physicochemical", resource: "physicochemical", prefix: "QC-PHY", name: "Physico-Chemical", category: "LABORATORY", formCode: "OF/MM/QC/19", formTitle: "both the 10L and the 15/20L controlled forms", requiresShift: true, requiresItem: true, requiresSamplePoint: true, requiresLocation: true, allowsMultipleReadings: true, allowsMultipleSamples: false, minRows: 1, minTableWidth: 1400 },
  { slug: "microbial", resource: "microbial", prefix: "QC-MIC", name: "Microbial Test", category: "LABORATORY", formCode: "OF/QC/016", formTitle: "Processing Water Micro Analysis", requiresShift: true, requiresSamplePoint: true, requiresLocation: true, allowsMultipleReadings: false, allowsMultipleSamples: true, minTableWidth: 1200 },
  { slug: "preform", resource: "preform", prefix: "QC-PRE", name: "Preform Inspection", category: "INSPECTION", formCode: "OF/MM/QC/26", formTitle: "Raw Material (Preform) Inspection", requiresSupplier: true, requiresItem: true, requiresLocation: true, allowsMultipleReadings: false, minTableWidth: 1000 },
  { slug: "handle", resource: "handle", prefix: "QC-HND", name: "Handle Inspection", category: "INSPECTION", formCode: "OF/QC/021", formTitle: "Handle Inspection", requiresSupplier: true, requiresItem: true, allowsMultipleReadings: false, minTableWidth: 1000 },
  { slug: "cap", resource: "cap", prefix: "QC-CAP", name: "Cap Inspection", category: "INSPECTION", formCode: "OF/MM/QC/49", formTitle: "Cap Quality Test", requiresSupplier: true, requiresItem: true, allowsMultipleReadings: false, minTableWidth: 1000 },
  { slug: "packaging", resource: "packaging", prefix: "QC-PKG", name: "Packaging Inspection", category: "INSPECTION", formCode: "OF/MM/QC/51", formTitle: "Packaging Inspection", requiresShift: true, requiresItem: true, requiresLocation: true, allowsMultipleReadings: false, minTableWidth: 1100 },
] ;

export type QcTestSlug = QcCatalogEntry["slug"];

export function getQcCatalogEntry(slug: string) {
  return QC_TEST_CATALOG.find((entry) => entry.slug === slug) ?? null;
}

export const QC_SAMPLE_POINT_SEED = [
  { code: "ENV-FILLER-ROOM", name: "Filler machine room", groupName: "ENVIRONMENT" },
  { code: "ENV-HAND", name: "Employee hand", groupName: "ENVIRONMENT" },
  { code: "ENV-PRODUCTION", name: "Production room", groupName: "ENVIRONMENT" },
  { code: "ENV-TREATMENT", name: "Treatment room", groupName: "ENVIRONMENT" },
  { code: "ENV-COMPRESSOR", name: "Compressor air", groupName: "ENVIRONMENT" },
  { code: "ENV-LAB", name: "Micro lab room", groupName: "ENVIRONMENT" },
  { code: "PRC-BOREHOLE", name: "Bore hole", groupName: "PROCESSING" },
  { code: "PRC-RAW", name: "Raw water", groupName: "PROCESSING" },
  { code: "PRC-SAND", name: "Sand filter", groupName: "PROCESSING" },
  { code: "PRC-CARBON", name: "Carbon filter", groupName: "PROCESSING" },
  { code: "PRC-SOFTENER", name: "Softener", groupName: "PROCESSING" },
  { code: "PRC-PRECISION", name: "Precision filter", groupName: "PROCESSING" },
  { code: "PRC-RO", name: "RO", groupName: "PROCESSING" },
  { code: "PRC-UV", name: "UV", groupName: "PROCESSING" },
  { code: "PRC-OZONE-MIX", name: "Ozone mixer tanker", groupName: "PROCESSING" },
  { code: "PRC-OZONATED", name: "Ozonated water tanker", groupName: "PROCESSING" },
  { code: "PRC-EMPTY-BOTTLE", name: "Empty bottle", groupName: "PROCESSING" },
  { code: "PRC-CAP", name: "Bottle cap", groupName: "PROCESSING" },
  { code: "PRC-NOZZLE", name: "Filler nozzle", groupName: "PROCESSING" },
  { code: "PRD-15L", name: "15 Liter Purified Water", groupName: "PRODUCT" },
  { code: "PRD-20L", name: "20 Liter Purified Water", groupName: "PRODUCT" },
  { code: "PRD-7L", name: "7 Liter Purified Water", groupName: "PRODUCT" },
  { code: "PRD-10L", name: "10 Liter Purified Water", groupName: "PRODUCT" },
  { code: "PRD-15-20L", name: "15 / 20 Liter Purified Water", groupName: "PRODUCT" },
  { code: "PRD-7-10L", name: "7 / 10 Liter Purified Water", groupName: "PRODUCT" },
] as const;

export const QC_FREQUENCY_SEED = [
  { code: "EVERY_30_MIN", name: "Every 30 Minutes", intervalMinutes: 30 },
  { code: "HOURLY", name: "Hourly", intervalHours: 1 },
  { code: "EVERY_2_HOURS", name: "Every 2 Hours", intervalHours: 2 },
  { code: "EVERY_SHIFT", name: "Every Shift", intervalHours: 8 },
  { code: "DAILY", name: "Daily", intervalDays: 1 },
  { code: "WEEKLY", name: "Weekly", intervalDays: 7 },
  { code: "PER_DELIVERY", name: "Per Delivery" },
  { code: "PER_BATCH", name: "Per Batch" },
  { code: "MONTHLY", name: "Monthly", intervalDays: 30 },
] as const;

export const QC_LAB_UNITS = [
  { code: "USCM", name: "Microsiemens per centimetre", abbreviation: "µS/cm", type: "MEASURE" },
  { code: "MGL", name: "Milligram per litre", abbreviation: "mg/L", type: "MEASURE" },
  { code: "PPM", name: "Parts per million", abbreviation: "ppm", type: "MEASURE" },
  { code: "NTU", name: "Nephelometric turbidity unit", abbreviation: "NTU", type: "MEASURE" },
  { code: "TCU", name: "True colour unit", abbreviation: "TCU", type: "MEASURE" },
  { code: "CFU", name: "Colony-forming units per millilitre", abbreviation: "CFU/1ml", type: "MEASURE" },
] as const;

export const MICRO_RESULT_TYPES = [
  { id: "NUMERIC", label: "Numeric", dataType: "NUMBER", qualitative: null, options: null },
  { id: "UNDETECTABLE", label: "Undetectable / Detected", dataType: "TEXT", qualitative: "UNDETECTED", options: "UNDETECTED,DETECTED" },
  { id: "ABSENT", label: "Absent / Present", dataType: "TEXT", qualitative: "ABSENT", options: "ABSENT,PRESENT" },
] as const;

export function parseIncubation(value?: string | null) {
  const text = String(value ?? "");
  return {
    temp: text.match(/(\d+(?:\.\d+)?)\s*°?\s*C/i)?.[1] ?? "",
    hours: text.match(/(\d+(?:\.\d+)?)\s*hrs?/i)?.[1] ?? "",
  };
}

export function formatIncubation(temp: string, hours: string) {
  const t = temp.trim();
  const h = hours.trim();
  if (!t && !h) return null;
  if (t && h) return `${t}°C / ${h} hrs`;
  if (t) return `${t}°C`;
  return `${h} hrs`;
}

export function microResultTypeId(dataType?: string | null, qualitative?: string | null) {
  if (String(dataType ?? "").toUpperCase() === "NUMBER") return "NUMERIC";
  const criterion = String(qualitative ?? "").toUpperCase();
  if (criterion === "ABSENT" || criterion === "PRESENT") return "ABSENT";
  return "UNDETECTABLE";
}

export const PHYSICO_RESULT_TYPES = [
  { id: "NUMERIC", label: "Numeric", dataType: "NUMBER" },
  { id: "QUALITATIVE", label: "Qualitative (free text)", dataType: "TEXT" },
] as const;

const PHYSICO_PARAMETER_SLUGS: Record<string, string> = {
  CONDUCTIVITY: "electrical_conductivity",
  TDS: "tds",
  PH: "ph",
  ALKALINITY: "total_alkalinity",
  HARDNESS: "total_hardness",
  OZONE: "ozone",
  TURBIDITY: "turbidity",
  ODOR: "odor",
  CAUSTIC_RESIDUAL: "caustic_soda_residual",
  COLOR: "color",
};

export function physicoResultTypeId(dataType?: string | null) {
  return String(dataType ?? "").toUpperCase() === "NUMBER" ? "NUMERIC" : "QUALITATIVE";
}

export function physicoParameterSlug(code?: string | null) {
  const key = String(code ?? "").toUpperCase();
  return PHYSICO_PARAMETER_SLUGS[key] ?? key.toLowerCase();
}

export type QcParameterSeed = {
  code: string;
  name: string;
  category: string;
  dataType: string;
  method?: string;
  technique?: string;
  incubation?: string;
  media?: string;
  qualitative?: string;
  options?: string;
  unitCode?: string;
};

export type QcSpecDefault = {
  min?: number;
  max?: number;
  limitText?: string;
  unitCode?: string;
  method?: string;
};

export function isUnconfirmedMethod(value?: string | null) {
  const text = String(value ?? "").trim();
  return !text || /^e\.g\./i.test(text);
}

/** ISO 7888:1985 — Water quality — Determination of electrical conductivity. Ethiopian adoption: ES ISO 7888. */
export const CONDUCTIVITY_METHOD = "ES ISO 7888:1985";
/** CES 58 drinking-water maximum (µS/cm). Factory OF/MM/QC/19 limit was illegible; master data stays editable. */
export const CONDUCTIVITY_MAX = 1500;

export const QC_PARAMETER_SEED: QcParameterSeed[] = [
  { code: "CHLORINE_PPM", name: "Chlorine Residual (ppm)", category: "WATER", dataType: "NUMBER", method: "APHA 4500-Cl G", unitCode: "PPM" },
  { code: "CONDUCTIVITY", name: "Conductivity", category: "PHYSICO", dataType: "NUMBER", method: CONDUCTIVITY_METHOD, unitCode: "USCM" },
  { code: "TDS", name: "TDS", category: "PHYSICO", dataType: "NUMBER", method: "ES 609:2001", unitCode: "PPM" },
  { code: "PH", name: "pH", category: "PHYSICO", dataType: "NUMBER", method: "ES ISO 10523:2014" },
  { code: "ALKALINITY", name: "Alkalinity as CaCO3", category: "PHYSICO", dataType: "NUMBER", method: "ES ISO 9963-1:2001", unitCode: "PPM" },
  { code: "HARDNESS", name: "Total Hardness as CaCO3", category: "PHYSICO", dataType: "NUMBER", method: "ES 607:2001", unitCode: "PPM" },
  { code: "OZONE", name: "Ozone", category: "PHYSICO", dataType: "NUMBER", method: "ISO 10359-1", unitCode: "PPM" },
  { code: "TURBIDITY", name: "Turbidity", category: "PHYSICO", dataType: "NUMBER", method: "ES ISO 7027", unitCode: "NTU" },
  { code: "ODOR", name: "Odor", category: "PHYSICO", dataType: "TEXT", method: "ISO 5492", qualitative: "Acceptable" },
  { code: "COLOR", name: "Color", category: "PHYSICO", dataType: "TEXT", method: "ISO 7887:2011", qualitative: "None" },
  { code: "CAUSTIC_RESIDUAL", name: "Caustic Soda Residual", category: "PHYSICO", dataType: "NUMBER", method: "Phenolphthalein titration" },
  { code: "TEMPERATURE", name: "Temperature °C", category: "WATER", dataType: "NUMBER" },
  { code: "TIME", name: "Time", category: "PROCESS", dataType: "TEXT" },
  { code: "POINT", name: "Point", category: "PROCESS", dataType: "TEXT" },
  { code: "SENSORY", name: "Sensory", category: "WATER", dataType: "TEXT", qualitative: "No Color & No Odor" },
  { code: "CHLORINE_ADDED", name: "Chlorine Added", category: "PROCESS", dataType: "NUMBER", unitCode: "PPM" },
  { code: "RATE", name: "Rate", category: "PROCESS", dataType: "NUMBER" },
  { code: "OZONE_CONC", name: "Ozone Concentration", category: "PROCESS", dataType: "NUMBER", method: "ISO 10359-1", unitCode: "PPM" },
  { code: "AIR_PRESSURE", name: "Air Pressure", category: "PROCESS", dataType: "NUMBER" },
  { code: "SAND_FILTER", name: "Sand Filter", category: "PROCESS", dataType: "NUMBER" },
  { code: "ACTIVATED_CARBON", name: "Activated Carbon", category: "PROCESS", dataType: "NUMBER" },
  { code: "SOFTENER", name: "Softener", category: "PROCESS", dataType: "NUMBER" },
  { code: "BACK_WASH", name: "Back Wash", category: "PROCESS", dataType: "NUMBER" },
  { code: "RINSING", name: "Rinsing", category: "PROCESS", dataType: "NUMBER" },
  { code: "RO", name: "RO", category: "PROCESS", dataType: "NUMBER" },
  { code: "RINSE_LINE", name: "Rinse Line", category: "PROCESS", dataType: "NUMBER" },
  { code: "TVC_35", name: "TVC at 35°C / 48 hrs", category: "MICRO", dataType: "NUMBER", method: "ES ISO 4833", technique: "Pouring", incubation: "35°C / 48 hrs", media: "PCA", unitCode: "CFU" },
  { code: "TVC_22", name: "TVC at 22°C / 72 hrs", category: "MICRO", dataType: "NUMBER", method: "ES ISO 4833", technique: "Pouring", incubation: "22°C / 72 hrs", media: "PCA", unitCode: "CFU" },
  { code: "COLIFORM", name: "Coliform / 100 ml", category: "MICRO", dataType: "TEXT", method: "ES ISO 9308-1 or 9308-2", technique: "Filtration", incubation: "36°C / 24 hrs", media: "PCA", qualitative: "UNDETECTED", options: "UNDETECTED,DETECTED" },
  { code: "FECAL_COLIFORM", name: "Fecal Coliform / 100 ml", category: "MICRO", dataType: "TEXT", method: "ES ISO 7899-1 or 7899-2", technique: "Filtration", incubation: "44°C / 24 hrs", media: "PCA", qualitative: "UNDETECTED", options: "UNDETECTED,DETECTED" },
  { code: "ECOLI", name: "E. coli type I / 100 ml", category: "MICRO", dataType: "TEXT", method: "ES ISO 9308-1 or 9308-2", technique: "Filtration", incubation: "36°C / 24 hrs", media: "PCA", qualitative: "ABSENT", options: "ABSENT,PRESENT" },
  { code: "SALMONELLA", name: "Detection of Salmonella", category: "MICRO", dataType: "TEXT", method: "ES ISO 6579-2", technique: "Filtration", incubation: "37°C / 24 hrs", media: "PCA", qualitative: "ABSENT", options: "ABSENT,PRESENT" },
  { code: "SHIGELLA", name: "Detection of Shigella SPP", category: "MICRO", dataType: "TEXT", method: "AS 21567:2021", technique: "Filtration", incubation: "37°C / 24 hrs", media: "PCA", qualitative: "ABSENT", options: "ABSENT,PRESENT" },
  { code: "STAPH", name: "Staphylococcus aureus / 100 ml", category: "MICRO", dataType: "TEXT", method: "ES ISO 6888-2", technique: "Filtration", incubation: "37°C / 48 hrs", media: "PCA", qualitative: "UNDETECTED", options: "UNDETECTED,DETECTED" },
  { code: "CLARITY", name: "Clarity / Haze", category: "PREFORM", dataType: "TEXT", qualitative: "PASS" },
  { code: "SURFACE_DEFECTS", name: "Surface Defects / Damage", category: "PREFORM", dataType: "TEXT", qualitative: "PASS" },
  { code: "CONTAMINATION", name: "Contamination", category: "PREFORM", dataType: "TEXT", qualitative: "PASS" },
  { code: "PACKAGE", name: "Package", category: "PREFORM", dataType: "TEXT", qualitative: "PASS" },
  { code: "NECK_FINISH", name: "Neck / Finish", category: "PREFORM", dataType: "TEXT", qualitative: "PASS" },
  { code: "GATE_QUALITY", name: "Gate Quality", category: "PREFORM", dataType: "TEXT", qualitative: "PASS" },
  { code: "COLOR_MATCH", name: "Color", category: "PREFORM", dataType: "TEXT", qualitative: "PASS" },
  { code: "ACTUAL_WEIGHT", name: "Actual Weight (g)", category: "PREFORM", dataType: "NUMBER" },
  { code: "MOLDING_DEFECTS", name: "Molding Defects", category: "HANDLE", dataType: "TEXT", qualitative: "PASS" },
  { code: "FITMENT", name: "Fitment Test", category: "HANDLE", dataType: "TEXT", qualitative: "PASS" },
  { code: "LOAD_STRESS", name: "Load / Stress Test", category: "HANDLE", dataType: "TEXT", qualitative: "PASS" },
  { code: "CAP_COLOR", name: "Cap Color", category: "CAP", dataType: "TEXT", qualitative: "PASS" },
  { code: "CAP_TYPE", name: "Cap Type", category: "CAP", dataType: "TEXT", qualitative: "PASS" },
  { code: "CLEANLINESS", name: "Cleanliness", category: "CAP", dataType: "TEXT", qualitative: "PASS" },
  { code: "DEFECTS", name: "Defects", category: "CAP", dataType: "TEXT", qualitative: "PASS" },
  { code: "PACKAGING", name: "Packaging", category: "CAP", dataType: "TEXT", qualitative: "PASS" },
  { code: "FOREIGN_ODOR", name: "Odor", category: "CAP", dataType: "TEXT", qualitative: "PASS" },
  { code: "BOTTLE_CONDITION", name: "Bottle / Jar Condition", category: "PACKAGING", dataType: "TEXT", qualitative: "PASS" },
  { code: "CAP_CONDITION", name: "Cap Condition", category: "PACKAGING", dataType: "TEXT", qualitative: "PASS" },
  { code: "HANDLE_CONDITION", name: "Handle Condition", category: "PACKAGING", dataType: "TEXT", qualitative: "PASS" },
  { code: "LABEL_ALIGN", name: "Label Alignment", category: "PACKAGING", dataType: "TEXT", qualitative: "PASS" },
  { code: "LABEL_ADHESION", name: "Label Adhesion", category: "PACKAGING", dataType: "TEXT", qualitative: "PASS" },
  { code: "LABEL_PRINT", name: "Label Print Quality", category: "PACKAGING", dataType: "TEXT", qualitative: "PASS" },
  { code: "DATE_CODING", name: "Date Coding", category: "PACKAGING", dataType: "TEXT", qualitative: "PASS" },
  { code: "SEAL_INTEGRITY", name: "Seal Integrity", category: "PACKAGING", dataType: "TEXT", qualitative: "PASS" },
  { code: "SHRINK_QUALITY", name: "Shrink Quality", category: "PACKAGING", dataType: "TEXT", qualitative: "PASS" },
  { code: "PACK_COUNT", name: "Pack Count", category: "PACKAGING", dataType: "TEXT", qualitative: "PASS" },
  { code: "CARTON_CONDITION", name: "Carton Condition", category: "PACKAGING", dataType: "TEXT", qualitative: "PASS" },
  { code: "VISIBLE_DEFECT", name: "Visible Defect", category: "PACKAGING", dataType: "TEXT", qualitative: "PASS" },
];

export const QC_FORM_PARAMETERS: Record<string, string[]> = {
  "raw-water": ["PH", "CHLORINE_PPM", "TDS", "TURBIDITY", "HARDNESS", "ALKALINITY", "SENSORY"],
  "chlorine-residual": ["CHLORINE_PPM"],
  "treatment-monitoring": ["POINT", "CHLORINE_ADDED", "CHLORINE_PPM", "RATE", "OZONE_CONC", "AIR_PRESSURE", "TDS", "PH"],
  physicochemical: ["CONDUCTIVITY", "TDS", "PH", "ALKALINITY", "HARDNESS", "OZONE", "TURBIDITY", "ODOR", "CAUSTIC_RESIDUAL"],
  microbial: ["TVC_35", "TVC_22", "COLIFORM", "FECAL_COLIFORM", "ECOLI", "SALMONELLA", "SHIGELLA", "STAPH"],
  preform: ["CLARITY", "SURFACE_DEFECTS", "CONTAMINATION", "PACKAGE", "NECK_FINISH", "GATE_QUALITY", "COLOR_MATCH", "ACTUAL_WEIGHT"],
  handle: ["CONTAMINATION", "MOLDING_DEFECTS", "FITMENT", "LOAD_STRESS", "ACTUAL_WEIGHT"],
  cap: ["CAP_COLOR", "CAP_TYPE", "CLEANLINESS", "DEFECTS", "PACKAGING", "FOREIGN_ODOR", "ACTUAL_WEIGHT"],
  packaging: ["BOTTLE_CONDITION", "CAP_CONDITION", "HANDLE_CONDITION", "LABEL_ALIGN", "LABEL_ADHESION", "LABEL_PRINT", "DATE_CODING", "SEAL_INTEGRITY", "SHRINK_QUALITY", "PACK_COUNT", "CARTON_CONDITION", "CLEANLINESS", "VISIBLE_DEFECT"],
};

const cesDrinkingWater: Record<string, QcSpecDefault> = {
  PH: { min: 6.5, max: 8.5, method: "ES ISO 10523:2008" },
  CHLORINE_PPM: { min: 0, max: 0.5, unitCode: "PPM", method: "APHA 4500-Cl G" },
  TDS: { min: 0, max: 1000, unitCode: "PPM", method: "ES 609:2001" },
  TURBIDITY: { min: 0, max: 5, unitCode: "NTU", method: "ES ISO 7027" },
  HARDNESS: { min: 0, max: 500, unitCode: "PPM", method: "ES ISO 6059" },
  ALKALINITY: { min: 0, max: 400, unitCode: "PPM", method: "ES ISO 9963-1:2007" },
  SENSORY: { limitText: "No Color & No Odor" },
};

export const QC_FORM_SPEC_DEFAULTS: Record<string, Record<string, QcSpecDefault>> = {
  "raw-water": cesDrinkingWater,
  "chlorine-residual": {
    CHLORINE_PPM: { min: 0, max: 0.5, unitCode: "PPM", method: "APHA 4500-Cl G" },
  },
  "treatment-monitoring": {
    CHLORINE_PPM: { min: 0, max: 0.5, unitCode: "PPM", method: "APHA 4500-Cl G" },
    TDS: { min: 0, max: 1000, unitCode: "PPM", method: "ES 609:2001" },
    PH: { min: 6.5, max: 8.5, method: "ES ISO 10523:2008" },
    OZONE_CONC: { min: 0, max: 0.4, unitCode: "PPM", method: "ISO 10359-1" },
  },
  physicochemical: {
    CONDUCTIVITY: { max: CONDUCTIVITY_MAX, unitCode: "USCM", method: CONDUCTIVITY_METHOD, limitText: `<= ${CONDUCTIVITY_MAX}` },
    TDS: { max: 500, unitCode: "PPM", method: "ES 609:2001", limitText: "<= 500" },
    PH: { min: 6.5, max: 8, method: "ES ISO 10523:2014", limitText: "6.5 - 8.0" },
    ALKALINITY: { max: 200, unitCode: "PPM", method: "ES ISO 9963-1:2001", limitText: "<= 200" },
    HARDNESS: { max: 300, unitCode: "PPM", method: "ES 607:2001", limitText: "<= 300" },
    OZONE: { min: 0.2, max: 0.4, unitCode: "PPM", method: "ISO 10359-1", limitText: "0.2 - 0.4" },
    TURBIDITY: { max: 1, unitCode: "NTU", method: "ES ISO 7027", limitText: "<= 1" },
    ODOR: { limitText: "Acceptable", method: "ISO 5492" },
    CAUSTIC_RESIDUAL: { limitText: "-", method: "Phenolphthalein titration" },
  },
  microbial: {
    TVC_35: { max: 100, unitCode: "CFU", method: "ES ISO 4833" },
    TVC_22: { max: 100, unitCode: "CFU", method: "ES ISO 4833" },
    COLIFORM: { limitText: "UNDETECTED", method: "ES ISO 9308-1 or 9308-2" },
    FECAL_COLIFORM: { limitText: "UNDETECTED", method: "ES ISO 7899-1 or 7899-2" },
    ECOLI: { limitText: "ABSENT", method: "ES ISO 9308-1 or 9308-2" },
    SALMONELLA: { limitText: "ABSENT", method: "ES ISO 6579-2" },
    SHIGELLA: { limitText: "ABSENT", method: "AS 21567:2021" },
    STAPH: { limitText: "UNDETECTED", method: "ES ISO 6888-2" },
  },
};

export const QC_PREFORM_GRAM_DEFAULTS: Array<{
  match: RegExp;
  label: string;
  min: number;
  max: number;
}> = [
  { match: /0\.25\s*L/i, label: "0.25L", min: 11, max: 12 },
  { match: /0\.6\s*L/i, label: "0.6L", min: 14, max: 15 },
  { match: /18\.5/i, label: "PET Preform 18.5g", min: 18, max: 19 },
  { match: /28\s*g/i, label: "PET Preform 28g", min: 27, max: 28 },
  { match: /(?<![.\d])1(\.0)?\s*L\b/i, label: "1L", min: 27, max: 28 },
  { match: /(?<![.\d])2(\.0)?\s*L\b/i, label: "2L", min: 37, max: 38 },
  { match: /(?<![.\d])5(\.0)?\s*L\b/i, label: "5L", min: 48, max: 50 },
  { match: /(?<![.\d])10\s*L\b/i, label: "10L", min: 90, max: 92 },
  { match: /(?<![.\d])15\s*L\b/i, label: "15L", min: 140, max: 142 },
  { match: /20\s*L/i, label: "20L", min: 750, max: 752 },
];

export function isPreformMasterItem(itemName: string, itemCode: string) {
  const haystack = `${itemName} ${itemCode}`;
  return /preform/i.test(haystack) || /empty bottle/i.test(itemName);
}

export function preformGramDefault(itemName: string, itemCode: string) {
  if (!isPreformMasterItem(itemName, itemCode)) return null;
  const haystack = `${itemName} ${itemCode}`;
  return QC_PREFORM_GRAM_DEFAULTS.find((row) => row.match.test(haystack)) ?? null;
}
