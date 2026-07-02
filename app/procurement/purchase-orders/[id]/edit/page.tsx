import { notFound } from "next/navigation";

import { getProcurementReferenceData } from "@/app/procurement/_lib/reference-data";
import { PurchaseOrderEditor } from "@/features/procurement/document-pages";
import { getPurchaseOrderById } from "@/services/procurement/purchase-order.service";

export default async function EditPurchaseOrderPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [order, referenceData] = await Promise.all([
    getPurchaseOrderById(id),
    getProcurementReferenceData(),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <PurchaseOrderEditor
      mode="edit"
      documentId={order.id}
      title={`Edit ${order.poNo}`}
      subtitle="Update the purchase order before receiving or closing it."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Purchase Orders", href: "/procurement/purchase-orders" },
        { label: order.poNo, href: `/procurement/purchase-orders/${order.id}` },
        { label: "Edit" },
      ]}
      apiBasePath="/api/procurement/purchase-orders"
      cancelHref={`/procurement/purchase-orders/${order.id}`}
      successHref="/procurement/purchase-orders"
      canEdit={!["RECEIVED", "POSTED", "CANCELLED", "CLOSED"].includes(order.status)}
      suppliers={referenceData.suppliers}
      locations={referenceData.locations}
      items={referenceData.items}
      taxCodes={referenceData.taxCodes}
      initialValue={{
        poDate: order.poDate.slice(0, 10),
        supplierId: order.supplierId,
        prId: order.prId ?? "",
        deliveryLocationId: order.deliveryLocationId,
        expectedDeliveryDate: order.expectedDeliveryDate?.slice(0, 10) ?? "",
        paymentTerms: order.paymentTerms,
        remarks: order.remarks,
        items: order.items.map((item) => ({
          prItemId: item.prItemId ?? undefined,
          itemId: item.itemId,
          uomId: item.uomId ?? "",
          orderedQty: item.orderedQty,
          unitPrice: item.unitPrice,
          taxCodeId: item.taxCodeId ?? "",
          taxRate: item.taxRate,
          remarks: item.remarks,
        })),
      }}
    />
  );
}
