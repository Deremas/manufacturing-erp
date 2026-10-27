import { getPurchaseRequisitionById } from "@/services/procurement/requisition.service";
import { getProcurementReferenceData } from "@/app/procurement/_lib/reference-data";
import {
  getPurchaseOrderPrefillFromRequisition,
  listConvertiblePurchaseRequisitions,
} from "@/services/procurement/purchase-order.service";
import { getProcurementTaxSettings } from "@/services/procurement/procurement-tax.service";
import {
  listPaymentTerms,
  paymentTermsToOptions,
} from "@/services/administration/payment-terms.service";

export async function getPoReferenceData(prPublicId?: string) {
  const linkedRequisition = prPublicId
    ? await getPurchaseRequisitionById(prPublicId)
    : null;
  const prId = linkedRequisition?.id;

  const [referenceData, convertibleRequisitions, prefill, taxSettings, paymentTerms] =
    await Promise.all([
      getProcurementReferenceData(),
      prId ? Promise.resolve([]) : listConvertiblePurchaseRequisitions(),
      prId ? getPurchaseOrderPrefillFromRequisition(prId) : Promise.resolve(null),
      getProcurementTaxSettings(),
      listPaymentTerms(),
    ]);

  const requisitionOptions = convertibleRequisitions.map((requisition) => ({
    value: requisition.id,
    label: requisition.requisitionNo,
  }));

  const selectedId = prefill?.header.id ?? "";
  const selectedNo =
    prefill?.header.requisitionNo ?? linkedRequisition?.requisitionNo ?? null;

  if (selectedId && selectedNo && !requisitionOptions.some((option) => option.value === selectedId)) {
    requisitionOptions.unshift({
      value: selectedId,
      label: selectedNo,
    });
  }

  return {
    ...referenceData,
    prefill,
    requisitions: requisitionOptions,
    selectedPrReferenceNo: selectedNo,
    linkedPrConvertible: Boolean(prefill),
    resolvedPrId: prId ?? "",
    taxSettings,
    paymentTerms: paymentTermsToOptions(paymentTerms),
  };
}
