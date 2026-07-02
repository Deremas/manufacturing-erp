import { getGrnReferenceData } from "@/app/procurement/_lib/grn-reference-data";
import { GoodsReceiptEditor } from "@/features/procurement/grn/grn-pages";

export default async function CreateGoodsReceiptPage(
  { searchParams }: { searchParams: Promise<{ poId?: string }> },
) {
  const { poId } = await searchParams;
  const referenceData = await getGrnReferenceData(poId);

  return (
    <GoodsReceiptEditor
      title="Create Goods Receipt"
      subtitle="Receive approved purchase order lines and post only accepted stock into inventory."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Goods Receipts / GRN", href: "/procurement/grn" },
        { label: "Create" },
      ]}
      apiBasePath="/api/procurement/grn"
      cancelHref="/procurement/grn"
      successHref="/procurement/grn"
      suppliers={referenceData.suppliers}
      locations={referenceData.locations}
      users={referenceData.users}
      purchaseOrders={referenceData.purchaseOrders}
      initialValue={{
        grnDate: new Date().toISOString().slice(0, 10),
        poId: referenceData.prefill?.header.id ?? "",
        supplierId: referenceData.prefill?.header.supplierId ?? "",
        receivingLocationId: referenceData.prefill?.header.deliveryLocationId ?? "",
        deliveryNoteNo: "",
        supplierInvoiceNo: "",
        vehiclePlate: "",
        deliveredBy: "",
        receivedById: referenceData.currentUser?.id ?? "",
        remarks: referenceData.prefill?.header.poNo ? `Generated from ${referenceData.prefill.header.poNo}` : "",
        items: (referenceData.prefill?.items ?? []).map((item) => ({
          poItemId: item.poItemId,
          itemId: item.itemId,
          itemLabel: `${item.itemCode} - ${item.itemName}`,
          uomId: item.uomId ?? undefined,
          uomName: item.uomName ?? "",
          orderedQty: item.orderedQty,
          previouslyReceivedQty: item.previouslyReceivedQty,
          remainingQty: item.remainingQty,
          receivedQty: item.remainingQty,
          acceptedQty: item.remainingQty,
          rejectedQty: 0,
          unitCost: item.unitCost,
          taxAmount: item.taxAmount,
          remarks: "",
        })),
      }}
    />
  );
}
