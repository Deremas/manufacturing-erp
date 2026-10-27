function formatDocumentNumber(number: string, displayPrefix: string) {
  const match = String(number).match(/^([A-Z]+)-(\d{4})-(\d{4,})$/i);
  if (!match) {
    return number;
  }

  return `${displayPrefix}/RAW/${match[2]}/${match[3]}`;
}

export function formatStoreRequisitionNumber(number: string) {
  return formatDocumentNumber(number, "SR");
}

export function formatStockIssueNumber(number: string) {
  return formatDocumentNumber(number, "ISS");
}

export function formatStockReturnNumber(number: string) {
  return formatDocumentNumber(number, "RET");
}
