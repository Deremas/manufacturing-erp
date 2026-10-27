import { sql } from "@/lib/db";
import { getStructured } from "@/services/administration/systemSettingsService";
import type { ProcurementTaxSettings, ProcurementVatTreatment } from "@/services/procurement/procurement-tax";

export type { ProcurementTaxSettings, ProcurementVatTreatment } from "@/services/procurement/procurement-tax";
export {
  calculateProcurementLineAmounts,
  mergeVatRemarks,
  vatRemarksTag,
} from "@/services/procurement/procurement-tax";

const COMPANY_DEFAULT_TAX_CODE_KEY = "company.defaultTaxCodeId";
const COMPANY_PROCUREMENT_VAT_ENABLED_KEY = "company.procurementVatEnabled";

export async function getProcurementTaxSettings(): Promise<ProcurementTaxSettings> {
  const [settingsResult, defaultTaxCodeRows, treatmentRows, procurementVatRows] = await Promise.all([
    getStructured(),
    sql<Array<{ value: string }>>`
      SELECT value
      FROM "SystemSetting"
      WHERE key = ${COMPANY_DEFAULT_TAX_CODE_KEY}
        AND "isArchived" = false
      LIMIT 1
    `.catch(() => []),
    sql<Array<{ value: string }>>`
      SELECT value
      FROM "SystemSetting"
      WHERE key = 'procurementVatTreatment'
        AND "isArchived" = false
      LIMIT 1
    `.catch(() => []),
    sql<Array<{ value: string }>>`
      SELECT value
      FROM "SystemSetting"
      WHERE key = ${COMPANY_PROCUREMENT_VAT_ENABLED_KEY}
        AND "isArchived" = false
      LIMIT 1
    `.catch(() => []),
  ]);

  const settings = settingsResult.data;
  const defaultTaxCodeId = defaultTaxCodeRows[0]?.value ?? "";
  const taxCode = defaultTaxCodeId
    ? (await sql<Array<{ id: string; taxName: string; rate: number }>>`
        SELECT id, "taxName", rate
        FROM "TaxCode"
        WHERE id = ${defaultTaxCodeId}
        LIMIT 1
      `.catch(() => []))[0] ?? null
    : null;

  const treatmentRaw = String(treatmentRows[0]?.value ?? "INCLUSIVE").toUpperCase();
  const treatment: ProcurementVatTreatment =
    treatmentRaw === "EXCLUSIVE" ? "EXCLUSIVE" : "INCLUSIVE";

  const procurementVatEnabled = procurementVatRows[0]?.value !== "false";
  const systemVatEnabled = settings?.vatEnabled ?? true;
  const effectiveRate = taxCode?.rate != null && Number.isFinite(Number(taxCode.rate))
    ? Number(taxCode.rate)
    : Number(settings?.vatPercentage ?? 15);
  const vatEnabled = systemVatEnabled && procurementVatEnabled && effectiveRate > 0;

  return {
    vatEnabled,
    taxRate: vatEnabled ? effectiveRate : 0,
    taxCodeId: taxCode?.id ?? null,
    taxCodeName: taxCode?.taxName ?? null,
    treatment,
  };
}
