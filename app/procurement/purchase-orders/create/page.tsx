import { getProcurementReferenceData } from "@/app/procurement/_lib/reference-data";
import { PurchaseOrderEditor } from "@/features/procurement/document-pages";
import { getPurchaseOrderPrefillFromRequisition } from "@/services/procurement/purchase-order.service";

export default async function CreatePurchaseOrderPage(
  { searchParams }: { searchParams: Promise<{ prId?: string }> },
) {
  const { prId } = await searchParams;
  const [referenceData, prefill] = await Promise.all([
    getProcurementReferenceData(),
    prId ? getPurchaseOrderPrefillFromRequisition(prId) : Promise.resolve(null),
  ]);

  return (
    <PurchaseOrderEditor
      mode="create"
      title="Create Purchase Order"
      subtitle="Build a live supplier order directly from the database, optionally starting from an approved requisition."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Purchase Orders", href: "/procurement/purchase-orders" },
        { label: "Create" },
      ]}
      apiBasePath="/api/procurement/purchase-orders"
      cancelHref="/procurement/purchase-orders"
      successHref="/procurement/purchase-orders"
      suppliers={referenceData.suppliers}
      locations={referenceData.locations}
      items={referenceData.items}
      taxCodes={referenceData.taxCodes}
      initialValue={{
        poDate: new Date().toISOString().slice(0, 10),
        supplierId: "",
        prId: prefill?.header.id ?? "",
        deliveryLocationId: prefill?.header.locationId ?? "",
        expectedDeliveryDate: prefill?.header.neededByDate?.slice(0, 10) ?? "",
        paymentTerms: "",
        remarks: prefill?.header.requisitionNo ? `Generated from ${prefill.header.requisitionNo}` : "",
        items: prefill?.items?.length
          ? prefill.items.map((item) => ({
              prItemId: item.prItemId,
              itemId: item.itemId,
              uomId: item.uomId ?? "",
              orderedQty: item.orderedQty,
              unitPrice: item.unitPrice,
              taxCodeId: "",
              taxRate: 0,
              remarks: "",
            }))
          : [{ itemId: "", uomId: "", orderedQty: 0, unitPrice: 0, taxCodeId: "", taxRate: 0, remarks: "" }],
      }}
    />
  );
}
