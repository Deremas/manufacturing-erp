type LiveSpec = {
  parameterId: string;
  parameterCode?: string;
  parameterName?: string;
  dataType?: string;
  acceptableLimit?: string;
  [key: string]: unknown;
};

function parseJsonArray(value: unknown): Array<Record<string, unknown>> {
  if (!value) return [];
  const raw =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return [];
          }
        })()
      : value;
  return Array.isArray(raw) ? raw.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object") : [];
}

export function mergeQcRecordSpecs<T extends LiveSpec>(record: Record<string, unknown> | null | undefined, liveSpecs: T[]): T[] {
  if (!record) return liveSpecs;
  const snapshot = parseJsonArray(record.specificationSnapshot);
  const lines = Array.isArray(record.lines) ? (record.lines as Array<Record<string, unknown>>) : [];
  const source = snapshot.length
    ? snapshot
    : lines.filter((line) => line.lineType !== "READING");
  if (!source.length) return liveSpecs;

  return source.map((row, index) => {
    const parameterId = String(row.parameterId ?? "");
    const live =
      liveSpecs.find((spec) => spec.parameterId === parameterId) ??
      liveSpecs.find((spec) => spec.parameterCode && spec.parameterCode === String(row.parameterCode ?? ""));
    const parameterName = String(row.parameterName ?? row.parameterNameSnapshot ?? live?.parameterName ?? "");
    return {
      ...(live ?? ({} as T)),
      parameterId: parameterId || live?.parameterId || `snapshot-${index}`,
      parameterCode: String(row.parameterCode ?? live?.parameterCode ?? ""),
      parameterName,
      dataType: String(row.dataType ?? live?.dataType ?? "TEXT"),
      unitName: row.unitName ?? row.unitSnapshot ?? live?.unitName ?? null,
      acceptableLimit: String(row.acceptableLimit ?? row.limitSnapshot ?? live?.acceptableLimit ?? ""),
      methodReference: row.methodReference ?? row.methodSnapshot ?? live?.methodReference ?? null,
      minValue: row.minValue ?? live?.minValue ?? null,
      maxValue: row.maxValue ?? live?.maxValue ?? null,
      qualitativeCriterion: row.qualitativeCriterion ?? live?.qualitativeCriterion ?? null,
    } as T;
  });
}

export function resultLineForSpec(record: Record<string, unknown> | null | undefined, spec: { parameterId: string; parameterCode?: string; parameterName?: string }) {
  const lines = Array.isArray(record?.lines) ? (record?.lines as Array<Record<string, unknown>>) : [];
  return lines.find((row) => {
    if (row.lineType === "READING") return false;
    return (
      row.parameterId === spec.parameterId ||
      (spec.parameterCode && String(row.parameterCode ?? "") === spec.parameterCode) ||
      String(row.parameterNameSnapshot ?? "") === String(spec.parameterName ?? "")
    );
  });
}
