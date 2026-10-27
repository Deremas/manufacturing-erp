import { getProcurementReferenceData } from "@/app/procurement/_lib/reference-data";
import { SupplierReturnEditor } from "@/features/procurement/supplier-return-pages";
import { listGoodsReceipts } from "@/services/procurement/grn.service";
import { getSupplierReturnPrefillFromReceipt } from "@/services/procurement/supplier-return.service";
import { getGoodsReceiptById } from "@/services/procurement/grn.service";

export default async function CreateSupplierReturnPage(
  { searchParams }: { searchParams: Promise<{ grnPublicId?: string }> },
) {
  const { grnPublicId } = await searchParams;
  const linkedGrn = grnPublicId ? await getGoodsReceiptById(grnPublicId) : null;
  const grnId = linkedGrn?.id;
  const [referenceData, receipts, prefill] = await Promise.all([
    getProcurementReferenceData(),
    listGoodsReceipts(),
    grnId ? getSupplierReturnPrefillFromReceipt(grnId) : Promise.resolve(null),
  ]);

  return (
    <SupplierReturnEditor
      title="Create Supplier Return"
      subtitle="Return received goods back to the supplier and post the stock-out through inventory after approval."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Returns", href: "/procurement/supplier-returns" },
        { label: "Create" },
      ]}
      apiBasePath="/api/procurement/supplier-returns"
      cancelHref="/procurement/supplier-returns"
      successHref="/procurement/supplier-returns"
      suppliers={referenceData.suppliers}
      locations={referenceData.locations}
      grnOptions={receipts.filter((entry) => entry.status === "POSTED").map((entry) => ({
        value: entry.id,
        label: `${entry.grnNo} - ${entry.supplierName}`,
      }))}
      initialValue={{
        returnDate: new Date().toISOString().slice(0, 10),
        supplierId: prefill?.header.supplierId ?? "",
        grnId: prefill?.header.id ?? "",
        returnLocationId: prefill?.header.locationId ?? "",
        reason: "",
        remarks: prefill?.header.grnNo ? `Generated from ${prefill.header.grnNo}` : "",
        items: (prefill?.items ?? []).map((item) => ({
          grnItemId: item.grnItemId,
          itemId: item.itemId,
          itemLabel: `${item.itemCode} - ${item.itemName}`,
          uomName: item.uomName ?? "",
          receivedQty: item.receivedQty,
          previouslyReturnedQty: item.previouslyReturnedQty,
          availableReturnQty: item.availableReturnQty,
          returnQty: item.availableReturnQty,
          unitCost: item.unitCost,
          reason: "",
          remarks: "",
        })),
      }}
    />
  );
}
