export interface QcLimitDefinition {
  parameterName: string;
  dataType: string;
  minimumValue: number | null;
  maximumValue: number | null;
  expectedText: string | null;
  required: boolean;
}

export type OperationalQcResult =
  | "PASS"
  | "FAIL"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHIN_SPEC"
  | "OUT_OF_SPEC"
  | "NOT_EVALUATED"
  | "INCOMPLETE"
  | "PENDING";

export function evaluateQcValue(definition: QcLimitDefinition, value: unknown) {
  const rawValue = String(value ?? "").trim();
  if (definition.required && !rawValue) throw new Error(`${definition.parameterName} is required`);
  let result: "PASSED" | "FAILED" | "PENDING" = rawValue ? "PASSED" : "PENDING";
  let numericValue: number | null = null;
  if (rawValue && definition.dataType.toUpperCase() === "NUMBER") {
    numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) throw new Error(`${definition.parameterName} must be a valid number`);
    if (definition.minimumValue !== null && numericValue < definition.minimumValue) result = "FAILED";
    if (definition.maximumValue !== null && numericValue > definition.maximumValue) result = "FAILED";
  } else if (rawValue && definition.dataType.toUpperCase() === "BOOLEAN") {
    if (!["TRUE", "FALSE", "YES", "NO", "1", "0"].includes(rawValue.toUpperCase())) throw new Error(`${definition.parameterName} must be a valid yes/no value`);
  } else if (rawValue && definition.expectedText && rawValue.toLowerCase() !== definition.expectedText.toLowerCase()) {
    result = "FAILED";
  }
  return { rawValue, numericValue, result };
}

export function evaluateOverallQcResult(results: Array<"PASSED" | "FAILED" | "PENDING">) {
  if (results.some((result) => result === "FAILED")) return "FAILED" as const;
  if (results.some((result) => result === "PENDING")) return "PENDING" as const;
  return "PASSED" as const;
}

export function evaluateOperationalValue(input: {
  parameterName: string;
  dataType: string;
  minValue?: number | null;
  maxValue?: number | null;
  qualitativeCriterion?: string | null;
  required?: boolean;
  numericValue?: number | null;
  textValue?: string | null;
}): OperationalQcResult {
  const text = String(input.textValue ?? "").trim();
  const hasNumeric = input.numericValue != null && Number.isFinite(Number(input.numericValue));
  const hasValue = hasNumeric || text.length > 0;
  const dataType = input.dataType.toUpperCase();
  const hasNumericSpec = input.minValue != null || input.maxValue != null;
  const hasQualitativeSpec = Boolean(String(input.qualitativeCriterion ?? "").trim());

  if (!hasValue) return input.required === false ? "PENDING" : "INCOMPLETE";
  if (dataType === "NUMBER" || hasNumeric) {
    if (!hasNumericSpec) return "NOT_EVALUATED";
    const value = Number(input.numericValue);
    if (!Number.isFinite(value)) return "INCOMPLETE";
    if (input.minValue != null && value < Number(input.minValue)) return "FAIL";
    if (input.maxValue != null && value > Number(input.maxValue)) return "FAIL";
    return "PASS";
  }
  if (!hasQualitativeSpec) return "NOT_EVALUATED";
  return text.toLowerCase() === String(input.qualitativeCriterion).trim().toLowerCase() ? "PASS" : "FAIL";
}

export function evaluateOperationalOverall(results: OperationalQcResult[], requiredFlags: boolean[] = []): OperationalQcResult {
  const pairs = results.map((result, index) => ({ result, required: requiredFlags[index] !== false }));
  if (pairs.some((entry) => entry.required && entry.result === "FAIL")) return "FAIL";
  if (pairs.some((entry) => entry.required && entry.result === "INCOMPLETE")) return "INCOMPLETE";
  if (pairs.some((entry) => entry.required && entry.result === "NOT_EVALUATED")) return "NOT_EVALUATED";
  if (pairs.filter((entry) => entry.required).every((entry) => entry.result === "PASS" || entry.result === "WITHIN_SPEC" || entry.result === "ACCEPTED")) return "PASS";
  if (results.some((result) => result === "PENDING")) return "PENDING";
  return "PASS";
}

export function formatSpecificationLimit(input: {
  minValue?: number | null;
  maxValue?: number | null;
  targetValue?: number | null;
  limitText?: string | null;
  qualitativeCriterion?: string | null;
}) {
  if (input.limitText?.trim()) return input.limitText.trim();
  if (input.minValue != null && input.maxValue != null) return `${input.minValue} - ${input.maxValue}`;
  if (input.maxValue != null) return `<= ${input.maxValue}`;
  if (input.minValue != null) return `>= ${input.minValue}`;
  if (input.targetValue != null) return `Target ${input.targetValue}`;
  if (input.qualitativeCriterion?.trim()) return input.qualitativeCriterion.trim();
  return "Not configured";
}
