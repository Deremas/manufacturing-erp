export type ProcurementVatTreatment = "INCLUSIVE" | "EXCLUSIVE";

export interface ProcurementTaxSettings {
  vatEnabled: boolean;
  taxRate: number;
  taxCodeId: string | null;
  taxCodeName: string | null;
  treatment: ProcurementVatTreatment;
}

export function vatRemarksTag(treatment: ProcurementVatTreatment) {
  return `[VAT: ${treatment === "INCLUSIVE" ? "inclusive" : "exclusive"}]`;
}

export function mergeVatRemarks(remarks: string | undefined | null, treatment: ProcurementVatTreatment) {
  const tag = vatRemarksTag(treatment);
  const base = String(remarks ?? "")
    .replace(/\[VAT:\s*(inclusive|exclusive)\]/gi, "")
    .trim();
  return base ? `${base} ${tag}` : tag;
}

export function calculateProcurementLineAmounts(
  orderedQty: number,
  unitPrice: number,
  settings: ProcurementTaxSettings,
) {
  const gross = orderedQty * unitPrice;
  if (!settings.vatEnabled || settings.taxRate <= 0) {
    return {
      taxRate: 0,
      taxAmount: 0,
      lineSubtotal: gross,
      lineTotal: gross,
    };
  }

  if (settings.treatment === "INCLUSIVE") {
    const taxAmount = gross * (settings.taxRate / (100 + settings.taxRate));
    const lineSubtotal = gross - taxAmount;
    return {
      taxRate: settings.taxRate,
      taxAmount,
      lineSubtotal,
      lineTotal: gross,
    };
  }

  const taxAmount = gross * (settings.taxRate / 100);
  return {
    taxRate: settings.taxRate,
    taxAmount,
    lineSubtotal: gross,
    lineTotal: gross + taxAmount,
  };
}
