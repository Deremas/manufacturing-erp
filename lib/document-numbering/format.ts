export type DocumentNumberingConfig = {
  id?: string;
  prefix: string;
  prefixFormat: string;
  separator: string;
  yearFormat: string;
  monthFormat: string;
  dayFormat: string;
  sequenceLength: number;
  currentSequence?: number;
};

export const DEFAULT_DOCUMENT_NUMBERING = {
  prefixFormat: "PREFIX_YEAR",
  separator: "-",
  yearFormat: "YYYY",
  monthFormat: "MM",
  dayFormat: "DD",
  sequenceLength: 4,
  currentSequence: 0,
} as const;

function resolvePrefixFormat(config: Pick<DocumentNumberingConfig, "prefix" | "prefixFormat">) {
  const format = String(config.prefixFormat ?? "").trim();
  if (!format || format === config.prefix) {
    return "PREFIX_YEAR";
  }
  return format;
}

export function getDocumentNumberStem(
  config: Pick<
    DocumentNumberingConfig,
    "prefix" | "prefixFormat" | "separator" | "yearFormat" | "monthFormat" | "dayFormat"
  >,
) {
  const sep = config.separator ?? "";
  const prefixFormat = resolvePrefixFormat(config);
  const year = config.yearFormat === "YY"
    ? new Date().getFullYear().toString().slice(-2)
    : new Date().getFullYear().toString();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const day =
    config.dayFormat === "LOC"
      ? "LOC"
      : String(new Date().getDate()).padStart(2, "0");

  switch (prefixFormat) {
    case "PREFIX":
      return config.prefix;
    case "PREFIX_YEAR_MONTH":
      return `${config.prefix}${sep}${year}${sep}${month}`;
    case "PREFIX_YEAR_MONTH_DAY":
      return `${config.prefix}${sep}${year}${sep}${month}${sep}${day}`;
    case "PREFIX_YEAR":
    default:
      return `${config.prefix}${sep}${year}`;
  }
}

export function formatSequenceNumber(sequence: number, sequenceLength = 4) {
  const minWidth = Math.max(1, Number(sequenceLength ?? 4));
  if (sequence >= 10 ** minWidth) {
    return String(sequence);
  }
  return String(sequence).padStart(minWidth, "0");
}

export function formatDocumentNumber(
  config: Pick<
    DocumentNumberingConfig,
    | "prefix"
    | "prefixFormat"
    | "separator"
    | "yearFormat"
    | "monthFormat"
    | "dayFormat"
    | "sequenceLength"
  >,
  sequence: number,
) {
  const sep = config.separator ?? "";
  const stem = getDocumentNumberStem(config);
  const seqPart = formatSequenceNumber(sequence, config.sequenceLength);
  return `${stem}${sep}${seqPart}`;
}
