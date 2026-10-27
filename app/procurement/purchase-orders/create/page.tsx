import { getPoReferenceData } from "@/app/procurement/_lib/po-reference-data";
import { PurchaseOrderEditor } from "@/features/procurement/document-pages";
import { peekProcurementDocumentNumber } from "@/services/procurement/procurement-shared.service";

export default async function CreatePurchaseOrderPage(
  { searchParams }: { searchParams: Promise<{ prPublicId?: string }> },
) {
  const { prPublicId } = await searchParams;
  const [referenceData, nextPoNo] = await Promise.all([
    getPoReferenceData(prPublicId),
    peekProcurementDocumentNumber("PO", "Purchase Order"),
  ]);
  const prefill = referenceData.prefill;
  const linkedPrId =
    prefill?.header.id ??
    (referenceData.linkedPrConvertible ? referenceData.resolvedPrId : "") ??
    "";

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
      poNo={nextPoNo}
      suppliers={referenceData.suppliers}
      locations={referenceData.locations}
      items={referenceData.items}
      taxSettings={referenceData.taxSettings}
      paymentTerms={referenceData.paymentTerms}
      requisitions={referenceData.requisitions}
      initialValue={{
        poDate: new Date().toISOString().slice(0, 10),
        supplierId: "",
        prId: linkedPrId,
        prReferenceNo: prefill?.header.requisitionNo ?? (referenceData.linkedPrConvertible ? referenceData.selectedPrReferenceNo : undefined) ?? undefined,
        deliveryLocationId: prefill?.header.locationId ?? "",
        expectedDeliveryDate: prefill?.header.neededByDate?.slice(0, 10) ?? "",
        paymentTerms: "",
        requestType: prefill?.header.requestType ?? "INVENTORY_PURCHASE",
        remarks: prefill?.header.requisitionNo ? `Generated from ${prefill.header.requisitionNo}` : "",
        items: prefill?.items?.length
          ? prefill.items.map((item) => ({
              prItemId: item.prItemId,
              itemId: item.itemId,
              uomId: item.uomId ?? "",
              orderedQty: item.orderedQty,
              unitPrice: item.unitPrice,
              remarks: "",
            }))
          : [{ itemId: "", uomId: "", orderedQty: 0, unitPrice: 0, remarks: "" }],
      }}
    />
  );
}
