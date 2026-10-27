import { notFound } from "next/navigation";

import { getGrnReferenceData } from "@/app/procurement/_lib/grn-reference-data";
import { GoodsReceiptEditor } from "@/features/procurement/grn/grn-pages";
import {
  procurementListUrl,
  procurementViewUrl,
} from "@/lib/procurement/routes";
import { getGoodsReceiptById } from "@/services/procurement/grn.service";

export default async function EditGoodsReceiptPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [receipt, referenceData] = await Promise.all([
    getGoodsReceiptById(publicId),
    getGrnReferenceData(),
  ]);

  if (!receipt) {
    notFound();
  }

  return (
    <GoodsReceiptEditor
      documentId={receipt.id}
      documentPublicId={receipt.publicId}
      title={`Edit ${receipt.grnNo}`}
      subtitle="Update the goods receipt before it is posted into inventory."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Goods Receipts / GRN", href: "/procurement/grn" },
        {
          label: receipt.grnNo,
          href: procurementViewUrl("grn", receipt.publicId),
        },
        { label: "Edit" },
      ]}
      apiBasePath="/api/procurement/grn"
      cancelHref={procurementViewUrl("grn", receipt.publicId)}
      successHref={procurementListUrl("grn")}
      canEdit={receipt.status !== "POSTED" && receipt.status !== "CANCELLED"}
      suppliers={referenceData.suppliers}
      locations={referenceData.locations}
      users={referenceData.users}
      purchaseOrders={referenceData.purchaseOrders}
      initialValue={{
        grnDate: receipt.grnDate.slice(0, 10),
        poId: receipt.poId ?? "",
        supplierId: receipt.supplierId,
        receivingLocationId: receipt.receivingLocationId,
        deliveryNoteNo: receipt.deliveryNoteNo,
        supplierInvoiceNo: receipt.supplierInvoiceNo,
        vehiclePlate: receipt.vehiclePlate,
        deliveredBy: receipt.deliveredBy,
        receivedById: receipt.receivedById ?? "",
        remarks: receipt.remarks,
        items: receipt.items.map((item) => ({
          poItemId: item.poItemId ?? undefined,
          itemId: item.itemId,
          itemLabel: `${item.itemCode} - ${item.itemName}`,
          uomId: item.uomId ?? undefined,
          uomName: item.uomName ?? "",
          orderedQty: item.orderedQty,
          previouslyReceivedQty: item.previouslyReceivedQty,
          remainingQty: item.remainingQty,
          receivedQty: item.receivedQty,
          acceptedQty: item.acceptedQty,
          rejectedQty: item.rejectedQty,
          unitCost: item.unitCost,
          taxAmount: item.taxAmount,
          remarks: item.remarks,
          receiptType: item.receiptType,
        })),
      }}
    />
  );
}
