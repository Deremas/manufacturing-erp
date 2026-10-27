export type ReadingValueMap = Record<string, string>;

export interface OperationalReadingRow {
  timeValue?: string | null;
  remark?: string | null;
  values?: ReadingValueMap;
}

export function classifyReadingRow(row: OperationalReadingRow): "empty" | "partial" | "complete" {
  const time = String(row.timeValue ?? "").trim();
  const remark = String(row.remark ?? "").trim();
  const point = String(row.values?.POINT ?? "").trim();
  const values = Object.entries(row.values ?? {})
    .filter(([key, value]) => key !== "POINT" && key !== "SHIFT" && String(value ?? "").trim())
    .map((entry) => String(entry[1]).trim());
  if (!time && !remark && values.length === 0) return "empty";
  if (time && (values.length > 0 || point)) return "complete";
  return "partial";
}

export function filterSavedReadingRows(rows: OperationalReadingRow[]) {
  return rows.filter((row) => classifyReadingRow(row) !== "empty");
}

export function assertReadingRowsValid(rows: OperationalReadingRow[], requireComplete: boolean) {
  const kept = filterSavedReadingRows(rows);
  if (kept.some((row) => classifyReadingRow(row) === "partial")) {
    throw new Error("Partially filled reading rows must include both time and at least one result");
  }
  if (requireComplete && kept.length === 0) {
    throw new Error("Enter at least one reading before submitting");
  }
  return kept;
}

export function canRemoveRepeatableRow(rowCount: number) {
  return rowCount > 1;
}
